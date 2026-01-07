import * as fc from 'fast-check';
import { AccessLevel } from '../../database/interfaces';

/**
 * **Feature: rkroots-family-tree, Property 7: Same Person Link different trees requirement**
 * **Validates: Requirements 7.3**
 *
 * Property: For any same person link creation, the two nodes must belong to different family trees
 */

const mockQuery = jest.fn();

jest.mock('../../config/database', () => ({
  query: (...args: unknown[]) => mockQuery(...args),
  transaction: (callback: (client: unknown) => Promise<unknown>) => callback({ query: mockQuery }),
}));

jest.mock('../notification/notification.service', () => ({
  NotificationService: jest.fn().mockImplementation(() => ({
    createNotification: jest.fn().mockResolvedValue({}),
  })),
}));

import { SamePersonLinkService } from './same-person-link.service';

describe('Same Person Link Service Property Tests', () => {
  const uuidArb = fc.uuid();

  beforeEach(() => {
    mockQuery.mockReset();
  });

  describe('Property 7: Same Person Link different trees requirement', () => {
    it('should accept link creation when nodes belong to different trees', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidArb,
          uuidArb,
          uuidArb,
          uuidArb,
          uuidArb,
          async (treeId1, treeId2, nodeId1, nodeId2, userId) => {
            fc.pre(treeId1 !== treeId2);
            fc.pre(nodeId1 !== nodeId2);

            mockQuery.mockImplementation((sql: string, params?: unknown[]) => {
              if (sql.includes('SELECT') && sql.includes('FROM nodes') && sql.includes('IN')) {
                return {
                  rows: [
                    { nodeId: params?.[0], treeId: treeId1, firstName: 'John', lastName: 'Doe' },
                    { nodeId: params?.[1], treeId: treeId2, firstName: 'Jane', lastName: 'Doe' },
                  ],
                };
              }
              if (sql.includes('SELECT') && sql.includes('tree_access') && sql.includes('access_level')) {
                const treeId = params?.[0];
                return {
                  rows: [{ accessLevel: AccessLevel.EDITOR }],
                };
              }
              if (sql.includes('SELECT') && sql.includes('same_person_links')) {
                return { rows: [] };
              }
              if (sql.includes('INSERT INTO same_person_links')) {
                return {
                  rows: [{
                    linkId: 'generated-link-id',
                    nodeId1: params?.[0],
                    nodeId2: params?.[1],
                    createdBy: params?.[2],
                    createdAt: new Date(),
                  }],
                };
              }
              if (sql.includes('SELECT') && sql.includes('tree_access') && sql.includes('owner')) {
                return { rows: [] };
              }
              return { rows: [] };
            });

            const service = new SamePersonLinkService();
            const result = await service.createSamePersonLink({
              nodeId1,
              nodeId2,
              userId,
            });

            return result.nodeId1 === nodeId1 && result.nodeId2 === nodeId2;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject link creation when nodes belong to the same tree', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidArb,
          uuidArb,
          uuidArb,
          uuidArb,
          async (treeId, nodeId1, nodeId2, userId) => {
            fc.pre(nodeId1 !== nodeId2);

            mockQuery.mockImplementation((sql: string, params?: unknown[]) => {
              if (sql.includes('SELECT') && sql.includes('FROM nodes') && sql.includes('IN')) {
                return {
                  rows: [
                    { nodeId: params?.[0], treeId, firstName: 'John', lastName: 'Doe' },
                    { nodeId: params?.[1], treeId, firstName: 'Jane', lastName: 'Doe' },
                  ],
                };
              }
              return { rows: [] };
            });

            const service = new SamePersonLinkService();

            try {
              await service.createSamePersonLink({
                nodeId1,
                nodeId2,
                userId,
              });
              return false;
            } catch (error) {
              return (error as Error).message.includes('different trees');
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});


/**
 * **Feature: rkroots-family-tree, Property 8: Same Person Link access requirement**
 * **Validates: Requirements 7.1**
 *
 * Property: For any same person link creation, the system should allow the link if and only if
 * the user has Editor or Owner access to at least one of the trees
 */
describe('Property 8: Same Person Link access requirement', () => {
  const uuidArb = fc.uuid();
  const editAccessLevelArb = fc.constantFrom(AccessLevel.EDITOR, AccessLevel.OWNER);

  it('should accept link creation when user has edit access to at least one tree', async () => {
    await fc.assert(
      fc.asyncProperty(
        uuidArb,
        uuidArb,
        uuidArb,
        uuidArb,
        uuidArb,
        editAccessLevelArb,
        async (treeId1, treeId2, nodeId1, nodeId2, userId, accessLevel) => {
          fc.pre(treeId1 !== treeId2);
          fc.pre(nodeId1 !== nodeId2);

          mockQuery.mockImplementation((sql: string, params?: unknown[]) => {
            if (sql.includes('SELECT') && sql.includes('FROM nodes') && sql.includes('IN')) {
              return {
                rows: [
                  { nodeId: params?.[0], treeId: treeId1, firstName: 'John', lastName: 'Doe' },
                  { nodeId: params?.[1], treeId: treeId2, firstName: 'Jane', lastName: 'Doe' },
                ],
              };
            }
            if (sql.includes('SELECT') && sql.includes('tree_access') && sql.includes('access_level')) {
              const treeId = params?.[0];
              if (treeId === treeId1) {
                return { rows: [{ accessLevel }] };
              }
              return { rows: [] };
            }
            if (sql.includes('SELECT') && sql.includes('same_person_links')) {
              return { rows: [] };
            }
            if (sql.includes('INSERT INTO same_person_links')) {
              return {
                rows: [{
                  linkId: 'generated-link-id',
                  nodeId1: params?.[0],
                  nodeId2: params?.[1],
                  createdBy: params?.[2],
                  createdAt: new Date(),
                }],
              };
            }
            if (sql.includes('SELECT') && sql.includes('tree_access') && sql.includes('owner')) {
              return { rows: [] };
            }
            return { rows: [] };
          });

          const service = new SamePersonLinkService();
          const result = await service.createSamePersonLink({
            nodeId1,
            nodeId2,
            userId,
          });

          return result.linkId !== undefined;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should reject link creation when user has only viewer access to both trees', async () => {
    await fc.assert(
      fc.asyncProperty(
        uuidArb,
        uuidArb,
        uuidArb,
        uuidArb,
        uuidArb,
        async (treeId1, treeId2, nodeId1, nodeId2, userId) => {
          fc.pre(treeId1 !== treeId2);
          fc.pre(nodeId1 !== nodeId2);

          mockQuery.mockImplementation((sql: string, params?: unknown[]) => {
            if (sql.includes('SELECT') && sql.includes('FROM nodes') && sql.includes('IN')) {
              return {
                rows: [
                  { nodeId: params?.[0], treeId: treeId1, firstName: 'John', lastName: 'Doe' },
                  { nodeId: params?.[1], treeId: treeId2, firstName: 'Jane', lastName: 'Doe' },
                ],
              };
            }
            if (sql.includes('SELECT') && sql.includes('tree_access') && sql.includes('access_level')) {
              return { rows: [{ accessLevel: AccessLevel.VIEWER }] };
            }
            return { rows: [] };
          });

          const service = new SamePersonLinkService();

          try {
            await service.createSamePersonLink({
              nodeId1,
              nodeId2,
              userId,
            });
            return false;
          } catch (error) {
            return (error as Error).message.includes('Edit access');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should reject link creation when user has no access to either tree', async () => {
    await fc.assert(
      fc.asyncProperty(
        uuidArb,
        uuidArb,
        uuidArb,
        uuidArb,
        uuidArb,
        async (treeId1, treeId2, nodeId1, nodeId2, userId) => {
          fc.pre(treeId1 !== treeId2);
          fc.pre(nodeId1 !== nodeId2);

          mockQuery.mockImplementation((sql: string, params?: unknown[]) => {
            if (sql.includes('SELECT') && sql.includes('FROM nodes') && sql.includes('IN')) {
              return {
                rows: [
                  { nodeId: params?.[0], treeId: treeId1, firstName: 'John', lastName: 'Doe' },
                  { nodeId: params?.[1], treeId: treeId2, firstName: 'Jane', lastName: 'Doe' },
                ],
              };
            }
            if (sql.includes('SELECT') && sql.includes('tree_access') && sql.includes('access_level')) {
              return { rows: [] };
            }
            return { rows: [] };
          });

          const service = new SamePersonLinkService();

          try {
            await service.createSamePersonLink({
              nodeId1,
              nodeId2,
              userId,
            });
            return false;
          } catch (error) {
            return (error as Error).message.includes('Edit access');
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
