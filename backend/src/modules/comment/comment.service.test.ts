import { AccessLevel, EntityType } from '../../database/interfaces';

const mockQuery = jest.fn();
const mockNotifyCommentAdded = jest.fn();

jest.mock('../../config/database', () => ({
  query: (...args: unknown[]) => mockQuery(...args),
}));

jest.mock('../notification/notification.service', () => ({
  NotificationService: jest.fn().mockImplementation(() => ({
    notifyCommentAdded: mockNotifyCommentAdded,
  })),
}));

import { CommentService } from './comment.service';

describe('CommentService', () => {
  let commentService: CommentService;

  beforeEach(() => {
    mockQuery.mockReset();
    mockNotifyCommentAdded.mockReset();
    mockNotifyCommentAdded.mockResolvedValue(undefined);
    commentService = new CommentService();
  });

  describe('createComment', () => {
    it('should create comment on node entity type (Requirements 9.1)', async () => {
      const createDto = {
        treeId: 'tree123',
        entityType: EntityType.NODE,
        entityId: 'node123',
        commentText: 'This is a comment on a node',
        userId: 'user123',
      };

      const access = { accessLevel: AccessLevel.VIEWER };
      const comment = {
        commentId: 'comment123',
        ...createDto,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [access] })
        .mockResolvedValueOnce({ rows: [comment] });

      const result = await commentService.createComment(createDto);

      expect(result.entityType).toBe(EntityType.NODE);
      expect(result.commentText).toBe('This is a comment on a node');
    });

    it('should create comment on event entity type (Requirements 9.1)', async () => {
      const createDto = {
        treeId: 'tree123',
        entityType: EntityType.EVENT,
        entityId: 'event123',
        commentText: 'This is a comment on an event',
        userId: 'user123',
      };

      const access = { accessLevel: AccessLevel.VIEWER };
      const comment = {
        commentId: 'comment123',
        ...createDto,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [access] })
        .mockResolvedValueOnce({ rows: [comment] });

      const result = await commentService.createComment(createDto);

      expect(result.entityType).toBe(EntityType.EVENT);
    });

    it('should create comment on relationship entity type (Requirements 9.1)', async () => {
      const createDto = {
        treeId: 'tree123',
        entityType: EntityType.RELATIONSHIP,
        entityId: 'relationship123',
        commentText: 'This is a comment on a relationship',
        userId: 'user123',
      };

      const access = { accessLevel: AccessLevel.VIEWER };
      const comment = {
        commentId: 'comment123',
        ...createDto,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [access] })
        .mockResolvedValueOnce({ rows: [comment] });

      const result = await commentService.createComment(createDto);

      expect(result.entityType).toBe(EntityType.RELATIONSHIP);
    });

    it('should require access to tree for comment creation (Requirements 9.2)', async () => {
      const createDto = {
        treeId: 'tree123',
        entityType: EntityType.NODE,
        entityId: 'node123',
        commentText: 'Test comment',
        userId: 'user123',
      };

      mockQuery.mockResolvedValueOnce({ rows: [] });

      await expect(commentService.createComment(createDto)).rejects.toThrow('Access denied');
    });

    it('should allow viewer to create comment (Requirements 9.2)', async () => {
      const createDto = {
        treeId: 'tree123',
        entityType: EntityType.NODE,
        entityId: 'node123',
        commentText: 'Viewer comment',
        userId: 'user123',
      };

      const access = { accessLevel: AccessLevel.VIEWER };
      const comment = {
        commentId: 'comment123',
        ...createDto,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [access] })
        .mockResolvedValueOnce({ rows: [comment] });

      const result = await commentService.createComment(createDto);

      expect(result.commentId).toBe('comment123');
    });

    it('should allow editor to create comment (Requirements 9.2)', async () => {
      const createDto = {
        treeId: 'tree123',
        entityType: EntityType.NODE,
        entityId: 'node123',
        commentText: 'Editor comment',
        userId: 'user123',
      };

      const access = { accessLevel: AccessLevel.EDITOR };
      const comment = {
        commentId: 'comment123',
        ...createDto,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [access] })
        .mockResolvedValueOnce({ rows: [comment] });

      const result = await commentService.createComment(createDto);

      expect(result.commentId).toBe('comment123');
    });

    it('should allow owner to create comment (Requirements 9.2)', async () => {
      const createDto = {
        treeId: 'tree123',
        entityType: EntityType.NODE,
        entityId: 'node123',
        commentText: 'Owner comment',
        userId: 'user123',
      };

      const access = { accessLevel: AccessLevel.OWNER };
      const comment = {
        commentId: 'comment123',
        ...createDto,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [access] })
        .mockResolvedValueOnce({ rows: [comment] });

      const result = await commentService.createComment(createDto);

      expect(result.commentId).toBe('comment123');
    });
  });

  describe('getComments', () => {
    it('should return comments ordered by timestamp descending (Requirements 9.5)', async () => {
      const treeId = 'tree123';
      const entityType = EntityType.NODE;
      const entityId = 'node123';
      const userId = 'user123';

      const access = { accessLevel: AccessLevel.VIEWER };
      const comments = [
        { commentId: 'comment3', createdAt: new Date('2024-01-03'), commentText: 'Third' },
        { commentId: 'comment2', createdAt: new Date('2024-01-02'), commentText: 'Second' },
        { commentId: 'comment1', createdAt: new Date('2024-01-01'), commentText: 'First' },
      ];

      mockQuery
        .mockResolvedValueOnce({ rows: [access] })
        .mockResolvedValueOnce({ rows: comments });

      const result = await commentService.getComments(treeId, entityType, entityId, userId);

      expect(result.length).toBe(3);
      expect(mockQuery.mock.calls[1][0]).toContain('ORDER BY');
      expect(mockQuery.mock.calls[1][0]).toContain('created_at');
    });

    it('should filter comments by entity type and id (Requirements 9.5)', async () => {
      const treeId = 'tree123';
      const entityType = EntityType.EVENT;
      const entityId = 'event456';
      const userId = 'user123';

      const access = { accessLevel: AccessLevel.VIEWER };

      mockQuery
        .mockResolvedValueOnce({ rows: [access] })
        .mockResolvedValueOnce({ rows: [] });

      await commentService.getComments(treeId, entityType, entityId, userId);

      const queryCall = mockQuery.mock.calls[1];
      expect(queryCall[0]).toContain('entity_type');
      expect(queryCall[0]).toContain('entity_id');
      expect(queryCall[1]).toContain(entityType);
      expect(queryCall[1]).toContain(entityId);
    });

    it('should require access to tree for viewing comments (Requirements 9.2)', async () => {
      const treeId = 'tree123';
      const entityType = EntityType.NODE;
      const entityId = 'node123';
      const userId = 'user123';

      mockQuery.mockResolvedValueOnce({ rows: [] });

      await expect(
        commentService.getComments(treeId, entityType, entityId, userId)
      ).rejects.toThrow('Access denied');
    });
  });

  describe('updateComment', () => {
    it('should allow owner to update their own comment (Requirements 9.3)', async () => {
      const commentId = 'comment123';
      const userId = 'user123';
      const newText = 'Updated comment text';

      const comment = {
        commentId,
        treeId: 'tree123',
        entityType: EntityType.NODE,
        entityId: 'node123',
        userId,
        commentText: 'Original text',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const updatedComment = { ...comment, commentText: newText };

      mockQuery
        .mockResolvedValueOnce({ rows: [comment] })
        .mockResolvedValueOnce({ rows: [updatedComment] });

      const result = await commentService.updateComment(commentId, userId, newText);

      expect(result.commentText).toBe(newText);
    });

    it('should reject update from non-owner (Requirements 9.3)', async () => {
      const commentId = 'comment123';
      const creatorId = 'creator123';
      const otherUserId = 'other123';
      const newText = 'Attempted update';

      const comment = {
        commentId,
        treeId: 'tree123',
        entityType: EntityType.NODE,
        entityId: 'node123',
        userId: creatorId,
        commentText: 'Original text',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockQuery.mockResolvedValueOnce({ rows: [comment] });

      await expect(
        commentService.updateComment(commentId, otherUserId, newText)
      ).rejects.toThrow('Can only update own comments');
    });

    it('should throw error if comment not found (Requirements 9.3)', async () => {
      const commentId = 'nonexistent';
      const userId = 'user123';
      const newText = 'Updated text';

      mockQuery.mockResolvedValueOnce({ rows: [] });

      await expect(
        commentService.updateComment(commentId, userId, newText)
      ).rejects.toThrow('Comment not found');
    });
  });

  describe('deleteComment', () => {
    it('should allow owner to delete their own comment (Requirements 9.4)', async () => {
      const commentId = 'comment123';
      const userId = 'user123';

      const comment = {
        commentId,
        treeId: 'tree123',
        entityType: EntityType.NODE,
        entityId: 'node123',
        userId,
        commentText: 'Test comment',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [comment] })
        .mockResolvedValueOnce({ rowCount: 1 });

      await commentService.deleteComment(commentId, userId);

      expect(mockQuery).toHaveBeenCalledTimes(2);
      expect(mockQuery).toHaveBeenLastCalledWith(
        'DELETE FROM comments WHERE comment_id = $1',
        [commentId]
      );
    });

    it('should reject delete from non-owner (Requirements 9.4)', async () => {
      const commentId = 'comment123';
      const creatorId = 'creator123';
      const otherUserId = 'other123';

      const comment = {
        commentId,
        treeId: 'tree123',
        entityType: EntityType.NODE,
        entityId: 'node123',
        userId: creatorId,
        commentText: 'Test comment',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockQuery.mockResolvedValueOnce({ rows: [comment] });

      await expect(
        commentService.deleteComment(commentId, otherUserId)
      ).rejects.toThrow('Can only delete own comments');
    });

    it('should throw error if comment not found (Requirements 9.4)', async () => {
      const commentId = 'nonexistent';
      const userId = 'user123';

      mockQuery.mockResolvedValueOnce({ rows: [] });

      await expect(
        commentService.deleteComment(commentId, userId)
      ).rejects.toThrow('Comment not found');
    });
  });
});
