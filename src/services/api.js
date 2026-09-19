const hasElectron = typeof window !== 'undefined' && window.electronAPI;

export const api = {
  auth: {
    login: async (credentials) => {
      if (hasElectron) return await window.electronAPI.auth.login(credentials);
      return { success: true, user: { id: 1, displayName: 'ARB Communication' } };
    },
    getProfile: async (userId) => {
      if (hasElectron) return await window.electronAPI.auth.getProfile(userId);
      return { success: true, user: { id: 1, username: 'admin', displayName: 'ARB Communication', role: 'SUPER_ADMIN' } };
    },
    updateProfile: async (data) => {
      if (hasElectron) return await window.electronAPI.auth.updateProfile(data);
      return {
        success: true,
        message: 'Profile updated successfully',
        user: { id: data.userId, username: data.username, displayName: data.displayName, role: 'SUPER_ADMIN' },
      };
    },
  },

  db: {
    getStatus: async () => {
      if (hasElectron) return await window.electronAPI.db.getStatus();
      return { success: true, status: 'Local', mode: 'WAL' };
    },
  },

  dashboard: {
    getOverview: async () => {
      if (hasElectron) return await window.electronAPI.dashboard.getOverview();
      return { success: true, data: {} };
    },
  },

  accounts: {
    list: async (filters = {}) => {
      if (hasElectron) return await window.electronAPI.accounts.list(filters);
      return { success: true, data: [] };
    },
    getByCode: async (code) => {
      if (hasElectron) return await window.electronAPI.accounts.getByCode(code);
      return { success: true, data: null };
    },
    getNextCode: async () => {
      if (hasElectron) return await window.electronAPI.accounts.getNextCode();
      return { success: true, code: '1003' };
    },
    getQuickNav: async (params) => {
      if (hasElectron) return await window.electronAPI.accounts.getQuickNav(params);
      return { success: true, data: null };
    },
    save: async (accountData) => {
      if (hasElectron) return await window.electronAPI.accounts.save(accountData);
      return { success: true, data: accountData };
    },
    delete: async (id) => {
      if (hasElectron) return await window.electronAPI.accounts.delete(id);
      return { success: true, action: 'deleted', message: 'Account deleted' };
    },
    getLookups: async () => {
      if (hasElectron) return await window.electronAPI.accounts.getLookups();
      return { success: true, data: { areas: [], subAreas: [], salesmen: [], categories: [] } };
    },
    getBalance: async (id) => {
      if (hasElectron) return await window.electronAPI.accounts.getBalance(id);
      return { success: true, balance: 0.00 };
    },
  },

  items: {
    list: async (search = '', includeInactive = false) => {
      if (hasElectron) return await window.electronAPI.items.list(search, includeInactive);
      return { success: true, data: [] };
    },
    getById: async (id) => {
      if (hasElectron) return await window.electronAPI.items.getById(id);
      return { success: true, data: null };
    },
    save: async (itemData) => {
      if (hasElectron) return await window.electronAPI.items.save(itemData);
      return { success: true, data: itemData };
    },
    delete: async (id) => {
      if (hasElectron) return await window.electronAPI.items.delete(id);
      return { success: true, message: 'Item deleted' };
    },
    deactivate: async (id) => {
      if (hasElectron) return await window.electronAPI.items.deactivate(id);
      return { success: true, message: 'Item deactivated' };
    },
  },

  transactions: {
    post: async (transactionData) => {
      if (hasElectron) return await window.electronAPI.transactions.post(transactionData);
      return { success: true, message: 'Transaction posted' };
    },
  },

  reports: {
    dashboardOverview: async () => {
      if (hasElectron) return await window.electronAPI.reports.dashboardOverview();
      return { success: true, data: {} };
    },
    generalLedger: async (filters = {}) => {
      if (hasElectron) return await window.electronAPI.reports.generalLedger(filters);
      return { success: true, data: { records: [], totalDebit: 0, totalCredit: 0 } };
    },
    customerLedger: async (customerId, dateFrom = null, dateTo = null) => {
      if (hasElectron) return await window.electronAPI.reports.customerLedger({ customerId, dateFrom, dateTo });
      return { success: true, data: { records: [], customer: {}, summary: {} } };
    },
    supplierLedger: async (supplierId, dateFrom = null, dateTo = null) => {
      if (hasElectron) return await window.electronAPI.reports.supplierLedger({ supplierId, dateFrom, dateTo });
      return { success: true, data: { records: [], supplier: {}, summary: {} } };
    },
    accountStatement: async (accountId, dateFrom = null, dateTo = null) => {
      if (hasElectron) return await window.electronAPI.reports.accountStatement({ accountId, dateFrom, dateTo });
      return { success: true, data: { records: [], account: {}, totalDebit: 0, totalCredit: 0 } };
    },
    sales: async (filters = {}) => {
      if (hasElectron) return await window.electronAPI.reports.sales(filters);
      return { success: true, data: { records: [], summary: {} } };
    },
    purchases: async (filters = {}) => {
      if (hasElectron) return await window.electronAPI.reports.purchases(filters);
      return { success: true, data: { records: [], summary: {} } };
    },
    salesReturns: async (filters = {}) => {
      if (hasElectron) return await window.electronAPI.reports.salesReturns(filters);
      return { success: true, data: { records: [], summary: {} } };
    },
    purchaseReturns: async (filters = {}) => {
      if (hasElectron) return await window.electronAPI.reports.purchaseReturns(filters);
      return { success: true, data: { records: [], summary: {} } };
    },
    profitLoss: async (dateFrom = null, dateTo = null) => {
      if (hasElectron) return await window.electronAPI.reports.profitLoss({ dateFrom, dateTo });
      return { success: true, data: { revenue: {}, costOfGoodsSold: {}, operatingExpenses: { items: [] } } };
    },
    stockValuation: async (search = '', category = '') => {
      if (hasElectron) return await window.electronAPI.reports.stockValuation({ search, category });
      return { success: true, data: { items: [], summary: {} } };
    },
    stockAnalytics: async () => {
      if (hasElectron) return await window.electronAPI.reports.stockAnalytics();
      return { success: true, data: { categoryValuation: [], fastMovingItems: [], lowStockItems: [] } };
    },
  },
};
