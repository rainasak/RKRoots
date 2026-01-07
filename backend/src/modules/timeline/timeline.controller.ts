import { Response, NextFunction } from 'express';
import { TimelineService } from './timeline.service';
import { AuthRequest } from '../../common/middleware/auth.middleware';

export class TimelineController {
  constructor(private timelineService: TimelineService) {}

  async create(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const event = await this.timelineService.createEvent({
        treeId: req.params.treeId,
        eventType: req.body.eventType,
        title: req.body.title,
        description: req.body.description,
        eventDate: new Date(req.body.eventDate),
        location: req.body.location,
        userId: req.userId!,
      });
      res.status(201).json(event);
    } catch (error) {
      next(error);
    }
  }

  async getEvents(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const events = await this.timelineService.getEvents(req.params.treeId, req.userId!);
      res.json(events);
    } catch (error) {
      next(error);
    }
  }

  async getById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const event = await this.timelineService.getEventById(req.params.eventId, req.userId!);
      res.json(event);
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const event = await this.timelineService.updateEvent(req.params.eventId, req.userId!, {
        eventType: req.body.eventType,
        title: req.body.title,
        description: req.body.description,
        eventDate: req.body.eventDate ? new Date(req.body.eventDate) : undefined,
        location: req.body.location,
      });
      res.json(event);
    } catch (error) {
      next(error);
    }
  }

  async delete(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await this.timelineService.deleteEvent(req.params.eventId, req.userId!);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
}
