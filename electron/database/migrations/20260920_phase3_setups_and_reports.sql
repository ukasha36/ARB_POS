-- Migration: Phase 3 Setups and Reports
-- Name: 20260920_phase3_setups_and_reports.sql

-- 1. Weighted Average Settings (single row configuration)
CREATE TABLE IF NOT EXISTS wac_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  method TEXT NOT NULL DEFAULT 'WAC',
  rounding_precision INTEGER NOT NULL DEFAULT 2,
  low_stock_threshold REAL NOT NULL DEFAULT 5.0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
INSERT OR IGNORE INTO wac_settings (id, method, rounding_precision, low_stock_threshold)
VALUES (1, 'WAC', 2, 5.0);

-- 2. Ensure uniqueness constraints for Areas and Sub‑Areas
CREATE UNIQUE INDEX IF NOT EXISTS idx_setup_areas_name ON setup_areas(name);
CREATE UNIQUE INDEX IF NOT EXISTS idx_setup_sub_areas_name_area ON setup_sub_areas(area_id, name);

-- 3. tax_amount columns are added safely by addColumnIfNotExists() in schema.js runMigrations.
-- Removed from here: ADD COLUMN IF NOT EXISTS crashes on SQLite < 3.37.
-- schema.js already handles both master_entries.tax_amount and inventory_transactions.tax_amount.
SELECT 3; -- no-op placeholder so db.exec() has valid SQL

-- 3. Supplier integration: No separate table needed – suppliers are accounts with account_type='SUPPLIER'. Ensure supplier code uniqueness (already unique via accounts.code).

-- 4. Additional report helper view (optional) – not required now.

-- NOTE: The migration runner (loadPhase3Migrations in schema.js line 457) will record
-- this migration in _migrations after successful execution. Do NOT insert here.
