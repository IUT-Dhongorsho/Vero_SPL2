import React from 'react';

export interface CardProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  variant?: 'default' | 'glass' | 'bordered';
  padding?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({
  children,
  title,
  subtitle,
  variant = 'default',
  padding = 'md',
  onClick,
}) => {
  const variants: Record<string, React.CSSProperties> = {
    default: {
      backgroundColor: 'var(--bg-primary)',
      border: '1px solid var(--border)',
    },
    glass: {
      background: 'var(--glass-bg)',
      backdropFilter: 'blur(10px)',
      border: '1px solid var(--glass-border)',
    },
    bordered: {
      backgroundColor: 'transparent',
      border: '2px solid var(--border)',
    },
  };

  const paddings: Record<string, string> = {
    sm: '12px',
    md: '20px',
    lg: '28px',
  };

  return (
    <div
      style={{
        ...variants[variant],
        padding: paddings[padding],
        borderRadius: 'var(--radius-lg)',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s ease',
      }}
      onClick={onClick}
    >
      {title && (
        <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: subtitle ? '4px' : '12px' }}>
          {title}
        </h3>
      )}
      {subtitle && (
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
          {subtitle}
        </p>
      )}
      {children}
    </div>
  );
};
