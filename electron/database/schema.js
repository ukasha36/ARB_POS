const { getDb } = require("./connection");
const bcrypt = require("bcryptjs");
const path = require("path");
const fs = require("fs");

function runMigrations() {
  const db = getDb();

  db.transaction(() => {
    // 1. Migration History Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Users Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        display_name TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'OPERATOR',
        is_active INTEGER NOT NULL DEFAULT 1,
        force_password_change INTEGER NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_login DATETIME
      );
    `);

    // 3. System Settings Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS system_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 4. Setup Lookups Tables
    db.exec(`
      CREATE TABLE IF NOT EXISTS setup_areas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        status TEXT NOT NULL DEFAULT 'Active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS setup_sub_areas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        area_id INTEGER,
        name TEXT NOT NULL,
        FOREIGN KEY (area_id) REFERENCES setup_areas(id)
      );

      CREATE TABLE IF NOT EXISTS setup_salesmen (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        code TEXT
      );

      CREATE TABLE IF NOT EXISTS setup_categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL
      );
    `);

    // 5. Accounts Master Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT UNIQUE NOT NULL,
        title TEXT NOT NULL,
        account_type TEXT NOT NULL,
        purchase_enabled INTEGER NOT NULL DEFAULT 0,
        sale_enabled INTEGER NOT NULL DEFAULT 0,
        opening_balance REAL NOT NULL DEFAULT 0.00,
        opening_balance_type TEXT NOT NULL DEFAULT 'Dr',
        opening_date TEXT,
        address_1 TEXT,
        address_2 TEXT,
        telephone_1 TEXT,
        telephone_2 TEXT,
        fax TEXT,
        mobile TEXT,
        gst_number TEXT,
        ntn_number TEXT,
        remarks TEXT,
        area_id INTEGER,
        sub_area_id INTEGER,
        note_head_id INTEGER,
        salesman_id INTEGER,
        booker_id INTEGER,
        item_category_id INTEGER,
        category_id INTEGER,
        credit_limit REAL NOT NULL DEFAULT 0.00,
        aging_days INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'Active',
        short_name TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (area_id) REFERENCES setup_areas(id),
        FOREIGN KEY (salesman_id) REFERENCES setup_salesmen(id),
        FOREIGN KEY (category_id) REFERENCES setup_categories(id)
      );
    `);

    // 6. Items / Stock Inventory Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        barcode TEXT,
        category TEXT DEFAULT 'General',
        unit_price REAL NOT NULL DEFAULT 0.00,
        purchase_price REAL NOT NULL DEFAULT 0.00,
        stock_qty REAL NOT NULL DEFAULT 0.00,
        opening_stock_qty REAL NOT NULL DEFAULT 0.00,
        opening_cost_price REAL NOT NULL DEFAULT 0.00,
        current_wac REAL NOT NULL DEFAULT 0.00,
        min_stock REAL NOT NULL DEFAULT 5.00,
        status TEXT NOT NULL DEFAULT 'Active',
        supplier_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (supplier_id) REFERENCES accounts(id)
      );
    `);

    // 7. Master Entries (Header for Financial Transactions)
    db.exec(`
      CREATE TABLE IF NOT EXISTS master_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entry_type TEXT NOT NULL,
        date TEXT NOT NULL,
        description TEXT,
        reference_no TEXT,
        status TEXT NOT NULL DEFAULT 'POSTED',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 8. Ledger Lines (Double-Entry Posting Lines)
    db.exec(`
      CREATE TABLE IF NOT EXISTS ledger_lines (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entry_id INTEGER NOT NULL,
        account_id INTEGER NOT NULL,
        type TEXT NOT NULL,
        amount REAL NOT NULL,
        FOREIGN KEY (entry_id) REFERENCES master_entries(id) ON DELETE CASCADE,
        FOREIGN KEY (account_id) REFERENCES accounts(id)
      );

      CREATE INDEX IF NOT EXISTS idx_ledger_lines_account ON ledger_lines(account_id);
      CREATE INDEX IF NOT EXISTS idx_ledger_lines_entry ON ledger_lines(entry_id);
    `);

    // 9. Inventory Line Items Audit Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS inventory_transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entry_id INTEGER NOT NULL,
        item_id INTEGER NOT NULL,
        transaction_type TEXT NOT NULL,
        qty REAL NOT NULL,
        unit_price REAL NOT NULL,
        total_price REAL NOT NULL,
        cost_price REAL NOT NULL DEFAULT 0.00,
        total_cost REAL NOT NULL DEFAULT 0.00,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (entry_id) REFERENCES master_entries(id) ON DELETE CASCADE,
        FOREIGN KEY (item_id) REFERENCES items(id)
      );
    `);

    // Helper for safe column addition on existing databases
    const addColumnIfNotExists = (tableName, columnName, columnDef) => {
      const columns = db.prepare(`PRAGMA table_info(${tableName})`).all();
      const exists = columns.some((col) => col.name === columnName);
      if (!exists) {
        db.exec(
          `ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDef};`,
        );
      }
    };

    // Safe Phase 3 column migrations
    addColumnIfNotExists(
      "setup_areas",
      "status",
      "TEXT NOT NULL DEFAULT 'Active'",
    );
    addColumnIfNotExists(
      "setup_areas",
      "created_at",
      "DATETIME DEFAULT CURRENT_TIMESTAMP",
    );
    addColumnIfNotExists(
      "setup_areas",
      "updated_at",
      "DATETIME DEFAULT CURRENT_TIMESTAMP",
    );

    addColumnIfNotExists(
      "users",
      "force_password_change",
      "INTEGER NOT NULL DEFAULT 0",
    );
    addColumnIfNotExists(
      "items",
      "opening_stock_qty",
      "REAL NOT NULL DEFAULT 0.00",
    );
    addColumnIfNotExists(
      "items",
      "opening_cost_price",
      "REAL NOT NULL DEFAULT 0.00",
    );
    addColumnIfNotExists("items", "current_wac", "REAL NOT NULL DEFAULT 0.00");
    addColumnIfNotExists("items", "min_stock", "REAL NOT NULL DEFAULT 5.00");
    addColumnIfNotExists("items", "status", "TEXT NOT NULL DEFAULT 'Active'");
    addColumnIfNotExists("items", "supplier_id", "INTEGER");

    addColumnIfNotExists(
      "master_entries",
      "status",
      "TEXT NOT NULL DEFAULT 'POSTED'",
    );

    addColumnIfNotExists(
      "inventory_transactions",
      "cost_price",
      "REAL NOT NULL DEFAULT 0.00",
    );
    addColumnIfNotExists(
      "inventory_transactions",
      "total_cost",
      "REAL NOT NULL DEFAULT 0.00",
    );

    // Performance Indexes
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_master_entries_date_type ON master_entries(date, entry_type);
      CREATE INDEX IF NOT EXISTS idx_master_entries_status ON master_entries(status);
      CREATE INDEX IF NOT EXISTS idx_ledger_lines_acc_type ON ledger_lines(account_id, type);
      CREATE INDEX IF NOT EXISTS idx_inv_txns_item_type ON inventory_transactions(item_id, transaction_type);
      CREATE INDEX IF NOT EXISTS idx_inv_txns_entry ON inventory_transactions(entry_id);
      CREATE INDEX IF NOT EXISTS idx_accounts_type ON accounts(account_type);
      CREATE INDEX IF NOT EXISTS idx_items_status ON items(status);
    `);

    // Backfill defaults for WAC, status, and costs (safe on existing DBs)
    db.prepare(
      `UPDATE items SET current_wac = purchase_price WHERE (current_wac IS NULL OR current_wac = 0.00) AND purchase_price > 0`,
    ).run();
    db.prepare(
      `UPDATE items SET opening_cost_price = purchase_price WHERE (opening_cost_price IS NULL OR opening_cost_price = 0.00) AND purchase_price > 0`,
    ).run();
    db.prepare(
      `UPDATE master_entries SET status = 'POSTED' WHERE status IS NULL OR status = ''`,
    ).run();
    db.prepare(
      `UPDATE inventory_transactions SET cost_price = unit_price WHERE (cost_price IS NULL OR cost_price = 0.00) AND transaction_type IN ('PURCHASE', 'PURCHASE_RETURN')`,
    ).run();
    db.prepare(
      `UPDATE inventory_transactions SET total_cost = qty * cost_price WHERE total_cost IS NULL OR total_cost = 0.00`,
    ).run();

    // ------------------------------------------------------------------
    // 10. Seed Default Super User ONLY (client delivery — no demo data)
    // ------------------------------------------------------------------
    const userCount = db
      .prepare("SELECT COUNT(*) as count FROM users")
      .get().count;

    if (userCount === 0) {
      const hashedPassword = bcrypt.hashSync("admin123", 10);
      db.prepare(
        `
        INSERT INTO users (username, password, display_name, role, is_active, force_password_change)
        VALUES (?, ?, ?, ?, 1, 0)
      `,
      ).run("admin", hashedPassword, "ARB Communication", "SUPER_ADMIN");
    }
    // Do NOT reset password on every startup (production / client build)

    // ------------------------------------------------------------------
    // 11. NO demo areas / salesmen / categories
    // ------------------------------------------------------------------

    // ------------------------------------------------------------------
    // 12. Minimal system Chart of Accounts only (zero balances, no demo parties)
    // ------------------------------------------------------------------
    const accountCount = db
      .prepare("SELECT COUNT(*) as count FROM accounts")
      .get().count;

    if (accountCount === 0) {
      const insertAccount = db.prepare(`
        INSERT INTO accounts (
          code, title, account_type, purchase_enabled, sale_enabled,
          opening_balance, opening_balance_type, status, short_name
        )
        VALUES (?, ?, ?, ?, ?, 0.00, ?, 'Active', ?)
      `);

      // Cash & Bank
      insertAccount.run("1001", "Cash in Hand", "CASH", 1, 1, "Dr", "CASH");
      insertAccount.run("1002", "Bank Account", "BANK", 1, 1, "Dr", "BANK");

      // Generic control accounts (optional; balance 0 — client adds real parties)
      insertAccount.run(
        "1101",
        "General Customer Receivable",
        "CUSTOMER",
        0,
        1,
        "Dr",
        "CUST_GEN",
      );
      insertAccount.run(
        "2001",
        "General Supplier Payable",
        "SUPPLIER",
        1,
        0,
        "Cr",
        "SUPP_GEN",
      );

      // Equity / Revenue / Inventory / Expense / COGS
      insertAccount.run(
        "3001",
        "Owner Capital Account",
        "CAPITAL",
        0,
        0,
        "Cr",
        "CAPITAL",
      );
      insertAccount.run(
        "4001",
        "Sales Revenue Account",
        "REVENUE",
        0,
        1,
        "Cr",
        "SALES_REV",
      );
      insertAccount.run(
        "5001",
        "Purchase / Inventory Account",
        "PURCHASES",
        1,
        0,
        "Dr",
        "PURCH_ACC",
      );
      insertAccount.run(
        "5002",
        "General Expenses",
        "EXPENSE",
        0,
        0,
        "Dr",
        "EXPENSE",
      );
      insertAccount.run(
        "5003",
        "Cost of Goods Sold (COGS)",
        "EXPENSE",
        0,
        0,
        "Dr",
        "COGS",
      );

      console.log(
        "[Database Schema] Seeded minimal system Chart of Accounts (no demo parties).",
      );
    }

    // ------------------------------------------------------------------
    // 13. NO sample inventory items
    // ------------------------------------------------------------------

    // System settings
    db.prepare(
      `
      INSERT OR IGNORE INTO system_settings (key, value)
      VALUES 
        ('app_name', 'ARB POS & ERP Solution'),
        ('app_version', '1.0.0'),
        ('db_status', 'Local')
    `,
    ).run();
  })();

  console.log("[Database Schema] Phase 2 Migrations executed successfully.");
}

// ---------- Load Phase 3 migration scripts ----------
function loadPhase3Migrations() {
  const db = getDb();
  const migrationsDir = path.join(__dirname, "migrations");
  if (!fs.existsSync(migrationsDir)) {
    console.warn("[Database] No Phase 3 migrations directory found.");
    return;
  }
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  files.forEach((file) => {
    const migrationName = file;
    const already = db
      .prepare("SELECT 1 FROM _migrations WHERE name = ?")
      .get(migrationName);
    if (already) return;
    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
    db.exec(sql);
    db.prepare("INSERT INTO _migrations (name) VALUES (?)").run(migrationName);
    console.log(`[Database] Executed migration ${migrationName}`);
  });
}

module.exports = { runMigrations, loadPhase3Migrations };
