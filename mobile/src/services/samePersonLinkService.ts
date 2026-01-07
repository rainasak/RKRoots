import api from './api';
import { AccessLevel } from '../types';

export interface SamePersonLink {
  linkId: string;
  nodeId1: string;
  nodeId2: string;
  createdBy: string;
  createdAt: string;
}

export interface LinkedNode {
  nodeId: string;
  treeId: string;
  firstName?: string;
  lastName?: string;
  petName?: string;
}

export interface LinkedTree {
  treeId: string;
  treeName: string;
  linkedNodeId: string;
}

export interface LinkedTreeInfo {
  linkedNodeId: string;
  linkedTreeId: string;
  linkedTreeName: string;
  hasAccess: boolean;
  userAccessLevel: AccessLevel | null;
  canRequestAccess: boolean;
  hasPendingRequest: boolean;
}

export interface LinkedTreeInfoResult {
  hasLinkedTree: boolean;
  linkedTrees: LinkedTreeInfo[];
}

export interface AccessRequest {
  requestId: string;
  treeId: string;
  userId: string;
  requestedLevel: 'viewer' | 'editor';
  status: 'pending' | 'approved' | 'denied';
  requestedAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
  userDisplayName?: string;
  userEmail?: string;
}

export const samePersonLinkService = {
  async createLink(nodeId1: string, nodeId2: string): Promise<SamePersonLink> {
    const response = await api.post<SamePersonLink>('/same-person-links', { nodeId1, nodeId2 });
    return response.data;
  },

  async getLinkedNodes(nodeId: string): Promise<LinkedNode[]> {
    const response = await api.get<LinkedNode[]>(`/nodes/${nodeId}/linked-nodes`);
    return response.data;
  },

  async getLinkedTrees(nodeId: string): Promise<LinkedTree[]> {
    const response = await api.get<LinkedTree[]>(`/nodes/${nodeId}/linked-trees`);
    return response.data;
  },

  async getLinkedTreeInfo(nodeId: string): Promise<LinkedTreeInfoResult> {
    const response = await api.get<LinkedTreeInfoResult>(`/nodes/${nodeId}/linked-tree-info`);
    return response.data;
  },

  async getLinkById(linkId: string): Promise<SamePersonLink> {
    const response = await api.get<SamePersonLink>(`/same-person-links/${linkId}`);
    return response.data;
  },

  async deleteLink(linkId: string): Promise<void> {
    await api.delete(`/same-person-links/${linkId}`);
  },

  async submitAccessRequest(treeId: string, requestedLevel: 'viewer' | 'editor'): Promise<AccessRequest> {
    const response = await api.post<AccessRequest>('/access-requests', { treeId, requestedLevel });
    return response.data;
  },

  async getAccessRequests(treeId: string): Promise<AccessRequest[]> {
    const response = await api.get<AccessRequest[]>(`/trees/${treeId}/access-requests`);
    return response.data;
  },

  async getAccessRequestById(requestId: string): Promise<AccessRequest> {
    const response = await api.get<AccessRequest>(`/access-requests/${requestId}`);
    return response.data;
  },

  async approveAccessRequest(requestId: string, grantedLevel?: 'viewer' | 'editor'): Promise<void> {
    await api.put(`/access-requests/${requestId}/approve`, { grantedLevel });
  },

  async denyAccessRequest(requestId: string): Promise<void> {
    await api.put(`/access-requests/${requestId}/deny`);
  },
};
