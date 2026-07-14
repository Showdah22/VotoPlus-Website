/// <reference types="vite/client" />

import type { UpdaterState } from "../electron/preload";

declare global {
  interface Window {
    voto: {
      window: {
        minimize: () => Promise<void>;
        maximize: () => Promise<boolean>;
        close: () => Promise<void>;
        isMaximized: () => Promise<boolean>;
      };
      app: {
        getVersion: () => Promise<string>;
        getPlatform: () => Promise<NodeJS.Platform>;
      };
      updater: {
        check: () => Promise<{ ok: boolean; updateInfo?: { version: string } | null; error?: string }>;
        download: () => Promise<{ ok: boolean; error?: string }>;
        installNow: () => Promise<void>;
        onStatus: (cb: (status: UpdaterState) => void) => () => void;
      };
      openExternal: (url: string) => Promise<void>;
      auth: {
        startGoogleLogin: () => Promise<void>;
        consumePending: () => Promise<{
          session_id: string | null;
          error: string | null;
        }>;
        onGoogleCallback: (
          cb: (payload: { session_id?: string; error?: string }) => void,
        ) => () => void;
      };
    };
  }
}

export {};
