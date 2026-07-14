// ThemeProvider Voto+ Desktop — sistema tema chiaro/scuro/automatico per 1.2.1.
//
// USO (dopo Phase 3 di refactor):
//   const { mode, effective, colors, setMode } = useTheme();
//
// Persistenza: localStorage key `theme_mode_v1`
// Auto: window.matchMedia('(prefers-color-scheme: dark)') con listener.
//
// Vedi `/app/memory/THEME_SYSTEM_ROADMAP_1.2.1.md`.
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

import { DARK_COLORS, LIGHT_COLORS, getColors } from "../theme";

const STORAGE_KEY = "theme_mode_v1";

export type ThemeMode = "light" | "dark" | "auto";
export type EffectiveTheme = "light" | "dark";

interface ThemeContextValue {
  mode: ThemeMode;
  effective: EffectiveTheme;
  colors: typeof DARK_COLORS;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function getSystemScheme(): EffectiveTheme {
  if (typeof window === "undefined" || !window.matchMedia) return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function loadSavedMode(): ThemeMode {
  if (typeof localStorage === "undefined") return "dark";
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "light" || v === "dark" || v === "auto") return v;
  } catch {}
  return "dark";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(loadSavedMode);
  const [systemScheme, setSystemScheme] = useState<EffectiveTheme>(getSystemScheme);

  // Listener per cambiamenti sistema OS (utile per mode "auto")
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => setSystemScheme(mql.matches ? "dark" : "light");
    mql.addEventListener?.("change", handler);
    return () => mql.removeEventListener?.("change", handler);
  }, []);

  const setMode = (next: ThemeMode) => {
    setModeState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {}
  };

  const effective: EffectiveTheme = mode === "auto" ? systemScheme : mode;

  const value = useMemo<ThemeContextValue>(
    () => ({ mode, effective, colors: getColors(effective), setMode }),
    [mode, effective],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    // Fallback silent al dark durante transizione (evita crash).
    return {
      mode: "dark",
      effective: "dark",
      colors: DARK_COLORS,
      setMode: () => {},
    };
  }
  return ctx;
}

export { LIGHT_COLORS, DARK_COLORS };
