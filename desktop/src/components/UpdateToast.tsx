// Toast Discord-style che compare quando è pronto un aggiornamento.
// Non blocca l'utente. Persiste in basso a destra fino a click su "Riavvia ora" o "Più tardi".

import { useState } from "react";
import { Download, RefreshCw, X } from "lucide-react";
import { useUpdater } from "../store/updater";
import { colors, radius } from "../theme";

export function UpdateToast() {
  const status = useUpdater((s) => s.status);
  const [dismissed, setDismissed] = useState(false);

  // Reset dismiss se cambia lo stato (nuova update)
  if (status.state === "downloaded" && dismissed === false) {
    // ok, mostra
  }

  if (dismissed) return null;

  // Toast "Download in corso"
  if (status.state === "downloading") {
    const pct = Math.round(status.percent);
    return (
      <div style={toastStyle}>
        <Download size={16} color={colors.cyan} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 700 }}>Scaricamento aggiornamento…</div>
          <div style={progressBg}>
            <div style={{ ...progressFill, width: `${pct}%` }} />
          </div>
          <div style={{ fontSize: 10, color: colors.textMuted, marginTop: 4 }}>
            {pct}%
          </div>
        </div>
      </div>
    );
  }

  // Toast "Update pronto"
  if (status.state === "downloaded") {
    return (
      <div style={toastStyle}>
        <RefreshCw size={16} color={colors.green} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 800 }}>
            Aggiornamento pronto
          </div>
          <div style={{ fontSize: 11, color: colors.textSub, marginTop: 2 }}>
            Versione {status.version} · riavvia per installarla.
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button
              onClick={() => window.voto.updater.installNow()}
              style={ctaPrimary}
            >
              Riavvia ora
            </button>
            <button onClick={() => setDismissed(true)} style={ctaGhost}>
              Più tardi
            </button>
          </div>
        </div>
        <button
          onClick={() => setDismissed(true)}
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            padding: 4,
            borderRadius: 6,
            color: colors.textMuted,
          }}
        >
          <X size={14} />
        </button>
      </div>
    );
  }

  return null;
}

const toastStyle: React.CSSProperties = {
  position: "absolute",
  right: 20,
  bottom: 20,
  width: 320,
  padding: 14,
  paddingRight: 20,
  display: "flex",
  gap: 10,
  alignItems: "flex-start",
  background: colors.bgElevated,
  border: `1px solid ${colors.borderStrong}`,
  borderRadius: radius.md,
  boxShadow: "0 12px 40px rgba(0,0,0,0.55)",
  zIndex: 9999,
};
const progressBg: React.CSSProperties = {
  height: 4,
  background: "rgba(255,255,255,0.08)",
  borderRadius: 999,
  marginTop: 6,
  overflow: "hidden",
};
const progressFill: React.CSSProperties = {
  height: "100%",
  background: "linear-gradient(90deg, #06b6d4, #a855f7)",
  borderRadius: 999,
  transition: "width 200ms ease",
};
const ctaPrimary: React.CSSProperties = {
  padding: "7px 14px",
  borderRadius: 8,
  fontSize: 12,
  fontWeight: 800,
  background: "linear-gradient(135deg, #a855f7, #3b82f6)",
  color: colors.textPrimary,
};
const ctaGhost: React.CSSProperties = {
  padding: "7px 14px",
  borderRadius: 8,
  fontSize: 12,
  fontWeight: 700,
  color: colors.textSub,
  background: colors.bgGlass,
  border: `1px solid ${colors.border}`,
};
