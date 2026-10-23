import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2, Paperclip, Send, Slash } from 'lucide-react';
import { toast } from '../../components/Providers/ToastProvider';
import { inboxService } from '../../services/inboxService';
import { useInboxStore } from '../../stores/inbox.store';
import { SLASH_COMMANDS, runSlashCommand } from './slashCommands';
import { cn } from '../../utils/cn';

interface ComposerProps {
  channelId: string;
  onLocalNotice: (content: string) => void;
  onClear: () => void;
}

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

export const Composer: React.FC<ComposerProps> = ({ channelId, onLocalNotice, onClear }) => {
  const [value, setValue] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadPercent, setUploadPercent] = useState(0);
  const [running, setRunning] = useState(false);
  const [commandIndex, setCommandIndex] = useState(0);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const typingTimer = useRef<number>();

  const sendMessage = useInboxStore((state) => state.sendMessage);
  const setTyping = useInboxStore((state) => state.setTyping);

  // Suggestions appear while the first token is still being typed.
  const commandQuery = value.startsWith('/') && !value.includes(' ') ? value.slice(1).toLowerCase() : null;
  const suggestions =
    commandQuery === null ? [] : SLASH_COMMANDS.filter((c) => c.name.startsWith(commandQuery));

  useEffect(() => setCommandIndex(0), [commandQuery]);

  // Grow the textarea with its content, up to a ceiling.
  useEffect(() => {
    const node = textareaRef.current;
    if (!node) return;
    node.style.height = 'auto';
    node.style.height = `${Math.min(node.scrollHeight, 160)}px`;
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

  const submit = async () => {
    const text = value.trim();
    if (!text || running) return;

    if (text.startsWith('/')) {
      setRunning(true);
      try {
        const result = await runSlashCommand(text);
        if (result) {
          setValue('');
          if (result.kind === 'send') sendMessage({ content: result.content, type: result.type });
          else if (result.kind === 'notice') onLocalNotice(result.content);
          else if (result.kind === 'clear') onClear();
          else if (result.kind === 'error') toast.error(result.content);
          return;
        }
      } finally {
        setRunning(false);
      }
    }

    sendMessage({ content: text });
    setValue('');
    setTyping(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (suggestions.length > 0) {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setCommandIndex((i) => Math.min(i + 1, suggestions.length - 1));
        return;
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setCommandIndex((i) => Math.max(i - 1, 0));
        return;
      }
      if (event.key === 'Tab') {
        event.preventDefault();
        setValue(`/${suggestions[commandIndex].name} `);
        return;
      }
    }

    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      // Enter picks the highlighted command rather than sending a partial one.
      if (suggestions.length > 0 && commandQuery !== suggestions[commandIndex].name) {
        setValue(`/${suggestions[commandIndex].name} `);
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
            className="absolute bottom-full left-3 right-3 md:left-4 md:right-4 mb-2 surface-elevated rounded-xl overflow-hidden max-h-64 overflow-y-auto"
          >
            <p className="px-3.5 pt-3 pb-1.5 text-2xs font-semibold uppercase tracking-widest text-subtle-foreground">
              Commands
            </p>
            {suggestions.map((command, index) => (
              <button
                key={command.name}
                onMouseEnter={() => setCommandIndex(index)}
                onClick={() => {
                  setValue(`/${command.name} `);
                  textareaRef.current?.focus();
                }}
                className={cn(
                  'w-full text-left px-3.5 py-2.5 flex items-start gap-3 transition-colors cursor-pointer',
                  index === commandIndex ? 'bg-muted' : 'hover:bg-muted/60'
                )}
              >
                <Slash className="w-4 h-4 mt-0.5 text-accent shrink-0" />
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-foreground">
                    /{command.name}
                    {command.args && (
                      <span className="text-muted-foreground font-normal"> {command.args}</span>
                    )}
                  </span>
                  <span className="block text-xs text-muted-foreground mt-0.5">
                    {command.description}
                  </span>
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
            signalTyping();
          }}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          rows={1}
          placeholder="Write a message, or type / for commands…"
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
        Enter to send · Shift+Enter for a new line · /help lists every command
      </p>
    </div>
  );
};
