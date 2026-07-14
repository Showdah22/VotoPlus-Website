import { useEffect, useState } from "react";
import { Search, Trash2, Sparkles, Book, ChevronRight, Loader2 } from "lucide-react";
import { radius } from "../theme";
import { useAuth } from "../store/auth";
import { api } from "../api/client";

import { useTheme } from "../lib/theme-provider";
type VocabEntry = {
  id?: string;
  word: string;
  lang: string;
  pos: string;
  definition: string;
  examples: string[];
  synonyms: string[];
  antonyms: string[];
  translation: string;
  etymology: string;
  difficulty: "base" | "intermedio" | "avanzato" | string;
  created_at?: string;
};

const LANGS = [
  { key: "italiano", label: "IT" },
  { key: "inglese", label: "EN" },
  { key: "latino", label: "LA" },
  { key: "greco", label: "GR" },
  { key: "francese", label: "FR" },
  { key: "spagnolo", label: "ES" },
  { key: "tedesco", label: "DE" },
];

export function VocabolarioPage() {
  const { colors } = useTheme();
  const token = useAuth((s) => s.token);
  const [word, setWord] = useState("");
  const [lang, setLang] = useState("italiano");
  const [context, setContext] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VocabEntry | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [history, setHistory] = useState<VocabEntry[]>([]);

  async function loadHistory() {
    if (!token) return;
    try {
      const h = await api.vocabHistory(token);
      setHistory(h);
    } catch {}
  }
  useEffect(() => {
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function onSearch() {
    if (!token) return;
    const w = word.trim();
    if (!w) return;
    setLoading(true);
    setErr(null);
    try {
      const r = await api.vocabLookup({ word: w, lang, context: context.trim() || undefined }, token);
      setResult(r as VocabEntry);
      await loadHistory();
    } catch (e: any) {
      setErr(e?.message || "Errore ricerca");
    } finally {
      setLoading(false);
    }
  }

  async function onDeleteHistory(id?: string) {
    if (!token || !id) return;
    try {
      await api.vocabHistoryDelete(id, token);
      setHistory((h) => h.filter((e) => e.id !== id));
    } catch {}
  }

  function openFromHistory(e: VocabEntry) {
    setResult(e);
    setWord(e.word);
    setLang(e.lang);
    setContext("");
    setErr(null);
  }

  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <div style={{ fontSize: 26, fontWeight: 900, letterSpacing: -0.4 }}>Vocabolario AI</div>
        <div style={{ fontSize: 13, color: colors.textSub, marginTop: 4 }}>
          Cerca il significato, esempi, sinonimi ed etimologia in 7 lingue.
        </div>
      </div>

      {/* Search bar */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {LANGS.map((l) => (
            <button
              key={l.key}
              onClick={() => setLang(l.key)}
              style={{
                padding: "5px 10px",
                borderRadius: 999,
                background: lang === l.key ? `${colors.cyan}22` : colors.bgGlass,
                border: `1px solid ${lang === l.key ? colors.cyan : colors.border}`,
                color: lang === l.key ? colors.cyan : colors.textSub,
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: 0.6,
                cursor: "pointer",
              }}
            >
              {l.label}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            padding: "0 14px",
            borderRadius: radius.md,
            background: colors.bgGlass,
            border: `1px solid ${colors.border}`,
          }}>
            <Search size={16} color={colors.textMuted} />
            <input
              value={word}
              onChange={(e) => setWord(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onSearch()}
              placeholder="es. epifania, resilience, virtus…"
              style={{
                flex: 1,
                padding: "12px 10px",
                background: "transparent",
                border: "none",
                outline: "none",
                color: colors.textPrimary,
                fontSize: 14,
              }}
            />
          </div>
          <button
            onClick={onSearch}
            disabled={loading || !word.trim()}
            style={{
              padding: "12px 20px",
              borderRadius: radius.md,
              background: `linear-gradient(135deg, ${colors.purple} 0%, ${colors.blue} 100%)`,
              border: "none",
              color: colors.textPrimary,
              fontWeight: 800,
              fontSize: 13,
              cursor: loading || !word.trim() ? "not-allowed" : "pointer",
              opacity: loading || !word.trim() ? 0.6 : 1,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {loading ? (<><Loader2 size={14} className="spin" /> Ricerca…</>) : (<><Sparkles size={14} /> Cerca</>)}
          </button>
        </div>
        <input
          value={context}
          onChange={(e) => setContext(e.target.value)}
          placeholder="Opzionale: frase in cui hai incontrato la parola…"
          style={{
            padding: "10px 14px",
            borderRadius: radius.sm,
            background: colors.bgGlass,
            border: `1px solid ${colors.border}`,
            color: colors.textPrimary,
            fontSize: 12,
            outline: "none",
          }}
        />
      </div>

      {err && (
        <div style={{ padding: 12, borderRadius: radius.sm, background: `${colors.red}15`, border: `1px solid ${colors.red}55`, color: colors.red, fontSize: 13 }}>
          {err}
        </div>
      )}

      {loading && <Placeholder label="L'AI sta analizzando la parola…" />}

      {result && !loading && <VocabCard entry={result} />}

      {/* History */}
      <section>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>Cronologia ricerche</h2>
          <span style={{ fontSize: 11, color: colors.textMuted }}>{history.length} voci</span>
        </div>
        {history.length === 0 ? (
          <Placeholder label="Ancora nessuna ricerca. Prova con una parola qui sopra." />
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 10 }}>
            {history.map((e) => (
              <button
                key={e.id || `${e.word}-${e.lang}`}
                onClick={() => openFromHistory(e)}
                style={{
                  padding: 12,
                  borderRadius: radius.md,
                  background: colors.bgGlass,
                  border: `1px solid ${colors.border}`,
                  textAlign: "left",
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  cursor: "pointer",
                  position: "relative",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{
                    fontSize: 10,
                    fontWeight: 900,
                    color: colors.cyan,
                    background: `${colors.cyan}15`,
                    padding: "2px 8px",
                    borderRadius: 999,
                    letterSpacing: 0.6,
                    textTransform: "uppercase",
                  }}>{e.lang}</span>
                  <ChevronRight size={12} color={colors.textMuted} />
                </div>
                <div style={{ fontWeight: 800, fontSize: 14 }}>{e.word}</div>
                <div style={{ fontSize: 11, color: colors.textSub, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                  {e.definition}
                </div>
                {e.id && (
                  <span
                    onClick={(ev) => {
                      ev.stopPropagation();
                      onDeleteHistory(e.id);
                    }}
                    style={{
                      position: "absolute",
                      top: 6,
                      right: 6,
                      padding: 4,
                      borderRadius: 6,
                      background: colors.bg,
                      border: `1px solid ${colors.border}`,
                      color: colors.textMuted,
                      cursor: "pointer",
                    }}
                    title="Elimina"
                  >
                    <Trash2 size={10} />
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function VocabCard({ entry }: { entry: VocabEntry }) {
  const { colors } = useTheme();
  const diffColor =
    entry.difficulty === "avanzato" ? colors.red
    : entry.difficulty === "intermedio" ? colors.orange
    : colors.green;
  return (
    <div style={{
      padding: 20,
      borderRadius: radius.lg,
      background: `linear-gradient(135deg, ${colors.purple}12 0%, ${colors.blue}08 100%)`,
      border: `1px solid ${colors.purple}44`,
      display: "flex",
      flexDirection: "column",
      gap: 14,
    }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
        <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: -0.4 }}>{entry.word}</div>
        {entry.pos && (
          <span style={{ fontSize: 12, color: colors.textMuted, fontStyle: "italic" }}>{entry.pos}</span>
        )}
        <span style={{
          fontSize: 10,
          fontWeight: 900,
          color: diffColor,
          background: `${diffColor}15`,
          border: `1px solid ${diffColor}55`,
          padding: "2px 8px",
          borderRadius: 999,
          textTransform: "uppercase",
          letterSpacing: 0.6,
        }}>{entry.difficulty}</span>
        <span style={{ fontSize: 10, color: colors.cyan, background: `${colors.cyan}15`, border: `1px solid ${colors.cyan}55`, padding: "2px 8px", borderRadius: 999, textTransform: "uppercase", fontWeight: 800 }}>
          {entry.lang}
        </span>
      </div>

      {entry.definition && (
        <div style={{ fontSize: 15, lineHeight: 1.6, color: colors.textPrimary }}>{entry.definition}</div>
      )}

      {entry.translation && (
        <div style={{ fontSize: 13, color: colors.textSub }}>
          <strong style={{ color: colors.textMuted, textTransform: "uppercase", fontSize: 10, letterSpacing: 0.6 }}>Traduzione</strong>{" "}
          <span>{entry.translation}</span>
        </div>
      )}

      {entry.examples && entry.examples.length > 0 && (
        <div>
          <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: 0.8, color: colors.textMuted, textTransform: "uppercase", marginBottom: 6 }}>Esempi</div>
          <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 4 }}>
            {entry.examples.map((ex, i) => (
              <li key={i} style={{ fontSize: 13, color: colors.textSub, lineHeight: 1.5 }}>{ex}</li>
            ))}
          </ul>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {entry.synonyms && entry.synonyms.length > 0 && (
          <Chips label="Sinonimi" items={entry.synonyms} color={colors.green} />
        )}
        {entry.antonyms && entry.antonyms.length > 0 && (
          <Chips label="Contrari" items={entry.antonyms} color={colors.pink} />
        )}
      </div>

      {entry.etymology && (
        <div style={{ fontSize: 12, color: colors.textMuted, fontStyle: "italic", borderTop: `1px solid ${colors.border}`, paddingTop: 12 }}>
          <Book size={11} style={{ verticalAlign: "middle", marginRight: 4 }} />
          {entry.etymology}
        </div>
      )}
    </div>
  );
}

function Chips({ label, items, color }: { label: string; items: string[]; color: string }) {
  const { colors } = useTheme();
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: 0.8, color: colors.textMuted, textTransform: "uppercase", marginBottom: 6 }}>{label}</div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {items.map((it, i) => (
          <span key={i} style={{
            fontSize: 12,
            padding: "3px 10px",
            borderRadius: 999,
            background: `${color}15`,
            border: `1px solid ${color}55`,
            color,
            fontWeight: 700,
          }}>{it}</span>
        ))}
      </div>
    </div>
  );
}

function Placeholder({ label }: { label: string }) {
  const { colors } = useTheme();
  return (
    <div
      style={{
        padding: 24,
        borderRadius: radius.md,
        background: colors.bgGlass,
        border: `1px dashed ${colors.border}`,
        color: colors.textSub,
        fontSize: 13,
        textAlign: "center",
      }}
    >
      {label}
    </div>
  );
}
