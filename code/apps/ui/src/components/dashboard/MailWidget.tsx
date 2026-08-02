import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  ExternalLink,
  Mail,
  Paperclip,
  RefreshCw,
  Send,
  Star,
} from 'lucide-react';
import { AnimatedButton } from '../ui/AnimatedButton';
import { Avatar } from '../ui/Avatar';
import { toast } from '../Providers/ToastProvider';
import { mailService, type MailMessage, type MailSummary } from '../../services/mailService';
import { EASE_OUT } from '../../lib/motion';
import { cn } from '../../utils/cn';

const GMAIL_URL = 'https://mail.google.com/mail/u/0/#inbox';

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diff / 60_000);
  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/**
 * Shows the five most recent Gmail messages. Replies are sent through the
 * backend only when the user explicitly presses Send.
 */
export const MailWidget: React.FC = () => {
  const [messages, setMessages] = useState<MailSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [notConnected, setNotConnected] = useState<string | null>(null);
  const [open, setOpen] = useState<MailMessage | null>(null);
  const [openLoading, setOpenLoading] = useState(false);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const result = await mailService.inbox(5);
      if (!result.connected) {
        setNotConnected(result.message ?? 'Connect Google to see your inbox here.');
        setMessages([]);
      } else {
        setNotConnected(null);
        setMessages(result.messages);
      }
    } catch (error: any) {
      setNotConnected(
        error?.response?.data?.error === 'gmail-not-connected'
          ? 'Connect Google to see your inbox here.'
          : 'Could not reach the mail service.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openMessage = async (summary: MailSummary) => {
    setOpenLoading(true);
    setReply('');
    try {
      setOpen(await mailService.message(summary.id));
    } catch {
      toast.error('Could not open that message');
    } finally {
      setOpenLoading(false);
    }
  };

  const sendReply = async () => {
    if (!open || !reply.trim()) return;
    setSending(true);
    try {
      await mailService.reply(open.id, reply.trim());
      toast.success(`Reply sent to ${open.from}`);
      setReply('');
      setOpen(null);
      load();
    } catch (error: any) {
      toast.error(error?.response?.data?.error ?? 'Could not send that reply');
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="surface rounded-2xl overflow-hidden flex flex-col">
      <header className="flex items-center justify-between gap-3 px-6 py-5 border-b border-border">
        <div className="flex items-center gap-3 min-w-0">
          <span className="w-10 h-10 rounded-xl bg-accent-soft text-accent grid place-items-center shrink-0">
            <Mail className="w-5 h-5" />
          </span>
          <div className="min-w-0">
            <h3 className="text-lg font-semibold tracking-tight text-foreground">Mail</h3>
            <p className="text-sm text-muted-foreground truncate">
              {notConnected ? 'Not connected' : 'Your five most recent messages'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={load}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            aria-label="Refresh inbox"
          >
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
          </button>
          <a
            href={GMAIL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Open Gmail"
            title="Open Gmail"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </header>

      <AnimatePresence mode="wait">
        {open || openLoading ? (
          <motion.div
            key="reader"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.22, ease: EASE_OUT }}
            className="flex-1 flex flex-col min-h-0"
          >
            {openLoading || !open ? (
              <div className="p-6 space-y-3">
                <div className="h-6 w-2/3 rounded-lg skeleton-shimmer" />
                <div className="h-4 w-1/3 rounded-lg skeleton-shimmer" />
                <div className="h-32 rounded-lg skeleton-shimmer" />
              </div>
            ) : (
              <>
                <div className="px-6 py-4 border-b border-border">
                  <button
                    onClick={() => setOpen(null)}
                    className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3 cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" /> Back to inbox
                  </button>

                  <h4 className="font-semibold text-foreground leading-snug">{open.subject}</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    {open.from} &lt;{open.fromEmail}&gt;
                  </p>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0">
                  <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
                    {open.body.slice(0, 4000)}
                  </p>
                </div>

                <div className="px-6 py-4 border-t border-border space-y-3">
                  <textarea
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    rows={3}
                    placeholder={`Reply to ${open.from}…`}
                    className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground placeholder:text-subtle-foreground focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft transition-all resize-y leading-relaxed"
                  />
                  <div className="flex items-center justify-between gap-3">
                    <a
                      href={open.webUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1.5"
                    >
                      Open in Gmail <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                    <AnimatedButton
                      size="sm"
                      variant="accent"
                      onClick={sendReply}
                      loading={sending}
                      disabled={!reply.trim()}
                    >
                      <Send className="w-4 h-4" />
                      Send reply
                    </AnimatedButton>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1"
          >
            {loading ? (
              <div className="p-4 space-y-2.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-16 rounded-xl skeleton-shimmer" />
                ))}
              </div>
            ) : notConnected ? (
              <div className="px-6 py-10 text-center">
                <Mail className="w-9 h-9 text-subtle-foreground mx-auto mb-4" />
                <p className="font-medium text-foreground mb-1.5">Gmail is not connected</p>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed mb-5">
                  {notConnected}
                </p>
                <a
                  href={GMAIL_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline"
                >
                  Open Gmail instead <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            ) : messages.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <p className="text-sm text-muted-foreground">Your inbox is empty.</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {messages.map((message, index) => (
                  <motion.button
                    key={message.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05, duration: 0.3, ease: EASE_OUT }}
                    onClick={() => openMessage(message)}
                    className="w-full text-left px-5 py-4 flex gap-3.5 hover:bg-muted/60 transition-colors cursor-pointer"
                  >
                    <Avatar name={message.from} size="sm" />

                    <span className="flex-1 min-w-0">
                      <span className="flex items-center gap-2">
                        <span
                          className={cn(
                            'truncate flex-1',
                            message.unread ? 'font-semibold text-foreground' : 'text-foreground/90'
                          )}
                        >
                          {message.from}
                        </span>
                        {message.starred && <Star className="w-3.5 h-3.5 text-warning shrink-0" />}
                        {message.hasAttachment && (
                          <Paperclip className="w-3.5 h-3.5 text-subtle-foreground shrink-0" />
                        )}
                        <span className="text-xs text-subtle-foreground shrink-0 tabular-nums">
                          {relativeTime(message.date)}
                        </span>
                      </span>

                      <span
                        className={cn(
                          'block truncate mt-0.5 text-sm',
                          message.unread ? 'text-foreground font-medium' : 'text-muted-foreground'
                        )}
                      >
                        {message.subject}
                      </span>
                      <span className="block truncate text-sm text-subtle-foreground mt-0.5">
                        {message.snippet}
                      </span>
                    </span>

                    {message.unread && (
                      <span className="w-2 h-2 rounded-full bg-accent shrink-0 mt-2" />
                    )}
                  </motion.button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};
