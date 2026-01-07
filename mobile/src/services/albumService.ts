import api from './api';
import { AlbumSource, PhotoAlbum } from '../types';

export { AlbumSource };

export interface CreateAlbumDto {
  albumSource: AlbumSource;
  albumIdentifier: string;
  albumName: string;
}

export const albumService = {
  async getAlbums(treeId: string): Promise<PhotoAlbum[]> {
    const response = await api.get<PhotoAlbum[]>(`/trees/${treeId}/albums`);
    return response.data;
  },

  async linkAlbum(treeId: string, data: CreateAlbumDto): Promise<PhotoAlbum> {
    const response = await api.post<PhotoAlbum>(`/trees/${treeId}/albums`, data);
    return response.data;
  },

  async deleteAlbum(albumId: string): Promise<void> {
    await api.delete(`/albums/${albumId}`);
  },
};
