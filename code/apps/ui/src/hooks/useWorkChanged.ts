import { useEffect, useRef } from 'react';

/** Fired on window when a board or work list changed somewhere (see ws/notificationSocket). */
export const WORK_CHANGED = 'vero:work-changed';

export interface WorkChange {
  boardId: string | null;
  projectId: string | null;
}

/**
 * Runs `handler` when tasks change anywhere the user can see — or when they
 * come back to the tab, in case a signal was missed while it was hidden.
 * Bursts (a drag across columns) collapse into one call.
 */
export function useWorkChanged(handler: (change: WorkChange | null) => void, delayMs = 300) {
  const latest = useRef(handler);
  latest.current = handler;

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const later = (change: WorkChange | null) => {
      clearTimeout(timer);
      timer = setTimeout(() => latest.current(change), delayMs);
    };
    const onChange = (event: Event) => later((event as CustomEvent<WorkChange>).detail ?? null);
    const onFocus = () => later(null);

    window.addEventListener(WORK_CHANGED, onChange);
    window.addEventListener('focus', onFocus);
    return () => {
      clearTimeout(timer);
      window.removeEventListener(WORK_CHANGED, onChange);
      window.removeEventListener('focus', onFocus);
    };
  }, [delayMs]);
}
