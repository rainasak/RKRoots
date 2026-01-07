import { Response, NextFunction } from 'express';
import { TreeService } from './tree.service';
import { AuthRequest } from '../../common/middleware/auth.middleware';

export class TreeController {
  constructor(private treeService: TreeService) {}

  async create(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tree = await this.treeService.createTree({
        ...req.body,
        userId: req.userId!,
      });
      res.status(201).json(tree);
    } catch (error) {
      next(error);
    }
  }

  async getUserTrees(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const trees = await this.treeService.getUserTrees(req.userId!);
      res.json(trees);
    } catch (error) {
      next(error);
    }
  }

  async getById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tree = await this.treeService.getTreeById(req.params.treeId, req.userId!);
      res.json(tree);
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tree = await this.treeService.updateTree(req.params.treeId, req.userId!, req.body);
      res.json(tree);
    } catch (error) {
      next(error);
    }
  }

  async delete(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await this.treeService.deleteTree(req.params.treeId, req.userId!);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  async getAccess(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const accessList = await this.treeService.getTreeAccess(req.params.treeId, req.userId!);
      res.json(accessList);
    } catch (error) {
      next(error);
    }
  }

  async grantAccess(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const access = await this.treeService.grantTreeAccess(req.params.treeId, req.userId!, req.body);
      res.status(201).json(access);
    } catch (error) {
      next(error);
    }
  }

  async revokeAccess(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await this.treeService.revokeTreeAccess(req.params.treeId, req.userId!, req.params.userId);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
}
