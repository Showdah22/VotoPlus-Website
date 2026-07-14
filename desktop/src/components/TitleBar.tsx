import { useEffect, useState } from "react";
import { Minus, Square, X, Copy, Download, RotateCw, CheckCircle2 } from "lucide-react";
import { colors } from "../theme";
import votoIcon from "../assets/voto-icon.png";
import { useUpdater } from "../store/updater";

// TitleBar custom — stile macOS: sottile (30px) + brand centrato.
// Su Windows i controlli finestra (min/max/close) sono a destra (frameless completo).
// Su macOS i traffic lights nativi sono a sinistra (titleBarStyle: hiddenInset).
// Include badge auto-updater cliccabile che appare quando c'è un update in
// preparazione ("available" → download; "downloading" → progress; "downloaded"
// → installa & riavvia). Sempre visibile: l'utente non deve scoprire l'update
// dalle Impostazioni, lo vede subito nella titlebar.
export function TitleBar() {
  const [platform, setPlatform] = useState<NodeJS.Platform | null>(null);
  const [maximized, setMaximized] = useState(false);
  const status = useUpdater((s) => s.status);

  useEffect(() => {
    window.voto?.app?.getPlatform().then(setPlatform);
    window.voto?.window?.isMaximized().then(setMaximized);
  }, []);

  const isWin = platform === "win32";
  const isMac = platform === "darwin";

  // Larghezze dei blocchi laterali: usiamo la stessa larghezza a sx e dx
  // così che il brand al centro resti perfettamente centrato.
  // Win: 3 pulsanti da 46px = 138px. Mac: traffic lights ~78px.
  const sideWidth = isWin ? 138 : isMac ? 78 : 0;

  return (
    <div
      className="drag-region"
      style={{
        height: 30,
        display: "flex",
        alignItems: "center",
        background: colors.bg,
        flexShrink: 0,
        position: "relative",
        userSelect: "none",
      }}
    >
      {/* Spacer sinistro (traffic lights macOS o simmetria Win) */}
      <div style={{ width: sideWidth, flexShrink: 0, height: "100%" }} />

      {/* Brand centrato */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          minWidth: 0,
        }}
      >
        <img
          src={votoIcon}
          alt="Voto+"
          style={{
            width: 16,
            height: 16,
            objectFit: "contain",
          }}
        />
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: 0.2,
            color: colors.textSub,
          }}
        >
          Voto+ Desktop
        </span>
      </div>

      {/* Update badge (posizionato assolutamente prima dei window controls
          per non spostare il brand centrato). Visibile solo quando c'è un
          update di stato utile. */}
      <UpdateBadge status={status} rightOffset={isWin ? 138 : 8} />

      {/* Blocco destro: window controls su Win, spacer simmetrico su Mac */}
      {isWin ? (
        <div className="no-drag" style={{ display: "flex", height: "100%", flexShrink: 0 }}>
          <WinCtrl icon={<Minus size={12} />} onClick={() => window.voto.window.minimize()} />
          <WinCtrl
            icon={maximized ? <Copy size={11} /> : <Square size={11} />}
            onClick={async () => {
              const isMax = await window.voto.window.maximize();
              setMaximized(isMax);
            }}
          />
          <WinCtrl icon={<X size={12} />} onClick={() => window.voto.window.close()} danger />
        </div>
      ) : (
        <div style={{ width: sideWidth, flexShrink: 0, height: "100%" }} />
      )}
    </div>
  );
}

// ============================================================================
// UpdateBadge — pill cliccabile che appare nella titlebar quando c'è un update.
// Stati gestiti:
//  - available → "Aggiorna" (icona Download, tocca per scaricare)
//  - downloading → "42%" con spinner (readonly)
//  - downloaded → "Riavvia" (icona check, tocca per quitAndInstall)
// Non renderizza nulla in idle/checking/up-to-date/error → titlebar pulita.
// ============================================================================
function UpdateBadge({
  status,
  rightOffset,
}: {
  status: { state: string; percent?: number; version?: string };
  rightOffset: number;
}) {
  const s = status.state;
  const isAvailable = s === "available";
  const isDownloading = s === "downloading";
  const isDownloaded = s === "downloaded";
  if (!isAvailable && !isDownloading && !isDownloaded) return null;

  const label = isDownloaded
    ? "Riavvia"
    : isDownloading
    ? `${Math.round(status.percent ?? 0)}%`
    : "Aggiorna";
  const Icon = isDownloaded ? CheckCircle2 : isDownloading ? RotateCw : Download;
  const color = isDownloaded ? colors.green : isDownloading ? colors.cyan : colors.purple;
  const version = status.version ? ` · v${status.version}` : "";
  const title = isDownloaded
    ? `Aggiornamento pronto${version}. Clicca per riavviare e installare.`
    : isDownloading
    ? `Scaricamento aggiornamento${version} in corso — ${Math.round(status.percent ?? 0)}%`
    : `Aggiornamento disponibile${version}. Clicca per scaricare.`;

  async function onClick() {
    if (isAvailable) {
      try {
        await window.voto.updater.download();
      } catch {}
    } else if (isDownloaded) {
      try {
        window.voto.updater.installNow();
      } catch {}
    }
    // downloading → readonly (no-op)
  }

  return (
    <button
      onClick={onClick}
      title={title}
      disabled={isDownloading}
      className="no-drag"
      style={{
        position: "absolute",
        top: "50%",
        right: rightOffset + 6,
        transform: "translateY(-50%)",
        display: "flex",
        alignItems: "center",
        gap: 6,
        height: 22,
        padding: "0 10px",
        borderRadius: 999,
        background: `${color}18`,
        border: `1px solid ${color}55`,
        color,
        fontSize: 11,
        fontWeight: 800,
        letterSpacing: 0.2,
        cursor: isDownloading ? "default" : "pointer",
        boxShadow: `0 0 12px ${color}33`,
        animation: isAvailable ? "voto-pulse 2.4s ease-in-out infinite" : "none",
      }}
    >
      <Icon
        size={12}
        style={{
          animation: isDownloading ? "voto-spin 1s linear infinite" : "none",
        }}
      />
      <span>{label}</span>
    </button>
  );
}

function WinCtrl({
  icon,
  onClick,
  danger = false,
}: {
  icon: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: 46,
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: hover ? (danger ? "#e81123" : colors.bgGlass) : "transparent",
        color: hover && danger ? "#fff" : colors.textSub,
        transition: "background 120ms ease",
        border: "none",
        padding: 0,
        cursor: "pointer",
      }}
    >
      {icon}
    </button>
  );
}
