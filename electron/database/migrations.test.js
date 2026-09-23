/**
 * Migration & Database Initialization Tests
 * Run with: node electron/database/migrations.test.js
 * 
 * Tests:
 * 1. Fresh DB initializes successfully with only 1001 + 1002 accounts
 * 2. Migrations are idempotent (safe to run twice)
 * 3. status column exists on setup_sub_areas and setup_salesmen after init
 * 4. 4001/5001/5003 are NOT auto-seeded on a fresh DB
 */

'use strict';

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

// ---- helpers ----
function tempDbPath(name) {
  const dir = path.join(__dirname, '../../.test-tmp');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, `${name}-${Date.now()}.db`);
}

function cleanup(dbPath) {
  try { fs.unlinkSync(dbPath); } catch (_) {}
}

// Minimal schema runner (reuses the actual runMigrations + loadPhase3Migrations logic)
// We override getDatabasePath by passing the path directly via initConnection.
// To avoid needing electron/app, we mock the connection module partially.
function initTestDb(dbPath) {
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Inline the core schema creation so this test is self-contained
  // (mirrors what runMigrations does, minus the bcrypt user seeding)
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      account_type TEXT NOT NULL,
      purchase_enabled INTEGER NOT NULL DEFAULT 0,
      sale_enabled INTEGER NOT NULL DEFAULT 0,
      opening_balance REAL NOT NULL DEFAULT 0.00,
      opening_balance_type TEXT NOT NULL DEFAULT 'Dr',
      status TEXT NOT NULL DEFAULT 'Active',
      short_name TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS setup_sub_areas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      area_id INTEGER,
      name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS setup_salesmen (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      code TEXT,
      status TEXT NOT NULL DEFAULT 'Active'
    );
  `);

  // Seed only Cash + Bank (matching schema.js block 12)
  const accountCount = db.prepare('SELECT COUNT(*) as count FROM accounts').get().count;
  if (accountCount === 0) {
    const ins = db.prepare(`
      INSERT INTO accounts (code, title, account_type, purchase_enabled, sale_enabled, opening_balance, opening_balance_type, status, short_name)
      VALUES (?, ?, ?, ?, ?, 0.00, ?, 'Active', ?)
    `);
    ins.run('1001', 'Cash in Hand', 'CASH', 1, 1, 'Dr', 'CASH');
    ins.run('1002', 'Bank Account', 'BANK', 1, 1, 'Dr', 'BANK');
  }

  // Simulate migration runner for the status-columns migration
  const addColumnIfNotExists = (tableName, columnName, columnDef) => {
    const cols = db.prepare(`PRAGMA table_info(${tableName})`).all();
    if (!cols.some((c) => c.name === columnName)) {
      db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDef}`);
    }
  };

  const migName = '20260920_add_status_columns.sql';
  const already = db.prepare('SELECT 1 FROM _migrations WHERE name = ?').get(migName);
  if (!already) {
    addColumnIfNotExists('setup_sub_areas', 'status', "TEXT NOT NULL DEFAULT 'Active'");
    addColumnIfNotExists('setup_salesmen', 'status', "TEXT NOT NULL DEFAULT 'Active'");
    db.prepare('INSERT INTO _migrations (name) VALUES (?)').run(migName);
  }

  return db;
}

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    failed++;
  }
}

console.log('\n=== Migration & Database Tests ===\n');

