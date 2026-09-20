const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  auth: {
    login: (credentials) => ipcRenderer.invoke('auth:login', credentials),
    getProfile: (userId) => ipcRenderer.invoke('auth:getProfile', userId),
    updateProfile: (data) => ipcRenderer.invoke('auth:updateProfile', data),
  },
  db: {
    getStatus: () => ipcRenderer.invoke('db:getStatus'),
  },
  dashboard: {
    getOverview: () => ipcRenderer.invoke('dashboard:getOverview'),
  },
  accounts: {
    list: (filters) => ipcRenderer.invoke('accounts:list', filters),
    getByCode: (code) => ipcRenderer.invoke('accounts:getByCode', code),
    getNextCode: () => ipcRenderer.invoke('accounts:getNextCode'),
    getQuickNav: (params) => ipcRenderer.invoke('accounts:getQuickNav', params),
    save: (data) => ipcRenderer.invoke('accounts:save', data),
    delete: (id) => ipcRenderer.invoke('accounts:delete', id),
    getLookups: () => ipcRenderer.invoke('accounts:getLookups'),
    getBalance: (id) => ipcRenderer.invoke('accounts:getBalance', id),
  },
  items: {
    list: (search, includeInactive) => ipcRenderer.invoke('items:list', search, includeInactive),
    getById: (id) => ipcRenderer.invoke('items:getById', id),
    save: (data) => ipcRenderer.invoke('items:save', data),
    delete: (id) => ipcRenderer.invoke('items:delete', id),
    deactivate: (id) => ipcRenderer.invoke('items:deactivate', id),
  },
  transactions: {
    post: (data) => ipcRenderer.invoke('transactions:post', data),
  },
  reports: {
    dashboardOverview: () => ipcRenderer.invoke('reports:dashboardOverview'),
    generalLedger: (filters) => ipcRenderer.invoke('reports:generalLedger', filters),
    customerLedger: (params) => ipcRenderer.invoke('reports:customerLedger', params),
    supplierLedger: (params) => ipcRenderer.invoke('reports:supplierLedger', params),
    accountStatement: (params) => ipcRenderer.invoke('reports:accountStatement', params),
    sales: (filters) => ipcRenderer.invoke('reports:sales', filters),
    purchases: (filters) => ipcRenderer.invoke('reports:purchases', filters),
    salesReturns: (filters) => ipcRenderer.invoke('reports:salesReturns', filters),
    purchaseReturns: (filters) => ipcRenderer.invoke('reports:purchaseReturns', filters),
    profitLoss: (params) => ipcRenderer.invoke('reports:profitLoss', params),
    stockValuation: (params) => ipcRenderer.invoke('reports:stockValuation', params),
    stockAnalytics: () => ipcRenderer.invoke('reports:stockAnalytics'),
  },
  pdf: {
    generateCustomerStatement: (params) => ipcRenderer.invoke('pdf:customerStatement', params),
    generateSupplierStatement: (params) => ipcRenderer.invoke('pdf:supplierStatement', params),
  },
  app: {
    close: () => ipcRenderer.send('app:close'),
    minimize: () => ipcRenderer.send('app:minimize'),
    maximize: () => ipcRenderer.send('app:maximize'),
  },
  setups: {
    areas: {
      list: (opts) => ipcRenderer.invoke('setups:areas:list', opts),
      create: (data) => ipcRenderer.invoke('setups:areas:create', data),
      update: (id, data) => ipcRenderer.invoke('setups:areas:update', id, data),
      deactivate: (id) => ipcRenderer.invoke('setups:areas:deactivate', id),
    },
    subAreas: {
      list: (opts) => ipcRenderer.invoke('setups:subAreas:list', opts),
      listByArea: (areaId) => ipcRenderer.invoke('setups:subAreas:listByArea', areaId),
      create: (data) => ipcRenderer.invoke('setups:subAreas:create', data),
      update: (id, data) => ipcRenderer.invoke('setups:subAreas:update', id, data),
      deactivate: (id) => ipcRenderer.invoke('setups:subAreas:deactivate', id),
    },
    salesmen: {
      list: (opts) => ipcRenderer.invoke('setups:salesmen:list', opts),
      create: (data) => ipcRenderer.invoke('setups:salesmen:create', data),
      update: (id, data) => ipcRenderer.invoke('setups:salesmen:update', id, data),
      deactivate: (id) => ipcRenderer.invoke('setups:salesmen:deactivate', id),
      getNextCode: () => ipcRenderer.invoke('setups:salesmen:getNextCode'),
    },
    suppliers: {
      list: (opts) => ipcRenderer.invoke('setups:suppliers:list', opts),
      getById: (id) => ipcRenderer.invoke('setups:suppliers:getById', id),
      create: (data) => ipcRenderer.invoke('setups:suppliers:create', data),
      update: (id, data) => ipcRenderer.invoke('setups:suppliers:update', id, data),
      deactivate: (id) => ipcRenderer.invoke('setups:suppliers:deactivate', id),
    },
    wac: {
      get: () => ipcRenderer.invoke('setups:wac:get'),
      update: (data) => ipcRenderer.invoke('setups:wac:update', data),
    },
  },
});
