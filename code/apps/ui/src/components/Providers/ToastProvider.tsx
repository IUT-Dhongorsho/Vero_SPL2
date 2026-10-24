import React from 'react';
import { Toaster, toast } from 'react-hot-toast';
import { Check, Loader2, X } from 'lucide-react';

/** Status sits in a small tinted badge; the panel itself is the same frosted glass for every toast. */
const Badge: React.FC<{ tone: 'success' | 'danger' | 'accent'; children: React.ReactNode }> = ({ tone, children }) => (
  <span
    className={
      tone === 'success'
        ? 'w-6 h-6 rounded-full grid place-items-center shrink-0 bg-success-soft text-success'
        : tone === 'danger'
          ? 'w-6 h-6 rounded-full grid place-items-center shrink-0 bg-danger-soft text-danger'
          : 'w-6 h-6 rounded-full grid place-items-center shrink-0 bg-accent-soft text-accent'
    }
  >
    {children}
  </span>
);

export const ToastProvider: React.FC = () => {
  return (
    <Toaster
      position="top-right"
      gutter={10}
      toastOptions={{
        duration: 3200,
        style: {
          background: 'var(--toast-bg)',
          backdropFilter: 'blur(18px) saturate(170%)',
          WebkitBackdropFilter: 'blur(18px) saturate(170%)',
          border: '1px solid var(--toast-border)',
          boxShadow: 'var(--toast-shadow)',
          borderRadius: '14px',
          color: 'var(--foreground)',
          padding: '10px 14px',
          fontSize: '0.875rem',
          maxWidth: '24rem',
        },
        success: {
          icon: (
            <Badge tone="success">
              <Check className="w-3.5 h-3.5" strokeWidth={3} />
            </Badge>
          ),
        },
        error: {
          duration: 4500,
          icon: (
            <Badge tone="danger">
              <X className="w-3.5 h-3.5" strokeWidth={3} />
            </Badge>
          ),
        },
        loading: {
          icon: (
            <Badge tone="accent">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            </Badge>
          ),
        },
      }}
    />
  );
};

export { toast };
