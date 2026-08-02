const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");
const http = require("http");

// Auto-updater — only activated in packaged builds (it needs the update server
// URL baked in by electron-builder, which only happens when published).
let autoUpdater = null;
let updaterStatus = {
  stage: "idle",
  currentVersion: app.getVersion(),
  message: "",
  percent: 0,
  version: "",
};

// Load .env if it exists next to the binary/resources.
const resourcesDir = app.isPackaged ? process.resourcesPath : __dirname;
const envPath = path.join(resourcesDir, ".env");

function loadEnv(filePath) {
  try {
    const text = fs.readFileSync(filePath, "utf8");
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (key && process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  } catch {
    // ignore missing or unreadable .env
  }
}

if (fs.existsSync(envPath)) {
  loadEnv(envPath);
}

// Setup file logging early so we can diagnose why the app won't open.
const userDataDir = app.getPath("userData");
fs.mkdirSync(userDataDir, { recursive: true });
const logPath = path.join(userDataDir, "startup.log");
const serverOutPath = path.join(userDataDir, "server.out.log");
const serverErrPath = path.join(userDataDir, "server.err.log");

// Truncate server logs on each launch so they don't grow unbounded.
function truncateLog(filePath) {
  try {
    fs.writeFileSync(filePath, "");
  } catch {
    // ignore
  }
}
truncateLog(serverOutPath);
truncateLog(serverErrPath);

function logInfo(msg) {
  const line = `[INFO] ${new Date().toISOString()}: ${msg}`;
  try {
    fs.appendFileSync(logPath, `${line}\n`);
  } catch {
    // silently ignore logging failures
  }
  console.log(line);
}

function logError(msg, err) {
  const line = `[ERROR] ${new Date().toISOString()}: ${msg}${err ? ` ${err.message || err}` : ""}`;
  try {
    fs.appendFileSync(logPath, `${line}\n`);
  } catch {
    // silently ignore logging failures
  }
  console.error(line, err || "");
}

logInfo("--- Application starting ---");
logInfo(`resourcesDir=${resourcesDir}`);
logInfo(`userDataDir=${userDataDir}`);

// Windows uses the AppUserModelID for taskbar grouping, jump lists and
// notifications. It must match the electron-builder appId so the taskbar icon
// groups correctly and pinning works.
if (process.platform === "win32") {
  app.setAppUserModelId("com.gradeboost.app");
}

// Prevent multiple instances of the app.
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  logInfo("Another instance is already running. Quitting.");
  app.quit();
  process.exit(0);
}

let serverProcess = null;
let mainWindow = null;
// Set when the user explicitly triggers install (Settings → Install).
// quitAndInstall() itself quits the app, so before-quit would otherwise fire
// a second install attempt and log a confusing "already been triggered".
let explicitInstallTriggered = false;

function getFreePort() {
  return new Promise((resolve) => {
    const srv = require("net").createServer();
    srv.listen(0, "127.0.0.1", () => {
      const port = srv.address().port;
      srv.close(() => resolve(port));
    });
    srv.on("error", (err) => {
      logError("Could not find free port", err);
      resolve(0);
    });
  });
}

function waitForServer(port, timeout = 90_000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tryOnce = () => {
      if (Date.now() - start > timeout) {
        return reject(new Error("Server did not start in time"));
      }
      const req = http.get(`http://127.0.0.1:${port}/api/health`, { timeout: 2000 }, (res) => {
        if (res.statusCode === 200) return resolve(true);
        return setTimeout(tryOnce, 500);
      });
      req.on("timeout", () => req.destroy());
      req.on("error", () => {
        if (Date.now() - start > timeout) return reject(new Error("Server did not start in time"));
        setTimeout(tryOnce, 500);
      });
    };
    tryOnce();
  });
}

