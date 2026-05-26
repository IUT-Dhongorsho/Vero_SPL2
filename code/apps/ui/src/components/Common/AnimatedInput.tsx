import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../utils/cn';

interface AnimatedInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const AnimatedInput: React.FC<AnimatedInputProps> = ({
  label,
  error,
  value,
  onChange,
  onFocus,
  onBlur,
  className,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const hasValue = value && String(value).length > 0;

  return (
    <div className="relative mb-6">
      <motion.label
        animate={{
          y: isFocused || hasValue ? -28 : 0,
          scale: isFocused || hasValue ? 0.85 : 1,
          x: isFocused || hasValue ? -8 : 0,
        }}
        initial={false}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className={cn(
          'absolute left-3 top-3 z-10 pointer-events-none',
          'text-gray-500 dark:text-gray-400',
          (isFocused || hasValue) && 'text-blue-600 dark:text-blue-400'
        )}
      >
        {label}
      </motion.label>
      
      <input
        className={cn(
          'w-full px-3 py-3 rounded-lg border-2 bg-transparent',
          'focus:outline-none transition-all duration-200',
          'dark:text-white dark:placeholder-gray-500',
          error
            ? 'border-red-500 focus:border-red-500'
            : 'border-gray-300 dark:border-gray-700 focus:border-blue-500',
          className
        )}
        value={value}
        onChange={onChange}
        onFocus={(e) => {
          setIsFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setIsFocused(false);
          onBlur?.(e);
        }}
        {...props}
      />
      
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="text-red-500 text-sm mt-1"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
};
