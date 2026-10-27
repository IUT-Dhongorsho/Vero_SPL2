import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, CheckCheck, Clock, Download, FileText, Trash2 } from 'lucide-react';
import { formatFileSize, type ChatMessage } from '../../services/inboxService';
import { CommandNotice } from '../../components/chat/CommandNotice';
import { cn } from '../../utils/cn';

interface MessageBubbleProps {
  message: ChatMessage;
  mine: boolean;
  /** Hide the avatar/name when the previous bubble was from the same person. */
  grouped: boolean;
  senderName: string;
  onDelete?: (id: string) => void;
  /** Splits @mentions out of the text for highlighting; null when the chat has none. */
  mentionPattern?: RegExp | null;
  /** The message mentions the person reading it. */
  mentionsMe?: boolean;
}

function timeOf(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

/** Highlights @mentions in a run of plain text. */
const Mentions: React.FC<{ text: string; pattern?: RegExp | null; mine: boolean }> = ({ text, pattern, mine }) => {
  if (!pattern) return <>{text}</>;
  return (
    <>
      {text.split(pattern).map((part, index) =>
        index % 2 === 1 ? (
          <span key={index} className={cn('font-semibold', !mine && 'text-accent')}>
            {part}
          </span>
        ) : (
          part
        )
      )}
    </>
  );
};

/** Renders ||spoiler|| segments (from older messages) as click-to-reveal, and highlights mentions. */
const MessageText: React.FC<{ content: string; mentionPattern?: RegExp | null; mine: boolean }> = ({
  content,
  mentionPattern,
  mine,
}) => {
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});
  const parts = content.split(/(\|\|[^|]+\|\|)/g);

  return (
    <>
      {parts.map((part, index) => {
        if (!/^\|\|.+\|\|$/.test(part)) {
          return (
            <span key={index}>
              <Mentions text={part} pattern={mentionPattern} mine={mine} />
            </span>
          );
        }
        const text = part.slice(2, -2);
        const isRevealed = revealed[index];
        return (
          <button
            key={index}
            onClick={() => setRevealed((r) => ({ ...r, [index]: !r[index] }))}
            className={cn(
              'rounded px-1 transition-all cursor-pointer',
              isRevealed ? 'bg-black/10 dark:bg-white/10' : 'bg-current text-transparent select-none'
            )}
            title={isRevealed ? 'Hide' : 'Click to reveal'}
          >
            {text}
          </button>
        );
      })}
    </>
  );
};

const Attachment: React.FC<{ message: ChatMessage; mine: boolean }> = ({ message, mine }) => {
  const isImage = message.type === 'image' || message.attachmentMime?.startsWith('image/');
  const href = message.attachmentUrl ?? '#';

  if (isImage) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="block mt-1 -mx-1">
        <img
          src={href}
          alt={message.attachmentName ?? 'Shared image'}
          loading="lazy"
          className="rounded-xl max-h-72 w-auto object-cover border border-black/5 dark:border-white/10"
        />
      </a>
    );
  }

  return (
    <a
      href={href}
      download={message.attachmentName ?? undefined}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'mt-1 flex items-center gap-3 rounded-xl p-3 transition-colors',
        mine ? 'bg-black/10 hover:bg-black/15' : 'bg-foreground/5 hover:bg-foreground/10'
      )}
    >
      <span className="w-10 h-10 rounded-lg bg-background/60 grid place-items-center shrink-0">
        <FileText className="w-5 h-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium truncate">{message.attachmentName}</span>
        <span className="block text-xs opacity-70">{formatFileSize(message.attachmentSize)}</span>
      </span>
      <Download className="w-4 h-4 shrink-0 opacity-70" />
    </a>
  );
};

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  mine,
  grouped,
  senderName,
  onDelete,
  mentionPattern,
  mentionsMe,
}) => {
  if (message.notice) return <CommandNotice notice={message.notice} mentions={Boolean(mentionPattern)} />;

  // Action messages (older /me posts) read as narration rather than speech.
  if (message.type === 'action') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-1.5"
      >
        <span className="text-sm italic text-muted-foreground">
          {senderName} {message.content}
        </span>
      </motion.div>
    );
  }

  if (message.type === 'system') {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-center py-1.5">
        <span className="text-xs text-muted-foreground bg-muted rounded-full px-3.5 py-1.5 whitespace-pre-wrap max-w-lg text-left leading-relaxed">
          {message.content}
        </span>
      </motion.div>
    );
  }

  const hasAttachment = Boolean(message.attachmentUrl);
  const read = message.receipts?.some((r) => r.status === 'read');

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      className={cn('group flex gap-2 items-end', mine ? 'justify-end' : 'justify-start', grouped ? 'mt-0.5' : 'mt-3')}
    >
      {mine && onDelete && !message.pending && (
        <button
          onClick={() => onDelete(message.id)}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg text-muted-foreground hover:text-danger hover:bg-danger-soft cursor-pointer shrink-0"
          aria-label="Delete message"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}

      <div
        className={cn(
          'max-w-[min(78%,34rem)] rounded-2xl px-3.5 py-2.5 shadow-soft',
          mine
            ? 'bg-accent text-accent-foreground rounded-br-md'
            : 'bg-card border border-border text-foreground rounded-bl-md',
          !mine && mentionsMe && 'border-accent/60 ring-1 ring-accent/25',
          message.pending && 'opacity-70'
        )}
      >
        {!mine && !grouped && (
          <p className="text-xs font-semibold text-accent mb-1">{senderName}</p>
        )}

        {hasAttachment && <Attachment message={message} mine={mine} />}

        {message.content && (
          <p className={cn('whitespace-pre-wrap break-words leading-relaxed', hasAttachment && 'mt-2')}>
            <MessageText content={message.content} mentionPattern={mentionPattern} mine={mine} />
          </p>
        )}

        <div
          className={cn(
            'flex items-center justify-end gap-1 mt-1 -mb-0.5',
            mine ? 'text-accent-foreground/70' : 'text-subtle-foreground'
          )}
        >
          <span className="text-2xs tabular-nums">{timeOf(message.createdAt)}</span>
          {mine &&
            (message.pending ? (
              <Clock className="w-3 h-3" />
            ) : read ? (
              <CheckCheck className="w-3.5 h-3.5" />
            ) : (
              <Check className="w-3.5 h-3.5" />
            ))}
        </div>
      </div>
    </motion.div>
  );
};
