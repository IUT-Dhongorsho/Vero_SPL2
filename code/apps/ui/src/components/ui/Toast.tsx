import React from 'react';
import { Toaster, toast } from 'react-hot-toast';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';

export const ToastProvider: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: 'var(--card-bg)',
            backdropFilter: 'blur(12px)',
            border: '1px solid var(--glass-border)',
            borderRadius: '12px',
            color: 'var(--text-primary)',
          },
          success: {
            icon: <CheckCircle className="w-5 h-5 text-green-500" />,
          },
          error: {
            icon: <XCircle className="w-5 h-5 text-red-500" />,
          },
          loading: {
            icon: <AlertCircle className="w-5 h-5 text-blue-500" />,
          },
        }}
      />
      {children}
    </>
  );
};

export { toast };
