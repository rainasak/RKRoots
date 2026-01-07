import * as fc from 'fast-check';
import { RelationshipType, NodeStatus } from '../../database/interfaces';

/**
 * **Feature: rkroots-family-tree, Property 5: Relationship tree consistency**
 * **Validates: Requirements 4.2**
 *
 * Property: For any relationship creation, both nodes should belong to the same tree
 */

const mockQuery = jest.fn();
const mockTransaction = jest.fn();

jest.mock('../../config/database', () => ({
  query: (...args: unknown[]) => mockQuery(...args),
  transaction: (callback: (client: unknown) => Promise<unknown>) => mockTransaction(callback),
}));

import { RelationshipService } from './relationship.service';

describe('Relationship Service Property Tests', () => {
  const uuidArb = fc.uuid();
  const relationshipTypeArb = fc.constantFrom(
    RelationshipType.PARENT_CHILD,
    RelationshipType.SPOUSE,
    RelationshipType.SIBLING,
    RelationshipType.ADOPTED,
    RelationshipType.STEP
  );

  beforeEach(() => {
    mockQuery.mockReset();
    mockTransaction.mockReset();
  });

  describe('Property 5: Relationship tree consistency', () => {
    it('should accept relationship creation when both nodes belong to the same tree', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidArb,
          uuidArb,
          uuidArb,
          uuidArb,
          relationshipTypeArb,
          async (treeId, nodeId1, nodeId2, userId, relationshipType) => {
            fc.pre(nodeId1 !== nodeId2);

            const mockClient = {
              query: jest.fn().mockImplementation((sql: string) => {
                if (sql.includes('INSERT INTO relationships')) {
                  return {
                    rows: [{
                      relationshipId: 'generated-relationship-id',
                      treeId,
                      nodeId1,
                      nodeId2,
                      relationshipType,
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
              if (sql.includes('SELECT') && sql.includes('tree_access')) {
                return {
                  rows: [{
                    accessId: 'test-access-id',
                    treeId,
                    userId,
                    accessLevel: 'editor',
                    grantedBy: userId,
                    grantedAt: new Date(),
                  }],
                };
              }
              if (sql.includes('SELECT') && sql.includes('FROM nodes') && sql.includes('IN')) {
                return {
                  rows: [
                    { nodeId: params?.[0], treeId, status: NodeStatus.PUBLISHED, createdBy: userId },
                    { nodeId: params?.[1], treeId, status: NodeStatus.PUBLISHED, createdBy: userId },
                  ],
                };
              }
              if (sql.includes('COUNT') && sql.includes('published')) {
                return { rows: [{ count: '1' }] };
              }
              return { rows: [] };
            });

            const service = new RelationshipService();
            const result = await service.createRelationship({
              treeId,
              nodeId1,
              nodeId2,
              relationshipType,
              userId,
            });

            return result.relationship.treeId === treeId;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject relationship creation when nodes belong to different trees', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidArb,
          uuidArb,
          uuidArb,
          uuidArb,
          uuidArb,
          relationshipTypeArb,
          async (treeId1, treeId2, nodeId1, nodeId2, userId, relationshipType) => {
            fc.pre(treeId1 !== treeId2);
            fc.pre(nodeId1 !== nodeId2);

            mockQuery.mockImplementation((sql: string, params?: unknown[]) => {
              if (sql.includes('SELECT') && sql.includes('tree_access')) {
                return {
                  rows: [{
                    accessId: 'test-access-id',
                    treeId: treeId1,
                    userId,
                    accessLevel: 'editor',
                    grantedBy: userId,
                    grantedAt: new Date(),
                  }],
                };
              }
              if (sql.includes('SELECT') && sql.includes('FROM nodes') && sql.includes('IN')) {
                return {
                  rows: [
                    { nodeId: params?.[0], treeId: treeId1, status: NodeStatus.PUBLISHED, createdBy: userId },
                    { nodeId: params?.[1], treeId: treeId2, status: NodeStatus.PUBLISHED, createdBy: userId },
                  ],
                };
              }
              return { rows: [] };
            });

            const service = new RelationshipService();

            try {
              await service.createRelationship({
                treeId: treeId1,
                nodeId1,
                nodeId2,
                relationshipType,
                userId,
              });
              return false;
            } catch (error) {
              return (error as Error).message.includes('same tree');
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject relationship creation when a node does not exist', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidArb,
          uuidArb,
          uuidArb,
          uuidArb,
          relationshipTypeArb,
          async (treeId, nodeId1, nodeId2, userId, relationshipType) => {
            fc.pre(nodeId1 !== nodeId2);

            mockQuery.mockImplementation((sql: string, params?: unknown[]) => {
              if (sql.includes('SELECT') && sql.includes('tree_access')) {
                return {
                  rows: [{
                    accessId: 'test-access-id',
                    treeId,
                    userId,
                    accessLevel: 'editor',
                    grantedBy: userId,
                    grantedAt: new Date(),
                  }],
                };
              }
              if (sql.includes('SELECT') && sql.includes('FROM nodes') && sql.includes('IN')) {
                return { rows: [{ nodeId: params?.[0], treeId, status: NodeStatus.PUBLISHED, createdBy: userId }] };
              }
              return { rows: [] };
            });

            const service = new RelationshipService();

            try {
              await service.createRelationship({
                treeId,
                nodeId1,
                nodeId2,
                relationshipType,
                userId,
              });
              return false;
            } catch (error) {
              return (error as Error).message.includes('not found') || 
                     (error as Error).message.includes('same tree');
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
