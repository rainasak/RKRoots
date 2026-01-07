import * as fc from 'fast-check';
import { AccessLevel, AccessRequestStatus } from '../../database/interfaces';

/**
 * **Feature: rkroots-family-tree, Property 9: Same Person Link discovery indicator**
 * **Validates: Requirements 8.1**
 *
 * Property: For any node with a Same Person Link, the system should display an indicator
 * that the person appears in another tree
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

import { AccessRequestService } from './access-request.service';

describe('Access Request Service Property Tests', () => {
  const uuidArb = fc.uuid();

  beforeEach(() => {
    mockQuery.mockReset();
  });

  describe('Property 9: Same Person Link discovery indicator', () => {
    it('should return hasLinkedTree=true when node has a same person link', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidArb,
          uuidArb,
          uuidArb,
          uuidArb,
          uuidArb,
          async (nodeId, treeId, linkedNodeId, linkedTreeId, userId) => {
            fc.pre(treeId !== linkedTreeId);
            fc.pre(nodeId !== linkedNodeId);

            mockQuery.mockImplementation((sql: string, params?: unknown[]) => {
              if (sql.includes('SELECT') && sql.includes('FROM nodes') && sql.includes('node_id = $1') && !sql.includes('UNION')) {
                return { rows: [{ treeId }] };
              }
              if (sql.includes('tree_access') && sql.includes('access_level')) {
                return { rows: [{ accessLevel: AccessLevel.VIEWER }] };
              }
              if (sql.includes('same_person_links') && sql.includes('UNION')) {
                return {
                  rows: [{
                    linkedNodeId,
                    linkedTreeId,
                    linkedTreeName: 'Linked Family Tree',
                  }],
                };
              }
              return { rows: [] };
            });

            const service = new AccessRequestService();
            const result = await service.getLinkedTreeInfo(nodeId, userId);

            return result.hasLinkedTree === true && result.linkedTrees.length > 0;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return hasLinkedTree=false when node has no same person links', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidArb,
          uuidArb,
          uuidArb,
          async (nodeId, treeId, userId) => {
            mockQuery.mockImplementation((sql: string, params?: unknown[]) => {
              if (sql.includes('FROM nodes') && sql.includes('node_id = $1') && !sql.includes('INNER JOIN')) {
                return { rows: [{ treeId }] };
              }
              if (sql.includes('tree_access') && sql.includes('access_level') && !sql.includes('LEFT JOIN')) {
                return { rows: [{ accessLevel: AccessLevel.VIEWER }] };
              }
              if (sql.includes('same_person_links') && sql.includes('INNER JOIN')) {
                return { rows: [] };
              }
              return { rows: [] };
            });

            const service = new AccessRequestService();
            const result = await service.getLinkedTreeInfo(nodeId, userId);

            return result.hasLinkedTree === false && result.linkedTrees.length === 0;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should show canRequestAccess=true when user has no access to linked tree', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidArb,
          uuidArb,
          uuidArb,
          uuidArb,
          uuidArb,
          async (nodeId, treeId, linkedNodeId, linkedTreeId, userId) => {
            fc.pre(treeId !== linkedTreeId);
            fc.pre(nodeId !== linkedNodeId);

            mockQuery.mockImplementation((sql: string, params?: unknown[]) => {
              if (sql.includes('SELECT') && sql.includes('FROM nodes') && sql.includes('node_id = $1') && !sql.includes('UNION')) {
                return { rows: [{ treeId }] };
              }
              if (sql.includes('tree_access') && sql.includes('access_level') && !sql.includes('LEFT JOIN')) {
                const queryTreeId = params?.[0];
                if (queryTreeId === treeId) {
                  return { rows: [{ accessLevel: AccessLevel.VIEWER }] };
                }
                return { rows: [] };
              }
              if (sql.includes('same_person_links') && sql.includes('LEFT JOIN') && sql.includes('tree_access')) {
                return {
                  rows: [{
                    linkedNodeId,
                    linkedTreeId,
                    linkedTreeName: 'Linked Family Tree',
                    userAccessLevel: null,
                    pendingRequest: false,
                  }],
                };
              }
              return { rows: [] };
            });

            const service = new AccessRequestService();
            const result = await service.getLinkedTreeInfo(nodeId, userId);

            return result.linkedTrees.length > 0 && 
                   result.linkedTrees[0].canRequestAccess === true &&
                   result.linkedTrees[0].hasAccess === false;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should show hasAccess=true when user has access to linked tree', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidArb,
          uuidArb,
          uuidArb,
          uuidArb,
          uuidArb,
          fc.constantFrom(AccessLevel.VIEWER, AccessLevel.EDITOR, AccessLevel.OWNER),
          async (nodeId, treeId, linkedNodeId, linkedTreeId, userId, accessLevel) => {
            fc.pre(treeId !== linkedTreeId);
            fc.pre(nodeId !== linkedNodeId);

            mockQuery.mockImplementation((sql: string, params?: unknown[]) => {
              if (sql.includes('SELECT') && sql.includes('FROM nodes') && sql.includes('node_id = $1') && !sql.includes('UNION')) {
                return { rows: [{ treeId }] };
              }
              if (sql.includes('tree_access') && sql.includes('access_level') && !sql.includes('LEFT JOIN')) {
                return { rows: [{ accessLevel: AccessLevel.VIEWER }] };
              }
              if (sql.includes('same_person_links') && sql.includes('LEFT JOIN') && sql.includes('tree_access')) {
                return {
                  rows: [{
                    linkedNodeId,
                    linkedTreeId,
                    linkedTreeName: 'Linked Family Tree',
                    userAccessLevel: accessLevel,
                    pendingRequest: false,
                  }],
                };
              }
              return { rows: [] };
            });

            const service = new AccessRequestService();
            const result = await service.getLinkedTreeInfo(nodeId, userId);

            return result.linkedTrees.length > 0 && 
                   result.linkedTrees[0].hasAccess === true &&
                   result.linkedTrees[0].canRequestAccess === false;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});


/**
 * **Feature: rkroots-family-tree, Property 10: Access request workflow**
 * **Validates: Requirements 8.6**
 *
 * Property: For any access request approval by a Tree Owner, the requesting user
 * should be granted the requested access level
 */
