import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2, Paperclip, Send, Slash, Users } from 'lucide-react';
import { toast } from '../../components/Providers/ToastProvider';
import { inboxService, type ChatNotice } from '../../services/inboxService';
import { useInboxStore } from '../../stores/inbox.store';
import { useAuthStore } from '../../stores/auth.store';
import { SLASH_COMMANDS, findMentions, runSlashCommand } from './slashCommands';
import { cn } from '../../utils/cn';

export interface MentionableMember {
  id: string;
  name: string;
  avatarUrl: string | null;
}

interface ComposerProps {
  channelId: string;
  onLocalNotice: (notice: ChatNotice) => void;
  /** People who can be @mentioned. Leave out to turn mentions off (direct messages). */
  members?: MentionableMember[];
}

interface Suggestion {
  key: string;
  icon: React.ReactNode;
  label: React.ReactNode;
  hint: string;
  /** Text that replaces what is being typed. */
  insert: string;
}

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
const MAX_MENTION_SUGGESTIONS = 6;

/** "@sie" right before the caret, at the start or after a space. */
function mentionQueryAt(text: string, caret: number): { query: string; start: number } | null {
  const match = text.slice(0, caret).match(/(?:^|\s)@([^\s@]*)$/);
  if (!match) return null;
  return { query: match[1].toLowerCase(), start: caret - match[1].length - 1 };
}

const Avatar: React.FC<{ member: MentionableMember }> = ({ member }) =>
  member.avatarUrl ? (
    <img src={member.avatarUrl} alt="" className="w-6 h-6 rounded-full object-cover" />
  ) : (
    <span className="w-6 h-6 rounded-full bg-accent-soft text-accent text-xs font-semibold grid place-items-center">
      {member.name.charAt(0).toUpperCase()}
    </span>
  );

