import { Response, NextFunction } from 'express';
import { SearchService } from './search.service';
import { AuthRequest } from '../../common/middleware/auth.middleware';

export class SearchController {
  constructor(private searchService: SearchService) {}

  async search(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { q, treeId, firstName, lastName, petName, placeOfBirth } = req.query;

      if (treeId) {
        const results = await this.searchService.searchInTree(
          treeId as string,
          req.userId!,
          q as string
        );
        res.json(results);
      } else {
        const results = await this.searchService.searchNodes(
          req.userId!,
          q as string,
          {
            firstName: firstName as string | undefined,
            lastName: lastName as string | undefined,
            petName: petName as string | undefined,
            placeOfBirth: placeOfBirth as string | undefined,
          }
        );
        res.json(results);
      }
    } catch (error) {
      next(error);
    }
  }
}
