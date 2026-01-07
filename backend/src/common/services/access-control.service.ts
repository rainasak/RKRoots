import { query } from '../../config/database';
import { AccessLevel, TreeAccess } from '../../database/interfaces';
import { AppError } from '../errors/app-error';

export { AccessLevel };

export class AccessControlService {
  async checkAccess(treeId: string, userId: string, minLevel?: AccessLevel): Promise<TreeAccess> {
    const result = await query<TreeAccess>(
      'SELECT access_id as "accessId", tree_id as "treeId", user_id as "userId", access_level as "accessLevel", granted_by as "grantedBy", granted_at as "grantedAt" FROM tree_access WHERE tree_id = $1 AND user_id = $2',
      [treeId, userId]
    );

    if (result.rows.length === 0) {
      throw new AppError('Access denied', 403);
    }

    const access = result.rows[0];

    if (minLevel) {
      const levels = [AccessLevel.VIEWER, AccessLevel.EDITOR, AccessLevel.OWNER];
      const userLevel = levels.indexOf(access.accessLevel);
      const requiredLevel = levels.indexOf(minLevel);

      if (userLevel < requiredLevel) {
        throw new AppError(`${minLevel} access required`, 403);
      }
    }

    return access;
  }

  async requireEditAccess(treeId: string, userId: string): Promise<void> {
    const access = await this.checkAccess(treeId, userId);
    if (access.accessLevel === AccessLevel.VIEWER) {
      throw new AppError('Edit access required', 403);
    }
  }

  async requireOwnerAccess(treeId: string, userId: string): Promise<void> {
    const access = await this.checkAccess(treeId, userId);
    if (access.accessLevel !== AccessLevel.OWNER) {
      throw new AppError('Owner access required', 403);
    }
  }

  async getAccessLevel(treeId: string, userId: string): Promise<AccessLevel | null> {
    const result = await query<{ accessLevel: AccessLevel }>(
      'SELECT access_level as "accessLevel" FROM tree_access WHERE tree_id = $1 AND user_id = $2',
      [treeId, userId]
    );
    return result.rows[0]?.accessLevel ?? null;
  }

  async grantAccess(
    treeId: string, 
    userId: string, 
    accessLevel: AccessLevel, 
    grantedBy: string,
    skipNotification: boolean = false
  ): Promise<TreeAccess> {
    const result = await query<TreeAccess>(
      `INSERT INTO tree_access (tree_id, user_id, access_level, granted_by)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (tree_id, user_id) DO UPDATE SET access_level = $3
       RETURNING access_id as "accessId", tree_id as "treeId", user_id as "userId", access_level as "accessLevel", granted_by as "grantedBy", granted_at as "grantedAt"`,
      [treeId, userId, accessLevel, grantedBy]
    );

    if (!skipNotification && userId !== grantedBy) {
      const { NotificationService } = await import('../../modules/notification/notification.service');
      const notificationService = new NotificationService();
      
      const treeResult = await query<{ treeName: string }>(
        'SELECT tree_name as "treeName" FROM family_trees WHERE tree_id = $1',
        [treeId]
      );
      
      if (treeResult.rows.length > 0) {
        await notificationService.notifyAccessGranted(userId, treeId, treeResult.rows[0].treeName, accessLevel);
      }
    }

    return result.rows[0];
  }

  async revokeAccess(treeId: string, userId: string): Promise<void> {
    await query(
      "DELETE FROM tree_access WHERE tree_id = $1 AND user_id = $2 AND access_level != 'owner'",
      [treeId, userId]
    );
  }
}
