import api from './api';
import { FamilyTree, AccessLevel } from '../types';

export interface TreeAccessWithUser {
  accessId: string;
  treeId: string;
  userId: string;
  accessLevel: AccessLevel;
  grantedBy: string;
  grantedAt: string;
  email: string;
  displayName: string;
}

export const treeService = {
  async getTrees() {
    const response = await api.get<FamilyTree[]>('/trees');
    return response.data;
  },

  async getTree(treeId: string) {
    const response = await api.get<FamilyTree>(`/trees/${treeId}`);
    return response.data;
  },

  async createTree(data: { treeName: string; description?: string }) {
    const response = await api.post<FamilyTree>('/trees', data);
    return response.data;
  },

  async updateTree(treeId: string, data: { treeName?: string; description?: string }) {
    const response = await api.put<FamilyTree>(`/trees/${treeId}`, data);
    return response.data;
  },

  async deleteTree(treeId: string) {
    await api.delete(`/trees/${treeId}`);
  },

  async getTreeAccess(treeId: string) {
    const response = await api.get<TreeAccessWithUser[]>(`/trees/${treeId}/access`);
    return response.data;
  },

  async grantAccess(treeId: string, data: { email: string; accessLevel: AccessLevel }) {
    const response = await api.post<TreeAccessWithUser>(`/trees/${treeId}/access`, data);
    return response.data;
  },

  async revokeAccess(treeId: string, userId: string) {
    await api.delete(`/trees/${treeId}/access/${userId}`);
  },
};
