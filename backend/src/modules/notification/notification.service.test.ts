import { NotificationType } from '../../database/interfaces';

const mockQuery = jest.fn();

jest.mock('../../config/database', () => ({
  query: (...args: unknown[]) => mockQuery(...args),
}));

import { NotificationService } from './notification.service';

describe('NotificationService', () => {
  let service: NotificationService;

  beforeEach(() => {
    mockQuery.mockReset();
    service = new NotificationService();
  });

  describe('createNotification', () => {
    it('should create notification', async () => {
      const dto = {
        userId: 'user1',
        notificationType: NotificationType.ACCESS_GRANTED,
        message: 'You have been granted access',
      };

      const notification = {
        notificationId: 'notif1',
        ...dto,
        isRead: false,
        createdAt: new Date(),
      };

      mockQuery.mockResolvedValueOnce({ rows: [notification] });

      const result = await service.createNotification(dto);

      expect(result.notificationId).toBe('notif1');
    });
  });

  describe('notifyAccessGranted', () => {
    it('should create access granted notification', async () => {
      const notification = {
        notificationId: 'notif1',
        userId: 'user1',
        notificationType: NotificationType.ACCESS_GRANTED,
        message: 'You have been granted editor access to the family tree "Test Tree"',
        isRead: false,
        createdAt: new Date(),
      };

      mockQuery.mockResolvedValueOnce({ rows: [notification] });

      await service.notifyAccessGranted('user1', 'tree1', 'Test Tree', 'editor');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO notifications'),
        expect.arrayContaining(['user1', NotificationType.ACCESS_GRANTED])
      );
    });
  });

  describe('notifyCommentAdded', () => {
    it('should create notifications for all tree users except creator in single query', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 2 });

      await service.notifyCommentAdded('tree1', 'node', 'entity1', 'creator');

      expect(mockQuery).toHaveBeenCalledTimes(1);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO notifications'),
        expect.arrayContaining(['tree1', 'creator'])
      );
    });
  });

  describe('notifyNodePublished', () => {
    it('should create notifications for all tree users except publisher in single query', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 2 });

      await service.notifyNodePublished('tree1', 'node1', 'John Doe', 'publisher');

      expect(mockQuery).toHaveBeenCalledTimes(1);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO notifications'),
        expect.arrayContaining(['tree1', 'publisher'])
      );
    });
  });

  describe('notifyTimelineEventAdded', () => {
    it('should create notifications for all tree users except creator in single query', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 2 });

      await service.notifyTimelineEventAdded('tree1', 'event1', 'Birthday Party', 'creator');

      expect(mockQuery).toHaveBeenCalledTimes(1);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO notifications'),
        expect.arrayContaining(['tree1', 'creator'])
      );
    });
  });

  describe('getNotifications', () => {
    it('should return all user notifications', async () => {
      const userId = 'user1';

      mockQuery.mockResolvedValueOnce({
        rows: [
          { notificationId: 'notif1', userId, createdAt: new Date() },
          { notificationId: 'notif2', userId, createdAt: new Date() },
        ],
      });

      const result = await service.getNotifications(userId);

      expect(result.length).toBe(2);
    });

    it('should return only unread notifications when unreadOnly is true', async () => {
      const userId = 'user1';

      mockQuery.mockResolvedValueOnce({
        rows: [
          { notificationId: 'notif1', userId, isRead: false, createdAt: new Date() },
        ],
      });

      const result = await service.getNotifications(userId, true);

      expect(result.length).toBe(1);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('is_read = false'),
        [userId]
      );
    });
  });

  describe('getUserNotifications', () => {
    it('should return user notifications', async () => {
      const userId = 'user1';

      mockQuery.mockResolvedValueOnce({
        rows: [
          { notificationId: 'notif1', userId, createdAt: new Date() },
          { notificationId: 'notif2', userId, createdAt: new Date() },
        ],
      });

      const result = await service.getUserNotifications(userId);

      expect(result.length).toBe(2);
    });
  });

  describe('getUnreadNotifications', () => {
    it('should return only unread notifications', async () => {
      const userId = 'user1';

      mockQuery.mockResolvedValueOnce({
        rows: [
          { notificationId: 'notif1', userId, isRead: false, createdAt: new Date() },
        ],
      });

      const result = await service.getUnreadNotifications(userId);

      expect(result.length).toBe(1);
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      const notificationId = 'notif1';
      const userId = 'user1';

      mockQuery.mockResolvedValueOnce({ rowCount: 1 });

      await service.markAsRead(notificationId, userId);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE notifications'),
        [notificationId, userId]
      );
    });

    it('should throw error if notification not found', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 0 });

      await expect(service.markAsRead('notif1', 'user1'))
        .rejects.toThrow('Notification not found');
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all notifications as read', async () => {
      const userId = 'user1';

      mockQuery.mockResolvedValueOnce({ rowCount: 3 });

      await service.markAllAsRead(userId);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE notifications'),
        [userId]
      );
    });
  });
});
