# RKRoots Testing Guide

## Test Structure

### Unit Tests
Located in `backend/src/modules/*/` alongside service files:
- `auth.service.test.ts` - Authentication, JWT, password hashing
- `tree.service.test.ts` - Tree CRUD, owner access
- `node.service.test.ts` - Node CRUD, draft/publish workflow
- `relationship.service.test.ts` - Relationship creation, validation
- `timeline.service.test.ts` - Event CRUD, ownership validation
- `same-person-link.service.test.ts` - Cross-tree linking
- `access-request.service.test.ts` - Access request workflow
- `comment.service.test.ts` - Comment CRUD, ownership
- `search.service.test.ts` - Search functionality
- `notification.service.test.ts` - Notification creation
- `album.service.test.ts` - Photo album operations
- `consolidation.service.test.ts` - Legacy consolidation

### Property-Based Tests
Using fast-check library for invariant testing:
- `access-control.property.test.ts` - Access level enforcement
- `node.validation.property.test.ts` - Node name validation rules
- `node.publish.property.test.ts` - Publish requirements
- `relationship.property.test.ts` - Tree consistency
- `timeline.property.test.ts` - Chronological ordering, ownership
- `same-person-link.property.test.ts` - Different trees requirement
- `access-request.property.test.ts` - Access request workflow
- `comment.property.test.ts` - Comment ownership
- `search.property.test.ts` - Search scope restriction
- `tree.property.test.ts` - Owner immutability, cascade deletion

### Integration Tests
- `auth.integration.test.ts` - Full auth flow with HTTP
- `api.integration.test.ts` - API endpoint testing

## Running Tests

```bash
cd backend

# All tests
npm test

# With coverage
npm run test:cov

# Watch mode
npm run test:watch

# Specific test file
npm test -- auth.service.test.ts

# Property tests only
npm test -- property
```

## Test Database

Tests use a separate PostgreSQL instance on port 5433:
```bash
npm run db:test:start    # Start test database
npm run migrate:test     # Run migrations
npm test                 # Run tests
npm run db:test:stop     # Stop test database
```

## Writing Tests

### Unit Test Pattern
```typescript
describe('ServiceName', () => {
  let service: ServiceName;
  
  beforeEach(() => {
    jest.clearAllMocks();
    service = new ServiceName();
  });

  describe('methodName', () => {
    it('should do expected behavior', async () => {
      // Arrange
      jest.spyOn(query).mockResolvedValue({ rows: [mockData] });
      
      // Act
      const result = await service.methodName(params);
      
      // Assert
      expect(result).toBeDefined();
    });
  });
});
```

### Property Test Pattern
```typescript
import fc from 'fast-check';

describe('Property: Node name validation', () => {
  it('accepts valid name combinations', () => {
    fc.assert(
      fc.property(
        fc.record({
          firstName: fc.string({ minLength: 1 }),
          lastName: fc.string({ minLength: 1 }),
        }),
        (node) => {
          expect(isValidNodeName(node)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

## Key Properties Tested

| Property | Description | Requirement |
|----------|-------------|-------------|
| Node name validation | (firstName AND lastName) OR petName | 3.1 |
| Access control viewing | TreeAccess record required | 5.2 |
| Access control editing | Editor/Owner required | 5.3 |
| Owner immutability | Owner access cannot be revoked | 2.2 |
| Relationship consistency | Both nodes same tree | 4.2 |
| Display name logic | petName priority | 3.5 |
| Same person different trees | Nodes must be in different trees | 7.3 |
| Search scope | Only accessible trees | 10.2 |
| Timeline ordering | Chronological by eventDate | 6.5 |
| Comment ownership | Only creator can edit/delete | 9.3, 9.4 |

## Coverage Goals
- Statements: 80%+
- Branches: 80%+
- Functions: 80%+
- Lines: 80%+

## CI/CD Testing

GitHub Actions runs tests on every push:
- Requires all tests to pass
- Generates coverage report
- Blocks merge on failure
