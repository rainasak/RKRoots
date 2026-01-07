import { AccessLevel, AccessRequestStatus } from '../../database/interfaces';

const mockQuery = jest.fn();
const mockCreateNotification = jest.fn().mockResolvedValue({});

jest.mock('../../config/database', () => ({
  query: (...args: unknown[]) => mockQuery(...args),
  transaction: (callback: (client: unknown) => Promise<unknown>) => callback({ query: mockQuery }),
}));

jest.mock('../notification/notification.service', () => ({
  NotificationService: jest.fn().mockImplementation(() => ({
    createNotification: mockCreateNotification,
  })),
}));

import { AccessRequestService } from './access-request.service';

describe('AccessRequestService', () => {
  let service: AccessRequestService;

  beforeEach(() => {
    mockQuery.mockReset();
    mockCreateNotification.mockReset();
    mockCreateNotification.mockResolvedValue({});
    service = new AccessRequestService();
  });

  describe('submitAccessRequest', () => {
    const treeId = 'tree-1';
    const userId = 'user-1';
    const ownerId = 'owner-1';

    it('should create access request when user has no existing access', async () => {
      mockQuery.mockImplementation((sql: string, params?: unknown[]) => {
        if (sql.includes('tree_access') && sql.includes('access_level')) {
          return { rows: [] };
        }
        if (sql.includes('SELECT') && sql.includes('access_requests') && sql.includes('pending')) {
          return { rows: [] };
        }
        if (sql.includes('INSERT INTO access_requests')) {
          return {
            rows: [{
              requestId: 'new-request-id',
              treeId,
              userId,
              requestedLevel: 'editor',
              status: AccessRequestStatus.PENDING,
              requestedAt: new Date(),
            }],
          };
        }
        if (sql.includes('owner_user_id')) {
          return { rows: [{ ownerUserId: ownerId }] };
        }
        return { rows: [] };
      });

      const result = await service.submitAccessRequest({
        treeId,
        userId,
        requestedLevel: 'editor',
      });

      expect(result.requestId).toBe('new-request-id');
      expect(result.status).toBe(AccessRequestStatus.PENDING);
    });

    it('should reject request when user already has access', async () => {
      mockQuery.mockImplementation((sql: string) => {
        if (sql.includes('tree_access') && sql.includes('access_level')) {
          return { rows: [{ accessLevel: AccessLevel.VIEWER }] };
        }
        return { rows: [] };
      });

      await expect(service.submitAccessRequest({
        treeId,
        userId,
        requestedLevel: 'editor',
      })).rejects.toThrow('User already has access to this tree');
    });

    it('should reject request when pending request already exists', async () => {
      mockQuery.mockImplementation((sql: string) => {
        if (sql.includes('tree_access') && sql.includes('access_level')) {
          return { rows: [] };
        }
        if (sql.includes('SELECT') && sql.includes('access_requests') && sql.includes('pending')) {
          return { rows: [{ requestId: 'existing-request' }] };
        }
        return { rows: [] };
      });

      await expect(service.submitAccessRequest({
        treeId,
        userId,
        requestedLevel: 'editor',
      })).rejects.toThrow('Access request already pending');
    });
  });

  describe('approveAccessRequest', () => {
    const requestId = 'request-1';
    const treeId = 'tree-1';
    const requestingUserId = 'user-1';
    const ownerId = 'owner-1';

    it('should grant requested access level when approved by owner', async () => {
      let grantedLevel: string | null = null;

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
          return { rows: [{ accessLevel: AccessLevel.OWNER }] };
        }
        if (sql.includes('INSERT INTO tree_access') || sql.includes('ON CONFLICT')) {
          grantedLevel = params?.[2] as string;
          return {
            rows: [{
              accessId: 'new-access-id',
              treeId,
              userId: requestingUserId,
              accessLevel: 'editor',
              grantedBy: ownerId,
              grantedAt: new Date(),
            }],
          };
        }
        if (sql.includes('UPDATE') && sql.includes('access_requests')) {
          return { rowCount: 1 };
        }
        return { rows: [] };
      });

      await service.approveAccessRequest(requestId, ownerId);

      expect(grantedLevel).toBe('editor');
    });

    it('should allow owner to grant viewer access even if editor was requested', async () => {
      let grantedLevel: string | null = null;

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
          return { rows: [{ accessLevel: AccessLevel.OWNER }] };
        }
        if (sql.includes('INSERT INTO tree_access') || sql.includes('ON CONFLICT')) {
          grantedLevel = params?.[2] as string;
          return {
            rows: [{
              accessId: 'new-access-id',
              treeId,
              userId: requestingUserId,
              accessLevel: 'viewer',
              grantedBy: ownerId,
              grantedAt: new Date(),
            }],
          };
        }
        if (sql.includes('UPDATE') && sql.includes('access_requests')) {
          return { rowCount: 1 };
        }
        return { rows: [] };
      });

      await service.approveAccessRequest(requestId, ownerId, 'viewer');

      expect(grantedLevel).toBe('viewer');
    });

    it('should reject approval when request not found', async () => {
      mockQuery.mockImplementation((sql: string) => {
        if (sql.includes('SELECT') && sql.includes('access_requests')) {
          return { rows: [] };
        }
        return { rows: [] };
      });

      await expect(service.approveAccessRequest(requestId, ownerId))
        .rejects.toThrow('Access request not found');
    });

    it('should reject approval when user is not tree owner', async () => {
      const nonOwnerId = 'non-owner';

      mockQuery.mockImplementation((sql: string) => {
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

      await expect(service.approveAccessRequest(requestId, nonOwnerId))
        .rejects.toThrow('Owner access required');
    });
  });

  describe('denyAccessRequest', () => {
    const requestId = 'request-1';
    const treeId = 'tree-1';
    const requestingUserId = 'user-1';
    const ownerId = 'owner-1';

    it('should deny request and notify user when owner denies', async () => {
      let updatedStatus: string | null = null;

      mockQuery.mockImplementation((sql: string, params?: unknown[]) => {
        if (sql.includes('SELECT') && sql.includes('access_requests') && sql.includes('request_id = $1')) {
          return {
            rows: [{
              requestId,
              treeId,
              userId: requestingUserId,
              requestedLevel: 'editor',
              status: AccessRequestStatus.PENDING,
            }],
          };
        }
        if (sql.includes('tree_access') && sql.includes('access_level')) {
          return { rows: [{ accessLevel: AccessLevel.OWNER }] };
        }
        if (sql.includes('UPDATE') && sql.includes('access_requests')) {
          updatedStatus = params?.[0] as string;
          return { rowCount: 1 };
        }
        return { rows: [] };
      });

      await service.denyAccessRequest(requestId, ownerId);

      expect(updatedStatus).toBe(AccessRequestStatus.DENIED);
      expect(mockCreateNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: requestingUserId,
          message: 'Your access request has been denied.',
        })
      );
    });

    it('should reject denial when request not found', async () => {
      mockQuery.mockImplementation((sql: string) => {
        if (sql.includes('SELECT') && sql.includes('access_requests')) {
          return { rows: [] };
        }
        return { rows: [] };
      });

      await expect(service.denyAccessRequest(requestId, ownerId))
        .rejects.toThrow('Access request not found');
    });
  });

  describe('getLinkedTreeInfo', () => {
    const nodeId = 'node-1';
    const treeId = 'tree-1';
    const userId = 'user-1';

    it('should show Request Access option when user has no access to linked tree', async () => {
      mockQuery.mockImplementation((sql: string) => {
        if (sql.includes('FROM nodes') && sql.includes('node_id = $1') && !sql.includes('INNER JOIN')) {
          return { rows: [{ treeId }] };
        }
        if (sql.includes('tree_access') && sql.includes('access_level') && !sql.includes('LEFT JOIN')) {
          return { rows: [{ accessLevel: AccessLevel.VIEWER }] };
        }
        if (sql.includes('same_person_links') && sql.includes('INNER JOIN')) {
          return {
            rows: [{
              linkedNodeId: 'linked-node-1',
              linkedTreeId: 'linked-tree-1',
              linkedTreeName: 'Linked Family',
              userAccessLevel: null,
              pendingRequest: false,
            }],
          };
        }
        return { rows: [] };
      });

      const result = await service.getLinkedTreeInfo(nodeId, userId);

      expect(result.hasLinkedTree).toBe(true);
      expect(result.linkedTrees[0].canRequestAccess).toBe(true);
      expect(result.linkedTrees[0].hasAccess).toBe(false);
    });

    it('should show direct navigation when user has access to linked tree', async () => {
      mockQuery.mockImplementation((sql: string) => {
        if (sql.includes('FROM nodes') && sql.includes('node_id = $1') && !sql.includes('INNER JOIN')) {
          return { rows: [{ treeId }] };
        }
        if (sql.includes('tree_access') && sql.includes('access_level') && !sql.includes('LEFT JOIN')) {
          return { rows: [{ accessLevel: AccessLevel.VIEWER }] };
        }
        if (sql.includes('same_person_links') && sql.includes('INNER JOIN')) {
          return {
            rows: [{
              linkedNodeId: 'linked-node-1',
              linkedTreeId: 'linked-tree-1',
              linkedTreeName: 'Linked Family',
              userAccessLevel: AccessLevel.VIEWER,
              pendingRequest: false,
            }],
          };
        }
        return { rows: [] };
      });

      const result = await service.getLinkedTreeInfo(nodeId, userId);

      expect(result.hasLinkedTree).toBe(true);
      expect(result.linkedTrees[0].hasAccess).toBe(true);
      expect(result.linkedTrees[0].canRequestAccess).toBe(false);
    });

    it('should show pending request status when request is pending', async () => {
      mockQuery.mockImplementation((sql: string) => {
        if (sql.includes('FROM nodes') && sql.includes('node_id = $1') && !sql.includes('INNER JOIN')) {
          return { rows: [{ treeId }] };
        }
        if (sql.includes('tree_access') && sql.includes('access_level') && !sql.includes('LEFT JOIN')) {
          return { rows: [{ accessLevel: AccessLevel.VIEWER }] };
        }
        if (sql.includes('same_person_links') && sql.includes('INNER JOIN')) {
          return {
            rows: [{
              linkedNodeId: 'linked-node-1',
              linkedTreeId: 'linked-tree-1',
              linkedTreeName: 'Linked Family',
              userAccessLevel: null,
              pendingRequest: true,
            }],
          };
        }
        return { rows: [] };
      });

      const result = await service.getLinkedTreeInfo(nodeId, userId);

      expect(result.linkedTrees[0].hasPendingRequest).toBe(true);
      expect(result.linkedTrees[0].canRequestAccess).toBe(false);
    });
  });

  describe('getAccessRequests', () => {
    const treeId = 'tree-1';
    const ownerId = 'owner-1';

    it('should return access requests for tree owner', async () => {
      mockQuery.mockImplementation((sql: string) => {
        if (sql.includes('tree_access') && sql.includes('access_level')) {
          return { rows: [{ accessLevel: AccessLevel.OWNER }] };
        }
        if (sql.includes('SELECT') && sql.includes('access_requests') && sql.includes('JOIN users')) {
          return {
            rows: [
              {
                requestId: 'request-1',
                treeId,
                userId: 'user-1',
                requestedLevel: 'editor',
                status: AccessRequestStatus.PENDING,
                requestedAt: new Date(),
                userDisplayName: 'John Doe',
                userEmail: 'john@example.com',
              },
            ],
          };
        }
        return { rows: [] };
      });

      const result = await service.getAccessRequests(treeId, ownerId);

      expect(result).toHaveLength(1);
      expect(result[0].requestId).toBe('request-1');
    });

    it('should reject when user is not tree owner', async () => {
      const nonOwnerId = 'non-owner';

      mockQuery.mockImplementation((sql: string) => {
        if (sql.includes('tree_access') && sql.includes('access_level')) {
          return { rows: [{ accessLevel: AccessLevel.EDITOR }] };
        }
        return { rows: [] };
      });

      await expect(service.getAccessRequests(treeId, nonOwnerId))
        .rejects.toThrow('Owner access required');
    });
  });
});
