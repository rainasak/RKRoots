import { query } from '../../config/database';
import { AccessRequest, AccessRequestStatus, AccessLevel, NotificationType } from '../../database/interfaces';
import { AccessControlService } from '../../common/services/access-control.service';
import { NotificationService } from '../notification/notification.service';
import { AppError } from '../../common/errors/app-error';

interface LinkedTreeInfo {
  linkedNodeId: string;
  linkedTreeId: string;
  linkedTreeName: string;
  hasAccess: boolean;
  userAccessLevel: AccessLevel | null;
  canRequestAccess: boolean;
  hasPendingRequest: boolean;
}

interface GetLinkedTreeInfoResult {
  hasLinkedTree: boolean;
  linkedTrees: LinkedTreeInfo[];
}

interface SubmitAccessRequestDto {
  treeId: string;
  userId: string;
  requestedLevel: 'viewer' | 'editor';
}

export class AccessRequestService {
  private accessControl: AccessControlService;
  private notificationService: NotificationService;

  constructor() {
    this.accessControl = new AccessControlService();
    this.notificationService = new NotificationService();
  }

  async getLinkedTreeInfo(nodeId: string, userId: string): Promise<GetLinkedTreeInfoResult> {
    const nodeResult = await query<{ treeId: string }>(
      `SELECT tree_id as "treeId" FROM nodes WHERE node_id = $1`,
      [nodeId]
    );

    if (nodeResult.rows.length === 0) {
      throw new AppError('Node not found', 404);
    }

    await this.accessControl.checkAccess(nodeResult.rows[0].treeId, userId);

    const linkedTreesResult = await query<{
      linkedNodeId: string;
      linkedTreeId: string;
      linkedTreeName: string;
      userAccessLevel: AccessLevel | null;
      pendingRequest: boolean;
    }>(
      `SELECT 
        n.node_id as "linkedNodeId",
        n.tree_id as "linkedTreeId",
        ft.tree_name as "linkedTreeName",
        ta.access_level as "userAccessLevel",
        CASE WHEN ar.request_id IS NOT NULL AND ar.status = 'pending' THEN true ELSE false END as "pendingRequest"
       FROM nodes n
       INNER JOIN family_trees ft ON n.tree_id = ft.tree_id
       INNER JOIN (
         SELECT node_id_2 as linked_node_id FROM same_person_links WHERE node_id_1 = $1
         UNION
         SELECT node_id_1 as linked_node_id FROM same_person_links WHERE node_id_2 = $1
       ) links ON n.node_id = links.linked_node_id
       LEFT JOIN tree_access ta ON ft.tree_id = ta.tree_id AND ta.user_id = $2
       LEFT JOIN access_requests ar ON ft.tree_id = ar.tree_id AND ar.user_id = $2 AND ar.status = 'pending'`,
      [nodeId, userId]
    );

    const linkedTrees: LinkedTreeInfo[] = linkedTreesResult.rows.map(row => ({
      linkedNodeId: row.linkedNodeId,
      linkedTreeId: row.linkedTreeId,
      linkedTreeName: row.linkedTreeName,
      hasAccess: row.userAccessLevel !== null,
      userAccessLevel: row.userAccessLevel,
      canRequestAccess: row.userAccessLevel === null && !row.pendingRequest,
      hasPendingRequest: row.pendingRequest,
    }));

    return {
      hasLinkedTree: linkedTrees.length > 0,
      linkedTrees,
    };
  }

  async submitAccessRequest(dto: SubmitAccessRequestDto): Promise<AccessRequest> {
    const existingAccess = await this.accessControl.getAccessLevel(dto.treeId, dto.userId);
    if (existingAccess !== null) {
      throw new AppError('User already has access to this tree', 409);
    }

    const existingRequest = await query<{ requestId: string }>(
      `SELECT request_id as "requestId" FROM access_requests 
       WHERE tree_id = $1 AND user_id = $2 AND status = 'pending'`,
      [dto.treeId, dto.userId]
    );

    if (existingRequest.rows.length > 0) {
      throw new AppError('Access request already pending', 409);
    }

    const result = await query<AccessRequest>(
      `INSERT INTO access_requests (tree_id, user_id, requested_level)
       VALUES ($1, $2, $3)
       RETURNING request_id as "requestId", tree_id as "treeId", user_id as "userId", 
                 requested_level as "requestedLevel", status, requested_at as "requestedAt"`,
      [dto.treeId, dto.userId, dto.requestedLevel]
    );

    const ownerResult = await query<{ ownerUserId: string }>(
      `SELECT owner_user_id as "ownerUserId" FROM family_trees WHERE tree_id = $1`,
      [dto.treeId]
    );

    if (ownerResult.rows.length > 0) {
      await this.notificationService.createNotification({
        userId: ownerResult.rows[0].ownerUserId,
        notificationType: NotificationType.ACCESS_REQUEST,
        message: 'A user has requested access to your family tree',
        relatedEntityType: 'access_request',
        relatedEntityId: result.rows[0].requestId,
      });
    }

    return result.rows[0];
  }

