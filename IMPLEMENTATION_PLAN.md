# RKRoots Implementation Plan

## Overview

RKRoots is a collaborative family tree mobile app enabling users to build, visualize, and share family trees with features including timeline events, same-person links across trees, cross-tree navigation, and photo album integration.

## Technology Stack

| Layer | Technology |
|-------|------------|
| Backend Runtime | Node.js 18+ |
| Backend Framework | Express.js + TypeScript |
| Database | PostgreSQL (raw SQL with pg/node-postgres) |
| Database Hosting | Supabase (production), Docker (local) |
| Authentication | JWT + Passport.js + OAuth 2.0 |
| Logging | Pino (structured JSON) |
| Error Tracking | Sentry |
| Mobile Framework | React Native + Expo |
| State Management | Redux Toolkit (auth), React Query (data) |
| Visualization | React Native SVG + Gesture Handler |
| Backend Hosting | Railway or Render |

## Database Schema

13 tables with proper constraints and indexes:
- `users` - Authentication and profiles
- `family_trees` - Tree metadata
- `nodes` - Family members with draft/published status
- `relationships` - Connections between nodes
- `tree_access` - Permission records
- `timeline_events` - Historical events
- `event_participants` - Event-node associations
- `same_person_links` - Cross-tree node links
- `access_requests` - Access request workflow
- `comments` - Entity comments
- `notifications` - User notifications
- `photo_albums` - Linked albums
- `consolidated_nodes` / `node_consolidation_mapping` - Legacy consolidation

## Implementation Phases (Completed)

### Phase 0: Infrastructure ✅
- Docker Compose for local PostgreSQL
- Pino structured logging with request tracing
- Sentry error tracking integration
- Environment configuration

### Phase 1: Database & Types ✅
- SQL migrations with all tables
- TypeScript interfaces and enums
- pg connection pool setup
- Removed TypeORM, using raw SQL

### Phase 2: Access Control ✅
- AccessControlService (checkAccess, requireEditAccess, requireOwnerAccess)
- Three-tier permissions (Owner/Editor/Viewer)
- Property tests for access enforcement

### Phase 3: Core Services ✅
- AuthService (signup, login, OAuth, JWT)
- TreeService (CRUD, owner access)
- NodeService (CRUD, draft/publish workflow)
- RelationshipService (CRUD, tree consistency)

### Phase 4: Feature Services ✅
- TimelineService (events, chronological ordering)
- SamePersonLinkService (cross-tree linking)
- AccessRequestService (request workflow)
- CommentService (entity comments)
- SearchService (3+ char, accessible trees only)
- NotificationService (6 notification types)
- AlbumService (photo album linking)

### Phase 5: API Layer ✅
- Express routes for all modules
- JWT authentication middleware
- Request validation middleware
- Rate limiting middleware
- Error handling middleware

### Phase 6: Mobile App ✅
- Authentication screens (Login, Register)
- Tree management (List, View, Create, Share)
- Node management (Add, Edit, Detail) with draft UI
- Relationship management with visual lines
- Timeline screens
- Same person link creation
- Access request management
- Search with filters
- Notifications with badge
- Photo album linking

### Phase 7: Testing ✅
- Unit tests for all services
- Property-based tests for invariants
- Integration tests for API endpoints

### Phase 8: Deployment ✅
- Railway/Render backend configuration
- Supabase database setup
- EAS Build for mobile
- GitHub Actions CI/CD

## Key Design Decisions

1. **Raw SQL over ORM**: Better performance, explicit queries, no magic
2. **Draft/Publish Workflow**: Nodes start private, publish when ready
3. **Same Person Links**: Simpler than full consolidation, connects trees
4. **Access Requests**: Discovery-based access to linked trees
5. **Minimum Search Length**: 3 chars prevents expensive broad queries
6. **Property-Based Testing**: Validates invariants across all inputs

## Correctness Properties

21 properties defined and tested:
- Node name validation
- Access control enforcement (view/edit)
- Owner access immutability
- Relationship tree consistency
- Display name logic
- Same person link requirements
- Search scope restriction
- Timeline ordering
- Comment/event ownership
- Notification creation
- Tree deletion cascade
- Draft node visibility
- Publish requirements
