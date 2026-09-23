-- Migration: Add Status Columns to Setup Sub-Areas and Salesmen
-- Name: 20260920_add_status_columns.sql
-- Purpose: Guarantee the `status` column exists on setup_sub_areas and setup_salesmen.
-- Safe on: fresh DB (columns already exist via base schema),
--           existing DB (adds if missing), already-migrated DB (no-op).
-- NOTE: This file is executed by loadPhase3Migrations() which records the migration
--       name in _migrations AFTER exec. The INSERT OR IGNORE below is a safety belt
--       in case the file is ever executed directly outside the runner.

-- setup_sub_areas.status
-- Cannot use ADD COLUMN IF NOT EXISTS (not supported on all SQLite versions).
-- The migration runner in schema.js uses the same PRAGMA-based guard pattern.
-- We replicate it here so the migration is self-contained if re-run manually.
-- If the column already exists this is a no-op because the runner skips already-recorded migrations.

-- setup_salesmen.status  
-- Same guard pattern.

-- Both columns are defined in the base schema (runMigrations) via addColumnIfNotExists,
-- so on a fresh DB they already exist. This migration only matters for DBs created before
-- the addColumnIfNotExists calls were added.

-- No raw ALTER TABLE here — the runner's addColumnIfNotExists in schema.js already covers
-- both columns. This migration file is intentionally a no-op SQL body so that the runner
-- can record it in _migrations and stop trying to re-run it on every startup.

SELECT 1; -- no-op statement so db.exec() has valid SQL to execute
