const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const { initDatabase, closeConnection } = require("../database");
const { registerIpcHandlers } = require("../ipc");
const { createMainWindow, getMainWindow } = require("./window");

// 1. Single Instance Lock (Enforced ONLY in production)
// Allows development workflow (yarn dev / npm run dev) to run concurrently even if a production .exe is active
if (app.isPackaged) {
  const gotTheLock = app.requestSingleInstanceLock();
  if (!gotTheLock) {
    app.quit();
    process.exit(0);
  }

  app.on("second-instance", () => {
    const win = getMainWindow();
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });
}

// 2. App Initialization Workflow
app.whenReady().then(() => {
  console.log("[Electron Main] Application starting...");

  // STEP 1: Register IPC channels FIRST before creating any window
  try {
    registerIpcHandlers();
  } catch (error) {
    console.error("[Electron Main] Failed to register IPC handlers:", error);
  }

  // STEP 2: Initialize SQLite Database and run schema migrations
  try {
    initDatabase();
  } catch (error) {
    console.error("[Electron Main] Database initialization failed:", error);
  }

  // STEP 3: Register Window Titlebar Control IPCs
  ipcMain.on("app:close", () => {
    const win = getMainWindow();
    if (win) win.close();
  });
  ipcMain.on("app:minimize", () => {
    const win = getMainWindow();
    if (win) win.minimize();
  });
  ipcMain.on("app:maximize", () => {
    const win = getMainWindow();
    if (win) {
      if (win.isMaximized()) win.unmaximize();
      else win.maximize();
    }
  });

  // STEP 4: Create UI Window AFTER IPC handlers are guaranteed to be registered
  createMainWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

// 3. Graceful Shutdown & Database Cleanup
let isDbClosed = false;

const safeCloseConnection = () => {
  if (!isDbClosed) {
    try {
      closeConnection();
      isDbClosed = true;
      console.log("[Electron Main] Database connection closed gracefully.");
    } catch (err) {
      console.error("[Electron Main] Error closing database:", err);
    }
  }
};

app.on("window-all-closed", () => {
  safeCloseConnection();
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  safeCloseConnection();
});
