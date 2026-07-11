// Voto+ Desktop — Electron main process (CommonJS).
// - Crea una BrowserWindow frameless in stile app moderna
// - IPC handlers per window controls (minimize/maximize/close)
// - Auto-update via electron-updater (GitHub Releases feed)
// - Discord-style: check silenzioso all'avvio + notifica toast quando pronto

import { app, BrowserWindow, ipcMain, shell } from "electron";
import path from "node:path";
import { autoUpdater } from "electron-updater";

process.env.APP_ROOT = path.join(__dirname, "..");
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");

let mainWindow: BrowserWindow | null = null;

// ===================== AUTO-UPDATER =====================
// Configurazione: legge automaticamente da package.json > build.publish (GitHub).
// autoDownload false = decidiamo noi quando scaricare (bottone in Impostazioni).
// autoInstallOnAppQuit true = installa alla chiusura naturale dell'app.
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

function wireUpdaterEvents(win: BrowserWindow) {
  autoUpdater.on("checking-for-update", () => {
    win.webContents.send("updater:status", { state: "checking" });
  });

  autoUpdater.on("update-available", (info) => {
    win.webContents.send("updater:status", {
      state: "available",
      version: info.version,
      releaseNotes: (info as any).releaseNotes ?? null,
      releaseDate: (info as any).releaseDate ?? null,
    });
  });

  autoUpdater.on("update-not-available", (info) => {
    win.webContents.send("updater:status", {
      state: "up-to-date",
      version: info.version,
    });
  });

  autoUpdater.on("download-progress", (progress) => {
    win.webContents.send("updater:status", {
      state: "downloading",
      percent: progress.percent,
      bytesPerSecond: progress.bytesPerSecond,
      transferred: progress.transferred,
      total: progress.total,
    });
  });

  autoUpdater.on("update-downloaded", (info) => {
    win.webContents.send("updater:status", {
      state: "downloaded",
      version: info.version,
    });
  });

  autoUpdater.on("error", (err) => {
    win.webContents.send("updater:status", {
      state: "error",
      message: err?.message ?? String(err),
    });
  });
}

// Silent check all'avvio (Discord-style). Solo in produzione.
async function silentStartupCheck() {
  if (VITE_DEV_SERVER_URL) return; // skip in dev
  try {
    await autoUpdater.checkForUpdates();
  } catch (err) {
    console.warn("[updater] silent check failed:", err);
  }
}

// ===================== WINDOW =====================
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 1024,
    minHeight: 640,
    backgroundColor: "#0b0714", // colors.bg — evita flash bianco
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "hidden",
    titleBarOverlay:
      process.platform === "win32"
        ? { color: "#0b0714", symbolColor: "#ffffff", height: 40 }
        : undefined,
    frame: process.platform === "darwin", // macOS: frame nativo con hiddenInset (traffic lights); Windows/Linux: frameless con overlay
    show: false, // mostro dopo ready-to-show per evitare flicker
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
  });

  // Link esterni si aprono nel browser di sistema, non dentro Electron.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http")) shell.openExternal(url);
    return { action: "deny" };
  });

  if (VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    mainWindow.loadFile(path.join(RENDERER_DIST, "index.html"));
  }

  wireUpdaterEvents(mainWindow);

  // 3 secondi dopo l'avvio, silent check.
  setTimeout(silentStartupCheck, 3000);
}

// ===================== IPC HANDLERS =====================
ipcMain.handle("window:minimize", () => mainWindow?.minimize());
ipcMain.handle("window:maximize", () => {
  if (!mainWindow) return false;
  if (mainWindow.isMaximized()) mainWindow.unmaximize();
  else mainWindow.maximize();
  return mainWindow.isMaximized();
});
ipcMain.handle("window:close", () => mainWindow?.close());
ipcMain.handle("window:isMaximized", () => mainWindow?.isMaximized() ?? false);

ipcMain.handle("app:getVersion", () => app.getVersion());
ipcMain.handle("app:getPlatform", () => process.platform);

ipcMain.handle("updater:check", async () => {
  try {
    const result = await autoUpdater.checkForUpdates();
    return { ok: true, updateInfo: result?.updateInfo ?? null };
  } catch (err: any) {
    return { ok: false, error: err?.message ?? String(err) };
  }
});

ipcMain.handle("updater:download", async () => {
  try {
    await autoUpdater.downloadUpdate();
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message ?? String(err) };
  }
});

ipcMain.handle("updater:installNow", () => {
  // isSilent = true: non mostra la wizard NSIS. isForceRunAfter = true: riapre l'app.
  autoUpdater.quitAndInstall(true, true);
});

ipcMain.handle("external:open", (_e, url: string) => {
  if (typeof url === "string" && url.startsWith("http")) {
    shell.openExternal(url);
  }
});

// ===================== APP LIFECYCLE =====================
app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
