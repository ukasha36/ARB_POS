const { ipcMain } = require('electron');
const accountingService = require('../services/accountingService');

function registerTransactionIpc() {
  ipcMain.handle('transactions:post', async (event, transactionData) => {
    try {
      const res = accountingService.postTransaction(transactionData);
      return { success: true, ...res };
    } catch (err) {
      console.error('[IPC transactions:post Error]', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('transactions:get', async (event, entryId) => {
    try {
      const tx = accountingService.getTransaction(entryId);
      return { success: true, data: tx };
    } catch (err) {
      console.error('[IPC transactions:get Error]', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('transactions:list', async (event, filters) => {
    try {
      const data = accountingService.listTransactions(filters || {});
      return { success: true, data };
    } catch (err) {
      console.error('[IPC transactions:list Error]', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('transactions:void', async (event, entryId) => {
    try {
      const res = accountingService.voidTransaction(entryId);
      return { success: true, ...res };
    } catch (err) {
      console.error('[IPC transactions:void Error]', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('transactions:edit', async (event, entryId, newPayload) => {
    try {
      const res = accountingService.editTransaction(entryId, newPayload);
      return { success: true, ...res };
    } catch (err) {
      console.error('[IPC transactions:edit Error]', err);
      return { success: false, error: err.message };
    }
  });
}

module.exports = registerTransactionIpc;
