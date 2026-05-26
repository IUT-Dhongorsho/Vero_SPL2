import React from 'react';
import { Toaster, toast } from 'react-hot-toast';
import { CheckCircle, XCircle, Info, AlertCircle } from 'lucide-react';

export const ToastProvider: React.FC = () => {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 3000,
        style: {
          background: 'var(--glass-bg)',
          backdropFilter: 'blur(12px)',
          border: '1px solid var(--glass-border)',
          borderRadius: '12px',
          color: 'var(--foreground)',
        },
        success: {
          icon: <CheckCircle className="w-5 h-5 text-green-500" />,
          style: { borderLeft: '4px solid #22c55e' },
        },
        error: {
          icon: <XCircle className="w-5 h-5 text-red-500" />,
          style: { borderLeft: '4px solid #ef4444' },
        },
        loading: {
          icon: <Info className="w-5 h-5 text-blue-500" />,
        },
      }}
    />
  );
};

export { toast };
