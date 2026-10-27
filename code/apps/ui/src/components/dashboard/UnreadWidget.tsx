import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, MessageSquare } from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import { inboxService, type UnreadConversation } from '../../services/inboxService';
import { moduleService, type ModuleRef } from '../../services/moduleService';
import { moduleHref } from '../../lib/routes';
import { timeAgo } from '../../utils/dateUtils';

const SHOWN = 5;
const REFRESH_MS = 60_000;

interface Row {
  conversation: UnreadConversation;
  title: string;
  /** Where the conversation lives, for module chats. */
  place: string | null;
  href: string;
}

function preview(c: UnreadConversation): string {
  const { latest } = c;
  const text =
    latest.type === 'image' ? 'Sent an image' : latest.type === 'file' ? 'Sent a file' : latest.content.trim() || 'Sent a message';
  return c.type === 'direct' ? text : `${latest.sender.name.split(' ')[0]}: ${text}`;
}

/** Unread direct messages and module chat messages, newest first. */
export const UnreadWidget: React.FC = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    try {
      const [unread, connections, modules] = await Promise.all([
        inboxService.unread(),
        inboxService.connections().catch(() => null),
        moduleService.mine().catch(() => [] as ModuleRef[]),
      ]);
      const connectionByChannel = new Map((connections?.accepted ?? []).map((c) => [c.channelId, c.id]));
      const moduleById = new Map(modules.map((m) => [m.id, m]));

      setRows(
        unread.conversations.map((conversation) => {
          if (conversation.type === 'direct') {
            const connectionId = connectionByChannel.get(conversation.channelId);
            return {
              conversation,
              title: conversation.peer?.name ?? conversation.latest.sender.name,
              place: null,
              href: connectionId ? `/inbox/${connectionId}` : '/inbox',
            };
          }
          const module = conversation.externalId ? moduleById.get(conversation.externalId) : undefined;
          return {
            conversation,
            title: module?.name ?? conversation.name?.replace(/ Chat$/, '') ?? 'Group chat',
            place: module?.projectName ?? null,
            href: module ? moduleHref(module.projectId, module.id, 'chat') : '/inbox',
          };
        })
      );
      setTotal(unread.total);
      setFailed(false);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, REFRESH_MS);
    window.addEventListener('focus', load);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', load);
    };
  }, [load]);

  const conversations = rows.length;
  const subtitle = failed
    ? 'Could not load messages'
    : loading
      ? 'Checking…'
      : total === 0
        ? 'You’re all caught up'
        : `${total} unread in ${conversations} ${conversations === 1 ? 'conversation' : 'conversations'}`;

  return (
    <section className="surface rounded-2xl p-6 flex flex-col h-full">
      <div className="flex items-center gap-3 mb-5">
        <span className="w-10 h-10 rounded-xl bg-accent-soft text-accent grid place-items-center">
          <MessageSquare className="w-5 h-5" />
        </span>
        <div>
          <h3 className="text-lg font-semibold tracking-tight text-foreground">Unread messages</h3>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 rounded-xl skeleton-shimmer" />
          ))}
        </div>
      ) : failed ? (
        <div className="flex-1 grid place-items-center py-10 text-center">
          <div>
            <p className="font-medium text-foreground">Messages are unavailable right now</p>
            <button onClick={load} className="mt-2 text-sm font-medium text-accent hover:underline cursor-pointer">
              Try again
            </button>
          </div>
        </div>
      ) : rows.length === 0 ? (
        <div className="flex-1 grid place-items-center py-10 text-center">
          <div>
            <CheckCircle2 className="w-9 h-9 text-success mx-auto mb-3" />
            <p className="font-medium text-foreground">No unread messages</p>
            <p className="text-sm text-muted-foreground mt-1">New direct messages and module chats show up here.</p>
          </div>
        </div>
      ) : (
        <ul className="space-y-1 flex-1 -mx-2">
          {rows.slice(0, SHOWN).map(({ conversation, title, place, href }) => (
            <li key={conversation.channelId}>
              <button
                onClick={() => navigate(href)}
                className="w-full text-left flex items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-muted/50 transition-colors cursor-pointer"
              >
                {conversation.type === 'direct' ? (
                  <Avatar name={title} src={conversation.peer?.avatarUrl} size="sm" />
                ) : (
                  <span className="w-9 h-9 rounded-lg bg-muted text-foreground text-sm font-semibold grid place-items-center shrink-0">
                    {title.charAt(0).toUpperCase()}
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline gap-2">
                    <span className="font-medium text-foreground truncate">{title}</span>
                    {place && <span className="text-xs text-subtle-foreground truncate">{place}</span>}
                  </span>
                  <span className="block text-sm text-muted-foreground truncate">{preview(conversation)}</span>
                </span>
                <span className="flex flex-col items-end gap-1 shrink-0">
                  <span className="text-xs text-subtle-foreground tabular-nums">{timeAgo(conversation.latest.createdAt)}</span>
                  <span
                    className="min-w-5 h-5 px-1.5 rounded-full bg-accent text-accent-foreground text-xs font-semibold grid place-items-center tabular-nums"
                    aria-label={`${conversation.unread} unread`}
                  >
                    {conversation.unread > 99 ? '99+' : conversation.unread}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <button
        onClick={() => navigate('/inbox')}
        className="mt-5 text-sm font-medium text-accent hover:underline text-left cursor-pointer"
      >
        {rows.length > SHOWN ? `See all ${rows.length} in Inbox` : 'Open Inbox'}
      </button>
    </section>
  );
};
