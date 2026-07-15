// Voto+ Desktop — Electron main process (CommonJS).
// - Crea una BrowserWindow frameless in stile app moderna
// - IPC handlers per window controls (minimize/maximize/close)
// - Auto-update via electron-updater (GitHub Releases feed)
// - Discord-style: check silenzioso all'avvio + notifica toast quando pronto

import { app, BrowserWindow, ipcMain, shell, systemPreferences } from "electron";
import path from "node:path";
import { autoUpdater } from "electron-updater";

process.env.APP_ROOT = path.join(__dirname, "..");
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");

let mainWindow: BrowserWindow | null = null;

// ===================== DEEP-LINK CUSTOM PROTOCOL =====================
// Voto+ Desktop registra il custom URL scheme `votoplus://` per ricevere le
// callback di autenticazione Google (via Emergent) e altri deep-link.
// Flusso Google:
//   1. Renderer → main IPC "auth:startGoogle"
//   2. Main apre https://auth.emergentagent.com/?redirect=votoplus%3A%2F%2Fauth
//      nel browser di sistema
//   3. Utente logga con Google → Emergent redirige a `votoplus://auth?session_id=XYZ`
//      (o `#session_id=XYZ` nell'hash)
//   4. Il SO apre Voto+ Desktop se non è già aperto (single-instance).
//      Su macOS arriva via `open-url`; su Windows come argomento in `argv`.
//   5. Main parse il session_id e invia IPC "auth:googleCallback" al renderer,
//      che chiama POST /api/auth/google con il session_id come session_token.
const PROTOCOL_SCHEME = "votoplus";
// Ultimo session_id ricevuto quando il renderer non era ancora pronto ad
// ascoltare (es. app freschi lanciata dal deep-link). Verrà consegnato al
// primo subscribe.
let pendingAuthSessionId: string | null = null;
let pendingAuthError: string | null = null;

function parseAuthDeepLink(deepLinkUrl: string): { session_id?: string; error?: string } {
  try {
    // Accetta sia `?session_id=` che `#session_id=` (Emergent usa fragment).
    // Normalizziamo sostituendo il primo `#` con `?` se non c'è già `?`.
    const normalized = deepLinkUrl.includes("?")
      ? deepLinkUrl.replace(/#/, "&")
      : deepLinkUrl.replace(/#/, "?");
    const u = new URL(normalized);
    // Verifica che sia effettivamente il nostro protocollo + path auth
    if (u.protocol !== `${PROTOCOL_SCHEME}:`) return {};
    if (!u.host && !u.pathname.startsWith("/auth") && u.pathname !== "//auth" && u.pathname !== "auth") {
      // Alcune varianti Windows mettono "auth" come host
    }
    const session_id = u.searchParams.get("session_id") || undefined;
    const error = u.searchParams.get("error") || undefined;
    return { session_id, error };
  } catch (e) {
    console.warn("[deeplink] parse failed:", e, deepLinkUrl);
    return {};
  }
}

function handleAuthDeepLink(deepLinkUrl: string) {
  const { session_id, error } = parseAuthDeepLink(deepLinkUrl);
  if (!session_id && !error) return; // non è un deep-link auth valido

  // Se la window esiste ed è pronta, invia subito. Altrimenti, memorizza per
  // il primo subscribe dal renderer (via IPC "auth:consumePending").
  if (mainWindow && !mainWindow.webContents.isLoading()) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
    mainWindow.webContents.send("auth:googleCallback", { session_id, error });
  } else {
    pendingAuthSessionId = session_id ?? null;
    pendingAuthError = error ?? null;
  }
}

// Estrae il deep-link `votoplus://...` dagli argomenti di avvio (Windows).
function extractDeepLinkFromArgv(argv: string[]): string | null {
  return argv.find((a) => a.startsWith(`${PROTOCOL_SCHEME}://`)) ?? null;
}

// ===================== AUTO-UPDATER =====================
// Comportamento a due modalità:
//
// 1) STARTUP (freschi all'avvio dell'app):
//    Se il check silenzioso all'apertura trova un update → SCARICHIAMO e
//    INSTALLIAMO automaticamente, riavviando l'app sulla nuova versione.
//    L'utente vede solo la progress bar in titlebar per pochi secondi.
//    Motivazione: quando apri l'app "per iniziare a lavorare" è il momento
//    meno intrusivo per applicare l'aggiornamento.
//
// 2) RUNTIME (app già aperta da tempo):
//    Se il check periodico (30 min) o quello manuale (Impostazioni) trova
//    un update → mostriamo il badge nella titlebar e ASPETTIAMO che
//    l'utente clicchi "Installa e riavvia". Motivazione: mentre l'utente
//    sta lavorando NON dobbiamo interromperlo con un restart improvviso.
//
// Flag `isStartupAutoUpdate`:
//   - true durante il primo check di avvio (settato in silentStartupCheck())
//   - false in tutti gli altri check (periodici + manuali)
//   - resettato dopo update-not-available / error / update-downloaded
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;
let isStartupAutoUpdate = false;

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
    // ⚡ Modalità STARTUP: scarichiamo immediatamente in background.
    // La UI riceverà eventi "downloading" (con progress) e poi "downloaded".
    if (isStartupAutoUpdate) {
      autoUpdater.downloadUpdate().catch((err) => {
        console.warn("[updater] auto-download at startup failed:", err);
        isStartupAutoUpdate = false; // reset per non bloccare i check successivi
      });
    }
  });

  autoUpdater.on("update-not-available", (info) => {
    win.webContents.send("updater:status", {
      state: "up-to-date",
      version: info.version,
    });
    isStartupAutoUpdate = false; // check iniziale concluso senza update
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
    // ⚡ Modalità STARTUP: installiamo immediatamente e riavviamo sulla
    // nuova versione. Piccolo delay (800ms) per permettere alla UI di
    // mostrare lo stato "downloaded" prima del riavvio (feedback visivo).
    if (isStartupAutoUpdate) {
      isStartupAutoUpdate = false; // reset — non ripeteremo questo flow
      setTimeout(() => {
        // quitAndInstall(isSilent=true, isForceRunAfter=true):
        // installer NSIS silenzioso su Windows + app riaperta automaticamente.
        try {
          autoUpdater.quitAndInstall(true, true);
        } catch (err) {
          console.warn("[updater] quitAndInstall failed:", err);
        }
      }, 800);
    }
    // Runtime: la UI mostra il pulsante "Installa e riavvia" e aspetta il
    // click dell'utente (via IPC "updater:installNow").
  });

  autoUpdater.on("error", (err) => {
    // Se la release esiste (tag presente su GitHub) ma gli asset non sono
    // ancora stati caricati (CI in corso), electron-updater fallisce con
    // HttpError 404 su `latest.yml` / `latest-mac.yml` o sui binari.
    // Trattiamo questa condizione come "up-to-date temporaneo" invece che
    // errore visibile all'utente — la prossima passata (periodic o manuale)
    // troverà la release completa. Evita di spaventare gli utenti che vedono
    // "impossibile controllare gli aggiornamenti" durante il release freschi.
    const msg = String(err?.message ?? err ?? "");
    const isReleaseIncomplete =
      /404/.test(msg) ||
      /Not Found/i.test(msg) ||
      /HttpError/i.test(msg) ||
      /latest.*\.yml/i.test(msg) ||
      /ENOTFOUND/i.test(msg);

    if (isReleaseIncomplete) {
      console.info("[updater] release not yet complete, treating as up-to-date:", msg);
      win.webContents.send("updater:status", {
        state: "up-to-date",
        version: app.getVersion(),
        releaseIncomplete: true, // hint per la UI se vuole gestirlo diversamente
      });
    } else {
      win.webContents.send("updater:status", {
        state: "error",
        message: err?.message ?? String(err),
      });
    }
    isStartupAutoUpdate = false;
  });
}

