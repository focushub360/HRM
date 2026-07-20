const { app, BrowserWindow, ipcMain, powerMonitor } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.cjs'),
            contextIsolation: true,
            nodeIntegration: false,
            nodeIntegration: false,
        },
        icon: path.join(__dirname, '../src/assets/icon.png')
    });

    if (app.isPackaged) {
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    } else {
        const startUrl = process.env.ELECTRON_START_URL || 'http://localhost:5173';
        mainWindow.loadURL(startUrl);
    }
}

app.whenReady().then(() => {
    // Automatically allow camera and microphone access
    const { session } = require('electron');
    session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
        if (permission === 'media') {
            callback(true);
        } else {
            callback(true);
        }
    });

    session.defaultSession.setPermissionCheckHandler((webContents, permission) => {
        if (permission === 'media') {
            return true;
        }
        return true;
    });

    createWindow();

    ipcMain.handle('get-active-window', async () => {
        try {
            const activeWindow = (await import('active-win')).default;
            const result = await activeWindow();
            return result;
        } catch (error) {
            console.error("Error getting active window:", error);
            return null;
        }
    });

    ipcMain.handle('get-system-idle-time', () => {
        return powerMonitor.getSystemIdleTime();
    });

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
