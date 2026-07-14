// Voto+ Desktop — Design tokens (allineato 1:1 con /app/frontend/src/theme.ts mobile).
// Fonte di verità unica: se cambi qui, aggiorna anche il mobile.
//
// PALETTE dark + light per il sistema tema 1.2.1.
// `colors` == DARK_COLORS per BACKWARD COMPAT durante la transizione.
// Vedi `/app/memory/THEME_SYSTEM_ROADMAP_1.2.1.md`.

export const DARK_COLORS = {
  bg: "#0a0a0f",
  bgElevated: "#12121a",
  bgGlass: "rgba(255,255,255,0.04)",
  border: "rgba(255,255,255,0.08)",
  borderStrong: "rgba(255,255,255,0.14)",
  textPrimary: "#ffffff",
  textSub: "#a1a1aa",
  textMuted: "#71717a",
  textDim: "#52525b",
  purple: "#a855f7",
  purpleSoft: "rgba(168,85,247,0.18)",
  blue: "#3b82f6",
  blueSoft: "rgba(59,130,246,0.18)",
  cyan: "#06b6d4",
  cyanSoft: "rgba(6,182,212,0.18)",
  green: "#10b981",
  greenSoft: "rgba(16,185,129,0.18)",
  pink: "#ec4899",
  pinkSoft: "rgba(236,72,153,0.18)",
  orange: "#f59e0b",
  red: "#ef4444",
};

export const LIGHT_COLORS = {
  bg: "#ffffff",
  bgElevated: "#f8fafc",
  bgGlass: "rgba(0,0,0,0.035)",
  border: "rgba(0,0,0,0.08)",
  borderStrong: "rgba(0,0,0,0.14)",
  textPrimary: "#0f172a",
  textSub: "#475569",
  textMuted: "#64748b",
  textDim: "#94a3b8",
  purple: "#9333ea",
  purpleSoft: "rgba(147,51,234,0.12)",
  blue: "#2563eb",
  blueSoft: "rgba(37,99,235,0.12)",
  cyan: "#0891b2",
  cyanSoft: "rgba(8,145,178,0.12)",
  green: "#059669",
  greenSoft: "rgba(5,150,105,0.12)",
  pink: "#db2777",
  pinkSoft: "rgba(219,39,119,0.12)",
  orange: "#d97706",
  red: "#dc2626",
};

// Alias backward-compat: dark è il default corrente.
export const colors = DARK_COLORS;

export function getColors(mode: "light" | "dark") {
  return mode === "light" ? LIGHT_COLORS : DARK_COLORS;
}

export const radius = {
  sm: 10,
  md: 16,
  lg: 22,
  xl: 28,
};

export const shadow = {
  glow: (color: string) => ({
    boxShadow: `0 0 24px 0 ${color}55, 0 0 60px 0 ${color}22`,
  }),
  card: {
    boxShadow: "0 8px 30px rgba(0,0,0,0.35)",
  },
};

export const space = {
  x1: 4,
  x2: 8,
  x3: 12,
  x4: 16,
  x5: 20,
  x6: 24,
  x8: 32,
};

export const gradients = {
  primary: "linear-gradient(135deg, #a855f7 0%, #3b82f6 100%)",
  primarySoft:
    "linear-gradient(135deg, rgba(168,85,247,0.22) 0%, rgba(59,130,246,0.14) 100%)",
  scanner:
    "linear-gradient(135deg, rgba(168,85,247,0.45) 0%, rgba(59,130,246,0.45) 100%)",
  math:
    "linear-gradient(135deg, rgba(6,182,212,0.4) 0%, rgba(59,130,246,0.4) 100%)",
  green:
    "linear-gradient(135deg, rgba(16,185,129,0.28) 0%, rgba(6,182,212,0.18) 100%)",
  pink:
    "linear-gradient(135deg, rgba(236,72,153,0.28) 0%, rgba(168,85,247,0.18) 100%)",
  premium: "linear-gradient(135deg, #f59e0b 0%, #ec4899 50%, #a855f7 100%)",
};