app.on("ready", async () => {
  const port = await getFreePort();
  if (!port) {
    logError("Could not find a free port");
    app.quit();
    return;
  }

  // Remove any legacy/corrupted PGlite data directory from earlier broken
  // builds. It can contain stale lock files that make PGlite abort on init.
  const legacyDbDir = path.join(userDataDir, "gradeboost-data");
  if (fs.existsSync(legacyDbDir)) {
    try {
      fs.rmSync(legacyDbDir, { recursive: true, force: true });
      logInfo(`Removed legacy/corrupted database directory: ${legacyDbDir}`);
    } catch (err) {
      logError("Could not remove legacy database directory", err);
    }
  }

  const dbDir = path.join(userDataDir, "pglite-data");
  fs.mkdirSync(dbDir, { recursive: true });
  // Use a plain local path. PGlite on Windows does not handle file:// URLs
  // produced by path.join (e.g. file://C:\...) and aborts during init.
  const dbPath = path.join(dbDir, "db");

  const standaloneDir = path.join(resourcesDir, ".next", "standalone");
  const serverPath = path.join(standaloneDir, "server.js");
  logInfo(`serverPath=${serverPath}`);

  if (!fs.existsSync(serverPath)) {
    logError(`CRITICAL: Server script not found at ${serverPath}`);
    app.quit();
    return;
  }

  // Windows uses the .ico for taskbar/window icons — PNG alone is ignored.
  const iconPath = path.join(resourcesDir, "public", "icon.ico");
  const logoPath = path.join(resourcesDir, "public", "studyapplogo.png");
  logInfo(`iconPath=${iconPath} exists=${fs.existsSync(iconPath)}`);
  logInfo(`logoPath=${logoPath} exists=${fs.existsSync(logoPath)}`);

  // Point the standalone Next.js server at the drizzle migrations that were
  // bundled into the Electron resources.
  const migrationsDir = path.join(resourcesDir, "drizzle");
  logInfo(`migrationsDir=${migrationsDir}`);

  // PGlite's WASM aborts when the server is run under Electron's Node runtime,
  // so ship a real Node.js binary inside the standalone output and use it here.
  // In dev the bundled binary won't exist, so fall back to the Electron binary
  // with ELECTRON_RUN_AS_NODE (which is fine on most dev machines).
  const nodeExeName = process.platform === "win32" ? "node.exe" : "node";
  const bundledNodePath = path.join(standaloneDir, nodeExeName);
  const useBundledNode = fs.existsSync(bundledNodePath);
  const binPath = useBundledNode ? bundledNodePath : process.execPath;
  logInfo(`usingBundledNode=${useBundledNode} binPath=${binPath}`);

  const env = {
    ...process.env,
    PORT: String(port),
    PGLITE_DB_PATH: dbPath,
    MIGRATIONS_DIR: migrationsDir,
    NODE_ENV: "production",
  };
  if (!useBundledNode) {
    env.ELECTRON_RUN_AS_NODE = "1";
  }

  serverProcess = spawn(binPath, ["--max-old-space-size=4096", serverPath], {
    cwd: standaloneDir,
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });

  serverProcess.stdout.on("data", (data) => {
    fs.appendFileSync(serverOutPath, data);
  });
  serverProcess.stderr.on("data", (data) => {
    fs.appendFileSync(serverErrPath, data);
  });

  serverProcess.on("error", (err) => {
    logError("[electron] Failed to start Next.js server:", err);
  });
  serverProcess.on("exit", (code) => {
    logInfo(`[electron] Next.js server exited with code ${code}`);
  });

  try {
    logInfo(`Waiting for server on port ${port}...`);
    await waitForServer(port);
    logInfo("Server is healthy. Opening window.");
  } catch (err) {
    logError("Next.js server failed to start", err);
    app.quit();
    return;
  }

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: "#0f0f14",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "preload.js"),
    },
    title: "GradeBoost",
    icon: fs.existsSync(iconPath) ? iconPath : fs.existsSync(logoPath) ? logoPath : undefined,
  });

  // Show the window only once the page has painted to avoid a white flash.
  // Safety net: if the page never fires ready-to-show (slow first render,
  // renderer hiccup), show the window after a few seconds anyway.
  const showTimer = setTimeout(() => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.show();
  }, 6000);
  mainWindow.once("ready-to-show", () => {
    clearTimeout(showTimer);
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.show();
  });

  mainWindow.loadURL(`http://127.0.0.1:${port}`);

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  setupAutoUpdater();
});

function broadcastUpdaterStatus() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("updater:status", updaterStatus);
  }
}