// Silent check all'avvio (Discord-style). Solo in produzione.
// Attiva la modalità STARTUP → se trova un update lo scarica e installa
// automaticamente (vedi commento sopra su isStartupAutoUpdate).
async function silentStartupCheck() {
  if (VITE_DEV_SERVER_URL) return; // skip in dev
  try {
    isStartupAutoUpdate = true;
    await autoUpdater.checkForUpdates();
  } catch (err) {
    console.warn("[updater] silent check failed:", err);
    isStartupAutoUpdate = false;
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
      isStartupAutoUpdate = false; // runtime: NON auto-installiamo, aspettiamo click utente
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
  //
  // ⚠️ MACOS: setPermissionRequestHandler NON basta. Chromium chiede il
  // permesso a Chromium (che noi diciamo "ok"), ma poi il *sistema* macOS
  // deve dare il consenso via TCC. Servono TUTTI questi elementi combinati:
  //  1. NSMicrophoneUsageDescription in Info.plist (package.json extendInfo) ✓
  //  2. Entitlement com.apple.security.device.audio-input (entitlements.mac.plist) ✓
  //  3. setPermissionCheckHandler (sotto) — Chromium controlla il permesso
  //     ad ogni chiamata getUserMedia; se non risponde, il browser mostra
  //     ripetutamente il popup di conferma.
  //  4. askForMediaAccess (all'avvio in whenReady) — chiede UNA volta il
  //     permesso a macOS e lo memorizza in TCC.db.
  mainWindow.webContents.session.setPermissionRequestHandler((_wc, permission, callback) => {
    if (
      permission === "media" ||
      (permission as string) === "audioCapture" ||
      (permission as string) === "videoCapture"
    ) {
      callback(true);
    } else {
      callback(false);
    }
  });
  // FIX macOS: senza il check handler Chromium chiede il permesso ad OGNI
  // getUserMedia. Con questo, una volta autorizzato è auto-approvato per
  // tutta la sessione.
  mainWindow.webContents.session.setPermissionCheckHandler(
    (_wc, permission /*, _requestingOrigin, _details */) => {
      if (
        permission === "media" ||
        (permission as string) === "audioCapture" ||
        (permission as string) === "microphone"
      ) {
        return true;
      }
      return false;
    },
  );

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
    isStartupAutoUpdate = false; // manuale: NON auto-installiamo
    const result = await autoUpdater.checkForUpdates();
    return { ok: true, updateInfo: result?.updateInfo ?? null };
  } catch (err: any) {
    // Se la release è incompleta (CI in corso), non è un vero errore.
    // Il pulsante manuale deve comportarsi come "sei aggiornato" invece che
    // mostrare l'errore, per non far ricomparire la scritta rossa quando
    // l'utente clicca "Cerca aggiornamenti" durante un rilascio in corso.
    const msg = String(err?.message ?? err ?? "");
    const isReleaseIncomplete =
      /404/.test(msg) ||
      /Not Found/i.test(msg) ||
      /HttpError/i.test(msg) ||
      /latest.*\.yml/i.test(msg) ||
      /ENOTFOUND/i.test(msg);
    if (isReleaseIncomplete) {
      console.info("[updater:check] release not yet complete:", msg);
      return { ok: true, updateInfo: null, releaseIncomplete: true };
    }
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

// ===================== AUTH IPC =====================
// Il renderer chiama `voto.auth.startGoogleLogin()` per avviare il flusso.
// Costruiamo l'URL Emergent con redirect a una BRIDGE PAGE HTTPS (che poi
// invoca il custom protocol) invece di puntare direttamente a
// `votoplus://auth`. Motivazione:
//   1. Nel popup "Aprire Voto+ Desktop?" il browser mostra l'origine del
//      redirect (Emergent), non un URL scheme grezzo → messaggio pulito.
//   2. Dopo il click l'utente vede una pagina di successo con "Puoi chiudere
//      questa finestra" invece di rimanere su una pagina bianca Emergent.
//   3. La bridge page può auto-chiudersi (window.close) e mostrare feedback.
const AUTH_BRIDGE_URL = "https://votoplus.it/desktop-login.html";
ipcMain.handle("auth:startGoogle", () => {
  const authUrl = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(AUTH_BRIDGE_URL)}`;
  shell.openExternal(authUrl);
});

// Il renderer chiama questo appena LoginPage monta per "consumare" eventuali
// deep-link auth arrivati mentre l'app era ancora in avvio (freschi lanciata
// direttamente da `votoplus://auth?session_id=...`).
ipcMain.handle("auth:consumePending", () => {
  const payload = { session_id: pendingAuthSessionId, error: pendingAuthError };
  pendingAuthSessionId = null;
  pendingAuthError = null;
  return payload;
});

// ===================== APP LIFECYCLE =====================
// Registra il custom URL scheme `votoplus://` come default handler per questa
// app. Deve essere fatto PRIMA di app.whenReady() per essere efficace su tutte
// le piattaforme.
if (process.defaultApp) {
  // In dev, con `electron .` bisogna passare argv[1] per registrare correttamente.
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient(PROTOCOL_SCHEME, process.execPath, [
      path.resolve(process.argv[1]),
    ]);
  }
} else {
  app.setAsDefaultProtocolClient(PROTOCOL_SCHEME);
}

// macOS: quando l'app è già aperta e riceve un deep-link `votoplus://...`,
// il SO emette l'evento `open-url`. Su Windows/Linux invece arriva come
// argomento della second-instance (gestito sotto in `second-instance`).
app.on("open-url", (event, url) => {
  event.preventDefault();
  handleAuthDeepLink(url);
});

// Single-instance lock — impedisce di aprire più finestre di Voto+ Desktop
// contemporaneamente. Se una seconda istanza viene lanciata (es. l'utente
// clicca di nuovo sull'icona), quit immediato e focus alla finestra
// esistente (portata in primo piano e de-minimizzata).
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on("second-instance", (_event, argv) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
    // Windows: il deep-link arriva come uno degli argomenti di avvio.
    const deepLink = extractDeepLinkFromArgv(argv);
    if (deepLink) handleAuthDeepLink(deepLink);
  });

  app.whenReady().then(async () => {
    // Se l'app è stata avviata direttamente dal deep-link (freschi lanciata),
    // il link è tra gli argomenti di avvio. Lo memorizziamo per essere
    // consumato quando il renderer sarà pronto (LoginPage montata).
    const initialDeepLink = extractDeepLinkFromArgv(process.argv);
    if (initialDeepLink) {
      const { session_id, error } = parseAuthDeepLink(initialDeepLink);
      pendingAuthSessionId = session_id ?? null;
      pendingAuthError = error ?? null;
    }

    // MACOS: Chiediamo il permesso microfono al sistema UNA volta all'avvio.
    // Il consenso viene memorizzato in TCC.db così le successive
    // getUserMedia non triggerano nuove richieste. `askForMediaAccess`
    // è no-op su Windows/Linux (ritorna Promise<true>).
    if (process.platform === "darwin") {
      try {
        const currentStatus = systemPreferences.getMediaAccessStatus("microphone");
        if (currentStatus !== "granted") {
          // Mostra il popup di sistema; se già negato, questa chiamata è no-op
          // e l'utente dovrà abilitare manualmente da Impostazioni Sistema.
          await systemPreferences.askForMediaAccess("microphone");
        }
      } catch (e) {
        console.warn("[main] askForMediaAccess failed", e);
      }
    }

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
