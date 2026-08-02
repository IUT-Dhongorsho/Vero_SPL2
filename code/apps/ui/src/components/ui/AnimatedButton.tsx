import React from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { springSnappy } from '../../lib/motion';
import { cn } from '../../utils/cn';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'accent' | 'danger';
type Size = 'sm' | 'md' | 'lg' | 'icon';

interface AnimatedButtonProps
  extends Omit<
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    'onAnimationStart' | 'onDragStart' | 'onDragEnd' | 'onDrag'
  > {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
  children: React.ReactNode;
}

/** Token-driven so both themes stay in step — no hardcoded blues. */
const variants: Record<Variant, string> = {
  primary: 'bg-primary text-primary-foreground hover:opacity-90 shadow-soft',
  secondary: 'bg-secondary text-secondary-foreground hover:bg-muted border border-border',
  outline: 'border border-border-strong text-foreground bg-transparent hover:bg-muted',
  ghost: 'text-muted-foreground hover:text-foreground hover:bg-muted',
  accent: 'bg-accent text-accent-foreground hover:opacity-90 shadow-soft',
  danger: 'bg-danger text-white hover:opacity-90',
};

const sizes: Record<Size, string> = {
  sm: 'px-3.5 py-2 text-sm rounded-lg gap-1.5',
  md: 'px-5 py-2.5 text-sm rounded-xl gap-2',
  lg: 'px-7 py-3.5 text-base rounded-xl gap-2.5',
  icon: 'w-10 h-10 rounded-xl justify-center',
};

export const AnimatedButton: React.FC<AnimatedButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  className = '',
  disabled,
  ...props
}) => (
  <motion.button
    whileTap={disabled || loading ? undefined : { scale: 0.97 }}
    whileHover={disabled || loading ? undefined : { scale: 1.02 }}
    transition={springSnappy}
    className={cn(
      'inline-flex items-center justify-center font-medium transition-colors duration-200',
      'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
      variants[variant],
      sizes[size],
      fullWidth && 'w-full',
      className
    )}
    disabled={disabled || loading}
    {...props}
  >
    {loading && <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
    {children}
  </motion.button>
);
