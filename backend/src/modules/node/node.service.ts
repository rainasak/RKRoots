import { query } from '../../config/database';
import { Node, NodeStatus } from '../../database/interfaces';
import { AccessControlService } from '../../common/services/access-control.service';
import { NotificationService } from '../notification/notification.service';
import { AppError } from '../../common/errors/app-error';
import { isValidNodeName } from './node.validation';

interface CreateNodeDto {
  treeId: string;
  firstName?: string;
  lastName?: string;
  petName?: string;
  address?: string;
  placeOfBirth?: string;
  contactInfo?: Record<string, unknown>;
  profilePictureUrl?: string;
  dateOfBirth?: Date;
  dateOfDeath?: Date;
  userId: string;
}

interface UpdateNodeDto {
  firstName?: string;
  lastName?: string;
  petName?: string;
  address?: string;
  placeOfBirth?: string;
  contactInfo?: Record<string, unknown>;
  profilePictureUrl?: string;
  dateOfBirth?: Date;
  dateOfDeath?: Date;
}

const NODE_SELECT_FIELDS = `node_id as "nodeId", tree_id as "treeId", first_name as "firstName", last_name as "lastName", pet_name as "petName", address, place_of_birth as "placeOfBirth", contact_info as "contactInfo", profile_picture_url as "profilePictureUrl", date_of_birth as "dateOfBirth", date_of_death as "dateOfDeath", status, created_by as "createdBy", created_at as "createdAt", updated_at as "updatedAt", published_at as "publishedAt"`;

export class NodeService {
  private accessControl: AccessControlService;
  private notificationService: NotificationService;

  constructor() {
    this.accessControl = new AccessControlService();
    this.notificationService = new NotificationService();
  }

  async createNode(createDto: CreateNodeDto): Promise<Node> {
    if (!isValidNodeName(createDto)) {
      throw new AppError('Either firstName and lastName, or petName must be provided', 400);
    }

    await this.accessControl.requireEditAccess(createDto.treeId, createDto.userId);

    const result = await query<Node>(
      `INSERT INTO nodes (tree_id, first_name, last_name, pet_name, address, place_of_birth, contact_info, profile_picture_url, date_of_birth, date_of_death, created_by, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING ${NODE_SELECT_FIELDS}`,
      [
        createDto.treeId,
        createDto.firstName || null,
        createDto.lastName || null,
        createDto.petName || null,
        createDto.address || null,
        createDto.placeOfBirth || null,
        createDto.contactInfo ? JSON.stringify(createDto.contactInfo) : null,
        createDto.profilePictureUrl || null,
        createDto.dateOfBirth || null,
        createDto.dateOfDeath || null,
        createDto.userId,
        NodeStatus.DRAFT,
      ]
    );

    return result.rows[0];
  }

  async getNodes(treeId: string, userId: string): Promise<Node[]> {
    await this.accessControl.checkAccess(treeId, userId);

    const result = await query<Node>(
      `SELECT ${NODE_SELECT_FIELDS}
       FROM nodes 
       WHERE tree_id = $1 AND (status = 'published' OR created_by = $2)`,
      [treeId, userId]
    );

    return result.rows;
  }

  async getNodeById(nodeId: string, userId: string): Promise<Node> {
    const result = await query<Node>(
      `SELECT ${NODE_SELECT_FIELDS} FROM nodes WHERE node_id = $1`,
      [nodeId]
    );

    if (result.rows.length === 0) {
      throw new AppError('Node not found', 404);
    }

    const node = result.rows[0];
    await this.accessControl.checkAccess(node.treeId, userId);

    if (node.status === NodeStatus.DRAFT && node.createdBy !== userId) {
      throw new AppError('Node not found', 404);
    }

    return node;
  }


