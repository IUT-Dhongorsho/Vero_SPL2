import webpush from 'web-push';
import { env } from '../../config/env.js';

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

  async deliver(subscription: any, payload: any) {
    if (!env.VAPID_PUBLIC_KEY) {
      console.warn('⚠️ Push notifications not configured');
      return false;
    }

    try {
      await webpush.sendNotification(subscription, JSON.stringify(payload));
      console.log(`🚀 Push delivered to endpoint: ${subscription.endpoint}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to deliver push:`, error);
      return false;
    }
  }
}

export const pushDelivery = new PushDelivery();
