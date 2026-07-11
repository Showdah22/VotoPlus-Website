// Zustand store per stato auto-updater.
// Ascolta gli eventi IPC dal main process e li rende reattivi nel React tree.

import { create } from "zustand";
import type { UpdaterState } from "../../electron/preload";

type UpdaterStore = {
  status: UpdaterState;
  setStatus: (s: UpdaterState) => void;
  reset: () => void;
};

export const useUpdater = create<UpdaterStore>((set) => ({
  status: { state: "idle" },
  setStatus: (s) => set({ status: s }),
  reset: () => set({ status: { state: "idle" } }),
}));

let subscribed = false;

/**
 * Da chiamare UNA VOLTA nel componente App root.
 * Registra il listener IPC che aggiorna lo store al cambio di stato updater.
 */
export function subscribeUpdaterEvents() {
  if (subscribed) return;
  subscribed = true;
  if (!window.voto?.updater) return; // safety in dev/browser puro

  window.voto.updater.onStatus((status) => {
    useUpdater.getState().setStatus(status);
  });
}
