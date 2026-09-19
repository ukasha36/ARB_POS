const { ipcMain } = require('electron');
const itemService = require('../services/itemService');

function registerItemIpc() {
  ipcMain.handle('items:list', async (event, search, includeInactive) => {
    try {
      const data = itemService.getItems(search, includeInactive);
      return { success: true, data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('items:getById', async (event, id) => {
    try {
      const data = itemService.getItemById(id);
      return { success: true, data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('items:save', async (event, itemData) => {
    try {
      if (global.activeUserRole !== 'SUPER_ADMIN') { return { success: false, error: 'Unauthorized: SUPER_ADMIN role required.' }; }

      const data = itemService.saveItem(itemData);
      return { success: true, data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('items:delete', async (event, id) => {
    try {
      if (global.activeUserRole !== 'SUPER_ADMIN') { return { success: false, error: 'Unauthorized: SUPER_ADMIN role required.' }; }

      const res = itemService.deleteItem(id);
      return res;
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('items:deactivate', async (event, id) => {
    try {
      if (global.activeUserRole !== 'SUPER_ADMIN') { return { success: false, error: 'Unauthorized: SUPER_ADMIN role required.' }; }

      const data = itemService.deactivateItem(id);
      return { success: true, data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
}

module.exports = registerItemIpc;
