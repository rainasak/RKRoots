export enum AccessLevel {
  OWNER = 'owner',
  EDITOR = 'editor',
  VIEWER = 'viewer',
}

export enum AuthProvider {
  EMAIL = 'email',
  GOOGLE = 'google',
  APPLE = 'apple',
}

export enum EntityType {
  NODE = 'node',
  EVENT = 'event',
  RELATIONSHIP = 'relationship',
}

export enum NotificationType {
  ACCESS_GRANTED = 'access_granted',
  SAME_PERSON_LINK_CREATED = 'same_person_link_created',
  ACCESS_REQUEST = 'access_request',
  COMMENT_ADDED = 'comment_added',
  NODE_PUBLISHED = 'node_published',
  TIMELINE_EVENT_ADDED = 'timeline_event_added',
}

export enum AlbumSource {
  GOOGLE_DRIVE = 'google_drive',
  GOOGLE_PHOTOS = 'google_photos',
}

export enum RelationshipType {
  PARENT_CHILD = 'parent_child',
  SPOUSE = 'spouse',
  SIBLING = 'sibling',
  ADOPTED = 'adopted',
  STEP = 'step',
}

export enum EventType {
  BIRTH = 'birth',
  MARRIAGE = 'marriage',
  DEATH = 'death',
  MILESTONE = 'milestone',
  ACHIEVEMENT = 'achievement',
  MEMORY = 'memory',
}

export enum AccessRequestStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  DENIED = 'denied',
}

export enum NodeStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
}

export interface User {
  userId: string;
  email: string;
  passwordHash?: string;
  authProvider: AuthProvider;
  authProviderId?: string;
  displayName: string;
  profilePictureUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FamilyTree {
  treeId: string;
  treeName: string;
  description?: string;
  ownerUserId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Node {
  nodeId: string;
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
  status: NodeStatus;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
}

export interface TreeAccess {
  accessId: string;
  treeId: string;
  userId: string;
  accessLevel: AccessLevel;
  grantedBy: string;
  grantedAt: Date;
}

export interface Relationship {
  relationshipId: string;
  treeId: string;
  nodeId1: string;
  nodeId2: string;
  relationshipType: RelationshipType;
  createdAt: Date;
}

export interface TimelineEvent {
  eventId: string;
  treeId: string;
  eventType: EventType;
  title: string;
  description?: string;
  eventDate: Date;
  location?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface EventParticipant {
  participantId: string;
  eventId: string;
  nodeId: string;
  role?: string;
}

export interface Comment {
  commentId: string;
  treeId: string;
  entityType: EntityType;
  entityId: string;
  userId: string;
  commentText: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Notification {
  notificationId: string;
  userId: string;
  notificationType: NotificationType;
  message: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  isRead: boolean;
  createdAt: Date;
}

export interface PhotoAlbum {
  albumId: string;
  treeId: string;
  albumSource: AlbumSource;
  albumIdentifier: string;
  albumName: string;
  createdBy: string;
  createdAt: Date;
}

export interface SamePersonLink {
  linkId: string;
  nodeId1: string;
  nodeId2: string;
  createdBy: string;
  createdAt: Date;
}

export interface AccessRequest {
  requestId: string;
  treeId: string;
  userId: string;
  requestedLevel: 'viewer' | 'editor';
  grantedLevel?: 'viewer' | 'editor';
  status: AccessRequestStatus;
  requestedAt: Date;
  resolvedAt?: Date;
  resolvedBy?: string;
}

export interface ConsolidatedNode {
  consolidatedId: string;
  primaryNodeId: string;
  createdAt: Date;
}

export interface NodeConsolidationMapping {
  mappingId: string;
  consolidatedId: string;
  nodeId: string;
  treeId: string;
  createdAt: Date;
}
