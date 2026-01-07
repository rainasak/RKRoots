import { AccessLevel } from '../../database/interfaces';

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

describe('SamePersonLinkService', () => {
  let service: SamePersonLinkService;

  beforeEach(() => {
    mockQuery.mockReset();
    service = new SamePersonLinkService();
  });

  describe('createSamePersonLink', () => {
    const treeId1 = 'tree-1';
    const treeId2 = 'tree-2';
    const nodeId1 = 'node-1';
    const nodeId2 = 'node-2';
    const userId = 'user-1';

    it('should create link when nodes are from different trees and user has edit access', async () => {
      mockQuery.mockImplementation((sql: string, params?: unknown[]) => {
        if (sql.includes('SELECT') && sql.includes('FROM nodes') && sql.includes('IN')) {
          return {
            rows: [
              { nodeId: nodeId1, treeId: treeId1, firstName: 'John', lastName: 'Doe' },
              { nodeId: nodeId2, treeId: treeId2, firstName: 'Jane', lastName: 'Doe' },
            ],
          };
        }
        if (sql.includes('SELECT') && sql.includes('tree_access') && sql.includes('access_level')) {
          return { rows: [{ accessLevel: AccessLevel.EDITOR }] };
        }
        if (sql.includes('SELECT') && sql.includes('same_person_links')) {
          return { rows: [] };
        }
        if (sql.includes('INSERT INTO same_person_links')) {
          return {
            rows: [{
              linkId: 'new-link-id',
              nodeId1,
              nodeId2,
              createdBy: userId,
              createdAt: new Date(),
            }],
          };
        }
        if (sql.includes('SELECT') && sql.includes('tree_access') && sql.includes('owner')) {
          return { rows: [] };
        }
        return { rows: [] };
      });

      const result = await service.createSamePersonLink({ nodeId1, nodeId2, userId });

      expect(result.linkId).toBe('new-link-id');
      expect(result.nodeId1).toBe(nodeId1);
      expect(result.nodeId2).toBe(nodeId2);
    });

    it('should reject link creation when nodes are from the same tree', async () => {
      mockQuery.mockImplementation((sql: string) => {
        if (sql.includes('SELECT') && sql.includes('FROM nodes') && sql.includes('IN')) {
          return {
            rows: [
              { nodeId: nodeId1, treeId: treeId1, firstName: 'John', lastName: 'Doe' },
              { nodeId: nodeId2, treeId: treeId1, firstName: 'Jane', lastName: 'Doe' },
            ],
          };
        }
        return { rows: [] };
      });

      await expect(service.createSamePersonLink({ nodeId1, nodeId2, userId }))
        .rejects.toThrow('Nodes must belong to different trees');
    });

    it('should reject link creation when one node does not exist', async () => {
      mockQuery.mockImplementation((sql: string) => {
        if (sql.includes('SELECT') && sql.includes('FROM nodes') && sql.includes('IN')) {
          return {
            rows: [
              { nodeId: nodeId1, treeId: treeId1, firstName: 'John', lastName: 'Doe' },
            ],
          };
        }
        return { rows: [] };
      });

      await expect(service.createSamePersonLink({ nodeId1, nodeId2, userId }))
        .rejects.toThrow('One or both nodes not found');
    });

    it('should reject link creation when link already exists', async () => {
      mockQuery.mockImplementation((sql: string, params?: unknown[]) => {
        if (sql.includes('SELECT') && sql.includes('FROM nodes') && sql.includes('IN')) {
          return {
            rows: [
              { nodeId: nodeId1, treeId: treeId1, firstName: 'John', lastName: 'Doe' },
              { nodeId: nodeId2, treeId: treeId2, firstName: 'Jane', lastName: 'Doe' },
            ],
          };
        }
        if (sql.includes('SELECT') && sql.includes('tree_access') && sql.includes('access_level')) {
          return { rows: [{ accessLevel: AccessLevel.EDITOR }] };
        }
        if (sql.includes('SELECT') && sql.includes('same_person_links')) {
          return { rows: [{ linkId: 'existing-link' }] };
        }
        return { rows: [] };
      });

      await expect(service.createSamePersonLink({ nodeId1, nodeId2, userId }))
        .rejects.toThrow('Same person link already exists');
    });
  });

  describe('deleteSamePersonLink', () => {
    const linkId = 'link-1';
    const nodeId1 = 'node-1';
    const nodeId2 = 'node-2';
    const treeId1 = 'tree-1';
    const treeId2 = 'tree-2';
    const ownerId = 'owner-1';

    it('should delete link when user is tree owner', async () => {
      mockQuery.mockImplementation((sql: string, params?: unknown[]) => {
        if (sql.includes('SELECT') && sql.includes('same_person_links') && sql.includes('link_id')) {
          return { rows: [{ nodeId1, nodeId2 }] };
        }
        if (sql.includes('SELECT') && sql.includes('FROM nodes') && sql.includes('IN')) {
          return {
            rows: [
              { treeId: treeId1 },
              { treeId: treeId2 },
            ],
          };
        }
        if (sql.includes('SELECT') && sql.includes('tree_access') && sql.includes('access_level')) {
          return { rows: [{ accessLevel: AccessLevel.OWNER }] };
        }
        if (sql.includes('DELETE FROM same_person_links')) {
          return { rowCount: 1 };
        }
        return { rows: [] };
      });

      await expect(service.deleteSamePersonLink(linkId, ownerId)).resolves.not.toThrow();
    });

    it('should reject deletion when user is not tree owner', async () => {
      const nonOwnerId = 'non-owner';

      mockQuery.mockImplementation((sql: string) => {
        if (sql.includes('SELECT') && sql.includes('same_person_links') && sql.includes('link_id')) {
          return { rows: [{ nodeId1, nodeId2 }] };
        }
        if (sql.includes('SELECT') && sql.includes('FROM nodes') && sql.includes('IN')) {
          return {
            rows: [
              { treeId: treeId1 },
              { treeId: treeId2 },
            ],
          };
        }
        if (sql.includes('SELECT') && sql.includes('tree_access') && sql.includes('access_level')) {
          return { rows: [{ accessLevel: AccessLevel.EDITOR }] };
        }
        return { rows: [] };
      });

      await expect(service.deleteSamePersonLink(linkId, nonOwnerId))
        .rejects.toThrow('Only tree owners can delete same person links');
    });

    it('should reject deletion when link does not exist', async () => {
      mockQuery.mockImplementation((sql: string) => {
        if (sql.includes('SELECT') && sql.includes('same_person_links') && sql.includes('link_id')) {
          return { rows: [] };
        }
        return { rows: [] };
      });

      await expect(service.deleteSamePersonLink(linkId, ownerId))
        .rejects.toThrow('Same person link not found');
    });
  });

  describe('getLinkedNodes', () => {
    const nodeId = 'node-1';
    const treeId = 'tree-1';
    const userId = 'user-1';

    it('should return linked nodes when user has access', async () => {
      mockQuery.mockImplementation((sql: string) => {
        if (sql.includes('SELECT') && sql.includes('tree_id') && sql.includes('FROM nodes') && !sql.includes('INNER JOIN')) {
          return { rows: [{ treeId }] };
        }
        if (sql.includes('SELECT') && sql.includes('tree_access')) {
          return {
            rows: [{
              accessId: 'access-1',
              treeId,
              userId,
              accessLevel: AccessLevel.VIEWER,
              grantedBy: userId,
              grantedAt: new Date(),
            }],
          };
        }
        if (sql.includes('INNER JOIN') && sql.includes('UNION')) {
          return {
            rows: [
              { nodeId: 'linked-node-1', treeId: 'tree-2', firstName: 'Jane', lastName: 'Doe' },
            ],
          };
        }
        return { rows: [] };
      });

      const result = await service.getLinkedNodes(nodeId, userId);

      expect(result).toHaveLength(1);
      expect(result[0].nodeId).toBe('linked-node-1');
    });

    it('should throw error when node does not exist', async () => {
      mockQuery.mockImplementation((sql: string) => {
        if (sql.includes('SELECT') && sql.includes('tree_id') && sql.includes('FROM nodes')) {
          return { rows: [] };
        }
        return { rows: [] };
      });

      await expect(service.getLinkedNodes(nodeId, userId))
        .rejects.toThrow('Node not found');
    });
  });

  describe('getLinkedTrees', () => {
    const nodeId = 'node-1';
    const treeId = 'tree-1';
    const userId = 'user-1';

    it('should return linked trees when user has access', async () => {
      mockQuery.mockImplementation((sql: string) => {
        if (sql.includes('SELECT') && sql.includes('tree_id') && sql.includes('FROM nodes') && !sql.includes('INNER JOIN')) {
          return { rows: [{ treeId }] };
        }
        if (sql.includes('SELECT') && sql.includes('tree_access')) {
          return {
            rows: [{
              accessId: 'access-1',
              treeId,
              userId,
              accessLevel: AccessLevel.VIEWER,
              grantedBy: userId,
              grantedAt: new Date(),
            }],
          };
        }
        if (sql.includes('family_trees') && sql.includes('INNER JOIN')) {
          return {
            rows: [
              { treeId: 'tree-2', treeName: 'Smith Family', linkedNodeId: 'linked-node-1' },
            ],
          };
        }
        return { rows: [] };
      });

      const result = await service.getLinkedTrees(nodeId, userId);

      expect(result).toHaveLength(1);
      expect(result[0].treeId).toBe('tree-2');
      expect(result[0].treeName).toBe('Smith Family');
    });
  });
});
