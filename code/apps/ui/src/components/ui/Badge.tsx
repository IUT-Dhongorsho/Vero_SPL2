import React from 'react';
import { cn } from '../../utils/cn';

type Tone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'info';

interface BadgeProps {
  children: React.ReactNode;
  tone?: Tone;
  className?: string;
  dot?: boolean;
}

const tones: Record<Tone, string> = {
  neutral: 'bg-muted text-muted-foreground',
  accent: 'bg-accent-soft text-accent',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
  info: 'bg-info-soft text-info',
};

const dots: Record<Tone, string> = {
  neutral: 'bg-subtle-foreground',
  accent: 'bg-accent',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  info: 'bg-info',
};

export const Badge: React.FC<BadgeProps> = ({ children, tone = 'neutral', className, dot }) => (
  <span
    className={cn(
      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap',
      tones[tone],
      className
    )}
  >
    {dot && <span className={cn('w-1.5 h-1.5 rounded-full', dots[tone])} />}
    {children}
  </span>
);

const PRIORITY_TONES: Record<string, Tone> = {
  urgent: 'danger',
  high: 'danger',
  medium: 'warning',
  low: 'success',
};

export const PriorityBadge: React.FC<{ priority?: string | null }> = ({ priority }) => {
  const value = (priority ?? 'medium').toLowerCase();
  return (
    <Badge tone={PRIORITY_TONES[value] ?? 'neutral'} dot>
      {value.charAt(0).toUpperCase() + value.slice(1)}
    </Badge>
  );
};

const STATUS_LABELS: Record<string, { label: string; tone: Tone }> = {
  backlog: { label: 'Backlog', tone: 'neutral' },
  todo: { label: 'To do', tone: 'neutral' },
  in_progress: { label: 'In progress', tone: 'info' },
  progress: { label: 'In progress', tone: 'info' },
  in_review: { label: 'In review', tone: 'warning' },
  done: { label: 'Done', tone: 'success' },
};

export const StatusBadge: React.FC<{ status?: string | null }> = ({ status }) => {
  const entry = STATUS_LABELS[(status ?? 'backlog').toLowerCase()] ?? STATUS_LABELS.backlog;
  return <Badge tone={entry.tone}>{entry.label}</Badge>;
};
