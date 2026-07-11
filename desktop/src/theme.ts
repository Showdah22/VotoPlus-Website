// Voto+ Desktop — Design tokens (replicati da /app/DESIGN_SYSTEM.md del mobile).
// Fonte di verità unica: se cambi qui, aggiorna anche il mobile.

export const colors = {
  bg: "#0b0714",
  bgElevated: "#12091f",
  bgGlass: "rgba(255,255,255,0.04)",
  border: "rgba(255,255,255,0.08)",
  borderStrong: "rgba(255,255,255,0.14)",

  purple: "#a855f7",
  cyan: "#06b6d4",
  pink: "#ec4899",
  orange: "#f97316",
  green: "#10b981",
  red: "#ef4444",
  blue: "#3b82f6",

  textPrimary: "#ffffff",
  textSub: "rgba(255,255,255,0.72)",
  textMuted: "rgba(255,255,255,0.42)",
};

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
  primarySoft: "linear-gradient(135deg, rgba(168,85,247,0.22) 0%, rgba(59,130,246,0.14) 100%)",
  green: "linear-gradient(135deg, rgba(16,185,129,0.28) 0%, rgba(6,182,212,0.18) 100%)",
  pink: "linear-gradient(135deg, rgba(236,72,153,0.28) 0%, rgba(168,85,247,0.18) 100%)",
};
