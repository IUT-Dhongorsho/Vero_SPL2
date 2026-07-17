import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Message {
  id: string;
  channelId: string;
  senderId: string;
  content: string;
  createdAt: string;
  pinned: boolean;
  parentId?: string; // Thread parent message ID
  file?: {
    name: string;
    size: number;
    type: string;
    url: string;
  };
  threadCount?: number;
  reactions?: Record<string, string[]>; // e.g. { '👍': ['user1', 'user2'] }
}

export interface Channel {
  id: string;
  moduleId: string; // The project module this channel belongs to
  name: string;
  isDirectMessage: boolean;
  participants: string[]; // User IDs
  lastMessagePreview?: string;
  unreadCount: number;
}

interface ChatState {
  channels: Channel[];
  messages: Message[];
  activeChannelId: string | null;
  activeThreadMessageId: string | null;
  typingUsers: Record<string, string[]>; // channelId -> array of typing user names
  
  // Actions
  fetchChannels: (moduleId: string) => void;
  setActiveChannel: (channelId: string | null) => void;
  setActiveThread: (messageId: string | null) => void;
  sendMessage: (channelId: string, content: string, senderId: string, file?: Message['file'], parentId?: string) => void;
  pinMessage: (messageId: string) => void;
  toggleReaction: (messageId: string, emoji: string, userId: string) => void;
  setTyping: (channelId: string, userName: string, isTyping: boolean) => void;
  markChannelRead: (channelId: string) => void;
}

// Initial mock data
const MOCK_CHANNELS: Channel[] = [
  { id: 'c1', moduleId: 'm1', name: 'general', isDirectMessage: false, participants: ['u1', 'u2', 'u3'], unreadCount: 2, lastMessagePreview: 'Are we launching today?' },
  { id: 'c2', moduleId: 'm1', name: 'design-updates', isDirectMessage: false, participants: ['u1', 'u2'], unreadCount: 0, lastMessagePreview: 'Figma link updated.' },
  { id: 'dm1', moduleId: 'm1', name: 'Alice (DM)', isDirectMessage: true, participants: ['u1', 'u2'], unreadCount: 1, lastMessagePreview: 'Could you check the PR?' }
];

const MOCK_MESSAGES: Message[] = [
  { id: 'm1', channelId: 'c1', senderId: 'u2', content: 'Are we launching today?', createdAt: new Date(Date.now() - 3600000).toISOString(), pinned: false, threadCount: 3, reactions: { '🚀': ['u1', 'u3'] } },
  { id: 'm2', channelId: 'c2', senderId: 'u3', content: 'Figma link updated.', createdAt: new Date(Date.now() - 86400000).toISOString(), pinned: true },
  { id: 'm3', channelId: 'dm1', senderId: 'u2', content: 'Could you check the PR?', createdAt: new Date(Date.now() - 300000).toISOString(), pinned: false }
];

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      channels: MOCK_CHANNELS,
      messages: MOCK_MESSAGES,
      activeChannelId: null,
      activeThreadMessageId: null,
      typingUsers: {},

      fetchChannels: (moduleId: string) => {
        // In a real app, this would fetch from backend. Here we just ensure we have mock data.
        // The getters filter automatically.
      },

      setActiveChannel: (channelId) => set({ activeChannelId: channelId, activeThreadMessageId: null }),
      
      setActiveThread: (messageId) => set({ activeThreadMessageId: messageId }),

      sendMessage: (channelId, content, senderId, file, parentId) => set((state) => {
        const newMessage: Message = {
          id: `msg_${Date.now()}`,
          channelId,
          senderId,
          content,
          createdAt: new Date().toISOString(),
          pinned: false,
          parentId,
          file,
        };
        
        let newMessages = [...state.messages, newMessage];

        // If it's a thread reply, update the parent's thread count
        if (parentId) {
          newMessages = newMessages.map(m => 
            m.id === parentId 
              ? { ...m, threadCount: (m.threadCount || 0) + 1 }
              : m
          );
        }

        // Update last message preview in channel (only if it's not a thread reply)
        const channels = state.channels.map(c => 
          c.id === channelId && !parentId
            ? { ...c, lastMessagePreview: content.substring(0, 30) + (content.length > 30 ? '...' : '') }
            : c
        );

        return { messages: newMessages, channels };
      }),

      pinMessage: (messageId) => set((state) => ({
        messages: state.messages.map(m => m.id === messageId ? { ...m, pinned: !m.pinned } : m)
      })),

      toggleReaction: (messageId, emoji, userId) => set((state) => ({
        messages: state.messages.map(m => {
          if (m.id !== messageId) return m;
          const currentReactions = m.reactions || {};
          const usersForEmoji = currentReactions[emoji] || [];
          
          let newUsers;
          if (usersForEmoji.includes(userId)) {
            newUsers = usersForEmoji.filter(id => id !== userId);
          } else {
            newUsers = [...usersForEmoji, userId];
          }

          const newReactions = { ...currentReactions, [emoji]: newUsers };
          if (newUsers.length === 0) delete newReactions[emoji];

          return { ...m, reactions: newReactions };
        })
      })),

      setTyping: (channelId, userName, isTyping) => set((state) => {
        const currentTyping = state.typingUsers[channelId] || [];
        let newTyping;
        if (isTyping && !currentTyping.includes(userName)) {
          newTyping = [...currentTyping, userName];
        } else if (!isTyping) {
          newTyping = currentTyping.filter(name => name !== userName);
        } else {
          newTyping = currentTyping;
        }
        return { typingUsers: { ...state.typingUsers, [channelId]: newTyping } };
      }),

      markChannelRead: (channelId) => set((state) => ({
        channels: state.channels.map(c => c.id === channelId ? { ...c, unreadCount: 0 } : c)
      })),

    }),
    {
      name: 'chat-storage',
    }
  )
);
