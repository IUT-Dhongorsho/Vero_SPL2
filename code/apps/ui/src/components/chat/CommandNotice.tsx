import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AtSign, BellRing, CheckCircle2, Slash } from 'lucide-react';
import type { ChatNotice } from '../../services/inboxService';
import { SLASH_COMMANDS } from '../../pages/inbox/slashCommands';
import { cn } from '../../utils/cn';

/** "today at 5:00 PM", "tomorrow at 9:00 AM", "Friday 30 Oct at 9:00 AM". */
function describeWhen(iso: string, withTime = true): string {
  const date = new Date(iso);
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);

  const day =
    date.toDateString() === today.toDateString()
      ? 'today'
      : date.toDateString() === tomorrow.toDateString()
        ? 'tomorrow'
        : date.toLocaleDateString(undefined, {
            weekday: 'long',
            day: 'numeric',
            month: 'short',
            ...(date.getFullYear() !== today.getFullYear() ? { year: 'numeric' } : {}),
          });
  if (!withTime) return day;
  return `${day} at ${date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`;
}

const Shell: React.FC<{
  icon: React.ReactNode;
  tone: 'accent' | 'success';
  title: string;
  children: React.ReactNode;
}> = ({ icon, tone, title, children }) => (
  <motion.div
    initial={{ opacity: 0, y: 6 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.2 }}
    className="my-3 max-w-md rounded-xl border border-border bg-card overflow-hidden"
  >
    <div className="flex items-center gap-2.5 px-4 pt-3.5 pb-3">
      <span
        className={cn(
          'w-7 h-7 rounded-lg grid place-items-center shrink-0',
          tone === 'success' ? 'bg-success-soft text-success' : 'bg-accent-soft text-accent'
        )}
      >
        {icon}
      </span>
      <p className="text-sm font-semibold text-foreground flex-1">{title}</p>
      <span className="text-2xs text-subtle-foreground">Only you can see this</span>
    </div>
    {children}
  </motion.div>
);

const Row: React.FC<{ syntax: React.ReactNode; description: string; example?: string }> = ({
  syntax,
  description,
  example,
}) => (
  <li className="px-4 py-2.5">
    <p className="text-sm text-foreground">{syntax}</p>
    <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
    {example && (
      <p className="mt-1.5">
        <span className="text-xs text-foreground/80 bg-muted rounded-md px-1.5 py-0.5">{example}</span>
      </p>
    )}
  </li>
);

const HelpCard: React.FC<{ mentions: boolean }> = ({ mentions }) => (
  <Shell icon={<Slash className="w-3.5 h-3.5" />} tone="accent" title="Commands">
    <ul className="divide-y divide-border border-t border-border">
      {SLASH_COMMANDS.map((command) => (
        <Row
          key={command.name}
          syntax={
            <>
              <span className="font-medium">/{command.name}</span>
              {command.args && <span className="text-muted-foreground"> {command.args}</span>}
            </>
          }
          description={command.description}
          example={command.name === 'help' ? undefined : command.example}
        />
      ))}
    </ul>

    {mentions && (
      <>
        <p className="flex items-center gap-2 px-4 pt-3.5 pb-1 text-sm font-semibold text-foreground border-t border-border">
          <AtSign className="w-3.5 h-3.5 text-accent" />
          Mentions
        </p>
        <ul className="divide-y divide-border">
          <Row
            syntax={<span className="font-medium">@name</span>}
            description="Notifies that person. Type @ and pick someone from the list."
          />
          <Row syntax={<span className="font-medium">@all</span>} description="Notifies everyone in this chat." />
        </ul>
      </>
    )}

    <p className="px-4 py-3 text-xs text-muted-foreground bg-muted/40 border-t border-border leading-relaxed">
      Times you can write: in 30 minutes, in 2 hours, tomorrow 9am, friday at 5, next week, nov 2.
    </p>
  </Shell>
);

/** Output of a slash command, shown only to the person who ran it. */
export const CommandNotice: React.FC<{ notice: ChatNotice; mentions: boolean }> = ({ notice, mentions }) => {
  if (notice.kind === 'help') return <HelpCard mentions={mentions} />;

  if (notice.kind === 'task') {
    return (
      <Shell icon={<CheckCircle2 className="w-4 h-4" />} tone="success" title="Task added">
        <div className="px-4 pb-3.5 -mt-1">
          <p className="text-sm text-foreground">{notice.title}</p>
          <p className="text-sm text-muted-foreground mt-0.5">
            {notice.due ? `Due ${describeWhen(notice.due, false)}` : 'No due date'}
          </p>
          <Link to="/work" className="inline-block mt-2.5 text-sm font-medium text-accent hover:underline">
            Open Tasks
          </Link>
        </div>
      </Shell>
    );
  }

  return (
    <Shell icon={<BellRing className="w-3.5 h-3.5" />} tone="accent" title="Reminder set">
      <div className="px-4 pb-3.5 -mt-1">
        <p className="text-sm text-foreground">{notice.text}</p>
        <p className="text-sm text-muted-foreground mt-0.5">
          You’ll get a notification {describeWhen(notice.at)}.
        </p>
      </div>
    </Shell>
  );
};
