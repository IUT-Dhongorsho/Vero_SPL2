import type { Transition, Variants } from 'framer-motion';

/**
 * One motion vocabulary for the whole app. Pages import these instead of
 * redefining ad-hoc variants, so timing and easing stay consistent.
 */

export const EASE_OUT: Transition['ease'] = [0.16, 1, 0.3, 1];
export const EASE_IN_OUT: Transition['ease'] = [0.65, 0, 0.35, 1];

export const springSoft: Transition = { type: 'spring', stiffness: 260, damping: 26, mass: 0.9 };
export const springSnappy: Transition = { type: 'spring', stiffness: 420, damping: 30 };

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE_OUT } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.2, ease: EASE_IN_OUT } },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.3, ease: EASE_OUT } },
  exit: { opacity: 0, transition: { duration: 0.18 } },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  show: { opacity: 1, scale: 1, transition: springSoft },
  exit: { opacity: 0, scale: 0.98, transition: { duration: 0.15 } },
};

export const slideInLeft: Variants = {
  hidden: { opacity: 0, x: -20 },
  show: { opacity: 1, x: 0, transition: { duration: 0.4, ease: EASE_OUT } },
  exit: { opacity: 0, x: -12, transition: { duration: 0.18 } },
};

/** Parent wrapper that cascades its children in. */
export function stagger(delayChildren = 0.04, staggerChildren = 0.06): Variants {
  return {
    hidden: {},
    show: { transition: { delayChildren, staggerChildren } },
    exit: {},
  };
}

/** Standard interactive card feedback. */
export const hoverLift = {
  whileHover: { y: -3, transition: springSnappy },
  whileTap: { scale: 0.985 },
};

export const pressable = {
  whileHover: { scale: 1.02, transition: springSnappy },
  whileTap: { scale: 0.97 },
};
