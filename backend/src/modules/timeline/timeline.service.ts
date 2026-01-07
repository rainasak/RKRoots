import { query } from '../../config/database';
import { TimelineEvent, EventType, AccessLevel } from '../../database/interfaces';
import { AccessControlService } from '../../common/services/access-control.service';
import { NotificationService } from '../notification/notification.service';
import { AppError } from '../../common/errors/app-error';

interface CreateEventDto {
  treeId: string;
  eventType: EventType;
  title: string;
  description?: string;
  eventDate: Date;
  location?: string;
  userId: string;
}

interface UpdateEventDto {
  eventType?: EventType;
  title?: string;
  description?: string;
  eventDate?: Date;
  location?: string;
}

const EVENT_SELECT_FIELDS = `event_id as "eventId", tree_id as "treeId", event_type as "eventType", title, description, event_date as "eventDate", location, created_by as "createdBy", created_at as "createdAt", updated_at as "updatedAt"`;

export class TimelineService {
  private accessControl: AccessControlService;
  private notificationService: NotificationService;

  constructor() {
    this.accessControl = new AccessControlService();
    this.notificationService = new NotificationService();
  }

  async createEvent(createDto: CreateEventDto): Promise<TimelineEvent> {
    await this.accessControl.requireEditAccess(createDto.treeId, createDto.userId);

    const result = await query<TimelineEvent>(
      `INSERT INTO timeline_events (tree_id, event_type, title, description, event_date, location, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING ${EVENT_SELECT_FIELDS}`,
      [
        createDto.treeId,
        createDto.eventType,
        createDto.title,
        createDto.description || null,
        createDto.eventDate,
        createDto.location || null,
        createDto.userId,
      ]
    );

    const event = result.rows[0];
    await this.notificationService.notifyTimelineEventAdded(createDto.treeId, event.eventId, event.title, createDto.userId);

    return event;
  }

  async getEvents(treeId: string, userId: string): Promise<TimelineEvent[]> {
    await this.accessControl.checkAccess(treeId, userId);

    const result = await query<TimelineEvent>(
      `SELECT ${EVENT_SELECT_FIELDS}
       FROM timeline_events
       WHERE tree_id = $1
       ORDER BY event_date ASC`,
      [treeId]
    );

    return result.rows;
  }

  async getEventById(eventId: string, userId: string): Promise<TimelineEvent> {
    const result = await query<TimelineEvent>(
      `SELECT ${EVENT_SELECT_FIELDS} FROM timeline_events WHERE event_id = $1`,
      [eventId]
    );

    if (result.rows.length === 0) {
      throw new AppError('Event not found', 404);
    }

    const event = result.rows[0];
    await this.accessControl.checkAccess(event.treeId, userId);

    return event;
  }

  async updateEvent(eventId: string, userId: string, updateDto: UpdateEventDto): Promise<TimelineEvent> {
    const existingResult = await query<TimelineEvent>(
      `SELECT ${EVENT_SELECT_FIELDS} FROM timeline_events WHERE event_id = $1`,
      [eventId]
    );

    if (existingResult.rows.length === 0) {
      throw new AppError('Event not found', 404);
    }

    const event = existingResult.rows[0];
    const access = await this.accessControl.checkAccess(event.treeId, userId);

    const isCreator = event.createdBy === userId;
    const isOwner = access.accessLevel === AccessLevel.OWNER;

    if (!isCreator && !isOwner) {
      throw new AppError('Only the event creator or tree owner can modify this event', 403);
    }

    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (updateDto.eventType !== undefined) {
      updates.push(`event_type = $${paramIndex++}`);
      values.push(updateDto.eventType);
    }
    if (updateDto.title !== undefined) {
      updates.push(`title = $${paramIndex++}`);
      values.push(updateDto.title);
    }
    if (updateDto.description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(updateDto.description);
    }
    if (updateDto.eventDate !== undefined) {
      updates.push(`event_date = $${paramIndex++}`);
      values.push(updateDto.eventDate);
    }
    if (updateDto.location !== undefined) {
      updates.push(`location = $${paramIndex++}`);
      values.push(updateDto.location);
    }

    if (updates.length === 0) {
      return event;
    }

    updates.push(`updated_at = NOW()`);
    values.push(eventId);

    const result = await query<TimelineEvent>(
      `UPDATE timeline_events SET ${updates.join(', ')} WHERE event_id = $${paramIndex}
       RETURNING ${EVENT_SELECT_FIELDS}`,
      values
    );

    return result.rows[0];
  }

  async deleteEvent(eventId: string, userId: string): Promise<void> {
    const result = await query<TimelineEvent>(
      `SELECT ${EVENT_SELECT_FIELDS} FROM timeline_events WHERE event_id = $1`,
      [eventId]
    );

    if (result.rows.length === 0) {
      throw new AppError('Event not found', 404);
    }

    const event = result.rows[0];
    const access = await this.accessControl.checkAccess(event.treeId, userId);

    const isCreator = event.createdBy === userId;
    const isOwner = access.accessLevel === AccessLevel.OWNER;

    if (!isCreator && !isOwner) {
      throw new AppError('Only the event creator or tree owner can delete this event', 403);
    }

    await query('DELETE FROM timeline_events WHERE event_id = $1', [eventId]);
  }
}
