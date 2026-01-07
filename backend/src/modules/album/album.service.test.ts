import { AccessLevel, AlbumSource } from '../../database/interfaces';

const mockQuery = jest.fn();

jest.mock('../../config/database', () => ({
  query: (...args: unknown[]) => mockQuery(...args),
}));

import { AlbumService } from './album.service';

describe('AlbumService', () => {
  let albumService: AlbumService;

  beforeEach(() => {
    mockQuery.mockReset();
    albumService = new AlbumService();
  });

  describe('addAlbum', () => {
    it('should link album with Google Drive source (Requirements 11.1)', async () => {
      const createDto = {
        treeId: 'tree123',
        albumSource: AlbumSource.GOOGLE_DRIVE,
        albumIdentifier: 'drive-folder-123',
        albumName: 'Family Photos 2024',
        userId: 'user123',
      };

      const access = { accessLevel: AccessLevel.EDITOR };
      const album = {
        albumId: 'album123',
        treeId: createDto.treeId,
        albumSource: createDto.albumSource,
        albumIdentifier: createDto.albumIdentifier,
        albumName: createDto.albumName,
        createdBy: createDto.userId,
        createdAt: new Date(),
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [access] })
        .mockResolvedValueOnce({ rows: [album] });

      const result = await albumService.addAlbum(createDto);

      expect(result.albumSource).toBe(AlbumSource.GOOGLE_DRIVE);
      expect(result.albumIdentifier).toBe('drive-folder-123');
      expect(result.albumName).toBe('Family Photos 2024');
    });

    it('should link album with Google Photos source (Requirements 11.1)', async () => {
      const createDto = {
        treeId: 'tree123',
        albumSource: AlbumSource.GOOGLE_PHOTOS,
        albumIdentifier: 'photos-album-456',
        albumName: 'Wedding Album',
        userId: 'user123',
      };

      const access = { accessLevel: AccessLevel.EDITOR };
      const album = {
        albumId: 'album456',
        treeId: createDto.treeId,
        albumSource: createDto.albumSource,
        albumIdentifier: createDto.albumIdentifier,
        albumName: createDto.albumName,
        createdBy: createDto.userId,
        createdAt: new Date(),
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [access] })
        .mockResolvedValueOnce({ rows: [album] });

      const result = await albumService.addAlbum(createDto);

      expect(result.albumSource).toBe(AlbumSource.GOOGLE_PHOTOS);
      expect(result.albumIdentifier).toBe('photos-album-456');
    });

    it('should require editor access to link album (Requirements 11.2)', async () => {
      const createDto = {
        treeId: 'tree123',
        albumSource: AlbumSource.GOOGLE_DRIVE,
        albumIdentifier: 'drive-folder-123',
        albumName: 'Family Photos',
        userId: 'user123',
      };

      mockQuery.mockResolvedValueOnce({ rows: [{ accessLevel: AccessLevel.VIEWER }] });

      await expect(albumService.addAlbum(createDto)).rejects.toThrow('Edit access required');
    });

    it('should allow owner to link album (Requirements 11.2)', async () => {
      const createDto = {
        treeId: 'tree123',
        albumSource: AlbumSource.GOOGLE_DRIVE,
        albumIdentifier: 'drive-folder-123',
        albumName: 'Family Photos',
        userId: 'owner123',
      };

      const access = { accessLevel: AccessLevel.OWNER };
      const album = {
        albumId: 'album789',
        treeId: createDto.treeId,
        albumSource: createDto.albumSource,
        albumIdentifier: createDto.albumIdentifier,
        albumName: createDto.albumName,
        createdBy: createDto.userId,
        createdAt: new Date(),
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [access] })
        .mockResolvedValueOnce({ rows: [album] });

      const result = await albumService.addAlbum(createDto);

      expect(result.albumId).toBe('album789');
    });

    it('should reject album linking without any access (Requirements 11.2)', async () => {
      const createDto = {
        treeId: 'tree123',
        albumSource: AlbumSource.GOOGLE_DRIVE,
        albumIdentifier: 'drive-folder-123',
        albumName: 'Family Photos',
        userId: 'stranger123',
      };

      mockQuery.mockResolvedValueOnce({ rows: [] });

      await expect(albumService.addAlbum(createDto)).rejects.toThrow('Edit access required');
    });

    it('should create PhotoAlbum entity with tree association (Requirements 11.3)', async () => {
      const createDto = {
        treeId: 'tree123',
        albumSource: AlbumSource.GOOGLE_PHOTOS,
        albumIdentifier: 'photos-album-789',
        albumName: 'Vacation Photos',
        userId: 'user123',
      };

      const access = { accessLevel: AccessLevel.EDITOR };
      const album = {
        albumId: 'album999',
        treeId: createDto.treeId,
        albumSource: createDto.albumSource,
        albumIdentifier: createDto.albumIdentifier,
        albumName: createDto.albumName,
        createdBy: createDto.userId,
        createdAt: new Date(),
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [access] })
        .mockResolvedValueOnce({ rows: [album] });

      const result = await albumService.addAlbum(createDto);

      expect(result.treeId).toBe('tree123');
      expect(result.createdBy).toBe('user123');
      expect(mockQuery.mock.calls[1][0]).toContain('INSERT INTO photo_albums');
    });
  });

  describe('getAlbums', () => {
    it('should return all albums for a tree (Requirements 11.4)', async () => {
      const treeId = 'tree123';
      const userId = 'user123';

      const access = { accessLevel: AccessLevel.VIEWER };
      const albums = [
        {
          albumId: 'album1',
          treeId,
          albumSource: AlbumSource.GOOGLE_DRIVE,
          albumIdentifier: 'drive-1',
          albumName: 'Album 1',
          createdBy: 'user123',
          createdAt: new Date(),
        },
        {
          albumId: 'album2',
          treeId,
          albumSource: AlbumSource.GOOGLE_PHOTOS,
          albumIdentifier: 'photos-2',
          albumName: 'Album 2',
          createdBy: 'user456',
          createdAt: new Date(),
        },
      ];

      mockQuery
        .mockResolvedValueOnce({ rows: [access] })
        .mockResolvedValueOnce({ rows: albums });

      const result = await albumService.getAlbums(treeId, userId);

      expect(result.length).toBe(2);
      expect(result[0].albumName).toBe('Album 1');
      expect(result[1].albumName).toBe('Album 2');
    });

    it('should allow viewer to retrieve albums (Requirements 11.4)', async () => {
      const treeId = 'tree123';
      const userId = 'viewer123';

      mockQuery
        .mockResolvedValueOnce({ rows: [{ accessLevel: AccessLevel.VIEWER }] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await albumService.getAlbums(treeId, userId);

      expect(result).toEqual([]);
      expect(mockQuery).toHaveBeenCalledTimes(2);
    });

    it('should allow editor to retrieve albums (Requirements 11.4)', async () => {
      const treeId = 'tree123';
      const userId = 'editor123';

      mockQuery
        .mockResolvedValueOnce({ rows: [{ accessLevel: AccessLevel.EDITOR }] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await albumService.getAlbums(treeId, userId);

      expect(result).toEqual([]);
    });

    it('should allow owner to retrieve albums (Requirements 11.4)', async () => {
      const treeId = 'tree123';
      const userId = 'owner123';

      mockQuery
        .mockResolvedValueOnce({ rows: [{ accessLevel: AccessLevel.OWNER }] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await albumService.getAlbums(treeId, userId);

      expect(result).toEqual([]);
    });

    it('should reject retrieval without access', async () => {
      const treeId = 'tree123';
      const userId = 'stranger123';

      mockQuery.mockResolvedValueOnce({ rows: [] });

      await expect(albumService.getAlbums(treeId, userId)).rejects.toThrow('Access denied');
    });

    it('should return empty array when no albums exist', async () => {
      const treeId = 'tree123';
      const userId = 'user123';

      mockQuery
        .mockResolvedValueOnce({ rows: [{ accessLevel: AccessLevel.VIEWER }] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await albumService.getAlbums(treeId, userId);

      expect(result).toEqual([]);
    });
  });

  describe('deleteAlbum', () => {
    it('should allow editor to delete album (Requirements 11.2)', async () => {
      const albumId = 'album123';
      const userId = 'editor123';

      const album = {
        albumId,
        treeId: 'tree123',
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [album] })
        .mockResolvedValueOnce({ rows: [{ accessLevel: AccessLevel.EDITOR }] })
        .mockResolvedValueOnce({ rowCount: 1 });

      await albumService.deleteAlbum(albumId, userId);

      expect(mockQuery).toHaveBeenCalledTimes(3);
      expect(mockQuery).toHaveBeenLastCalledWith(
        'DELETE FROM photo_albums WHERE album_id = $1',
        [albumId]
      );
    });

    it('should allow owner to delete album (Requirements 11.2)', async () => {
      const albumId = 'album123';
      const userId = 'owner123';

      const album = {
        albumId,
        treeId: 'tree123',
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [album] })
        .mockResolvedValueOnce({ rows: [{ accessLevel: AccessLevel.OWNER }] })
        .mockResolvedValueOnce({ rowCount: 1 });

      await albumService.deleteAlbum(albumId, userId);

      expect(mockQuery).toHaveBeenCalledTimes(3);
    });

    it('should reject deletion by viewer (Requirements 11.2)', async () => {
      const albumId = 'album123';
      const userId = 'viewer123';

      const album = {
        albumId,
        treeId: 'tree123',
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [album] })
        .mockResolvedValueOnce({ rows: [{ accessLevel: AccessLevel.VIEWER }] });

      await expect(albumService.deleteAlbum(albumId, userId)).rejects.toThrow('Edit access required');
    });

    it('should reject deletion without any access', async () => {
      const albumId = 'album123';
      const userId = 'stranger123';

      const album = {
        albumId,
        treeId: 'tree123',
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [album] })
        .mockResolvedValueOnce({ rows: [] });

      await expect(albumService.deleteAlbum(albumId, userId)).rejects.toThrow('Edit access required');
    });

    it('should throw error if album not found', async () => {
      const albumId = 'nonexistent';
      const userId = 'user123';

      mockQuery.mockResolvedValueOnce({ rows: [] });

      await expect(albumService.deleteAlbum(albumId, userId)).rejects.toThrow('Album not found');
    });
  });
});
