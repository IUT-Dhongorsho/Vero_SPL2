import React from 'react';
import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { fadeUp } from '../../lib/motion';
import { useCountUp } from '../../hooks/useGsap';
import { cn } from '../../utils/cn';

interface StatTileProps {
  label: string;
  /** Pass a number to animate it counting up; pass a string for formatted values. */
  value: number | string;
  suffix?: string;
  icon?: LucideIcon;
  hint?: string;
  tone?: 'neutral' | 'accent' | 'success' | 'warning' | 'danger';
  className?: string;
}

const iconTones = {
  neutral: 'bg-muted text-foreground',
  accent: 'bg-accent-soft text-accent',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
};

const CountUpValue: React.FC<{ value: number }> = ({ value }) => {
  const ref = useCountUp(value);
  return <span ref={ref}>0</span>;
};

export const StatTile: React.FC<StatTileProps> = ({
  label,
  value,
  suffix,
  icon: Icon,
  hint,
  tone = 'neutral',
  className,
}) => (
  <motion.div
    variants={fadeUp}
    className={cn('surface rounded-2xl p-5 flex flex-col gap-3', className)}
  >
    <div className="flex items-start justify-between gap-3">
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      {Icon && (
        <span className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', iconTones[tone])}>
          <Icon className="w-4.5 h-4.5" strokeWidth={2} />
        </span>
      )}
    </div>

    <div className="flex items-baseline gap-1.5">
      <span className="text-3xl font-semibold tracking-tight text-foreground tabular-nums">
        {typeof value === 'number' ? <CountUpValue value={value} /> : value}
      </span>
      {suffix && <span className="text-base font-medium text-muted-foreground">{suffix}</span>}
    </div>

    {hint && <p className="text-xs text-subtle-foreground leading-relaxed">{hint}</p>}
  </motion.div>
);
