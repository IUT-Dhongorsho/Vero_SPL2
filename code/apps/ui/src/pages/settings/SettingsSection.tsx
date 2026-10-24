import React from 'react';
import { cn } from '../../utils/cn';

/** A settings block: what it is on the left, the controls on the right. */
export const SettingsSection: React.FC<{
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
  tone?: 'default' | 'danger';
}> = ({ title, description, children, tone = 'default' }) => (
  <section className={cn('surface rounded-2xl p-6 grid lg:grid-cols-[15rem_1fr] gap-x-8 gap-y-5', tone === 'danger' && 'border-danger/40')}>
    <div>
      <h3 className={cn('font-semibold', tone === 'danger' ? 'text-danger' : 'text-foreground')}>{title}</h3>
      {description && <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{description}</p>}
    </div>
    <div className="min-w-0">{children}</div>
  </section>
);

/** An on/off switch with a visible label. */
export const Toggle: React.FC<{
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  hint?: React.ReactNode;
  disabled?: boolean;
  busy?: boolean;
}> = ({ checked, onChange, label, hint, disabled, busy }) => (
  <div className={cn('flex items-start justify-between gap-6', disabled && 'opacity-60')}>
    <span>
      <span className="block text-sm font-medium text-foreground">{label}</span>
      {hint && <span className="block text-sm text-muted-foreground mt-0.5 leading-relaxed">{hint}</span>}
    </span>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      aria-busy={busy}
      disabled={disabled || busy}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative w-11 h-6 rounded-full shrink-0 transition-colors mt-0.5 disabled:cursor-not-allowed',
        checked ? 'bg-accent' : 'bg-border-strong',
        busy && 'opacity-70'
      )}
    >
      <span
        className={cn('absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-soft transition-transform', checked && 'translate-x-5')}
      />
    </button>
  </div>
);
