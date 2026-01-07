import { query, transaction } from '../../config/database';
import { SamePersonLink, NotificationType } from '../../database/interfaces';
import { AccessControlService, AccessLevel } from '../../common/services/access-control.service';
import { NotificationService } from '../notification/notification.service';
import { AppError } from '../../common/errors/app-error';
import { PoolClient } from 'pg';

interface CreateSamePersonLinkDto {
  nodeId1: string;
  nodeId2: string;
  userId: string;
}

interface NodeWithTree {
  nodeId: string;
  treeId: string;
  firstName?: string;
  lastName?: string;
  petName?: string;
}

interface LinkedTree {
  treeId: string;
  treeName: string;
  linkedNodeId: string;
}

export class SamePersonLinkService {
  private accessControl: AccessControlService;
  private notificationService: NotificationService;

  constructor() {
    this.accessControl = new AccessControlService();
    this.notificationService = new NotificationService();
  }

  async createSamePersonLink(dto: CreateSamePersonLinkDto): Promise<SamePersonLink> {
    const nodesResult = await query<NodeWithTree>(
      `SELECT node_id as "nodeId", tree_id as "treeId", first_name as "firstName", last_name as "lastName", pet_name as "petName"
       FROM nodes 
       WHERE node_id IN ($1, $2)`,
      [dto.nodeId1, dto.nodeId2]
    );

    if (nodesResult.rows.length !== 2) {
      throw new AppError('One or both nodes not found', 404);
    }

    const node1 = nodesResult.rows.find(n => n.nodeId === dto.nodeId1);
    const node2 = nodesResult.rows.find(n => n.nodeId === dto.nodeId2);

    if (!node1 || !node2) {
      throw new AppError('One or both nodes not found', 404);
    }

    if (node1.treeId === node2.treeId) {
      throw new AppError('Nodes must belong to different trees', 400);
    }

    const access1 = await this.accessControl.getAccessLevel(node1.treeId, dto.userId);
    const access2 = await this.accessControl.getAccessLevel(node2.treeId, dto.userId);

    const hasEditAccess1 = access1 === AccessLevel.EDITOR || access1 === AccessLevel.OWNER;
    const hasEditAccess2 = access2 === AccessLevel.EDITOR || access2 === AccessLevel.OWNER;

    if (!hasEditAccess1 && !hasEditAccess2) {
      throw new AppError('Edit access to at least one tree is required', 403);
    }

    const existingLink = await query<{ linkId: string }>(
      `SELECT link_id as "linkId" FROM same_person_links 
       WHERE (node_id_1 = $1 AND node_id_2 = $2) OR (node_id_1 = $2 AND node_id_2 = $1)`,
      [dto.nodeId1, dto.nodeId2]
    );

    if (existingLink.rows.length > 0) {
      throw new AppError('Same person link already exists', 409);
    }

    const result = await query<SamePersonLink>(
      `INSERT INTO same_person_links (node_id_1, node_id_2, created_by)
       VALUES ($1, $2, $3)
       RETURNING link_id as "linkId", node_id_1 as "nodeId1", node_id_2 as "nodeId2", created_by as "createdBy", created_at as "createdAt"`,
      [dto.nodeId1, dto.nodeId2, dto.userId]
    );

    await this.notifyTreeOwners(node1.treeId, node2.treeId, result.rows[0].linkId, dto.userId);

    return result.rows[0];
  }

  private async notifyTreeOwners(treeId1: string, treeId2: string, linkId: string, creatorUserId: string): Promise<void> {
    const ownersResult = await query<{ userId: string; treeId: string }>(
      `SELECT user_id as "userId", tree_id as "treeId" FROM tree_access 
       WHERE tree_id IN ($1, $2) AND access_level = 'owner'`,
      [treeId1, treeId2]
    );

    for (const owner of ownersResult.rows) {
      if (owner.userId !== creatorUserId) {
        await this.notificationService.createNotification({
          userId: owner.userId,
          notificationType: NotificationType.SAME_PERSON_LINK_CREATED,
          message: 'A same person link has been created connecting your family tree to another tree',
          relatedEntityType: 'same_person_link',
          relatedEntityId: linkId,
        });
      }
    }
  }

