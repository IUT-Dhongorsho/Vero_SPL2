import React, { useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { MessageSquarePlus } from 'lucide-react';
import { MessageBubble } from '../../pages/inbox/MessageBubble';
import { escapeRegExp, findMentions } from '../../pages/inbox/slashCommands';
import type { ChatMessage } from '../../services/inboxService';
import { cn } from '../../utils/cn';

/**
 * One capture group around any "@Full Name", "@First" or "@all", so
 * `text.split(pattern)` puts every mention at an odd index.
 */
function mentionPatternFor(members: { name: string }[]): RegExp {
  const names = new Set<string>(['all', 'everyone']);
  for (const m of members) {
    names.add(m.name);
    const first = m.name.split(' ')[0];
    if (first) names.add(first);
  }
  const alternatives = [...names].sort((a, b) => b.length - a.length).map(escapeRegExp).join('|');
  return new RegExp(`((?<![\\w@])@(?:${alternatives}))(?![\\w])`, 'gi');
}

export function dayLabel(iso: string): string {
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

interface MessageThreadProps {
  messages: ChatMessage[];
  loading: boolean;
  meId?: string;
  meName?: string;
  /** Name for messages whose sender profile did not come with them. */
  fallbackName: string;
  typingNames: string[];
  emptyTitle: string;
  emptyHint: string;
  onDelete: (id: string) => void;
  /** People who can be @mentioned here. Leave out where mentions do not apply. */
  members?: { id: string; name: string }[];
}

/** The scrolling body of a conversation: day breaks, grouped bubbles, typing dots. */
export const MessageThread: React.FC<MessageThreadProps> = ({
  messages,
  loading,
  meId,
  meName,
  fallbackName,
  typingNames,
  emptyTitle,
  emptyHint,
  onDelete,
  members,
}) => {
  const mentionPattern = useMemo(() => (members?.length ? mentionPatternFor(members) : null), [members]);

  const mentionsMe = (message: ChatMessage) => {
    if (!members?.length || !meId || !message.content.includes('@')) return false;
    const found = findMentions(message.content, members);
    return found.mentionsAll || found.mentions.includes(meId);
  };

  return (
  <>
    {loading ? (
      <div className="space-y-3 max-w-2xl mx-auto">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className={cn('h-12 rounded-2xl skeleton-shimmer', i % 2 ? 'ml-auto w-1/2' : 'w-2/3')} />
        ))}
      </div>
    ) : messages.length === 0 ? (
      <div className="h-full grid place-items-center text-center px-6">
        <div>
          <MessageSquarePlus className="w-10 h-10 text-subtle-foreground mx-auto mb-4" />
          <p className="font-medium text-foreground">{emptyTitle}</p>
          <p className="text-sm text-muted-foreground mt-1.5">{emptyHint}</p>
        </div>
      </div>
    ) : (
      <div className="max-w-3xl mx-auto">
        {messages.map((message, index) => {
          const previous = messages[index - 1];
          const showDay = !previous || dayLabel(previous.createdAt) !== dayLabel(message.createdAt);
          const grouped =
            !showDay &&
            previous?.senderId === message.senderId &&
            new Date(message.createdAt).getTime() - new Date(previous.createdAt).getTime() < 5 * 60_000;
          const mine = message.senderId === meId;

          return (
            <React.Fragment key={message.id}>
              {showDay && (
                <div className="flex items-center gap-3 my-5">
                  <span className="flex-1 h-px bg-border" />
                  <span className="text-xs font-medium text-subtle-foreground">{dayLabel(message.createdAt)}</span>
                  <span className="flex-1 h-px bg-border" />
                </div>
              )}
              <MessageBubble
                message={message}
                mine={mine}
                grouped={grouped}
                senderName={mine ? meName ?? 'You' : message.sender?.name ?? fallbackName}
                onDelete={mine ? onDelete : undefined}
                mentionPattern={mentionPattern}
                mentionsMe={!mine && mentionsMe(message)}
              />
            </React.Fragment>
          );
        })}
      </div>
    )}

    <AnimatePresence>
      {typingNames.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="max-w-3xl mx-auto mt-3">
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
  </>
  );
};
