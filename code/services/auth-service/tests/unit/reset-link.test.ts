import { describe, it, expect, vi } from 'vitest';

vi.mock('../../src/db/client.js', () => ({ db: {} }));
vi.mock('../../src/services/publisher.service.js', () => ({
  publisherService: { publishUserEvent: vi.fn() },
  publishMail: vi.fn(),
}));

import { resetLinkFor } from '../../src/services/auth.service.js';

describe('resetLinkFor', () => {
  it('links straight to the app page named in callbackURL', () => {
    const url =
      'https://auth.example.dev/api/better-auth/reset-password/abc?callbackURL=' +
      encodeURIComponent('http://localhost:3000/reset-password');
    expect(resetLinkFor(url, 'abc')).toBe('http://localhost:3000/reset-password?token=abc');
  });

  it('keeps existing query parameters on the callback', () => {
    const url =
      'https://auth.example.dev/api/better-auth/reset-password/t1?callbackURL=' +
      encodeURIComponent('https://app.example.dev/reset-password?from=email');
    expect(resetLinkFor(url, 't1')).toBe('https://app.example.dev/reset-password?from=email&token=t1');
  });

  it('falls back to Better Auth’s own link without a callback', () => {
    const url = 'https://auth.example.dev/api/better-auth/reset-password/t2?callbackURL=';
    expect(resetLinkFor(url, 't2')).toBe(url);
  });
});
