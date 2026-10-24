import { emailDelivery } from '../delivery/email.delivery.js';
import { passwordResetEmail } from '../email-templates.js';

/**
 * Transactional mail: sent straight away, never stored or grouped. The
 * recipient may not even have a replicated user row yet.
 */
export class MailHandler {
  async handle(event: any) {
    const { type, data } = event ?? {};
    switch (type) {
      case 'mail.password_reset': {
        if (!data?.to || !data?.url) return;
        const message = passwordResetEmail(data.name, data.url);
        await emailDelivery.deliver(data.to, message.subject, message.html);
        break;
      }
      default:
        console.warn(`⚠️ [MailHandler] Unknown mail event: ${type}`);
    }
  }
}

export const mailHandler = new MailHandler();
