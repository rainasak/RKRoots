import api from './api';
import type { Notification } from '../types';

export const notificationService = {
  async getNotifications(unreadOnly: boolean = false): Promise<Notification[]> {
    const response = await api.get<Notification[]>('/notifications', {
      params: { unreadOnly: unreadOnly.toString() },
    });
    return response.data;
  },

  async getUnreadCount(): Promise<number> {
    const notifications = await this.getNotifications(true);
    return notifications.length;
  },

  async markAsRead(notificationId: string): Promise<void> {
    await api.put(`/notifications/${notificationId}/read`);
  },

  async markAllAsRead(): Promise<void> {
    await api.put('/notifications/read-all');
  },
};
