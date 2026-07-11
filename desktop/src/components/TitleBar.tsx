import { useEffect, useState } from "react";
import { Minus, Square, X, Copy } from "lucide-react";
import { colors } from "../theme";
// Import diretto dell'icona: Vite la hash-a e la referenzia con path relativo
// che funziona sia in dev che in produzione (file:// protocol di Electron).
import votoIcon from "../assets/voto-icon.png";

// TitleBar custom — solo su Windows (frameless completo). Su macOS mostriamo
// solo il logo/titolo perché i traffic lights sono nativi (titleBarStyle: hiddenInset).
export function TitleBar() {
  const [platform, setPlatform] = useState<NodeJS.Platform | null>(null);
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    window.voto?.app?.getPlatform().then(setPlatform);
    window.voto?.window?.isMaximized().then(setMaximized);
  }, []);

  const isWin = platform === "win32";

  return (
    <div
      className="drag-region"
      style={{
        height: 40,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: isWin ? "0 0 0 16px" : "0 16px 0 82px", // 82px spazio traffic lights macOS
        background: colors.bg,
        borderBottom: `1px solid ${colors.border}`,
        flexShrink: 0,
      }}
    >
      {/* Brand */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <img
          src={votoIcon}
          alt="Voto+"
          style={{
            width: 22,
            height: 22,
            borderRadius: 6,
            objectFit: "contain",
          }}
        />
        <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: 0.3 }}>
          Voto+ Desktop
        </span>
      </div>

      {/* Windows-only window controls */}
      {isWin && (
        <div className="no-drag" style={{ display: "flex", height: "100%" }}>
          <WinCtrl icon={<Minus size={14} />} onClick={() => window.voto.window.minimize()} />
          <WinCtrl
            icon={maximized ? <Copy size={12} /> : <Square size={12} />}
            onClick={async () => {
              const isMax = await window.voto.window.maximize();
              setMaximized(isMax);
            }}
          />
          <WinCtrl
            icon={<X size={14} />}
            onClick={() => window.voto.window.close()}
            danger
          />
        </div>
      )}
    </div>
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
        background: hover ? (danger ? "#e81123" : "rgba(255,255,255,0.08)") : "transparent",
        color: hover && danger ? "#fff" : colors.textSub,
        transition: "background 120ms ease",
      }}
    >
      {icon}
    </button>
  );
}
