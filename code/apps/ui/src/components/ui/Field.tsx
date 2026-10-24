import React, { useId } from 'react';
import { cn } from '../../utils/cn';

/** Shared input look — matches the search fields used across the app. */
export const inputClass =
  'w-full px-3.5 py-2.5 rounded-xl bg-card border border-border text-foreground placeholder:text-subtle-foreground ' +
  'focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft transition-[border-color,box-shadow] ' +
  'disabled:opacity-60 disabled:cursor-not-allowed';

interface FieldProps {
  label: string;
  hint?: React.ReactNode;
  error?: string | null;
  children: (props: { id: string; 'aria-describedby'?: string; 'aria-invalid'?: boolean }) => React.ReactNode;
  className?: string;
}

/** Label, control, then a hint or error under it. */
export const Field: React.FC<FieldProps> = ({ label, hint, error, children, className }) => {
  const id = useId();
  const noteId = `${id}-note`;
  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={id} className="block text-sm font-medium text-foreground">
        {label}
      </label>
      {children({ id, 'aria-describedby': hint || error ? noteId : undefined, 'aria-invalid': !!error || undefined })}
      {(error || hint) && (
        <p id={noteId} className={cn('text-xs leading-relaxed', error ? 'text-danger' : 'text-muted-foreground')}>
          {error || hint}
        </p>
      )}
    </div>
  );
};