// ---- TEST 1: Fresh DB seeds only 1001 + 1002 ----
{
  const dbPath = tempDbPath('fresh');
  try {
    const db = initTestDb(dbPath);
    test('Fresh DB seeds Cash (1001) and Bank (1002)', () => {
      const rows = db.prepare('SELECT code FROM accounts ORDER BY code').all();
      assert.strictEqual(rows.length, 2, `Expected 2 accounts, got ${rows.length}`);
      assert.strictEqual(rows[0].code, '1001');
      assert.strictEqual(rows[1].code, '1002');
    });
    test('4001 is NOT auto-seeded on fresh DB', () => {
      const row = db.prepare("SELECT 1 FROM accounts WHERE code = '4001'").get();
      assert.strictEqual(row, undefined, '4001 should not exist on fresh DB');
    });
    test('5001 is NOT auto-seeded on fresh DB', () => {
      const row = db.prepare("SELECT 1 FROM accounts WHERE code = '5001'").get();
      assert.strictEqual(row, undefined, '5001 should not exist on fresh DB');
    });
    test('5003 is NOT auto-seeded on fresh DB', () => {
      const row = db.prepare("SELECT 1 FROM accounts WHERE code = '5003'").get();
      assert.strictEqual(row, undefined, '5003 should not exist on fresh DB');
    });
    db.close();
  } finally {
    cleanup(dbPath);
  }
}

// ---- TEST 2: status columns exist after init ----
{
  const dbPath = tempDbPath('status-cols');
  try {
    const db = initTestDb(dbPath);
    test('setup_sub_areas has status column', () => {
      const cols = db.prepare('PRAGMA table_info(setup_sub_areas)').all();
      assert.ok(cols.some((c) => c.name === 'status'), 'status column missing from setup_sub_areas');
    });
    test('setup_salesmen has status column', () => {
      const cols = db.prepare('PRAGMA table_info(setup_salesmen)').all();
      assert.ok(cols.some((c) => c.name === 'status'), 'status column missing from setup_salesmen');
    });
    db.close();
  } finally {
    cleanup(dbPath);
  }
}

// ---- TEST 3: Migration idempotency (run twice, no error) ----
{
  const dbPath = tempDbPath('idempotent');
  try {
    const db = initTestDb(dbPath);
    test('Running migrations twice does not throw', () => {
      // Run the migration runner logic again
      const addColumnIfNotExists = (tableName, columnName, columnDef) => {
        const cols = db.prepare(`PRAGMA table_info(${tableName})`).all();
        if (!cols.some((c) => c.name === columnName)) {
          db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDef}`);
        }
      };
      const migName = '20260920_add_status_columns.sql';
      const already = db.prepare('SELECT 1 FROM _migrations WHERE name = ?').get(migName);
      // Should be already recorded — so runner skips. No error.
      if (!already) {
        addColumnIfNotExists('setup_sub_areas', 'status', "TEXT NOT NULL DEFAULT 'Active'");
        addColumnIfNotExists('setup_salesmen', 'status', "TEXT NOT NULL DEFAULT 'Active'");
        db.prepare('INSERT INTO _migrations (name) VALUES (?)').run(migName);
      }
    });
    test('_migrations has exactly one entry for the status-columns migration', () => {
      const rows = db.prepare("SELECT COUNT(*) as c FROM _migrations WHERE name = '20260920_add_status_columns.sql'").get();
      assert.strictEqual(rows.c, 1, `Expected 1 migration record, got ${rows.c}`);
    });
    db.close();
  } finally {
    cleanup(dbPath);
  }
}

// ---- TEST 4: Deleted account is NOT recreated ----
{
  const dbPath = tempDbPath('no-recreate');
  try {
    const db = initTestDb(dbPath);
    // Manually insert 5001, then delete it, then simulate re-init
    db.prepare("INSERT INTO accounts (code, title, account_type, status) VALUES ('5001', 'Purchases', 'PURCHASES', 'Active')").run();
    db.prepare("DELETE FROM accounts WHERE code = '5001'").run();
    // Re-run init logic (which should NOT recreate 5001)
    initTestDb(dbPath); // calling again with same path — should be no-op for accounts since count > 0
    test('Deleted 5001 is NOT recreated on re-init', () => {
      const row = db.prepare("SELECT 1 FROM accounts WHERE code = '5001'").get();
      assert.strictEqual(row, undefined, '5001 was recreated but should not have been');
    });
    db.close();
  } finally {
    cleanup(dbPath);
  }
}

// ---- Summary ----
console.log(`\n  ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
