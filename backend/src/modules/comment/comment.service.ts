import { query } from '../../config/database';
import { Comment, EntityType } from '../../database/interfaces';
import { AccessControlService } from '../../common/services/access-control.service';
import { NotificationService } from '../notification/notification.service';
import { AppError } from '../../common/errors/app-error';

export { EntityType };

interface CreateCommentDto {
  treeId: string;
  entityType: EntityType;
  entityId: string;
  commentText: string;
  userId: string;
}

export class CommentService {
  private accessControl: AccessControlService;
  private notificationService: NotificationService;

  constructor() {
    this.accessControl = new AccessControlService();
    this.notificationService = new NotificationService();
  }

  async createComment(dto: CreateCommentDto): Promise<Comment> {
    await this.accessControl.checkAccess(dto.treeId, dto.userId);

    const result = await query<Comment>(
      `INSERT INTO comments (tree_id, entity_type, entity_id, user_id, comment_text)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING comment_id as "commentId", tree_id as "treeId", entity_type as "entityType", entity_id as "entityId", user_id as "userId", comment_text as "commentText", created_at as "createdAt", updated_at as "updatedAt"`,
      [dto.treeId, dto.entityType, dto.entityId, dto.userId, dto.commentText]
    );

    await this.notificationService.notifyCommentAdded(dto.treeId, dto.entityType, dto.entityId, dto.userId);

    return result.rows[0];
  }

  async getComments(treeId: string, entityType: EntityType, entityId: string, userId: string): Promise<Comment[]> {
    await this.accessControl.checkAccess(treeId, userId);

    const result = await query<Comment>(
      `SELECT comment_id as "commentId", tree_id as "treeId", entity_type as "entityType", entity_id as "entityId", user_id as "userId", comment_text as "commentText", created_at as "createdAt", updated_at as "updatedAt"
       FROM comments
       WHERE tree_id = $1 AND entity_type = $2 AND entity_id = $3
       ORDER BY created_at DESC`,
      [treeId, entityType, entityId]
    );

    return result.rows;
  }

  async updateComment(commentId: string, userId: string, commentText: string): Promise<Comment> {
    const existingResult = await query<Comment>(
      `SELECT comment_id as "commentId", user_id as "userId" FROM comments WHERE comment_id = $1`,
      [commentId]
    );

    if (existingResult.rows.length === 0) {
      throw new AppError('Comment not found', 404);
    }

    if (existingResult.rows[0].userId !== userId) {
      throw new AppError('Can only update own comments', 403);
    }

    const result = await query<Comment>(
      `UPDATE comments SET comment_text = $1, updated_at = NOW() WHERE comment_id = $2
       RETURNING comment_id as "commentId", tree_id as "treeId", entity_type as "entityType", entity_id as "entityId", user_id as "userId", comment_text as "commentText", created_at as "createdAt", updated_at as "updatedAt"`,
      [commentText, commentId]
    );

    return result.rows[0];
  }

  async deleteComment(commentId: string, userId: string): Promise<void> {
    const existingResult = await query<Comment>(
      `SELECT comment_id as "commentId", user_id as "userId" FROM comments WHERE comment_id = $1`,
      [commentId]
    );

    if (existingResult.rows.length === 0) {
      throw new AppError('Comment not found', 404);
    }

    if (existingResult.rows[0].userId !== userId) {
      throw new AppError('Can only delete own comments', 403);
    }

    await query('DELETE FROM comments WHERE comment_id = $1', [commentId]);
  }
}
