const Database = require('better-sqlite3');
const { app } = require('electron');
const path = require('path');
const fs = require('fs');

let dbInstance = null;

function getDatabasePath() {
  const isDev = app ? !app.isPackaged : (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV);

  if (isDev) {
    // Development uses separate local file in project root to avoid database locks
    return path.join(process.cwd(), 'ledger.dev.db');
  } else {
    // Production uses ledger.db inside app userData directory
    const userDataDir = app
      ? app.getPath('userData')
      : path.join(process.env.APPDATA || process.env.HOME || '.', 'ARB_POS');

    if (!fs.existsSync(userDataDir)) {
      fs.mkdirSync(userDataDir, { recursive: true });
    }

    return path.join(userDataDir, 'ledger.db');
  }
}

function initConnection(customPath) {
  if (dbInstance) {
    return dbInstance;
  }

  const dbPath = customPath || getDatabasePath();
  console.log(`[Database] Initializing SQLite database at: ${dbPath}`);

  try {
    dbInstance = new Database(dbPath);

    // Configure PRAGMAs for durability and performance
    dbInstance.pragma('journal_mode = WAL');
    dbInstance.pragma('foreign_keys = ON');

    console.log('[Database] SQLite connected successfully with WAL mode & Foreign Keys enabled.');
    return dbInstance;
  } catch (err) {
    console.error('[Database] Failed to open SQLite database:', err);
    throw err;
  }
}

function getDb() {
  if (!dbInstance) {
    return initConnection();
  }
  return dbInstance;
}

function closeConnection() {
  if (dbInstance) {
    console.log('[Database] Closing SQLite database connection...');
    dbInstance.close();
    dbInstance = null;
  }
}

module.exports = {
  getDb,
  initConnection,
  closeConnection,
  getDatabasePath,
};
