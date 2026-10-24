import { describe, it, expect, vi, beforeEach } from 'vitest';

// Never send real mail from a test run: capture what would have gone out.
const sent = vi.hoisted(() => [] as any[]);
vi.mock('nodemailer', () => ({
  default: {
    createTransport: vi.fn(() => ({
      sendMail: vi.fn(async (message: any) => {
        sent.push(message);
        return { messageId: 'test' };
      }),
    })),
  },
}));
vi.hoisted(() => {
  process.env.SMTP_HOST = 'smtp.test.local';
  process.env.SMTP_PORT = '587';
  process.env.SMTP_USER = 'robot@vero.test';
  process.env.SMTP_PASS = 'x';
  delete process.env.FROM_EMAIL;
});

import { mailHandler } from '../../src/services/handlers/mail.handler.js';
import { passwordResetEmail, notificationEmail } from '../../src/services/email-templates.js';

beforeEach(() => {
  sent.length = 0;
});

describe('transactional mail', () => {
  it('sends the password reset link from the SMTP account', async () => {
    await mailHandler.handle({
      type: 'mail.password_reset',
      data: { to: 'ada@vero.test', name: 'Ada', url: 'http://localhost:3000/reset-password?token=t0k' },
    });

    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({
      to: 'ada@vero.test',
      from: 'Vero <robot@vero.test>',
      subject: 'Reset your Vero password',
    });
    expect(sent[0].html).toContain('href="http://localhost:3000/reset-password?token=t0k"');
    expect(sent[0].html).toContain('Hi Ada,');
  });

  it('ignores malformed events', async () => {
    await mailHandler.handle({ type: 'mail.password_reset', data: { to: 'x@vero.test' } });
    await mailHandler.handle({ type: 'mail.unknown', data: {} });
    expect(sent).toHaveLength(0);
  });
});

describe('email templates', () => {
  it('escapes user-controlled text', () => {
    const { html } = passwordResetEmail('<script>alert(1)</script>', 'http://x/?a=1&b=2');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('a=1&amp;b=2');
  });

  it('links notifications into the app', () => {
    const { html, subject } = notificationEmail('Ada assigned you a task', 'Ship it', '/project/p/module/m/board');
    expect(subject).toBe('Ada assigned you a task');
    expect(html).toContain('/project/p/module/m/board');
  });
});