  async updateNode(nodeId: string, userId: string, updateDto: UpdateNodeDto): Promise<Node> {
    const existingResult = await query<Node>(
      `SELECT node_id as "nodeId", tree_id as "treeId", status, created_by as "createdBy" FROM nodes WHERE node_id = $1`,
      [nodeId]
    );

    if (existingResult.rows.length === 0) {
      throw new AppError('Node not found', 404);
    }

    const node = existingResult.rows[0];
    await this.accessControl.requireEditAccess(node.treeId, userId);

    if (node.status === NodeStatus.DRAFT && node.createdBy !== userId) {
      throw new AppError('Node not found', 404);
    }

    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (updateDto.firstName !== undefined) {
      updates.push(`first_name = $${paramIndex++}`);
      values.push(updateDto.firstName);
    }
    if (updateDto.lastName !== undefined) {
      updates.push(`last_name = $${paramIndex++}`);
      values.push(updateDto.lastName);
    }
    if (updateDto.petName !== undefined) {
      updates.push(`pet_name = $${paramIndex++}`);
      values.push(updateDto.petName);
    }
    if (updateDto.address !== undefined) {
      updates.push(`address = $${paramIndex++}`);
      values.push(updateDto.address);
    }
    if (updateDto.placeOfBirth !== undefined) {
      updates.push(`place_of_birth = $${paramIndex++}`);
      values.push(updateDto.placeOfBirth);
    }
    if (updateDto.contactInfo !== undefined) {
      updates.push(`contact_info = $${paramIndex++}`);
      values.push(JSON.stringify(updateDto.contactInfo));
    }
    if (updateDto.profilePictureUrl !== undefined) {
      updates.push(`profile_picture_url = $${paramIndex++}`);
      values.push(updateDto.profilePictureUrl);
    }
    if (updateDto.dateOfBirth !== undefined) {
      updates.push(`date_of_birth = $${paramIndex++}`);
      values.push(updateDto.dateOfBirth);
    }
    if (updateDto.dateOfDeath !== undefined) {
      updates.push(`date_of_death = $${paramIndex++}`);
      values.push(updateDto.dateOfDeath);
    }

    if (updates.length === 0) {
      return this.getNodeById(nodeId, userId);
    }

    updates.push(`updated_at = NOW()`);
    values.push(nodeId);

    const result = await query<Node>(
      `UPDATE nodes SET ${updates.join(', ')} WHERE node_id = $${paramIndex}
       RETURNING ${NODE_SELECT_FIELDS}`,
      values
    );

    return result.rows[0];
  }

  async deleteNode(nodeId: string, userId: string): Promise<void> {
    const result = await query<Node>(
      `SELECT node_id as "nodeId", tree_id as "treeId", status, created_by as "createdBy" FROM nodes WHERE node_id = $1`,
      [nodeId]
    );

    if (result.rows.length === 0) {
      throw new AppError('Node not found', 404);
    }

    const node = result.rows[0];
    await this.accessControl.requireEditAccess(node.treeId, userId);

    if (node.status === NodeStatus.DRAFT && node.createdBy !== userId) {
      throw new AppError('Node not found', 404);
    }

    await query('DELETE FROM nodes WHERE node_id = $1', [nodeId]);
  }

  async publishNode(nodeId: string, userId: string): Promise<Node> {
    const nodeResult = await query<Node>(
      `SELECT ${NODE_SELECT_FIELDS} FROM nodes WHERE node_id = $1`,
      [nodeId]
    );

    if (nodeResult.rows.length === 0) {
      throw new AppError('Node not found', 404);
    }

    const node = nodeResult.rows[0];
    await this.accessControl.requireEditAccess(node.treeId, userId);

    if (node.status === NodeStatus.DRAFT && node.createdBy !== userId) {
      throw new AppError('Node not found', 404);
    }

    if (node.status === NodeStatus.PUBLISHED) {
      return node;
    }

    const isFirstNode = await this.isFirstNodeInTree(node.treeId);
    
    if (!isFirstNode) {
      const hasRelationshipToPublished = await this.hasRelationshipToPublishedNode(nodeId, node.treeId);
      if (!hasRelationshipToPublished) {
        throw new AppError('Node must have a relationship to a published node before publishing', 400);
      }
    }

    const result = await query<Node>(
      `UPDATE nodes SET status = $1, published_at = NOW(), updated_at = NOW() WHERE node_id = $2
       RETURNING ${NODE_SELECT_FIELDS}`,
      [NodeStatus.PUBLISHED, nodeId]
    );

    const publishedNode = result.rows[0];
    const displayName = this.getDisplayName(publishedNode);
    await this.notificationService.notifyNodePublished(node.treeId, nodeId, displayName, userId);

    return publishedNode;
  }

  private async isFirstNodeInTree(treeId: string): Promise<boolean> {
    const result = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM nodes WHERE tree_id = $1 AND status = 'published'`,
      [treeId]
    );
    return parseInt(result.rows[0].count, 10) === 0;
  }

  private async hasRelationshipToPublishedNode(nodeId: string, treeId: string): Promise<boolean> {
    const result = await query<{ count: string }>(
      `SELECT COUNT(*) as count 
       FROM relationships r
       JOIN nodes n ON (
         (r.node_id_1 = $1 AND r.node_id_2 = n.node_id) OR 
         (r.node_id_2 = $1 AND r.node_id_1 = n.node_id)
       )
       WHERE r.tree_id = $2 AND n.status = 'published'`,
      [nodeId, treeId]
    );
    return parseInt(result.rows[0].count, 10) > 0;
  }

  getDisplayName(node: Node): string {
    if (node.petName) {
      return node.petName;
    }
    return `${node.firstName} ${node.lastName}`;
  }
}
