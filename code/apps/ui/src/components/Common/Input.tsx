import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  fullWidth?: boolean;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  fullWidth = true,
  ...props
}) => {
  return (
    <div style={{ width: fullWidth ? '100%' : 'auto', marginBottom: '16px' }}>
      {label && (
        <label
          style={{
            display: 'block',
            marginBottom: '8px',
            fontSize: '14px',
            fontWeight: 500,
            color: 'var(--text-primary)',
          }}
        >
          {label}
        </label>
      )}
      <input
        style={{
          width: '100%',
          padding: '10px 14px',
          fontSize: '14px',
          border: `1px solid ${error ? 'var(--danger)' : 'var(--border)'}`,
          borderRadius: 'var(--radius-md)',
          backgroundColor: 'var(--bg-primary)',
          color: 'var(--text-primary)',
          transition: 'all 0.2s ease',
          outline: 'none',
        }}
        {...props}
      />
      {error && (
        <p style={{ marginTop: '4px', fontSize: '12px', color: 'var(--danger)' }}>
          {error}
        </p>
      )}
    </div>
  );
};
