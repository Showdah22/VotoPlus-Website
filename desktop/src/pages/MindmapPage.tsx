import { useEffect, useRef, useState } from "react";
import { Sparkles, ChevronRight, GitBranch, Loader2, ZoomIn, ZoomOut, Maximize2, Download } from "lucide-react";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { jsPDF } from "jspdf";
import { svg2pdf } from "svg2pdf.js";
import { useAuth } from "../store/auth";
import { api } from "../api/client";
import { colors, radius } from "../theme";
import { Select } from "../components/Select";

type MapNode = {
  label: string;
  color?: string;
  detail?: string;
  children?: MapNode[];
};
type Mindmap = {
  id: string;
  title: string;
  subject: string;
  depth: string;
  result: {
    root: MapNode;
    legend?: string[];
  };
  created_at?: string;
};

const DEPTHS = [
  { value: "small", label: "Piccola (1 livello)" },
  { value: "medium", label: "Media (2 livelli)" },
  { value: "big", label: "Grande (3 livelli)" },
];

const COLOR_MAP: Record<string, string> = {
  purple: colors.purple, cyan: colors.cyan, green: colors.green,
  orange: colors.orange, pink: colors.pink, red: colors.red, blue: colors.blue,
};

export function MindmapPage() {
  const token = useAuth((s) => s.token);
  const user = useAuth((s) => s.user);
  const subjects: string[] = (user as any)?.subjects || [];

  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState<string>(subjects[0] || "Generale");
  const [text, setText] = useState("");
  const [depth, setDepth] = useState<"small" | "medium" | "big">("medium");
  const [maturitaLinks, setMaturitaLinks] = useState(false);
  const [loading, setLoading] = useState(false);
  const [current, setCurrent] = useState<Mindmap | null>(null);
  const [history, setHistory] = useState<Mindmap[]>([]);
  const [err, setErr] = useState<string | null>(null);

  async function loadHistory() {
    if (!token) return;
    try {
      const h = await api.mindmapsList(token);
      setHistory(h as Mindmap[]);
    } catch {}
  }
  useEffect(() => {
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function onGenerate() {
    if (!token) return;
    if (!title.trim() && !text.trim()) {
      setErr("Inserisci un argomento o un testo da mappare.");
      return;
    }
    setLoading(true);
    setErr(null);
    try {
      const m = (await api.mindmapCreate({ title: title.trim() || undefined, subject, text: text.trim() || undefined, depth, maturita_links: maturitaLinks }, token)) as Mindmap;
      setCurrent(m);
      await loadHistory();
    } catch (e: any) {
      const msg = e?.status === 402 ? "Le mappe concettuali sono una funzione Premium o Maturità." : (e?.message || "Errore");
      setErr(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 20 }}>
      <header style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={iconWrap(colors.purple)}><GitBranch size={22} color={colors.purple} /></div>
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 900, letterSpacing: -0.5 }}>Mappa concettuale</h1>
          <p style={{ margin: "4px 0 0 0", color: colors.textSub, fontSize: 13 }}>
            Genera mappe ad albero gerarchiche per organizzare visivamente lo studio.
          </p>
        </div>
      </header>

      <section style={{ ...cardStyle(), opacity: loading ? 0.55 : 1, pointerEvents: loading ? "none" : "auto", transition: "opacity 150ms" }}>
        <FieldLabel label="Argomento della mappa">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="es. Rivoluzione francese" style={txtInput()} disabled={loading} />
        </FieldLabel>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <FieldLabel label="Materia">
            <Select value={subject} onChange={setSubject} options={["Generale", ...subjects].map((s) => ({ value: s, label: s }))} disabled={loading} />
          </FieldLabel>
          <FieldLabel label="Profondità">
            <Select value={depth} onChange={(v) => setDepth(v as any)} options={DEPTHS} disabled={loading} />
          </FieldLabel>
        </div>
        <FieldLabel label="Testo da mappare (opzionale)">
          <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Incolla qui un riassunto o appunti da trasformare in mappa…" rows={4} style={txtArea()} disabled={loading} />
        </FieldLabel>

        {/* Toggle: aggiungi collegamenti Maturità (opt-in, default OFF) */}
        <label
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
            padding: "10px 12px",
            borderRadius: radius.sm,
            background: maturitaLinks ? `${colors.pink}12` : colors.bgGlass,
            border: `1px solid ${maturitaLinks ? colors.pink + "77" : colors.border}`,
            cursor: loading ? "default" : "pointer",
            transition: "background 150ms, border-color 150ms",
          }}
        >
          <input
            type="checkbox"
            checked={maturitaLinks}
            onChange={(e) => setMaturitaLinks(e.target.checked)}
            disabled={loading}
            style={{ marginTop: 3, accentColor: colors.pink, width: 16, height: 16 }}
          />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: colors.textPrimary }}>
              🎓 Aggiungi collegamenti Maturità
            </div>
            <div style={{ fontSize: 11.5, color: colors.textSub, marginTop: 2, lineHeight: 1.4 }}>
              Aggiunge un ramo con collegamenti interdisciplinari (letteratura, storia,
              filosofia, arte…) utili per l'orale di Maturità. Attiva solo se stai preparando l'esame.
            </div>
          </div>
        </label>

        {err && <ErrorBox msg={err} />}

        <button onClick={onGenerate} disabled={loading || (!title.trim() && !text.trim())} style={primaryBtn(loading || (!title.trim() && !text.trim()))}>
          {loading ? (<><Loader2 size={16} className="spin" /> Generazione mappa…</>) : (<><Sparkles size={16} /> Genera mappa</>)}
        </button>
      </section>

      {current && (
        <section style={cardStyle({ background: `linear-gradient(135deg, ${colors.purple}12 0%, ${colors.blue}08 100%)`, border: `1.5px solid ${colors.purple}55`, padding: 20 })}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 900 }}>{current.title}</h2>
            <span style={pill(colors.purple)}>{current.subject}</span>
          </div>
          <SvgMindmap root={current.result.root} title={current.title} />
          {current.result.legend && current.result.legend.length > 0 && (
            <div style={{ fontSize: 11, color: colors.textMuted, fontStyle: "italic", borderTop: `1px solid ${colors.border}`, paddingTop: 10, marginTop: 12 }}>
              {current.result.legend.join(" · ")}
            </div>
          )}
        </section>
      )}

      {history.length > 0 && (
        <section>
          <h2 style={{ margin: "0 0 12px 0", fontSize: 16, fontWeight: 800 }}>Le tue mappe ({history.length})</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 10 }}>
            {history.map((h) => (
              <button key={h.id} onClick={() => setCurrent(h)} style={{
                padding: 12,
                borderRadius: radius.md,
                background: colors.bgGlass,
                border: `1px solid ${colors.border}`,
                textAlign: "left",
                display: "flex", flexDirection: "column", gap: 6,
                cursor: "pointer",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={pill(colors.cyan)}>{h.subject}</span>
                  <ChevronRight size={12} color={colors.textMuted} />
                </div>
                <div style={{ fontWeight: 800, fontSize: 14, lineHeight: 1.35 }}>{h.title}</div>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

/**
 * Rendering SVG di una mappa concettuale gerarchica.
 * Layout: root centrato in alto, i figli distribuiti orizzontalmente
 * proporzionalmente al numero di foglie del loro sottoalbero (Reingold-Tilford
 * semplificato). Connettori curvi (Bezier) da bordo inferiore parent → bordo
 * superiore child. Ogni livello ha il proprio color-scheme dal nodo backend.
 */

const NODE_W = 180;
const NODE_H = 110;
const NODE_H_ROOT = 60;
const H_GAP = 18;
const V_GAP = 50;
const PADDING = 20;

type Pos = { node: MapNode; x: number; y: number; w: number; h: number; parent?: Pos };

function countLeaves(n: MapNode): number {
  if (!n.children || n.children.length === 0) return 1;
  return n.children.reduce((s, c) => s + countLeaves(c), 0);
}

function computeLayout(root: MapNode): { positions: Pos[]; width: number; height: number } {
  const totalLeaves = Math.max(1, countLeaves(root));
  const totalW = totalLeaves * (NODE_W + H_GAP);
  const positions: Pos[] = [];

  function place(node: MapNode, level: number, xStart: number, xEnd: number, parent: Pos | undefined) {
    const cx = (xStart + xEnd) / 2;
    const h = level === 0 ? NODE_H_ROOT : NODE_H;
    const y = PADDING + level * (NODE_H + V_GAP);
    const pos: Pos = { node, x: cx - NODE_W / 2, y, w: NODE_W, h, parent };
    positions.push(pos);
    const children = node.children || [];
    if (children.length === 0) return;
    const leafCounts = children.map((c) => countLeaves(c));
    const totalLeavesLocal = leafCounts.reduce((a, b) => a + b, 0);
    const availableW = xEnd - xStart;
    let cursor = xStart;
    for (let i = 0; i < children.length; i++) {
      const w = (leafCounts[i] / totalLeavesLocal) * availableW;
      place(children[i], level + 1, cursor, cursor + w, pos);
      cursor += w;
    }
  }
  place(root, 0, PADDING, totalW + PADDING, undefined);
  const maxY = Math.max(...positions.map((p) => p.y + p.h)) + PADDING;
  return { positions, width: totalW + PADDING * 2, height: maxY };
}

function SvgMindmap({ root, title }: { root: MapNode; title: string }) {
  const { positions, width, height } = computeLayout(root);
  const rootColor = COLOR_MAP[root.color || ""] || colors.purple;
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [exporting, setExporting] = useState(false);

  // Export PDF orizzontale (landscape) — usa svg2pdf.js per rendering vettoriale
  // preciso (non raster), quindi la mappa esce nitida a qualsiasi zoom su PDF.
  const onExportPdf = async () => {
    if (!svgRef.current || exporting) return;
    setExporting(true);
    try {
      // A4 landscape: 297mm × 210mm. Manteniamo margini di 10mm.
      const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const pdfW = 297;
      const pdfH = 210;
      const margin = 10;
      // Fit-to-page mantenendo aspect ratio del SVG
      const svgAspect = width / height;
      const pageAspect = (pdfW - margin * 2) / (pdfH - margin * 2 - 20); // -20 per titolo
      let drawW: number;
      let drawH: number;
      if (svgAspect > pageAspect) {
        drawW = pdfW - margin * 2;
        drawH = drawW / svgAspect;
      } else {
        drawH = pdfH - margin * 2 - 20;
        drawW = drawH * svgAspect;
      }
      const drawX = (pdfW - drawW) / 2;
      const drawY = 25 + ((pdfH - 25 - margin) - drawH) / 2;
      // Titolo in cima
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(16);
      pdf.text(title, pdfW / 2, 15, { align: "center" });
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      pdf.setTextColor(120);
      pdf.text(`Voto+ · Mappa concettuale · ${new Date().toLocaleDateString("it-IT")}`, pdfW / 2, 21, { align: "center" });
      pdf.setTextColor(0);
      // Render del SVG in vettoriale nel PDF
      await svg2pdf(svgRef.current, pdf, {
        x: drawX,
        y: drawY,
        width: drawW,
        height: drawH,
      });
      const safeName = title.replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-").toLowerCase().slice(0, 40) || "mappa";
      pdf.save(`voto-plus-mappa-${safeName}.pdf`);
    } catch (e) {
      console.error("PDF export failed", e);
      // eslint-disable-next-line no-alert
      alert("Errore durante l'esportazione PDF. Riprova.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div style={{ width: "100%", padding: "4px 0" }}>
      <TransformWrapper
        initialScale={1}
        minScale={0.5}
        maxScale={4}
        centerOnInit
        wheel={{ step: 0.15 }}
        doubleClick={{ mode: "zoomIn", step: 0.7 }}
        limitToBounds={false}
        panning={{ velocityDisabled: true }}
      >
        {({ zoomIn, zoomOut, resetTransform }) => (
          <>
            {/* Toolbar zoom + export */}
            <div style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 6,
              marginBottom: 8,
              flexWrap: "wrap",
            }}>
              <button
                onClick={() => zoomOut()}
                title="Zoom out"
                style={toolbarBtn()}
              >
                <ZoomOut size={14} />
              </button>
              <button
                onClick={() => zoomIn()}
                title="Zoom in"
                style={toolbarBtn()}
              >
                <ZoomIn size={14} />
              </button>
              <button
                onClick={() => resetTransform()}
                title="Adatta alla finestra"
                style={toolbarBtn()}
              >
                <Maximize2 size={14} />
              </button>
              <button
                onClick={onExportPdf}
                disabled={exporting}
                title="Esporta come PDF orizzontale"
                style={{
                  ...toolbarBtn(),
                  background: `${colors.purple}22`,
                  border: `1px solid ${colors.purple}77`,
                  color: colors.purple,
                  fontWeight: 700,
                  paddingLeft: 10,
                  paddingRight: 10,
                  opacity: exporting ? 0.6 : 1,
                }}
              >
                {exporting ? <Loader2 size={14} className="spin" /> : <Download size={14} />}
                <span style={{ fontSize: 12 }}>{exporting ? "Esportazione…" : "PDF"}</span>
              </button>
            </div>
            {/* Area zoomabile — bordata per capire visivamente cosa si può manipolare */}
            <div style={{
              border: `1px dashed ${colors.border}`,
              borderRadius: radius.sm,
              background: `${colors.bg}44`,
              overflow: "hidden",
            }}>
              <TransformComponent
                wrapperStyle={{ width: "100%", height: "70vh", maxHeight: 700 }}
                contentStyle={{ width: "100%", height: "100%" }}
              >
                <svg
                  ref={svgRef}
                  viewBox={`0 0 ${width} ${height}`}
                  preserveAspectRatio="xMidYMid meet"
                  style={{ display: "block", width: "100%", height: "100%" }}
                >
                  <defs>
                    <marker
                      id="voto-arrow"
                      viewBox="0 0 10 10"
                      refX="8"
                      refY="5"
                      markerWidth="7"
                      markerHeight="7"
                      orient="auto-start-reverse"
                    >
                      <path d="M 0 0 L 10 5 L 0 10 z" fill={colors.textMuted} />
                    </marker>
                  </defs>

                  {/* Connettori curvi parent → figlio */}
                  {positions.map((p, i) => {
                    if (!p.parent) return null;
                    const x1 = p.parent.x + p.parent.w / 2;
                    const y1 = p.parent.y + p.parent.h;
                    const x2 = p.x + p.w / 2;
                    const y2 = p.y;
                    const midY = (y1 + y2) / 2;
                    const d = `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2 - 2}`;
                    const strokeColor = COLOR_MAP[p.parent.node.color || ""] || rootColor;
                    return (
                      <path
                        key={`link-${i}`}
                        d={d}
                        stroke={`${strokeColor}88`}
                        strokeWidth={1.8}
                        fill="none"
                        markerEnd="url(#voto-arrow)"
                      />
                    );
                  })}

        {/* Nodi (rect + testo) */}
        {positions.map((p, i) => {
          const color = COLOR_MAP[p.node.color || ""] || (p.parent ? COLOR_MAP[p.parent.node.color || ""] || rootColor : rootColor);
          const isRoot = !p.parent;
          const fill = isRoot ? `${color}33` : `${color}22`;
          const stroke = color;
          return (
            <g key={`node-${i}`}>
              <rect
                x={p.x}
                y={p.y}
                width={p.w}
                height={p.h}
                rx={12}
                ry={12}
                fill={fill}
                stroke={stroke}
                strokeWidth={isRoot ? 2.4 : 1.6}
              />
              <foreignObject x={p.x + 6} y={p.y} width={p.w - 12} height={p.h}>
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: isRoot ? "center" : "flex-start",
                    textAlign: "center",
                    color: "#fff",
                    padding: isRoot ? "2px 4px" : "8px 6px",
                    overflow: "hidden",
                    fontFamily: "inherit",
                    gap: 4,
                  }}
                  title={p.node.detail || p.node.label}
                >
                  <div style={{
                    fontWeight: isRoot ? 900 : 800,
                    fontSize: isRoot ? 13.5 : 12.5,
                    lineHeight: 1.2,
                    textShadow: "0 1px 2px rgba(0,0,0,0.4)",
                  }}>
                    {p.node.label}
                  </div>
                  {!isRoot && p.node.detail && (
                    <div style={{
                      fontSize: 9.5,
                      lineHeight: 1.25,
                      fontWeight: 500,
                      color: "rgba(255,255,255,0.88)",
                      overflow: "hidden",
                      display: "-webkit-box",
                      WebkitBoxOrient: "vertical" as any,
                      WebkitLineClamp: 5,
                      wordBreak: "break-word",
                    }}>
                      {p.node.detail}
                    </div>
                  )}
                </div>
              </foreignObject>
            </g>
          );
        })}
      </svg>
              </TransformComponent>
            </div>
            <p style={{ margin: "6px 0 0", fontSize: 11, color: colors.textMuted, textAlign: "center" }}>
              💡 Zoom con rotellina · trascina per spostare · doppio-click per zoom+ · <strong>PDF</strong> per esportare orizzontale
            </p>
          </>
        )}
      </TransformWrapper>
    </div>
  );
}

function toolbarBtn(): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    gap: 4,
    padding: "6px 8px",
    borderRadius: radius.sm,
    background: colors.bgGlass,
    border: `1px solid ${colors.border}`,
    color: colors.textPrimary,
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 700,
  };
}

function FieldLabel({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ fontSize: 11, fontWeight: 800, color: colors.textMuted, textTransform: "uppercase", letterSpacing: 0.8 }}>{label}</span>
      {children}
    </label>
  );
}
function iconWrap(color: string): React.CSSProperties {
  return { width: 44, height: 44, borderRadius: 14, background: `${color}1a`, border: `1px solid ${color}55`, display: "flex", alignItems: "center", justifyContent: "center" };
}
function cardStyle(extra: React.CSSProperties = {}): React.CSSProperties {
  return { padding: 18, borderRadius: radius.lg, background: colors.bgGlass, border: `1px solid ${colors.border}`, display: "flex", flexDirection: "column", gap: 14, ...extra };
}
function txtInput(): React.CSSProperties {
  return { height: 42, padding: "0 14px", borderRadius: radius.md, background: colors.bgGlass, border: `1px solid ${colors.border}`, color: colors.textPrimary, fontSize: 14, outline: "none", fontFamily: "inherit" };
}
function txtArea(): React.CSSProperties {
  return { padding: "12px 14px", borderRadius: radius.md, background: colors.bgGlass, border: `1px solid ${colors.border}`, color: colors.textPrimary, fontSize: 14, outline: "none", resize: "vertical", fontFamily: "inherit" };
}
function primaryBtn(disabled: boolean): React.CSSProperties {
  return {
    padding: "12px 18px", borderRadius: radius.md,
    background: disabled ? colors.bgGlass : `linear-gradient(135deg, ${colors.purple} 0%, ${colors.blue} 100%)`,
    border: "none", color: disabled ? colors.textMuted : "#fff",
    fontWeight: 800, fontSize: 14, cursor: disabled ? "not-allowed" : "pointer",
    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
  };
}
function pill(color: string): React.CSSProperties {
  return { fontSize: 10, fontWeight: 900, letterSpacing: 0.8, color, background: `${color}15`, border: `1px solid ${color}55`, padding: "3px 10px", borderRadius: 999, textTransform: "uppercase" };
}
function ErrorBox({ msg }: { msg: string }) {
  return (
    <div style={{ padding: 10, borderRadius: radius.sm, background: `${colors.red}15`, border: `1px solid ${colors.red}55`, color: colors.red, fontSize: 12, fontWeight: 700 }}>{msg}</div>
  );
}
