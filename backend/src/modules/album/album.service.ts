import { query } from '../../config/database';
import { PhotoAlbum, AlbumSource, AccessLevel } from '../../database/interfaces';
import { AppError } from '../../common/errors/app-error';

export { AlbumSource };

interface CreateAlbumDto {
  treeId: string;
  albumSource: AlbumSource;
  albumIdentifier: string;
  albumName: string;
  userId: string;
}

export class AlbumService {
  async addAlbum(dto: CreateAlbumDto): Promise<PhotoAlbum> {
    const accessResult = await query<{ accessLevel: AccessLevel }>(
      'SELECT access_level as "accessLevel" FROM tree_access WHERE tree_id = $1 AND user_id = $2',
      [dto.treeId, dto.userId]
    );

    if (accessResult.rows.length === 0 || accessResult.rows[0].accessLevel === AccessLevel.VIEWER) {
      throw new AppError('Edit access required', 403);
    }

    const result = await query<PhotoAlbum>(
      `INSERT INTO photo_albums (tree_id, album_source, album_identifier, album_name, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING album_id as "albumId", tree_id as "treeId", album_source as "albumSource", album_identifier as "albumIdentifier", album_name as "albumName", created_by as "createdBy", created_at as "createdAt"`,
      [dto.treeId, dto.albumSource, dto.albumIdentifier, dto.albumName, dto.userId]
    );

    return result.rows[0];
  }

  async getAlbums(treeId: string, userId: string): Promise<PhotoAlbum[]> {
    const accessResult = await query(
      'SELECT 1 FROM tree_access WHERE tree_id = $1 AND user_id = $2',
      [treeId, userId]
    );

    if (accessResult.rows.length === 0) {
      throw new AppError('Access denied', 403);
    }

    const result = await query<PhotoAlbum>(
      `SELECT album_id as "albumId", tree_id as "treeId", album_source as "albumSource", album_identifier as "albumIdentifier", album_name as "albumName", created_by as "createdBy", created_at as "createdAt"
       FROM photo_albums WHERE tree_id = $1`,
      [treeId]
    );

    return result.rows;
  }

  async deleteAlbum(albumId: string, userId: string): Promise<void> {
    const albumResult = await query<PhotoAlbum>(
      `SELECT album_id as "albumId", tree_id as "treeId" FROM photo_albums WHERE album_id = $1`,
      [albumId]
    );

    if (albumResult.rows.length === 0) {
      throw new AppError('Album not found', 404);
    }

    const album = albumResult.rows[0];

    const accessResult = await query<{ accessLevel: AccessLevel }>(
      'SELECT access_level as "accessLevel" FROM tree_access WHERE tree_id = $1 AND user_id = $2',
      [album.treeId, userId]
    );

    if (accessResult.rows.length === 0 || accessResult.rows[0].accessLevel === AccessLevel.VIEWER) {
      throw new AppError('Edit access required', 403);
    }

    await query('DELETE FROM photo_albums WHERE album_id = $1', [albumId]);
  }
}
