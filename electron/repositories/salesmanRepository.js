// salesmanRepository.js
// Repository for Setup Salesmen CRUD operations.
// Supports auto-generated codes in S-XX format and global name uniqueness.

const { getDb } = require('../database/connection');

/**
 * Determine the next available S-XX code.
 * Scans all existing codes matching S-\d+ and returns the next sequential one.
 * @returns {string}  e.g. "S-03"
 */
function getNextCode() {
  const db = getDb();
  const rows = db
    .prepare("SELECT code FROM setup_salesmen WHERE code GLOB 'S-[0-9]*'")
    .all();

  let maxNum = 0;
  rows.forEach((row) => {
    const match = row.code && row.code.match(/^S-(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) maxNum = num;
    }
  });

  const nextNum = maxNum + 1;
  return `S-${String(nextNum).padStart(2, '0')}`;
}

/**
 * List salesmen, optionally filtered by active status or name search.
 * @param {Object} [options]
 * @param {boolean} [options.active]  - filter by status
 * @param {string}  [options.search]  - substring match on name or code
 * @returns {Array}
 */
function list(options = {}) {
  const db = getDb();
  const { active, search } = options;

  let sql = 'SELECT id, name, code, status FROM setup_salesmen WHERE 1=1';
  const params = [];

  if (active !== undefined) {
    sql += ' AND status = ?';
    params.push(active ? 'Active' : 'Inactive');
  }

  if (search && search.trim()) {
    const term = `%${search.trim()}%`;
    sql += ' AND (name LIKE ? OR code LIKE ?)';
    params.push(term, term);
  }

  sql += ' ORDER BY name ASC';
  return db.prepare(sql).all(...params);
}

/**
 * Create a new salesman.
 * @param {Object} data - { name, code? }
 * @throws if name is not globally unique (case-insensitive)
 */
function create(data) {
  const db = getDb();
  const { name, code } = data;

  if (!name || !name.trim()) throw new Error('Salesman name is required');

  // Global case-insensitive name uniqueness
  const dup = db
    .prepare('SELECT 1 FROM setup_salesmen WHERE LOWER(name) = LOWER(?)')
    .get(name.trim());
  if (dup) throw new Error('Salesman name must be unique');

  const resolvedCode = code && code.trim() ? code.trim() : getNextCode();

  // Ensure code is also unique
  const codeDup = db
    .prepare('SELECT 1 FROM setup_salesmen WHERE LOWER(code) = LOWER(?)')
    .get(resolvedCode);
  if (codeDup) throw new Error(`Salesman code '${resolvedCode}' is already in use`);

  const info = db
    .prepare("INSERT INTO setup_salesmen (name, code, status) VALUES (?, ?, 'Active')")
    .run(name.trim(), resolvedCode);

  return { id: info.lastInsertRowid, code: resolvedCode };
}

/**
 * Update an existing salesman.
 * @param {number} id
 * @param {Object} data - { name?, code?, status? }
 */
function update(id, data) {
  const db = getDb();
  const { name, code, status } = data;

  const existing = db.prepare('SELECT * FROM setup_salesmen WHERE id = ?').get(id);
  if (!existing) throw new Error('Salesman not found');

  if (name !== undefined && name.trim()) {
    const dup = db
      .prepare('SELECT 1 FROM setup_salesmen WHERE LOWER(name) = LOWER(?) AND id <> ?')
      .get(name.trim(), id);
    if (dup) throw new Error('Salesman name must be unique');
  }

  if (code !== undefined && code.trim()) {
    const codeDup = db
      .prepare('SELECT 1 FROM setup_salesmen WHERE LOWER(code) = LOWER(?) AND id <> ?')
      .get(code.trim(), id);
    if (codeDup) throw new Error(`Salesman code '${code.trim()}' is already in use`);
  }

  const setClauses = [];
  const params = [];

  if (name !== undefined && name.trim()) { setClauses.push('name = ?'); params.push(name.trim()); }
  if (code !== undefined && code.trim()) { setClauses.push('code = ?'); params.push(code.trim()); }
  if (status !== undefined) { setClauses.push('status = ?'); params.push(status); }

  if (setClauses.length === 0) return; // nothing to update

  params.push(id);
  db.prepare(`UPDATE setup_salesmen SET ${setClauses.join(', ')} WHERE id = ?`).run(...params);
}

/**
 * Deactivate a salesman. Prevents deactivation if any accounts reference this salesman.
 * @param {number} id
 */
function deactivate(id) {
  const db = getDb();

  const existing = db.prepare('SELECT * FROM setup_salesmen WHERE id = ?').get(id);
  if (!existing) throw new Error('Salesman not found');

  const accountCount = db
    .prepare('SELECT COUNT(*) AS cnt FROM accounts WHERE salesman_id = ?')
    .get(id).cnt;
  if (accountCount > 0) {
    throw new Error('Cannot deactivate salesman: it is referenced by one or more accounts');
  }

  db.prepare("UPDATE setup_salesmen SET status = 'Inactive' WHERE id = ?").run(id);
}

module.exports = {
  list,
  create,
  update,
  deactivate,
  getNextCode,
};
