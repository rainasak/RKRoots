# RKRoots

A collaborative family tree mobile application that enables users to build, visualize, and share family trees with rich features.

## Features

- **Family Tree Creation**: Build family trees with visual pan/zoom interface
- **Node Management**: Add family members with draft/publish workflow
- **Relationship Visualization**: 5 relationship types with distinct line styles
- **Access Control**: Three-tier permissions (Owner/Editor/Viewer)
- **Timeline Events**: 6 event types for documenting family history
- **Same Person Links**: Connect nodes across different trees
- **Cross-Tree Navigation**: Navigate between linked trees with access requests
- **Photo Albums**: Link Google Drive/Photos albums to trees
- **Comments**: Collaborate through comments on nodes, events, relationships
- **Search**: Find family members across accessible trees (min 3 chars)
- **Notifications**: Real-time updates for access, links, comments, events

## Tech Stack

### Backend
- Node.js 18+ with Express.js
- TypeScript with raw SQL (pg/node-postgres)
- PostgreSQL (Supabase for production)
- JWT authentication (1h access, 7d refresh) with OAuth 2.0
- Pino for structured logging
- Sentry for error tracking

### Mobile
- React Native + Expo (SDK 50+)
- Redux Toolkit for auth state
- React Query (TanStack) for data fetching
- React Native Gesture Handler for pan/zoom
- React Native SVG for tree visualization

## Getting Started

### Prerequisites
- Node.js 18+
- Docker and Docker Compose
- Expo CLI (`npm install -g expo-cli`)

### Backend Setup (Local Development)

1. **Clone and install dependencies:**
```bash
cd backend
npm install
```

2. **Configure environment:**
```bash
cp .env.example .env
# Edit .env if needed (defaults work for local development)
```

3. **Start local services and run migrations:**
```bash
npm run setup
# This starts PostgreSQL container and runs migrations
```

4. **Start the development server:**
```bash
npm run dev
```

The API will be available at `http://localhost:3000`

### Database Management Commands

| Command | Description |
|---------|-------------|
| `npm run db:start` | Start PostgreSQL container |
| `npm run db:stop` | Stop all containers |
| `npm run db:reset` | Reset database (drops all data and re-runs migrations) |
| `npm run migrate` | Run database migrations |
| `npm run setup` | Full setup: start containers, wait for DB, run migrations |

### Test Database

A separate test database runs on port 5433 for isolated testing:
```bash
npm run db:test:start    # Start test database
npm run migrate:test     # Run migrations on test database
npm test                 # Run tests
npm run db:test:stop     # Stop test database
```

### Mobile Setup

```bash
cd mobile
npm install
npx expo start
```

## Project Structure

```
RKRoots/
├── backend/
│   └── src/
│       ├── common/           # Shared utilities
│       │   ├── errors/       # AppError class
│       │   ├── logger/       # Pino logger
│       │   ├── middleware/   # Auth, validation, rate-limit
│       │   ├── sentry/       # Error tracking
│       │   └── services/     # AccessControlService
│       ├── config/           # Database, passport, pg-pool
│       ├── database/
│       │   ├── interfaces/   # TypeScript types/enums
│       │   └── migrations/   # SQL migration files
│       ├── modules/          # Feature modules
│       │   ├── auth/         # Authentication
│       │   ├── tree/         # Family trees
│       │   ├── node/         # Tree nodes (people)
│       │   ├── relationship/ # Node relationships
│       │   ├── timeline/     # Timeline events
│       │   ├── same-person-link/  # Cross-tree links
│       │   ├── access-request/    # Access requests
│       │   ├── comment/      # Comments
│       │   ├── search/       # Search functionality
│       │   ├── notification/ # Notifications
│       │   └── album/        # Photo albums
│       └── routes/           # API route definitions
├── mobile/
│   └── src/
│       ├── components/       # Reusable components
│       ├── config/           # Environment config
│       ├── navigation/       # React Navigation setup
│       ├── screens/          # Screen components
│       │   ├── auth/         # Login, Register
│       │   ├── tree/         # TreeList, TreeView, CreateTree, ShareTree
│       │   ├── node/         # AddNode, EditNode, NodeDetail
│       │   ├── relationship/ # AddRelationship
│       │   ├── timeline/     # Timeline, CreateEvent
│       │   ├── same-person-link/  # CreateLink, AccessRequests
│       │   ├── search/       # Search
│       │   ├── notification/ # Notifications
│       │   └── album/        # AlbumList, LinkAlbum
│       ├── services/         # API service clients
│       ├── store/            # Redux store + slices
│       └── types/            # TypeScript types
└── shared/                   # Shared types (future use)
```

## Development

### Running Tests

Backend:
```bash
cd backend
npm test              # Run all tests
npm run test:cov      # With coverage report
npm run test:watch    # Watch mode
```

### API Endpoints

| Module | Endpoints |
|--------|-----------|
| Auth | POST /auth/register, /auth/login, /auth/refresh, GET /auth/google, /auth/apple |
| Trees | GET/POST /trees, GET/PUT/DELETE /trees/:id |
| Nodes | GET/POST /trees/:id/nodes, GET/PUT/DELETE /nodes/:id, POST /nodes/:id/publish |
| Relationships | GET/POST /trees/:id/relationships, DELETE /relationships/:id |
| Timeline | GET/POST /trees/:id/events, GET/PUT/DELETE /events/:id |
| Same Person Links | POST /same-person-links, GET /nodes/:id/linked-nodes, DELETE /same-person-links/:id |
| Access Requests | POST/GET /access-requests, PUT /access-requests/:id |
| Comments | GET/POST /comments, PUT/DELETE /comments/:id |
| Search | GET /search?q=query |
| Notifications | GET /notifications, PUT /notifications/:id/read |
| Albums | GET/POST /trees/:id/albums, DELETE /albums/:id |

## Project Status

**Status**: ✅ Production Ready - All 28 implementation tasks complete

### Architecture Highlights
- Raw SQL with pg (node-postgres) - no ORM overhead
- Centralized AccessControlService for permission checks
- Structured logging with Pino + Sentry error tracking
- Property-based testing with fast-check for core invariants
- Draft/publish workflow for nodes

### Key Design Decisions
- **No ORM**: Raw SQL for performance and explicit control
- **Draft Nodes**: New nodes start as drafts, visible only to creator until published
- **Same Person Links**: Replaced "node consolidation" with simpler cross-tree linking
- **Access Requests**: Users can request access to linked trees they discover
- **Minimum Search Length**: 3 characters to prevent expensive broad queries

## Documentation

- [Implementation Plan](./IMPLEMENTATION_PLAN.md) - 25-week development roadmap
- [Features List](./FEATURES.md) - Complete feature specifications
- [Deployment Guide](./DEPLOYMENT_GUIDE.md) - Infrastructure and deployment
- [Testing Guide](./TESTING_GUIDE.md) - Test procedures and coverage
- [User Guide](./USER_GUIDE.md) - End-user documentation

## License

See [LICENSE](./LICENSE) file for details.
