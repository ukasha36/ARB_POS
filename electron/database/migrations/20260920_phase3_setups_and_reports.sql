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

-- 3. Add optional tax columns to master_entries and inventory_transactions (INTEGER cents)
ALTER TABLE master_entries ADD COLUMN IF NOT EXISTS tax_amount INTEGER NOT NULL DEFAULT 0;
ALTER TABLE inventory_transactions ADD COLUMN IF NOT EXISTS tax_amount INTEGER NOT NULL DEFAULT 0;

-- 3. Supplier integration: No separate table needed – suppliers are accounts with account_type='SUPPLIER'. Ensure supplier code uniqueness (already unique via accounts.code).

-- 4. Additional report helper view (optional) – not required now.

-- Record migration execution
INSERT OR IGNORE INTO _migrations (name) VALUES ('20260920_phase3_setups_and_reports.sql');
