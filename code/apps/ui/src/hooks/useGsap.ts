import { useEffect, useRef } from 'react';
import gsap from 'gsap';

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Runs a GSAP timeline scoped to a container ref and reverts it on unmount so
 * React never fights the tween over the same inline styles.
 */
export function useGsapContext<T extends HTMLElement = HTMLDivElement>(
  build: (ctx: { self: T; gsap: typeof gsap }) => void,
  deps: unknown[] = []
) {
  const scope = useRef<T>(null);

  useEffect(() => {
    if (!scope.current || prefersReducedMotion()) return;
    const element = scope.current;
    const ctx = gsap.context(() => build({ self: element, gsap }), element);
    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return scope;
}

/**
 * Counts a number up when it first renders — used for the profile statistics
 * so the figures land with some weight instead of just appearing.
 */
export function useCountUp(value: number, duration = 1.1) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (prefersReducedMotion()) {
      node.textContent = String(Math.round(value));
      return;
    }

    const counter = { current: 0 };
    const tween = gsap.to(counter, {
      current: value,
      duration,
      ease: 'power2.out',
      onUpdate: () => {
        node.textContent = String(Math.round(counter.current));
      },
    });

    return () => {
      tween.kill();
    };
  }, [value, duration]);

  return ref;
}

export { gsap };
