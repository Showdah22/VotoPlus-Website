import { useEffect, useState } from "react";

/**
 * Detect current platform once via `window.voto.app.getPlatform()`.
 * Returns 'mac' | 'win' | 'linux' | 'unknown'.
 *
 * NB: usiamo il main-process (via IPC) invece di navigator.platform / userAgent
 * perché su Electron sono più affidabili — ma abbiamo comunque un fallback.
 */
export type OS = "mac" | "win" | "linux" | "unknown";

let cached: OS | null = null;

export function usePlatform(): OS {
  const [os, setOs] = useState<OS>(cached || detectFromNavigator());
  useEffect(() => {
    if (cached) {
      setOs(cached);
      return;
    }
    window.voto?.app
      ?.getPlatform()
      .then((p) => {
        const mapped: OS =
          p === "darwin" ? "mac" : p === "win32" ? "win" : p === "linux" ? "linux" : "unknown";
        cached = mapped;
        setOs(mapped);
      })
      .catch(() => {});
  }, []);
  return os;
}

function detectFromNavigator(): OS {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes("mac")) return "mac";
  if (ua.includes("win")) return "win";
  if (ua.includes("linux")) return "linux";
  return "unknown";
}

/**
 * Restituisce il simbolo giusto per il modifier "meta" (Cmd/Ctrl) in base
 * all'OS. Usare per hint keyboard shortcuts:
 *   const { modKey, modSymbol } = useModKey();
 *   // mac: modKey="Cmd" modSymbol="⌘"
 *   // win/linux: modKey="Ctrl" modSymbol="Ctrl"
 */
export function useModKey() {
  const os = usePlatform();
  return os === "mac"
    ? { modKey: "Cmd", modSymbol: "⌘" as const, isMac: true }
    : { modKey: "Ctrl", modSymbol: "Ctrl" as const, isMac: false };
}
