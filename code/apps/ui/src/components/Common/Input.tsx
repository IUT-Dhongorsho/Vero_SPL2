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
    <div className={`${fullWidth ? 'w-full' : 'w-auto'} mb-4`}>
      {label && (
        <label className="block mb-2 text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <input
        className={`
          w-full px-4 py-2.5 text-sm
          border rounded-lg
          transition-all duration-200
          focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
          ${error ? 'border-red-500' : 'border-gray-300'}
        `}
        {...props}
      />
      {error && (
        <p className="mt-1 text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
};
