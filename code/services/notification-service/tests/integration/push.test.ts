import { describe, it, expect, vi } from 'vitest';

vi.mock('web-push', () => ({
  default: {
    setVapidDetails: vi.fn(),
    sendNotification: vi.fn(),
  },
}));
vi.hoisted(() => {
  process.env.VAPID_PUBLIC_KEY = 'public';
  process.env.VAPID_PRIVATE_KEY = 'private';
});

import webpush from 'web-push';
import { pushDelivery } from '../../src/services/delivery/push.delivery.js';

const subscription = { endpoint: 'https://fcm.googleapis.com/fcm/send/fake', keys: { p256dh: 'p', auth: 'a' } };

describe('push delivery', () => {
  it('sends the payload to the subscription', async () => {
    vi.mocked(webpush.sendNotification).mockResolvedValue({ statusCode: 201 } as any);
    const result = await pushDelivery.deliver(subscription, { title: 'Hi' });
    expect(result).toBe('sent');
    expect(webpush.sendNotification).toHaveBeenCalledWith(subscription, JSON.stringify({ title: 'Hi' }));
  });

  it('reports subscriptions the browser has dropped', async () => {
    vi.mocked(webpush.sendNotification).mockRejectedValue(Object.assign(new Error('Gone'), { statusCode: 410 }));
    expect(await pushDelivery.deliver(subscription, {})).toBe('gone');
  });

  it('reports other failures without throwing', async () => {
    vi.mocked(webpush.sendNotification).mockRejectedValue(new Error('Network down'));
    expect(await pushDelivery.deliver(subscription, {})).toBe('failed');
  });
});
