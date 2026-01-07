import api from './api';
import { Comment, EntityType } from '../types';

export interface CreateCommentDto {
  treeId: string;
  entityType: EntityType;
  entityId: string;
  commentText: string;
}

export const commentService = {
  async getComments(treeId: string, entityType: EntityType, entityId: string) {
    const response = await api.get<Comment[]>('/comments', {
      params: { treeId, entityType, entityId },
    });
    return response.data;
  },

  async createComment(data: CreateCommentDto) {
    const response = await api.post<Comment>('/comments', data);
    return response.data;
  },

  async updateComment(commentId: string, commentText: string) {
    const response = await api.put<Comment>(`/comments/${commentId}`, { commentText });
    return response.data;
  },

  async deleteComment(commentId: string) {
    await api.delete(`/comments/${commentId}`);
  },
};
