import { RelationshipType, AccessLevel, NodeStatus } from '../../database/interfaces';

const mockQuery = jest.fn();
const mockTransaction = jest.fn();

jest.mock('../../config/database', () => ({
  query: (...args: unknown[]) => mockQuery(...args),
  transaction: (callback: (client: unknown) => Promise<unknown>) => mockTransaction(callback),
}));

import { RelationshipService } from './relationship.service';

describe('RelationshipService', () => {
  let service: RelationshipService;

  const testUserId = 'user-123';
  const testTreeId = 'tree-456';
  const testNodeId1 = 'node-789';
  const testNodeId2 = 'node-012';
  const testRelationshipId = 'rel-345';

  beforeEach(() => {
    mockQuery.mockReset();
    mockTransaction.mockReset();
    service = new RelationshipService();
  });

  describe('createRelationship', () => {
    it('should create a relationship with valid published nodes', async () => {
      const mockClient = {
        query: jest.fn().mockImplementation((sql: string) => {
          if (sql.includes('INSERT INTO relationships')) {
            return {
              rows: [{
                relationshipId: testRelationshipId,
                treeId: testTreeId,
                nodeId1: testNodeId1,
                nodeId2: testNodeId2,
                relationshipType: RelationshipType.PARENT_CHILD,
                createdAt: new Date(),
              }],
            };
          }
          return { rows: [] };
        }),
      };

      mockTransaction.mockImplementation(async (callback: (client: unknown) => Promise<unknown>) => {
        return callback(mockClient);
      });

      mockQuery.mockImplementation((sql: string, params?: unknown[]) => {
        if (sql.includes('tree_access')) {
          return {
            rows: [{
              accessId: 'access-1',
              treeId: testTreeId,
              userId: testUserId,
              accessLevel: AccessLevel.EDITOR,
            }],
          };
        }
        if (sql.includes('FROM nodes') && sql.includes('IN')) {
          return {
            rows: [
              { nodeId: params?.[0], treeId: testTreeId, status: NodeStatus.PUBLISHED, createdBy: testUserId },
              { nodeId: params?.[1], treeId: testTreeId, status: NodeStatus.PUBLISHED, createdBy: testUserId },
            ],
          };
        }
        if (sql.includes('COUNT') && sql.includes('published')) {
          return { rows: [{ count: '1' }] };
        }
        return { rows: [] };
      });

      const result = await service.createRelationship({
        treeId: testTreeId,
        nodeId1: testNodeId1,
        nodeId2: testNodeId2,
        relationshipType: RelationshipType.PARENT_CHILD,
        userId: testUserId,
      });

      expect(result.relationship.relationshipId).toBe(testRelationshipId);
      expect(result.publishedNodeIds).toHaveLength(0);
      expect(result.draftNodeIds).toHaveLength(0);
    });

    it('should return draft node IDs when relationship involves draft nodes and publishDraftNodes is not set', async () => {
      const mockClient = {
        query: jest.fn().mockImplementation((sql: string) => {
          if (sql.includes('INSERT INTO relationships')) {
            return {
              rows: [{
                relationshipId: testRelationshipId,
                treeId: testTreeId,
                nodeId1: testNodeId1,
                nodeId2: testNodeId2,
                relationshipType: RelationshipType.PARENT_CHILD,
                createdAt: new Date(),
              }],
            };
          }
          return { rows: [] };
        }),
      };

      mockTransaction.mockImplementation(async (callback: (client: unknown) => Promise<unknown>) => {
        return callback(mockClient);
      });

      mockQuery.mockImplementation((sql: string, params?: unknown[]) => {
        if (sql.includes('tree_access')) {
          return {
            rows: [{
              accessId: 'access-1',
              treeId: testTreeId,
              userId: testUserId,
              accessLevel: AccessLevel.EDITOR,
            }],
          };
        }
        if (sql.includes('FROM nodes') && sql.includes('IN')) {
          return {
            rows: [
              { nodeId: params?.[0], treeId: testTreeId, status: NodeStatus.PUBLISHED, createdBy: testUserId },
              { nodeId: params?.[1], treeId: testTreeId, status: NodeStatus.DRAFT, createdBy: testUserId },
            ],
          };
        }
        if (sql.includes('COUNT') && sql.includes('published')) {
          return { rows: [{ count: '1' }] };
        }
        return { rows: [] };
      });

      const result = await service.createRelationship({
        treeId: testTreeId,
        nodeId1: testNodeId1,
        nodeId2: testNodeId2,
        relationshipType: RelationshipType.PARENT_CHILD,
        userId: testUserId,
      });

      expect(result.relationship.relationshipId).toBe(testRelationshipId);
      expect(result.publishedNodeIds).toHaveLength(0);
      expect(result.draftNodeIds).toContain(testNodeId2);
      expect(result.draftNodeIds).toHaveLength(1);
    });

    it('should publish draft nodes when publishDraftNodes is true', async () => {
      const mockClient = {
        query: jest.fn().mockImplementation((sql: string) => {
          if (sql.includes('UPDATE nodes')) {
            return { rowCount: 1 };
          }
          if (sql.includes('INSERT INTO relationships')) {
            return {
              rows: [{
                relationshipId: testRelationshipId,
                treeId: testTreeId,
                nodeId1: testNodeId1,
                nodeId2: testNodeId2,
                relationshipType: RelationshipType.PARENT_CHILD,
                createdAt: new Date(),
              }],
            };
          }
          return { rows: [] };
        }),
      };

      mockTransaction.mockImplementation(async (callback: (client: unknown) => Promise<unknown>) => {
        return callback(mockClient);
      });

      mockQuery.mockImplementation((sql: string, params?: unknown[]) => {
        if (sql.includes('tree_access')) {
          return {
            rows: [{
              accessId: 'access-1',
              treeId: testTreeId,
              userId: testUserId,
              accessLevel: AccessLevel.EDITOR,
            }],
          };
        }
        if (sql.includes('FROM nodes') && sql.includes('IN')) {
          return {
            rows: [
              { nodeId: params?.[0], treeId: testTreeId, status: NodeStatus.PUBLISHED, createdBy: testUserId },
              { nodeId: params?.[1], treeId: testTreeId, status: NodeStatus.DRAFT, createdBy: testUserId },
            ],
          };
        }
        if (sql.includes('COUNT') && sql.includes('published')) {
          return { rows: [{ count: '1' }] };
        }
        return { rows: [] };
      });

      const result = await service.createRelationship({
        treeId: testTreeId,
        nodeId1: testNodeId1,
        nodeId2: testNodeId2,
        relationshipType: RelationshipType.PARENT_CHILD,
        userId: testUserId,
        publishDraftNodes: true,
      });

      expect(result.relationship.relationshipId).toBe(testRelationshipId);
      expect(result.publishedNodeIds).toContain(testNodeId2);
      expect(result.draftNodeIds).toHaveLength(0);
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE nodes'),
        expect.arrayContaining([NodeStatus.PUBLISHED])
      );
    });

    it('should not publish draft nodes when publishDraftNodes is false', async () => {
      const mockClient = {
        query: jest.fn().mockImplementation((sql: string) => {
          if (sql.includes('INSERT INTO relationships')) {
            return {
              rows: [{
                relationshipId: testRelationshipId,
                treeId: testTreeId,
                nodeId1: testNodeId1,
                nodeId2: testNodeId2,
                relationshipType: RelationshipType.PARENT_CHILD,
                createdAt: new Date(),
              }],
            };
          }
          return { rows: [] };
        }),
      };

      mockTransaction.mockImplementation(async (callback: (client: unknown) => Promise<unknown>) => {
        return callback(mockClient);
      });

      mockQuery.mockImplementation((sql: string, params?: unknown[]) => {
        if (sql.includes('tree_access')) {
          return {
            rows: [{
              accessId: 'access-1',
              treeId: testTreeId,
              userId: testUserId,
              accessLevel: AccessLevel.EDITOR,
            }],
          };
        }
        if (sql.includes('FROM nodes') && sql.includes('IN')) {
          return {
            rows: [
              { nodeId: params?.[0], treeId: testTreeId, status: NodeStatus.PUBLISHED, createdBy: testUserId },
              { nodeId: params?.[1], treeId: testTreeId, status: NodeStatus.DRAFT, createdBy: testUserId },
            ],
          };
        }
        if (sql.includes('COUNT') && sql.includes('published')) {
          return { rows: [{ count: '1' }] };
        }
        return { rows: [] };
      });

      const result = await service.createRelationship({
        treeId: testTreeId,
        nodeId1: testNodeId1,
        nodeId2: testNodeId2,
        relationshipType: RelationshipType.PARENT_CHILD,
        userId: testUserId,
        publishDraftNodes: false,
      });

      expect(result.relationship.relationshipId).toBe(testRelationshipId);
      expect(result.publishedNodeIds).toHaveLength(0);
      expect(result.draftNodeIds).toContain(testNodeId2);
      expect(result.draftNodeIds).toHaveLength(1);
    });

    it('should reject relationship when both nodes are draft and tree has published nodes', async () => {
      mockQuery.mockImplementation((sql: string, params?: unknown[]) => {
        if (sql.includes('tree_access')) {
          return {
            rows: [{
              accessId: 'access-1',
              treeId: testTreeId,
              userId: testUserId,
              accessLevel: AccessLevel.EDITOR,
            }],
          };
        }
        if (sql.includes('FROM nodes') && sql.includes('IN')) {
          return {
            rows: [
              { nodeId: params?.[0], treeId: testTreeId, status: NodeStatus.DRAFT, createdBy: testUserId },
              { nodeId: params?.[1], treeId: testTreeId, status: NodeStatus.DRAFT, createdBy: testUserId },
            ],
          };
        }
        if (sql.includes('COUNT') && sql.includes('published')) {
          return { rows: [{ count: '1' }] };
        }
        return { rows: [] };
      });

      await expect(
        service.createRelationship({
          treeId: testTreeId,
          nodeId1: testNodeId1,
          nodeId2: testNodeId2,
          relationshipType: RelationshipType.PARENT_CHILD,
          userId: testUserId,
        })
      ).rejects.toThrow('At least one node must be published');
    });

    it('should allow both draft nodes when tree is empty (first node exception)', async () => {
      const mockClient = {
        query: jest.fn().mockImplementation((sql: string) => {
          if (sql.includes('UPDATE nodes')) {
            return { rowCount: 1 };
          }
          if (sql.includes('INSERT INTO relationships')) {
            return {
              rows: [{
                relationshipId: testRelationshipId,
                treeId: testTreeId,
                nodeId1: testNodeId1,
                nodeId2: testNodeId2,
                relationshipType: RelationshipType.PARENT_CHILD,
                createdAt: new Date(),
              }],
            };
          }
          return { rows: [] };
        }),
      };

      mockTransaction.mockImplementation(async (callback: (client: unknown) => Promise<unknown>) => {
        return callback(mockClient);
      });

      mockQuery.mockImplementation((sql: string, params?: unknown[]) => {
        if (sql.includes('tree_access')) {
          return {
            rows: [{
              accessId: 'access-1',
              treeId: testTreeId,
              userId: testUserId,
              accessLevel: AccessLevel.EDITOR,
            }],
          };
        }
        if (sql.includes('FROM nodes') && sql.includes('IN')) {
          return {
            rows: [
              { nodeId: params?.[0], treeId: testTreeId, status: NodeStatus.DRAFT, createdBy: testUserId },
              { nodeId: params?.[1], treeId: testTreeId, status: NodeStatus.DRAFT, createdBy: testUserId },
            ],
          };
        }
        if (sql.includes('COUNT') && sql.includes('published')) {
          return { rows: [{ count: '0' }] };
        }
        return { rows: [] };
      });

      const result = await service.createRelationship({
        treeId: testTreeId,
        nodeId1: testNodeId1,
        nodeId2: testNodeId2,
        relationshipType: RelationshipType.PARENT_CHILD,
        userId: testUserId,
        publishDraftNodes: true,
      });

      expect(result.relationship.relationshipId).toBe(testRelationshipId);
      expect(result.publishedNodeIds).toHaveLength(2);
      expect(result.draftNodeIds).toHaveLength(0);
    });

    it('should reject publishing draft node created by another user', async () => {
      mockTransaction.mockImplementation(async (callback: (client: unknown) => Promise<unknown>) => {
        return callback({
          query: jest.fn(),
        });
      });

      mockQuery.mockImplementation((sql: string, params?: unknown[]) => {
        if (sql.includes('tree_access')) {
          return {
            rows: [{
              accessId: 'access-1',
              treeId: testTreeId,
              userId: testUserId,
              accessLevel: AccessLevel.EDITOR,
            }],
          };
        }
        if (sql.includes('FROM nodes') && sql.includes('IN')) {
          return {
            rows: [
              { nodeId: params?.[0], treeId: testTreeId, status: NodeStatus.PUBLISHED, createdBy: testUserId },
              { nodeId: params?.[1], treeId: testTreeId, status: NodeStatus.DRAFT, createdBy: 'other-user' },
            ],
          };
        }
        if (sql.includes('COUNT') && sql.includes('published')) {
          return { rows: [{ count: '1' }] };
        }
        return { rows: [] };
      });

      await expect(
        service.createRelationship({
          treeId: testTreeId,
          nodeId1: testNodeId1,
          nodeId2: testNodeId2,
          relationshipType: RelationshipType.PARENT_CHILD,
          userId: testUserId,
          publishDraftNodes: true,
        })
      ).rejects.toThrow('Cannot publish a draft node created by another user');
    });

    it('should reject relationship creation without edit access', async () => {
      mockQuery.mockImplementation((sql: string) => {
        if (sql.includes('tree_access')) {
          return {
            rows: [{
              accessId: 'access-1',
              treeId: testTreeId,
              userId: testUserId,
              accessLevel: AccessLevel.VIEWER,
            }],
          };
        }
        return { rows: [] };
      });

      await expect(
        service.createRelationship({
          treeId: testTreeId,
          nodeId1: testNodeId1,
          nodeId2: testNodeId2,
          relationshipType: RelationshipType.SPOUSE,
          userId: testUserId,
        })
      ).rejects.toThrow('Edit access required');
    });
  });

  describe('getRelationships', () => {
    it('should return all relationships for a tree', async () => {
      const mockRelationships = [
        {
          relationshipId: 'rel-1',
          treeId: testTreeId,
          nodeId1: 'node-a',
          nodeId2: 'node-b',
          relationshipType: RelationshipType.PARENT_CHILD,
          createdAt: new Date(),
        },
        {
          relationshipId: 'rel-2',
          treeId: testTreeId,
          nodeId1: 'node-b',
          nodeId2: 'node-c',
          relationshipType: RelationshipType.SPOUSE,
          createdAt: new Date(),
        },
      ];

      mockQuery.mockImplementation((sql: string) => {
        if (sql.includes('tree_access')) {
          return {
            rows: [{
              accessId: 'access-1',
              treeId: testTreeId,
              userId: testUserId,
              accessLevel: AccessLevel.VIEWER,
            }],
          };
        }
        if (sql.includes('FROM relationships') && sql.includes('WHERE tree_id')) {
          return { rows: mockRelationships };
        }
        return { rows: [] };
      });

      const result = await service.getRelationships(testTreeId, testUserId);

      expect(result).toHaveLength(2);
      expect(result[0].relationshipType).toBe(RelationshipType.PARENT_CHILD);
    });
  });

  describe('getNodeRelationships', () => {
    it('should return relationships where node appears as either nodeId1 or nodeId2', async () => {
      const mockRelationships = [
        {
          relationshipId: 'rel-1',
          treeId: testTreeId,
          nodeId1: testNodeId1,
          nodeId2: 'node-other',
          relationshipType: RelationshipType.PARENT_CHILD,
          createdAt: new Date(),
        },
        {
          relationshipId: 'rel-2',
          treeId: testTreeId,
          nodeId1: 'node-another',
          nodeId2: testNodeId1,
          relationshipType: RelationshipType.SIBLING,
          createdAt: new Date(),
        },
      ];

      mockQuery.mockImplementation((sql: string) => {
        if (sql.includes('FROM nodes') && sql.includes('WHERE node_id')) {
          return { rows: [{ treeId: testTreeId }] };
        }
        if (sql.includes('tree_access')) {
          return {
            rows: [{
              accessId: 'access-1',
              treeId: testTreeId,
              userId: testUserId,
              accessLevel: AccessLevel.VIEWER,
            }],
          };
        }
        if (sql.includes('FROM relationships') && sql.includes('OR')) {
          return { rows: mockRelationships };
        }
        return { rows: [] };
      });

      const result = await service.getNodeRelationships(testNodeId1, testUserId);

      expect(result).toHaveLength(2);
      expect(result.some(r => r.nodeId1 === testNodeId1)).toBe(true);
      expect(result.some(r => r.nodeId2 === testNodeId1)).toBe(true);
    });

    it('should throw error when node does not exist', async () => {
      mockQuery.mockImplementation((sql: string) => {
        if (sql.includes('FROM nodes') && sql.includes('WHERE node_id')) {
          return { rows: [] };
        }
        return { rows: [] };
      });

      await expect(
        service.getNodeRelationships('non-existent-node', testUserId)
      ).rejects.toThrow('Node not found');
    });
  });

  describe('deleteRelationship', () => {
    it('should delete relationship with edit access', async () => {
      mockQuery.mockImplementation((sql: string) => {
        if (sql.includes('FROM relationships') && sql.includes('WHERE relationship_id')) {
          return {
            rows: [{
              relationshipId: testRelationshipId,
              treeId: testTreeId,
            }],
          };
        }
        if (sql.includes('tree_access')) {
          return {
            rows: [{
              accessId: 'access-1',
              treeId: testTreeId,
              userId: testUserId,
              accessLevel: AccessLevel.EDITOR,
            }],
          };
        }
        if (sql.includes('DELETE FROM relationships')) {
          return { rowCount: 1 };
        }
        return { rows: [] };
      });

      await expect(
        service.deleteRelationship(testRelationshipId, testUserId)
      ).resolves.not.toThrow();
    });

    it('should throw error when relationship does not exist', async () => {
      mockQuery.mockImplementation((sql: string) => {
        if (sql.includes('FROM relationships') && sql.includes('WHERE relationship_id')) {
          return { rows: [] };
        }
        return { rows: [] };
      });

      await expect(
        service.deleteRelationship('non-existent-rel', testUserId)
      ).rejects.toThrow('Relationship not found');
    });
  });
});
