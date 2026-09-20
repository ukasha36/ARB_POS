// subAreaRepository.js
// Repository for Setup Sub-Areas CRUD operations.
// Joins with setup_areas to include area_name. Validates area FK and name uniqueness within area.

const { getDb } = require('../database/connection');

/**
 * List sub-areas, optionally filtered by areaId and/or active status.
 * Joins setup_areas to include area_name.
 * @param {Object} [options]
 * @param {number} [options.areaId]  - filter by parent area
 * @param {boolean} [options.active] - if true only Active, if false only Inactive
 * @returns {Array}
 */
function list(options = {}) {
  const db = getDb();
  const { areaId, active } = options;

  let sql = `
    SELECT sa.id, sa.area_id, a.name AS area_name, sa.name, sa.status
    FROM setup_sub_areas sa
    LEFT JOIN setup_areas a ON a.id = sa.area_id
    WHERE 1=1
  `;
  const params = [];

  if (areaId !== undefined && areaId !== null) {
    sql += ' AND sa.area_id = ?';
    params.push(areaId);
  }

  if (active !== undefined) {
    sql += ' AND sa.status = ?';
    params.push(active ? 'Active' : 'Inactive');
  }

  sql += ' ORDER BY a.name ASC, sa.name ASC';
  return db.prepare(sql).all(...params);
}

/**
 * Return all Active sub-areas belonging to a specific area.
 * @param {number} areaId
 * @returns {Array}
 */
function getByArea(areaId) {
  const db = getDb();
  if (!areaId) throw new Error('areaId is required');
  return db
    .prepare(
      "SELECT id, area_id, name, status FROM setup_sub_areas WHERE area_id = ? AND status = 'Active' ORDER BY name ASC"
    )
    .all(areaId);
}

/**
 * Create a new sub-area under a given area.
 * @param {Object} data - { area_id, name }
 * @throws if area not found or duplicate name within area (case-insensitive)
 */
function create(data) {
  const db = getDb();
  const { area_id, name } = data;

  if (!area_id) throw new Error('area_id is required');
  if (!name || !name.trim()) throw new Error('Sub-area name is required');

  // Validate parent area exists
  const area = db.prepare('SELECT id FROM setup_areas WHERE id = ?').get(area_id);
  if (!area) throw new Error('Parent area not found');

  // Case-insensitive uniqueness within the same area
  const dup = db
    .prepare('SELECT 1 FROM setup_sub_areas WHERE area_id = ? AND LOWER(name) = LOWER(?)')
    .get(area_id, name.trim());
  if (dup) throw new Error('Sub-area name already exists in this area');

  const info = db
    .prepare("INSERT INTO setup_sub_areas (area_id, name, status) VALUES (?, ?, 'Active')")
    .run(area_id, name.trim());

  return { id: info.lastInsertRowid };
}

/**
 * Update an existing sub-area (name, status, or area_id).
 * @param {number} id
 * @param {Object} data - { name?, status?, area_id? }
 */
function update(id, data) {
  const db = getDb();
  const { name, status, area_id } = data;

  const existing = db.prepare('SELECT * FROM setup_sub_areas WHERE id = ?').get(id);
  if (!existing) throw new Error('Sub-area not found');

  const resolvedAreaId = area_id !== undefined ? area_id : existing.area_id;
  const resolvedName = name !== undefined ? name.trim() : existing.name;

  // If name or area changes, re-check uniqueness
  if (name !== undefined || area_id !== undefined) {
    // Validate area exists if area_id is being changed
    if (area_id !== undefined) {
      const area = db.prepare('SELECT id FROM setup_areas WHERE id = ?').get(resolvedAreaId);
      if (!area) throw new Error('Parent area not found');
    }

    const dup = db
      .prepare(
        'SELECT 1 FROM setup_sub_areas WHERE area_id = ? AND LOWER(name) = LOWER(?) AND id <> ?'
      )
      .get(resolvedAreaId, resolvedName, id);
    if (dup) throw new Error('Sub-area name already exists in this area');
  }

  const setClauses = [];
  const params = [];

  if (name !== undefined) { setClauses.push('name = ?'); params.push(resolvedName); }
  if (status !== undefined) { setClauses.push('status = ?'); params.push(status); }
  if (area_id !== undefined) { setClauses.push('area_id = ?'); params.push(resolvedAreaId); }

  if (setClauses.length === 0) return; // nothing to update

  params.push(id);
  db.prepare(`UPDATE setup_sub_areas SET ${setClauses.join(', ')} WHERE id = ?`).run(...params);
}

/**
 * Deactivate a sub-area. Prevents deactivation if any accounts reference it.
 * @param {number} id
 */
function deactivate(id) {
  const db = getDb();

  const existing = db.prepare('SELECT * FROM setup_sub_areas WHERE id = ?').get(id);
  if (!existing) throw new Error('Sub-area not found');

  const accountCount = db
    .prepare('SELECT COUNT(*) AS cnt FROM accounts WHERE sub_area_id = ?')
    .get(id).cnt;
  if (accountCount > 0) {
    throw new Error('Cannot deactivate sub-area: it is referenced by one or more accounts');
  }

  db.prepare("UPDATE setup_sub_areas SET status = 'Inactive' WHERE id = ?").run(id);
}

module.exports = {
  list,
  getByArea,
  create,
  update,
  deactivate,
};
