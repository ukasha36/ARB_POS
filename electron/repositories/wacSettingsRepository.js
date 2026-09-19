// wacSettingsRepository.js
// Repository for the single-row wac_settings configuration table.
// wac_settings always has exactly one row with id = 1.

const { getDb } = require('../database/connection');

/**
 * Get the single WAC settings row.
 * @returns {Object} - { id, method, rounding_precision, low_stock_threshold, created_at, updated_at }
 * @throws if the settings row is missing (migration not yet run)
 */
function get() {
  const db = getDb();
  const row = db.prepare('SELECT * FROM wac_settings WHERE id = 1').get();
  if (!row) throw new Error('WAC settings not initialised — please run the Phase 3 migration');
  return row;
}

/**
 * Update WAC settings (single row, id = 1).
 * @param {Object} data - { rounding_precision?, low_stock_threshold? }
 *   rounding_precision must be an integer in [2, 3, 4]
 *   low_stock_threshold must be a non-negative number
 */
function update(data) {
  const db = getDb();
  const { rounding_precision, low_stock_threshold } = data;

  if (rounding_precision !== undefined) {
    const rp = Number(rounding_precision);
    if (!Number.isInteger(rp) || rp < 2 || rp > 4) {
      throw new Error('rounding_precision must be an integer between 2 and 4');
    }
  }

  if (low_stock_threshold !== undefined) {
    const lst = Number(low_stock_threshold);
    if (isNaN(lst) || lst < 0) {
      throw new Error('low_stock_threshold must be a non-negative number');
    }
  }

  const setClauses = [];
  const params = [];

  if (rounding_precision !== undefined) {
    setClauses.push('rounding_precision = ?');
    params.push(Number(rounding_precision));
  }
  if (low_stock_threshold !== undefined) {
    setClauses.push('low_stock_threshold = ?');
    params.push(Number(low_stock_threshold));
  }

  if (setClauses.length === 0) return get(); // nothing to update — return current

  setClauses.push('updated_at = CURRENT_TIMESTAMP');
  params.push(1); // id = 1 always

  db.prepare(`UPDATE wac_settings SET ${setClauses.join(', ')} WHERE id = ?`).run(...params);

  return get();
}

module.exports = {
  get,
  update,
};
