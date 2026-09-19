// areaRepository.js
// Repository for Setup Areas CRUD operations with validation and duplicate checks.
// All monetary values are stored as integers (cents), but Areas have no monetary fields.

const db = require("../database/connection").getDb();

function ensureStatusColumn() {
  try {
    const columns = db.prepare("PRAGMA table_info(setup_areas)").all();
    const hasStatus = columns.some((c) => c.name === "status");
    if (!hasStatus) {
      db.exec(
        "ALTER TABLE setup_areas ADD COLUMN status TEXT NOT NULL DEFAULT 'Active'",
      );
    }
    const hasCreated = columns.some((c) => c.name === "created_at");
    if (!hasCreated) {
      db.exec(
        "ALTER TABLE setup_areas ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP",
      );
    }
    const hasUpdated = columns.some((c) => c.name === "updated_at");
    if (!hasUpdated) {
      db.exec(
        "ALTER TABLE setup_areas ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP",
      );
    }
  } catch (err) {
    console.warn("[areaRepository] ensureStatusColumn warning:", err.message);
  }
}

// Ensure the schema is ready for area operations
ensureStatusColumn();

/**
 * List all areas, optionally filtered by active status.
 * @param {Object} [options]
 * @param {boolean} [options.active] - if true, only return active areas (status = 'Active')
 * @returns {Array}
 */
function list(options = {}) {
  const { active } = options;
  let stmt = "SELECT id, name, status, created_at, updated_at FROM setup_areas";
  const params = [];
  if (active !== undefined) {
    stmt += " WHERE status = ?";
    params.push(active ? "Active" : "Inactive");
  }
  return db.prepare(stmt).all(...params);
}

/**
 * Create a new area.
 * @param {Object} data - { name }
 * @throws if duplicate name (case‑insensitive) exists.
 */
function create(data) {
  const { name } = data;
  if (!name) throw new Error("Area name is required");
  // Case‑insensitive duplicate check
  const dup = db
    .prepare("SELECT 1 FROM setup_areas WHERE LOWER(name) = LOWER(?)")
    .get(name);
  if (dup) throw new Error("Area name must be unique");
  const info = db
    .prepare("INSERT INTO setup_areas (name, status) VALUES (?, ?)")
    .run(name, "Active");
  return { id: info.lastInsertRowid };
}

/**
 * Update an existing area (name or status).
 * @param {number} id
 * @param {Object} data - { name?, status? }
 */
function update(id, data) {
  const { name, status } = data;
  const area = db.prepare("SELECT * FROM setup_areas WHERE id = ?").get(id);
  if (!area) throw new Error("Area not found");
  if (name) {
    const dup = db
      .prepare(
        "SELECT 1 FROM setup_areas WHERE LOWER(name) = LOWER(?) AND id <> ?",
      )
      .get(name, id);
    if (dup) throw new Error("Area name must be unique");
  }
  const stmt = [];
  const params = [];
  if (name) {
    stmt.push("name = ?");
    params.push(name);
  }
  if (status) {
    stmt.push("status = ?");
    params.push(status);
  }
  if (stmt.length === 0) return; // nothing to update
  params.push(id);
  db.prepare(`UPDATE setup_areas SET ${stmt.join(", ")} WHERE id = ?`).run(
    ...params,
  );
}

/**
 * Deactivate (soft‑delete) an area. Prevent if any dependent records exist.
 * @param {number} id
 */
function deactivate(id) {
  // Check for dependent sub‑areas, items, transactions, etc.
  const subCount = db
    .prepare("SELECT COUNT(*) AS cnt FROM setup_sub_areas WHERE area_id = ?")
    .get(id).cnt;
  if (subCount > 0)
    throw new Error("Cannot deactivate area with existing sub‑areas");
  // Additional checks for items, inventory, etc. can be added here.
  db.prepare("UPDATE setup_areas SET status = ? WHERE id = ?").run(
    "Inactive",
    id,
  );
}

module.exports = {
  list,
  create,
  update,
  deactivate,
};
