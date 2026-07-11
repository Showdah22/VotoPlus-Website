import { useEffect, useState } from "react";
import { Sparkles, ChevronRight, GitBranch } from "lucide-react";
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
      const m = (await api.mindmapCreate({ title: title.trim() || undefined, subject, text: text.trim() || undefined, depth }, token)) as Mindmap;
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

      <section style={cardStyle()}>
        <FieldLabel label="Argomento della mappa">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="es. Rivoluzione francese" style={txtInput()} />
        </FieldLabel>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <FieldLabel label="Materia">
            <Select value={subject} onChange={setSubject} options={["Generale", ...subjects].map((s) => ({ value: s, label: s }))} />
          </FieldLabel>
          <FieldLabel label="Profondità">
            <Select value={depth} onChange={(v) => setDepth(v as any)} options={DEPTHS} />
          </FieldLabel>
        </div>
        <FieldLabel label="Testo da mappare (opzionale)">
          <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Incolla qui un riassunto o appunti da trasformare in mappa…" rows={4} style={txtArea()} />
        </FieldLabel>

        {err && <ErrorBox msg={err} />}

        <button onClick={onGenerate} disabled={loading || (!title.trim() && !text.trim())} style={primaryBtn(loading || (!title.trim() && !text.trim()))}>
          {loading ? "Generazione mappa…" : (<><Sparkles size={16} /> Genera mappa</>)}
        </button>
      </section>

      {current && (
        <section style={cardStyle({ background: `linear-gradient(135deg, ${colors.purple}12 0%, ${colors.blue}08 100%)`, border: `1.5px solid ${colors.purple}55` })}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 900 }}>{current.title}</h2>
            <span style={pill(colors.purple)}>{current.subject}</span>
          </div>
          <div style={{ overflowX: "auto", padding: "8px 0" }}>
            <NodeView node={current.result.root} depth={0} />
          </div>
          {current.result.legend && current.result.legend.length > 0 && (
            <div style={{ fontSize: 11, color: colors.textMuted, fontStyle: "italic", borderTop: `1px solid ${colors.border}`, paddingTop: 10 }}>
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

function NodeView({ node, depth }: { node: MapNode; depth: number }) {
  const color = COLOR_MAP[node.color || ""] || colors.purple;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 6, marginLeft: depth === 0 ? 0 : 24, position: "relative" }}>
      <div style={{
        padding: depth === 0 ? "12px 18px" : "8px 14px",
        borderRadius: radius.md,
        background: `${color}18`,
        border: `1.5px solid ${color}77`,
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        fontWeight: depth === 0 ? 900 : 700,
        fontSize: depth === 0 ? 16 : depth === 1 ? 14 : 13,
        color: colors.textPrimary,
        boxShadow: `0 4px 20px ${color}22`,
      }}>
        <span style={{
          width: depth === 0 ? 10 : 6, height: depth === 0 ? 10 : 6, borderRadius: 999,
          background: color, flexShrink: 0,
        }} />
        <span>{node.label}</span>
      </div>
      {node.detail && (
        <div style={{ fontSize: 11.5, color: colors.textMuted, marginLeft: 20, marginTop: -2, marginBottom: 4, maxWidth: 400 }}>{node.detail}</div>
      )}
      {node.children && node.children.length > 0 && (
        <div style={{
          display: "flex", flexDirection: "column", gap: 6,
          borderLeft: `2px dashed ${color}55`,
          paddingLeft: 12,
          marginLeft: 6,
        }}>
          {node.children.map((child, i) => (
            <NodeView key={i} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
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
