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
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 10 }}>
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
 * Rendering SVG di una mappa concettuale gerarchica con layout ADATTIVO.
 *
 * Strategia (ispirata a mappe scolastiche reali):
 *  - Livello 0 (root): centrato in alto.
 *  - Livello 1: distribuzione orizzontale con leggero stagger Y (dinamismo).
 *  - Livello 2+ o nodi con ≥3 figli: orientamento VERTICALE (figli impilati
 *    a destra del parent). Questo riduce drasticamente la larghezza totale
 *    e permette di leggere mappe grandi anche su MacBook Air 13".
 *  - Connettori: curve Bezier orizzontali quando il child è sotto,
 *    curve Bezier a "L" quando il child è a destra (vertical stack).
 *
 * Rendering: usa SVG puro (<text>/<tspan>) invece di <foreignObject>,
 * così l'export PDF con svg2pdf.js funziona correttamente (svg2pdf NON
 * supporta foreignObject, era il motivo del PDF vuoto).
 */

const NODE_W = 170;
const NODE_H = 96;
const NODE_H_ROOT = 56;
const H_GAP = 26;
const V_GAP = 44;         // gap verticale in layout orizzontale (parent -> figli)
const V_GAP_STACK = 14;   // gap verticale tra fratelli impilati (layout verticale)
const PADDING = 24;

// Wrap parameters (heuristica basata su char count perche' misurare SVG text server-side e' complesso)
const LABEL_MAX_CHARS = 22;    // caratteri per riga label
const DETAIL_MAX_CHARS = 26;   // caratteri per riga detail
const LABEL_MAX_LINES = 2;
const DETAIL_MAX_LINES = 4;

type Orient = "H" | "V";
type Pos = { node: MapNode; x: number; y: number; w: number; h: number; parent?: Pos; orient: Orient };
type Extent = { w: number; h: number };

// Decide the orientation of a node's children based on level and count.
// Level 0 -> H (root spread orizzontale)
// Level 1 con <=2 figli -> H (mantiene look ad albero)
// Altrimenti V (impila verticalmente a destra: mappe piu' strette)
function decideOrient(level: number, numChildren: number): Orient {
  if (level === 0) return "H";
  if (level === 1 && numChildren <= 2) return "H";
  return "V";
}

// Calcola l'estensione (bounding box) del sottoalbero radicato in `node`.
function computeExtent(node: MapNode, level: number): Extent {
  const nodeH = level === 0 ? NODE_H_ROOT : NODE_H;
  const kids = node.children || [];
  if (kids.length === 0) return { w: NODE_W, h: nodeH };

  const orient = decideOrient(level, kids.length);
  const childExtents = kids.map((k) => computeExtent(k, level + 1));

  if (orient === "H") {
    const totalW = childExtents.reduce((s, e) => s + e.w, 0) + (kids.length - 1) * H_GAP;
    const maxChildH = Math.max(...childExtents.map((e) => e.h));
    return { w: Math.max(NODE_W, totalW), h: nodeH + V_GAP + maxChildH };
  } else {
    const totalH = childExtents.reduce((s, e) => s + e.h, 0) + (kids.length - 1) * V_GAP_STACK;
    const maxChildW = Math.max(...childExtents.map((e) => e.w));
    return { w: NODE_W + H_GAP + maxChildW, h: Math.max(nodeH, totalH) };
  }
}

