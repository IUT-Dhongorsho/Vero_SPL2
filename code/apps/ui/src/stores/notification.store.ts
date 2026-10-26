import { create } from 'zustand';
import { apiClient } from '../utils/apiClient';
import { connectNotificationSocket, disconnectNotificationSocket } from '../ws/notificationSocket';

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string | null;
  resourceUrl: string | null;
  isRead: boolean;
  actorCount?: number;
  createdAt: string;
}

/**
 * The bell. The server identifies the caller from the session, so the userId
 * arguments only key the socket connection; they are never sent as identity.
 */
interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  fetchNotifications: (userId: string) => Promise<void>;
  fetchUnreadCount: (userId: string) => Promise<void>;
  markAsRead: (userId: string, id: string) => Promise<void>;
  markAllAsRead: (userId: string) => Promise<void>;
  deleteNotification: (userId: string, id: string) => Promise<void>;
  connectSocket: (userId: string) => void;
  disconnectSocket: () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,

  fetchNotifications: async () => {
    set({ loading: true });
    try {
      const response = await apiClient.get<Notification[]>('/notifications');
      set({ notifications: response.data, loading: false });
    } catch (error) {
      console.error('[notifications] failed to load', error);
      set({ loading: false });
    }
  },

  fetchUnreadCount: async () => {
    try {
      const response = await apiClient.get<{ count: number }>('/notifications/unread-count');
      set({ unreadCount: response.data.count });
    } catch (error) {
      console.error('[notifications] failed to load unread count', error);
    }
  },

  markAsRead: async (_userId, id) => {
    const { notifications, unreadCount } = get();
    const target = notifications.find((n) => n.id === id);
    if (!target || target.isRead) return;
    set({
      notifications: notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
      unreadCount: Math.max(0, unreadCount - 1),
    });
    try {
      await apiClient.patch(`/notifications/${id}/read`);
    } catch (error) {
      set({ notifications, unreadCount });
      console.error(`[notifications] failed to mark ${id} as read`, error);
    }
  },

  markAllAsRead: async () => {
    const { notifications, unreadCount } = get();
    set({ notifications: notifications.map((n) => ({ ...n, isRead: true })), unreadCount: 0 });
    try {
      await apiClient.patch('/notifications/read-all');
    } catch (error) {
      set({ notifications, unreadCount });
      console.error('[notifications] failed to mark all as read', error);
    }
  },

  deleteNotification: async (_userId, id) => {
    const { notifications, unreadCount } = get();
    const target = notifications.find((n) => n.id === id);
    set({
      notifications: notifications.filter((n) => n.id !== id),
      unreadCount: target && !target.isRead ? Math.max(0, unreadCount - 1) : unreadCount,
    });
    try {
      await apiClient.delete(`/notifications/${id}`);
    } catch (error) {
      set({ notifications, unreadCount });
      console.error(`[notifications] failed to delete ${id}`, error);
    }
  },

  connectSocket: () => {
    connectNotificationSocket((incoming: Notification) => {
      const { notifications, unreadCount } = get();
      const existing = notifications.find((n) => n.id === incoming.id);
      // A grouped notification arrives again as more activity joins it:
      // move it to the top rather than ignoring or duplicating it.
      set({
        notifications: [{ ...existing, ...incoming }, ...notifications.filter((n) => n.id !== incoming.id)],
        unreadCount: existing && !existing.isRead ? unreadCount : unreadCount + 1,
      });
    });
  },

  disconnectSocket: () => {
    disconnectNotificationSocket();
  },
}));
