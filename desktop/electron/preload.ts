// Preload script — unico ponte sicuro tra Electron main (Node.js) e Renderer (browser).
// contextIsolation: true → il renderer NON può vedere Node.js direttamente.
// Tutto quello che il renderer può usare è esposto qui via contextBridge.

import { contextBridge, ipcRenderer } from "electron";

export type UpdaterState =
  | { state: "idle" }
  | { state: "checking" }
  | { state: "up-to-date"; version: string }
  | { state: "available"; version: string; releaseNotes: string | null; releaseDate: string | null }
  | { state: "downloading"; percent: number; bytesPerSecond: number; transferred: number; total: number }
  | { state: "downloaded"; version: string }
  | { state: "error"; message: string };

contextBridge.exposeInMainWorld("voto", {
  // Window controls (per titlebar custom)
  window: {
    minimize: () => ipcRenderer.invoke("window:minimize"),
    maximize: () => ipcRenderer.invoke("window:maximize"),
    close: () => ipcRenderer.invoke("window:close"),
    isMaximized: () => ipcRenderer.invoke("window:isMaximized") as Promise<boolean>,
  },

  // App info
  app: {
    getVersion: () => ipcRenderer.invoke("app:getVersion") as Promise<string>,
    getPlatform: () => ipcRenderer.invoke("app:getPlatform") as Promise<NodeJS.Platform>,
  },

  // Auto-updater
  updater: {
    check: () => ipcRenderer.invoke("updater:check"),
    download: () => ipcRenderer.invoke("updater:download"),
    installNow: () => ipcRenderer.invoke("updater:installNow"),
    onStatus: (cb: (status: UpdaterState) => void) => {
      const handler = (_e: unknown, payload: UpdaterState) => cb(payload);
      ipcRenderer.on("updater:status", handler);
      // Return unsubscribe
      return () => ipcRenderer.removeListener("updater:status", handler);
    },
  },

  // External links
  openExternal: (url: string) => ipcRenderer.invoke("external:open", url),
});
