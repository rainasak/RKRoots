import * as fc from 'fast-check';
import { NodeStatus } from '../../database/interfaces';

/**
 * **Feature: rkroots-family-tree, Property 17: Node publish requires relationship**
 * **Validates: Requirements 3.8**
 *
 * Property: For any node publish operation (except the first node in a tree),
 * the system should require at least one relationship to an existing published node in the same tree
 */

const mockQuery = jest.fn();

jest.mock('../../config/database', () => ({
  query: (...args: unknown[]) => mockQuery(...args),
}));

import { NodeService } from './node.service';

describe('Node Publish Property Tests', () => {
  const uuidArb = fc.uuid();
  const nonEmptyString = fc.string({ minLength: 1 }).filter(s => s.trim().length > 0);

  beforeEach(() => {
    mockQuery.mockReset();
  });

  describe('Property 17: Node publish requires relationship', () => {
    it('should allow publishing the first node in a tree without a relationship', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidArb,
          uuidArb,
          uuidArb,
          nonEmptyString,
          nonEmptyString,
          async (nodeId, treeId, userId, firstName, lastName) => {
            mockQuery.mockImplementation((sql: string) => {
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
              if (sql.includes('SELECT') && sql.includes('FROM nodes') && sql.includes('node_id = $1')) {
                return {
                  rows: [{
                    nodeId,
                    treeId,
                    firstName,
                    lastName,
                    petName: null,
                    status: NodeStatus.DRAFT,
                    createdBy: userId,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    publishedAt: null,
                  }],
                };
              }
              if (sql.includes('COUNT') && sql.includes('status = \'published\'')) {
                return { rows: [{ count: '0' }] };
              }
              if (sql.includes('UPDATE nodes')) {
                return {
                  rows: [{
                    nodeId,
                    treeId,
                    firstName,
                    lastName,
                    petName: null,
                    status: NodeStatus.PUBLISHED,
                    createdBy: userId,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    publishedAt: new Date(),
                  }],
                };
              }
              return { rows: [] };
            });

            const service = new NodeService();
            const result = await service.publishNode(nodeId, userId);
            return result.status === NodeStatus.PUBLISHED;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject publishing a non-first node without a relationship to a published node', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidArb,
          uuidArb,
          uuidArb,
          nonEmptyString,
          nonEmptyString,
          async (nodeId, treeId, userId, firstName, lastName) => {
            mockQuery.mockImplementation((sql: string) => {
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
              if (sql.includes('SELECT') && sql.includes('FROM nodes') && sql.includes('node_id = $1')) {
                return {
                  rows: [{
                    nodeId,
                    treeId,
                    firstName,
                    lastName,
                    petName: null,
                    status: NodeStatus.DRAFT,
                    createdBy: userId,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    publishedAt: null,
                  }],
                };
              }
              if (sql.includes('COUNT') && sql.includes('status = \'published\'') && !sql.includes('relationships')) {
                return { rows: [{ count: '1' }] };
              }
              if (sql.includes('COUNT') && sql.includes('relationships')) {
                return { rows: [{ count: '0' }] };
              }
              return { rows: [] };
            });

            const service = new NodeService();

            try {
              await service.publishNode(nodeId, userId);
              return false;
            } catch (error) {
              return (error as Error).message.includes('relationship') && 
                     (error as Error).message.includes('published');
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should allow publishing a non-first node with a relationship to a published node', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidArb,
          uuidArb,
          uuidArb,
          nonEmptyString,
          nonEmptyString,
          async (nodeId, treeId, userId, firstName, lastName) => {
            mockQuery.mockImplementation((sql: string) => {
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
              if (sql.includes('SELECT') && sql.includes('FROM nodes') && sql.includes('node_id = $1')) {
                return {
                  rows: [{
                    nodeId,
                    treeId,
                    firstName,
                    lastName,
                    petName: null,
                    status: NodeStatus.DRAFT,
                    createdBy: userId,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    publishedAt: null,
                  }],
                };
              }
              if (sql.includes('COUNT') && sql.includes('status = \'published\'') && !sql.includes('relationships')) {
                return { rows: [{ count: '1' }] };
              }
              if (sql.includes('COUNT') && sql.includes('relationships')) {
                return { rows: [{ count: '1' }] };
              }
              if (sql.includes('UPDATE nodes')) {
                return {
                  rows: [{
                    nodeId,
                    treeId,
                    firstName,
                    lastName,
                    petName: null,
                    status: NodeStatus.PUBLISHED,
                    createdBy: userId,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    publishedAt: new Date(),
                  }],
                };
              }
              return { rows: [] };
            });

            const service = new NodeService();
            const result = await service.publishNode(nodeId, userId);
            return result.status === NodeStatus.PUBLISHED;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should satisfy the complete property: publish requires relationship unless first node', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidArb,
          uuidArb,
          uuidArb,
          nonEmptyString,
          nonEmptyString,
          fc.boolean(),
          fc.boolean(),
          async (nodeId, treeId, userId, firstName, lastName, isFirstNode, hasRelationshipToPublished) => {
            mockQuery.mockImplementation((sql: string) => {
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
              if (sql.includes('SELECT') && sql.includes('FROM nodes') && sql.includes('node_id = $1')) {
                return {
                  rows: [{
                    nodeId,
                    treeId,
                    firstName,
                    lastName,
                    petName: null,
                    status: NodeStatus.DRAFT,
                    createdBy: userId,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    publishedAt: null,
                  }],
                };
              }
              if (sql.includes('COUNT') && sql.includes('status = \'published\'') && !sql.includes('relationships')) {
                return { rows: [{ count: isFirstNode ? '0' : '1' }] };
              }
              if (sql.includes('COUNT') && sql.includes('relationships')) {
                return { rows: [{ count: hasRelationshipToPublished ? '1' : '0' }] };
              }
              if (sql.includes('UPDATE nodes')) {
                return {
                  rows: [{
                    nodeId,
                    treeId,
                    firstName,
                    lastName,
                    petName: null,
                    status: NodeStatus.PUBLISHED,
                    createdBy: userId,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    publishedAt: new Date(),
                  }],
                };
              }
              return { rows: [] };
            });

            const service = new NodeService();
            const shouldSucceed = isFirstNode || hasRelationshipToPublished;

            try {
              const result = await service.publishNode(nodeId, userId);
              return shouldSucceed && result.status === NodeStatus.PUBLISHED;
            } catch (error) {
              return !shouldSucceed && 
                     (error as Error).message.includes('relationship') && 
                     (error as Error).message.includes('published');
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
