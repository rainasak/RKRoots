import { Response, NextFunction } from 'express';
import { NotificationService } from './notification.service';
import { AuthRequest } from '../../common/middleware/auth.middleware';

export class NotificationController {
  constructor(private notificationService: NotificationService) {}

  async getNotifications(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const unreadOnly = req.query.unreadOnly === 'true';
      const notifications = await this.notificationService.getNotifications(req.userId!, unreadOnly);
      res.json(notifications);
    } catch (error) {
      next(error);
    }
  }

  async markAsRead(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await this.notificationService.markAsRead(req.params.notificationId, req.userId!);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  async markAllAsRead(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await this.notificationService.markAllAsRead(req.userId!);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
}
