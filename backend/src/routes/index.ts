import { Router } from 'express';
import { 
  authMiddleware, 
  validateBody, 
  validateParams, 
  validateQuery,
  uuidSchema,
  generalRateLimiter,
  authRateLimiter,
  searchRateLimiter
} from '../common/middleware';
import { AuthService } from '../modules/auth/auth.service';
import { AuthController } from '../modules/auth/auth.controller';
import { TreeService } from '../modules/tree/tree.service';
import { TreeController } from '../modules/tree/tree.controller';
import { NodeService } from '../modules/node/node.service';
import { NodeController } from '../modules/node/node.controller';
import { RelationshipService } from '../modules/relationship/relationship.service';
import { RelationshipController } from '../modules/relationship/relationship.controller';
import { TimelineService } from '../modules/timeline/timeline.service';
import { TimelineController } from '../modules/timeline/timeline.controller';
import { SamePersonLinkService } from '../modules/same-person-link/same-person-link.service';
import { SamePersonLinkController } from '../modules/same-person-link/same-person-link.controller';
import { CommentService } from '../modules/comment/comment.service';
import { CommentController } from '../modules/comment/comment.controller';
import { SearchService } from '../modules/search/search.service';
import { SearchController } from '../modules/search/search.controller';
import { NotificationService } from '../modules/notification/notification.service';
import { NotificationController } from '../modules/notification/notification.controller';
import { AlbumService } from '../modules/album/album.service';
import { AlbumController } from '../modules/album/album.controller';
import { AccessRequestService } from '../modules/access-request/access-request.service';
import { AccessRequestController } from '../modules/access-request/access-request.controller';
import { RelationshipType, EventType, EntityType, AlbumSource } from '../database/interfaces';

const router = Router();

router.use(generalRateLimiter);

const authService = new AuthService();
const authController = new AuthController(authService);
const treeService = new TreeService();
const treeController = new TreeController(treeService);
const nodeService = new NodeService();
const nodeController = new NodeController(nodeService);
const relationshipService = new RelationshipService();
const relationshipController = new RelationshipController(relationshipService);
const timelineService = new TimelineService();
const timelineController = new TimelineController(timelineService);
const samePersonLinkService = new SamePersonLinkService();
const samePersonLinkController = new SamePersonLinkController(samePersonLinkService);
const commentService = new CommentService();
const commentController = new CommentController(commentService);
const searchService = new SearchService();
const searchController = new SearchController(searchService);
const notificationService = new NotificationService();
const notificationController = new NotificationController(notificationService);
const albumService = new AlbumService();
const albumController = new AlbumController(albumService);
const accessRequestService = new AccessRequestService();
const accessRequestController = new AccessRequestController(accessRequestService);