// Piazza il sottoalbero nel rettangolo [x, y] con dimensione ext.
// Il nodo stesso viene centrato sopra il proprio blocco figli (H) o
// posto in alto-sinistra (V) con i figli impilati a destra.
function placeSubtree(
  node: MapNode,
  level: number,
  x: number,
  y: number,
  positions: Pos[],
  parent: Pos | undefined,
  siblingIndex: number,
  siblingCount: number,
): void {
  const nodeH = level === 0 ? NODE_H_ROOT : NODE_H;
  const kids = node.children || [];
  const orient = decideOrient(level, kids.length);

  if (kids.length === 0) {
    positions.push({ node, x, y, w: NODE_W, h: nodeH, parent, orient });
    return;
  }

  const childExtents = kids.map((k) => computeExtent(k, level + 1));

  if (orient === "H") {
    const totalW = childExtents.reduce((s, e) => s + e.w, 0) + (kids.length - 1) * H_GAP;
    // Nodo centrato sopra il proprio blocco figli
    const nodeX = x + (totalW - NODE_W) / 2;
    // Stagger Y solo al livello 1 con >=3 figli (look organico da concept map)
    const stagger =
      parent && parent.orient === "H" && level === 1 && siblingCount >= 3
        ? (siblingIndex % 2) * 22
        : 0;
    const pos: Pos = { node, x: nodeX, y: y + stagger, w: NODE_W, h: nodeH, parent, orient };
    positions.push(pos);
    const childY = y + nodeH + V_GAP + stagger;
    let cx = x;
    for (let i = 0; i < kids.length; i++) {
      placeSubtree(kids[i], level + 1, cx, childY, positions, pos, i, kids.length);
      cx += childExtents[i].w + H_GAP;
    }
  } else {
    // Verticale: nodo in alto, figli a destra impilati.
    // Centro verticalmente il nodo rispetto al blocco figli per un look bilanciato.
    const totalH = childExtents.reduce((s, e) => s + e.h, 0) + (kids.length - 1) * V_GAP_STACK;
    const nodeY = y + Math.max(0, (totalH - nodeH) / 2);
    const pos: Pos = { node, x, y: nodeY, w: NODE_W, h: nodeH, parent, orient };
    positions.push(pos);
    const childX = x + NODE_W + H_GAP;
    let cy = y;
    for (let i = 0; i < kids.length; i++) {
      placeSubtree(kids[i], level + 1, childX, cy, positions, pos, i, kids.length);
      cy += childExtents[i].h + V_GAP_STACK;
    }
  }
}

function computeLayout(root: MapNode): { positions: Pos[]; width: number; height: number } {
  const positions: Pos[] = [];
  const ext = computeExtent(root, 0);
  placeSubtree(root, 0, PADDING, PADDING, positions, undefined, 0, 1);
  const maxX = Math.max(...positions.map((p) => p.x + p.w)) + PADDING;
  const maxY = Math.max(...positions.map((p) => p.y + p.h)) + PADDING;
  return { positions, width: Math.max(ext.w + PADDING * 2, maxX), height: maxY };
}

