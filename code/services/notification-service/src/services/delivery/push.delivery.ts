import webpush from 'web-push';
import { env } from '../../config/env.js';

export type PushResult = 'sent' | 'failed' | 'gone';

export class PushDelivery {
  constructor() {
    if (env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY) {
      webpush.setVapidDetails(
        env.VAPID_SUBJECT,
        env.VAPID_PUBLIC_KEY,
        env.VAPID_PRIVATE_KEY
      );
      console.log('📱 Push Delivery initialized');
    }
  }

  get enabled() {
    return !!(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY);
  }

  /** `gone` means the browser dropped the subscription and it should be deleted. */
  async deliver(subscription: any, payload: any): Promise<PushResult> {
    if (!this.enabled) {
      return 'failed';
    }

    try {
      await webpush.sendNotification(subscription, JSON.stringify(payload));
      return 'sent';
    } catch (error: any) {
      if (error?.statusCode === 404 || error?.statusCode === 410) return 'gone';
      console.error(`❌ Failed to deliver push:`, error?.message ?? error);
      return 'failed';
    }
  }
}

export const pushDelivery = new PushDelivery();
