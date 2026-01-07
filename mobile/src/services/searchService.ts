import api from './api';
import { Node, SearchResult, SearchFilters } from '../types';

export const searchService = {
  async search(query: string): Promise<SearchResult[]> {
    const response = await api.get<SearchResult[]>('/search', { params: { q: query } });
    return response.data;
  },

  async searchNodes(query: string, filters?: SearchFilters): Promise<SearchResult[]> {
    const params: Record<string, string> = { q: query };
    if (filters?.firstName) params.firstName = filters.firstName;
    if (filters?.lastName) params.lastName = filters.lastName;
    if (filters?.petName) params.petName = filters.petName;
    if (filters?.placeOfBirth) params.placeOfBirth = filters.placeOfBirth;
    if (filters?.treeId) params.treeId = filters.treeId;
    
    const response = await api.get<SearchResult[]>('/search', { params });
    return response.data;
  },

  async searchInTree(treeId: string, query: string): Promise<Node[]> {
    const response = await api.get<Node[]>('/search', { params: { q: query, treeId } });
    return response.data;
  },
};
