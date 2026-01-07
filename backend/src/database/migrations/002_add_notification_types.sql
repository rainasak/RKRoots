-- Migration: 002_add_notification_types
-- Description: Adds new notification types for node_published and timeline_event_added

-- Drop and recreate the constraint with new notification types
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_notification_type_check;

ALTER TABLE notifications ADD CONSTRAINT notifications_notification_type_check CHECK (
  notification_type IN ('access_granted', 'same_person_link_created', 'access_request', 'comment_added', 'node_published', 'timeline_event_added')
);
