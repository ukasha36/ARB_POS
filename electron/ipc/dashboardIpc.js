const { ipcMain } = require('electron');
const dashboardService = require('../services/dashboardService');

function registerDashboardIpc() {
  ipcMain.handle('dashboard:getOverview', async () => {
    try {
      const data = dashboardService.getOverview();
      return { success: true, data };
    } catch (err) {
      console.error('[IPC dashboard:getOverview Error]', err);
      return { success: false, error: err.message };
    }
  });
}

module.exports = registerDashboardIpc;
