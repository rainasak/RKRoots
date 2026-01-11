# RKRoots Feature List

## 1. User Authentication & Authorization
- Email/password authentication with strong password requirements (8+ chars, mixed case, number, special char)
- OAuth 2.0 integration (Google, Apple)
- JWT access tokens (1h expiry) with refresh tokens (7d expiry)
- Secure password hashing with bcrypt (cost factor 12)
- Profile management (display name, profile picture, password change)

## 2. Family Tree Creation & Management
- Create family trees with name and optional description
- Automatic Owner access granted to creator
- Tree metadata updates (Owner only)
- Tree deletion with cascade (removes all nodes, relationships, access records)
- Visual tree rendering with pan/zoom gestures
- Double-tap to reset view

## 3. Node Management
- Draft/Published status workflow
- Name validation: requires (firstName AND lastName) OR petName
- Display name logic: petName takes priority, else firstName + lastName
- Optional fields: address, placeOfBirth, contactInfo (JSON), profilePictureUrl, dateOfBirth, dateOfDeath
- Draft nodes visible only to creator until published
- Visual draft indicator (badge + dashed border + reduced opacity)
- Context menu (long-press) with Publish option
- First node in tree can publish without relationship (tree root exception)

## 4. Relationship Management
- Relationship types: parent_child, spouse, sibling, adopted, step
- Both nodes must belong to same tree
- Visual differentiation through line styles:
  - Parent-Child: solid blue
  - Spouse: dashed pink
  - Sibling: solid purple
  - Adopted: dotted orange
  - Step: dash-dot gray
- Creating relationship with draft node prompts publish confirmation
- At least one node must be published (except first node)

## 5. Access Control & Sharing
- Three access levels: Owner, Editor, Viewer
- Owner: full control, can share/revoke, delete tree
- Editor: can add/edit nodes, relationships, events, comments
- Viewer: read-only access
- Share tree via user invitation
- Access request workflow for linked trees
- Revoke access (cannot revoke Owner)

## 6. Timeline Events
- Event types: birth, marriage, death, milestone, achievement, memory
- Required fields: eventType, title, eventDate
- Optional fields: description, location
- Chronological ordering by eventDate
- Edit/delete by event creator OR tree owner
- Event participants linking to nodes

## 7. Commenting System
- Comment on entities: node, event, relationship
- Edit/delete own comments only
- Comments ordered by creation timestamp
- Notifications sent to tree users (except comment creator)

## 8. Same Person Links
- Declare two nodes in different trees as same person
- Requires Editor/Owner access to at least one tree
- Validates nodes belong to different trees
- Notifies owners of both trees when link created
- Tree owners can delete links
- Enables cross-tree discovery

## 9. Cross-Tree Navigation
- Linked node indicator on node detail screen
- Direct navigation to linked trees (if user has access)
- "Request Access" option for trees without access
- Access request submission with level selection (Viewer/Editor)
- Tree owners approve/deny access requests

## 10. Photo Album Integration
- Link albums from Google Drive or Google Photos
- Store album source, identifier, and name
- Requires Editor/Owner access to link
- Album list per tree
- Delete albums with access validation

## 11. Search & Discovery
- Minimum 3 character search query
- Search by firstName, lastName, or petName
- Search within single tree or across all accessible trees
- Only published nodes included in results
- Multi-criteria filtering with AND logic
- Results include tree name for context

## 12. Notifications
- Notification types:
  - access_granted: when access is granted to a tree
  - same_person_link_created: when trees are linked
  - access_request: when someone requests access
  - comment_added: when comments are posted
  - node_published: when nodes are published
  - timeline_event_added: when events are created
- Unread notifications ordered by newest first
- Mark as read functionality
- Notification badge in mobile app
