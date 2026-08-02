import { apiClient } from '../utils/apiClient';

export interface MailSummary {
  id: string;
  threadId: string;
  from: string;
  fromEmail: string;
  subject: string;
  snippet: string;
  date: string;
  unread: boolean;
  starred: boolean;
  hasAttachment: boolean;
  webUrl: string;
}

export interface MailMessage extends MailSummary {
  to: string;
  body: string;
}

export interface MailConnection {
  connected: boolean;
  reason: 'not-configured' | 'no-google-account' | 'missing-scope' | 'refresh-failed' | null;
  message: string | null;
}

export const mailService = {
  async status(): Promise<MailConnection> {
    const { data } = await apiClient.get('/mail/status');
    return data;
  },

  async inbox(limit = 5): Promise<{ connected: boolean; messages: MailSummary[]; message?: string | null }> {
    const { data } = await apiClient.get('/mail/inbox', { params: { limit } });
    return data;
  },

  async message(id: string): Promise<MailMessage> {
    const { data } = await apiClient.get(`/mail/messages/${id}`);
    return data;
  },

  /** Sends on the user's behalf — only ever call this from an explicit click. */
  async reply(id: string, body: string) {
    const { data } = await apiClient.post(`/mail/messages/${id}/reply`, { body });
    return data as { success: boolean; id: string; threadId: string };
  },
};
