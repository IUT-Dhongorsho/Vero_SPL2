import { create } from 'zustand';
import { io, type Socket } from 'socket.io-client';
import {
  inboxService,
  type ChatMessage,
  type Connection,
  type ConnectionBuckets,
} from '../services/inboxService';
import { useAuthStore } from './auth.store';
import { API_ORIGIN, socketPath } from '../lib/endpoints';

interface InboxState {
  connections: ConnectionBuckets;
  connectionsLoading: boolean;

  activeChannelId: string | null;
  activePeerId: string | null;

  /** channelId -> messages, oldest first */
  messagesByChannel: Record<string, ChatMessage[]>;
  messagesLoading: boolean;

  /** channelId -> unread count, cleared when the conversation is opened */
  unreadByChannel: Record<string, number>;
  /** channelId -> names currently typing */
  typingByChannel: Record<string, string[]>;
  onlineUserIds: string[];

  socket: Socket | null;
  connected: boolean;

  loadConnections: () => Promise<void>;
  openConversation: (connection: Connection) => Promise<void>;
  /** Opens any channel the user belongs to (module chats) — no peer involved. */
  openChannel: (channelId: string) => Promise<void>;
  closeConversation: () => void;
  sendMessage: (input: {
    content: string;
    type?: ChatMessage['type'];
    attachment?: { url: string; name: string; mime: string; size: number };
    /** Who to notify: member ids, or everyone in the channel. */
    mentions?: string[];
    mentionsAll?: boolean;
    /** The page the chat is on; mention notifications open it. */
    link?: string;
  }) => void;
  deleteMessage: (messageId: string) => Promise<void>;
  setTyping: (isTyping: boolean) => void;

  connectSocket: () => void;
  disconnectSocket: () => void;

  totalUnread: () => number;
}

