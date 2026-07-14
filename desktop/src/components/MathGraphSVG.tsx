import { useMemo } from "react";
import { colors, radius } from "../theme";

// MathGraphSVG (web) — porting 1:1 di /app/frontend/src/components/MathGraphSVG.tsx
// per l'app Electron desktop. Usa SVG puro (no react-native-svg).
//
// Struttura del payload `graph` restituita dal backend `/api/math/solve` quando
// l'esercizio è visualizzabile (funzioni, parabole, sistemi, intervalli).
// Il rendering è vettoriale, resiliente ad asintoti verticali (interrompe il path
// se ci sono "salti" grandi tra due campioni consecutivi) e mostra:
//  - griglia leggera
//  - assi cartesiani (x=0 / y=0) evidenziati
//  - una o più curve (con colore custom)
//  - punti highlight (vertici, intersezioni, soluzioni)
//  - legenda inferiore con etichette curve
//
// L'espressione JavaScript è valutata in una sandbox `new Function(...)` con
// whitelist di caratteri (cifre, operatori, `x`, `Math.*`). Questo previene
// esecuzione di codice arbitrario iniettato dall'AI.
export interface GraphCurve {
  label: string;
  expression_js: string;
  color: string;
}
export interface GraphPoint {
  x: number;
  y: number;
  label?: string;
  color?: string;
}
export interface MathGraphData {
  type?: string;
  x_range: [number, number];
  y_range?: [number, number];
  x_label?: string;
  y_label?: string;
  curves: GraphCurve[];
  highlight_points?: GraphPoint[];
}

const HEIGHT = 320;
const PADDING = { top: 24, right: 24, bottom: 34, left: 42 };
const SAMPLE_COUNT = 260; // Più campioni del mobile: display più ampio, più definizione

function safeEval(expr: string, x: number): number | null {
  // Whitelist: solo cifre, operatori aritmetici, punto, parentesi, virgola,
  // spazi, `x`, `Math`, `.`, e caratteri di parole (per riconoscere `Math.sin`).
  if (!/^[\d\s+\-*/().,xMath\w]+$/.test(expr.replace(/\s/g, ""))) return null;
  try {
    const fn = new Function("x", "Math", `return (${expr});`);
    const v = fn(x, Math);
    if (typeof v !== "number" || !isFinite(v)) return null;
    return v;
  } catch {
    return null;
  }
}

