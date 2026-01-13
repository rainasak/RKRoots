# RKRoots Developer Guide

This guide helps developers understand the codebase architecture, find existing functionality, and avoid code duplication.

## Backend Services

Each service is responsible for a specific domain. **Always check existing services before writing new code.**

| Service | Location | Responsibility |
|---------|----------|----------------|
| **AccessControlService** | `common/services/` | Permission checks for all operations |
| **AuthService** | `modules/auth/` | User registration, login, JWT, OAuth |
| **TreeService** | `modules/tree/` | Family tree CRUD, owner management |
| **NodeService** | `modules/node/` | Family member CRUD, draft/publish workflow |
| **RelationshipService** | `modules/relationship/` | Node connections within trees |
| **TimelineService** | `modules/timeline/` | Historical events |
| **SamePersonLinkService** | `modules/same-person-link/` | Cross-tree node linking |
| **AccessRequestService** | `modules/access-request/` | Access request workflow |
| **CommentService** | `modules/comment/` | Entity comments |
| **SearchService** | `modules/search/` | Node search across trees |
| **NotificationService** | `modules/notification/` | User notifications |
| **AlbumService** | `modules/album/` | Photo album linking |

### Service Method Reference

#### AccessControlService (common/services/)
```typescript
checkAccess(treeId, userId, minLevel?)  // Verify user has access, throws 403 if not
requireEditAccess(treeId, userId)        // Require Editor or Owner
requireOwnerAccess(treeId, userId)       // Require Owner only
getAccessLevel(treeId, userId)           // Returns AccessLevel or null
grantAccess(treeId, userId, level, grantedBy)  // Grant access + notify
revokeAccess(treeId, userId)             // Remove access (cannot revoke Owner)
```

#### AuthService (modules/auth/)
```typescript
signup(dto)                    // Register with email/password
login(dto)                     // Login, returns JWT tokens
refresh(refreshToken)          // Refresh access token
validateToken(token)           // Validate JWT, returns userId
getUserById(userId)            // Get user profile
updateProfile(userId, updates) // Update profile/password
findOrCreateOAuthUser(dto)     // OAuth user handling
generateTokensForUser(userId)  // Generate JWT pair
```

#### NodeService (modules/node/)
```typescript
createNode(dto)              // Create draft node
getNodes(treeId, userId)     // Get nodes (published + user's drafts)
getNodeById(nodeId, userId)  // Get single node
updateNode(nodeId, userId, dto)  // Update node
deleteNode(nodeId, userId)   // Delete node
publishNode(nodeId, userId)  // Publish draft node
getDisplayName(node)         // Returns petName || firstName + lastName
```

#### NotificationService (modules/notification/)
```typescript
createNotification(dto)      // Generic notification creation
getNotifications(userId)     // Get user's unread notifications
markAsRead(notificationId, userId)  // Mark notification read

// Helper methods for common notifications:
notifyAccessGranted(userId, treeId, treeName, level)
notifyNodePublished(treeId, nodeId, displayName, excludeUserId)
notifyTimelineEventAdded(treeId, eventId, title, excludeUserId)
notifyCommentAdded(treeId, entityType, entityId, excludeUserId)
```

## Shared Utilities

**Always reuse these instead of writing custom implementations:**

| Utility | Location | Purpose |
|---------|----------|---------|
| `AccessControlService` | `common/services/` | All permission checks |
| `AppError` | `common/errors/` | HTTP errors (400, 401, 403, 404, 409, 500) |
| `createLogger(service)` | `common/logger/` | Service-specific Pino logger |
| `query(sql, params)` | `config/database.ts` | Parameterized SQL queries |
| `isValidNodeName(dto)` | `modules/node/node.validation.ts` | Node name validation |
| `validatePassword(pwd)` | `modules/auth/auth.service.ts` | Password requirements check |

## Database Types

All TypeScript types are in `database/interfaces/index.ts`:

