import request from 'supertest';
import jwt from 'jsonwebtoken';

const mockQuery = jest.fn();
const mockTransaction = jest.fn();
const mockClosePool = jest.fn();

jest.mock('../config/database', () => ({
  pool: { query: () => mockQuery() },
  query: (...args: unknown[]) => mockQuery(...args),
  transaction: (fn: (client: unknown) => Promise<unknown>) => mockTransaction(fn),
  closePool: () => mockClosePool(),
  initializeDatabase: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../config/redis', () => ({
  connectRedis: jest.fn().mockResolvedValue(undefined),
  getRedisClient: jest.fn().mockReturnValue(null),
}));

import app from '../app';

describe('API Integration Tests', () => {
  const userId = '11111111-1111-1111-1111-111111111111';
  const treeId = '22222222-2222-2222-2222-222222222222';
  const nodeId = '33333333-3333-3333-3333-333333333333';
  let accessToken: string;

  beforeAll(() => {
    accessToken = jwt.sign(
      { userId },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '1h' }
    );
  });

  beforeEach(() => {
    mockQuery.mockReset();
    mockTransaction.mockReset();
  });

  describe('Authentication Middleware', () => {
    it('should reject requests without token', async () => {
      const response = await request(app).get('/api/v1/trees');
      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('NO_TOKEN');
    });

    it('should reject requests with invalid token', async () => {
      const response = await request(app)
        .get('/api/v1/trees')
        .set('Authorization', 'Bearer invalid-token');
      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('INVALID_TOKEN');
    });
  });

  describe('Validation Middleware', () => {
    it('should reject invalid UUID parameters', async () => {
      const response = await request(app)
        .get('/api/v1/trees/invalid-uuid')
        .set('Authorization', `Bearer ${accessToken}`);
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject missing required body fields', async () => {
      const response = await request(app)
        .post('/api/v1/trees')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({});
      expect(response.status).toBe(400);
      expect(response.body.error.message).toContain('treeName is required');
    });

    it('should reject invalid email format on signup', async () => {
      const response = await request(app)
        .post('/api/v1/auth/signup')
        .send({
          email: 'invalid-email',
          password: 'ValidPass1!',
          displayName: 'Test User',
        });
      expect(response.status).toBe(400);
      expect(response.body.error.message).toContain('email');
    });
  });

  describe('Tree Endpoints', () => {
    const tree1Id = '22222222-2222-2222-2222-222222222221';
    const tree2Id = '22222222-2222-2222-2222-222222222222';
    
    describe('GET /api/v1/trees', () => {
      it('should return user trees', async () => {
        mockQuery.mockResolvedValueOnce({
          rows: [
            { treeId: tree1Id, treeName: 'Family Tree 1', accessLevel: 'owner' },
            { treeId: tree2Id, treeName: 'Family Tree 2', accessLevel: 'editor' },
          ],
        });

        const response = await request(app)
          .get('/api/v1/trees')
          .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveLength(2);
      });
    });

    describe('POST /api/v1/trees', () => {
      it('should create a new tree', async () => {
        mockTransaction.mockImplementation(async (fn) => {
          const mockClient = {
            query: jest.fn()
              .mockResolvedValueOnce({ rows: [{ treeId, treeName: 'New Tree', ownerUserId: userId }] })
              .mockResolvedValueOnce({ rows: [] }),
          };
          return fn(mockClient);
        });

        const response = await request(app)
          .post('/api/v1/trees')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ treeName: 'New Tree' });

        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('treeId');
      });
    });

    describe('GET /api/v1/trees/:treeId', () => {
      it('should return tree by ID with access', async () => {
        mockQuery
          .mockResolvedValueOnce({ rows: [{ accessLevel: 'owner' }] })
          .mockResolvedValueOnce({ rows: [{ treeId, treeName: 'My Tree' }] });

        const response = await request(app)
          .get(`/api/v1/trees/${treeId}`)
          .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('treeId', treeId);
      });

      it('should return 403 without access', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [] });

        const response = await request(app)
          .get(`/api/v1/trees/${treeId}`)
          .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toBe(403);
      });
    });

    describe('DELETE /api/v1/trees/:treeId', () => {
      it('should delete tree as owner', async () => {
        mockQuery
          .mockResolvedValueOnce({ rows: [{ accessLevel: 'owner' }] })
          .mockResolvedValueOnce({ rowCount: 1 });

        const response = await request(app)
          .delete(`/api/v1/trees/${treeId}`)
          .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toBe(204);
      });

      it('should return 403 for non-owner', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [{ accessLevel: 'editor' }] });

        const response = await request(app)
          .delete(`/api/v1/trees/${treeId}`)
          .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toBe(403);
      });
    });
  });

  describe('Node Endpoints', () => {
    describe('POST /api/v1/trees/:treeId/nodes', () => {
      it('should create node with valid name', async () => {
        mockQuery
          .mockResolvedValueOnce({ rows: [{ accessLevel: 'editor' }] })
          .mockResolvedValueOnce({
            rows: [{
              nodeId,
              treeId,
              firstName: 'John',
              lastName: 'Doe',
              status: 'draft',
            }],
          });

        const response = await request(app)
          .post(`/api/v1/trees/${treeId}/nodes`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ firstName: 'John', lastName: 'Doe' });

        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('nodeId');
      });

      it('should return 403 for viewer', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [{ accessLevel: 'viewer' }] });

        const response = await request(app)
          .post(`/api/v1/trees/${treeId}/nodes`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ firstName: 'John', lastName: 'Doe' });

        expect(response.status).toBe(403);
      });
    });

    describe('GET /api/v1/trees/:treeId/nodes', () => {
      it('should return nodes for tree', async () => {
        mockQuery
          .mockResolvedValueOnce({ rows: [{ accessLevel: 'viewer' }] })
          .mockResolvedValueOnce({
            rows: [
              { nodeId: '44444444-4444-4444-4444-444444444444', firstName: 'John', lastName: 'Doe', status: 'published' },
              { nodeId: '55555555-5555-5555-5555-555555555555', petName: 'Grandma', status: 'published' },
            ],
          });

        const response = await request(app)
          .get(`/api/v1/trees/${treeId}/nodes`)
          .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveLength(2);
      });
    });

    describe('POST /api/v1/trees/:treeId/nodes/:nodeId/publish', () => {
      it('should publish node', async () => {
        mockQuery
          .mockResolvedValueOnce({ rows: [{ nodeId, treeId, status: 'draft', createdBy: userId, firstName: 'John', lastName: 'Doe' }] })
          .mockResolvedValueOnce({ rows: [{ accessLevel: 'editor' }] })
          .mockResolvedValueOnce({ rows: [{ count: '0' }] })
          .mockResolvedValueOnce({
            rows: [{ nodeId, status: 'published', publishedAt: new Date(), firstName: 'John', lastName: 'Doe' }],
          })
          .mockResolvedValueOnce({ rows: [] });

        const response = await request(app)
          .post(`/api/v1/trees/${treeId}/nodes/${nodeId}/publish`)
          .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toBe(200);
        expect(response.body.status).toBe('published');
      });
    });
  });

  describe('Relationship Endpoints', () => {
    const node1Id = '44444444-4444-4444-4444-444444444444';
    const node2Id = '55555555-5555-5555-5555-555555555555';
    
    describe('POST /api/v1/trees/:treeId/relationships', () => {
      it('should create relationship with valid data', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [{ accessLevel: 'editor' }] });
        
        mockTransaction.mockImplementation(async (fn) => {
          const mockClient = {
            query: jest.fn()
              .mockResolvedValueOnce({ rows: [] })
              .mockResolvedValueOnce({
                rows: [{
                  relationshipId: '66666666-6666-6666-6666-666666666666',
                  treeId,
                  nodeId1: node1Id,
                  nodeId2: node2Id,
                  relationshipType: 'parent_child',
                }],
              }),
          };
          return fn(mockClient);
        });

        mockQuery
          .mockResolvedValueOnce({
            rows: [
              { nodeId: node1Id, treeId, status: 'published', createdBy: userId },
              { nodeId: node2Id, treeId, status: 'published', createdBy: userId },
            ],
          })
          .mockResolvedValueOnce({ rows: [{ count: '1' }] });

        const response = await request(app)
          .post(`/api/v1/trees/${treeId}/relationships`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            nodeId1: node1Id,
            nodeId2: node2Id,
            relationshipType: 'parent_child',
          });

        expect([200, 201]).toContain(response.status);
      });

      it('should reject invalid relationship type', async () => {
        const response = await request(app)
          .post(`/api/v1/trees/${treeId}/relationships`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            nodeId1: node1Id,
            nodeId2: node2Id,
            relationshipType: 'invalid_type',
          });

        expect(response.status).toBe(400);
        expect(response.body.error.message).toContain('relationshipType');
      });
    });

    describe('GET /api/v1/trees/:treeId/relationships', () => {
      it('should return relationships for tree', async () => {
        mockQuery
          .mockResolvedValueOnce({ rows: [{ accessLevel: 'viewer' }] })
          .mockResolvedValueOnce({
            rows: [
              { relationshipId: '66666666-6666-6666-6666-666666666666', nodeId1: node1Id, nodeId2: node2Id, relationshipType: 'parent_child' },
            ],
          });

        const response = await request(app)
          .get(`/api/v1/trees/${treeId}/relationships`)
          .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveLength(1);
      });
    });
  });

  describe('Timeline Event Endpoints', () => {
    const eventId = '77777777-7777-7777-7777-777777777777';
    
    describe('POST /api/v1/trees/:treeId/events', () => {
      it('should create timeline event', async () => {
        mockQuery
          .mockResolvedValueOnce({ rows: [{ accessLevel: 'editor' }] })
          .mockResolvedValueOnce({
            rows: [{
              eventId,
              treeId,
              eventType: 'birth',
              title: 'Birth of John',
              eventDate: '1990-01-01',
            }],
          })
          .mockResolvedValueOnce({ rows: [] });

        const response = await request(app)
          .post(`/api/v1/trees/${treeId}/events`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            eventType: 'birth',
            title: 'Birth of John',
            eventDate: '1990-01-01',
          });

        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('eventId');
      });

      it('should reject invalid event type', async () => {
        const response = await request(app)
          .post(`/api/v1/trees/${treeId}/events`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            eventType: 'invalid_type',
            title: 'Some Event',
            eventDate: '1990-01-01',
          });

        expect(response.status).toBe(400);
      });
    });

    describe('GET /api/v1/trees/:treeId/events', () => {
      it('should return events ordered chronologically', async () => {
        mockQuery
          .mockResolvedValueOnce({ rows: [{ accessLevel: 'viewer' }] })
          .mockResolvedValueOnce({
            rows: [
              { eventId: '77777777-7777-7777-7777-777777777771', eventDate: '1990-01-01', title: 'Birth' },
              { eventId: '77777777-7777-7777-7777-777777777772', eventDate: '2010-06-15', title: 'Marriage' },
            ],
          });

        const response = await request(app)
          .get(`/api/v1/trees/${treeId}/events`)
          .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveLength(2);
      });
    });
  });

  describe('Comment Endpoints', () => {
    const commentId = '88888888-8888-8888-8888-888888888888';
    
    describe('POST /api/v1/comments', () => {
      it('should create comment', async () => {
        mockQuery
          .mockResolvedValueOnce({ rows: [{ accessLevel: 'viewer' }] })
          .mockResolvedValueOnce({
            rows: [{
              commentId,
              treeId,
              entityType: 'node',
              entityId: nodeId,
              commentText: 'Great photo!',
            }],
          })
          .mockResolvedValueOnce({ rows: [] });

        const response = await request(app)
          .post('/api/v1/comments')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            treeId,
            entityType: 'node',
            entityId: nodeId,
            commentText: 'Great photo!',
          });

        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('commentId');
      });

      it('should reject invalid entity type', async () => {
        const response = await request(app)
          .post('/api/v1/comments')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            treeId,
            entityType: 'invalid',
            entityId: nodeId,
            commentText: 'Test',
          });

        expect(response.status).toBe(400);
      });
    });

    describe('GET /api/v1/comments', () => {
      it('should return comments for entity', async () => {
        mockQuery
          .mockResolvedValueOnce({ rows: [{ accessLevel: 'viewer' }] })
          .mockResolvedValueOnce({
            rows: [
              { commentId: '88888888-8888-8888-8888-888888888881', commentText: 'First comment' },
              { commentId: '88888888-8888-8888-8888-888888888882', commentText: 'Second comment' },
            ],
          });

        const response = await request(app)
          .get('/api/v1/comments')
          .query({ treeId, entityType: 'node', entityId: nodeId })
          .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveLength(2);
      });

      it('should reject missing query parameters', async () => {
        const response = await request(app)
          .get('/api/v1/comments')
          .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toBe(400);
      });
    });

    describe('DELETE /api/v1/comments/:commentId', () => {
      it('should delete own comment', async () => {
        mockQuery
          .mockResolvedValueOnce({ rows: [{ commentId, userId }] })
          .mockResolvedValueOnce({ rowCount: 1 });

        const response = await request(app)
          .delete(`/api/v1/comments/${commentId}`)
          .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toBe(204);
      });

      it('should reject deleting other user comment', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [{ commentId, userId: '99999999-9999-9999-9999-999999999999' }] });

        const response = await request(app)
          .delete(`/api/v1/comments/${commentId}`)
          .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toBe(403);
      });
    });
  });

  describe('Search Endpoint', () => {
    describe('GET /api/v1/search', () => {
      it('should search nodes across accessible trees', async () => {
        mockQuery.mockResolvedValueOnce({
          rows: [
            { nodeId: '44444444-4444-4444-4444-444444444444', firstName: 'John', lastName: 'Doe', treeName: 'Family Tree' },
          ],
        });

        const response = await request(app)
          .get('/api/v1/search')
          .query({ q: 'John' })
          .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveLength(1);
      });

      it('should reject search query shorter than 2 characters', async () => {
        const response = await request(app)
          .get('/api/v1/search')
          .query({ q: 'J' })
          .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toBe(400);
      });
    });
  });

  describe('Notification Endpoints', () => {
    const notificationId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    
    describe('GET /api/v1/notifications', () => {
      it('should return user notifications', async () => {
        mockQuery.mockResolvedValueOnce({
          rows: [
            { notificationId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', message: 'Access granted', isRead: false },
            { notificationId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', message: 'New comment', isRead: true },
          ],
        });

        const response = await request(app)
          .get('/api/v1/notifications')
          .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveLength(2);
      });

      it('should filter unread notifications', async () => {
        mockQuery.mockResolvedValueOnce({
          rows: [{ notificationId, message: 'Access granted', isRead: false }],
        });

        const response = await request(app)
          .get('/api/v1/notifications')
          .query({ unreadOnly: 'true' })
          .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toBe(200);
      });
    });

    describe('PUT /api/v1/notifications/:notificationId/read', () => {
      it('should mark notification as read', async () => {
        mockQuery.mockResolvedValueOnce({ rowCount: 1 });

        const response = await request(app)
          .put(`/api/v1/notifications/${notificationId}/read`)
          .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toBe(204);
      });
    });
  });

  describe('Album Endpoints', () => {
    const albumId = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
    
    describe('POST /api/v1/trees/:treeId/albums', () => {
      it('should link album with edit access', async () => {
        mockQuery
          .mockResolvedValueOnce({ rows: [{ accessLevel: 'editor' }] })
          .mockResolvedValueOnce({
            rows: [{
              albumId,
              treeId,
              albumSource: 'google_photos',
              albumName: 'Family Photos',
            }],
          });

        const response = await request(app)
          .post(`/api/v1/trees/${treeId}/albums`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            albumSource: 'google_photos',
            albumIdentifier: 'album-id-123',
            albumName: 'Family Photos',
          });

        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('albumId');
      });

      it('should reject invalid album source', async () => {
        const response = await request(app)
          .post(`/api/v1/trees/${treeId}/albums`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            albumSource: 'invalid_source',
            albumIdentifier: 'album-id-123',
            albumName: 'Family Photos',
          });

        expect(response.status).toBe(400);
      });
    });
  });

  describe('Access Request Endpoints', () => {
    const requestId = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
    const ownerId = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
    
    describe('POST /api/v1/access-requests', () => {
      it('should submit access request', async () => {
        mockQuery
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({
            rows: [{
              requestId,
              treeId,
              userId,
              requestedLevel: 'editor',
              status: 'pending',
            }],
          })
          .mockResolvedValueOnce({ rows: [{ ownerUserId: ownerId }] })
          .mockResolvedValueOnce({ rows: [] });

        const response = await request(app)
          .post('/api/v1/access-requests')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            treeId,
            requestedLevel: 'editor',
          });

        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('requestId');
      });

      it('should reject invalid requested level', async () => {
        const response = await request(app)
          .post('/api/v1/access-requests')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            treeId,
            requestedLevel: 'owner',
          });

        expect(response.status).toBe(400);
      });
    });

    describe('GET /api/v1/trees/:treeId/access-requests', () => {
      it('should return access requests for owner', async () => {
        mockQuery
          .mockResolvedValueOnce({ rows: [{ accessLevel: 'owner' }] })
          .mockResolvedValueOnce({
            rows: [
              { requestId, userId: '99999999-9999-9999-9999-999999999999', requestedLevel: 'editor', status: 'pending' },
            ],
          });

        const response = await request(app)
          .get(`/api/v1/trees/${treeId}/access-requests`)
          .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toBe(200);
      });

      it('should reject for non-owner', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [{ accessLevel: 'editor' }] });

        const response = await request(app)
          .get(`/api/v1/trees/${treeId}/access-requests`)
          .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toBe(403);
      });
    });
  });

  describe('Same Person Link Endpoints', () => {
    const node1Id = '44444444-4444-4444-4444-444444444444';
    const node2Id = '55555555-5555-5555-5555-555555555555';
    const tree1Id = '22222222-2222-2222-2222-222222222222';
    const tree2Id = 'ffffffff-ffff-ffff-ffff-ffffffffffff';
    const linkId = '66666666-6666-6666-6666-666666666666';
    
    describe('POST /api/v1/same-person-links', () => {
      it('should create same person link', async () => {
        mockQuery
          .mockResolvedValueOnce({
            rows: [
              { nodeId: node1Id, treeId: tree1Id },
              { nodeId: node2Id, treeId: tree2Id },
            ],
          })
          .mockResolvedValueOnce({ rows: [{ accessLevel: 'editor' }] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({
            rows: [{
              linkId,
              nodeId1: node1Id,
              nodeId2: node2Id,
            }],
          })
          .mockResolvedValueOnce({ rows: [] });

        const response = await request(app)
          .post('/api/v1/same-person-links')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            nodeId1: node1Id,
            nodeId2: node2Id,
          });

        expect([200, 201]).toContain(response.status);
      });
    });

    describe('GET /api/v1/nodes/:nodeId/linked-nodes', () => {
      it('should return linked nodes', async () => {
        mockQuery
          .mockResolvedValueOnce({ rows: [{ treeId }] })
          .mockResolvedValueOnce({ rows: [{ accessLevel: 'viewer' }] })
          .mockResolvedValueOnce({
            rows: [{ nodeId: node2Id, treeId: tree2Id }],
          });

        const response = await request(app)
          .get(`/api/v1/nodes/${nodeId}/linked-nodes`)
          .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toBe(200);
      });
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent routes', async () => {
      const response = await request(app)
        .get('/api/v1/nonexistent')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(404);
    });

    it('should handle server errors gracefully', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database connection failed'));

      const response = await request(app)
        .get('/api/v1/trees')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });
  });
});
