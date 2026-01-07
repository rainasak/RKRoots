import { Response, NextFunction } from 'express';
import { AccessRequestService } from './access-request.service';
import { AuthRequest } from '../../common/middleware/auth.middleware';

export class AccessRequestController {
  constructor(private accessRequestService: AccessRequestService) {}

  async getLinkedTreeInfo(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const info = await this.accessRequestService.getLinkedTreeInfo(req.params.nodeId, req.userId!);
      res.json(info);
    } catch (error) {
      next(error);
    }
  }

  async submitRequest(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const request = await this.accessRequestService.submitAccessRequest({
        treeId: req.body.treeId,
        userId: req.userId!,
        requestedLevel: req.body.requestedLevel,
      });
      res.status(201).json(request);
    } catch (error) {
      next(error);
    }
  }

  async getRequests(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const requests = await this.accessRequestService.getAccessRequests(req.params.treeId, req.userId!);
      res.json(requests);
    } catch (error) {
      next(error);
    }
  }

  async getById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const request = await this.accessRequestService.getRequestById(req.params.requestId, req.userId!);
      res.json(request);
    } catch (error) {
      next(error);
    }
  }

  async approve(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await this.accessRequestService.approveAccessRequest(
        req.params.requestId,
        req.userId!,
        req.body.grantedLevel
      );
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  async deny(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await this.accessRequestService.denyAccessRequest(req.params.requestId, req.userId!);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
}
