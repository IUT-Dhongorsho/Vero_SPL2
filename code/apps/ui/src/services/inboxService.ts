import { apiClient } from '../utils/apiClient';

export type ConnectionStatus = 'pending' | 'accepted' | 'declined' | 'blocked';

export interface ConnectionPerson {
  id: string;
  name: string;
  avatarUrl: string | null;
}

export interface Connection {
  id: string;
  status: ConnectionStatus;
  channelId: string | null;
  message: string | null;
  createdAt: string;
  respondedAt: string | null;
  direction: 'incoming' | 'outgoing';
  user: ConnectionPerson;
}

export interface ConnectionBuckets {
  accepted: Connection[];
  incoming: Connection[];
  outgoing: Connection[];
}

export interface ChatMessage {
  id: string;
  channelId: string;
  senderId: string;
  content: string;
  type: 'text' | 'file' | 'image' | 'action' | 'system';
  attachmentUrl: string | null;
  attachmentName: string | null;
  attachmentMime: string | null;
  attachmentSize: number | null;
  replyToId: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  sender?: { id: string; name: string; avatarUrl: string | null };
  receipts?: { userId: string; status: 'delivered' | 'read' }[];
  /** Present only on optimistic bubbles awaiting the server echo. */
  clientId?: string;
  pending?: boolean;
  failed?: boolean;
}

export interface UploadedAttachment {
  url: string;
  name: string;
  mime: string;
  size: number;
  kind: 'image' | 'file';
}

export const inboxService = {
  async connections(): Promise<ConnectionBuckets> {
    const { data } = await apiClient.get('/chat/connections');
    return data;
  },

  async requestConnection(userId: string, message?: string) {
    const { data } = await apiClient.post('/chat/connections/request', { userId, message });
    return data as { connection: Connection; created: boolean; autoAccepted: boolean };
  },

  async acceptConnection(id: string) {
    const { data } = await apiClient.post(`/chat/connections/${id}/accept`);
    return data;
  },

  async declineConnection(id: string) {
    const { data } = await apiClient.post(`/chat/connections/${id}/decline`);
    return data;
  },

  async removeConnection(id: string): Promise<void> {
    await apiClient.delete(`/chat/connections/${id}`);
  },

  async openDirectChannel(userId: string): Promise<{ id: string }> {
    const { data } = await apiClient.post('/chat/channels/direct', { userId });
    return data;
  },

  /** A project module's group channel. 404 while it is still being set up. */
  async moduleChannel(moduleId: string): Promise<{ id: string; name: string; members: { userId: string; user: ConnectionPerson }[] }> {
    const { data } = await apiClient.get(`/chat/channels/external/${moduleId}`);
    return data;
  },

  async history(channelId: string, before?: string): Promise<ChatMessage[]> {
    const { data } = await apiClient.get(`/chat/messages/${channelId}`, {
      params: { limit: 50, ...(before ? { before } : {}) },
    });
    return data;
  },

  async deleteMessage(messageId: string): Promise<void> {
    await apiClient.delete(`/chat/messages/${messageId}`);
  },

  async uploadFile(channelId: string, file: File, onProgress?: (percent: number) => void) {
    const form = new FormData();
    form.append('file', file);
    form.append('channelId', channelId);

    const { data } = await apiClient.post('/chat/files/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (event) => {
        if (onProgress && event.total) {
          onProgress(Math.round((event.loaded / event.total) * 100));
        }
      },
    });

    return data as UploadedAttachment;
  },
};

export function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value < 10 && unit > 0 ? value.toFixed(1) : Math.round(value)} ${units[unit]}`;
}
