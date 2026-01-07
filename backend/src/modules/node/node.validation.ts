export interface NodeNameFields {
  firstName?: string | null;
  lastName?: string | null;
  petName?: string | null;
}

/**
 * Validates node name fields according to the rule:
 * A node is valid if (firstName AND lastName are provided) OR (petName is provided)
 */
export function isValidNodeName(fields: NodeNameFields): boolean {
  const hasFirstName = fields.firstName !== undefined && fields.firstName !== null && fields.firstName.trim() !== '';
  const hasLastName = fields.lastName !== undefined && fields.lastName !== null && fields.lastName.trim() !== '';
  const hasPetName = fields.petName !== undefined && fields.petName !== null && fields.petName.trim() !== '';

  const hasFullName = hasFirstName && hasLastName;
  return hasFullName || hasPetName;
}

/**
 * Computes the display name for a node.
 * Returns petName if available, otherwise firstName + " " + lastName
 */
export function getDisplayName(fields: NodeNameFields): string {
  if (fields.petName !== undefined && fields.petName !== null && fields.petName.trim() !== '') {
    return fields.petName;
  }
  
  const firstName = fields.firstName ?? '';
  const lastName = fields.lastName ?? '';
  return `${firstName} ${lastName}`.trim();
}
