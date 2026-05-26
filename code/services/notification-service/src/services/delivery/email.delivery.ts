import nodemailer from 'nodemailer';
import { env } from '../../config/env.js';

export class EmailDelivery {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    if (env.SMTP_HOST) {
      this.transporter = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_PORT === 465,
        auth: {
          user: env.SMTP_USER,
          pass: env.SMTP_PASS,
        },
      });
      console.log('📧 Email Delivery initialized');
    }
  }

  async deliver(to: string, subject: string, html: string) {
    if (!this.transporter) {
      console.warn('⚠️ Email transporter not configured');
      return false;
    }

    try {
      await this.transporter.sendMail({
        from: env.FROM_EMAIL,
        to,
        subject,
        html,
      });
      console.log(`🚀 Email delivered to: ${to}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to deliver email to ${to}:`, error);
      return false;
    }
  }
}

export const emailDelivery = new EmailDelivery();
