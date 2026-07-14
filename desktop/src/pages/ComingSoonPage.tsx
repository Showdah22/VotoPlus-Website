import { Sparkles, Smartphone } from "lucide-react";
import { radius } from "../theme";

import { useTheme } from "../lib/theme-provider";
/**
 * Pagina "in arrivo" polished — usata come landing per QuickAction non ancora
 * portate sul desktop (Interrogazione orale, Tema, Compito). Non è un semplice
 * alert: comunica il valore, l'ETA e rimanda al mobile che ha già la feature.
 */
export function ComingSoonPage({
  title,
  subtitle,
  body,
  tint = "purple",
}: {
  title: string;
  subtitle: string;
  body: string;
  tint?: "purple" | "cyan" | "green" | "orange" | "pink" | "blue";
}) {
  const { colors } = useTheme();
  const color =
    tint === "cyan" ? colors.cyan
    : tint === "green" ? colors.green
    : tint === "orange" ? colors.orange
    : tint === "pink" ? colors.pink
    : tint === "blue" ? colors.blue
    : colors.purple;
  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20, padding: "60px 24px", minHeight: 480 }}>
      <div
        style={{
          width: 80,
          height: 80,
          borderRadius: 24,
          background: `${color}18`,
          border: `1.5px solid ${color}55`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: `0 0 60px ${color}33`,
        }}
      >
        <Sparkles size={38} color={color} />
      </div>
      <div style={{ textAlign: "center", maxWidth: 520 }}>
        <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: 1.2, textTransform: "uppercase", color, marginBottom: 8 }}>
          Prossimamente
        </div>
        <h1 style={{ margin: 0, fontSize: 30, fontWeight: 900, letterSpacing: -0.6 }}>{title}</h1>
        <div style={{ fontSize: 15, color: colors.textSub, marginTop: 8 }}>{subtitle}</div>
      </div>

      <p style={{ maxWidth: 520, textAlign: "center", fontSize: 14, color: colors.textSub, lineHeight: 1.65, margin: 0 }}>
        {body}
      </p>

      <div style={{
        marginTop: 8,
        padding: "12px 18px",
        borderRadius: radius.md,
        background: colors.bgGlass,
        border: `1px solid ${colors.border}`,
        display: "flex",
        alignItems: "center",
        gap: 10,
      }}>
        <Smartphone size={18} color={colors.textMuted} />
        <span style={{ fontSize: 12.5, color: colors.textSub, fontWeight: 700 }}>
          Disponibile ora su iOS e Android — scarica Voto+ dallo store del tuo dispositivo.
        </span>
      </div>
    </div>
  );
}
