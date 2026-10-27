import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChatMessage, ChatNotice } from '../services/inboxService';
import { useInboxStore } from '../stores/inbox.store';

/**
 * View state for the open channel: its messages plus local-only notices
 * (slash command output), typing names, and a scroll container that sticks to
 * the newest message.
 */
export function useConversation(channelId: string | null) {
  const messagesByChannel = useInboxStore((s) => s.messagesByChannel);
  const typingByChannel = useInboxStore((s) => s.typingByChannel);
  const [notices, setNotices] = useState<ChatMessage[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const messages = useMemo(() => {
    if (!channelId) return [];
    const stored = messagesByChannel[channelId] ?? [];

    return [...stored, ...notices.filter((n) => n.channelId === channelId)].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }, [channelId, messagesByChannel, notices]);

  // Stick to the bottom as new messages arrive.
  useEffect(() => {
    const node = scrollRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages.length, channelId]);

  const addNotice = (notice: ChatNotice) => {
    if (!channelId) return;
    const now = new Date().toISOString();
    setNotices((list) => [
      ...list,
      {
        id: `notice-${Date.now()}`,
        channelId,
        senderId: 'system',
        content: '',
        type: 'system',
        attachmentUrl: null,
        attachmentName: null,
        attachmentMime: null,
        attachmentSize: null,
        replyToId: null,
        deletedAt: null,
        createdAt: now,
        updatedAt: now,
        notice,
      },
    ]);
  };

  return {
    messages,
    addNotice,
    scrollRef,
    typingNames: channelId ? typingByChannel[channelId] ?? [] : [],
  };
}
