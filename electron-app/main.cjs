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

    const { exec } = require('child_process');
    const util = require('util');
    const execAsync = util.promisify(exec);

    ipcMain.handle('get-active-window', async () => {
        try {
            if (process.platform === 'win32') {
                const psScript = `
                    Add-Type @"
                      using System;
                      using System.Runtime.InteropServices;
                      using System.Text;
                      public class Win32 {
                        [DllImport("user32.dll")]
                        public static extern IntPtr GetForegroundWindow();
                        [DllImport("user32.dll")]
                        public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);
                        [DllImport("user32.dll")]
                        public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);
                      }
"@
                    $hwnd = [Win32]::GetForegroundWindow()
                    $sb = New-Object System.Text.StringBuilder 500
                    [Win32]::GetWindowText($hwnd, $sb, $sb.Capacity) | Out-Null
                    $processId = 0
                    [Win32]::GetWindowThreadProcessId($hwnd, [ref]$processId) | Out-Null
                    $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
                    $result = @{
                      title = $sb.ToString()
                      owner = @{ name = if ($process) { $process.ProcessName } else { "Unknown" } }
                    }
                    $result | ConvertTo-Json -Compress
                `;
                const b64 = Buffer.from(psScript, 'utf16le').toString('base64');
                const { stdout } = await execAsync(`powershell -NoProfile -EncodedCommand ${b64}`);
                return JSON.parse(stdout);
            }
            return { title: 'Unknown', owner: { name: 'Unknown' } };
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
