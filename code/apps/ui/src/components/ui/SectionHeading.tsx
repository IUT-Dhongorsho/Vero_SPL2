import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface SectionHeadingProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  actions?: React.ReactNode;
  className?: string;
}

export const SectionHeading: React.FC<SectionHeadingProps> = ({
  title,
  description,
  icon: Icon,
  actions,
  className = '',
}) => (
  <div className={`flex flex-wrap items-start justify-between gap-4 ${className}`}>
    <div className="flex items-start gap-3 min-w-0">
      {Icon && (
        <span className="w-10 h-10 rounded-xl bg-accent-soft text-accent flex items-center justify-center shrink-0">
          <Icon className="w-5 h-5" strokeWidth={1.9} />
        </span>
      )}
      <div className="min-w-0">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">{title}</h2>
        {description && (
          <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{description}</p>
        )}
      </div>
    </div>
    {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
  </div>
);
