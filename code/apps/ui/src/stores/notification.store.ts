import { create } from 'zustand';
import axios from 'axios';
import { useAuthStore } from './auth.store';
import { connectNotificationSocket, disconnectNotificationSocket } from '../ws/notificationSocket';

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string | null;
  resourceUrl: string | null;
  isRead: boolean;
  createdAt: string;
}

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

// Create dedicated Axios instance for the Notification microservice
const notificationBaseURL = import.meta.env.VITE_NOTIFICATION_SERVICE_URL || 'http://localhost:8006';

const notificationClient = axios.create({
  baseURL: notificationBaseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Inject authentication token into notification requests
notificationClient.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,

  fetchNotifications: async (userId) => {
    set({ loading: true });
    try {
      const response = await notificationClient.get<Notification[]>('/api/notifications', {
        params: { userId },
      });
      set({ notifications: response.data, loading: false });
    } catch (error) {
      console.error('❌ [useNotificationStore] Failed to fetch notifications:', error);
      set({ loading: false });
    }
  },

  fetchUnreadCount: async (userId) => {
    try {
      const response = await notificationClient.get<{ count: number }>('/api/notifications/unread-count', {
        params: { userId },
      });
      set({ unreadCount: response.data.count });
    } catch (error) {
      console.error('❌ [useNotificationStore] Failed to fetch unread count:', error);
    }
  },

  markAsRead: async (userId, id) => {
    try {
      await notificationClient.patch(`/api/notifications/${id}/read`, { userId });
      
      const { notifications, unreadCount } = get();
      const target = notifications.find((n) => n.id === id);
      
      // Only adjust count if notification transitions from unread to read
      const wasUnread = target ? !target.isRead : false;

      set({
        notifications: notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
        unreadCount: wasUnread ? Math.max(0, unreadCount - 1) : unreadCount,
      });
    } catch (error) {
      console.error(`❌ [useNotificationStore] Failed to mark notification ${id} as read:`, error);
    }
  },

  markAllAsRead: async (userId) => {
    try {
      await notificationClient.patch('/api/notifications/read-all', { userId });
      
      const { notifications } = get();
      set({
        notifications: notifications.map((n) => ({ ...n, isRead: true })),
        unreadCount: 0,
      });
    } catch (error) {
      console.error('❌ [useNotificationStore] Failed to mark all notifications as read:', error);
    }
  },

  deleteNotification: async (userId, id) => {
    try {
      await notificationClient.delete(`/api/notifications/${id}`, {
        data: { userId },
      });

      const { notifications, unreadCount } = get();
      const target = notifications.find((n) => n.id === id);
      const wasUnread = target ? !target.isRead : false;

      set({
        notifications: notifications.filter((n) => n.id !== id),
        unreadCount: wasUnread ? Math.max(0, unreadCount - 1) : unreadCount,
      });
    } catch (error) {
      console.error(`❌ [useNotificationStore] Failed to delete notification ${id}:`, error);
    }
  },

  connectSocket: (userId) => {
    connectNotificationSocket(userId, (newNotification) => {
      const { notifications, unreadCount } = get();
      
      // Avoid inserting duplicates
      if (notifications.some((n) => n.id === newNotification.id)) {
        return;
      }

      set({
        notifications: [newNotification, ...notifications],
        unreadCount: unreadCount + 1,
      });
    });
  },

  disconnectSocket: () => {
    disconnectNotificationSocket();
  },
}));
