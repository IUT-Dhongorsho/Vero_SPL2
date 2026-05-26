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
  const variantClasses = {
    default: 'bg-white border border-gray-200',
    glass: 'bg-white/80 backdrop-blur-md border border-gray-200 shadow-lg',
    bordered: 'bg-transparent border-2 border-gray-200',
  };

  const paddingClasses = {
    sm: 'p-3',
    md: 'p-5',
    lg: 'p-7',
  };

  return (
    <div
      className={`
        ${variantClasses[variant]}
        ${paddingClasses[padding]}
        rounded-xl transition-all duration-200
        ${onClick ? 'cursor-pointer card-hover' : ''}
      `}
      onClick={onClick}
    >
      {title && (
        <h3 className="text-lg font-semibold text-gray-900 mb-1">
          {title}
        </h3>
      )}
      {subtitle && (
        <p className="text-sm text-gray-500 mb-3">
          {subtitle}
        </p>
      )}
      {children}
    </div>
  );
};
