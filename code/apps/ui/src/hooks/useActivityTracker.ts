import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { profileService } from '../services/profileService';
import { useAuthStore } from '../stores/auth.store';

const HEARTBEAT_INTERVAL_MS = 30_000;
/** Beats stop after this long without any pointer/key/scroll activity. */
const IDLE_AFTER_MS = 3 * 60_000;

/**
 * Reports presence to auth-service so the profile can show real time-on-site.
 *
 * Time is only credited server-side for the gap between two consecutive beats,
 * so a backgrounded tab, an idle user, or a closed laptop all stop the clock —
 * the number reflects attention, not wall-clock time since login.
 */
export function useActivityTracker() {
  const location = useLocation();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const routeRef = useRef(location.pathname);
  const lastInteractionRef = useRef(Date.now());

  routeRef.current = location.pathname;

  useEffect(() => {
    if (!isAuthenticated) return;

    const markInteraction = () => {
      lastInteractionRef.current = Date.now();
    };

    const events: (keyof WindowEventMap)[] = ['pointerdown', 'keydown', 'scroll', 'focus', 'mousemove'];
    events.forEach((event) => window.addEventListener(event, markInteraction, { passive: true }));

    let cancelled = false;

    const beat = async () => {
      if (cancelled) return;
      if (document.visibilityState !== 'visible') return;
      if (Date.now() - lastInteractionRef.current > IDLE_AFTER_MS) return;

      try {
        await profileService.heartbeat(routeRef.current);
      } catch {
        // Presence is best-effort; a failed beat simply is not counted.
      }
    };

    // Open the session immediately so the first interval already has an anchor.
    beat();
    const timer = window.setInterval(beat, HEARTBEAT_INTERVAL_MS);

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        markInteraction();
        beat();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibility);
      events.forEach((event) => window.removeEventListener(event, markInteraction));
    };
  }, [isAuthenticated]);
}
