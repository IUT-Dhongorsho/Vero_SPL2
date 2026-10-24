/**
 * Where the browser reaches the backend.
 *
 * Every service sits behind one gateway prefix — the Vite proxy in development,
 * nginx everywhere else — so the app only needs `VITE_API_URL`. It may be
 * relative (`/api`, the default) or absolute (`https://host/api`); both are
 * resolved against the page so libraries that insist on absolute URLs
 * (Better Auth, socket.io) get one.
 */
const configured = (import.meta.env.VITE_API_URL as string | undefined)?.trim() || '/api';

const resolved = new URL(configured.replace(/\/+$/, ''), window.location.origin);

/** Absolute API base without a trailing slash, e.g. `http://localhost:3000/api`. */
export const API_BASE = resolved.toString().replace(/\/+$/, '');

/** Origin the gateway lives on — what socket.io connects to. */
export const API_ORIGIN = resolved.origin;

/** Path prefix of the gateway, e.g. `/api`. */
export const API_PATH = resolved.pathname.replace(/\/+$/, '');

/** WebSocket URL for a gateway path, e.g. `wsUrl('/notes/yjs')`. */
export function wsUrl(path: string): string {
  const url = new URL(`${API_PATH}${path}`, API_ORIGIN);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  return url.toString();
}

/** socket.io `path` option for a service mounted under the gateway. */
export function socketPath(service: string): string {
  return `${API_PATH}/${service}/socket.io/`;
}
