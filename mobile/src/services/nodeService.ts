import api from './api';
import { Node } from '../types';

export const nodeService = {
  async getNodes(treeId: string) {
    const response = await api.get<Node[]>(`/trees/${treeId}/nodes`);
    return response.data;
  },

  async getNode(treeId: string, nodeId: string) {
    const response = await api.get<Node>(`/trees/${treeId}/nodes/${nodeId}`);
    return response.data;
  },

  async createNode(treeId: string, data: Partial<Node>) {
    const response = await api.post<Node>(`/trees/${treeId}/nodes`, data);
    return response.data;
  },

  async updateNode(treeId: string, nodeId: string, data: Partial<Node>) {
    const response = await api.put<Node>(`/trees/${treeId}/nodes/${nodeId}`, data);
    return response.data;
  },

  async deleteNode(treeId: string, nodeId: string) {
    await api.delete(`/trees/${treeId}/nodes/${nodeId}`);
  },

  async publishNode(treeId: string, nodeId: string) {
    const response = await api.post<Node>(`/trees/${treeId}/nodes/${nodeId}/publish`);
    return response.data;
  },
};