### Enums
- `AccessLevel`: owner, editor, viewer
- `NodeStatus`: draft, published
- `RelationshipType`: parent_child, spouse, sibling, adopted, step
- `EventType`: birth, marriage, death, milestone, achievement, memory
- `NotificationType`: access_granted, same_person_link_created, access_request, comment_added, node_published, timeline_event_added
- `EntityType`: node, event, relationship
- `AlbumSource`: google_drive, google_photos
- `AuthProvider`: email, google, apple
- `AccessRequestStatus`: pending, approved, denied

### Interfaces
`User`, `FamilyTree`, `Node`, `Relationship`, `TreeAccess`, `TimelineEvent`, `EventParticipant`, `Comment`, `Notification`, `PhotoAlbum`, `SamePersonLink`, `AccessRequest`

## Common Patterns

### Permission Checks
```typescript
// DON'T write custom SQL for access checks
// DO use AccessControlService
private accessControl = new AccessControlService();

async someMethod(treeId: string, userId: string) {
  await this.accessControl.requireEditAccess(treeId, userId);
  // ... proceed with operation
}
```

### Error Handling
```typescript
import { AppError } from '../../common/errors/app-error';

// Throw typed errors - middleware handles response formatting
if (!found) throw new AppError('Resource not found', 404);
if (!authorized) throw new AppError('Access denied', 403);
if (duplicate) throw new AppError('Already exists', 409);
```

### Logging
```typescript
import { createLogger } from '../../common/logger';

const logger = createLogger('my-service');

logger.info({ action: 'create', userId, treeId }, 'Creating resource');
logger.error({ err, userId }, 'Operation failed');
```

### SQL Queries
```typescript
import { query } from '../../config/database';

// Always use parameterized queries
const result = await query<MyType>(
  'SELECT * FROM table WHERE id = $1 AND user_id = $2',
  [id, userId]
);
return result.rows;
```

### Display Name Logic
```typescript
// Use NodeService.getDisplayName() - petName takes priority
const displayName = this.getDisplayName(node);
// Returns: node.petName || `${node.firstName} ${node.lastName}`
```

## Mobile Architecture

### Services (mobile/src/services/)

Each service mirrors a backend module:

| Service | Backend Module | Base Endpoint |
|---------|----------------|---------------|
| `authService` | auth | `/auth` |
| `treeService` | tree | `/trees` |
| `nodeService` | node | `/trees/:id/nodes`, `/nodes` |
| `relationshipService` | relationship | `/trees/:id/relationships` |
| `timelineService` | timeline | `/trees/:id/events` |
| `samePersonLinkService` | same-person-link | `/same-person-links`, `/nodes/:id/linked-*` |
| `commentService` | comment | `/comments` |
| `searchService` | search | `/search` |
| `notificationService` | notification | `/notifications` |
| `albumService` | album | `/trees/:id/albums` |

### Reusable Components (mobile/src/components/)

| Component | Purpose |
|-----------|---------|
| `CommentsSection` | Comments UI for any entity (node, event, relationship) |
| `LinkedTreesSection` | Same-person links display + cross-tree navigation |
| `NotificationBadge` | Unread notification count indicator |
| `RequestAccessModal` | Modal for requesting access to linked trees |

### State Management

- **Redux Toolkit** (`store/slices/authSlice.ts`): Auth state only (user, tokens)
- **React Query**: All server data (trees, nodes, relationships, etc.)

```typescript
// Use React Query for data fetching
const { data: nodes } = useQuery({
  queryKey: ['nodes', treeId],
  queryFn: () => nodeService.getNodes(treeId),
});

// Use mutations for updates
const mutation = useMutation({
  mutationFn: (data) => nodeService.createNode(treeId, data),
  onSuccess: () => queryClient.invalidateQueries(['nodes', treeId]),
});
```

## Key Business Rules

1. **Node Names**: Must have (firstName AND lastName) OR petName
2. **Draft Nodes**: Only visible to creator until published
3. **Publishing**: Requires relationship to published node (except first node in tree)
4. **Same Person Links**: Nodes must be in different trees
5. **Access Requests**: Only for editor level (viewers get auto-granted via links)
6. **Search**: Minimum 3 characters, only published nodes
7. **Owner Access**: Cannot be revoked, auto-granted on tree creation
8. **Timeline Events**: Edit/delete by creator OR tree owner
9. **Comments**: Edit/delete by creator only