router.post('/auth/signup', 
  authRateLimiter,
  validateBody({
    email: { required: true, type: 'string', pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
    password: { required: true, type: 'string' },
    displayName: { required: true, type: 'string', minLength: 1, maxLength: 255 },
  }),
  (req, res) => authController.signup(req, res)
);
router.post('/auth/login', 
  authRateLimiter,
  validateBody({
    email: { required: true, type: 'string' },
    password: { required: true, type: 'string' },
  }),
  (req, res) => authController.login(req, res)
);
router.post('/auth/refresh', 
  validateBody({ refreshToken: { required: true, type: 'string' } }),
  (req, res) => authController.refresh(req, res)
);
router.get('/auth/profile', authMiddleware, (req, res) => authController.getProfile(req, res));
router.put('/auth/profile', authMiddleware, (req, res) => authController.updateProfile(req, res));
router.get('/auth/google', (req, res) => authController.googleAuth(req, res));
router.get('/auth/google/callback', (req, res) => authController.googleCallback(req, res));
router.post('/auth/google/mobile', 
  authRateLimiter,
  validateBody({ idToken: { required: true, type: 'string' } }),
  (req, res) => authController.googleMobileAuth(req, res)
);
router.post('/auth/apple', (req, res) => authController.appleAuth(req, res));

router.get('/trees', authMiddleware, (req, res, next) => treeController.getUserTrees(req, res, next));
router.post('/trees', 
  authMiddleware, 
  validateBody({ treeName: { required: true, type: 'string', minLength: 1, maxLength: 255 } }),
  (req, res, next) => treeController.create(req, res, next)
);
router.get('/trees/:treeId', 
  authMiddleware, 
  validateParams({ treeId: uuidSchema }),
  (req, res, next) => treeController.getById(req, res, next)
);
router.put('/trees/:treeId', 
  authMiddleware, 
  validateParams({ treeId: uuidSchema }),
  (req, res, next) => treeController.update(req, res, next)
);
router.delete('/trees/:treeId', 
  authMiddleware, 
  validateParams({ treeId: uuidSchema }),
  (req, res, next) => treeController.delete(req, res, next)
);

router.get('/trees/:treeId/access', 
  authMiddleware, 
  validateParams({ treeId: uuidSchema }),
  (req, res, next) => treeController.getAccess(req, res, next)
);
router.post('/trees/:treeId/access', 
  authMiddleware, 
  validateParams({ treeId: uuidSchema }),
  validateBody({
    email: { required: true, type: 'string', pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
    accessLevel: { required: true, type: 'string', enum: ['editor', 'viewer'] },
  }),
  (req, res, next) => treeController.grantAccess(req, res, next)
);
router.delete('/trees/:treeId/access/:userId', 
  authMiddleware, 
  validateParams({ treeId: uuidSchema, userId: uuidSchema }),
  (req, res, next) => treeController.revokeAccess(req, res, next)
);

router.get('/trees/:treeId/nodes', 
  authMiddleware, 
  validateParams({ treeId: uuidSchema }),
  (req, res, next) => nodeController.getNodes(req, res, next)
);
router.post('/trees/:treeId/nodes', 
  authMiddleware, 
  validateParams({ treeId: uuidSchema }),
  (req, res, next) => nodeController.create(req, res, next)
);
router.get('/trees/:treeId/nodes/:nodeId', 
  authMiddleware, 
  validateParams({ treeId: uuidSchema, nodeId: uuidSchema }),
  (req, res, next) => nodeController.getById(req, res, next)
);
router.put('/trees/:treeId/nodes/:nodeId', 
  authMiddleware, 
  validateParams({ treeId: uuidSchema, nodeId: uuidSchema }),
  (req, res, next) => nodeController.update(req, res, next)
);
router.delete('/trees/:treeId/nodes/:nodeId', 
  authMiddleware, 
  validateParams({ treeId: uuidSchema, nodeId: uuidSchema }),
  (req, res, next) => nodeController.delete(req, res, next)
);
router.post('/trees/:treeId/nodes/:nodeId/publish', 
  authMiddleware, 
  validateParams({ treeId: uuidSchema, nodeId: uuidSchema }),
  (req, res, next) => nodeController.publish(req, res, next)
);

router.get('/nodes/:nodeId/relationships', 
  authMiddleware, 
  validateParams({ nodeId: uuidSchema }),
  (req, res, next) => relationshipController.getNodeRelationships(req, res, next)
);
router.get('/nodes/:nodeId/linked-nodes', 
  authMiddleware, 
  validateParams({ nodeId: uuidSchema }),
  (req, res, next) => samePersonLinkController.getLinkedNodes(req, res, next)
);
router.get('/nodes/:nodeId/linked-trees', 
  authMiddleware, 
  validateParams({ nodeId: uuidSchema }),
  (req, res, next) => samePersonLinkController.getLinkedTrees(req, res, next)
);
router.get('/nodes/:nodeId/linked-tree-info', 
  authMiddleware, 
  validateParams({ nodeId: uuidSchema }),
  (req, res, next) => accessRequestController.getLinkedTreeInfo(req, res, next)
);

router.get('/trees/:treeId/relationships', 
  authMiddleware, 
  validateParams({ treeId: uuidSchema }),
  (req, res, next) => relationshipController.getRelationships(req, res, next)
);
router.post('/trees/:treeId/relationships', 
  authMiddleware, 
  validateParams({ treeId: uuidSchema }),
  validateBody({
    nodeId1: { required: true, type: 'string' },
    nodeId2: { required: true, type: 'string' },
    relationshipType: { required: true, type: 'string', enum: Object.values(RelationshipType) },
  }),
  (req, res, next) => relationshipController.create(req, res, next)
);
router.get('/relationships/:relationshipId', 
  authMiddleware, 
  validateParams({ relationshipId: uuidSchema }),
  (req, res, next) => relationshipController.getById(req, res, next)
);
router.delete('/relationships/:relationshipId', 
  authMiddleware, 
  validateParams({ relationshipId: uuidSchema }),
  (req, res, next) => relationshipController.delete(req, res, next)
);

router.get('/trees/:treeId/events', 
  authMiddleware, 
  validateParams({ treeId: uuidSchema }),
  (req, res, next) => timelineController.getEvents(req, res, next)
);
router.post('/trees/:treeId/events', 
  authMiddleware, 
  validateParams({ treeId: uuidSchema }),
  validateBody({
    eventType: { required: true, type: 'string', enum: Object.values(EventType) },
    title: { required: true, type: 'string', minLength: 1, maxLength: 255 },
    eventDate: { required: true, type: 'string' },
  }),
  (req, res, next) => timelineController.create(req, res, next)
);
router.get('/events/:eventId', 
  authMiddleware, 
  validateParams({ eventId: uuidSchema }),
  (req, res, next) => timelineController.getById(req, res, next)
);
router.put('/events/:eventId', 
  authMiddleware, 
  validateParams({ eventId: uuidSchema }),
  (req, res, next) => timelineController.update(req, res, next)
);
router.delete('/events/:eventId', 
  authMiddleware, 
  validateParams({ eventId: uuidSchema }),
  (req, res, next) => timelineController.delete(req, res, next)
);

router.post('/same-person-links', 
  authMiddleware, 
  validateBody({
    nodeId1: { required: true, type: 'string' },
    nodeId2: { required: true, type: 'string' },
  }),
  (req, res, next) => samePersonLinkController.create(req, res, next)
);
router.get('/same-person-links/:linkId', 
  authMiddleware, 
  validateParams({ linkId: uuidSchema }),
  (req, res, next) => samePersonLinkController.getById(req, res, next)
);
router.delete('/same-person-links/:linkId', 
  authMiddleware, 
  validateParams({ linkId: uuidSchema }),
  (req, res, next) => samePersonLinkController.delete(req, res, next)
);

router.get('/comments', 
  authMiddleware, 
  validateQuery({
    treeId: { required: true },
    entityType: { required: true },
    entityId: { required: true },
  }),
  (req, res, next) => commentController.getComments(req, res, next)
);
router.post('/comments', 
  authMiddleware, 
  validateBody({
    treeId: { required: true, type: 'string' },
    entityType: { required: true, type: 'string', enum: Object.values(EntityType) },
    entityId: { required: true, type: 'string' },
    commentText: { required: true, type: 'string', minLength: 1 },
  }),
  (req, res, next) => commentController.create(req, res, next)
);
router.put('/comments/:commentId', 
  authMiddleware, 
  validateParams({ commentId: uuidSchema }),
  validateBody({ commentText: { required: true, type: 'string', minLength: 1 } }),
  (req, res, next) => commentController.update(req, res, next)
);
router.delete('/comments/:commentId', 
  authMiddleware, 
  validateParams({ commentId: uuidSchema }),
  (req, res, next) => commentController.delete(req, res, next)
);

router.get('/search', 
  authMiddleware, 
  searchRateLimiter,
  validateQuery({ q: { required: true, minLength: 2 } }),
  (req, res, next) => searchController.search(req, res, next)
);

router.get('/notifications', 
  authMiddleware, 
  (req, res, next) => notificationController.getNotifications(req, res, next)
);
router.put('/notifications/:notificationId/read', 
  authMiddleware, 
  validateParams({ notificationId: uuidSchema }),
  (req, res, next) => notificationController.markAsRead(req, res, next)
);
router.put('/notifications/read-all', 
  authMiddleware, 
  (req, res, next) => notificationController.markAllAsRead(req, res, next)
);

router.get('/trees/:treeId/albums', 
  authMiddleware, 
  validateParams({ treeId: uuidSchema }),
  (req, res, next) => albumController.getAlbums(req, res, next)
);
router.post('/trees/:treeId/albums', 
  authMiddleware, 
  validateParams({ treeId: uuidSchema }),
  validateBody({
    albumSource: { required: true, type: 'string', enum: Object.values(AlbumSource) },
    albumIdentifier: { required: true, type: 'string' },
    albumName: { required: true, type: 'string', minLength: 1, maxLength: 255 },
  }),
  (req, res, next) => albumController.create(req, res, next)
);
router.delete('/albums/:albumId', 
  authMiddleware, 
  validateParams({ albumId: uuidSchema }),
  (req, res, next) => albumController.delete(req, res, next)
);

router.post('/access-requests', 
  authMiddleware, 
  validateBody({
    treeId: { required: true, type: 'string' },
    requestedLevel: { required: true, type: 'string', enum: ['viewer', 'editor'] },
  }),
  (req, res, next) => accessRequestController.submitRequest(req, res, next)
);
router.get('/access-requests/:requestId', 
  authMiddleware, 
  validateParams({ requestId: uuidSchema }),
  (req, res, next) => accessRequestController.getById(req, res, next)
);
router.get('/trees/:treeId/access-requests', 
  authMiddleware, 
  validateParams({ treeId: uuidSchema }),
  (req, res, next) => accessRequestController.getRequests(req, res, next)
);
router.put('/access-requests/:requestId/approve', 
  authMiddleware, 
  validateParams({ requestId: uuidSchema }),
  (req, res, next) => accessRequestController.approve(req, res, next)
);
router.put('/access-requests/:requestId/deny', 
  authMiddleware, 
  validateParams({ requestId: uuidSchema }),
  (req, res, next) => accessRequestController.deny(req, res, next)
);

export default router;
