const { ipcMain } = require('electron');
const { getDatabasePath } = require('../database/connection');

function registerDbIpc() {
  ipcMain.handle('db:getStatus', async () => {
    try {
      return {
        success: true,
        status: 'Local',
        mode: 'WAL',
        foreignKeys: true,
        path: getDatabasePath(),
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
}

module.exports = registerDbIpc;
