# RKRoots Feature List

## 1. User Authentication & Authorization
- SSO integration (Google, Apple, Facebook)
- Email/password authentication
- Profile management
- Session management with JWT

## 2. Family Tree Creation & Management
- Create new family trees with starting ancestor nodes
- Add nodes with mandatory fields: (firstName + lastName) OR petName
- Optional fields: address, placeOfBirth, contactInfo, profilePicture
- Display name logic: petName if available, else firstName + lastName
- Visual tree rendering with pan/zoom
- Different connection line styles for relationship types

## 3. Node Management
- Create, edit, delete nodes
- Upload profile pictures
- Field validation with helper text
- Node detail view

## 4. Relationship Management
- Define relationship types: parent-child, spouse, sibling, adopted, step-family
- Visual differentiation through line styles
- Bidirectional relationship creation

## 5. Access Control & Sharing
- Invite users via email/link
- Access levels: Owner, Editor, Viewer
- Permission inheritance and override
- Access request workflow
- Revoke access

## 6. Timeline Feature
- Create timeline events for individuals, couples, families
- Event types: birth, marriage, death, milestone, achievement, memory
- Event details: date, description, photos, location
- Chronological display
- Filter by person/family/date range

## 7. Commenting System
- Comment on nodes (people)
- Comment on timeline events
- Comment on families/relationships
- Edit/delete own comments
- Notification system for comments

## 8. Node Consolidation
- Search for duplicate nodes across trees
- Send consolidation requests
- Approve/reject consolidation
- Merge node data with conflict resolution
- Maintain references in both trees

## 9. Cross-Tree Navigation
- Click on consolidated nodes to view linked trees
- Automatic view access to linked trees
- Automatic edit access if user has permissions
- Breadcrumb navigation
- Access level indicators

## 10. Photo Album Integration
- Link Google Drive folders
- Link Google Photos albums
- Display as background/slideshow
- Permission verification
- Refresh mechanism

## 11. Search & Discovery
- Search within tree
- Search across accessible trees
- Filter by relationship, generation, location
- Advanced search with multiple criteria

## 12. Notifications
- Access granted/revoked
- Consolidation requests
- Comments on nodes/events
- Timeline event additions
- Push notifications and in-app
