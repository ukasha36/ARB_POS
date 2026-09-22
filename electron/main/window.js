const { app, BrowserWindow } = require("electron");
const path = require("path");

let mainWindow = null;

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 768,
    minWidth: 1024,
    minHeight: 640,
    title: "ARB POS & ERP Solution",
    icon: path.join(__dirname, "../../src/assets/logo.ico"),
    backgroundColor: "#F8FAFC",
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.setMenu(null);

  // CRITICAL FIX: Use app.isPackaged to reliably detect production mode
  const isDev = !app.isPackaged;

  if (isDev) {
    const devUrl = process.env.VITE_DEV_SERVER_URL || "http://localhost:5173";
    mainWindow.loadURL(devUrl);
    // Open DevTools automatically during development
    mainWindow.webContents.openDevTools();
  } else {
    // Load local dist/index.html file in production
    mainWindow.loadFile(path.join(__dirname, "../../dist/index.html"));
  }

  mainWindow.once("ready-to-show", () => {
    mainWindow.maximize();
    mainWindow.show();
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  return mainWindow;
}

function getMainWindow() {
  return mainWindow;
}

module.exports = {
  createMainWindow,
  getMainWindow,
};
