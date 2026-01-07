import { Response, NextFunction } from 'express';
import { RelationshipService } from './relationship.service';
import { AuthRequest } from '../../common/middleware/auth.middleware';
import { AppError } from '../../common/errors/app-error';

export class RelationshipController {
  constructor(private relationshipService: RelationshipService) {}

  async create(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await this.relationshipService.createRelationship({
        treeId: req.params.treeId,
        nodeId1: req.body.nodeId1,
        nodeId2: req.body.nodeId2,
        relationshipType: req.body.relationshipType,
        userId: req.userId!,
        publishDraftNodes: req.body.publishDraftNodes,
      });
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  async getRelationships(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const relationships = await this.relationshipService.getRelationships(req.params.treeId, req.userId!);
      res.json(relationships);
    } catch (error) {
      next(error);
    }
  }

  async getNodeRelationships(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const relationships = await this.relationshipService.getNodeRelationships(req.params.nodeId, req.userId!);
      res.json(relationships);
    } catch (error) {
      next(error);
    }
  }

  async getById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const relationship = await this.relationshipService.getRelationshipById(req.params.relationshipId, req.userId!);
      res.json(relationship);
    } catch (error) {
      next(error);
    }
  }

  async delete(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await this.relationshipService.deleteRelationship(req.params.relationshipId, req.userId!);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
}
