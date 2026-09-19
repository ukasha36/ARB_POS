const { ipcMain } = require('electron');
const authService = require('../services/authService');

function registerAuthHandlers() {
  try {
    ipcMain.removeHandler('auth:login');
    ipcMain.removeHandler('auth:getProfile');
    ipcMain.removeHandler('auth:updateProfile');
  } catch (e) {
    // Ignore if not previously registered
  }

  ipcMain.handle('auth:login', async (event, { username, password }) => {
    try {
      return authService.login(username, password);
    } catch (err) {
      console.error('[IPC auth:login Error]', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('auth:getProfile', async (event, userId) => {
    try {
      return authService.getProfile(userId);
    } catch (err) {
      console.error('[IPC auth:getProfile Error]', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('auth:updateProfile', async (event, data) => {
    try {
      return authService.updateProfile(data);
    } catch (err) {
      console.error('[IPC auth:updateProfile Error]', err);
      return { success: false, error: err.message };
    }
  });

  console.log('[IPC] Auth handlers registered successfully.');
}

module.exports = { registerAuthHandlers };
