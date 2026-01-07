import { AccessLevel } from '../../database/interfaces';

const mockQuery = jest.fn();
const mockTransaction = jest.fn();

jest.mock('../../config/database', () => ({
  query: (...args: unknown[]) => mockQuery(...args),
  transaction: (callback: (client: unknown) => Promise<unknown>) => mockTransaction(callback),
}));

import { ConsolidationService } from './consolidation.service';

describe('ConsolidationService', () => {
  let service: ConsolidationService;

  beforeEach(() => {
    mockQuery.mockReset();
    mockTransaction.mockReset();
    service = new ConsolidationService();
  });

  describe('searchDuplicates', () => {
    it('should find duplicate nodes across accessible trees', async () => {
      const nodeId = 'node1';
      const userId = 'user1';

      mockQuery
        .mockResolvedValueOnce({
          rows: [{
            nodeId,
            treeId: 'tree1',
            firstName: 'John',
            lastName: 'Doe',
            petName: 'Johnny',
          }],
        })
        .mockResolvedValueOnce({
          rows: [
            { nodeId: 'node2', treeId: 'tree2', firstName: 'John', lastName: 'Doe' },
          ],
        });

      const result = await service.searchDuplicates(nodeId, userId);

      expect(result.length).toBe(1);
    });

    it('should throw error if node not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await expect(service.searchDuplicates('node1', 'user1'))
        .rejects.toThrow('Node not found');
    });
  });

  describe('consolidateNodes', () => {
    it('should consolidate two nodes with proper access', async () => {
      const primaryNodeId = 'node1';
      const secondaryNodeId = 'node2';
      const userId = 'user1';

      mockQuery
        .mockResolvedValueOnce({ rows: [{ nodeId: primaryNodeId, treeId: 'tree1' }] })
        .mockResolvedValueOnce({ rows: [{ nodeId: secondaryNodeId, treeId: 'tree2' }] })
        .mockResolvedValueOnce({ rows: [{ accessLevel: AccessLevel.EDITOR }] })
        .mockResolvedValueOnce({ rows: [{ accessLevel: AccessLevel.EDITOR }] });

      const consolidated = { consolidatedId: 'cons1', primaryNodeId, createdAt: new Date() };

      mockTransaction.mockImplementation(async (callback) => {
        const mockClient = {
          query: jest.fn()
            .mockResolvedValueOnce({ rows: [consolidated] })
            .mockResolvedValueOnce({ rows: [] }),
        };
        return callback(mockClient);
      });

      const result = await service.consolidateNodes(primaryNodeId, secondaryNodeId, userId);

      expect(result.consolidatedId).toBe('cons1');
    });

    it('should throw error if nodes not found', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      await expect(service.consolidateNodes('node1', 'node2', 'user1'))
        .rejects.toThrow('Nodes not found');
    });

    it('should throw error if user lacks access to trees', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ nodeId: 'node1', treeId: 'tree1' }] })
        .mockResolvedValueOnce({ rows: [{ nodeId: 'node2', treeId: 'tree2' }] })
        .mockResolvedValueOnce({ rows: [{ accessLevel: AccessLevel.EDITOR }] })
        .mockResolvedValueOnce({ rows: [] });

      await expect(service.consolidateNodes('node1', 'node2', 'user1'))
        .rejects.toThrow('Access denied');
    });
  });

  describe('getLinkedTrees', () => {
    it('should return linked tree IDs for consolidated node', async () => {
      const nodeId = 'node1';
      const userId = 'user1';

      mockQuery
        .mockResolvedValueOnce({
          rows: [{ consolidatedId: 'cons1' }],
        })
        .mockResolvedValueOnce({
          rows: [
            { treeId: 'tree1' },
            { treeId: 'tree2' },
          ],
        });

      const result = await service.getLinkedTrees(nodeId, userId);

      expect(result.length).toBe(2);
    });

    it('should return empty array if no mappings found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await service.getLinkedTrees('node1', 'user1');

      expect(result).toEqual([]);
    });
  });
});
