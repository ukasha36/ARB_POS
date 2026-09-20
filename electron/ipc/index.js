const { registerAuthHandlers } = require('./authHandler');
const registerDbIpc = require('./dbIpc');
const registerDashboardIpc = require('./dashboardIpc');
const registerAccountIpc = require('./accountIpc');
const registerItemIpc = require('./itemIpc');
const registerTransactionIpc = require('./transactionIpc');
const registerReportIpc = require('./reportIpc');
const registerPdfIpc = require('./pdfIpc');
const registerSetupIpc = require('./setupIpc');

function registerIpcHandlers() {
  // 1. Explicitly register Auth IPC handlers (auth:login, auth:getProfile, auth:updateProfile)
  registerAuthHandlers();

  // 2. Register Database, Dashboard, and Operational IPC handlers
  registerDbIpc();
  registerDashboardIpc();
  registerAccountIpc();
  registerItemIpc();
  registerTransactionIpc();
  registerReportIpc();
  registerPdfIpc();

  // 3. Register Phase 3 Setup IPC handlers (areas, subAreas, salesmen, suppliers, wac)
  registerSetupIpc();

  console.log('[IPC] All Electron IPC channels registered successfully.');
}

module.exports = { registerIpcHandlers };
