-- Migration: Add Status Columns to Setup Sub-Areas and Salesmen
-- Name: 20260920_add_status_columns.sql
-- Purpose: Guarantee the `status` column exists on setup_sub_areas and setup_salesmen
--          at database startup via the consolidated migration system, replacing
--          the runtime ALTER TABLE calls that previously lived in repository modules.
--          Uses IF NOT EXISTS so it is safe on both fresh and existing databases.

-- Ensure status column exists for setup_sub_areas
ALTER TABLE setup_sub_areas ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'Active';

-- Ensure status column exists for setup_salesmen
ALTER TABLE setup_salesmen ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'Active';

-- Record migration execution
INSERT OR IGNORE INTO _migrations (name) VALUES ('20260920_add_status_columns.sql');