export function MathGraphSVG({ graph, width = 640 }: { graph: MathGraphData; width?: number }) {
  const safeData = useMemo(() => {
    if (!graph || !Array.isArray(graph.x_range) || graph.x_range.length !== 2) return null;
    const [xMin, xMax] = graph.x_range;
    if (xMin >= xMax) return null;

    const rawCurves = Array.isArray(graph.curves) ? graph.curves : [];
    const sampled: { color: string; label: string; points: { x: number; y: number }[] }[] = [];
    for (const c of rawCurves) {
      if (!c?.expression_js) continue;
      const pts: { x: number; y: number }[] = [];
      const step = (xMax - xMin) / SAMPLE_COUNT;
      for (let i = 0; i <= SAMPLE_COUNT; i++) {
        const xv = xMin + i * step;
        const yv = safeEval(c.expression_js, xv);
        if (yv != null) pts.push({ x: xv, y: yv });
      }
      sampled.push({ color: c.color || colors.purple, label: c.label || "", points: pts });
    }

    let yMin: number; let yMax: number;
    if (Array.isArray(graph.y_range) && graph.y_range.length === 2 && graph.y_range[0] < graph.y_range[1]) {
      [yMin, yMax] = graph.y_range;
    } else {
      const allY = sampled.flatMap((c) => c.points.map((p) => p.y));
      (graph.highlight_points || []).forEach((p) => { if (typeof p.y === "number") allY.push(p.y); });
      if (allY.length === 0) { yMin = -5; yMax = 5; }
      else {
        const minY = Math.min(...allY);
        const maxY = Math.max(...allY);
        const pad = Math.max(1, (maxY - minY) * 0.15);
        yMin = minY - pad;
        yMax = maxY + pad;
      }
    }
    return { xMin, xMax, yMin, yMax, curves: sampled };
  }, [graph]);

  if (!safeData) return null;
  const { xMin, xMax, yMin, yMax, curves } = safeData;

  const plotW = width - PADDING.left - PADDING.right;
  const plotH = HEIGHT - PADDING.top - PADDING.bottom;
  const sx = (x: number) => PADDING.left + ((x - xMin) / (xMax - xMin)) * plotW;
  const sy = (y: number) => PADDING.top + (1 - (y - yMin) / (yMax - yMin)) * plotH;

  const niceStep = (range: number) => {
    const rough = range / 5;
    const pow = Math.pow(10, Math.floor(Math.log10(rough)));
    return Math.ceil(rough / pow) * pow;
  };
  const xStep = niceStep(xMax - xMin);
  const yStep = niceStep(yMax - yMin);
  const xTicks: number[] = [];
  for (let v = Math.ceil(xMin / xStep) * xStep; v <= xMax; v += xStep) xTicks.push(v);
  const yTicks: number[] = [];
  for (let v = Math.ceil(yMin / yStep) * yStep; v <= yMax; v += yStep) yTicks.push(v);

  return (
    <div style={{
      background: colors.bg,
      borderRadius: radius.md,
      border: `1px solid ${colors.border}`,
      padding: 12,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 8,
    }}>
      <svg width="100%" height={HEIGHT} viewBox={`0 0 ${width} ${HEIGHT}`} preserveAspectRatio="xMidYMid meet">
        {/* Griglia */}
        <g>
          {xTicks.map((v) => (
            <line key={`vg-${v}`} x1={sx(v)} y1={PADDING.top} x2={sx(v)} y2={HEIGHT - PADDING.bottom} stroke={colors.border} strokeWidth={1} />
          ))}
          {yTicks.map((v) => (
            <line key={`hg-${v}`} x1={PADDING.left} y1={sy(v)} x2={width - PADDING.right} y2={sy(v)} stroke={colors.border} strokeWidth={1} />
          ))}
        </g>

        {/* Assi x=0 e y=0 se rientrano nel range */}
        {yMin <= 0 && yMax >= 0 && (
          <line x1={PADDING.left} y1={sy(0)} x2={width - PADDING.right} y2={sy(0)} stroke="rgba(255,255,255,0.5)" strokeWidth={1.5} />
        )}
        {xMin <= 0 && xMax >= 0 && (
          <line x1={sx(0)} y1={PADDING.top} x2={sx(0)} y2={HEIGHT - PADDING.bottom} stroke="rgba(255,255,255,0.5)" strokeWidth={1.5} />
        )}

        {/* Etichette tick */}
        {xTicks.map((v) => (
          <text key={`xl-${v}`} x={sx(v)} y={HEIGHT - PADDING.bottom + 16} fontSize={11} fill={colors.textMuted} textAnchor="middle" fontFamily="Inter, system-ui, sans-serif">
            {Number.isInteger(v) ? v.toString() : v.toFixed(1)}
          </text>
        ))}
        {yTicks.map((v) => (
          <text key={`yl-${v}`} x={PADDING.left - 8} y={sy(v) + 4} fontSize={11} fill={colors.textMuted} textAnchor="end" fontFamily="Inter, system-ui, sans-serif">
            {Number.isInteger(v) ? v.toString() : v.toFixed(1)}
          </text>
        ))}

        {/* Etichette assi opzionali */}
        {graph.x_label && (
          <text x={width - PADDING.right} y={sy(0) - 8} fontSize={11} fill={colors.textSub} textAnchor="end" fontStyle="italic">
            {graph.x_label}
          </text>
        )}
        {graph.y_label && xMin <= 0 && xMax >= 0 && (
          <text x={sx(0) + 8} y={PADDING.top + 10} fontSize={11} fill={colors.textSub} fontStyle="italic">
            {graph.y_label}
          </text>
        )}

        {/* Curve */}
        {curves.map((curve, i) => {
          if (curve.points.length < 2) return null;
          let d = "";
          let lastY: number | null = null;
          const yJumpThreshold = (yMax - yMin) * 0.5;
          curve.points.forEach((p, idx) => {
            const px = sx(p.x);
            const py = sy(Math.max(yMin - 5, Math.min(yMax + 5, p.y)));
            const isJump = lastY != null && Math.abs(p.y - lastY) > yJumpThreshold;
            if (idx === 0 || isJump) d += `M ${px.toFixed(2)} ${py.toFixed(2)} `;
            else d += `L ${px.toFixed(2)} ${py.toFixed(2)} `;
            lastY = p.y;
          });
          return <path key={i} d={d.trim()} stroke={curve.color} strokeWidth={2.4} fill="none" strokeLinecap="round" strokeLinejoin="round" />;
        })}

        {/* Highlight points */}
        {(graph.highlight_points || []).map((pt, i) => {
          if (typeof pt.x !== "number" || typeof pt.y !== "number") return null;
          const color = pt.color || colors.green;
          return (
            <g key={`hp-${i}`}>
              <circle cx={sx(pt.x)} cy={sy(pt.y)} r={6} fill={color} stroke="#fff" strokeWidth={1.8} />
              {pt.label && (
                <text x={sx(pt.x)} y={sy(pt.y) - 12} fontSize={11} fill={color} textAnchor="middle" fontWeight={700}>
                  {pt.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Legenda */}
      {curves.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 14, alignSelf: "stretch", paddingLeft: 4, paddingRight: 4 }}>
          {curves.map((c, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ display: "inline-block", width: 14, height: 4, borderRadius: 2, background: c.color }} />
              <span style={{ color: colors.textSub, fontSize: 12, fontWeight: 600 }}>{c.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