function setupAutoUpdater() {
  // electron-updater only works in packaged builds (it reads update metadata
  // from the publish provider configured at build time). In dev we skip it.
  if (!app.isPackaged) {
    logInfo("Auto-updater disabled (dev mode).");
    return;
  }

  try {
    const { autoUpdater: updater } = require("electron-updater");
    autoUpdater = updater;

    updater.autoDownload = false; // ask the user before downloading
    // We handle install-on-quit ourselves (below) so it can run the NSIS
    // assisted installer silently; electron-updater's built-in path calls
    // quitAndInstall() with non-silent defaults and would show the wizard UI.
    updater.autoInstallOnAppQuit = false;
    updater.logger = {
      info: (msg) => logInfo(`[updater] ${msg}`),
      warn: (msg) => logInfo(`[updater] ${msg}`),
      error: (msg) => logError("[updater]", new Error(String(msg))),
      debug: (msg) => logInfo(`[updater] ${msg}`),
    };

    updater.on("checking-for-update", () => {
      updaterStatus = { ...updaterStatus, stage: "checking", message: "Checking for updates…" };
      broadcastUpdaterStatus();
    });

    updater.on("update-available", (info) => {
      updaterStatus = {
        ...updaterStatus,
        stage: "available",
        version: info && info.version ? info.version : "",
        message: `Version ${info && info.version ? info.version : ""} is available.`,
      };
      broadcastUpdaterStatus();
    });

    updater.on("update-not-available", () => {
      updaterStatus = { ...updaterStatus, stage: "up-to-date", message: "You're on the latest version." };
      broadcastUpdaterStatus();
    });

    updater.on("download-progress", (progress) => {
      updaterStatus = {
        ...updaterStatus,
        stage: "downloading",
        percent: Math.round(progress.percent || 0),
        message: `Downloading update… ${Math.round(progress.percent || 0)}%`,
      };
      broadcastUpdaterStatus();
    });

    updater.on("update-downloaded", (info) => {
      updaterStatus = {
        ...updaterStatus,
        stage: "downloaded",
        version: info && info.version ? info.version : updaterStatus.version,
        message: "Update ready. Restart to install.",
      };
      broadcastUpdaterStatus();
    });

    updater.on("error", (err) => {
      logError("[updater] error", err);
      updaterStatus = {
        ...updaterStatus,
        stage: "error",
        message: err && err.message ? err.message : "Update check failed.",
      };
      broadcastUpdaterStatus();
    });

    ipcMain.handle("updater:get-status", () => updaterStatus);
    ipcMain.handle("updater:check", () => {
      updaterStatus = { ...updaterStatus, stage: "checking", message: "Checking for updates…" };
      broadcastUpdaterStatus();
      return updater.checkForUpdates().catch((err) => {
        logError("[updater] check failed", err);
        updaterStatus = {
          ...updaterStatus,
          stage: "error",
          message: err && err.message ? err.message : "Update check failed.",
        };
        broadcastUpdaterStatus();
      });
    });
    ipcMain.handle("updater:download", () =>
      updater.downloadUpdate().catch((err) => {
        logError("[updater] download failed", err);
        updaterStatus = {
          ...updaterStatus,
          stage: "error",
          message: err && err.message ? err.message : "Download failed.",
        };
        broadcastUpdaterStatus();
      })
    );
    // The NSIS build is an assisted installer (oneClick: false), so a non-silent
    // quitAndInstall() would show the wizard UI and wait for clicks. Pass
    // isSilent=true to run the update fully automatically; isForceRunAfter=true
    // keeps the app relaunching after install.
    ipcMain.handle("updater:install", () => {
      explicitInstallTriggered = true;
      updater.quitAndInstall(true, true);
    });

    // Install-on-quit: autoInstallOnAppQuit is disabled above, so we drive it
    // ourselves to keep the assisted installer silent. Skip if the user already
    // explicitly triggered an install (quitAndInstall() will quit the app,
    // firing before-quit again with stage still "downloaded"). Set the flag
    // here too so a quit-initiated install can't re-fire before-quit.
    app.on("before-quit", () => {
      if (!explicitInstallTriggered && autoUpdater && updaterStatus.stage === "downloaded") {
        explicitInstallTriggered = true;
        autoUpdater.quitAndInstall(true, true);
      }
    });

    // Kick off a quiet background check a few seconds after launch.
    setTimeout(() => {
      updater.checkForUpdates().catch((err) => {
        logError("[updater] background check failed", err);
      });
    }, 8000);

    logInfo("Auto-updater enabled.");
  } catch (err) {
    logError("Failed to initialise auto-updater", err);
  }
}

app.on("second-instance", () => {
  logInfo("Second instance launched. Focusing existing window.");
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

app.on("window-all-closed", () => {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
  if (process.platform !== "darwin") app.quit();
});

app.on("will-quit", () => {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
});
