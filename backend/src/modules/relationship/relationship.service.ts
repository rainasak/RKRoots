import { query, transaction } from '../../config/database';
import { Relationship, RelationshipType, NodeStatus } from '../../database/interfaces';
import { AccessControlService } from '../../common/services/access-control.service';
import { AppError } from '../../common/errors/app-error';
import { PoolClient } from 'pg';

interface CreateRelationshipDto {
  treeId: string;
  nodeId1: string;
  nodeId2: string;
  relationshipType: RelationshipType;
  userId: string;
  publishDraftNodes?: boolean;
}

interface NodeInfo {
  nodeId: string;
  treeId: string;
  status: NodeStatus;
  createdBy: string;
}

export interface CreateRelationshipResult {
  relationship: Relationship;
  publishedNodeIds: string[];
  draftNodeIds: string[];
}

export class RelationshipService {
  private accessControl: AccessControlService;

  constructor() {
    this.accessControl = new AccessControlService();
  }

  async createRelationship(dto: CreateRelationshipDto): Promise<CreateRelationshipResult> {
    await this.accessControl.requireEditAccess(dto.treeId, dto.userId);

    const nodesResult = await query<NodeInfo>(
      `SELECT node_id as "nodeId", tree_id as "treeId", status, created_by as "createdBy"
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

    if (node1.treeId !== dto.treeId || node2.treeId !== dto.treeId) {
      throw new AppError('Both nodes must belong to the same tree', 400);
    }

    const isFirstNodeInTree = await this.isFirstNodeInTree(dto.treeId);
    const node1Published = node1.status === NodeStatus.PUBLISHED;
    const node2Published = node2.status === NodeStatus.PUBLISHED;

    if (!isFirstNodeInTree && !node1Published && !node2Published) {
      throw new AppError('At least one node must be published (unless this is the first node in the tree)', 400);
    }

    const draftNodes = [node1, node2].filter(n => n.status === NodeStatus.DRAFT);
    const publishedNodeIds: string[] = [];
    const remainingDraftNodeIds: string[] = [];

    return await transaction(async (client: PoolClient) => {
      if (dto.publishDraftNodes && draftNodes.length > 0) {
        for (const node of draftNodes) {
          if (node.createdBy !== dto.userId) {
            throw new AppError('Cannot publish a draft node created by another user', 403);
          }
          await client.query(
            `UPDATE nodes SET status = $1, published_at = NOW(), updated_at = NOW() WHERE node_id = $2`,
            [NodeStatus.PUBLISHED, node.nodeId]
          );
          publishedNodeIds.push(node.nodeId);
        }
      } else {
        for (const node of draftNodes) {
          remainingDraftNodeIds.push(node.nodeId);
        }
      }

      const result = await client.query<Relationship>(
        `INSERT INTO relationships (tree_id, node_id_1, node_id_2, relationship_type)
         VALUES ($1, $2, $3, $4)
         RETURNING relationship_id as "relationshipId", tree_id as "treeId", node_id_1 as "nodeId1", node_id_2 as "nodeId2", relationship_type as "relationshipType", created_at as "createdAt"`,
        [dto.treeId, dto.nodeId1, dto.nodeId2, dto.relationshipType]
      );

      return {
        relationship: result.rows[0],
        publishedNodeIds,
        draftNodeIds: remainingDraftNodeIds,
      };
    });
  }

  private async isFirstNodeInTree(treeId: string): Promise<boolean> {
    const result = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM nodes WHERE tree_id = $1 AND status = 'published'`,
      [treeId]
    );
    return parseInt(result.rows[0].count, 10) === 0;
  }

  async getRelationships(treeId: string, userId: string): Promise<Relationship[]> {
    await this.accessControl.checkAccess(treeId, userId);

    const result = await query<Relationship>(
      `SELECT relationship_id as "relationshipId", tree_id as "treeId", node_id_1 as "nodeId1", node_id_2 as "nodeId2", relationship_type as "relationshipType", created_at as "createdAt"
       FROM relationships 
       WHERE tree_id = $1`,
      [treeId]
    );

    return result.rows;
  }

  async getNodeRelationships(nodeId: string, userId: string): Promise<Relationship[]> {
    const nodeResult = await query<{ treeId: string }>(
      `SELECT tree_id as "treeId" FROM nodes WHERE node_id = $1`,
      [nodeId]
    );

    if (nodeResult.rows.length === 0) {
      throw new AppError('Node not found', 404);
    }

    await this.accessControl.checkAccess(nodeResult.rows[0].treeId, userId);

    const result = await query<Relationship>(
      `SELECT relationship_id as "relationshipId", tree_id as "treeId", node_id_1 as "nodeId1", node_id_2 as "nodeId2", relationship_type as "relationshipType", created_at as "createdAt"
       FROM relationships 
       WHERE node_id_1 = $1 OR node_id_2 = $1`,
      [nodeId]
    );

    return result.rows;
  }

  async getRelationshipById(relationshipId: string, userId: string): Promise<Relationship> {
    const result = await query<Relationship>(
      `SELECT relationship_id as "relationshipId", tree_id as "treeId", node_id_1 as "nodeId1", node_id_2 as "nodeId2", relationship_type as "relationshipType", created_at as "createdAt"
       FROM relationships 
       WHERE relationship_id = $1`,
      [relationshipId]
    );

    if (result.rows.length === 0) {
      throw new AppError('Relationship not found', 404);
    }

    const relationship = result.rows[0];
    await this.accessControl.checkAccess(relationship.treeId, userId);

    return relationship;
  }

  async deleteRelationship(relationshipId: string, userId: string): Promise<void> {
    const result = await query<Relationship>(
      `SELECT relationship_id as "relationshipId", tree_id as "treeId" 
       FROM relationships 
       WHERE relationship_id = $1`,
      [relationshipId]
    );

    if (result.rows.length === 0) {
      throw new AppError('Relationship not found', 404);
    }

    await this.accessControl.requireEditAccess(result.rows[0].treeId, userId);

    await query('DELETE FROM relationships WHERE relationship_id = $1', [relationshipId]);
  }
}
