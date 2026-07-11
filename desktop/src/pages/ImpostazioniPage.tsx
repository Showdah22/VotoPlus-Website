import { useEffect, useState } from "react";
import { CheckCircle2, Download, RefreshCw, AlertCircle, ExternalLink } from "lucide-react";
import { colors, radius } from "../theme";
import { useAuth } from "../store/auth";
import { useUpdater } from "../store/updater";

export function ImpostazioniPage() {
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);
  const status = useUpdater((s) => s.status);

  const [appVersion, setAppVersion] = useState<string>("–");
  const [platform, setPlatform] = useState<string>("");

  useEffect(() => {
    window.voto?.app?.getVersion().then(setAppVersion);
    window.voto?.app?.getPlatform().then(setPlatform);
  }, []);

  const checkUpdate = async () => {
    const r = await window.voto.updater.check();
    if (!r.ok) {
      console.warn("[updater] check failed", r.error);
    }
  };

  const startDownload = async () => {
    await window.voto.updater.download();
  };

  const installNow = async () => {
    await window.voto.updater.installNow();
  };

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", flexDirection: "column", gap: 24 }}>
      <h1 style={{ margin: 0, fontSize: 28, fontWeight: 900, letterSpacing: -0.5 }}>
        Impostazioni
      </h1>

      {/* Account */}
      <section style={sectionStyle}>
        <SectionHeader title="Account" />
        <Row label="Utente" value={user?.username || "—"} />
        <Row label="Email" value={user?.email_is_relay ? "Accesso via Apple" : user?.email || "—"} />
        <Row label="Piano" value={(user?.plan || "free").toUpperCase()} />
        <button
          onClick={logout}
          style={{
            marginTop: 12,
            alignSelf: "flex-start",
            padding: "10px 18px",
            borderRadius: radius.sm,
            background: `${colors.red}14`,
            border: `1px solid ${colors.red}55`,
            color: colors.red,
            fontWeight: 800,
            fontSize: 13,
          }}
        >
          Esci
        </button>
      </section>

      {/* Aggiornamenti — la pièce de résistance */}
      <section style={sectionStyle}>
        <SectionHeader title="Aggiornamenti" />
        <Row label="Versione installata" value={`v${appVersion}`} />
        <Row label="Piattaforma" value={platform || "—"} />

        {/* Update status widget */}
        <div
          style={{
            marginTop: 8,
            padding: 16,
            borderRadius: radius.md,
            background: statusBg(status.state),
            border: `1px solid ${statusBorder(status.state)}`,
            display: "flex",
            gap: 12,
            alignItems: "center",
          }}
        >
          <StatusIcon state={status.state} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 14 }}>{statusTitle(status)}</div>
            <div style={{ fontSize: 12, color: colors.textSub, marginTop: 2 }}>
              {statusSubtitle(status)}
            </div>
            {status.state === "downloading" && (
              <div style={{ height: 4, background: "rgba(255,255,255,0.08)", borderRadius: 999, marginTop: 8, overflow: "hidden" }}>
                <div
                  style={{
                    height: "100%",
                    width: `${Math.round(status.percent)}%`,
                    background: "linear-gradient(90deg, #06b6d4, #a855f7)",
                    transition: "width 200ms ease",
                  }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
          {status.state === "downloaded" ? (
            <button onClick={installNow} style={btnPrimary}>
              <RefreshCw size={16} /> Riavvia e installa
            </button>
          ) : status.state === "available" ? (
            <button onClick={startDownload} style={btnPrimary}>
              <Download size={16} /> Scarica aggiornamento v{status.version}
            </button>
          ) : (
            <button
              onClick={checkUpdate}
              disabled={status.state === "checking" || status.state === "downloading"}
              style={btnPrimary}
            >
              <RefreshCw size={16} /> Cerca aggiornamenti
            </button>
          )}
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              window.voto?.openExternal("https://voto-plus.app/desktop");
            }}
            style={btnGhost}
          >
            <ExternalLink size={14} /> Note di rilascio
          </a>
        </div>

        <p style={{ margin: "12px 0 0 0", fontSize: 11, color: colors.textMuted, lineHeight: 1.5 }}>
          Voto+ Desktop controlla automaticamente gli aggiornamenti all&apos;avvio. Quando disponibili verranno scaricati e installati con il tuo consenso, senza dover riscaricare l&apos;app dal sito.
        </p>
      </section>

      {/* Info */}
      <section style={sectionStyle}>
        <SectionHeader title="Informazioni" />
        <LinkRow label="Sito web Voto+" href="https://voto-plus.app" />
        <LinkRow label="Privacy Policy" href="https://voto-plus.app/privacy" />
        <LinkRow label="Termini di servizio" href="https://voto-plus.app/terms" />
        <LinkRow label="Supporto" href="mailto:support@voto-plus.app" />
      </section>
    </div>
  );
}

