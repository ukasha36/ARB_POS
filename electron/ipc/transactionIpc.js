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
}

module.exports = registerTransactionIpc;
