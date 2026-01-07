import * as fc from 'fast-check';
import { AccessLevel } from '../../database/interfaces';

/**
 * **Feature: rkroots-family-tree, Property 4: Owner access immutability**
 * **Validates: Requirements 2.2**
 * 
 * Property: For any family tree, the creating user should always have Owner access level
 * that cannot be revoked
 */

const mockQuery = jest.fn();
const mockTransaction = jest.fn();

jest.mock('../../config/database', () => ({
  query: (...args: unknown[]) => mockQuery(...args),
  transaction: (callback: (client: unknown) => Promise<unknown>) => mockTransaction(callback),
}));

import { TreeService } from './tree.service';

describe('Tree Service Property Tests', () => {
  const uuidArb = fc.uuid();
  const treeNameArb = fc.string({ minLength: 1, maxLength: 100 });
  const descriptionArb = fc.option(fc.string({ maxLength: 500 }), { nil: undefined });

  beforeEach(() => {
    mockQuery.mockReset();
    mockTransaction.mockReset();
  });

  describe('Property 4: Owner access immutability', () => {
    it('should always grant Owner access to the creating user when a tree is created', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidArb,
          treeNameArb,
          descriptionArb,
          async (userId, treeName, description) => {
            const capturedQueries: { sql: string; params: unknown[] }[] = [];

            mockTransaction.mockImplementation(async (callback) => {
              const mockClient = {
                query: jest.fn().mockImplementation((sql: string, params: unknown[]) => {
                  capturedQueries.push({ sql, params });
                  if (sql.includes('INSERT INTO family_trees')) {
                    return {
                      rows: [{
                        treeId: 'generated-tree-id',
                        treeName,
                        description,
                        ownerUserId: userId,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                      }],
                    };
                  }
                  return { rows: [] };
                }),
              };
              return callback(mockClient);
            });

            const service = new TreeService();
            await service.createTree({ treeName, description, userId });

            const accessQuery = capturedQueries.find(q => q.sql.includes('INSERT INTO tree_access'));
            
            return (
              accessQuery !== undefined &&
              accessQuery.params.includes(userId) &&
              accessQuery.params.includes(AccessLevel.OWNER)
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should set the creating user as both owner and grantor of their own access', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidArb,
          treeNameArb,
          async (userId, treeName) => {
            const capturedQueries: { sql: string; params: unknown[] }[] = [];

            mockTransaction.mockImplementation(async (callback) => {
              const mockClient = {
                query: jest.fn().mockImplementation((sql: string, params: unknown[]) => {
                  capturedQueries.push({ sql, params });
                  if (sql.includes('INSERT INTO family_trees')) {
                    return {
                      rows: [{
                        treeId: 'generated-tree-id',
                        treeName,
                        ownerUserId: userId,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                      }],
                    };
                  }
                  return { rows: [] };
                }),
              };
              return callback(mockClient);
            });

            const service = new TreeService();
            await service.createTree({ treeName, userId });

            const accessQuery = capturedQueries.find(q => q.sql.includes('INSERT INTO tree_access'));
            
            if (!accessQuery) return false;
            
            const userIdCount = accessQuery.params.filter(p => p === userId).length;
            return userIdCount >= 2;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should ensure owner access is created atomically with tree creation', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidArb,
          treeNameArb,
          async (userId, treeName) => {
            let transactionUsed = false;
            const queryOrder: string[] = [];

            mockTransaction.mockImplementation(async (callback) => {
              transactionUsed = true;
              const mockClient = {
                query: jest.fn().mockImplementation((sql: string) => {
                  if (sql.includes('INSERT INTO family_trees')) {
                    queryOrder.push('tree');
                    return {
                      rows: [{
                        treeId: 'generated-tree-id',
                        treeName,
                        ownerUserId: userId,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                      }],
                    };
                  }
                  if (sql.includes('INSERT INTO tree_access')) {
                    queryOrder.push('access');
                    return { rows: [] };
                  }
                  return { rows: [] };
                }),
              };
              return callback(mockClient);
            });

            const service = new TreeService();
            await service.createTree({ treeName, userId });

            return (
              transactionUsed &&
              queryOrder.includes('tree') &&
              queryOrder.includes('access') &&
              queryOrder.indexOf('tree') < queryOrder.indexOf('access')
            );
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

/**
 * **Feature: rkroots-family-tree, Property 15: Tree deletion cascade**
 * **Validates: Requirements 2.5**
 * 
 * Property: For any tree deletion by the owner, all associated nodes, relationships,
 * access records, events, and comments should be removed
 * 
 * Note: With raw SQL and ON DELETE CASCADE foreign keys, the database handles
 * cascade deletion automatically. This test verifies the delete query is executed
 * with proper owner access validation.
 */
describe('Property 15: Tree deletion cascade', () => {
  const uuidArb = fc.uuid();

  beforeEach(() => {
    mockQuery.mockReset();
    mockTransaction.mockReset();
  });

  it('should delete tree after verifying owner access', async () => {
    await fc.assert(
      fc.asyncProperty(
        uuidArb,
        uuidArb,
        async (treeId, userId) => {
          const queriesCalled: string[] = [];

          mockQuery.mockImplementation((sql: string) => {
            queriesCalled.push(sql);
            if (sql.includes('SELECT') && sql.includes('tree_access')) {
              return {
                rows: [{
                  accessId: 'test-access-id',
                  treeId,
                  userId,
                  accessLevel: AccessLevel.OWNER,
                  grantedBy: userId,
                  grantedAt: new Date(),
                }],
              };
            }
            if (sql.includes('DELETE FROM family_trees')) {
              return { rowCount: 1 };
            }
            return { rows: [] };
          });

          const service = new TreeService();
          await service.deleteTree(treeId, userId);

          const accessCheckCalled = queriesCalled.some(q => 
            q.includes('SELECT') && q.includes('tree_access')
          );
          const deleteCalled = queriesCalled.some(q => 
            q.includes('DELETE FROM family_trees')
          );

          return accessCheckCalled && deleteCalled;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should reject deletion if user is not owner', async () => {
    await fc.assert(
      fc.asyncProperty(
        uuidArb,
        uuidArb,
        async (treeId, userId) => {
          mockQuery.mockImplementation((sql: string) => {
            if (sql.includes('SELECT') && sql.includes('tree_access')) {
              return {
                rows: [{
                  accessId: 'test-access-id',
                  treeId,
                  userId,
                  accessLevel: AccessLevel.EDITOR,
                  grantedBy: 'someone-else',
                  grantedAt: new Date(),
                }],
              };
            }
            return { rows: [] };
          });

          const service = new TreeService();

          try {
            await service.deleteTree(treeId, userId);
            return false;
          } catch (error) {
            return (error as Error).message === 'Owner access required';
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
