import { Response, NextFunction } from 'express';
import { CommentService } from './comment.service';
import { AuthRequest } from '../../common/middleware/auth.middleware';
import { EntityType } from '../../database/interfaces';

export class CommentController {
  constructor(private commentService: CommentService) {}

  async create(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const comment = await this.commentService.createComment({
        treeId: req.body.treeId,
        entityType: req.body.entityType as EntityType,
        entityId: req.body.entityId,
        commentText: req.body.commentText,
        userId: req.userId!,
      });
      res.status(201).json(comment);
    } catch (error) {
      next(error);
    }
  }

  async getComments(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const comments = await this.commentService.getComments(
        req.query.treeId as string,
        req.query.entityType as EntityType,
        req.query.entityId as string,
        req.userId!
      );
      res.json(comments);
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const comment = await this.commentService.updateComment(
        req.params.commentId,
        req.userId!,
        req.body.commentText
      );
      res.json(comment);
    } catch (error) {
      next(error);
    }
  }

  async delete(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await this.commentService.deleteComment(req.params.commentId, req.userId!);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
}
