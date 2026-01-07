import { query } from '../../config/database';
import { Notification, NotificationType } from '../../database/interfaces';
import { AppError } from '../../common/errors/app-error';

export { NotificationType };

interface CreateNotificationDto {
  userId: string;
  notificationType: NotificationType;
  message: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
}

export class NotificationService {
  async createNotification(dto: CreateNotificationDto): Promise<Notification> {
    const result = await query<Notification>(
      `INSERT INTO notifications (user_id, notification_type, message, related_entity_type, related_entity_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING notification_id as "notificationId", user_id as "userId", notification_type as "notificationType", message, related_entity_type as "relatedEntityType", related_entity_id as "relatedEntityId", is_read as "isRead", created_at as "createdAt"`,
      [dto.userId, dto.notificationType, dto.message, dto.relatedEntityType || null, dto.relatedEntityId || null]
    );

    return result.rows[0];
  }

  async notifyAccessGranted(userId: string, treeId: string, treeName: string, accessLevel: string): Promise<void> {
    await this.createNotification({
      userId,
      notificationType: NotificationType.ACCESS_GRANTED,
      message: `You have been granted ${accessLevel} access to the family tree "${treeName}"`,
      relatedEntityType: 'tree',
      relatedEntityId: treeId,
    });
  }

  async notifySamePersonLinkCreated(ownerUserId: string, linkId: string, creatorUserId: string): Promise<void> {
    if (ownerUserId === creatorUserId) return;
    
    await this.createNotification({
      userId: ownerUserId,
      notificationType: NotificationType.SAME_PERSON_LINK_CREATED,
      message: 'A same person link has been created connecting your family tree to another tree',
      relatedEntityType: 'same_person_link',
      relatedEntityId: linkId,
    });
  }

  async notifyAccessRequest(ownerUserId: string, requestId: string): Promise<void> {
    await this.createNotification({
      userId: ownerUserId,
      notificationType: NotificationType.ACCESS_REQUEST,
      message: 'A user has requested access to your family tree',
      relatedEntityType: 'access_request',
      relatedEntityId: requestId,
    });
  }

  async notifyCommentAdded(treeId: string, entityType: string, entityId: string, commentCreatorId: string): Promise<void> {
    await query(
      `INSERT INTO notifications (user_id, notification_type, message, related_entity_type, related_entity_id)
       SELECT ta.user_id, $1, $2, $3, $4
       FROM tree_access ta
       WHERE ta.tree_id = $5 AND ta.user_id != $6`,
      [
        NotificationType.COMMENT_ADDED,
        `A new comment has been added to a ${entityType} in your family tree`,
        entityType,
        entityId,
        treeId,
        commentCreatorId
      ]
    );
  }

  async notifyNodePublished(treeId: string, nodeId: string, nodeName: string, publisherUserId: string): Promise<void> {
    await query(
      `INSERT INTO notifications (user_id, notification_type, message, related_entity_type, related_entity_id)
       SELECT ta.user_id, $1, $2, $3, $4
       FROM tree_access ta
       WHERE ta.tree_id = $5 AND ta.user_id != $6`,
      [
        NotificationType.NODE_PUBLISHED,
        `A new family member "${nodeName}" has been added to your family tree`,
        'node',
        nodeId,
        treeId,
        publisherUserId
      ]
    );
  }

  async notifyTimelineEventAdded(treeId: string, eventId: string, eventTitle: string, creatorUserId: string): Promise<void> {
    await query(
      `INSERT INTO notifications (user_id, notification_type, message, related_entity_type, related_entity_id)
       SELECT ta.user_id, $1, $2, $3, $4
       FROM tree_access ta
       WHERE ta.tree_id = $5 AND ta.user_id != $6`,
      [
        NotificationType.TIMELINE_EVENT_ADDED,
        `A new timeline event "${eventTitle}" has been added to your family tree`,
        'event',
        eventId,
        treeId,
        creatorUserId
      ]
    );
  }

  async getNotifications(userId: string, unreadOnly: boolean = false): Promise<Notification[]> {
    const whereClause = unreadOnly 
      ? 'WHERE user_id = $1 AND is_read = false'
      : 'WHERE user_id = $1';
    
    const result = await query<Notification>(
      `SELECT notification_id as "notificationId", user_id as "userId", notification_type as "notificationType", message, related_entity_type as "relatedEntityType", related_entity_id as "relatedEntityId", is_read as "isRead", created_at as "createdAt"
       FROM notifications
       ${whereClause}
       ORDER BY created_at DESC`,
      [userId]
    );

    return result.rows;
  }

  async getUserNotifications(userId: string): Promise<Notification[]> {
    return this.getNotifications(userId, false);
  }

  async getUnreadNotifications(userId: string): Promise<Notification[]> {
    return this.getNotifications(userId, true);
  }

  async markAsRead(notificationId: string, userId: string): Promise<void> {
    const result = await query(
      `UPDATE notifications SET is_read = true WHERE notification_id = $1 AND user_id = $2`,
      [notificationId, userId]
    );

    if (result.rowCount === 0) {
      throw new AppError('Notification not found', 404);
    }
  }

  async markAllAsRead(userId: string): Promise<void> {
    await query(
      `UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false`,
      [userId]
    );
  }
}
