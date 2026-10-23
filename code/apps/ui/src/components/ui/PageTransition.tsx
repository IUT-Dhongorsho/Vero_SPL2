import React from 'react';
import { motion } from 'framer-motion';
import { EASE_OUT } from '../../lib/motion';

interface PageTransitionProps {
  children: React.ReactNode;
}

/**
 * Route-level fade. Kept as a plain tween rather than a spring so the exit has
 * a finite duration — `AnimatePresence mode="wait"` will not mount the next
 * route until this one finishes.
 */
export const PageTransition: React.FC<PageTransitionProps> = ({ children }) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -6 }}
    transition={{ duration: 0.22, ease: EASE_OUT }}
  >
    {children}
  </motion.div>
);
