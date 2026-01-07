import * as fc from 'fast-check';
import { AccessLevel, EntityType } from '../../database/interfaces';

/**
 * **Feature: rkroots-family-tree, Property 11: Comment ownership validation**
 * **Validates: Requirements 9.3, 9.4**
 *
 * Property: For any comment update or delete operation, the system should allow
 * the operation if and only if the requesting user is the comment creator
 */

const mockQuery = jest.fn();

jest.mock('../../config/database', () => ({
  query: (...args: unknown[]) => mockQuery(...args),
}));

import { CommentService } from './comment.service';

describe('Comment Service Property Tests', () => {
  const uuidArb = fc.uuid();
  const commentTextArb = fc.string({ minLength: 1, maxLength: 500 });
  const entityTypeArb = fc.constantFrom(...Object.values(EntityType));

  beforeEach(() => {
    mockQuery.mockReset();
  });

  describe('Property 11: Comment ownership validation', () => {
    it('should allow comment creator to update their own comment', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidArb,
          uuidArb,
          commentTextArb,
          commentTextArb,
          async (commentId, userId, originalText, newText) => {
            const comment = {
              commentId,
              treeId: 'tree-123',
              entityType: EntityType.NODE,
              entityId: 'entity-123',
              userId,
              commentText: originalText,
              createdAt: new Date(),
              updatedAt: new Date(),
            };
            const updatedComment = { ...comment, commentText: newText };

            mockQuery
              .mockResolvedValueOnce({ rows: [comment] })
              .mockResolvedValueOnce({ rows: [updatedComment] });

            const service = new CommentService();
            const result = await service.updateComment(commentId, userId, newText);

            return result.commentText === newText;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject update from user who is not the comment creator', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidArb,
          uuidArb,
          uuidArb,
          commentTextArb,
          async (commentId, creatorId, otherUserId, newText) => {
            fc.pre(creatorId !== otherUserId);

            const comment = {
              commentId,
              treeId: 'tree-123',
              entityType: EntityType.NODE,
              entityId: 'entity-123',
              userId: creatorId,
              commentText: 'Original comment',
              createdAt: new Date(),
              updatedAt: new Date(),
            };

            mockQuery.mockResolvedValueOnce({ rows: [comment] });

            const service = new CommentService();

            try {
              await service.updateComment(commentId, otherUserId, newText);
              return false;
            } catch (error) {
              return (error as Error).message === 'Can only update own comments';
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should allow comment creator to delete their own comment', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidArb,
          uuidArb,
          async (commentId, userId) => {
            const comment = {
              commentId,
              treeId: 'tree-123',
              entityType: EntityType.NODE,
              entityId: 'entity-123',
              userId,
              commentText: 'Test comment',
              createdAt: new Date(),
              updatedAt: new Date(),
            };

            mockQuery
              .mockResolvedValueOnce({ rows: [comment] })
              .mockResolvedValueOnce({ rowCount: 1 });

            const service = new CommentService();

            try {
              await service.deleteComment(commentId, userId);
              return true;
            } catch {
              return false;
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject delete from user who is not the comment creator', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidArb,
          uuidArb,
          uuidArb,
          async (commentId, creatorId, otherUserId) => {
            fc.pre(creatorId !== otherUserId);

            const comment = {
              commentId,
              treeId: 'tree-123',
              entityType: EntityType.NODE,
              entityId: 'entity-123',
              userId: creatorId,
              commentText: 'Test comment',
              createdAt: new Date(),
              updatedAt: new Date(),
            };

            mockQuery.mockResolvedValueOnce({ rows: [comment] });

            const service = new CommentService();

            try {
              await service.deleteComment(commentId, otherUserId);
              return false;
            } catch (error) {
              return (error as Error).message === 'Can only delete own comments';
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return 404 when updating non-existent comment', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidArb,
          uuidArb,
          commentTextArb,
          async (commentId, userId, newText) => {
            mockQuery.mockResolvedValueOnce({ rows: [] });

            const service = new CommentService();

            try {
              await service.updateComment(commentId, userId, newText);
              return false;
            } catch (error) {
              return (error as Error).message === 'Comment not found';
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return 404 when deleting non-existent comment', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidArb,
          uuidArb,
          async (commentId, userId) => {
            mockQuery.mockResolvedValueOnce({ rows: [] });

            const service = new CommentService();

            try {
              await service.deleteComment(commentId, userId);
              return false;
            } catch (error) {
              return (error as Error).message === 'Comment not found';
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
