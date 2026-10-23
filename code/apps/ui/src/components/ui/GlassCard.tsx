import React from 'react';
import { motion } from 'framer-motion';
import { fadeUp, hoverLift } from '../../lib/motion';
import { cn } from '../../utils/cn';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  /** `glass` for translucent panels over imagery, `solid` for content cards. */
  variant?: 'solid' | 'glass';
  /** Turn off when the parent already staggers its children in. */
  animate?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className = '',
  onClick,
  variant = 'solid',
  animate = true,
}) => {
  const interactive = Boolean(onClick);

  return (
    <motion.div
      variants={fadeUp}
      {...(animate ? { initial: 'hidden', animate: 'show' } : {})}
      {...(interactive ? hoverLift : {})}
      onClick={onClick}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={
        interactive
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
      className={cn(
        'rounded-2xl p-6 transition-colors duration-200',
        variant === 'glass' ? 'glass' : 'surface',
        interactive && 'cursor-pointer hover:border-border-strong',
        className
      )}
    >
      {children}
    </motion.div>
  );
};
