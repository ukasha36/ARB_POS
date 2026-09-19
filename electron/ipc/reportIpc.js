const { ipcMain } = require('electron');
const reportService = require('../services/reportService');

function registerReportIpc() {
  ipcMain.handle('reports:dashboardOverview', async () => {
    try {
      const data = reportService.getDashboardOverview();
      return { success: true, data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('reports:generalLedger', async (event, filters) => {
    try {
      if (global.activeUserRole !== 'SUPER_ADMIN') { return { success: false, error: 'Unauthorized: SUPER_ADMIN role required.' }; }

      const data = reportService.getGeneralLedger(filters);
      return { success: true, data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('reports:customerLedger', async (event, { customerId, dateFrom, dateTo }) => {
    try {
      const data = reportService.getCustomerLedger(customerId, dateFrom, dateTo);
      return { success: true, data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('reports:supplierLedger', async (event, { supplierId, dateFrom, dateTo }) => {
    try {
      const data = reportService.getSupplierLedger(supplierId, dateFrom, dateTo);
      return { success: true, data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('reports:accountStatement', async (event, { accountId, dateFrom, dateTo }) => {
    try {
      const data = reportService.getAccountStatement(accountId, dateFrom, dateTo);
      return { success: true, data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('reports:sales', async (event, filters) => {
    try {
      const data = reportService.getSalesReport(filters);
      return { success: true, data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('reports:purchases', async (event, filters) => {
    try {
      const data = reportService.getPurchaseReport(filters);
      return { success: true, data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('reports:salesReturns', async (event, filters) => {
    try {
      const data = reportService.getSalesReturnReport(filters);
      return { success: true, data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('reports:purchaseReturns', async (event, filters) => {
    try {
      const data = reportService.getPurchaseReturnReport(filters);
      return { success: true, data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('reports:profitLoss', async (event, { dateFrom, dateTo }) => {
    try {
      if (global.activeUserRole !== 'SUPER_ADMIN') { return { success: false, error: 'Unauthorized: SUPER_ADMIN role required.' }; }

      const data = reportService.getProfitLoss(dateFrom, dateTo);
      return { success: true, data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('reports:stockValuation', async (event, { search, category }) => {
    try {
      if (global.activeUserRole !== 'SUPER_ADMIN') { return { success: false, error: 'Unauthorized: SUPER_ADMIN role required.' }; }

      const data = reportService.getStockValuation(search, category);
      return { success: true, data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('reports:stockAnalytics', async () => {
    try {
      if (global.activeUserRole !== 'SUPER_ADMIN') { return { success: false, error: 'Unauthorized: SUPER_ADMIN role required.' }; }

      const data = reportService.getStockAnalytics();
      return { success: true, data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
}

module.exports = registerReportIpc;
