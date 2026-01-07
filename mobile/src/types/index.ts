export interface User {
  userId: string;
  email: string;
  displayName: string;
  profilePictureUrl?: string;
}

export interface FamilyTree {
  treeId: string;
  treeName: string;
  description?: string;
  ownerUserId: string;
}

export enum NodeStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
}

export interface Node {
  nodeId: string;
  treeId: string;
  firstName?: string;
  lastName?: string;
  petName?: string;
  address?: string;
  placeOfBirth?: string;
  contactInfo?: Record<string, any>;
  profilePictureUrl?: string;
  dateOfBirth?: string;
  dateOfDeath?: string;
  status: NodeStatus;
  createdBy: string;
  createdAt?: string;
  updatedAt?: string;
  publishedAt?: string;
}

export enum RelationshipType {
  PARENT_CHILD = 'parent_child',
  SPOUSE = 'spouse',
  SIBLING = 'sibling',
  ADOPTED = 'adopted',
  STEP = 'step',
}

export interface Relationship {
  relationshipId: string;
  treeId: string;
  nodeId1: string;
  nodeId2: string;
  relationshipType: RelationshipType;
}

export enum AccessLevel {
  OWNER = 'owner',
  EDITOR = 'editor',
  VIEWER = 'viewer',
}

export enum EventType {
  BIRTH = 'birth',
  MARRIAGE = 'marriage',
  DEATH = 'death',
  MILESTONE = 'milestone',
  ACHIEVEMENT = 'achievement',
  MEMORY = 'memory',
}

export interface TimelineEvent {
  eventId: string;
  treeId: string;
  eventType: EventType;
  title: string;
  description?: string;
  eventDate: string;
  location?: string;
}

export interface SearchResult extends Omit<Node, 'status'> {
  treeName: string;
}

export interface SearchFilters {
  firstName?: string;
  lastName?: string;
  petName?: string;
  placeOfBirth?: string;
  treeId?: string;
}

export enum EntityType {
  NODE = 'node',
  EVENT = 'event',
  RELATIONSHIP = 'relationship',
}

export interface Comment {
  commentId: string;
  treeId: string;
  entityType: EntityType;
  entityId: string;
  userId: string;
  commentText: string;
  createdAt: string;
  updatedAt: string;
}

export enum NotificationType {
  ACCESS_GRANTED = 'access_granted',
  SAME_PERSON_LINK_CREATED = 'same_person_link_created',
  ACCESS_REQUEST = 'access_request',
  COMMENT_ADDED = 'comment_added',
  NODE_PUBLISHED = 'node_published',
  TIMELINE_EVENT_ADDED = 'timeline_event_added',
}

export interface Notification {
  notificationId: string;
  userId: string;
  notificationType: NotificationType;
  message: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  isRead: boolean;
  createdAt: string;
}

export enum AlbumSource {
  GOOGLE_DRIVE = 'google_drive',
  GOOGLE_PHOTOS = 'google_photos',
}

export interface PhotoAlbum {
  albumId: string;
  treeId: string;
  albumSource: AlbumSource;
  albumIdentifier: string;
  albumName: string;
  createdBy: string;
  createdAt: string;
}
