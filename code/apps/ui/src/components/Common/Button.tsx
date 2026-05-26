import React from 'react';

export interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  disabled = false,
  loading = false,
  onClick,
  type = 'button',
  icon,
}) => {
  const variants: Record<string, React.CSSProperties> = {
    primary: {
      backgroundColor: 'var(--primary)',
      color: 'white',
      border: 'none',
    },
    secondary: {
      backgroundColor: 'var(--secondary)',
      color: 'white',
      border: 'none',
    },
    outline: {
      backgroundColor: 'transparent',
      color: 'var(--primary)',
      border: '1px solid var(--primary)',
    },
    danger: {
      backgroundColor: 'var(--danger)',
      color: 'white',
      border: 'none',
    },
    ghost: {
      backgroundColor: 'transparent',
      color: 'var(--text-secondary)',
      border: '1px solid var(--border)',
    },
  };

  const sizes: Record<string, React.CSSProperties> = {
    sm: { padding: '6px 12px', fontSize: '12px' },
    md: { padding: '10px 20px', fontSize: '14px' },
    lg: { padding: '14px 28px', fontSize: '16px' },
  };

  return (
    <button
      type={type}
      style={{
        ...variants[variant],
        ...sizes[size],
        width: fullWidth ? '100%' : 'auto',
        borderRadius: 'var(--radius-md)',
        fontWeight: 500,
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        opacity: disabled || loading ? 0.6 : 1,
        transition: 'all 0.2s ease',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
      }}
      disabled={disabled || loading}
      onClick={onClick}
    >
      {loading && <span>⏳</span>}
      {icon && !loading && <span>{icon}</span>}
      {children}
    </button>
  );
};
