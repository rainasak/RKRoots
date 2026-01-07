import { AccessLevel, EventType } from '../../database/interfaces';

const mockQuery = jest.fn();
const mockNotifyTimelineEventAdded = jest.fn();

jest.mock('../../config/database', () => ({
  query: (...args: unknown[]) => mockQuery(...args),
}));

jest.mock('../notification/notification.service', () => ({
  NotificationService: jest.fn().mockImplementation(() => ({
    notifyTimelineEventAdded: mockNotifyTimelineEventAdded,
  })),
}));

import { TimelineService } from './timeline.service';

describe('TimelineService', () => {
  let timelineService: TimelineService;

  beforeEach(() => {
    mockQuery.mockReset();
    mockNotifyTimelineEventAdded.mockReset();
    mockNotifyTimelineEventAdded.mockResolvedValue(undefined);
    timelineService = new TimelineService();
  });

  describe('createEvent', () => {
    it('should create event with birth type (Requirements 6.1, 6.2)', async () => {
      const createDto = {
        treeId: 'tree123',
        eventType: EventType.BIRTH,
        title: 'John was born',
        eventDate: new Date('1990-01-15'),
        userId: 'user123',
      };

      const access = { accessLevel: AccessLevel.EDITOR };
      const event = {
        eventId: 'event123',
        ...createDto,
        createdBy: createDto.userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [access] })
        .mockResolvedValueOnce({ rows: [event] });

      const result = await timelineService.createEvent(createDto);

      expect(result.eventType).toBe(EventType.BIRTH);
      expect(result.title).toBe('John was born');
    });

    it('should create event with marriage type (Requirements 6.1, 6.2)', async () => {
      const createDto = {
        treeId: 'tree123',
        eventType: EventType.MARRIAGE,
        title: 'John and Jane got married',
        eventDate: new Date('2015-06-20'),
        userId: 'user123',
      };

      const access = { accessLevel: AccessLevel.EDITOR };
      const event = {
        eventId: 'event123',
        ...createDto,
        createdBy: createDto.userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [access] })
        .mockResolvedValueOnce({ rows: [event] });

      const result = await timelineService.createEvent(createDto);

      expect(result.eventType).toBe(EventType.MARRIAGE);
    });

    it('should create event with death type (Requirements 6.1, 6.2)', async () => {
      const createDto = {
        treeId: 'tree123',
        eventType: EventType.DEATH,
        title: 'Grandpa passed away',
        eventDate: new Date('2020-03-10'),
        userId: 'user123',
      };

      const access = { accessLevel: AccessLevel.EDITOR };
      const event = {
        eventId: 'event123',
        ...createDto,
        createdBy: createDto.userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [access] })
        .mockResolvedValueOnce({ rows: [event] });

      const result = await timelineService.createEvent(createDto);

      expect(result.eventType).toBe(EventType.DEATH);
    });

    it('should create event with milestone type (Requirements 6.1, 6.2)', async () => {
      const createDto = {
        treeId: 'tree123',
        eventType: EventType.MILESTONE,
        title: 'First day of school',
        eventDate: new Date('1996-09-01'),
        userId: 'user123',
      };

      const access = { accessLevel: AccessLevel.EDITOR };
      const event = {
        eventId: 'event123',
        ...createDto,
        createdBy: createDto.userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [access] })
        .mockResolvedValueOnce({ rows: [event] });

      const result = await timelineService.createEvent(createDto);

      expect(result.eventType).toBe(EventType.MILESTONE);
    });

    it('should create event with achievement type (Requirements 6.1, 6.2)', async () => {
      const createDto = {
        treeId: 'tree123',
        eventType: EventType.ACHIEVEMENT,
        title: 'Graduated from college',
        eventDate: new Date('2012-05-15'),
        userId: 'user123',
      };

      const access = { accessLevel: AccessLevel.EDITOR };
      const event = {
        eventId: 'event123',
        ...createDto,
        createdBy: createDto.userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [access] })
        .mockResolvedValueOnce({ rows: [event] });

      const result = await timelineService.createEvent(createDto);

      expect(result.eventType).toBe(EventType.ACHIEVEMENT);
    });

    it('should create event with memory type (Requirements 6.1, 6.2)', async () => {
      const createDto = {
        treeId: 'tree123',
        eventType: EventType.MEMORY,
        title: 'Family reunion',
        eventDate: new Date('2018-07-04'),
        userId: 'user123',
      };

      const access = { accessLevel: AccessLevel.EDITOR };
      const event = {
        eventId: 'event123',
        ...createDto,
        createdBy: createDto.userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [access] })
        .mockResolvedValueOnce({ rows: [event] });

      const result = await timelineService.createEvent(createDto);

      expect(result.eventType).toBe(EventType.MEMORY);
    });

    it('should store optional fields (Requirements 6.4)', async () => {
      const createDto = {
        treeId: 'tree123',
        eventType: EventType.BIRTH,
        title: 'John was born',
        description: 'A beautiful sunny day',
        eventDate: new Date('1990-01-15'),
        location: 'New York Hospital',
        userId: 'user123',
      };

      const access = { accessLevel: AccessLevel.EDITOR };
      const event = {
        eventId: 'event123',
        ...createDto,
        createdBy: createDto.userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [access] })
        .mockResolvedValueOnce({ rows: [event] });

      const result = await timelineService.createEvent(createDto);

      expect(result.description).toBe('A beautiful sunny day');
      expect(result.location).toBe('New York Hospital');
    });

    it('should require edit access to create event (Requirements 6.3)', async () => {
      const createDto = {
        treeId: 'tree123',
        eventType: EventType.BIRTH,
        title: 'John was born',
        eventDate: new Date('1990-01-15'),
        userId: 'user123',
      };

      const access = { accessLevel: AccessLevel.VIEWER };
      mockQuery.mockResolvedValueOnce({ rows: [access] });

      await expect(timelineService.createEvent(createDto)).rejects.toThrow(
        'Edit access required'
      );
    });

    it('should allow owner to create event (Requirements 6.3)', async () => {
      const createDto = {
        treeId: 'tree123',
        eventType: EventType.BIRTH,
        title: 'John was born',
        eventDate: new Date('1990-01-15'),
        userId: 'user123',
      };

      const access = { accessLevel: AccessLevel.OWNER };
      const event = {
        eventId: 'event123',
        ...createDto,
        createdBy: createDto.userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [access] })
        .mockResolvedValueOnce({ rows: [event] });

      const result = await timelineService.createEvent(createDto);

      expect(result.eventId).toBe('event123');
    });
  });

  describe('getEvents', () => {
    it('should return events ordered chronologically (Requirements 6.5)', async () => {
      const treeId = 'tree123';
      const userId = 'user123';

      const access = { accessLevel: AccessLevel.VIEWER };
      const events = [
        { eventId: 'event1', eventDate: new Date('1990-01-15'), title: 'Birth' },
        { eventId: 'event2', eventDate: new Date('2015-06-20'), title: 'Marriage' },
        { eventId: 'event3', eventDate: new Date('2020-03-10'), title: 'Death' },
      ];

      mockQuery
        .mockResolvedValueOnce({ rows: [access] })
        .mockResolvedValueOnce({ rows: events });

      const result = await timelineService.getEvents(treeId, userId);

      expect(result.length).toBe(3);
      expect(mockQuery.mock.calls[1][0]).toContain('ORDER BY');
      expect(mockQuery.mock.calls[1][0]).toContain('event_date');
    });

    it('should throw error if user has no access', async () => {
      const treeId = 'tree123';
      const userId = 'user123';

      mockQuery.mockResolvedValueOnce({ rows: [] });

      await expect(timelineService.getEvents(treeId, userId)).rejects.toThrow('Access denied');
    });
  });

  describe('getEventById', () => {
    it('should return event if user has access', async () => {
      const eventId = 'event123';
      const userId = 'user123';

      const event = {
        eventId,
        treeId: 'tree123',
        eventType: EventType.BIRTH,
        title: 'John was born',
        eventDate: new Date('1990-01-15'),
        createdBy: 'creator123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const access = { accessLevel: AccessLevel.VIEWER };

      mockQuery
        .mockResolvedValueOnce({ rows: [event] })
        .mockResolvedValueOnce({ rows: [access] });

      const result = await timelineService.getEventById(eventId, userId);

      expect(result.eventId).toBe(eventId);
    });

    it('should throw error if event not found', async () => {
      const eventId = 'nonexistent';
      const userId = 'user123';

      mockQuery.mockResolvedValueOnce({ rows: [] });

      await expect(timelineService.getEventById(eventId, userId)).rejects.toThrow('Event not found');
    });
  });

  describe('updateEvent', () => {
    it('should allow creator to update event (Requirements 6.6)', async () => {
      const eventId = 'event123';
      const userId = 'user123';
      const updateDto = { title: 'Updated Title' };

      const event = {
        eventId,
        treeId: 'tree123',
        eventType: EventType.BIRTH,
        title: 'Original Title',
        eventDate: new Date('1990-01-15'),
        createdBy: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const access = { accessLevel: AccessLevel.EDITOR };
      const updatedEvent = { ...event, ...updateDto };

      mockQuery
        .mockResolvedValueOnce({ rows: [event] })
        .mockResolvedValueOnce({ rows: [access] })
        .mockResolvedValueOnce({ rows: [updatedEvent] });

      const result = await timelineService.updateEvent(eventId, userId, updateDto);

      expect(result.title).toBe('Updated Title');
    });

    it('should allow tree owner to update any event (Requirements 6.6)', async () => {
      const eventId = 'event123';
      const ownerId = 'owner123';
      const updateDto = { title: 'Updated by Owner' };

      const event = {
        eventId,
        treeId: 'tree123',
        eventType: EventType.BIRTH,
        title: 'Original Title',
        eventDate: new Date('1990-01-15'),
        createdBy: 'creator123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const access = { accessLevel: AccessLevel.OWNER };
      const updatedEvent = { ...event, ...updateDto };

      mockQuery
        .mockResolvedValueOnce({ rows: [event] })
        .mockResolvedValueOnce({ rows: [access] })
        .mockResolvedValueOnce({ rows: [updatedEvent] });

      const result = await timelineService.updateEvent(eventId, ownerId, updateDto);

      expect(result.title).toBe('Updated by Owner');
    });

    it('should reject update from editor who is not creator (Requirements 6.6)', async () => {
      const eventId = 'event123';
      const editorId = 'editor123';
      const updateDto = { title: 'Updated Title' };

      const event = {
        eventId,
        treeId: 'tree123',
        eventType: EventType.BIRTH,
        title: 'Original Title',
        eventDate: new Date('1990-01-15'),
        createdBy: 'creator123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const access = { accessLevel: AccessLevel.EDITOR };

      mockQuery
        .mockResolvedValueOnce({ rows: [event] })
        .mockResolvedValueOnce({ rows: [access] });

      await expect(timelineService.updateEvent(eventId, editorId, updateDto)).rejects.toThrow(
        'Only the event creator or tree owner can modify this event'
      );
    });

    it('should throw error if event not found', async () => {
      const eventId = 'nonexistent';
      const userId = 'user123';
      const updateDto = { title: 'Updated Title' };

      mockQuery.mockResolvedValueOnce({ rows: [] });

      await expect(timelineService.updateEvent(eventId, userId, updateDto)).rejects.toThrow(
        'Event not found'
      );
    });
  });

  describe('deleteEvent', () => {
    it('should allow creator to delete event (Requirements 6.7)', async () => {
      const eventId = 'event123';
      const userId = 'user123';

      const event = {
        eventId,
        treeId: 'tree123',
        eventType: EventType.BIRTH,
        title: 'Test Event',
        eventDate: new Date('1990-01-15'),
        createdBy: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const access = { accessLevel: AccessLevel.EDITOR };

      mockQuery
        .mockResolvedValueOnce({ rows: [event] })
        .mockResolvedValueOnce({ rows: [access] })
        .mockResolvedValueOnce({ rowCount: 1 });

      await timelineService.deleteEvent(eventId, userId);

      expect(mockQuery).toHaveBeenCalledTimes(3);
      expect(mockQuery).toHaveBeenLastCalledWith(
        'DELETE FROM timeline_events WHERE event_id = $1',
        [eventId]
      );
    });

    it('should allow tree owner to delete any event (Requirements 6.7)', async () => {
      const eventId = 'event123';
      const ownerId = 'owner123';

      const event = {
        eventId,
        treeId: 'tree123',
        eventType: EventType.BIRTH,
        title: 'Test Event',
        eventDate: new Date('1990-01-15'),
        createdBy: 'creator123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const access = { accessLevel: AccessLevel.OWNER };

      mockQuery
        .mockResolvedValueOnce({ rows: [event] })
        .mockResolvedValueOnce({ rows: [access] })
        .mockResolvedValueOnce({ rowCount: 1 });

      await timelineService.deleteEvent(eventId, ownerId);

      expect(mockQuery).toHaveBeenCalledTimes(3);
    });

    it('should reject delete from editor who is not creator (Requirements 6.7)', async () => {
      const eventId = 'event123';
      const editorId = 'editor123';

      const event = {
        eventId,
        treeId: 'tree123',
        eventType: EventType.BIRTH,
        title: 'Test Event',
        eventDate: new Date('1990-01-15'),
        createdBy: 'creator123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const access = { accessLevel: AccessLevel.EDITOR };

      mockQuery
        .mockResolvedValueOnce({ rows: [event] })
        .mockResolvedValueOnce({ rows: [access] });

      await expect(timelineService.deleteEvent(eventId, editorId)).rejects.toThrow(
        'Only the event creator or tree owner can delete this event'
      );
    });

    it('should throw error if event not found', async () => {
      const eventId = 'nonexistent';
      const userId = 'user123';

      mockQuery.mockResolvedValueOnce({ rows: [] });

      await expect(timelineService.deleteEvent(eventId, userId)).rejects.toThrow('Event not found');
    });
  });
});
