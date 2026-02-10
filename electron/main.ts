import { app, BrowserWindow, shell } from 'electron';
import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as http from 'http';

let mainWindow: BrowserWindow | null = null;
let backendProcess: ChildProcess | null = null;

const BACKEND_PORT = 8741;
const BACKEND_URL = `http://127.0.0.1:${BACKEND_PORT}`;
const isDev = process.env.NODE_ENV === 'development';

function startBackend(): void {
  const pythonCommand = process.platform === 'win32' ? 'python' : 'python3';
  const backendDir = isDev
    ? path.join(__dirname, '..', 'backend')
    : path.join(process.resourcesPath, 'backend');

  console.log(`Starting backend from: ${backendDir}`);

  backendProcess = spawn(pythonCommand, ['-m', 'backend.app.main'], {
    cwd: path.join(backendDir, '..'),
    env: {
      ...process.env,
      FILMSTUDIO_HOST: '127.0.0.1',
      FILMSTUDIO_PORT: String(BACKEND_PORT),
    },
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  backendProcess.stdout?.on('data', (data) => {
    console.log(`[Backend] ${data.toString().trim()}`);
  });

  backendProcess.stderr?.on('data', (data) => {
    console.error(`[Backend] ${data.toString().trim()}`);
  });

  backendProcess.on('error', (err) => {
    console.error('Failed to start backend:', err);
  });

  backendProcess.on('exit', (code) => {
    console.log(`Backend exited with code ${code}`);
    backendProcess = null;
  });
}

function waitForBackend(maxAttempts = 30): Promise<void> {
  return new Promise((resolve, reject) => {
    let attempts = 0;

    const check = () => {
      attempts++;
      const req = http.get(`${BACKEND_URL}/api/health`, (res) => {
        if (res.statusCode === 200) {
          resolve();
        } else if (attempts < maxAttempts) {
          setTimeout(check, 1000);
        } else {
          reject(new Error('Backend health check failed'));
        }
      });

      req.on('error', () => {
        if (attempts < maxAttempts) {
          setTimeout(check, 1000);
        } else {
          reject(new Error('Backend not responding'));
        }
      });

      req.end();
    };

    check();
  });
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'AI Filmmaking Studio',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    backgroundColor: '#0a0a0f',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    icon: path.join(__dirname, '..', 'assets', 'icon.png'),
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'frontend', 'dist', 'index.html'));
  }

  // Open external links in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  startBackend();

  try {
    console.log('Waiting for backend to start...');
    await waitForBackend();
    console.log('Backend is ready');
  } catch (err) {
    console.error('Backend startup failed:', err);
    // Continue anyway - the frontend will show the connection error
  }

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (backendProcess) {
    backendProcess.kill();
    backendProcess = null;
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (backendProcess) {
    backendProcess.kill();
    backendProcess = null;
  }
});
