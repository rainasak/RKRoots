import * as fc from 'fast-check';
import { isValidNodeName, getDisplayName, NodeNameFields } from './node.validation';

/**
 * **Feature: rkroots-family-tree, Property 1: Node name validation**
 * **Validates: Requirements 3.1**
 * 
 * Property: For any node creation request, the system should accept the request
 * if and only if (firstName AND lastName are provided) OR (petName is provided)
 */
describe('Node Name Validation Property Tests', () => {
  const nonEmptyString = fc.string({ minLength: 1 }).filter(s => s.trim().length > 0);
  const emptyOrNullString = fc.oneof(
    fc.constant(undefined),
    fc.constant(null),
    fc.constant(''),
    fc.constant('   ')
  );

  describe('Property 1: Node name validation', () => {
    it('should accept nodes with both firstName AND lastName', () => {
      fc.assert(
        fc.property(
          nonEmptyString,
          nonEmptyString,
          fc.option(fc.string(), { nil: undefined }),
          (firstName, lastName, petName) => {
            const fields: NodeNameFields = { firstName, lastName, petName };
            return isValidNodeName(fields) === true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should accept nodes with petName only', () => {
      fc.assert(
        fc.property(
          emptyOrNullString,
          emptyOrNullString,
          nonEmptyString,
          (firstName, lastName, petName) => {
            const fields: NodeNameFields = { firstName, lastName, petName };
            return isValidNodeName(fields) === true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should accept nodes with all three name fields provided', () => {
      fc.assert(
        fc.property(
          nonEmptyString,
          nonEmptyString,
          nonEmptyString,
          (firstName, lastName, petName) => {
            const fields: NodeNameFields = { firstName, lastName, petName };
            return isValidNodeName(fields) === true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject nodes with only firstName (no lastName or petName)', () => {
      fc.assert(
        fc.property(
          nonEmptyString,
          emptyOrNullString,
          emptyOrNullString,
          (firstName, lastName, petName) => {
            const fields: NodeNameFields = { firstName, lastName, petName };
            return isValidNodeName(fields) === false;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject nodes with only lastName (no firstName or petName)', () => {
      fc.assert(
        fc.property(
          emptyOrNullString,
          nonEmptyString,
          emptyOrNullString,
          (firstName, lastName, petName) => {
            const fields: NodeNameFields = { firstName, lastName, petName };
            return isValidNodeName(fields) === false;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject nodes with no name fields provided', () => {
      fc.assert(
        fc.property(
          emptyOrNullString,
          emptyOrNullString,
          emptyOrNullString,
          (firstName, lastName, petName) => {
            const fields: NodeNameFields = { firstName, lastName, petName };
            return isValidNodeName(fields) === false;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should satisfy the complete property: valid iff (firstName AND lastName) OR petName', () => {
      const anyString = fc.oneof(
        fc.constant(undefined),
        fc.constant(null),
        fc.constant(''),
        fc.constant('   '),
        nonEmptyString
      );

      fc.assert(
        fc.property(
          anyString,
          anyString,
          anyString,
          (firstName, lastName, petName) => {
            const fields: NodeNameFields = { firstName, lastName, petName };
            const result = isValidNodeName(fields);

            const hasFirstName = firstName !== undefined && firstName !== null && firstName.trim() !== '';
            const hasLastName = lastName !== undefined && lastName !== null && lastName.trim() !== '';
            const hasPetName = petName !== undefined && petName !== null && petName.trim() !== '';

            const expectedValid = (hasFirstName && hasLastName) || hasPetName;
            return result === expectedValid;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});


/**
 * **Feature: rkroots-family-tree, Property 6: Display name logic**
 * **Validates: Requirements 3.5**
 * 
 * Property: For any node, the display name should equal petName if petName is not null,
 * otherwise it should equal firstName + " " + lastName
 */
describe('Display Name Logic Property Tests', () => {
  const nonEmptyString = fc.string({ minLength: 1 }).filter(s => s.trim().length > 0);
  const emptyOrNullString = fc.oneof(
    fc.constant(undefined),
    fc.constant(null),
    fc.constant(''),
    fc.constant('   ')
  );

  describe('Property 6: Display name logic', () => {
    it('should return petName when petName is provided', () => {
      fc.assert(
        fc.property(
          fc.option(nonEmptyString, { nil: undefined }),
          fc.option(nonEmptyString, { nil: undefined }),
          nonEmptyString,
          (firstName, lastName, petName) => {
            const fields: NodeNameFields = { firstName, lastName, petName };
            return getDisplayName(fields) === petName;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return firstName + lastName when petName is not provided', () => {
      fc.assert(
        fc.property(
          nonEmptyString,
          nonEmptyString,
          emptyOrNullString,
          (firstName, lastName, petName) => {
            const fields: NodeNameFields = { firstName, lastName, petName };
            const expected = `${firstName} ${lastName}`.trim();
            return getDisplayName(fields) === expected;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should satisfy the complete property: petName if available, else firstName + lastName', () => {
      const anyString = fc.oneof(
        fc.constant(undefined),
        fc.constant(null),
        fc.constant(''),
        fc.constant('   '),
        nonEmptyString
      );

      fc.assert(
        fc.property(
          anyString,
          anyString,
          anyString,
          (firstName, lastName, petName) => {
            const fields: NodeNameFields = { firstName, lastName, petName };
            const result = getDisplayName(fields);

            const hasPetName = petName !== undefined && petName !== null && petName.trim() !== '';
            
            if (hasPetName) {
              return result === petName;
            } else {
              const fn = firstName ?? '';
              const ln = lastName ?? '';
              return result === `${fn} ${ln}`.trim();
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
