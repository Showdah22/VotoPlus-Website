import { useEffect, useState } from "react";
import { colors } from "../theme";

// RadarChart web (SVG puro, no react-native-svg) — adattato dal mobile.
// Mostra un'estetica "radar militare" con:
//  - 5 anelli concentrici (20%, 40%, 60%, 80%, 100%)
//  - 8 assi radiali
//  - Poligono che collega i top-5 topic in base a `probability`
//  - Dots sui vertici + echo dots pulsanti
//  - Sweep animato (rotazione perpetua) via CSS keyframes
type Item = { rank: number; topic: string; probability: number };

export function RadarChart({
  size = 260,
  items = [],
  year = 2026,
}: {
  size?: number;
  items?: Item[];
  year?: number;
}) {
  const cx = size / 2;
  const cy = size / 2;
  const maxR = size / 2 - 26;
  const rings = [0.2, 0.4, 0.6, 0.8, 1.0];

  // Assi: 8 raggi (ogni 45°)
  const radialAxes = Array.from({ length: 8 }, (_, i) => (i * Math.PI) / 4);

  const top5 = items.slice(0, 5);

  // Vertici del poligono (uno per topic)
  const points = top5.map((it, idx) => {
    const angle = (Math.PI * 2 * idx) / Math.max(top5.length, 1) - Math.PI / 2;
    const r = (Math.max(20, Math.min(100, it.probability ?? 0)) / 100) * maxR;
    return {
      x: cx + Math.cos(angle) * r,
      y: cy + Math.sin(angle) * r,
      angle,
      topic: it.topic,
      prob: it.probability,
    };
  });

  const polygonPath = points.length > 0
    ? points.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(" ") + " Z"
    : "";

  // Echo dots pulsanti su varie posizioni radar-style
  const echoDots = [
    { ang: 30, ring: 0.85 },
    { ang: 110, ring: 0.45 },
    { ang: 200, ring: 0.7 },
    { ang: 285, ring: 0.55 },
    { ang: 340, ring: 0.9 },
  ].map((d) => {
    const rad = (d.ang * Math.PI) / 180;
    return { x: cx + Math.cos(rad) * (d.ring * maxR), y: cy + Math.sin(rad) * (d.ring * maxR) };
  });

  // Animation state per il sweep (raggio che ruota).
  // Uso requestAnimationFrame per un'animazione fluida a 60fps.
  const [sweepAngle, setSweepAngle] = useState(0);
  useEffect(() => {
    let raf: number;
    let start = performance.now();
    const animate = (t: number) => {
      const elapsed = t - start;
      // Un giro completo (360°) ogni 5 secondi
      setSweepAngle(((elapsed / 5000) * 360) % 360);
      raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <radialGradient id="radar-bg" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={`${colors.green}22`} />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
          <linearGradient id="radar-sweep" x1="50%" y1="50%" x2="100%" y2="50%">
            <stop offset="0%" stopColor={`${colors.green}00`} />
            <stop offset="80%" stopColor={`${colors.green}66`} />
            <stop offset="100%" stopColor={`${colors.green}00`} />
          </linearGradient>
          <linearGradient id="radar-poly" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={`${colors.green}88`} />
            <stop offset="100%" stopColor={`${colors.cyan}88`} />
          </linearGradient>
        </defs>

        {/* Sfondo radiale */}
        <circle cx={cx} cy={cy} r={maxR + 4} fill="url(#radar-bg)" />

        {/* Anelli concentrici */}
        {rings.map((r, i) => (
          <circle
            key={`ring-${i}`}
            cx={cx}
            cy={cy}
            r={maxR * r}
            fill="none"
            stroke={`${colors.green}33`}
            strokeWidth={i === rings.length - 1 ? 1.4 : 0.8}
          />
        ))}

        {/* Assi radiali */}
        {radialAxes.map((a, i) => (
          <line
            key={`axis-${i}`}
            x1={cx}
            y1={cy}
            x2={cx + Math.cos(a) * maxR}
            y2={cy + Math.sin(a) * maxR}
            stroke={`${colors.green}22`}
            strokeWidth={0.8}
          />
        ))}

        {/* Sweep animato (settore che ruota) */}
        <g transform={`rotate(${sweepAngle} ${cx} ${cy})`}>
          <path
            d={`M ${cx} ${cy} L ${cx + maxR} ${cy} A ${maxR} ${maxR} 0 0 1 ${cx + Math.cos(Math.PI / 6) * maxR} ${cy + Math.sin(Math.PI / 6) * maxR} Z`}
            fill="url(#radar-sweep)"
            opacity={0.5}
          />
        </g>

        {/* Poligono top-5 */}
        {polygonPath && (
          <path
            d={polygonPath}
            fill="url(#radar-poly)"
            fillOpacity={0.28}
            stroke={colors.green}
            strokeWidth={1.6}
            strokeLinejoin="round"
          />
        )}

        {/* Vertex dots + label rank */}
        {points.map((p, i) => (
          <g key={`dot-${i}`}>
            <circle cx={p.x} cy={p.y} r={5} fill={colors.green} stroke="#fff" strokeWidth={1.5} />
            <circle cx={p.x} cy={p.y} r={9} fill={colors.green} fillOpacity={0.18} />
          </g>
        ))}

        {/* Echo dots (pulse via CSS) */}
        {echoDots.map((d, i) => (
          <circle
            key={`echo-${i}`}
            cx={d.x}
            cy={d.y}
            r={2}
            fill={colors.cyan}
            opacity={0.7}
            style={{ animation: `radar-pulse 1.6s ease-in-out ${i * 0.2}s infinite` }}
          />
        ))}

        {/* Crosshair centrale */}
        <circle cx={cx} cy={cy} r={3} fill={colors.green} />
        <line x1={cx - 6} y1={cy} x2={cx + 6} y2={cy} stroke={colors.green} strokeWidth={0.8} />
        <line x1={cx} y1={cy - 6} x2={cx} y2={cy + 6} stroke={colors.green} strokeWidth={0.8} />
      </svg>

      {/* Label anno in basso */}
      <div style={{
        position: "absolute",
        bottom: 6,
        left: 0,
        right: 0,
        textAlign: "center",
        color: colors.textMuted,
        fontSize: 10,
        fontWeight: 800,
        letterSpacing: 1.4,
      }}>
        MATURITÀ · {year}
      </div>

      {/* CSS animation keyframes */}
      <style>
        {`
          @keyframes radar-pulse {
            0%, 100% { opacity: 0.3; r: 2; }
            50% { opacity: 0.9; r: 4; }
          }
        `}
      </style>
    </div>
  );
}
