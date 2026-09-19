// setupIpc.js
// Registers all Setup IPC channels for areas, sub-areas, salesmen, suppliers, and WAC settings.
// Repositories are used directly — no service layer for setup modules.

const { ipcMain } = require('electron');
const areaRepo       = require('../repositories/areaRepository');
const subAreaRepo    = require('../repositories/subAreaRepository');
const salesmanRepo   = require('../repositories/salesmanRepository');
const supplierRepo   = require('../repositories/supplierRepository');
const wacRepo        = require('../repositories/wacSettingsRepository');

function registerSetupIpc() {
  // ─── Areas ───────────────────────────────────────────────────────────────────

  ipcMain.handle('setups:areas:list', async (event, opts) => {
    try {
      const data = areaRepo.list(opts);
      return { success: true, data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('setups:areas:create', async (event, data) => {
    try {
      if (global.activeUserRole !== 'SUPER_ADMIN') { return { success: false, error: 'Unauthorized: SUPER_ADMIN role required.' }; }

      const result = areaRepo.create(data);
      return { success: true, data: result };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('setups:areas:update', async (event, id, data) => {
    try {
      if (global.activeUserRole !== 'SUPER_ADMIN') { return { success: false, error: 'Unauthorized: SUPER_ADMIN role required.' }; }

      areaRepo.update(id, data);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('setups:areas:deactivate', async (event, id) => {
    try {
      if (global.activeUserRole !== 'SUPER_ADMIN') { return { success: false, error: 'Unauthorized: SUPER_ADMIN role required.' }; }

      areaRepo.deactivate(id);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // ─── Sub-Areas ────────────────────────────────────────────────────────────────

  ipcMain.handle('setups:subAreas:list', async (event, opts) => {
    try {
      const data = subAreaRepo.list(opts);
      return { success: true, data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('setups:subAreas:listByArea', async (event, areaId) => {
    try {
      const data = subAreaRepo.getByArea(areaId);
      return { success: true, data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('setups:subAreas:create', async (event, data) => {
    try {
      if (global.activeUserRole !== 'SUPER_ADMIN') { return { success: false, error: 'Unauthorized: SUPER_ADMIN role required.' }; }

      const result = subAreaRepo.create(data);
      return { success: true, data: result };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('setups:subAreas:update', async (event, id, data) => {
    try {
      if (global.activeUserRole !== 'SUPER_ADMIN') { return { success: false, error: 'Unauthorized: SUPER_ADMIN role required.' }; }

      subAreaRepo.update(id, data);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('setups:subAreas:deactivate', async (event, id) => {
    try {
      if (global.activeUserRole !== 'SUPER_ADMIN') { return { success: false, error: 'Unauthorized: SUPER_ADMIN role required.' }; }

      subAreaRepo.deactivate(id);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // ─── Salesmen ─────────────────────────────────────────────────────────────────

  ipcMain.handle('setups:salesmen:list', async (event, opts) => {
    try {
      const data = salesmanRepo.list(opts);
      return { success: true, data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('setups:salesmen:create', async (event, data) => {
    try {
      if (global.activeUserRole !== 'SUPER_ADMIN') { return { success: false, error: 'Unauthorized: SUPER_ADMIN role required.' }; }

      const result = salesmanRepo.create(data);
      return { success: true, data: result };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('setups:salesmen:update', async (event, id, data) => {
    try {
      if (global.activeUserRole !== 'SUPER_ADMIN') { return { success: false, error: 'Unauthorized: SUPER_ADMIN role required.' }; }

      salesmanRepo.update(id, data);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('setups:salesmen:deactivate', async (event, id) => {
    try {
      if (global.activeUserRole !== 'SUPER_ADMIN') { return { success: false, error: 'Unauthorized: SUPER_ADMIN role required.' }; }

      salesmanRepo.deactivate(id);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('setups:salesmen:getNextCode', async () => {
    try {
      const data = salesmanRepo.getNextCode();
      return { success: true, data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // ─── Suppliers ────────────────────────────────────────────────────────────────

  ipcMain.handle('setups:suppliers:list', async (event, opts) => {
    try {
      const data = supplierRepo.list(opts);
      return { success: true, data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('setups:suppliers:getById', async (event, id) => {
    try {
      const data = supplierRepo.getById(id);
      return { success: true, data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('setups:suppliers:create', async (event, data) => {
    try {
      if (global.activeUserRole !== 'SUPER_ADMIN') { return { success: false, error: 'Unauthorized: SUPER_ADMIN role required.' }; }

      const result = supplierRepo.create(data);
      return { success: true, data: result };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('setups:suppliers:update', async (event, id, data) => {
    try {
      if (global.activeUserRole !== 'SUPER_ADMIN') { return { success: false, error: 'Unauthorized: SUPER_ADMIN role required.' }; }

      supplierRepo.update(id, data);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('setups:suppliers:deactivate', async (event, id) => {
    try {
      if (global.activeUserRole !== 'SUPER_ADMIN') { return { success: false, error: 'Unauthorized: SUPER_ADMIN role required.' }; }

      supplierRepo.deactivate(id);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // ─── WAC Settings ─────────────────────────────────────────────────────────────

  ipcMain.handle('setups:wac:get', async () => {
    try {
      const data = wacRepo.get();
      return { success: true, data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('setups:wac:update', async (event, data) => {
    try {
      if (global.activeUserRole !== 'SUPER_ADMIN') { return { success: false, error: 'Unauthorized: SUPER_ADMIN role required.' }; }

      const result = wacRepo.update(data);
      return { success: true, data: result };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  console.log('[IPC] Setup channels registered (areas, subAreas, salesmen, suppliers, wac).');
}

module.exports = registerSetupIpc;
