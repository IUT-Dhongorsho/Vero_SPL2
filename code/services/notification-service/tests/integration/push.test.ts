import { describe, it, expect, vi } from 'vitest';
import { pushDelivery } from '../../src/services/delivery/push.delivery.js';
import { env } from '../../src/config/env.js';
import webpush from 'web-push';

// Mock the web-push library
vi.mock('web-push', () => ({
  default: {
    setVapidDetails: vi.fn(),
    sendNotification: vi.fn(),
  }
}));

describe('Push Delivery Service (NFR/FR)', () => {
  it('should skip delivery if VAPID keys are not configured', async () => {
    // Temporarily unset env for this test if needed, or check logic
    if (!env.VAPID_PUBLIC_KEY) {
        const result = await pushDelivery.deliver({}, {});
        expect(result).toBe(false);
    }
  });

  it('should call web-push sendNotification with correct payload', async () => {
    if (!env.VAPID_PUBLIC_KEY) {
        console.warn('⚠️ Skipping Push test: VAPID keys not provided in .env');
        return;
    }

    const mockSubscription = {
      endpoint: 'https://fcm.googleapis.com/fcm/send/fake-token',
      keys: { p256dh: 'p256dh', auth: 'auth' }
    };
    const mockPayload = { title: 'Test', body: 'Body' };

    // Mock a successful response
    (webpush.sendNotification as any).mockResolvedValue({ statusCode: 201 });

    const result = await pushDelivery.deliver(mockSubscription, mockPayload);

    expect(result).toBe(true);
    expect(webpush.sendNotification).toHaveBeenCalledWith(
        mockSubscription,
        JSON.stringify(mockPayload)
    );
  });

  it('should handle push service errors gracefully', async () => {
    if (!env.VAPID_PUBLIC_KEY) return;

    (webpush.sendNotification as any).mockRejectedValue(new Error('Push Failed'));

    const result = await pushDelivery.deliver({}, {});
    expect(result).toBe(false);
  });
});
