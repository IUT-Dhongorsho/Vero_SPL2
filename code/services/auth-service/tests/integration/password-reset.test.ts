import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';

const mail = vi.hoisted(() => ({ sent: [] as any[] }));

vi.mock('../../src/services/publisher.service.js', () => ({
  publisherService: { publishUserEvent: vi.fn(async () => undefined) },
  publishMail: vi.fn(async (event: any) => {
    mail.sent.push(event);
  }),
}));

import { eq } from 'drizzle-orm';
import { auth } from '../../src/services/auth.service.js';
import { db } from '../../src/db/client.js';
import { user } from '../../src/models/user.model.js';

const email = `reset-${Date.now()}@vero.test`;
const origin = 'http://localhost:3000';
const headers = () => new Headers({ origin, 'content-type': 'application/json' });

beforeAll(async () => {
  await auth.api.signUpEmail({ body: { name: 'Reset Tester', email, password: 'original-pass-1' }, headers: headers() });
});

afterAll(async () => {
  await db.delete(user).where(eq(user.email, email));
});

describe('password reset', () => {
  it('emails a link to the app’s reset page carrying the token', async () => {
    await auth.api.requestPasswordReset({
      body: { email, redirectTo: `${origin}/reset-password` },
      headers: headers(),
    });

    expect(mail.sent).toHaveLength(1);
    const { type, data } = mail.sent[0];
    expect(type).toBe('mail.password_reset');
    expect(data.to).toBe(email);
    expect(data.name).toBe('Reset Tester');
    expect(data.url).toMatch(/^http:\/\/localhost:3000\/reset-password\?token=[\w-]+$/);
  });

  it('does not reveal whether an address has an account', async () => {
    const before = mail.sent.length;
    const res = await auth.api.requestPasswordReset({
      body: { email: 'nobody-here@vero.test', redirectTo: `${origin}/reset-password` },
      headers: headers(),
    });
    expect(res.status).toBe(true);
    expect(mail.sent).toHaveLength(before);
  });

  it('refuses a redirect to an untrusted origin', async () => {
    // The origin check only runs on real requests, so go through the handler.
    const before = mail.sent.length;
    const res = await auth.handler(
      new Request('http://localhost:8001/api/better-auth/request-password-reset', {
        method: 'POST',
        headers: { origin, 'content-type': 'application/json' },
        body: JSON.stringify({ email, redirectTo: 'https://evil.example.com/steal' }),
      })
    );
    expect(res.status).toBe(403);
    expect(mail.sent).toHaveLength(before);
  });

  it('resets the password with the token, which then stops working', async () => {
    const token = new URL(mail.sent[0].data.url).searchParams.get('token')!;

    await auth.api.resetPassword({ body: { token, newPassword: 'brand-new-pass-2' }, headers: headers() });

    const signedIn = await auth.api.signInEmail({ body: { email, password: 'brand-new-pass-2' }, headers: headers() });
    expect(signedIn.user.email).toBe(email);

    await expect(
      auth.api.signInEmail({ body: { email, password: 'original-pass-1' }, headers: headers() })
    ).rejects.toThrow();

    await expect(
      auth.api.resetPassword({ body: { token, newPassword: 'third-pass-3' }, headers: headers() })
    ).rejects.toThrow();
  });

  it('rejects passwords shorter than eight characters', async () => {
    await expect(
      auth.api.signUpEmail({ body: { name: 'Short', email: `short-${email}`, password: 'abc' }, headers: headers() })
    ).rejects.toThrow();
  });
});
