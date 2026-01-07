import { Response, NextFunction } from 'express';
import { SamePersonLinkService } from './same-person-link.service';
import { AuthRequest } from '../../common/middleware/auth.middleware';

export class SamePersonLinkController {
  constructor(private samePersonLinkService: SamePersonLinkService) {}

  async create(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const link = await this.samePersonLinkService.createSamePersonLink({
        nodeId1: req.body.nodeId1,
        nodeId2: req.body.nodeId2,
        userId: req.userId!,
      });
      res.status(201).json(link);
    } catch (error) {
      next(error);
    }
  }

  async getLinkedNodes(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const nodes = await this.samePersonLinkService.getLinkedNodes(req.params.nodeId, req.userId!);
      res.json(nodes);
    } catch (error) {
      next(error);
    }
  }

  async getLinkedTrees(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const trees = await this.samePersonLinkService.getLinkedTrees(req.params.nodeId, req.userId!);
      res.json(trees);
    } catch (error) {
      next(error);
    }
  }

  async getById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const link = await this.samePersonLinkService.getLinkById(req.params.linkId, req.userId!);
      res.json(link);
    } catch (error) {
      next(error);
    }
  }

  async delete(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await this.samePersonLinkService.deleteSamePersonLink(req.params.linkId, req.userId!);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
}
