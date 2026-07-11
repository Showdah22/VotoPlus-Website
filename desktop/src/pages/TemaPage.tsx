import { useEffect, useState } from "react";
import { PenLine, Sparkles, Clock, ChevronRight, FileText } from "lucide-react";
import { useAuth } from "../store/auth";
import { api } from "../api/client";
import { colors, radius } from "../theme";
import { Select } from "../components/Select";

type EssayResult = {
  id: string;
  topic: string;
  essay_type: string;
  length: string;
  result: {
    traccia: string;
    tipologia: string;
    lunghezza_consigliata: string;
    tempo_stimato_min: number;
    struttura: string[];
    argomenti_chiave: string[];
    criteri_valutazione: string[];
  };
  created_at?: string;
};

const TYPES = [
  { value: "argomentativo", label: "Argomentativo (Tipologia B)" },
  { value: "analisi", label: "Analisi del testo (Tipologia A)" },
  { value: "attualita", label: "Attualità (Tipologia C)" },
  { value: "narrativo", label: "Narrativo" },
  { value: "descrittivo", label: "Descrittivo" },
];
const LENGTHS = [
  { value: "breve", label: "Breve (300-500 parole)" },
  { value: "medio", label: "Medio (500-800 parole)" },
  { value: "lungo", label: "Lungo (800-1200 parole)" },
];

export function TemaPage() {
  const token = useAuth((s) => s.token);
  const [topic, setTopic] = useState("");
  const [type, setType] = useState("argomentativo");
  const [length, setLength] = useState("medio");
  const [loading, setLoading] = useState(false);
  const [current, setCurrent] = useState<EssayResult | null>(null);
  const [history, setHistory] = useState<EssayResult[]>([]);
  const [err, setErr] = useState<string | null>(null);

  async function loadHistory() {
    if (!token) return;
    try {
      const h = await api.essayHistory(token);
      setHistory(h as EssayResult[]);
    } catch {}
  }
  useEffect(() => {
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function onGenerate() {
    if (!token || !topic.trim()) return;
    setLoading(true);
    setErr(null);
    try {
      const r = (await api.essayPrompt({ topic: topic.trim(), type, length }, token)) as EssayResult;
      setCurrent(r);
      await loadHistory();
    } catch (e: any) {
      setErr(e?.message || "Errore generazione traccia");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 20 }}>
      <header style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={iconWrap(colors.cyan)}><PenLine size={22} color={colors.cyan} /></div>
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 900, letterSpacing: -0.5 }}>Tema</h1>
          <p style={{ margin: "4px 0 0 0", color: colors.textSub, fontSize: 13 }}>
            Genera tracce di tema/saggio con struttura, criteri di valutazione e argomenti chiave.
          </p>
        </div>
      </header>

      <section style={cardStyle()}>
        <FieldLabel label="Argomento">
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="es. Il ruolo dei social media nella democrazia contemporanea"
            style={txtInput()}
            autoFocus
          />
        </FieldLabel>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <FieldLabel label="Tipologia">
            <Select value={type} onChange={setType} options={TYPES} />
          </FieldLabel>
          <FieldLabel label="Lunghezza">
            <Select value={length} onChange={setLength} options={LENGTHS} />
          </FieldLabel>
        </div>

        {err && <ErrorBox msg={err} />}

        <button
          onClick={onGenerate}
          disabled={!topic.trim() || loading}
          style={primaryBtn(!topic.trim() || loading, colors.cyan, colors.blue)}
        >
          {loading ? "Generazione traccia in corso…" : (
            <><Sparkles size={16} /> Genera traccia</>
          )}
        </button>
      </section>

      {current && (
        <section style={cardStyle({ background: `linear-gradient(135deg, ${colors.cyan}12 0%, ${colors.blue}08 100%)`, border: `1.5px solid ${colors.cyan}55` })}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span style={pill(colors.cyan)}>{current.result?.tipologia || current.essay_type}</span>
            <span style={pill(colors.purple)}>{current.result?.lunghezza_consigliata || current.length}</span>
            {current.result?.tempo_stimato_min ? (
              <span style={{ ...pill(colors.orange), display: "flex", alignItems: "center", gap: 4 }}>
                <Clock size={11} /> {current.result.tempo_stimato_min} min
              </span>
            ) : null}
          </div>

          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 900, letterSpacing: -0.3, lineHeight: 1.35 }}>
            {current.topic}
          </h2>
          <div style={{ fontSize: 14, color: colors.textPrimary, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
            {current.result?.traccia}
          </div>

          {current.result?.struttura?.length > 0 && (
            <Block title="Struttura consigliata" items={current.result.struttura} color={colors.purple} numbered />
          )}
          {current.result?.argomenti_chiave?.length > 0 && (
            <Block title="Argomenti chiave" items={current.result.argomenti_chiave} color={colors.cyan} />
          )}
          {current.result?.criteri_valutazione?.length > 0 && (
            <Block title="Criteri di valutazione" items={current.result.criteri_valutazione} color={colors.orange} />
          )}
        </section>
      )}

      {history.length > 0 && (
        <section>
          <h2 style={{ margin: "0 0 12px 0", fontSize: 16, fontWeight: 800 }}>Le tue tracce ({history.length})</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 10 }}>
            {history.map((h) => (
              <button
                key={h.id}
                onClick={() => setCurrent(h)}
                style={{
                  padding: 14,
                  borderRadius: radius.md,
                  background: colors.bgGlass,
                  border: `1px solid ${colors.border}`,
                  textAlign: "left",
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  cursor: "pointer",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={pill(colors.cyan)}>{h.essay_type}</span>
                  <ChevronRight size={14} color={colors.textMuted} />
                </div>
                <div style={{ fontWeight: 800, fontSize: 14, lineHeight: 1.35 }}>{h.topic}</div>
              </button>
            ))}
          </div>
        </section>
      )}

      {history.length === 0 && !current && (
        <div style={{
          padding: 30,
          borderRadius: radius.md,
          background: colors.bgGlass,
          border: `1px dashed ${colors.border}`,
          color: colors.textSub,
          fontSize: 13,
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 8,
        }}>
          <FileText size={28} color={colors.textMuted} />
          Ancora nessuna traccia generata. Prova con un argomento qui sopra.
        </div>
      )}
    </div>
  );
}

function Block({ title, items, color, numbered }: { title: string; items: string[]; color: string; numbered?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 0.8, color, textTransform: "uppercase", marginBottom: 8 }}>{title}</div>
      <ol style={{ margin: 0, paddingLeft: numbered ? 20 : 18, display: "flex", flexDirection: "column", gap: 6, listStyleType: numbered ? "decimal" : "disc" }}>
        {items.map((it, i) => (
          <li key={i} style={{ fontSize: 13, color: colors.textSub, lineHeight: 1.5 }}>{it}</li>
        ))}
      </ol>
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
function primaryBtn(disabled: boolean, cA = colors.purple, cB = colors.blue): React.CSSProperties {
  return {
    padding: "12px 18px", borderRadius: radius.md,
    background: disabled ? colors.bgGlass : `linear-gradient(135deg, ${cA} 0%, ${cB} 100%)`,
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