  async getAccessRequests(treeId: string, userId: string): Promise<AccessRequest[]> {
    await this.accessControl.requireOwnerAccess(treeId, userId);

    const result = await query<AccessRequest & { userDisplayName: string; userEmail: string }>(
      `SELECT ar.request_id as "requestId", ar.tree_id as "treeId", ar.user_id as "userId",
              ar.requested_level as "requestedLevel", ar.status, ar.requested_at as "requestedAt",
              ar.resolved_at as "resolvedAt", ar.resolved_by as "resolvedBy",
              u.display_name as "userDisplayName", u.email as "userEmail"
       FROM access_requests ar
       JOIN users u ON ar.user_id = u.user_id
       WHERE ar.tree_id = $1
       ORDER BY ar.requested_at DESC`,
      [treeId]
    );

    return result.rows;
  }

  async resolveAccessRequest(
    requestId: string, 
    userId: string, 
    approved: boolean,
    grantedLevel?: 'viewer' | 'editor'
  ): Promise<void> {
    const requestResult = await query<AccessRequest>(
      `SELECT request_id as "requestId", tree_id as "treeId", user_id as "userId",
              requested_level as "requestedLevel", status, requested_at as "requestedAt",
              resolved_at as "resolvedAt", resolved_by as "resolvedBy"
       FROM access_requests WHERE request_id = $1`,
      [requestId]
    );

    if (requestResult.rows.length === 0) {
      throw new AppError('Access request not found', 404);
    }

    const request = requestResult.rows[0];

    if (request.status !== AccessRequestStatus.PENDING) {
      throw new AppError('Access request has already been resolved', 400);
    }

    await this.accessControl.requireOwnerAccess(request.treeId, userId);

    const status = approved ? AccessRequestStatus.APPROVED : AccessRequestStatus.DENIED;
    const levelToGrant = approved ? (grantedLevel || request.requestedLevel) : null;

    if (approved && levelToGrant) {
      await this.accessControl.grantAccess(
        request.treeId,
        request.userId,
        levelToGrant as AccessLevel,
        userId
      );
    }

    await query(
      `UPDATE access_requests 
       SET status = $1, granted_level = $2, resolved_at = NOW(), resolved_by = $3 
       WHERE request_id = $4`,
      [status, levelToGrant, userId, requestId]
    );

    const message = approved
      ? `Your access request has been approved. You now have ${levelToGrant} access.`
      : 'Your access request has been denied.';

    await this.notificationService.createNotification({
      userId: request.userId,
      notificationType: approved ? NotificationType.ACCESS_GRANTED : NotificationType.ACCESS_REQUEST,
      message,
      relatedEntityType: 'tree',
      relatedEntityId: request.treeId,
    });
  }

  async approveAccessRequest(requestId: string, userId: string, grantedLevel?: 'viewer' | 'editor'): Promise<void> {
    return this.resolveAccessRequest(requestId, userId, true, grantedLevel);
  }

  async denyAccessRequest(requestId: string, userId: string): Promise<void> {
    return this.resolveAccessRequest(requestId, userId, false);
  }

  async getRequestById(requestId: string, userId: string): Promise<AccessRequest> {
    const result = await query<AccessRequest>(
      `SELECT request_id as "requestId", tree_id as "treeId", user_id as "userId",
              requested_level as "requestedLevel", status, requested_at as "requestedAt",
              resolved_at as "resolvedAt", resolved_by as "resolvedBy"
       FROM access_requests WHERE request_id = $1`,
      [requestId]
    );

    if (result.rows.length === 0) {
      throw new AppError('Access request not found', 404);
    }

    const request = result.rows[0];

    if (request.userId !== userId) {
      const accessLevel = await this.accessControl.getAccessLevel(request.treeId, userId);
      if (accessLevel !== AccessLevel.OWNER) {
        throw new AppError('Access denied', 403);
      }
    }

    return request;
  }
}
