import { vi } from 'vitest';

/**
 * Stands in for auth-service's /internal/verify: `Bearer token-<userId>` is a
 * valid session for <userId>; anything else is rejected.
 */
export function fakeAuthService() {
  const realFetch = globalThis.fetch;
  globalThis.fetch = vi.fn(async (input: any, init?: any) => {
    const url = String(input);
    if (url.includes('/internal/verify')) {
      const header = String(init?.headers?.authorization ?? '');
      const match = header.match(/^Bearer token-(.+)$/);
      return match ? Response.json({ user: { id: match[1] } }) : new Response('{}', { status: 401 });
    }
    return realFetch(input, init);
  }) as any;
  return () => {
    globalThis.fetch = realFetch;
  };
}

export const bearer = (userId: string) => ({ Authorization: `Bearer token-${userId}` });
