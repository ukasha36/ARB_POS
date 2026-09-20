const { ipcMain } = require("electron");
const pdfService = require("../services/pdfService");

function registerPdfIpc() {
  ipcMain.handle("pdf:customerStatement", async (event, params) => {
    try {
      const result = await pdfService.generateCustomerStatement(params);
      return { success: true, data: result };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle("pdf:supplierStatement", async (event, params) => {
    try {
      const result = await pdfService.generateSupplierStatement(params);
      return { success: true, data: result };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  console.log("[IPC] PDF statement channels registered (customerStatement, supplierStatement).");
}

module.exports = registerPdfIpc;
