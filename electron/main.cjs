const { app, BrowserWindow, session } = require('electron');
const { autoUpdater } = require('electron-updater'); // Import autoUpdater
const path = require('path');
const isDev = process.env.NODE_ENV === 'development';

// Automatically download updates in the background
autoUpdater.autoDownload = true;

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: process.platform === 'win32'
      ? path.join(__dirname, '../build/icon.ico')
      : path.join(__dirname, '../build/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Intercept and rewrite Origin header for API and Socket.io requests
  session.defaultSession.webRequest.onBeforeSendHeaders(
    {
      urls: [
        'http://localhost:5000/*',
        'https://drimsapi.umi.ac.ug/*',
      ]
    },
    (details, callback) => {
      details.requestHeaders['Origin'] = 'https://drimrc.umi.ac.ug';
      callback({ cancel: false, requestHeaders: details.requestHeaders });
    }
  );

  if (isDev) {
    mainWindow.loadURL('http://localhost:5181');
    // mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();

  // Check for updates automatically in production
  if (!isDev) {
    autoUpdater.checkForUpdatesAndNotify();

    // Check for updates every 2 hours in the background
    setInterval(() => {
      autoUpdater.checkForUpdates();
    }, 1000 * 60 * 60 * 2);
  }

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});