// Word-wrap greedy per SVG (non possiamo misurare text server-side)
function wrapText(text: string, maxChars: number, maxLines: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if (!cur) {
      cur = w;
    } else if (cur.length + 1 + w.length <= maxChars) {
      cur += " " + w;
    } else {
      lines.push(cur);
      cur = w;
      if (lines.length === maxLines - 1) break;
    }
  }
  if (cur && lines.length < maxLines) lines.push(cur);
  // Truncate last line with ellipsis if too long
  if (lines.length === maxLines) {
    const remainingWords = words.slice(lines.join(" ").split(/\s+/).length);
    if (remainingWords.length > 0 && lines[lines.length - 1].length + 1 <= maxChars) {
      const last = lines[lines.length - 1];
      if (last.length > maxChars - 1) {
        lines[lines.length - 1] = last.slice(0, maxChars - 1) + "…";
      } else {
        lines[lines.length - 1] = last + "…";
      }
    }
  }
  return lines.length > 0 ? lines : [text.slice(0, maxChars)];
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
        minScale={0.3}
        maxScale={4}
        centerOnInit
        wheel={{ step: 0.06 }}
        pinch={{ step: 5 }}
        doubleClick={{ mode: "zoomIn", step: 0.5 }}
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

                  {/* Connettori curvi parent → figlio (H: verso il basso, V: verso destra) */}
                  {positions.map((p, i) => {
                    if (!p.parent) return null;
                    const parentOrient = p.parent.orient;
                    let x1: number, y1: number, x2: number, y2: number, d: string;
                    if (parentOrient === "V") {
                      // Parent verticale: connettore parte dal bordo destro del parent
                      // verso il bordo sinistro del child (curva a "L" Bezier)
                      x1 = p.parent.x + p.parent.w;
                      y1 = p.parent.y + p.parent.h / 2;
                      x2 = p.x;
                      y2 = p.y + p.h / 2;
                      const midX = (x1 + x2) / 2;
                      d = `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2 - 2} ${y2}`;
                    } else {
                      // Parent orizzontale: dal bordo inferiore parent al bordo sup child
                      x1 = p.parent.x + p.parent.w / 2;
                      y1 = p.parent.y + p.parent.h;
                      x2 = p.x + p.w / 2;
                      y2 = p.y;
                      const midY = (y1 + y2) / 2;
                      d = `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2 - 2}`;
                    }
                    const strokeColor = COLOR_MAP[p.parent.node.color || ""] || rootColor;
                    return (
                      <path
                        key={`link-${i}`}
                        d={d}
                        stroke={`${strokeColor}99`}
                        strokeWidth={1.8}
                        fill="none"
                        markerEnd="url(#voto-arrow)"
                      />
                    );
                  })}

        {/* Nodi: SVG puro (rect + text) per compatibilita' svg2pdf export */}
        {positions.map((p, i) => {
          const color = COLOR_MAP[p.node.color || ""] || (p.parent ? COLOR_MAP[p.parent.node.color || ""] || rootColor : rootColor);
          const isRoot = !p.parent;
          const fill = isRoot ? `${color}44` : `${color}2a`;
          const stroke = color;
          const cx = p.x + p.w / 2;
          const labelLines = wrapText(p.node.label, LABEL_MAX_CHARS, LABEL_MAX_LINES);
          const detailLines = !isRoot && p.node.detail
            ? wrapText(p.node.detail, DETAIL_MAX_CHARS, DETAIL_MAX_LINES)
            : [];

          // Vertical layout of text inside the box
          const labelFS = isRoot ? 14 : 12.5;
          const labelLH = isRoot ? 16 : 14;
          const detailFS = 9.5;
          const detailLH = 11.5;
          const totalTextH = labelLines.length * labelLH + (detailLines.length > 0 ? 4 + detailLines.length * detailLH : 0);
          const topOffset = (p.h - totalTextH) / 2;
          const firstLabelY = p.y + topOffset + labelFS;

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
                strokeWidth={isRoot ? 2.6 : 1.6}
              />
              {/* Label (nome del nodo) */}
              <text
                x={cx}
                y={firstLabelY}
                textAnchor="middle"
                fontFamily="Inter, -apple-system, system-ui, sans-serif"
                fontSize={labelFS}
                fontWeight={isRoot ? 900 : 800}
                fill="#ffffff"
              >
                {labelLines.map((line, li) => (
                  <tspan key={li} x={cx} dy={li === 0 ? 0 : labelLH}>
                    {line}
                  </tspan>
                ))}
              </text>
              {/* Detail (breve descrizione) */}
              {detailLines.length > 0 && (
                <text
                  x={cx}
                  y={firstLabelY + labelLines.length * labelLH + 4}
                  textAnchor="middle"
                  fontFamily="Inter, -apple-system, system-ui, sans-serif"
                  fontSize={detailFS}
                  fontWeight={500}
                  fill="rgba(255,255,255,0.86)"
                >
                  {detailLines.map((line, li) => (
                    <tspan key={li} x={cx} dy={li === 0 ? 0 : detailLH}>
                      {line}
                    </tspan>
                  ))}
                </text>
              )}
              {/* Tooltip su hover (accessibilita') */}
              <title>{p.node.detail ? `${p.node.label} — ${p.node.detail}` : p.node.label}</title>
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
