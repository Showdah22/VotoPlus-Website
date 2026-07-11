import { useEffect, useState } from "react";
import { RotateCw, CheckCircle2, Download, Sparkles } from "lucide-react";
import { colors, radius } from "../theme";
import { useUpdater } from "../store/updater";
import votoIcon from "../assets/voto-icon.png";

/**
 * Splash Discord-style: coperta a schermo intero sopra al resto della UI.
 * Al primo mount:
 *  1. Mostra logo + "Voto+ Desktop"
 *  2. Fa partire il check aggiornamenti automatico
 *  3. Riflette lo stato dell'updater ("Cerco aggiornamenti", "Ultima versione",
 *     "Aggiornamento pronto", "Scaricamento X%", ecc.)
 *  4. Auto-dismiss dopo min 1200ms E quando lo stato updater NON è più checking
 *  5. Se update disponibile: NON auto-dismiss finché l'utente non conferma
 *     (bottone "Aggiorna ora" o "Continua senza aggiornare").
 */
export function SplashScreen({ onDismiss }: { onDismiss: () => void }) {
  const status = useUpdater((s) => s.status);
  const [minElapsed, setMinElapsed] = useState(false);
  const [manualDismiss, setManualDismiss] = useState(false);
  const [version, setVersion] = useState<string | null>(null);

  // Fire check-for-updates on mount (electron/main.ts già fa un silent-check
  // a boot: qui lo forziamo per rendere subito reattivo lo splash).
  useEffect(() => {
    let cancelled = false;
    // Recupera versione app corrente
    window.voto?.app?.getVersion().then((v) => {
      if (!cancelled) setVersion(v);
    });
    // Trigger updater
    window.voto?.updater?.check().catch(() => {});
    // Timer minimo: mostra lo splash almeno 1200ms per non far flashare
    const t = window.setTimeout(() => {
      if (!cancelled) setMinElapsed(true);
    }, 1200);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, []);

  // Auto-dismiss quando: tempo minimo passato AND updater in stato non-blocking
  useEffect(() => {
    if (!minElapsed) return;
    // Se stiamo scaricando o è disponibile un update: NON auto-dismiss
    // (aspettiamo click utente o download completato)
    const blocking = status.state === "downloading" || status.state === "available" || status.state === "downloaded";
    if (blocking) return;
    // "checking" può persistere: dopo 3.5s totali dismiss comunque
    const grace = window.setTimeout(() => onDismiss(), 100);
    return () => window.clearTimeout(grace);
  }, [minElapsed, status.state, onDismiss]);

  // Fallback hard-dismiss dopo 6s per non bloccare l'app se l'updater non risponde
  useEffect(() => {
    const t = window.setTimeout(() => onDismiss(), 6000);
    return () => window.clearTimeout(t);
  }, [onDismiss]);

  if (manualDismiss) return null;

  const step = describe(status.state, (status as any).percent);

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

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: `radial-gradient(circle at 30% 20%, rgba(168,85,247,0.18), transparent 55%), radial-gradient(circle at 80% 80%, rgba(6,182,212,0.14), transparent 60%), ${colors.bg}`,
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
        <div style={{ fontSize: 26, fontWeight: 900, letterSpacing: -0.6 }}>Voto+ Desktop</div>
        {version && (
          <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 4, fontWeight: 700, letterSpacing: 0.6 }}>
            v{version}
          </div>
        )}
      </div>

      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 18px",
        borderRadius: 999,
        background: `${step.color}12`,
        border: `1px solid ${step.color}55`,
        minWidth: 260,
        justifyContent: "center",
      }}>
        <step.Icon size={14} color={step.color} className={step.spin ? "spin" : ""} />
        <span style={{ fontSize: 13, fontWeight: 700, color: step.color }}>{step.label}</span>
      </div>

      {status.state === "available" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "center" }}>
          <div style={{ fontSize: 12, color: colors.textSub, textAlign: "center", maxWidth: 360 }}>
            È disponibile la versione <strong>v{(status as any).version}</strong>. Scaricala ora oppure continua e ti si aggiornerà quando vuoi.
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={onUpdateNow} style={primaryBtn()}>
              <Download size={14} /> Aggiorna ora
            </button>
            <button onClick={() => { setManualDismiss(true); onDismiss(); }} style={secondaryBtn()}>
              Continua senza aggiornare
            </button>
          </div>
        </div>
      )}

      {status.state === "downloaded" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "center" }}>
          <div style={{ fontSize: 12, color: colors.textSub, textAlign: "center", maxWidth: 360 }}>
            Aggiornamento <strong>v{(status as any).version}</strong> pronto. Riavvia per installare.
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={onUpdateNow} style={primaryBtn(colors.green)}>
              <CheckCircle2 size={14} /> Riavvia e installa
            </button>
            <button onClick={() => { setManualDismiss(true); onDismiss(); }} style={secondaryBtn()}>
              Riavvio dopo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function describe(state: string, percent?: number) {
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

function primaryBtn(c = colors.purple): React.CSSProperties {
  return {
    padding: "10px 18px",
    borderRadius: radius.md,
    background: `linear-gradient(135deg, ${c} 0%, ${colors.blue} 100%)`,
    border: "none",
    color: "#fff",
    fontWeight: 800,
    fontSize: 13,
    display: "flex",
    alignItems: "center",
    gap: 6,
    cursor: "pointer",
    boxShadow: `0 6px 24px ${c}44`,
  };
}
function secondaryBtn(): React.CSSProperties {
  return {
    padding: "10px 18px",
    borderRadius: radius.md,
    background: colors.bgGlass,
    border: `1px solid ${colors.border}`,
    color: colors.textSub,
    fontWeight: 700,
    fontSize: 12,
    cursor: "pointer",
  };
}
