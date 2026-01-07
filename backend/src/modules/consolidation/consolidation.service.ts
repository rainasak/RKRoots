import { query, transaction } from '../../config/database';
import { Node, ConsolidatedNode, NodeConsolidationMapping } from '../../database/interfaces';
import { AccessControlService } from '../../common/services/access-control.service';
import { AppError } from '../../common/errors/app-error';

export class ConsolidationService {
  private accessControl: AccessControlService;

  constructor() {
    this.accessControl = new AccessControlService();
  }

  async searchDuplicates(nodeId: string, userId: string): Promise<Node[]> {
    const nodeResult = await query<Node>(
      `SELECT node_id as "nodeId", tree_id as "treeId", first_name as "firstName", last_name as "lastName", pet_name as "petName"
       FROM nodes WHERE node_id = $1`,
      [nodeId]
    );

    if (nodeResult.rows.length === 0) {
      throw new AppError('Node not found', 404);
    }

    const node = nodeResult.rows[0];

    const result = await query<Node>(
      `SELECT n.node_id as "nodeId", n.tree_id as "treeId", n.first_name as "firstName", n.last_name as "lastName", n.pet_name as "petName", n.address, n.place_of_birth as "placeOfBirth", n.contact_info as "contactInfo", n.profile_picture_url as "profilePictureUrl", n.date_of_birth as "dateOfBirth", n.date_of_death as "dateOfDeath", n.created_by as "createdBy", n.created_at as "createdAt", n.updated_at as "updatedAt"
       FROM nodes n
       JOIN tree_access ta ON n.tree_id = ta.tree_id
       WHERE ta.user_id = $1
         AND n.node_id != $2
         AND ((n.first_name = $3 AND n.last_name = $4) OR n.pet_name = $5)`,
      [userId, nodeId, node.firstName, node.lastName, node.petName]
    );

    return result.rows;
  }

  async consolidateNodes(primaryNodeId: string, secondaryNodeId: string, userId: string): Promise<ConsolidatedNode> {
    const primaryResult = await query<Node>(
      `SELECT node_id as "nodeId", tree_id as "treeId" FROM nodes WHERE node_id = $1`,
      [primaryNodeId]
    );

    const secondaryResult = await query<Node>(
      `SELECT node_id as "nodeId", tree_id as "treeId" FROM nodes WHERE node_id = $1`,
      [secondaryNodeId]
    );

    if (primaryResult.rows.length === 0 || secondaryResult.rows.length === 0) {
      throw new AppError('Nodes not found', 404);
    }

    const primary = primaryResult.rows[0];
    const secondary = secondaryResult.rows[0];

    await this.accessControl.checkAccess(primary.treeId, userId);
    await this.accessControl.checkAccess(secondary.treeId, userId);

    return await transaction(async (client) => {
      const consolidatedResult = await client.query<ConsolidatedNode>(
        `INSERT INTO consolidated_nodes (primary_node_id)
         VALUES ($1)
         RETURNING consolidated_id as "consolidatedId", primary_node_id as "primaryNodeId", created_at as "createdAt"`,
        [primaryNodeId]
      );

      const consolidated = consolidatedResult.rows[0];

      await client.query(
        `INSERT INTO node_consolidation_mappings (consolidated_id, node_id, tree_id)
         VALUES ($1, $2, $3), ($1, $4, $5)`,
        [consolidated.consolidatedId, primaryNodeId, primary.treeId, secondaryNodeId, secondary.treeId]
      );

      return consolidated;
    });
  }

  async getLinkedTrees(nodeId: string, userId: string): Promise<string[]> {
    const mappingResult = await query<NodeConsolidationMapping>(
      `SELECT consolidated_id as "consolidatedId" FROM node_consolidation_mappings WHERE node_id = $1`,
      [nodeId]
    );

    if (mappingResult.rows.length === 0) {
      return [];
    }

    const consolidatedId = mappingResult.rows[0].consolidatedId;

    const result = await query<{ treeId: string }>(
      `SELECT tree_id as "treeId" FROM node_consolidation_mappings WHERE consolidated_id = $1`,
      [consolidatedId]
    );

    return result.rows.map(r => r.treeId);
  }
}
