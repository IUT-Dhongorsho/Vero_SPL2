import { describe, it, expect } from 'vitest';
import { emailDelivery } from '../../src/services/delivery/email.delivery.js';
import { env } from '../../src/config/env.js';

describe('Mail Delivery Service (NFR/FR)', () => {
  it('should verify the SMTP connection if credentials are provided', async () => {
    // This test will only be truly effective if SMTP environment variables are set.
    // Otherwise, the service correctly logs a warning and returns false.

    if (!env.SMTP_HOST) {
      console.warn('⚠️ Skipping SMTP verification: SMTP_HOST not provided in .env');
      return;
    }

    const isDelivered = await emailDelivery.deliver(
      'nafislabib1550@gmail.com',
      'Vero Test Email',
      '<h1>SMTP Working</h1><p>This is a test from the notification-service test suite.</p>'
    );

    expect(isDelivered).toBe(true);
  });

  it('should fail gracefully or skip if SMTP is not configured', async () => {
    if (!env.SMTP_HOST) {
      const result = await emailDelivery.deliver('test@test.com', 'test', 'test');
      expect(result).toBe(false);
    }
  });
});
