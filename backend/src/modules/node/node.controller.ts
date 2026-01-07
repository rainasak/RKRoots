import { Response, NextFunction } from 'express';
import { NodeService } from './node.service';
import { AuthRequest } from '../../common/middleware/auth.middleware';

export class NodeController {
  constructor(private nodeService: NodeService) {}

  async create(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const node = await this.nodeService.createNode({
        ...req.body,
        treeId: req.params.treeId,
        userId: req.userId!,
      });
      res.status(201).json(node);
    } catch (error) {
      next(error);
    }
  }

  async getNodes(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const nodes = await this.nodeService.getNodes(req.params.treeId, req.userId!);
      res.json(nodes);
    } catch (error) {
      next(error);
    }
  }

  async getById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const node = await this.nodeService.getNodeById(req.params.nodeId, req.userId!);
      res.json(node);
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const node = await this.nodeService.updateNode(req.params.nodeId, req.userId!, req.body);
      res.json(node);
    } catch (error) {
      next(error);
    }
  }

  async delete(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await this.nodeService.deleteNode(req.params.nodeId, req.userId!);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  async publish(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const node = await this.nodeService.publishNode(req.params.nodeId, req.userId!);
      res.json(node);
    } catch (error) {
      next(error);
    }
  }
}