  async getLinkedNodes(nodeId: string, userId: string): Promise<NodeWithTree[]> {
    const nodeResult = await query<{ treeId: string }>(
      `SELECT tree_id as "treeId" FROM nodes WHERE node_id = $1`,
      [nodeId]
    );

    if (nodeResult.rows.length === 0) {
      throw new AppError('Node not found', 404);
    }

    await this.accessControl.checkAccess(nodeResult.rows[0].treeId, userId);

    const result = await query<NodeWithTree>(
      `SELECT n.node_id as "nodeId", n.tree_id as "treeId", n.first_name as "firstName", n.last_name as "lastName", n.pet_name as "petName"
       FROM nodes n
       INNER JOIN (
         SELECT node_id_2 as linked_node_id FROM same_person_links WHERE node_id_1 = $1
         UNION
         SELECT node_id_1 as linked_node_id FROM same_person_links WHERE node_id_2 = $1
       ) links ON n.node_id = links.linked_node_id`,
      [nodeId]
    );

    return result.rows;
  }

  async getLinkedTrees(nodeId: string, userId: string): Promise<LinkedTree[]> {
    const nodeResult = await query<{ treeId: string }>(
      `SELECT tree_id as "treeId" FROM nodes WHERE node_id = $1`,
      [nodeId]
    );

    if (nodeResult.rows.length === 0) {
      throw new AppError('Node not found', 404);
    }

    await this.accessControl.checkAccess(nodeResult.rows[0].treeId, userId);

    const result = await query<LinkedTree>(
      `SELECT ft.tree_id as "treeId", ft.tree_name as "treeName", n.node_id as "linkedNodeId"
       FROM family_trees ft
       INNER JOIN nodes n ON ft.tree_id = n.tree_id
       INNER JOIN (
         SELECT node_id_2 as linked_node_id FROM same_person_links WHERE node_id_1 = $1
         UNION
         SELECT node_id_1 as linked_node_id FROM same_person_links WHERE node_id_2 = $1
       ) links ON n.node_id = links.linked_node_id`,
      [nodeId]
    );

    return result.rows;
  }

  async deleteSamePersonLink(linkId: string, userId: string): Promise<void> {
    const linkResult = await query<{ nodeId1: string; nodeId2: string }>(
      `SELECT node_id_1 as "nodeId1", node_id_2 as "nodeId2" FROM same_person_links WHERE link_id = $1`,
      [linkId]
    );

    if (linkResult.rows.length === 0) {
      throw new AppError('Same person link not found', 404);
    }

    const { nodeId1, nodeId2 } = linkResult.rows[0];

    const nodesResult = await query<{ treeId: string }>(
      `SELECT tree_id as "treeId" FROM nodes WHERE node_id IN ($1, $2)`,
      [nodeId1, nodeId2]
    );

    let isOwner = false;
    for (const node of nodesResult.rows) {
      const accessLevel = await this.accessControl.getAccessLevel(node.treeId, userId);
      if (accessLevel === AccessLevel.OWNER) {
        isOwner = true;
        break;
      }
    }

    if (!isOwner) {
      throw new AppError('Only tree owners can delete same person links', 403);
    }

    await query('DELETE FROM same_person_links WHERE link_id = $1', [linkId]);
  }

  async getLinkById(linkId: string, userId: string): Promise<SamePersonLink> {
    const result = await query<SamePersonLink>(
      `SELECT link_id as "linkId", node_id_1 as "nodeId1", node_id_2 as "nodeId2", created_by as "createdBy", created_at as "createdAt"
       FROM same_person_links WHERE link_id = $1`,
      [linkId]
    );

    if (result.rows.length === 0) {
      throw new AppError('Same person link not found', 404);
    }

    const link = result.rows[0];

    const nodeResult = await query<{ treeId: string }>(
      `SELECT tree_id as "treeId" FROM nodes WHERE node_id = $1`,
      [link.nodeId1]
    );

    if (nodeResult.rows.length > 0) {
      await this.accessControl.checkAccess(nodeResult.rows[0].treeId, userId);
    }

    return link;
  }
}
