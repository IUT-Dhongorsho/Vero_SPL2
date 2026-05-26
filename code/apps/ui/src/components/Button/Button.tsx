import React from 'react';

export interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  disabled = false,
  onClick,
  type = 'button',
}) => {
  const styles: Record<string, React.CSSProperties> = {
    primary: {
      backgroundColor: '#8B5CF6',
      color: 'white',
      border: 'none',
    },
    secondary: {
      backgroundColor: 'transparent',
      color: '#8B5CF6',
      border: '1px solid #8B5CF6',
    },
    danger: {
      backgroundColor: '#EF4444',
      color: 'white',
      border: 'none',
    },
  };

  const baseStyle: React.CSSProperties = {
    padding: '8px 16px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    transition: 'all 0.2s ease',
  };

  return (
    <button
      type={type}
      style={{ ...baseStyle, ...styles[variant] }}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
};
