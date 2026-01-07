import { AccessLevel } from '../../database/interfaces';

const mockQuery = jest.fn();
const mockTransaction = jest.fn();

jest.mock('../../config/database', () => ({
  query: (...args: unknown[]) => mockQuery(...args),
  transaction: (callback: (client: unknown) => Promise<unknown>) => mockTransaction(callback),
}));

import { TreeService } from './tree.service';

describe('TreeService', () => {
  let treeService: TreeService;

  beforeEach(() => {
    mockQuery.mockReset();
    mockTransaction.mockReset();
    treeService = new TreeService();
  });

  describe('createTree', () => {
    it('should create a new family tree and grant owner access', async () => {
      const createDto = {
        treeName: 'Smith Family',
        description: 'Smith family tree',
        userId: 'user123',
      };

      const tree = {
        treeId: 'tree123',
        treeName: createDto.treeName,
        description: createDto.description,
        ownerUserId: createDto.userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockTransaction.mockImplementation(async (callback) => {
        const mockClient = {
          query: jest.fn()
            .mockResolvedValueOnce({ rows: [tree] })
            .mockResolvedValueOnce({ rows: [] }),
        };
        return callback(mockClient);
      });

      const result = await treeService.createTree(createDto);

      expect(result.treeId).toBe(tree.treeId);
      expect(result.treeName).toBe(createDto.treeName);
    });
  });

  describe('getUserTrees', () => {
    it('should return all trees user has access to', async () => {
      const userId = 'user123';
      const trees = [
        { treeId: 'tree1', treeName: 'Tree 1', ownerUserId: userId, createdAt: new Date(), updatedAt: new Date() },
        { treeId: 'tree2', treeName: 'Tree 2', ownerUserId: 'other', createdAt: new Date(), updatedAt: new Date() },
      ];

      mockQuery.mockResolvedValueOnce({ rows: trees });

      const result = await treeService.getUserTrees(userId);

      expect(result.length).toBe(2);
    });
  });

  describe('getTreeById', () => {
    it('should return tree if user has access', async () => {
      const treeId = 'tree123';
      const userId = 'user123';

      const access = { treeId, userId, accessLevel: AccessLevel.VIEWER };
      const tree = { treeId, treeName: 'Test Tree', ownerUserId: userId, createdAt: new Date(), updatedAt: new Date() };

      mockQuery
        .mockResolvedValueOnce({ rows: [access] })
        .mockResolvedValueOnce({ rows: [tree] });

      const result = await treeService.getTreeById(treeId, userId);

      expect(result.treeId).toBe(treeId);
    });

    it('should throw error if user does not have access', async () => {
      const treeId = 'tree123';
      const userId = 'user123';

      mockQuery.mockResolvedValueOnce({ rows: [] });

      await expect(treeService.getTreeById(treeId, userId)).rejects.toThrow('Access denied');
    });
  });

  describe('updateTree', () => {
    it('should update tree if user is owner', async () => {
      const treeId = 'tree123';
      const userId = 'user123';
      const updateDto = { treeName: 'Updated Name' };

      const access = { treeId, userId, accessLevel: AccessLevel.OWNER };
      const updatedTree = { treeId, treeName: 'Updated Name', ownerUserId: userId, createdAt: new Date(), updatedAt: new Date() };

      mockQuery
        .mockResolvedValueOnce({ rows: [access] })
        .mockResolvedValueOnce({ rows: [updatedTree] });

      const result = await treeService.updateTree(treeId, userId, updateDto);

      expect(result.treeName).toBe(updateDto.treeName);
    });

    it('should throw error if user is not owner', async () => {
      const treeId = 'tree123';
      const userId = 'user123';
      const updateDto = { treeName: 'Updated Name' };

      const access = { treeId, userId, accessLevel: AccessLevel.VIEWER };
      mockQuery.mockResolvedValueOnce({ rows: [access] });

      await expect(treeService.updateTree(treeId, userId, updateDto)).rejects.toThrow('Owner access required');
    });
  });

  describe('deleteTree', () => {
    it('should delete tree if user is owner', async () => {
      const treeId = 'tree123';
      const userId = 'user123';

      const access = { treeId, userId, accessLevel: AccessLevel.OWNER };
      mockQuery
        .mockResolvedValueOnce({ rows: [access] })
        .mockResolvedValueOnce({ rowCount: 1 });

      await treeService.deleteTree(treeId, userId);

      expect(mockQuery).toHaveBeenCalledTimes(2);
    });

    it('should throw error if user is not owner', async () => {
      const treeId = 'tree123';
      const userId = 'user123';

      const access = { treeId, userId, accessLevel: AccessLevel.EDITOR };
      mockQuery.mockResolvedValueOnce({ rows: [access] });

      await expect(treeService.deleteTree(treeId, userId)).rejects.toThrow('Owner access required');
    });
  });
});
