const fs = require('fs/promises');
const path = require('path');
const { app, BrowserWindow, dialog } = require('electron');
const { getMainWindow } = require('../main/window');
const reportService = require('../services/reportService');
const {
  buildCustomerStatementHtml,
  buildSupplierStatementHtml,
} = require('../templates/statementTemplate');

let exportQueue = Promise.resolve();

function runExclusive(task) {
  const result = exportQueue.then(task, task);
  exportQueue = result.catch(() => undefined);
  return result;
}

function parsePartyId(value, label) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error(`${label} ID is required.`);
  }
  return id;
}

function validateDateRange(dateFrom, dateTo) {
  if (dateFrom && dateTo && dateFrom > dateTo) {
    throw new Error('From Date must be on or before To Date.');
  }
}

function normalizeParams(params) {
  return {
    dateFrom: params.dateFrom || null,
    dateTo: params.dateTo || null,
    action: params.action === 'print' ? 'print' : 'save',
  };
}

function sanitizeFileName(value, fallback) {
  const cleaned = String(value || '')
    .replace(/[^a-z0-9._-]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return cleaned || fallback;
}

function createStatementNumber(kind, partyId) {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const prefix = kind === 'customer' ? 'CS' : 'SS';
  return `${prefix}-${datePart}-${String(partyId).padStart(4, '0')}`;
}

function formatGeneratedAt() {
  return new Date().toLocaleString('en-PK', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

async function createPrintWindow(html) {
  const window = new BrowserWindow({
    show: false,
    width: 794,
    height: 1123,
    backgroundColor: '#ffffff',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  try {
    await window.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
    return window;
  } catch (error) {
    if (!window.isDestroyed()) {
      window.destroy();
    }
    throw error;
  }
}

async function destroyPrintWindow(window) {
  if (window && !window.isDestroyed()) {
    window.destroy();
  }
}

async function printStatement(window) {
  await new Promise((resolve, reject) => {
    let settled = false;
    const finish = (error) => {
      if (settled) return;
      settled = true;
      if (error) reject(error);
      else resolve();
    };

    window.webContents.print({ silent: false, printBackground: true }, (success, failureReason) => {
      finish(success ? null : new Error(failureReason || 'Unable to print statement.'));
    });
  });
}

async function saveStatement(window, party, kind) {
  const parent = getMainWindow();
  const partyName = sanitizeFileName(party.title || party.code, kind === 'customer' ? 'customer' : 'supplier');
  const defaultPath = path.join(
    path.dirname(require('../database').getDatabasePath()),
    `${partyName}-statement.pdf`,
  );

  const result = await dialog.showSaveDialog(parent || undefined, {
    title: 'Save Statement PDF',
    defaultPath,
    filters: [{ name: 'PDF Document', extensions: ['pdf'] }],
  });

  if (result.canceled || !result.filePath) {
    return { canceled: true };
  }

  const pdf = await window.webContents.printToPDF({
    printBackground: true,
    pageSize: 'A4',
    preferCSSPageSize: true,
    margins: { top: 0, bottom: 0, left: 0, right: 0 },
  });

  await fs.writeFile(result.filePath, pdf);
  return { filePath: result.filePath };
}

async function generateStatement(kind, rawParams) {
  return runExclusive(async () => {
    const params = normalizeParams(rawParams || {});
    validateDateRange(params.dateFrom, params.dateTo);

    const partyId = parsePartyId(rawParams.partyId, kind === 'customer' ? 'Customer' : 'Supplier');
    const data = kind === 'customer'
      ? reportService.getCustomerLedger(partyId, params.dateFrom, params.dateTo)
      : reportService.getSupplierLedger(partyId, params.dateFrom, params.dateTo);
    const party = kind === 'customer' ? data.customer : data.supplier;
    const html = kind === 'customer'
      ? buildCustomerStatementHtml(data, {
          dateFrom: params.dateFrom,
          dateTo: params.dateTo,
          generatedAt: formatGeneratedAt(),
          statementNo: createStatementNumber(kind, partyId),
        })
      : buildSupplierStatementHtml(data, {
          dateFrom: params.dateFrom,
          dateTo: params.dateTo,
          generatedAt: formatGeneratedAt(),
          statementNo: createStatementNumber(kind, partyId),
        });

    const window = await createPrintWindow(html);
    try {
      if (params.action === 'print') {
        await printStatement(window);
        return { printed: true };
      }

      const saveResult = await saveStatement(window, party, kind);
      return saveResult.canceled ? { canceled: true } : { filePath: saveResult.filePath };
    } finally {
      await destroyPrintWindow(window);
    }
  });
}

function generateCustomerStatement(params) {
  return generateStatement('customer', params);
}

function generateSupplierStatement(params) {
  return generateStatement('supplier', params);
}

module.exports = {
  generateCustomerStatement,
  generateSupplierStatement,
};
