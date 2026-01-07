import { AccessLevel, NodeStatus } from '../../database/interfaces';

const mockQuery = jest.fn();
const mockNotifyNodePublished = jest.fn();

jest.mock('../../config/database', () => ({
  query: (...args: unknown[]) => mockQuery(...args),
}));

jest.mock('../notification/notification.service', () => ({
  NotificationService: jest.fn().mockImplementation(() => ({
    notifyNodePublished: mockNotifyNodePublished,
  })),
}));

import { NodeService } from './node.service';

describe('NodeService', () => {
  let nodeService: NodeService;

  beforeEach(() => {
    mockQuery.mockReset();
    mockNotifyNodePublished.mockReset();
    mockNotifyNodePublished.mockResolvedValue(undefined);
    nodeService = new NodeService();
  });

  describe('createNode', () => {
    it('should create node with firstName and lastName (Requirements 3.1, 3.2)', async () => {
      const createDto = {
        treeId: 'tree123',
        firstName: 'John',
        lastName: 'Doe',
        userId: 'user123',
      };

      const access = { accessLevel: AccessLevel.EDITOR };
      const node = {
        nodeId: 'node123',
        treeId: createDto.treeId,
        firstName: createDto.firstName,
        lastName: createDto.lastName,
        createdBy: createDto.userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [access] })
        .mockResolvedValueOnce({ rows: [node] });

      const result = await nodeService.createNode(createDto);

      expect(result.firstName).toBe('John');
      expect(result.lastName).toBe('Doe');
      expect(result.nodeId).toBe('node123');
    });

    it('should create node with petName only (Requirements 3.1, 3.2)', async () => {
      const createDto = {
        treeId: 'tree123',
        petName: 'Johnny',
        userId: 'user123',
      };

      const access = { accessLevel: AccessLevel.EDITOR };
      const node = {
        nodeId: 'node123',
        treeId: createDto.treeId,
        petName: createDto.petName,
        createdBy: createDto.userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [access] })
        .mockResolvedValueOnce({ rows: [node] });

      const result = await nodeService.createNode(createDto);

      expect(result.petName).toBe('Johnny');
    });

    it('should create node with all name fields (Requirements 3.2)', async () => {
      const createDto = {
        treeId: 'tree123',
        firstName: 'John',
        lastName: 'Doe',
        petName: 'Johnny',
        userId: 'user123',
      };

      const access = { accessLevel: AccessLevel.EDITOR };
      const node = {
        nodeId: 'node123',
        treeId: createDto.treeId,
        firstName: createDto.firstName,
        lastName: createDto.lastName,
        petName: createDto.petName,
        createdBy: createDto.userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [access] })
        .mockResolvedValueOnce({ rows: [node] });

      const result = await nodeService.createNode(createDto);

      expect(result.firstName).toBe('John');
      expect(result.lastName).toBe('Doe');
      expect(result.petName).toBe('Johnny');
    });

    it('should reject node with only firstName (Requirements 3.1)', async () => {
      const createDto = {
        treeId: 'tree123',
        firstName: 'John',
        userId: 'user123',
      };

      await expect(nodeService.createNode(createDto)).rejects.toThrow(
        'Either firstName and lastName, or petName must be provided'
      );
    });

    it('should reject node with only lastName (Requirements 3.1)', async () => {
      const createDto = {
        treeId: 'tree123',
        lastName: 'Doe',
        userId: 'user123',
      };

      await expect(nodeService.createNode(createDto)).rejects.toThrow(
        'Either firstName and lastName, or petName must be provided'
      );
    });

    it('should reject node with no name fields (Requirements 3.1)', async () => {
      const createDto = {
        treeId: 'tree123',
        userId: 'user123',
      };

      await expect(nodeService.createNode(createDto)).rejects.toThrow(
        'Either firstName and lastName, or petName must be provided'
      );
    });

    it('should reject node with empty string names (Requirements 3.1)', async () => {
      const createDto = {
        treeId: 'tree123',
        firstName: '',
        lastName: '',
        userId: 'user123',
      };

      await expect(nodeService.createNode(createDto)).rejects.toThrow(
        'Either firstName and lastName, or petName must be provided'
      );
    });

    it('should reject node with whitespace-only names (Requirements 3.1)', async () => {
      const createDto = {
        treeId: 'tree123',
        firstName: '   ',
        lastName: '   ',
        userId: 'user123',
      };

      await expect(nodeService.createNode(createDto)).rejects.toThrow(
        'Either firstName and lastName, or petName must be provided'
      );
    });

    it('should require edit access to create node (Requirements 3.3)', async () => {
      const createDto = {
        treeId: 'tree123',
        firstName: 'John',
        lastName: 'Doe',
        userId: 'user123',
      };

      const access = { accessLevel: AccessLevel.VIEWER };
      mockQuery.mockResolvedValueOnce({ rows: [access] });

      await expect(nodeService.createNode(createDto)).rejects.toThrow(
        'Edit access required'
      );
    });

    it('should allow owner to create node (Requirements 3.3)', async () => {
      const createDto = {
        treeId: 'tree123',
        firstName: 'John',
        lastName: 'Doe',
        userId: 'user123',
      };

      const access = { accessLevel: AccessLevel.OWNER };
      const node = {
        nodeId: 'node123',
        treeId: createDto.treeId,
        firstName: createDto.firstName,
        lastName: createDto.lastName,
        createdBy: createDto.userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [access] })
        .mockResolvedValueOnce({ rows: [node] });

      const result = await nodeService.createNode(createDto);

      expect(result.nodeId).toBe('node123');
    });

    it('should store optional fields (Requirements 3.4)', async () => {
      const createDto = {
        treeId: 'tree123',
        firstName: 'John',
        lastName: 'Doe',
        address: '123 Main St',
        placeOfBirth: 'New York',
        contactInfo: { phone: '555-1234' },
        profilePictureUrl: 'https://example.com/photo.jpg',
        dateOfBirth: new Date('1990-01-01'),
        userId: 'user123',
      };

      const access = { accessLevel: AccessLevel.EDITOR };
      const node = {
        nodeId: 'node123',
        ...createDto,
        createdBy: createDto.userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [access] })
        .mockResolvedValueOnce({ rows: [node] });

      const result = await nodeService.createNode(createDto);

      expect(result.address).toBe('123 Main St');
      expect(result.placeOfBirth).toBe('New York');
      expect(result.contactInfo).toEqual({ phone: '555-1234' });
      expect(result.profilePictureUrl).toBe('https://example.com/photo.jpg');
    });
  });

  describe('getNodes', () => {
    it('should return nodes for tree if user has viewer access', async () => {
      const treeId = 'tree123';
      const userId = 'user123';

      const access = { accessLevel: AccessLevel.VIEWER };
      const nodes = [
        { nodeId: 'node1', firstName: 'John', lastName: 'Doe', treeId, createdAt: new Date(), updatedAt: new Date() },
        { nodeId: 'node2', firstName: 'Jane', lastName: 'Doe', treeId, createdAt: new Date(), updatedAt: new Date() },
      ];

      mockQuery
        .mockResolvedValueOnce({ rows: [access] })
        .mockResolvedValueOnce({ rows: nodes });

      const result = await nodeService.getNodes(treeId, userId);

      expect(result.length).toBe(2);
      expect(result[0].nodeId).toBe('node1');
      expect(result[1].nodeId).toBe('node2');
    });

    it('should throw error if user has no access', async () => {
      const treeId = 'tree123';
      const userId = 'user123';

      mockQuery.mockResolvedValueOnce({ rows: [] });

      await expect(nodeService.getNodes(treeId, userId)).rejects.toThrow('Access denied');
    });
  });

  describe('getNodeById', () => {
    it('should return node if user has access', async () => {
      const nodeId = 'node123';
      const userId = 'user123';
      const treeId = 'tree123';

      const node = {
        nodeId,
        treeId,
        firstName: 'John',
        lastName: 'Doe',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const access = { accessLevel: AccessLevel.VIEWER };

      mockQuery
        .mockResolvedValueOnce({ rows: [node] })
        .mockResolvedValueOnce({ rows: [access] });

      const result = await nodeService.getNodeById(nodeId, userId);

      expect(result.nodeId).toBe(nodeId);
      expect(result.firstName).toBe('John');
    });

    it('should throw error if node not found', async () => {
      const nodeId = 'nonexistent';
      const userId = 'user123';

      mockQuery.mockResolvedValueOnce({ rows: [] });

      await expect(nodeService.getNodeById(nodeId, userId)).rejects.toThrow('Node not found');
    });

    it('should throw error if user has no access to tree', async () => {
      const nodeId = 'node123';
      const userId = 'user123';

      const node = { nodeId, treeId: 'tree123' };

      mockQuery
        .mockResolvedValueOnce({ rows: [node] })
        .mockResolvedValueOnce({ rows: [] });

      await expect(nodeService.getNodeById(nodeId, userId)).rejects.toThrow('Access denied');
    });
  });

  describe('updateNode', () => {
    it('should update node if user has edit access (Requirements 3.3)', async () => {
      const nodeId = 'node123';
      const userId = 'user123';
      const updateDto = { firstName: 'Jane' };

      const node = { nodeId, treeId: 'tree123', firstName: 'John', lastName: 'Doe' };
      const access = { accessLevel: AccessLevel.EDITOR };
      const updatedNode = { ...node, ...updateDto, updatedAt: new Date() };

      mockQuery
        .mockResolvedValueOnce({ rows: [node] })
        .mockResolvedValueOnce({ rows: [access] })
        .mockResolvedValueOnce({ rows: [updatedNode] });

      const result = await nodeService.updateNode(nodeId, userId, updateDto);

      expect(result.firstName).toBe('Jane');
    });

    it('should update node if user has owner access (Requirements 3.3)', async () => {
      const nodeId = 'node123';
      const userId = 'user123';
      const updateDto = { lastName: 'Smith' };

      const node = { nodeId, treeId: 'tree123', firstName: 'John', lastName: 'Doe' };
      const access = { accessLevel: AccessLevel.OWNER };
      const updatedNode = { ...node, ...updateDto, updatedAt: new Date() };

      mockQuery
        .mockResolvedValueOnce({ rows: [node] })
        .mockResolvedValueOnce({ rows: [access] })
        .mockResolvedValueOnce({ rows: [updatedNode] });

      const result = await nodeService.updateNode(nodeId, userId, updateDto);

      expect(result.lastName).toBe('Smith');
    });

    it('should reject update if user has only viewer access (Requirements 3.3)', async () => {
      const nodeId = 'node123';
      const userId = 'user123';
      const updateDto = { firstName: 'Jane' };

      const node = { nodeId, treeId: 'tree123' };
      const access = { accessLevel: AccessLevel.VIEWER };

      mockQuery
        .mockResolvedValueOnce({ rows: [node] })
        .mockResolvedValueOnce({ rows: [access] });

      await expect(nodeService.updateNode(nodeId, userId, updateDto)).rejects.toThrow(
        'Edit access required'
      );
    });

    it('should throw error if node not found', async () => {
      const nodeId = 'nonexistent';
      const userId = 'user123';
      const updateDto = { firstName: 'Jane' };

      mockQuery.mockResolvedValueOnce({ rows: [] });

      await expect(nodeService.updateNode(nodeId, userId, updateDto)).rejects.toThrow(
        'Node not found'
      );
    });

    it('should return unchanged node if no updates provided', async () => {
      const nodeId = 'node123';
      const userId = 'user123';
      const updateDto = {};

      const node = { nodeId, treeId: 'tree123', firstName: 'John', lastName: 'Doe' };
      const access = { accessLevel: AccessLevel.EDITOR };

      mockQuery
        .mockResolvedValueOnce({ rows: [node] })
        .mockResolvedValueOnce({ rows: [access] })
        .mockResolvedValueOnce({ rows: [node] })
        .mockResolvedValueOnce({ rows: [access] });

      const result = await nodeService.updateNode(nodeId, userId, updateDto);

      expect(result.firstName).toBe('John');
    });
  });

  describe('deleteNode', () => {
    it('should delete node if user has edit access (Requirements 3.4)', async () => {
      const nodeId = 'node123';
      const userId = 'user123';

      const node = { nodeId, treeId: 'tree123' };
      const access = { accessLevel: AccessLevel.EDITOR };

      mockQuery
        .mockResolvedValueOnce({ rows: [node] })
        .mockResolvedValueOnce({ rows: [access] })
        .mockResolvedValueOnce({ rowCount: 1 });

      await nodeService.deleteNode(nodeId, userId);

      expect(mockQuery).toHaveBeenCalledTimes(3);
      expect(mockQuery).toHaveBeenLastCalledWith('DELETE FROM nodes WHERE node_id = $1', [nodeId]);
    });

    it('should delete node if user has owner access (Requirements 3.4)', async () => {
      const nodeId = 'node123';
      const userId = 'user123';

      const node = { nodeId, treeId: 'tree123' };
      const access = { accessLevel: AccessLevel.OWNER };

      mockQuery
        .mockResolvedValueOnce({ rows: [node] })
        .mockResolvedValueOnce({ rows: [access] })
        .mockResolvedValueOnce({ rowCount: 1 });

      await nodeService.deleteNode(nodeId, userId);

      expect(mockQuery).toHaveBeenCalledTimes(3);
    });

    it('should reject delete if user has only viewer access (Requirements 3.4)', async () => {
      const nodeId = 'node123';
      const userId = 'user123';

      const node = { nodeId, treeId: 'tree123' };
      const access = { accessLevel: AccessLevel.VIEWER };

      mockQuery
        .mockResolvedValueOnce({ rows: [node] })
        .mockResolvedValueOnce({ rows: [access] });

      await expect(nodeService.deleteNode(nodeId, userId)).rejects.toThrow(
        'Edit access required'
      );
    });

    it('should throw error if node not found', async () => {
      const nodeId = 'nonexistent';
      const userId = 'user123';

      mockQuery.mockResolvedValueOnce({ rows: [] });

      await expect(nodeService.deleteNode(nodeId, userId)).rejects.toThrow('Node not found');
    });
  });

  describe('getDisplayName', () => {
    it('should return petName when available (Requirements 3.5)', () => {
      const node = {
        nodeId: 'node123',
        treeId: 'tree123',
        firstName: 'John',
        lastName: 'Doe',
        petName: 'Johnny',
        status: NodeStatus.PUBLISHED,
        createdBy: 'user123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const displayName = nodeService.getDisplayName(node);

      expect(displayName).toBe('Johnny');
    });

    it('should return firstName + lastName when petName not available (Requirements 3.5)', () => {
      const node = {
        nodeId: 'node123',
        treeId: 'tree123',
        firstName: 'John',
        lastName: 'Doe',
        status: NodeStatus.PUBLISHED,
        createdBy: 'user123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const displayName = nodeService.getDisplayName(node);

      expect(displayName).toBe('John Doe');
    });
  });

  describe('createNode - draft status', () => {
    it('should create node in draft status by default (Requirements 3.6)', async () => {
      const createDto = {
        treeId: 'tree123',
        firstName: 'John',
        lastName: 'Doe',
        userId: 'user123',
      };

      const access = { accessLevel: AccessLevel.EDITOR };
      const node = {
        nodeId: 'node123',
        treeId: createDto.treeId,
        firstName: createDto.firstName,
        lastName: createDto.lastName,
        status: NodeStatus.DRAFT,
        createdBy: createDto.userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [access] })
        .mockResolvedValueOnce({ rows: [node] });

      const result = await nodeService.createNode(createDto);

      expect(result.status).toBe(NodeStatus.DRAFT);
      expect(mockQuery.mock.calls[1][1]).toContain(NodeStatus.DRAFT);
    });
  });

  describe('getNodes - draft visibility', () => {
    it('should only show draft nodes created by the requesting user (Requirements 3.7)', async () => {
      const treeId = 'tree123';
      const userId = 'user123';

      const access = { accessLevel: AccessLevel.VIEWER };
      const nodes = [
        { nodeId: 'node1', firstName: 'John', lastName: 'Doe', treeId, status: NodeStatus.PUBLISHED, createdBy: 'otherUser', createdAt: new Date(), updatedAt: new Date() },
        { nodeId: 'node2', firstName: 'Jane', lastName: 'Doe', treeId, status: NodeStatus.DRAFT, createdBy: userId, createdAt: new Date(), updatedAt: new Date() },
      ];

      mockQuery
        .mockResolvedValueOnce({ rows: [access] })
        .mockResolvedValueOnce({ rows: nodes });

      const result = await nodeService.getNodes(treeId, userId);

      expect(result.length).toBe(2);
      const sqlQuery = mockQuery.mock.calls[1][0];
      expect(sqlQuery).toContain("status = 'published' OR created_by = $2");
    });
  });

  describe('getNodeById - draft visibility', () => {
    it('should return draft node if user is the creator (Requirements 3.7)', async () => {
      const nodeId = 'node123';
      const userId = 'user123';
      const treeId = 'tree123';

      const node = {
        nodeId,
        treeId,
        firstName: 'John',
        lastName: 'Doe',
        status: NodeStatus.DRAFT,
        createdBy: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const access = { accessLevel: AccessLevel.VIEWER };

      mockQuery
        .mockResolvedValueOnce({ rows: [node] })
        .mockResolvedValueOnce({ rows: [access] });

      const result = await nodeService.getNodeById(nodeId, userId);

      expect(result.nodeId).toBe(nodeId);
      expect(result.status).toBe(NodeStatus.DRAFT);
    });

    it('should throw not found for draft node if user is not the creator (Requirements 3.7)', async () => {
      const nodeId = 'node123';
      const userId = 'user123';
      const treeId = 'tree123';

      const node = {
        nodeId,
        treeId,
        firstName: 'John',
        lastName: 'Doe',
        status: NodeStatus.DRAFT,
        createdBy: 'otherUser',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const access = { accessLevel: AccessLevel.VIEWER };

      mockQuery
        .mockResolvedValueOnce({ rows: [node] })
        .mockResolvedValueOnce({ rows: [access] });

      await expect(nodeService.getNodeById(nodeId, userId)).rejects.toThrow('Node not found');
    });
  });

  describe('publishNode', () => {
    it('should publish first node in tree without relationship (Requirements 3.9)', async () => {
      const nodeId = 'node123';
      const userId = 'user123';
      const treeId = 'tree123';

      const draftNode = {
        nodeId,
        treeId,
        firstName: 'John',
        lastName: 'Doe',
        status: NodeStatus.DRAFT,
        createdBy: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const publishedNode = { ...draftNode, status: NodeStatus.PUBLISHED, publishedAt: new Date() };
      const access = { accessLevel: AccessLevel.EDITOR };

      mockQuery
        .mockResolvedValueOnce({ rows: [draftNode] })
        .mockResolvedValueOnce({ rows: [access] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }] })
        .mockResolvedValueOnce({ rows: [publishedNode] });

      const result = await nodeService.publishNode(nodeId, userId);

      expect(result.status).toBe(NodeStatus.PUBLISHED);
    });

    it('should require relationship to published node for non-first nodes (Requirements 3.8)', async () => {
      const nodeId = 'node123';
      const userId = 'user123';
      const treeId = 'tree123';

      const draftNode = {
        nodeId,
        treeId,
        firstName: 'John',
        lastName: 'Doe',
        status: NodeStatus.DRAFT,
        createdBy: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const access = { accessLevel: AccessLevel.EDITOR };

      mockQuery
        .mockResolvedValueOnce({ rows: [draftNode] })
        .mockResolvedValueOnce({ rows: [access] })
        .mockResolvedValueOnce({ rows: [{ count: '1' }] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }] });

      await expect(nodeService.publishNode(nodeId, userId)).rejects.toThrow(
        'Node must have a relationship to a published node before publishing'
      );
    });

    it('should publish node with relationship to published node (Requirements 3.8, 3.10)', async () => {
      const nodeId = 'node123';
      const userId = 'user123';
      const treeId = 'tree123';

      const draftNode = {
        nodeId,
        treeId,
        firstName: 'John',
        lastName: 'Doe',
        status: NodeStatus.DRAFT,
        createdBy: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const publishedNode = { ...draftNode, status: NodeStatus.PUBLISHED, publishedAt: new Date() };
      const access = { accessLevel: AccessLevel.EDITOR };

      mockQuery
        .mockResolvedValueOnce({ rows: [draftNode] })
        .mockResolvedValueOnce({ rows: [access] })
        .mockResolvedValueOnce({ rows: [{ count: '1' }] })
        .mockResolvedValueOnce({ rows: [{ count: '1' }] })
        .mockResolvedValueOnce({ rows: [publishedNode] });

      const result = await nodeService.publishNode(nodeId, userId);

      expect(result.status).toBe(NodeStatus.PUBLISHED);
    });

    it('should return already published node without changes', async () => {
      const nodeId = 'node123';
      const userId = 'user123';
      const treeId = 'tree123';

      const publishedNode = {
        nodeId,
        treeId,
        firstName: 'John',
        lastName: 'Doe',
        status: NodeStatus.PUBLISHED,
        createdBy: userId,
        publishedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const access = { accessLevel: AccessLevel.EDITOR };

      mockQuery
        .mockResolvedValueOnce({ rows: [publishedNode] })
        .mockResolvedValueOnce({ rows: [access] });

      const result = await nodeService.publishNode(nodeId, userId);

      expect(result.status).toBe(NodeStatus.PUBLISHED);
      expect(mockQuery).toHaveBeenCalledTimes(2);
    });

    it('should throw not found for draft node if user is not the creator', async () => {
      const nodeId = 'node123';
      const userId = 'user123';
      const treeId = 'tree123';

      const draftNode = {
        nodeId,
        treeId,
        firstName: 'John',
        lastName: 'Doe',
        status: NodeStatus.DRAFT,
        createdBy: 'otherUser',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const access = { accessLevel: AccessLevel.EDITOR };

      mockQuery
        .mockResolvedValueOnce({ rows: [draftNode] })
        .mockResolvedValueOnce({ rows: [access] });

      await expect(nodeService.publishNode(nodeId, userId)).rejects.toThrow('Node not found');
    });

    it('should require edit access to publish node', async () => {
      const nodeId = 'node123';
      const userId = 'user123';
      const treeId = 'tree123';

      const draftNode = {
        nodeId,
        treeId,
        firstName: 'John',
        lastName: 'Doe',
        status: NodeStatus.DRAFT,
        createdBy: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const access = { accessLevel: AccessLevel.VIEWER };

      mockQuery
        .mockResolvedValueOnce({ rows: [draftNode] })
        .mockResolvedValueOnce({ rows: [access] });

      await expect(nodeService.publishNode(nodeId, userId)).rejects.toThrow('Edit access required');
    });
  });
});
