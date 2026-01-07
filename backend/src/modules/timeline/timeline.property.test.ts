import * as fc from 'fast-check';
import { AccessLevel, EventType } from '../../database/interfaces';

/**
 * **Feature: rkroots-family-tree, Property 13: Timeline event chronological ordering**
 * **Validates: Requirements 6.5**
 * 
 * Property: For any timeline event query for a tree, the returned events
 * should be ordered by eventDate in ascending order
 */

const mockQuery = jest.fn();

jest.mock('../../config/database', () => ({
  query: (...args: unknown[]) => mockQuery(...args),
}));

import { TimelineService } from './timeline.service';

describe('Timeline Service Property Tests', () => {
  const uuidArb = fc.uuid();
  const eventTypeArb = fc.constantFrom(...Object.values(EventType));
  const titleArb = fc.string({ minLength: 1, maxLength: 100 });
  const dateArb = fc.date({ min: new Date('1900-01-01'), max: new Date('2100-12-31') });

  beforeEach(() => {
    mockQuery.mockReset();
  });

  describe('Property 13: Timeline event chronological ordering', () => {
    it('should return events ordered by eventDate in ascending order', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidArb,
          uuidArb,
          fc.array(
            fc.record({
              eventId: uuidArb,
              eventType: eventTypeArb,
              title: titleArb,
              eventDate: dateArb,
              createdBy: uuidArb,
            }),
            { minLength: 0, maxLength: 20 }
          ),
          async (treeId, userId, events) => {
            const access = { accessLevel: AccessLevel.VIEWER };
            
            const eventsWithTreeId = events.map((e, idx) => ({
              ...e,
              treeId,
              eventId: `event-${idx}`,
              createdAt: new Date(),
              updatedAt: new Date(),
            }));

            const sortedEvents = [...eventsWithTreeId].sort(
              (a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime()
            );

            mockQuery
              .mockResolvedValueOnce({ rows: [access] })
              .mockResolvedValueOnce({ rows: sortedEvents });

            const service = new TimelineService();
            const result = await service.getEvents(treeId, userId);

            for (let i = 1; i < result.length; i++) {
              const prevDate = new Date(result[i - 1].eventDate).getTime();
              const currDate = new Date(result[i].eventDate).getTime();
              if (prevDate > currDate) {
                return false;
              }
            }
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should use ORDER BY event_date in the SQL query', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidArb,
          uuidArb,
          async (treeId, userId) => {
            const access = { accessLevel: AccessLevel.VIEWER };
            let capturedSql = '';

            mockQuery.mockImplementation((sql: string) => {
              capturedSql = sql;
              if (sql.includes('tree_access')) {
                return { rows: [access] };
              }
              return { rows: [] };
            });

            const service = new TimelineService();
            await service.getEvents(treeId, userId);

            return capturedSql.toLowerCase().includes('order by') && 
                   capturedSql.toLowerCase().includes('event_date');
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});


/**
 * **Feature: rkroots-family-tree, Property 14: Timeline event edit/delete ownership**
 * **Validates: Requirements 6.6, 6.7**
 * 
 * Property: For any timeline event update or delete operation, the system should
 * allow the operation if and only if the requesting user is the event creator OR the Tree Owner
 */
describe('Property 14: Timeline event edit/delete ownership', () => {
  const uuidArb = fc.uuid();
  const eventTypeArb = fc.constantFrom(...Object.values(EventType));
  const titleArb = fc.string({ minLength: 1, maxLength: 100 });
  const dateArb = fc.date({ min: new Date('1900-01-01'), max: new Date('2100-12-31') });

  beforeEach(() => {
    mockQuery.mockReset();
  });

  it('should allow event creator to update their own event', async () => {
    await fc.assert(
      fc.asyncProperty(
        uuidArb,
        uuidArb,
        titleArb,
        async (eventId, userId, newTitle) => {
          const treeId = 'tree-123';
          const event = {
            eventId,
            treeId,
            eventType: EventType.BIRTH,
            title: 'Original Title',
            eventDate: new Date(),
            createdBy: userId,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          const access = { accessLevel: AccessLevel.EDITOR };
          const updatedEvent = { ...event, title: newTitle };

          mockQuery
            .mockResolvedValueOnce({ rows: [event] })
            .mockResolvedValueOnce({ rows: [access] })
            .mockResolvedValueOnce({ rows: [updatedEvent] });

          const service = new TimelineService();
          const result = await service.updateEvent(eventId, userId, { title: newTitle });

          return result.title === newTitle;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should allow tree owner to update any event', async () => {
    await fc.assert(
      fc.asyncProperty(
        uuidArb,
        uuidArb,
        uuidArb,
        titleArb,
        async (eventId, ownerId, creatorId, newTitle) => {
          fc.pre(ownerId !== creatorId);

          const treeId = 'tree-123';
          const event = {
            eventId,
            treeId,
            eventType: EventType.BIRTH,
            title: 'Original Title',
            eventDate: new Date(),
            createdBy: creatorId,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          const access = { accessLevel: AccessLevel.OWNER };
          const updatedEvent = { ...event, title: newTitle };

          mockQuery
            .mockResolvedValueOnce({ rows: [event] })
            .mockResolvedValueOnce({ rows: [access] })
            .mockResolvedValueOnce({ rows: [updatedEvent] });

          const service = new TimelineService();
          const result = await service.updateEvent(eventId, ownerId, { title: newTitle });

          return result.title === newTitle;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should reject update from editor who is not the creator', async () => {
    await fc.assert(
      fc.asyncProperty(
        uuidArb,
        uuidArb,
        uuidArb,
        titleArb,
        async (eventId, editorId, creatorId, newTitle) => {
          fc.pre(editorId !== creatorId);

          const treeId = 'tree-123';
          const event = {
            eventId,
            treeId,
            eventType: EventType.BIRTH,
            title: 'Original Title',
            eventDate: new Date(),
            createdBy: creatorId,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          const access = { accessLevel: AccessLevel.EDITOR };

          mockQuery
            .mockResolvedValueOnce({ rows: [event] })
            .mockResolvedValueOnce({ rows: [access] });

          const service = new TimelineService();

          try {
            await service.updateEvent(eventId, editorId, { title: newTitle });
            return false;
          } catch (error) {
            return (error as Error).message === 'Only the event creator or tree owner can modify this event';
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should allow event creator to delete their own event', async () => {
    await fc.assert(
      fc.asyncProperty(
        uuidArb,
        uuidArb,
        async (eventId, userId) => {
          const treeId = 'tree-123';
          const event = {
            eventId,
            treeId,
            eventType: EventType.BIRTH,
            title: 'Test Event',
            eventDate: new Date(),
            createdBy: userId,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          const access = { accessLevel: AccessLevel.EDITOR };

          mockQuery
            .mockResolvedValueOnce({ rows: [event] })
            .mockResolvedValueOnce({ rows: [access] })
            .mockResolvedValueOnce({ rowCount: 1 });

          const service = new TimelineService();
          
          try {
            await service.deleteEvent(eventId, userId);
            return true;
          } catch {
            return false;
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should allow tree owner to delete any event', async () => {
    await fc.assert(
      fc.asyncProperty(
        uuidArb,
        uuidArb,
        uuidArb,
        async (eventId, ownerId, creatorId) => {
          fc.pre(ownerId !== creatorId);

          const treeId = 'tree-123';
          const event = {
            eventId,
            treeId,
            eventType: EventType.BIRTH,
            title: 'Test Event',
            eventDate: new Date(),
            createdBy: creatorId,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          const access = { accessLevel: AccessLevel.OWNER };

          mockQuery
            .mockResolvedValueOnce({ rows: [event] })
            .mockResolvedValueOnce({ rows: [access] })
            .mockResolvedValueOnce({ rowCount: 1 });

          const service = new TimelineService();
          
          try {
            await service.deleteEvent(eventId, ownerId);
            return true;
          } catch {
            return false;
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should reject delete from editor who is not the creator', async () => {
    await fc.assert(
      fc.asyncProperty(
        uuidArb,
        uuidArb,
        uuidArb,
        async (eventId, editorId, creatorId) => {
          fc.pre(editorId !== creatorId);

          const treeId = 'tree-123';
          const event = {
            eventId,
            treeId,
            eventType: EventType.BIRTH,
            title: 'Test Event',
            eventDate: new Date(),
            createdBy: creatorId,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          const access = { accessLevel: AccessLevel.EDITOR };

          mockQuery
            .mockResolvedValueOnce({ rows: [event] })
            .mockResolvedValueOnce({ rows: [access] });

          const service = new TimelineService();

          try {
            await service.deleteEvent(eventId, editorId);
            return false;
          } catch (error) {
            return (error as Error).message === 'Only the event creator or tree owner can delete this event';
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
