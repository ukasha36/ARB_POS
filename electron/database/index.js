const { app } = require('electron');
const path = require('path');
const fs = require('fs');
const { initConnection, closeConnection, getDb } = require('./connection');
const { runMigrations, loadPhase3Migrations } = require('./schema');

/**
 * Resolves the database file path based on environment:
 * - Development: `ledger.dev.db` in the project root (prevents SQLITE_BUSY lock conflicts)
 * - Production: `ledger.db` inside the system `userData` folder
 */
function getDatabasePath() {
  const isDev = app ? !app.isPackaged : (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV);

  if (isDev) {
    return path.join(process.cwd(), 'ledger.dev.db');
  } else {
    const userDataDir = app
      ? app.getPath('userData')
      : path.join(process.env.APPDATA || process.env.HOME || '.', 'ARB_POS');

    if (!fs.existsSync(userDataDir)) {
      fs.mkdirSync(userDataDir, { recursive: true });
    }

    return path.join(userDataDir, 'ledger.db');
  }
}

function initDatabase() {
  const dbPath = getDatabasePath();
  const db = initConnection(dbPath);
  runMigrations();
  loadPhase3Migrations();
  return db;
}

module.exports = {
  initDatabase,
  closeConnection,
  getDb,
  getDatabasePath,
};