function makeClientId(): string {
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export const useInboxStore = create<InboxState>((set, get) => ({
  connections: { accepted: [], incoming: [], outgoing: [] },
  connectionsLoading: false,

  activeChannelId: null,
  activePeerId: null,

  messagesByChannel: {},
  messagesLoading: false,

  unreadByChannel: {},
  typingByChannel: {},
  onlineUserIds: [],

  socket: null,
  connected: false,

  async loadConnections() {
    set({ connectionsLoading: true });
    try {
      const connections = await inboxService.connections();
      set({ connections });
    } catch (error) {
      console.error('[inbox] failed to load connections', error);
    } finally {
      set({ connectionsLoading: false });
    }
  },

  async openConversation(connection) {
    let channelId = connection.channelId;

    // A connection accepted before the channel existed still needs one.
    if (!channelId) {
      const channel = await inboxService.openDirectChannel(connection.user.id);
      channelId = channel.id;
      set((state) => ({
        connections: {
          ...state.connections,
          accepted: state.connections.accepted.map((c) =>
            c.id === connection.id ? { ...c, channelId } : c
          ),
        },
      }));
    }

    await get().openChannel(channelId!);
    set({ activePeerId: connection.user.id });
  },

  async openChannel(channelId) {
    const { activeChannelId, socket } = get();
    if (activeChannelId && activeChannelId !== channelId) socket?.emit('leave_room', activeChannelId);

    set({
      activeChannelId: channelId,
      activePeerId: null,
      messagesLoading: true,
      unreadByChannel: { ...get().unreadByChannel, [channelId]: 0 },
    });

    socket?.emit('join_room', channelId);

    try {
      const messages = await inboxService.history(channelId);
      set((state) => ({
        messagesByChannel: { ...state.messagesByChannel, [channelId]: messages },
      }));
      inboxService.markRead(channelId).catch(() => {});
    } catch (error) {
      console.error('[inbox] failed to load history', error);
      throw error;
    } finally {
      set({ messagesLoading: false });
    }
  },

  closeConversation() {
    const { activeChannelId, socket } = get();
    if (activeChannelId) socket?.emit('leave_room', activeChannelId);
    set({ activeChannelId: null, activePeerId: null });
  },

  sendMessage({ content, type = 'text', attachment, mentions, mentionsAll, link }) {
    const { activeChannelId, socket } = get();
    const me = useAuthStore.getState().user;
    if (!activeChannelId || !me) return;

    const clientId = makeClientId();

    // Optimistic bubble — replaced when the server echoes the persisted row.
    const optimistic: ChatMessage = {
      id: clientId,
      clientId,
      channelId: activeChannelId,
      senderId: me.id,
      content,
      type,
      attachmentUrl: attachment?.url ?? null,
      attachmentName: attachment?.name ?? null,
      attachmentMime: attachment?.mime ?? null,
      attachmentSize: attachment?.size ?? null,
      replyToId: null,
      deletedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sender: { id: me.id, name: me.name, avatarUrl: me.avatar ?? null },
      pending: true,
    };

    set((state) => ({
      messagesByChannel: {
        ...state.messagesByChannel,
        [activeChannelId]: [...(state.messagesByChannel[activeChannelId] ?? []), optimistic],
      },
    }));

    socket?.emit('message', {
      channelId: activeChannelId,
      content,
      type,
      attachment,
      clientId,
      ...(mentions?.length || mentionsAll ? { mentions, mentionsAll, link } : {}),
    });
  },

  async deleteMessage(messageId) {
    const { activeChannelId } = get();
    if (!activeChannelId) return;

    await inboxService.deleteMessage(messageId);
    set((state) => ({
      messagesByChannel: {
        ...state.messagesByChannel,
        [activeChannelId]: (state.messagesByChannel[activeChannelId] ?? []).filter(
          (m) => m.id !== messageId
        ),
      },
    }));
  },

  setTyping(isTyping) {
    const { activeChannelId, socket } = get();
    if (activeChannelId) socket?.emit('typing', { channelId: activeChannelId, isTyping });
  },

  connectSocket() {
    if (get().socket) return;

    const token = useAuthStore.getState().token;
    if (!token) return;

    // Through the gateway, so it works behind nginx/ngrok as well as Vite.
    const socket = io(API_ORIGIN, {
      path: socketPath('chat'),
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
    });

    socket.on('connect', () => {
      set({ connected: true });
      // Rooms do not survive a reconnect; rejoin the open conversation.
      const { activeChannelId } = get();
      if (activeChannelId) socket.emit('join_room', activeChannelId);
    });
    socket.on('disconnect', () => set({ connected: false }));
    socket.on('connect_error', (error) => console.warn('[inbox] socket error', error.message));

    socket.on('message', (message: ChatMessage & { clientId?: string }) => {
      const me = useAuthStore.getState().user;
      const { activeChannelId } = get();

      set((state) => {
        const existing = state.messagesByChannel[message.channelId] ?? [];
        // Swap the optimistic bubble rather than appending a duplicate.
        const merged = message.clientId
          ? existing.some((m) => m.clientId === message.clientId)
            ? existing.map((m) => (m.clientId === message.clientId ? { ...message, pending: false } : m))
            : [...existing, message]
          : existing.some((m) => m.id === message.id)
            ? existing
            : [...existing, message];

        const isForeign = message.senderId !== me?.id;
        const isBackground = message.channelId !== activeChannelId;
        // Seen as it arrives in the open conversation.
        if (isForeign && !isBackground) inboxService.markRead(message.channelId).catch(() => {});

        return {
          messagesByChannel: { ...state.messagesByChannel, [message.channelId]: merged },
          unreadByChannel:
            isForeign && isBackground
              ? {
                  ...state.unreadByChannel,
                  [message.channelId]: (state.unreadByChannel[message.channelId] ?? 0) + 1,
                }
              : state.unreadByChannel,
        };
      });
    });

    socket.on('typing', (payload: { channelId: string; userId: string; userName?: string; isTyping: boolean }) => {
      const me = useAuthStore.getState().user;
      if (payload.userId === me?.id) return;

      set((state) => {
        const current = state.typingByChannel[payload.channelId] ?? [];
        const name = payload.userName ?? 'Someone';
        const next = payload.isTyping
          ? current.includes(name)
            ? current
            : [...current, name]
          : current.filter((n) => n !== name);
        return { typingByChannel: { ...state.typingByChannel, [payload.channelId]: next } };
      });
    });

    socket.on('user_presence', ({ userId, status }: { userId: string; status: 'online' | 'offline' }) => {
      set((state) => ({
        onlineUserIds:
          status === 'online'
            ? Array.from(new Set([...state.onlineUserIds, userId]))
            : state.onlineUserIds.filter((id) => id !== userId),
      }));
    });

    set({ socket });
  },

  disconnectSocket() {
    get().socket?.disconnect();
    set({ socket: null, connected: false });
  },

  totalUnread() {
    return Object.values(get().unreadByChannel).reduce((sum, n) => sum + n, 0);
  },
}));
