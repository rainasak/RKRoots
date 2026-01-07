import { query, transaction } from '../../config/database';
import { FamilyTree, AccessLevel, TreeAccess } from '../../database/interfaces';
import { AccessControlService } from '../../common/services/access-control.service';
import { AppError } from '../../common/errors/app-error';

interface CreateTreeDto {
  treeName: string;
  description?: string;
  userId: string;
}

interface UpdateTreeDto {
  treeName?: string;
  description?: string;
}

interface TreeAccessWithUser extends TreeAccess {
  email: string;
  displayName: string;
}

interface GrantAccessDto {
  email: string;
  accessLevel: AccessLevel;
}

export class TreeService {
  protected accessControl: AccessControlService;

  constructor() {
    this.accessControl = new AccessControlService();
  }

  async createTree(createDto: CreateTreeDto): Promise<FamilyTree> {
    return await transaction(async (client) => {
      const treeResult = await client.query<FamilyTree>(
        `INSERT INTO family_trees (tree_name, description, owner_user_id)
         VALUES ($1, $2, $3)
         RETURNING tree_id as "treeId", tree_name as "treeName", description, owner_user_id as "ownerUserId", created_at as "createdAt", updated_at as "updatedAt"`,
        [createDto.treeName, createDto.description || null, createDto.userId]
      );

      const tree = treeResult.rows[0];

      await client.query(
        `INSERT INTO tree_access (tree_id, user_id, access_level, granted_by)
         VALUES ($1, $2, $3, $4)`,
        [tree.treeId, createDto.userId, AccessLevel.OWNER, createDto.userId]
      );

      return tree;
    });
  }

  async getUserTrees(userId: string): Promise<FamilyTree[]> {
    const result = await query<FamilyTree>(
      `SELECT ft.tree_id as "treeId", ft.tree_name as "treeName", ft.description, ft.owner_user_id as "ownerUserId", ft.created_at as "createdAt", ft.updated_at as "updatedAt"
       FROM family_trees ft
       JOIN tree_access ta ON ft.tree_id = ta.tree_id
       WHERE ta.user_id = $1`,
      [userId]
    );
    return result.rows;
  }

  async getTreeById(treeId: string, userId: string): Promise<FamilyTree> {
    await this.accessControl.checkAccess(treeId, userId);

    const result = await query<FamilyTree>(
      `SELECT tree_id as "treeId", tree_name as "treeName", description, owner_user_id as "ownerUserId", created_at as "createdAt", updated_at as "updatedAt"
       FROM family_trees WHERE tree_id = $1`,
      [treeId]
    );

    if (result.rows.length === 0) {
      throw new AppError('Tree not found', 404);
    }

    return result.rows[0];
  }

  async updateTree(treeId: string, userId: string, updateDto: UpdateTreeDto): Promise<FamilyTree> {
    await this.accessControl.requireOwnerAccess(treeId, userId);

    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (updateDto.treeName !== undefined) {
      updates.push(`tree_name = $${paramIndex++}`);
      values.push(updateDto.treeName);
    }
    if (updateDto.description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(updateDto.description);
    }

    if (updates.length === 0) {
      return this.getTreeById(treeId, userId);
    }

    updates.push(`updated_at = NOW()`);
    values.push(treeId);

    const result = await query<FamilyTree>(
      `UPDATE family_trees SET ${updates.join(', ')} WHERE tree_id = $${paramIndex}
       RETURNING tree_id as "treeId", tree_name as "treeName", description, owner_user_id as "ownerUserId", created_at as "createdAt", updated_at as "updatedAt"`,
      values
    );

    if (result.rows.length === 0) {
      throw new AppError('Tree not found', 404);
    }

    return result.rows[0];
  }

  async deleteTree(treeId: string, userId: string): Promise<void> {
    await this.accessControl.requireOwnerAccess(treeId, userId);
    await query('DELETE FROM family_trees WHERE tree_id = $1', [treeId]);
  }

  async getTreeAccess(treeId: string, userId: string): Promise<TreeAccessWithUser[]> {
    await this.accessControl.requireOwnerAccess(treeId, userId);

    const result = await query<TreeAccessWithUser>(
      `SELECT ta.access_id as "accessId", ta.tree_id as "treeId", ta.user_id as "userId", 
              ta.access_level as "accessLevel", ta.granted_by as "grantedBy", ta.granted_at as "grantedAt",
              u.email, u.display_name as "displayName"
       FROM tree_access ta
       JOIN users u ON ta.user_id = u.user_id
       WHERE ta.tree_id = $1
       ORDER BY ta.access_level DESC, u.display_name ASC`,
      [treeId]
    );

    return result.rows;
  }

  async grantTreeAccess(treeId: string, ownerId: string, dto: GrantAccessDto): Promise<TreeAccessWithUser> {
    await this.accessControl.requireOwnerAccess(treeId, ownerId);

    if (dto.accessLevel === AccessLevel.OWNER) {
      throw new AppError('Cannot grant owner access', 400);
    }

    const userResult = await query<{ userId: string; email: string; displayName: string }>(
      'SELECT user_id as "userId", email, display_name as "displayName" FROM users WHERE LOWER(email) = LOWER($1)',
      [dto.email]
    );

    if (userResult.rows.length === 0) {
      throw new AppError('User not found with that email', 404);
    }

    const targetUser = userResult.rows[0];

    if (targetUser.userId === ownerId) {
      throw new AppError('Cannot modify your own access', 400);
    }

    const existingAccess = await this.accessControl.getAccessLevel(treeId, targetUser.userId);
    if (existingAccess === AccessLevel.OWNER) {
      throw new AppError('Cannot modify owner access', 400);
    }

    const access = await this.accessControl.grantAccess(treeId, targetUser.userId, dto.accessLevel, ownerId);

    return {
      ...access,
      email: targetUser.email,
      displayName: targetUser.displayName,
    };
  }

  async revokeTreeAccess(treeId: string, ownerId: string, targetUserId: string): Promise<void> {
    await this.accessControl.requireOwnerAccess(treeId, ownerId);

    if (targetUserId === ownerId) {
      throw new AppError('Cannot revoke your own access', 400);
    }

    const existingAccess = await this.accessControl.getAccessLevel(treeId, targetUserId);
    if (!existingAccess) {
      throw new AppError('User does not have access to this tree', 404);
    }
    if (existingAccess === AccessLevel.OWNER) {
      throw new AppError('Cannot revoke owner access', 400);
    }

    await this.accessControl.revokeAccess(treeId, targetUserId);
  }
}
