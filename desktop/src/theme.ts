// Voto+ Desktop — Design tokens (allineato 1:1 con /app/frontend/src/theme.ts mobile).
// Fonte di verità unica: se cambi qui, aggiorna anche il mobile.

export const colors = {
  // Backgrounds — identici a mobile iOS
  bg: "#0a0a0f",
  bgElevated: "#12121a",
  bgGlass: "rgba(255,255,255,0.04)",
  border: "rgba(255,255,255,0.08)",
  borderStrong: "rgba(255,255,255,0.14)",

  // Text — zinc scale (identico a mobile)
  textPrimary: "#ffffff",
  textSub: "#a1a1aa",
  textMuted: "#71717a",
  textDim: "#52525b",

  // Accent colors — identici a mobile
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
  orange: "#f59e0b", // NB: mobile usa f59e0b, non f97316
  red: "#ef4444",
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