/* ============================ helpers ============================ */

const sectionStyle: React.CSSProperties = {
  padding: 20,
  borderRadius: radius.lg,
  background: colors.bgGlass,
  border: `1px solid ${colors.border}`,
  display: "flex",
  flexDirection: "column",
  gap: 6,
};

function SectionHeader({ title }: { title: string }) {
  return (
    <h2
      style={{
        margin: "0 0 10px 0",
        fontSize: 15,
        fontWeight: 800,
        textTransform: "uppercase",
        letterSpacing: 0.8,
        color: colors.textMuted,
      }}
    >
      {title}
    </h2>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "10px 0",
        borderBottom: `1px solid ${colors.border}`,
        fontSize: 13,
      }}
    >
      <span style={{ color: colors.textSub }}>{label}</span>
      <span style={{ fontWeight: 700 }}>{value}</span>
    </div>
  );
}

function LinkRow({ label, href }: { label: string; href: string }) {
  return (
    <a
      href={href}
      onClick={(e) => {
        if (href.startsWith("http")) {
          e.preventDefault();
          window.voto?.openExternal(href);
        }
      }}
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "10px 0",
        borderBottom: `1px solid ${colors.border}`,
        fontSize: 13,
        color: colors.textPrimary,
        textDecoration: "none",
      }}
    >
      <span>{label}</span>
      <ExternalLink size={14} color={colors.textMuted} />
    </a>
  );
}

function StatusIcon({ state }: { state: string }) {
  const size = 22;
  switch (state) {
    case "checking":
    case "downloading":
      return <RefreshCw size={size} color={colors.cyan} className="spin" />;
    case "up-to-date":
      return <CheckCircle2 size={size} color={colors.green} />;
    case "available":
      return <Download size={size} color={colors.orange} />;
    case "downloaded":
      return <RefreshCw size={size} color={colors.green} />;
    case "error":
      return <AlertCircle size={size} color={colors.red} />;
    default:
      return <CheckCircle2 size={size} color={colors.textMuted} />;
  }
}

function statusTitle(status: any): string {
  switch (status.state) {
    case "idle": return "Nessun controllo effettuato";
    case "checking": return "Controllo aggiornamenti in corso…";
    case "up-to-date": return "Voto+ Desktop è aggiornato";
    case "available": return `Nuova versione ${status.version} disponibile`;
    case "downloading": return `Scaricamento in corso… ${Math.round(status.percent)}%`;
    case "downloaded": return `Aggiornamento ${status.version} pronto`;
    case "error": return "Impossibile controllare gli aggiornamenti";
    default: return "";
  }
}
function statusSubtitle(status: any): string {
  switch (status.state) {
    case "idle": return "Clicca \"Cerca aggiornamenti\" per verificare ora.";
    case "checking": return "Sto contattando il server di distribuzione…";
    case "up-to-date": return `Stai usando l'ultima versione (v${status.version}).`;
    case "available": return "Scarica per installarla senza dover riscaricare dal sito.";
    case "downloading": return `${humanBytes(status.transferred)} / ${humanBytes(status.total)}`;
    case "downloaded": return "Riavvia l'app per completare l'installazione.";
    case "error": return status.message;
    default: return "";
  }
}
function statusBg(state: string): string {
  switch (state) {
    case "up-to-date":
    case "downloaded":
      return `${colors.green}12`;
    case "available":
    case "downloading":
      return `${colors.cyan}12`;
    case "error":
      return `${colors.red}12`;
    default:
      return "rgba(255,255,255,0.02)";
  }
}
function statusBorder(state: string): string {
  switch (state) {
    case "up-to-date":
    case "downloaded":
      return `${colors.green}55`;
    case "available":
    case "downloading":
      return `${colors.cyan}55`;
    case "error":
      return `${colors.red}55`;
    default:
      return colors.border;
  }
}
function humanBytes(n: number): string {
  if (!n) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(1)} ${units[i]}`;
}

const btnPrimary: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "10px 18px",
  borderRadius: radius.sm,
  background: "linear-gradient(135deg, #a855f7 0%, #3b82f6 100%)",
  color: "#fff",
  fontSize: 13,
  fontWeight: 800,
  border: "none",
  boxShadow: "0 6px 20px rgba(168,85,247,0.32)",
  cursor: "pointer",
};
const btnGhost: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "10px 14px",
  borderRadius: radius.sm,
  background: colors.bgGlass,
  border: `1px solid ${colors.border}`,
  color: colors.textSub,
  fontSize: 12.5,
  fontWeight: 700,
  textDecoration: "none",
};
