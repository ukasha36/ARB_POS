const { ipcMain } = require('electron');
const accountService = require('../services/accountService');

function registerAccountIpc() {
  ipcMain.handle('accounts:list', async (event, filters) => {
    try {
      const data = accountService.getAccounts(filters);
      return { success: true, data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('accounts:getByCode', async (event, code) => {
    try {
      const data = accountService.getAccountByCode(code);
      return { success: true, data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('accounts:getNextCode', async () => {
    try {
      const code = accountService.getNextCode();
      return { success: true, code };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('accounts:getQuickNav', async (event, { currentCode, direction }) => {
    try {
      const data = accountService.getQuickNav(currentCode, direction);
      return { success: true, data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('accounts:save', async (event, accountData) => {
    try {
      const data = accountService.saveAccount(accountData);
      return { success: true, data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('accounts:delete', async (event, id) => {
    try {
      const res = accountService.deleteAccount(id);
      return { success: true, ...res };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('accounts:getLookups', async () => {
    try {
      const data = accountService.getLookups();
      return { success: true, data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('accounts:getBalance', async (event, id) => {
    try {
      const balance = accountService.getAccountBalance(id);
      return { success: true, balance };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
}

module.exports = registerAccountIpc;
