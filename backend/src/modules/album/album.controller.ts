import { Response, NextFunction } from 'express';
import { AlbumService } from './album.service';
import { AuthRequest } from '../../common/middleware/auth.middleware';
import { AlbumSource } from '../../database/interfaces';

export class AlbumController {
  constructor(private albumService: AlbumService) {}

  async create(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const album = await this.albumService.addAlbum({
        treeId: req.params.treeId,
        albumSource: req.body.albumSource as AlbumSource,
        albumIdentifier: req.body.albumIdentifier,
        albumName: req.body.albumName,
        userId: req.userId!,
      });
      res.status(201).json(album);
    } catch (error) {
      next(error);
    }
  }

  async getAlbums(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const albums = await this.albumService.getAlbums(req.params.treeId, req.userId!);
      res.json(albums);
    } catch (error) {
      next(error);
    }
  }

  async delete(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await this.albumService.deleteAlbum(req.params.albumId, req.userId!);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
}
