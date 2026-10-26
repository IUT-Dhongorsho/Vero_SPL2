import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChatMessage } from '../services/inboxService';
import { useInboxStore } from '../stores/inbox.store';

/**
 * View state for the open channel: its messages plus local-only notices
 * (slash command output) and a per-person "cleared before" cutoff, typing
 * names, and a scroll container that sticks to the newest message.
 */
export function useConversation(channelId: string | null) {
  const messagesByChannel = useInboxStore((s) => s.messagesByChannel);
  const typingByChannel = useInboxStore((s) => s.typingByChannel);
  const [notices, setNotices] = useState<ChatMessage[]>([]);
  const [hiddenBefore, setHiddenBefore] = useState<Record<string, string>>({});
  const scrollRef = useRef<HTMLDivElement>(null);

  const messages = useMemo(() => {
    if (!channelId) return [];
    const cutoff = hiddenBefore[channelId];
    const stored = messagesByChannel[channelId] ?? [];
    const visible = cutoff ? stored.filter((m) => new Date(m.createdAt).getTime() > new Date(cutoff).getTime()) : stored;

    return [...visible, ...notices.filter((n) => n.channelId === channelId)].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }, [channelId, messagesByChannel, notices, hiddenBefore]);

  // Stick to the bottom as new messages arrive.
  useEffect(() => {
    const node = scrollRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages.length, channelId]);

  const addNotice = (content: string) => {
    if (!channelId) return;
    const now = new Date().toISOString();
    setNotices((list) => [
      ...list,
      {
        id: `notice-${Date.now()}`,
        channelId,
        senderId: 'system',
        content,
        type: 'system',
        attachmentUrl: null,
        attachmentName: null,
        attachmentMime: null,
        attachmentSize: null,
        replyToId: null,
        deletedAt: null,
        createdAt: now,
        updatedAt: now,
      },
    ]);
  };

  /** `/clear`: hides everything so far for this person only. */
  const clearView = () => {
    if (!channelId) return;
    setHiddenBefore((state) => ({ ...state, [channelId]: new Date().toISOString() }));
    setNotices((list) => list.filter((n) => n.channelId !== channelId));
  };

  return {
    messages,
    addNotice,
    clearView,
    scrollRef,
    typingNames: channelId ? typingByChannel[channelId] ?? [] : [],
  };
}
