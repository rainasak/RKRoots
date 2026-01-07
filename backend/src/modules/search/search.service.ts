import { query } from '../../config/database';
import { Node } from '../../database/interfaces';
import { AccessControlService } from '../../common/services/access-control.service';
import { AppError } from '../../common/errors/app-error';

interface SearchFilters {
  firstName?: string;
  lastName?: string;
  petName?: string;
  placeOfBirth?: string;
}

interface SearchResult extends Omit<Node, 'status'> {
  treeName: string;
}

export class SearchService {
  private accessControl: AccessControlService;
  private static readonly MIN_SEARCH_LENGTH = 3;

  constructor() {
    this.accessControl = new AccessControlService();
  }

  private validateSearchQuery(searchQuery: string): void {
    if (!searchQuery || searchQuery.length < SearchService.MIN_SEARCH_LENGTH) {
      throw new AppError('Search query must be at least 3 characters', 400);
    }
  }

  async searchNodes(userId: string, searchQuery: string, filters?: SearchFilters): Promise<SearchResult[]> {
    this.validateSearchQuery(searchQuery);

    const conditions: string[] = ["n.status = 'published'"];
    const values: unknown[] = [userId];
    let paramIndex = 2;

    conditions.push(`(n.first_name ILIKE $${paramIndex} OR n.last_name ILIKE $${paramIndex} OR n.pet_name ILIKE $${paramIndex})`);
    values.push(`%${searchQuery}%`);
    paramIndex++;

    if (filters?.firstName) {
      conditions.push(`n.first_name ILIKE $${paramIndex}`);
      values.push(`%${filters.firstName}%`);
      paramIndex++;
    }

    if (filters?.lastName) {
      conditions.push(`n.last_name ILIKE $${paramIndex}`);
      values.push(`%${filters.lastName}%`);
      paramIndex++;
    }

    if (filters?.petName) {
      conditions.push(`n.pet_name ILIKE $${paramIndex}`);
      values.push(`%${filters.petName}%`);
      paramIndex++;
    }

    if (filters?.placeOfBirth) {
      conditions.push(`n.place_of_birth ILIKE $${paramIndex}`);
      values.push(`%${filters.placeOfBirth}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `AND ${conditions.join(' AND ')}` : '';

    const result = await query<SearchResult>(
      `SELECT n.node_id as "nodeId", n.tree_id as "treeId", n.first_name as "firstName", 
              n.last_name as "lastName", n.pet_name as "petName", n.address, 
              n.place_of_birth as "placeOfBirth", n.contact_info as "contactInfo", 
              n.profile_picture_url as "profilePictureUrl", n.date_of_birth as "dateOfBirth", 
              n.date_of_death as "dateOfDeath", n.created_by as "createdBy", 
              n.created_at as "createdAt", n.updated_at as "updatedAt", 
              ft.tree_name as "treeName"
       FROM nodes n
       JOIN family_trees ft ON n.tree_id = ft.tree_id
       JOIN tree_access ta ON ft.tree_id = ta.tree_id
       WHERE ta.user_id = $1 ${whereClause}`,
      values
    );

    return result.rows;
  }

  async searchInTree(treeId: string, userId: string, searchQuery: string): Promise<Node[]> {
    this.validateSearchQuery(searchQuery);
    await this.accessControl.checkAccess(treeId, userId);

    const result = await query<Node>(
      `SELECT node_id as "nodeId", tree_id as "treeId", first_name as "firstName", 
              last_name as "lastName", pet_name as "petName", address, 
              place_of_birth as "placeOfBirth", contact_info as "contactInfo", 
              profile_picture_url as "profilePictureUrl", date_of_birth as "dateOfBirth", 
              date_of_death as "dateOfDeath", status, created_by as "createdBy", 
              created_at as "createdAt", updated_at as "updatedAt"
       FROM nodes
       WHERE tree_id = $1 AND status = 'published' 
         AND (first_name ILIKE $2 OR last_name ILIKE $2 OR pet_name ILIKE $2)`,
      [treeId, `%${searchQuery}%`]
    );

    return result.rows;
  }
}
