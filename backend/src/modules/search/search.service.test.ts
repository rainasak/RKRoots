import { AccessLevel, NodeStatus } from '../../database/interfaces';

const mockQuery = jest.fn();

jest.mock('../../config/database', () => ({
  query: (...args: unknown[]) => mockQuery(...args),
}));

import { SearchService } from './search.service';

describe('SearchService', () => {
  let service: SearchService;

  beforeEach(() => {
    mockQuery.mockReset();
    service = new SearchService();
  });

  describe('searchNodes', () => {
    it('should search by firstName', async () => {
      const userId = 'user1';
      const searchQuery = 'John';

      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            nodeId: 'node1',
            treeId: 'tree1',
            firstName: 'John',
            lastName: 'Doe',
            treeName: 'Smith Family',
            status: NodeStatus.PUBLISHED,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      });

      const result = await service.searchNodes(userId, searchQuery);

      expect(result.length).toBe(1);
      expect(result[0].firstName).toBe('John');
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('first_name ILIKE'),
        expect.any(Array)
      );
    });

    it('should search by lastName', async () => {
      const userId = 'user1';
      const searchQuery = 'Doe';

      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            nodeId: 'node1',
            treeId: 'tree1',
            firstName: 'John',
            lastName: 'Doe',
            treeName: 'Smith Family',
            status: NodeStatus.PUBLISHED,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      });

      const result = await service.searchNodes(userId, searchQuery);

      expect(result.length).toBe(1);
      expect(result[0].lastName).toBe('Doe');
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('last_name ILIKE'),
        expect.any(Array)
      );
    });

    it('should search by petName', async () => {
      const userId = 'user1';
      const searchQuery = 'Johnny';

      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            nodeId: 'node1',
            treeId: 'tree1',
            firstName: 'John',
            lastName: 'Doe',
            petName: 'Johnny',
            treeName: 'Smith Family',
            status: NodeStatus.PUBLISHED,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      });

      const result = await service.searchNodes(userId, searchQuery);

      expect(result.length).toBe(1);
      expect(result[0].petName).toBe('Johnny');
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('pet_name ILIKE'),
        expect.any(Array)
      );
    });

    it('should reject search queries under 3 characters', async () => {
      const userId = 'user1';

      await expect(service.searchNodes(userId, 'Jo')).rejects.toThrow(
        'Search query must be at least 3 characters'
      );
      await expect(service.searchNodes(userId, 'J')).rejects.toThrow(
        'Search query must be at least 3 characters'
      );
      await expect(service.searchNodes(userId, '')).rejects.toThrow(
        'Search query must be at least 3 characters'
      );
    });

    it('should exclude draft nodes from search results', async () => {
      const userId = 'user1';
      const searchQuery = 'John';

      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            nodeId: 'node1',
            treeId: 'tree1',
            firstName: 'John',
            lastName: 'Doe',
            treeName: 'Smith Family',
            status: NodeStatus.PUBLISHED,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      });

      await service.searchNodes(userId, searchQuery);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining("status = 'published'"),
        expect.any(Array)
      );
    });

    it('should apply multi-criteria filters with AND logic', async () => {
      const userId = 'user1';
      const searchQuery = 'John';
      const filters = { firstName: 'John', lastName: 'Doe', placeOfBirth: 'New York' };

      mockQuery.mockResolvedValueOnce({ rows: [] });

      await service.searchNodes(userId, searchQuery, filters);

      const queryCall = mockQuery.mock.calls[0][0];
      expect(queryCall).toContain('first_name ILIKE');
      expect(queryCall).toContain('last_name ILIKE');
      expect(queryCall).toContain('place_of_birth ILIKE');
      expect(queryCall).toContain('AND');
    });

    it('should return node details and tree name without access level', async () => {
      const userId = 'user1';
      const searchQuery = 'John';

      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            nodeId: 'node1',
            treeId: 'tree1',
            firstName: 'John',
            lastName: 'Doe',
            petName: 'Johnny',
            address: '123 Main St',
            placeOfBirth: 'New York',
            treeName: 'Smith Family',
            status: NodeStatus.PUBLISHED,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      });

      const result = await service.searchNodes(userId, searchQuery);

      expect(result[0]).toHaveProperty('nodeId');
      expect(result[0]).toHaveProperty('treeId');
      expect(result[0]).toHaveProperty('firstName');
      expect(result[0]).toHaveProperty('lastName');
      expect(result[0]).toHaveProperty('treeName');
      expect(result[0]).not.toHaveProperty('accessLevel');
    });

    it('should return empty array when no matches', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await service.searchNodes('user1', 'NonExistent');

      expect(result).toEqual([]);
    });
  });

  describe('searchInTree', () => {
    it('should search within specific tree', async () => {
      const treeId = 'tree1';
      const userId = 'user1';
      const searchQuery = 'Jane';

      mockQuery
        .mockResolvedValueOnce({ rows: [{ accessLevel: AccessLevel.VIEWER }] })
        .mockResolvedValueOnce({
          rows: [
            {
              nodeId: 'node1',
              treeId,
              firstName: 'Jane',
              status: NodeStatus.PUBLISHED,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ],
        });

      const result = await service.searchInTree(treeId, userId, searchQuery);

      expect(result.length).toBe(1);
      expect(result[0].firstName).toBe('Jane');
    });

    it('should reject search queries under 3 characters in tree search', async () => {
      const treeId = 'tree1';
      const userId = 'user1';

      await expect(service.searchInTree(treeId, userId, 'Jo')).rejects.toThrow(
        'Search query must be at least 3 characters'
      );
    });

    it('should exclude draft nodes from tree search', async () => {
      const treeId = 'tree1';
      const userId = 'user1';
      const searchQuery = 'Jane';

      mockQuery
        .mockResolvedValueOnce({ rows: [{ accessLevel: AccessLevel.VIEWER }] })
        .mockResolvedValueOnce({ rows: [] });

      await service.searchInTree(treeId, userId, searchQuery);

      expect(mockQuery.mock.calls[1][0]).toContain("status = 'published'");
    });

    it('should throw error if no access', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await expect(service.searchInTree('tree1', 'user1', 'Jane')).rejects.toThrow(
        'Access denied'
      );
    });
  });
});
