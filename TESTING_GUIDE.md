# RKRoots Testing Guide

## Test Coverage

### Backend Tests
- **Unit Tests**: 27 passing
- **Test Suites**: 6 total
- **Coverage**: High on core services

### Running Tests

#### All Tests
```bash
cd backend
npm test
```

#### With Coverage
```bash
npm run test:cov
```

#### Watch Mode
```bash
npm run test:watch
```

#### Specific Test
```bash
npm test -- auth.service.test.ts
```

## Test Structure

### Unit Tests
Located in: `backend/src/modules/*/`
- `auth.service.test.ts` - Authentication
- `tree.service.test.ts` - Tree management
- `node.service.test.ts` - Node operations
- `relationship.service.test.ts` - Relationships
- `timeline.service.test.ts` - Timeline events
- `consolidation.service.test.ts` - Node consolidation
- `search.service.test.ts` - Search functionality
- `notification.service.test.ts` - Notifications

### Integration Tests
Located in: `backend/src/modules/*/`
- `auth.integration.test.ts` - API endpoints

## Writing Tests

### Unit Test Template
```typescript
describe('ServiceName', () => {
  let service: ServiceName;
  let mockRepo: jest.Mocked<Repository<Entity>>;

  beforeEach(() => {
    mockRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
    } as any;
    
    service = new ServiceName(mockRepo);
  });

  describe('methodName', () => {
    it('should do something', async () => {
      mockRepo.findOne.mockResolvedValue(mockData);
      
      const result = await service.methodName(params);
      
      expect(result).toBeDefined();
      expect(mockRepo.findOne).toHaveBeenCalled();
    });
  });
});
```

## Mobile Testing

### Run Tests
```bash
cd mobile
npm test
```

### Component Tests
```typescript
import { render, fireEvent } from '@testing-library/react-native';

describe('ComponentName', () => {
  it('renders correctly', () => {
    const { getByText } = render(<ComponentName />);
    expect(getByText('Expected Text')).toBeDefined();
  });
});
```

## E2E Testing (Future)

### Setup Detox
```bash
npm install -g detox-cli
detox init
```

### Run E2E Tests
```bash
detox test --configuration ios.sim.debug
```

## Load Testing

### Using Artillery
```bash
npm install -g artillery
artillery quick --count 100 --num 10 https://api.rkroots.com/health
```

## Test Data

### Fixtures
Located in: `backend/src/__fixtures__/`
- Mock users
- Mock trees
- Mock nodes

### Database Seeding
```bash
npm run seed
```

## CI/CD Testing

### GitHub Actions
- Runs on every push
- Requires all tests to pass
- Generates coverage report

## Coverage Goals
- Statements: 80%+
- Branches: 80%+
- Functions: 80%+
- Lines: 80%+

## Best Practices
1. Write tests before implementation (TDD)
2. Test edge cases and error conditions
3. Mock external dependencies
4. Keep tests isolated and independent
5. Use descriptive test names
6. Maintain test data fixtures
