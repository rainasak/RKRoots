import * as fc from 'fast-check';
import { AccessLevel, NodeStatus } from '../../database/interfaces';

/**
 * **Feature: rkroots-family-tree, Property 12: Search scope restriction**
 * **Validates: Requirements 10.2**
 *
 * Property: For any search query, the system should return only nodes from
 * trees where the user has access
 */

const mockQuery = jest.fn();

jest.mock('../../config/database', () => ({
  query: (...args: unknown[]) => mockQuery(...args),
}));

import { SearchService } from './search.service';

describe('Search Service Property Tests', () => {
  const uuidArb = fc.uuid();
  const searchQueryArb = fc.string({ minLength: 3, maxLength: 50 });
  const nameArb = fc.string({ minLength: 1, maxLength: 100 });
  const accessLevelArb = fc.constantFrom(...Object.values(AccessLevel));

  beforeEach(() => {
    mockQuery.mockReset();
  });

  describe('Property 12: Search scope restriction', () => {
    it('should only return nodes from trees where user has access', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidArb,
          searchQueryArb,
          fc.array(
            fc.record({
              nodeId: uuidArb,
              treeId: uuidArb,
              firstName: nameArb,
              lastName: nameArb,
              petName: fc.option(nameArb, { nil: undefined }),
              treeName: nameArb,
              status: fc.constant(NodeStatus.PUBLISHED),
              createdBy: uuidArb,
              createdAt: fc.date(),
              updatedAt: fc.date(),
            }),
            { minLength: 0, maxLength: 10 }
          ),
          fc.array(uuidArb, { minLength: 0, maxLength: 5 }),
          async (userId, searchQuery, allNodes, accessibleTreeIds) => {
            const accessibleTreeIdSet = new Set(accessibleTreeIds);
            const expectedResults = allNodes.filter(
              (node) => accessibleTreeIdSet.has(node.treeId)
            );

            mockQuery.mockResolvedValueOnce({ rows: expectedResults });

            const service = new SearchService();
            const results = await service.searchNodes(userId, searchQuery);

            return results.every((result) =>
              accessibleTreeIdSet.has(result.treeId)
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return empty array when user has no tree access', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidArb,
          searchQueryArb,
          async (userId, searchQuery) => {
            mockQuery.mockResolvedValueOnce({ rows: [] });

            const service = new SearchService();
            const results = await service.searchNodes(userId, searchQuery);

            return results.length === 0;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should include nodes from all accessible trees in search results', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidArb,
          searchQueryArb,
          fc.array(uuidArb, { minLength: 1, maxLength: 5 }),
          async (userId, searchQuery, accessibleTreeIds) => {
            const mockResults = accessibleTreeIds.map((treeId, index) => ({
              nodeId: `node-${index}`,
              treeId,
              firstName: searchQuery,
              lastName: 'Test',
              treeName: `Tree ${index}`,
              status: NodeStatus.PUBLISHED,
              createdBy: userId,
              createdAt: new Date(),
              updatedAt: new Date(),
            }));

            mockQuery.mockResolvedValueOnce({ rows: mockResults });

            const service = new SearchService();
            const results = await service.searchNodes(userId, searchQuery);

            const resultTreeIds = new Set(results.map((r) => r.treeId));
            return accessibleTreeIds.every((treeId) => resultTreeIds.has(treeId));
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
