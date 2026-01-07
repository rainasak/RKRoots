import api from './api';
import { Relationship, RelationshipType } from '../types';

export interface CreateRelationshipData {
  nodeId1: string;
  nodeId2: string;
  relationshipType: RelationshipType;
  publishDraftNodes?: boolean;
}

export interface CreateRelationshipResult {
  relationship: Relationship;
  publishedNodeIds: string[];
  draftNodeIds: string[];
}

export const relationshipService = {
  async getRelationships(treeId: string) {
    const response = await api.get<Relationship[]>(`/trees/${treeId}/relationships`);
    return response.data;
  },

  async createRelationship(treeId: string, data: CreateRelationshipData): Promise<CreateRelationshipResult> {
    const response = await api.post<CreateRelationshipResult>(`/trees/${treeId}/relationships`, data);
    return response.data;
  },

  async deleteRelationship(treeId: string, relationshipId: string) {
    await api.delete(`/trees/${treeId}/relationships/${relationshipId}`);
  },
};
