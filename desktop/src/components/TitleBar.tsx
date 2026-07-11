import { useEffect, useState } from "react";
import { Minus, Square, X, Copy } from "lucide-react";
import { colors } from "../theme";
import votoIcon from "../assets/voto-icon.png";

// TitleBar custom — stile macOS: sottile (30px) + brand centrato.
// Su Windows i controlli finestra (min/max/close) sono a destra (frameless completo).
// Su macOS i traffic lights nativi sono a sinistra (titleBarStyle: hiddenInset)
// e occupano ~78px → compensiamo con spacer per mantenere il brand esattamente al centro.
export function TitleBar() {
  const [platform, setPlatform] = useState<NodeJS.Platform | null>(null);
  const [maximized, setMaximized] = useState(false);

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
        background: hover ? (danger ? "#e81123" : "rgba(255,255,255,0.06)") : "transparent",
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
