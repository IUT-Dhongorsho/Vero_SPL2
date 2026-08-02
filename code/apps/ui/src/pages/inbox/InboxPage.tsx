import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  Check,
  Loader2,
  MessageSquarePlus,
  Search,
  UserMinus,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { PageContainer } from '../../components/Layout/PageContainer';
import { AnimatedButton } from '../../components/ui/AnimatedButton';
import { Avatar } from '../../components/ui/Avatar';
import { EmptyState } from '../../components/ui/EmptyState';
import { toast } from '../../components/Providers/ToastProvider';
import { AddConnectionPanel } from './AddConnectionPanel';
import { Composer } from './Composer';
import { MessageBubble } from './MessageBubble';
import { inboxService, type ChatMessage, type Connection } from '../../services/inboxService';
import { useInboxStore } from '../../stores/inbox.store';
import { useAuthStore } from '../../stores/auth.store';
import { cn } from '../../utils/cn';

function dayLabel(iso: string): string {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (same(date, today)) return 'Today';
  if (same(date, yesterday)) return 'Yesterday';

  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    ...(date.getFullYear() !== today.getFullYear() ? { year: 'numeric' } : {}),
  });
}

const RequestRow: React.FC<{
  connection: Connection;
  onAccept: () => void;
  onDecline: () => void;
  busy: boolean;
}> = ({ connection, onAccept, onDecline, busy }) => (
  <motion.div
    layout
    initial={{ opacity: 0, x: -12 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, height: 0 }}
    className="flex items-center gap-3 p-3 rounded-xl bg-accent-soft"
  >
    <Avatar name={connection.user.name} src={connection.user.avatarUrl} size="sm" />
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium text-foreground truncate">{connection.user.name}</p>
      <p className="text-xs text-muted-foreground">wants to connect</p>
    </div>
    <button
      onClick={onAccept}
      disabled={busy}
      className="w-8 h-8 rounded-lg grid place-items-center bg-success-soft text-success hover:opacity-80 transition-opacity cursor-pointer disabled:opacity-50"
      aria-label={`Accept request from ${connection.user.name}`}
    >
      {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
    </button>
    <button
      onClick={onDecline}
      disabled={busy}
      className="w-8 h-8 rounded-lg grid place-items-center bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer disabled:opacity-50"
      aria-label={`Decline request from ${connection.user.name}`}
    >
      <X className="w-4 h-4" />
    </button>
  </motion.div>
);

export const InboxPage: React.FC = () => {
  const [addOpen, setAddOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [localNotices, setLocalNotices] = useState<ChatMessage[]>([]);
  const [hiddenBefore, setHiddenBefore] = useState<Record<string, string>>({});
  const [mobileShowList, setMobileShowList] = useState(true);

  const me = useAuthStore((state) => state.user);
  const {
    connections,
    connectionsLoading,
    activeChannelId,
    activePeerId,
    messagesByChannel,
    messagesLoading,
    unreadByChannel,
    typingByChannel,
    onlineUserIds,
    connected,
    loadConnections,
    openConversation,
    deleteMessage,
  } = useInboxStore();

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadConnections();
  }, [loadConnections]);

  const activeConnection = useMemo(
    () => connections.accepted.find((c) => c.user.id === activePeerId) ?? null,
    [connections.accepted, activePeerId]
  );

  const filteredConversations = useMemo(() => {
    const term = filter.trim().toLowerCase();
    const list = term
      ? connections.accepted.filter((c) => c.user.name.toLowerCase().includes(term))
      : connections.accepted;

    // Unread first, then most recently active.
    return [...list].sort((a, b) => {
      const unreadA = a.channelId ? unreadByChannel[a.channelId] ?? 0 : 0;
      const unreadB = b.channelId ? unreadByChannel[b.channelId] ?? 0 : 0;
      if (unreadA !== unreadB) return unreadB - unreadA;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [connections.accepted, filter, unreadByChannel]);

  const messages = useMemo(() => {
    if (!activeChannelId) return [];
    const cutoff = hiddenBefore[activeChannelId];
    const stored = messagesByChannel[activeChannelId] ?? [];
    const visible = cutoff
      ? stored.filter((m) => new Date(m.createdAt).getTime() > new Date(cutoff).getTime())
      : stored;

    return [...visible, ...localNotices.filter((n) => n.channelId === activeChannelId)].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }, [activeChannelId, messagesByChannel, localNotices, hiddenBefore]);

  // Stick to the bottom as new messages arrive.
  useEffect(() => {
    const node = scrollRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages.length, activeChannelId]);

  const handleOpen = useCallback(
    async (connection: Connection) => {
      setMobileShowList(false);
      try {
        await openConversation(connection);
      } catch (error: any) {
        toast.error(error?.response?.data?.error ?? 'Could not open that conversation');
      }
    },
    [openConversation]
  );

  const respond = async (connection: Connection, action: 'accept' | 'decline') => {
    setBusyId(connection.id);
    try {
      if (action === 'accept') {
        await inboxService.acceptConnection(connection.id);
        toast.success(`You and ${connection.user.name} are now connected`);
      } else {
        await inboxService.declineConnection(connection.id);
      }
      await loadConnections();
    } catch (error: any) {
      toast.error(error?.response?.data?.error ?? 'Something went wrong');
    } finally {
      setBusyId(null);
    }
  };

  const removeConnection = async (connection: Connection) => {
    setBusyId(connection.id);
    try {
      await inboxService.removeConnection(connection.id);
      await loadConnections();
      toast.success(`Removed ${connection.user.name}`);
    } catch {
      toast.error('Could not remove that connection');
    } finally {
      setBusyId(null);
    }
  };

  const addNotice = (content: string) => {
    if (!activeChannelId) return;
    setLocalNotices((notices) => [
      ...notices,
      {
        id: `notice-${Date.now()}`,
        channelId: activeChannelId,
        senderId: 'system',
        content,
        type: 'system',
        attachmentUrl: null,
        attachmentName: null,
        attachmentMime: null,
        attachmentSize: null,
        replyToId: null,
        deletedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]);
  };

  const typingNames = activeChannelId ? typingByChannel[activeChannelId] ?? [] : [];

  return (
    <PageContainer
      title="Inbox"
      subtitle={connected ? 'Connected' : 'Reconnecting…'}
      layout="full"
      topBarActions={
        <AnimatedButton size="sm" variant="accent" onClick={() => setAddOpen(true)}>
          <UserPlus className="w-4 h-4" />
          <span className="hidden sm:inline">Add someone</span>
        </AnimatedButton>
      }
    >
      <div className="flex h-[calc(100vh-4rem)]">
        {/* ── Conversation list ──────────────────────────────────────── */}
        <aside
          className={cn(
            'w-full md:w-[330px] shrink-0 border-r border-border bg-card flex flex-col',
            !mobileShowList && 'hidden md:flex'
          )}
        >
          <div className="p-3 border-b border-border">
            <div className="relative">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Search conversations"
                className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-muted border border-transparent text-sm text-foreground placeholder:text-subtle-foreground focus:outline-none focus:border-accent transition-colors"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {connections.incoming.length > 0 && (
              <div className="mb-3">
                <p className="px-2 py-2 text-2xs font-semibold uppercase tracking-widest text-accent">
                  {connections.incoming.length} request
                  {connections.incoming.length === 1 ? '' : 's'}
                </p>
                <div className="space-y-2">
                  <AnimatePresence>
                    {connections.incoming.map((connection) => (
                      <RequestRow
                        key={connection.id}
                        connection={connection}
                        busy={busyId === connection.id}
                        onAccept={() => respond(connection, 'accept')}
                        onDecline={() => respond(connection, 'decline')}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            )}

            {connectionsLoading && connections.accepted.length === 0 ? (
              <div className="space-y-2 p-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-16 rounded-xl skeleton-shimmer" />
                ))}
              </div>
            ) : filteredConversations.length === 0 ? (
              <EmptyState
                type="inbox"
                actionLabel="Find someone"
                onAction={() => setAddOpen(true)}
                className="py-10"
              />
            ) : (
              filteredConversations.map((connection) => {
                const unread = connection.channelId ? unreadByChannel[connection.channelId] ?? 0 : 0;
                const isActive = connection.user.id === activePeerId;
                const isOnline = onlineUserIds.includes(connection.user.id);

                return (
                  <button
                    key={connection.id}
                    onClick={() => handleOpen(connection)}
                    className={cn(
                      'w-full group flex items-center gap-3 p-2.5 rounded-xl text-left transition-colors cursor-pointer',
                      isActive ? 'bg-muted' : 'hover:bg-muted/60'
                    )}
                  >
                    <Avatar
                      name={connection.user.name}
                      src={connection.user.avatarUrl}
                      size="md"
                      status={isOnline ? 'online' : null}
                    />
                    <span className="flex-1 min-w-0">
                      <span className="block font-medium text-foreground truncate">
                        {connection.user.name}
                      </span>
                      <span className="block text-sm text-muted-foreground truncate">
                        {isOnline ? 'Online' : 'Tap to open the conversation'}
                      </span>
                    </span>

                    {unread > 0 && (
                      <span className="min-w-5 h-5 px-1.5 rounded-full bg-accent text-accent-foreground text-2xs font-semibold grid place-items-center tabular-nums shrink-0">
                        {unread > 99 ? '99+' : unread}
                      </span>
                    )}

                    <span
                      onClick={(event) => {
                        event.stopPropagation();
                        removeConnection(connection);
                      }}
                      role="button"
                      tabIndex={-1}
                      title={`Remove ${connection.user.name}`}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg text-muted-foreground hover:text-danger hover:bg-danger-soft shrink-0"
                    >
                      <UserMinus className="w-4 h-4" />
                    </span>
                  </button>
                );
              })
            )}

            {connections.outgoing.length > 0 && (
              <div className="pt-4 mt-2 border-t border-border">
                <p className="px-2 py-2 text-2xs font-semibold uppercase tracking-widest text-subtle-foreground">
                  Waiting on them
                </p>
                {connections.outgoing.map((connection) => (
                  <div key={connection.id} className="flex items-center gap-3 p-2.5 opacity-70">
                    <Avatar name={connection.user.name} src={connection.user.avatarUrl} size="sm" />
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-medium text-foreground truncate">
                        {connection.user.name}
                      </span>
                      <span className="block text-xs text-muted-foreground">Request sent</span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>

        {/* ── Conversation ───────────────────────────────────────────── */}
        <section className={cn('flex-1 flex flex-col min-w-0', mobileShowList && 'hidden md:flex')}>
          {!activeConnection ? (
            <div className="flex-1 grid place-items-center p-6">
              <EmptyState
                type="conversation"
                actionLabel="Add someone"
                onAction={() => setAddOpen(true)}
              />
            </div>
          ) : (
            <>
              <header className="h-16 shrink-0 flex items-center gap-3 px-4 border-b border-border bg-card">
                <button
                  onClick={() => setMobileShowList(true)}
                  className="md:hidden p-2 -ml-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  aria-label="Back to conversations"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>

                <Avatar
                  name={activeConnection.user.name}
                  src={activeConnection.user.avatarUrl}
                  size="sm"
                  status={onlineUserIds.includes(activeConnection.user.id) ? 'online' : null}
                />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-foreground truncate leading-tight">
                    {activeConnection.user.name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {typingNames.length > 0
                      ? 'typing…'
                      : onlineUserIds.includes(activeConnection.user.id)
                        ? 'Online'
                        : 'Offline'}
                  </p>
                </div>
              </header>

              <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 bg-background">
                {messagesLoading ? (
                  <div className="space-y-3 max-w-2xl mx-auto">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div
                        key={i}
                        className={cn('h-12 rounded-2xl skeleton-shimmer', i % 2 ? 'ml-auto w-1/2' : 'w-2/3')}
                      />
                    ))}
                  </div>
                ) : messages.length === 0 ? (
                  <div className="h-full grid place-items-center text-center px-6">
                    <div>
                      <MessageSquarePlus className="w-10 h-10 text-subtle-foreground mx-auto mb-4" />
                      <p className="font-medium text-foreground">
                        Say hello to {activeConnection.user.name}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1.5">
                        Messages and files stay between the two of you.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="max-w-3xl mx-auto">
                    {messages.map((message, index) => {
                      const previous = messages[index - 1];
                      const showDay =
                        !previous || dayLabel(previous.createdAt) !== dayLabel(message.createdAt);
                      const grouped =
                        !showDay &&
                        previous?.senderId === message.senderId &&
                        new Date(message.createdAt).getTime() -
                          new Date(previous.createdAt).getTime() <
                          5 * 60_000;

                      const mine = message.senderId === me?.id;

                      return (
                        <React.Fragment key={message.id}>
                          {showDay && (
                            <div className="flex items-center gap-3 my-5">
                              <span className="flex-1 h-px bg-border" />
                              <span className="text-2xs font-medium uppercase tracking-wider text-subtle-foreground">
                                {dayLabel(message.createdAt)}
                              </span>
                              <span className="flex-1 h-px bg-border" />
                            </div>
                          )}
                          <MessageBubble
                            message={message}
                            mine={mine}
                            grouped={grouped}
                            senderName={
                              mine ? me?.name ?? 'You' : message.sender?.name ?? activeConnection.user.name
                            }
                            onDelete={mine ? (id) => deleteMessage(id) : undefined}
                          />
                        </React.Fragment>
                      );
                    })}
                  </div>
                )}

                <AnimatePresence>
                  {typingNames.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="max-w-3xl mx-auto mt-3"
                    >
                      <span className="inline-flex items-center gap-1.5 bg-card border border-border rounded-2xl rounded-bl-md px-3.5 py-3">
                        {[0, 1, 2].map((i) => (
                          <motion.span
                            key={i}
                            animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
                            transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
                            className="w-1.5 h-1.5 rounded-full bg-muted-foreground"
                          />
                        ))}
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {activeChannelId && (
                <Composer
                  channelId={activeChannelId}
                  onLocalNotice={addNotice}
                  onClear={() => {
                    setHiddenBefore((state) => ({
                      ...state,
                      [activeChannelId]: new Date().toISOString(),
                    }));
                    setLocalNotices((notices) =>
                      notices.filter((n) => n.channelId !== activeChannelId)
                    );
                    toast.success('Cleared from your view — nothing was deleted');
                  }}
                />
              )}
            </>
          )}
        </section>
      </div>

      <AddConnectionPanel open={addOpen} onClose={() => setAddOpen(false)} />
    </PageContainer>
  );
};

/** Exported for the sidebar badge count in tests and future reuse. */
export const InboxIcon = Users;
