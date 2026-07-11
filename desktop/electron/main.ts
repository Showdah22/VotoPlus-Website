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

// Periodic auto-check: ogni 30 minuti l'app cerca aggiornamenti in background.
// Se ne trova uno, il badge nella titlebar appare automaticamente senza
// bisogno che l'utente vada in Impostazioni.
const AUTO_CHECK_INTERVAL_MS = 30 * 60 * 1000;
let periodicTimer: NodeJS.Timeout | null = null;
function startPeriodicUpdateCheck() {
  if (VITE_DEV_SERVER_URL) return; // skip in dev
  if (periodicTimer) return;
  periodicTimer = setInterval(async () => {
    try {
      await autoUpdater.checkForUpdates();
    } catch (err) {
      console.warn("[updater] periodic check failed:", err);
    }
  }, AUTO_CHECK_INTERVAL_MS);
}
function stopPeriodicUpdateCheck() {
  if (periodicTimer) {
    clearInterval(periodicTimer);
    periodicTimer = null;
  }
}

// ===================== WINDOW =====================
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 1024,
    minHeight: 640,
    backgroundColor: "#0a0a0f", // colors.bg — allineato al mobile
    // macOS: hiddenInset lascia i traffic lights nativi in alto-sx.
    // Windows/Linux: frameless completo → titlebar 100% custom (nostro TitleBar.tsx).
    // NB: NON usiamo titleBarOverlay perché creava una banda nativa sopra al nostro
    // TitleBar React (double-render + linea di bordo). Ora la titlebar è unica.
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "hidden",
    trafficLightPosition: process.platform === "darwin" ? { x: 12, y: 8 } : undefined,
    frame: process.platform === "darwin",
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

  // Permessi Chromium: auto-grant microfono per l'interrogazione vocale.
  // Electron di default nega tutte le permission requests da renderer;
  // qui autorizziamo esplicitamente solo mic/audioCapture.
  mainWindow.webContents.session.setPermissionRequestHandler((_wc, permission, callback) => {
    if (permission === "media" || (permission as string) === "audioCapture") {
      callback(true);
    } else {
      callback(false);
    }
  });

  // 3 secondi dopo l'avvio, silent check + avvia il polling periodico
  // (ogni 30 min) così il badge di aggiornamento appare automaticamente
  // anche durante l'uso, non solo all'avvio.
  setTimeout(silentStartupCheck, 3000);
  startPeriodicUpdateCheck();
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
// Single-instance lock — impedisce di aprire più finestre di Voto+ Desktop
// contemporaneamente. Se una seconda istanza viene lanciata (es. l'utente
// clicca di nuovo sull'icona), quit immediato e focus alla finestra
// esistente (portata in primo piano e de-minimizzata).
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    createWindow();

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });
}

app.on("window-all-closed", () => {
  stopPeriodicUpdateCheck();
  if (process.platform !== "darwin") app.quit();
});
