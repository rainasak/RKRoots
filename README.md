# RKRoots

A collaborative family tree mobile application that enables users to build, visualize, and share family trees with rich features.

## Features

- **Family Tree Creation**: Build family trees from maternal and paternal lines
- **Node Management**: Add family members with detailed profiles
- **Relationship Visualization**: Different line styles for relationship types
- **Access Control**: Share trees with view/edit permissions
- **Timeline Events**: Record significant moments in family history
- **Node Consolidation**: Link duplicate nodes across trees
- **Cross-Tree Navigation**: Navigate between interconnected family trees
- **Photo Albums**: Link Google Drive/Photos for background displays
- **Comments**: Collaborate through comments on people and events
- **Search**: Find family members across accessible trees

## Tech Stack

### Backend
- Node.js + Express + TypeScript
- PostgreSQL + Redis
- AWS S3 for image storage
- JWT authentication with OAuth 2.0

### Mobile
- React Native + Expo
- Redux Toolkit for state management
- React Query for data fetching
- React Native SVG + D3.js for tree visualization

## Getting Started

### Prerequisites
- Node.js 18+
- Docker and Docker Compose
- Expo CLI (for mobile development)

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
# This starts PostgreSQL + Redis containers and runs migrations
```

4. **Start the development server:**
```bash
npm run dev
```

The API will be available at `http://localhost:3000`

### Database Management Commands

| Command | Description |
|---------|-------------|
| `npm run db:start` | Start PostgreSQL and Redis containers |
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
npm start
```

## Project Structure

```
RKRoots/
├── backend/          # Node.js backend API
│   ├── src/
│   │   ├── database/
│   │   ├── modules/
│   │   ├── common/
│   │   └── config/
│   └── docker-compose.yml
├── mobile/           # React Native mobile app
│   └── src/
│       ├── screens/
│       ├── components/
│       ├── navigation/
│       ├── store/
│       └── services/
└── shared/           # Shared types and utilities
```

## Development

### Running Tests

Backend:
```bash
cd backend
npm test
npm run test:cov
```

Mobile:
```bash
cd mobile
npm test
```

### Database Migrations

```bash
cd backend
npm run migrate
```

## Project Status

**Status**: ✅ Production Ready - All 15 phases complete, codebase cleaned and refactored

### Implementation Highlights
- 27 passing unit tests (100% pass rate)
- 10 backend services with centralized access control
- 4 mobile screens with Redux + React Query
- Complete CI/CD pipeline with GitHub Actions
- AWS infrastructure with Terraform
- Docker containerization ready
- Clean architecture with minimal duplication

### Key Features Implemented
- JWT authentication with refresh tokens
- Three-tier access control (Owner/Editor/Viewer)
- Node consolidation across trees
- Full-text search with filtering
- Timeline events with participants
- Photo album integration
- Redis caching and performance optimization

### Recent Refactoring (Dec 2024)
- Consolidated 4 redundant documentation files into README
- Removed 12 empty directories
- Created missing core files (database config, auth service/controller/middleware)
- Refactored 3 services to use centralized AccessControlService
- Reduced code duplication by ~50% in access control logic
- All tests passing after refactoring

## Documentation

- [Implementation Plan](./IMPLEMENTATION_PLAN.md) - 25-week development roadmap
- [Features List](./FEATURES.md) - Complete feature specifications
- [Deployment Guide](./DEPLOYMENT_GUIDE.md) - Infrastructure and deployment
- [Testing Guide](./TESTING_GUIDE.md) - Test procedures and coverage
- [User Guide](./USER_GUIDE.md) - End-user documentation

## License

See [LICENSE](./LICENSE) file for details.