describe('Property 10: Access request workflow', () => {
  const uuidArb = fc.uuid();

  it('should grant requested access level when tree owner approves request', async () => {
    await fc.assert(
      fc.asyncProperty(
        uuidArb,
        uuidArb,
        uuidArb,
        uuidArb,
        fc.constantFrom('viewer', 'editor') as fc.Arbitrary<'viewer' | 'editor'>,
        async (requestId, treeId, requestingUserId, ownerId, requestedLevel) => {
          fc.pre(requestingUserId !== ownerId);

          let grantedAccessLevel: string | null = null;

          mockQuery.mockImplementation((sql: string, params?: unknown[]) => {
            if (sql.includes('SELECT') && sql.includes('access_requests') && sql.includes('request_id = $1')) {
              return {
                rows: [{
                  requestId,
                  treeId,
                  userId: requestingUserId,
                  requestedLevel,
                  status: AccessRequestStatus.PENDING,
                  requestedAt: new Date(),
                }],
              };
            }
            if (sql.includes('tree_access') && sql.includes('access_level') && !sql.includes('INSERT')) {
              const queryUserId = params?.[1];
              if (queryUserId === ownerId) {
                return { rows: [{ accessLevel: AccessLevel.OWNER }] };
              }
              return { rows: [] };
            }
            if (sql.includes('UPDATE') && sql.includes('access_requests')) {
              return { rowCount: 1 };
            }
            if (sql.includes('INSERT INTO tree_access')) {
              grantedAccessLevel = params?.[2] as string;
              return {
                rows: [{
                  accessId: 'new-access-id',
                  treeId: params?.[0],
                  userId: params?.[1],
                  accessLevel: params?.[2],
                  grantedBy: params?.[3],
                  grantedAt: new Date(),
                }],
              };
            }
            if (sql.includes('SELECT') && sql.includes('owner_user_id')) {
              return { rows: [{ ownerUserId: ownerId }] };
            }
            return { rows: [] };
          });

          const service = new AccessRequestService();
          await service.approveAccessRequest(requestId, ownerId);

          return grantedAccessLevel === requestedLevel;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should allow owner to override requested level with different level', async () => {
    await fc.assert(
      fc.asyncProperty(
        uuidArb,
        uuidArb,
        uuidArb,
        uuidArb,
        fc.constantFrom('viewer', 'editor') as fc.Arbitrary<'viewer' | 'editor'>,
        async (requestId, treeId, requestingUserId, ownerId, grantedLevel) => {
          fc.pre(requestingUserId !== ownerId);

          let actualGrantedLevel: string | null = null;

          mockQuery.mockImplementation((sql: string, params?: unknown[]) => {
            if (sql.includes('SELECT') && sql.includes('access_requests') && sql.includes('request_id = $1')) {
              return {
                rows: [{
                  requestId,
                  treeId,
                  userId: requestingUserId,
                  requestedLevel: 'editor',
                  status: AccessRequestStatus.PENDING,
                  requestedAt: new Date(),
                }],
              };
            }
            if (sql.includes('tree_access') && sql.includes('access_level') && !sql.includes('INSERT')) {
              const queryUserId = params?.[1];
              if (queryUserId === ownerId) {
                return { rows: [{ accessLevel: AccessLevel.OWNER }] };
              }
              return { rows: [] };
            }
            if (sql.includes('UPDATE') && sql.includes('access_requests')) {
              return { rowCount: 1 };
            }
            if (sql.includes('INSERT INTO tree_access')) {
              actualGrantedLevel = params?.[2] as string;
              return {
                rows: [{
                  accessId: 'new-access-id',
                  treeId: params?.[0],
                  userId: params?.[1],
                  accessLevel: params?.[2],
                  grantedBy: params?.[3],
                  grantedAt: new Date(),
                }],
              };
            }
            return { rows: [] };
          });

          const service = new AccessRequestService();
          await service.approveAccessRequest(requestId, ownerId, grantedLevel);

          return actualGrantedLevel === grantedLevel;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should reject approval when user is not tree owner', async () => {
    await fc.assert(
      fc.asyncProperty(
        uuidArb,
        uuidArb,
        uuidArb,
        uuidArb,
        async (requestId, treeId, requestingUserId, nonOwnerId) => {
          fc.pre(requestingUserId !== nonOwnerId);

          mockQuery.mockImplementation((sql: string, params?: unknown[]) => {
            if (sql.includes('SELECT') && sql.includes('access_requests') && sql.includes('request_id = $1')) {
              return {
                rows: [{
                  requestId,
                  treeId,
                  userId: requestingUserId,
                  requestedLevel: 'editor',
                  status: AccessRequestStatus.PENDING,
                  requestedAt: new Date(),
                }],
              };
            }
            if (sql.includes('tree_access') && sql.includes('access_level')) {
              return { rows: [{ accessLevel: AccessLevel.EDITOR }] };
            }
            return { rows: [] };
          });

          const service = new AccessRequestService();

          try {
            await service.approveAccessRequest(requestId, nonOwnerId);
            return false;
          } catch (error) {
            return (error as Error).message.includes('Owner access required');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should not allow approval of already resolved requests', async () => {
    await fc.assert(
      fc.asyncProperty(
        uuidArb,
        uuidArb,
        uuidArb,
        uuidArb,
        fc.constantFrom(AccessRequestStatus.APPROVED, AccessRequestStatus.DENIED),
        async (requestId, treeId, requestingUserId, ownerId, resolvedStatus) => {
          fc.pre(requestingUserId !== ownerId);

          mockQuery.mockImplementation((sql: string, params?: unknown[]) => {
            if (sql.includes('SELECT') && sql.includes('access_requests') && sql.includes('request_id = $1')) {
              return {
                rows: [{
                  requestId,
                  treeId,
                  userId: requestingUserId,
                  requestedLevel: 'editor',
                  status: resolvedStatus,
                  requestedAt: new Date(),
                  resolvedAt: new Date(),
                  resolvedBy: ownerId,
                }],
              };
            }
            if (sql.includes('tree_access') && sql.includes('access_level')) {
              return { rows: [{ accessLevel: AccessLevel.OWNER }] };
            }
            return { rows: [] };
          });

          const service = new AccessRequestService();

          try {
            await service.approveAccessRequest(requestId, ownerId);
            return false;
          } catch (error) {
            return (error as Error).message.includes('already been');
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