export const Composer: React.FC<ComposerProps> = ({ channelId, onLocalNotice, members }) => {
  const [value, setValue] = useState('');
  const [caret, setCaret] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadPercent, setUploadPercent] = useState(0);
  const [running, setRunning] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [dismissed, setDismissed] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const typingTimer = useRef<number>();
  const pendingCaret = useRef<number | null>(null);

  const { pathname } = useLocation();
  const meId = useAuthStore((state) => state.user?.id);
  const sendMessage = useInboxStore((state) => state.sendMessage);
  const setTyping = useInboxStore((state) => state.setTyping);

  const others = (members ?? []).filter((m) => m.id !== meId);
  const mentionsOn = others.length > 0;

  // Commands are suggested while the first word is still being typed.
  const commandQuery = value.startsWith('/') && !value.includes(' ') ? value.slice(1).toLowerCase() : null;
  const mention = mentionsOn && commandQuery === null ? mentionQueryAt(value, caret) : null;

  let heading = '';
  let suggestions: Suggestion[] = [];
  if (commandQuery !== null) {
    heading = 'Commands';
    suggestions = SLASH_COMMANDS.filter((c) => c.name.startsWith(commandQuery)).map((c) => ({
      key: c.name,
      icon: <Slash className="w-4 h-4 text-accent" />,
      label: (
        <>
          /{c.name}
          {c.args && <span className="text-muted-foreground font-normal"> {c.args}</span>}
        </>
      ),
      hint: c.description,
      insert: `/${c.name} `,
    }));
  } else if (mention) {
    heading = 'Mention someone';
    const q = mention.query;
    const people = others
      .filter((m) => !q || m.name.toLowerCase().split(' ').some((word) => word.startsWith(q)) || m.name.toLowerCase().startsWith(q))
      .slice(0, MAX_MENTION_SUGGESTIONS)
      .map<Suggestion>((m) => ({
        key: m.id,
        icon: <Avatar member={m} />,
        label: m.name,
        hint: 'Gets a notification',
        insert: `@${m.name} `,
      }));
    const everyone: Suggestion[] =
      !q || 'all'.startsWith(q) || 'everyone'.startsWith(q)
        ? [
            {
              key: '@all',
              icon: (
                <span className="w-6 h-6 rounded-full bg-muted grid place-items-center">
                  <Users className="w-3.5 h-3.5 text-muted-foreground" />
                </span>
              ),
              label: '@all',
              hint: `Notifies everyone here (${others.length})`,
              insert: '@all ',
            },
          ]
        : [];
    suggestions = [...people, ...everyone];
  }

  // Escape hides the list until what is being typed changes.
  const suggestionKey = `${commandQuery ?? ''}|${mention?.query ?? ''}|${mention?.start ?? ''}`;
  if (dismissed === suggestionKey) suggestions = [];
  useEffect(() => setActiveIndex(0), [suggestionKey]);

  // Grow the textarea with its content, up to a ceiling.
  useEffect(() => {
    const node = textareaRef.current;
    if (!node) return;
    node.style.height = 'auto';
    node.style.height = `${Math.min(node.scrollHeight, 160)}px`;
    if (pendingCaret.current !== null) {
      node.setSelectionRange(pendingCaret.current, pendingCaret.current);
      setCaret(pendingCaret.current);
      pendingCaret.current = null;
    }
  }, [value]);

  useEffect(() => {
    return () => {
      window.clearTimeout(typingTimer.current);
      setTyping(false);
    };
  }, [setTyping]);

  const signalTyping = () => {
    setTyping(true);
    window.clearTimeout(typingTimer.current);
    typingTimer.current = window.setTimeout(() => setTyping(false), 2200);
  };

  const apply = (suggestion: Suggestion) => {
    if (commandQuery !== null) {
      setValue(suggestion.insert);
      pendingCaret.current = suggestion.insert.length;
    } else if (mention) {
      const next = value.slice(0, mention.start) + suggestion.insert + value.slice(caret);
      setValue(next);
      pendingCaret.current = mention.start + suggestion.insert.length;
    }
    textareaRef.current?.focus();
  };

  const submit = async () => {
    const text = value.trim();
    if (!text || running) return;

    if (text.startsWith('/')) {
      setRunning(true);
      try {
        const result = await runSlashCommand(text, pathname);
        if (result?.kind === 'notice') {
          setValue('');
          onLocalNotice(result.notice);
        } else if (result?.kind === 'error') {
          // Keep the text so it can be fixed rather than retyped.
          toast.error(result.content);
        }
      } finally {
        setRunning(false);
      }
      return;
    }

    const { mentions, mentionsAll } = mentionsOn ? findMentions(text, others) : { mentions: [], mentionsAll: false };
    sendMessage({ content: text, mentions, mentionsAll, link: pathname });
    setValue('');
    setTyping(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (suggestions.length > 0) {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
        return;
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
        return;
      }
      if (event.key === 'Tab') {
        event.preventDefault();
        apply(suggestions[activeIndex]);
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        setDismissed(suggestionKey);
        return;
      }
    }

    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      // Enter picks the highlighted suggestion rather than sending half a word,
      // unless the command is already typed in full.
      const typedInFull = commandQuery !== null && suggestions[activeIndex]?.key === commandQuery;
      if (suggestions.length > 0 && !typedInFull) {
        apply(suggestions[activeIndex]);
        return;
      }
      submit();
    }
  };

  const uploadAndSend = async (file: File) => {
    if (file.size > MAX_UPLOAD_BYTES) {
      toast.error('Files must be 25 MB or smaller');
      return;
    }

    setUploading(true);
    setUploadPercent(0);
    try {
      const attachment = await inboxService.uploadFile(channelId, file, setUploadPercent);
      sendMessage({
        content: '',
        type: attachment.kind,
        attachment: {
          url: attachment.url,
          name: attachment.name,
          mime: attachment.mime,
          size: attachment.size,
        },
      });
    } catch (error: any) {
      toast.error(error?.response?.data?.error ?? 'Upload failed');
    } finally {
      setUploading(false);
      setUploadPercent(0);
    }
  };

  const handlePaste = (event: React.ClipboardEvent) => {
    const file = Array.from(event.clipboardData.files)[0];
    if (file) {
      event.preventDefault();
      uploadAndSend(file);
    }
  };

  return (
    <div className="relative border-t border-border bg-card px-3 py-3 md:px-4">
      <AnimatePresence>
        {suggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="absolute bottom-full left-3 right-3 md:left-4 md:right-4 mb-2 surface-elevated rounded-xl overflow-hidden max-h-72 overflow-y-auto"
            role="listbox"
          >
            <p className="px-3.5 pt-3 pb-1.5 text-xs font-medium text-subtle-foreground">{heading}</p>
            {suggestions.map((suggestion, index) => (
              <button
                key={suggestion.key}
                role="option"
                aria-selected={index === activeIndex}
                onMouseEnter={() => setActiveIndex(index)}
                // Keep focus in the textarea so the caret position survives.
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => apply(suggestion)}
                className={cn(
                  'w-full text-left px-3.5 py-2.5 flex items-center gap-3 transition-colors cursor-pointer',
                  index === activeIndex ? 'bg-muted' : 'hover:bg-muted/60'
                )}
              >
                <span className="shrink-0 grid place-items-center w-6">{suggestion.icon}</span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-foreground truncate">{suggestion.label}</span>
                  <span className="block text-xs text-muted-foreground mt-0.5 truncate">{suggestion.hint}</span>
                </span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {uploading && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-2.5"
          >
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin shrink-0" />
              <span className="shrink-0">Uploading…</span>
              <span className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                <motion.span
                  className="block h-full bg-accent rounded-full"
                  animate={{ width: `${uploadPercent}%` }}
                  transition={{ duration: 0.2 }}
                />
              </span>
              <span className="tabular-nums shrink-0">{uploadPercent}%</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-end gap-2">
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) uploadAndSend(file);
            e.target.value = '';
          }}
        />

        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="w-10 h-10 rounded-xl grid place-items-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0 cursor-pointer disabled:opacity-50"
          aria-label="Attach a file"
          title="Attach a file (max 25 MB)"
        >
          <Paperclip className="w-[18px] h-[18px]" />
        </button>

        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setCaret(e.target.selectionStart ?? e.target.value.length);
            signalTyping();
          }}
          onSelect={(e) => setCaret(e.currentTarget.selectionStart ?? 0)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          rows={1}
          placeholder="Write a message"
          aria-autocomplete="list"
          className="flex-1 resize-none bg-muted border border-border rounded-2xl px-4 py-2.5 text-foreground placeholder:text-subtle-foreground focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft transition-all leading-relaxed max-h-40"
        />

        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={submit}
          disabled={!value.trim() || running}
          className="w-10 h-10 rounded-xl grid place-items-center bg-accent text-accent-foreground shrink-0 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity cursor-pointer"
          aria-label="Send message"
        >
          {running ? <Loader2 className="w-[18px] h-[18px] animate-spin" /> : <Send className="w-[18px] h-[18px]" />}
        </motion.button>
      </div>

      <p className="mt-2 text-2xs text-subtle-foreground px-1">
        {mentionsOn ? 'Type / for commands or @ to mention someone.' : 'Type / for commands.'} Shift+Enter adds a new
        line.
      </p>
    </div>
  );
};
