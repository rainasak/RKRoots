-- RKRoots Family Tree Database Schema
-- Migration: 001_initial_schema
-- Description: Creates all tables with proper constraints, indexes, and foreign keys

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users Table
CREATE TABLE IF NOT EXISTS users (
  user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  auth_provider VARCHAR(20) NOT NULL CHECK (auth_provider IN ('email', 'google', 'apple')),
  auth_provider_id VARCHAR(255),
  display_name VARCHAR(255) NOT NULL,
  profile_picture_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Family Trees Table
CREATE TABLE IF NOT EXISTS family_trees (
  tree_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tree_name VARCHAR(255) NOT NULL,
  description TEXT,
  owner_user_id UUID NOT NULL REFERENCES users(user_id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_family_trees_owner ON family_trees(owner_user_id);

-- Nodes Table with name validation constraint
CREATE TABLE IF NOT EXISTS nodes (
  node_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tree_id UUID NOT NULL REFERENCES family_trees(tree_id) ON DELETE CASCADE,
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  pet_name VARCHAR(255),
  address TEXT,
  place_of_birth VARCHAR(255),
  contact_info JSONB,
  profile_picture_url TEXT,
  date_of_birth DATE,
  date_of_death DATE,
  status VARCHAR(10) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  created_by UUID NOT NULL REFERENCES users(user_id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  published_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT valid_node_name CHECK (
    (first_name IS NOT NULL AND TRIM(first_name) != '' AND last_name IS NOT NULL AND TRIM(last_name) != '') 
    OR (pet_name IS NOT NULL AND TRIM(pet_name) != '')
  )
);

CREATE INDEX IF NOT EXISTS idx_nodes_tree ON nodes(tree_id);
CREATE INDEX IF NOT EXISTS idx_nodes_names ON nodes(first_name, last_name, pet_name);
CREATE INDEX IF NOT EXISTS idx_nodes_status ON nodes(tree_id, status);
CREATE INDEX IF NOT EXISTS idx_nodes_created_by ON nodes(created_by);

-- Relationships Table
CREATE TABLE IF NOT EXISTS relationships (
  relationship_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tree_id UUID NOT NULL REFERENCES family_trees(tree_id) ON DELETE CASCADE,
  node_id_1 UUID NOT NULL REFERENCES nodes(node_id) ON DELETE CASCADE,
  node_id_2 UUID NOT NULL REFERENCES nodes(node_id) ON DELETE CASCADE,
  relationship_type VARCHAR(20) NOT NULL CHECK (
    relationship_type IN ('parent_child', 'spouse', 'sibling', 'adopted', 'step')
  ),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_relationships_tree ON relationships(tree_id);
CREATE INDEX IF NOT EXISTS idx_relationships_nodes ON relationships(node_id_1, node_id_2);

-- Tree Access Table
CREATE TABLE IF NOT EXISTS tree_access (
  access_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tree_id UUID NOT NULL REFERENCES family_trees(tree_id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(user_id),
  access_level VARCHAR(10) NOT NULL CHECK (access_level IN ('owner', 'editor', 'viewer')),
  granted_by UUID NOT NULL REFERENCES users(user_id),
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tree_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_tree_access_user ON tree_access(user_id);
CREATE INDEX IF NOT EXISTS idx_tree_access_tree_user ON tree_access(tree_id, user_id);

-- Timeline Events Table
CREATE TABLE IF NOT EXISTS timeline_events (
  event_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tree_id UUID NOT NULL REFERENCES family_trees(tree_id) ON DELETE CASCADE,
  event_type VARCHAR(20) NOT NULL CHECK (
    event_type IN ('birth', 'marriage', 'death', 'milestone', 'achievement', 'memory')
  ),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  location VARCHAR(255),
  created_by UUID NOT NULL REFERENCES users(user_id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_timeline_events_tree ON timeline_events(tree_id);
CREATE INDEX IF NOT EXISTS idx_timeline_events_date ON timeline_events(event_date);

-- Event Participants Table
CREATE TABLE IF NOT EXISTS event_participants (
  participant_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES timeline_events(event_id) ON DELETE CASCADE,
  node_id UUID NOT NULL REFERENCES nodes(node_id) ON DELETE CASCADE,
  role VARCHAR(100)
);

CREATE INDEX IF NOT EXISTS idx_event_participants_event ON event_participants(event_id);


-- Same Person Links Table
CREATE TABLE IF NOT EXISTS same_person_links (
  link_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  node_id_1 UUID NOT NULL REFERENCES nodes(node_id) ON DELETE CASCADE,
  node_id_2 UUID NOT NULL REFERENCES nodes(node_id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(user_id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT different_nodes CHECK (node_id_1 != node_id_2)
);

CREATE INDEX IF NOT EXISTS idx_same_person_links_nodes ON same_person_links(node_id_1, node_id_2);

-- Access Requests Table
CREATE TABLE IF NOT EXISTS access_requests (
  request_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tree_id UUID NOT NULL REFERENCES family_trees(tree_id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(user_id),
  requested_level VARCHAR(10) NOT NULL CHECK (requested_level IN ('viewer', 'editor')),
  granted_level VARCHAR(10) CHECK (granted_level IN ('viewer', 'editor')),
  status VARCHAR(10) NOT NULL CHECK (status IN ('pending', 'approved', 'denied')) DEFAULT 'pending',
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES users(user_id)
);

CREATE INDEX IF NOT EXISTS idx_access_requests_tree ON access_requests(tree_id);
CREATE INDEX IF NOT EXISTS idx_access_requests_user ON access_requests(user_id);

-- Comments Table
CREATE TABLE IF NOT EXISTS comments (
  comment_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tree_id UUID NOT NULL REFERENCES family_trees(tree_id) ON DELETE CASCADE,
  entity_type VARCHAR(20) NOT NULL CHECK (entity_type IN ('node', 'event', 'relationship')),
  entity_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES users(user_id),
  comment_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comments_entity ON comments(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_comments_tree ON comments(tree_id);

-- Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
  notification_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(user_id),
  notification_type VARCHAR(30) NOT NULL CHECK (
    notification_type IN ('access_granted', 'same_person_link_created', 'access_request', 'comment_added')
  ),
  message TEXT NOT NULL,
  related_entity_type VARCHAR(50),
  related_entity_id UUID,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;

-- Photo Albums Table
CREATE TABLE IF NOT EXISTS photo_albums (
  album_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tree_id UUID NOT NULL REFERENCES family_trees(tree_id) ON DELETE CASCADE,
  album_source VARCHAR(20) NOT NULL CHECK (album_source IN ('google_drive', 'google_photos')),
  album_identifier VARCHAR(255) NOT NULL,
  album_name VARCHAR(255) NOT NULL,
  created_by UUID NOT NULL REFERENCES users(user_id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_photo_albums_tree ON photo_albums(tree_id);


-- Consolidated Nodes Table (for cross-tree node consolidation)
CREATE TABLE IF NOT EXISTS consolidated_nodes (
  consolidated_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  primary_node_id UUID NOT NULL REFERENCES nodes(node_id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Node Consolidation Mapping Table
CREATE TABLE IF NOT EXISTS node_consolidation_mapping (
  mapping_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  consolidated_id UUID NOT NULL REFERENCES consolidated_nodes(consolidated_id) ON DELETE CASCADE,
  node_id UUID NOT NULL REFERENCES nodes(node_id) ON DELETE CASCADE,
  tree_id UUID NOT NULL REFERENCES family_trees(tree_id) ON DELETE CASCADE
);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_family_trees_updated_at
  BEFORE UPDATE ON family_trees
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_nodes_updated_at
  BEFORE UPDATE ON nodes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_timeline_events_updated_at
  BEFORE UPDATE ON timeline_events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comments_updated_at
  BEFORE UPDATE ON comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
