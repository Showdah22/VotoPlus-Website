import { useEffect, useState } from "react";
import { RotateCw, CheckCircle2, Download, Sparkles } from "lucide-react";
import { radius } from "../theme";
import { useTheme } from "../lib/theme-provider";
import { useUpdater } from "../store/updater";
import votoIcon from "../assets/voto-icon.png";

/**
 * Splash Discord-style: coperta a schermo intero sopra al resto della UI.
 * 1.2.1: adesso rispetta il tema chiaro/scuro/auto dell'utente.
 */
export function SplashScreen({ onDismiss }: { onDismiss: () => void }) {
  const { colors, effective } = useTheme();
  const status = useUpdater((s) => s.status);
  const [minElapsed, setMinElapsed] = useState(false);
  const [manualDismiss, setManualDismiss] = useState(false);
  const [version, setVersion] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    window.voto?.app?.getVersion().then((v) => {
      if (!cancelled) setVersion(v);
    });
    window.voto?.updater?.check().catch(() => {});
    const t = window.setTimeout(() => {
      if (!cancelled) setMinElapsed(true);
    }, 1200);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, []);

  useEffect(() => {
    if (!minElapsed) return;
    const blocking =
      status.state === "downloading" || status.state === "available" || status.state === "downloaded";
    if (blocking) return;
    const grace = window.setTimeout(() => onDismiss(), 100);
    return () => window.clearTimeout(grace);
  }, [minElapsed, status.state, onDismiss]);

  useEffect(() => {
    const t = window.setTimeout(() => onDismiss(), 6000);
    return () => window.clearTimeout(t);
  }, [onDismiss]);

  if (manualDismiss) return null;

  const step = describe(status.state, (status as any).percent, colors);

  async function onUpdateNow() {
    if (status.state === "available") {
      try {
        await window.voto.updater.download();
      } catch {}
    } else if (status.state === "downloaded") {
      try {
        window.voto.updater.installNow();
      } catch {}
    }
  }

  // Gradient nebule adattato al tema
  const nebulaOpacity = effective === "light" ? "0.14" : "0.18";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: `radial-gradient(circle at 30% 20%, rgba(168,85,247,${nebulaOpacity}), transparent 55%), radial-gradient(circle at 80% 80%, rgba(6,182,212,${nebulaOpacity}), transparent 60%), ${colors.bg}`,
        color: colors.textPrimary,
        zIndex: 30000,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 22,
        padding: 40,
        userSelect: "none",
        animation: "voto-splash-fade 300ms ease-out",
      }}
    >
      <img
        src={votoIcon}
        alt="Voto+"
        style={{
          width: 96,
          height: 96,
          objectFit: "contain",
          filter: "drop-shadow(0 0 40px rgba(168,85,247,0.55))",
          animation: "voto-splash-pulse 2.4s ease-in-out infinite",
        }}
      />
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 26, fontWeight: 900, letterSpacing: -0.6, color: colors.textPrimary }}>
          Voto+ Desktop
        </div>
        {version && (
          <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 4, fontWeight: 700, letterSpacing: 0.6 }}>
            v{version}
          </div>
        )}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 18px",
          borderRadius: 999,
          background: `${step.color}12`,
          border: `1px solid ${step.color}55`,
          minWidth: 260,
          justifyContent: "center",
        }}
      >
        <step.Icon size={14} color={step.color} className={step.spin ? "spin" : ""} />
        <span style={{ fontSize: 13, fontWeight: 700, color: step.color }}>{step.label}</span>
      </div>

      {status.state === "available" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "center" }}>
          <div style={{ fontSize: 12, color: colors.textSub, textAlign: "center", maxWidth: 360 }}>
            È disponibile la versione <strong style={{ color: colors.textPrimary }}>v{(status as any).version}</strong>. Scaricala ora oppure continua e ti si aggiornerà quando vuoi.
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={onUpdateNow} style={primaryBtn(colors.purple, colors)}>
              <Download size={14} /> Aggiorna ora
            </button>
            <button onClick={() => { setManualDismiss(true); onDismiss(); }} style={secondaryBtn(colors)}>
              Continua senza aggiornare
            </button>
          </div>
        </div>
      )}

      {status.state === "downloaded" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "center" }}>
          <div style={{ fontSize: 12, color: colors.textSub, textAlign: "center", maxWidth: 360 }}>
            Aggiornamento <strong style={{ color: colors.textPrimary }}>v{(status as any).version}</strong> pronto. Riavvia per installare.
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={onUpdateNow} style={primaryBtn(colors.green, colors)}>
              <CheckCircle2 size={14} /> Riavvia e installa
            </button>
            <button onClick={() => { setManualDismiss(true); onDismiss(); }} style={secondaryBtn(colors)}>
              Riavvio dopo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function describe(state: string, percent: number | undefined, colors: any) {
  switch (state) {
    case "checking":
      return { label: "Cerco aggiornamenti…", color: colors.cyan, Icon: RotateCw, spin: true };
    case "downloading":
      return {
        label: `Scaricamento aggiornamento ${percent != null ? Math.round(percent) + "%" : ""}`.trim(),
        color: colors.cyan,
        Icon: Download,
        spin: true,
      };
    case "available":
      return { label: "Aggiornamento disponibile", color: colors.purple, Icon: Sparkles, spin: false };
    case "downloaded":
      return { label: "Aggiornamento pronto", color: colors.green, Icon: CheckCircle2, spin: false };
    case "up-to-date":
      return { label: "Ultima versione installata", color: colors.green, Icon: CheckCircle2, spin: false };
    case "error":
      return { label: "Aggiornamento non riuscito", color: colors.orange, Icon: RotateCw, spin: false };
    default:
      return { label: "Avvio…", color: colors.textMuted, Icon: Sparkles, spin: false };
  }
}

function primaryBtn(c: string, colors: any): React.CSSProperties {
  return {
    padding: "10px 18px",
    borderRadius: radius.md,
    background: `linear-gradient(135deg, ${c} 0%, ${colors.blue} 100%)`,
    border: "none",
    color: colors.textPrimary,
    fontWeight: 800,
    fontSize: 13,
    display: "flex",
    alignItems: "center",
    gap: 6,
    cursor: "pointer",
    boxShadow: `0 6px 24px ${c}44`,
  };
}
function secondaryBtn(colors: any): React.CSSProperties {
  return {
    padding: "10px 18px",
    borderRadius: radius.md,
    background: colors.bgGlass,
    border: `1px solid ${colors.borderStrong}`,
    color: colors.textSub,
    fontWeight: 700,
    fontSize: 12,
    cursor: "pointer",
  };
}
