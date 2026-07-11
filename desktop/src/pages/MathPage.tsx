import { useRef, useState } from "react";
import {
  Calculator,
  Loader2,
  Sparkles,
  Upload,
  Image as ImageIcon,
  X,
  Zap,
  ArrowRight,
} from "lucide-react";
import { useAuth } from "../store/auth";
import { api } from "../api/client";
import { colors, radius } from "../theme";

type Difficulty = "base" | "standard" | "avanzato" | "maturita";

const QUICK: string[] = [
  "Risolvi: x\u00b2 - 5x + 6 = 0",
  "Calcola la derivata di f(x) = 3x\u00b3 + 2x",
  "Calcola l'integrale di (2x\u00b2 - 3x + 1) dx",
  "Risolvi il sistema: 2x+y=5, x-y=1",
];

// Formula toolbar: simboli comuni cliccabili che inseriscono nel textarea
// alla posizione del cursore.
const FORMULA_KEYS: Array<{ label: string; insert: string; wide?: boolean }> = [
  { label: "\u00b2", insert: "\u00b2" },
  { label: "\u00b3", insert: "\u00b3" },
  { label: "\u221a", insert: "\u221a" },
  { label: "\u03c0", insert: "\u03c0" },
  { label: "\u00b1", insert: "\u00b1" },
  { label: "\u00d7", insert: "\u00d7" },
  { label: "\u00f7", insert: "\u00f7" },
  { label: "\u2260", insert: "\u2260" },
  { label: "\u2264", insert: "\u2264" },
  { label: "\u2265", insert: "\u2265" },
  { label: "\u2211", insert: "\u2211" },
  { label: "\u222b", insert: "\u222b" },
  { label: "\u221e", insert: "\u221e" },
  { label: "\u00b0", insert: "\u00b0" },
];

export function MathPage() {
  const token = useAuth((s) => s.token);
  const user = useAuth((s) => s.user);
  const maturitaAllowed = !!(user?.maturita_unlocked);
  const isPremium = (user?.plan || "free") !== "free";

  const [problem, setProblem] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageB64, setImageB64] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>("standard");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function insertAtCursor(text: string) {
    const ta = inputRef.current;
    if (!ta) {
      setProblem((p) => p + text);
      return;
    }
    const start = ta.selectionStart ?? problem.length;
    const end = ta.selectionEnd ?? problem.length;
    const next = problem.slice(0, start) + text + problem.slice(end);
    setProblem(next);
    // Ripristina cursore dopo il carattere inserito
    requestAnimationFrame(() => {
      ta.focus();
      const pos = start + text.length;
      ta.setSelectionRange(pos, pos);
    });
  }

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      setError("Il file deve essere un'immagine (PNG/JPG).");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("L'immagine è troppo grande (max 5 MB).");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setImagePreview(dataUrl);
      // Estrai la parte base64 pura per il backend
      const base64 = dataUrl.split(",")[1] || "";
      setImageB64(base64);
      setError(null);
    };
    reader.onerror = () => setError("Impossibile leggere il file.");
    reader.readAsDataURL(file);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragActive(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  }

  const onSolve = async () => {
    if (!token) return;
    if (!problem.trim() && !imageB64) {
      setError("Inserisci un esercizio o carica una foto.");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const r = await api.mathSolve(
        {
          problem: problem.trim(),
          image_base64: imageB64 || undefined,
          difficulty,
        },
        token,
      );
      setResult(r);
    } catch (err: any) {
      setError(err?.message ?? "Errore durante la risoluzione");
    } finally {
      setLoading(false);
    }
  };

  function reset() {
    setResult(null);
    setProblem("");
    setImageB64(null);
    setImagePreview(null);
  }

  return (
    <div style={{ width: "100%", maxWidth: 900, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={iconWrap(colors.cyan)}>
          <Calculator size={22} color={colors.cyan} />
        </div>
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 900, letterSpacing: -0.5 }}>Matematica</h1>
          <p style={{ margin: "4px 0 0 0", color: colors.textSub, fontSize: 13 }}>
            Descrivi il problema, incolla una foto o usa la tastiera formule → soluzione step-by-step con l'AI.
          </p>
        </div>
      </div>

      {!result && (
        <>
          {/* Input area con drag-drop */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onDrop={onDrop}
            style={{
              padding: 16,
              borderRadius: radius.lg,
              background: colors.bgGlass,
              border: `1.5px ${dragActive ? "dashed" : "solid"} ${dragActive ? colors.cyan : colors.border}`,
              display: "flex",
              flexDirection: "column",
              gap: 12,
              transition: "border-color 120ms, background 120ms",
            }}
          >
            <label style={labelStyle}>Problema</label>
            <textarea
              ref={inputRef}
              value={problem}
              onChange={(e) => setProblem(e.target.value)}
              placeholder="Es. Risolvi l'equazione 2x² + 3x - 5 = 0"
              rows={5}
              style={{
                padding: 12,
                borderRadius: radius.sm,
                background: colors.bg,
                border: `1px solid ${colors.border}`,
                color: colors.textPrimary,
                fontSize: 15,
                outline: "none",
                resize: "vertical",
                fontFamily: "inherit",
                lineHeight: 1.5,
              }}
            />

            {/* Preview immagine */}
            {imagePreview && (
              <div style={{ position: "relative", borderRadius: radius.md, overflow: "hidden", border: `1px solid ${colors.border}` }}>
                <img src={imagePreview} alt="Preview" style={{ display: "block", width: "100%", maxHeight: 260, objectFit: "contain", background: "#000" }} />
                <button
                  onClick={() => { setImageB64(null); setImagePreview(null); }}
                  style={{
                    position: "absolute", top: 8, right: 8,
                    width: 30, height: 30, borderRadius: 999,
                    background: "rgba(0,0,0,0.75)",
                    border: `1px solid ${colors.borderStrong}`,
                    color: "#fff", cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                  title="Rimuovi immagine"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            {/* Formula toolbar */}
            <div style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 4,
              padding: 8,
              borderRadius: radius.sm,
              background: colors.bg,
              border: `1px solid ${colors.border}`,
            }}>
              {FORMULA_KEYS.map((k) => (
                <button
                  key={k.label}
                  onClick={() => insertAtCursor(k.insert)}
                  style={{
                    minWidth: 34,
                    height: 30,
                    padding: "0 8px",
                    borderRadius: 6,
                    background: colors.bgGlass,
                    border: `1px solid ${colors.border}`,
                    color: colors.textPrimary,
                    fontSize: 15,
                    fontWeight: 700,
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                  title={`Inserisci ${k.label}`}
                >
                  {k.label}
                </button>
              ))}
            </div>

            {/* Toolbar bottom */}
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              borderTop: `1px solid ${colors.border}`,
              paddingTop: 10,
            }}>
              <button
                onClick={() => fileInputRef.current?.click()}
                style={{
                  padding: "8px 12px",
                  borderRadius: 999,
                  background: `${colors.cyan}18`,
                  border: `1px solid ${colors.cyan}55`,
                  color: colors.cyan,
                  fontWeight: 800,
                  fontSize: 12,
                  cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 6,
                }}
              >
                <ImageIcon size={14} /> Carica foto formula
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                style={{ display: "none" }}
              />
              <span style={{ fontSize: 11, color: colors.textMuted, fontStyle: "italic" }}>
                <Upload size={11} style={{ verticalAlign: "middle", marginRight: 4 }} />
                oppure trascina qui l'immagine
              </span>
              <div style={{ flex: 1 }} />
              <span style={{ fontSize: 11, color: colors.textMuted, fontVariantNumeric: "tabular-nums" }}>
                {problem.length} caratteri
              </span>
            </div>
          </div>

          {/* Difficoltà */}
          <div>
            <label style={{ ...labelStyle, marginBottom: 8 }}>Difficoltà</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <DiffChip active={difficulty === "base"} onClick={() => setDifficulty("base")} label="Base" color={colors.green} />
              <DiffChip active={difficulty === "standard"} onClick={() => setDifficulty("standard")} label="Medio" color={colors.cyan} />
              <DiffChip
                active={difficulty === "avanzato"}
                onClick={() => setDifficulty("avanzato")}
                label="Avanzato"
                color={colors.orange}
                locked={!isPremium && !maturitaAllowed}
                lockLabel="Premium"
              />
              <DiffChip
                active={difficulty === "maturita"}
                onClick={() => setDifficulty("maturita")}
                label="Maturità"
                color={colors.pink}
                locked={!maturitaAllowed}
                lockLabel="Maturità"
              />
            </div>
          </div>

          {/* Quick suggestions */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 900, color: colors.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
              <Zap size={11} /> Suggerimenti rapidi
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {QUICK.map((q) => (
                <button
                  key={q}
                  onClick={() => setProblem(q)}
                  style={{
                    padding: "10px 14px",
                    borderRadius: radius.md,
                    background: colors.bgGlass,
                    border: `1px solid ${colors.border}`,
                    color: colors.textPrimary,
                    fontSize: 13,
                    fontWeight: 600,
                    textAlign: "left",
                    display: "flex", alignItems: "center", gap: 10,
                    cursor: "pointer",
                    transition: "border-color 120ms",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = `${colors.cyan}55`; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = colors.border; }}
                >
                  <Zap size={12} color={colors.cyan} />
                  <span style={{ flex: 1 }}>{q}</span>
                  <ArrowRight size={12} color={colors.textMuted} />
                </button>
              ))}
            </div>
          </div>

          {error && <div style={errorStyle}>{error}</div>}

          <button
            onClick={onSolve}
            disabled={loading || (!problem.trim() && !imageB64)}
            style={{
              padding: "14px 20px",
              borderRadius: radius.md,
              background: "linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)",
              color: "#fff",
              fontWeight: 800,
              fontSize: 15,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              opacity: loading || (!problem.trim() && !imageB64) ? 0.5 : 1,
              cursor: loading || (!problem.trim() && !imageB64) ? "not-allowed" : "pointer",
              boxShadow: "0 6px 24px rgba(6,182,212,0.32)",
              border: "none",
            }}
          >
            {loading ? (
              <><Loader2 size={18} className="spin" /> Risolvo…</>
            ) : (
              <><Sparkles size={18} /> Risolvi con AI</>
            )}
          </button>
        </>
      )}

      {result && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <MathResult result={result} />
          <button
            onClick={reset}
            style={{
              padding: "12px 20px",
              borderRadius: radius.sm,
              background: colors.bgGlass,
              border: `1px solid ${colors.border}`,
              color: colors.textPrimary,
              fontWeight: 700,
              alignSelf: "flex-start",
              cursor: "pointer",
            }}
          >
            ← Nuovo problema
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Render della risposta /api/math/solve. Il backend ritorna la struttura:
 * {
 *   id, user_id, type: "math", problem, topic,
 *   result: {
 *     is_off_topic, problem, result, result_latex,
 *     steps: [{ title, explanation, math }],
 *     simple_explanation,
 *     similar_exercises: string[],
 *     topic, difficulty, graph
 *   }
 * }
 * Ne rendiamo una versione elegante con highlight del risultato finale +
 * step numerati con formula monospace + esercizi simili clicabili.
 */
function MathResult({ result, title }: { result: any; title?: string }) {
  const r = result?.result || result || {};
  const finalAnswer: string = r.result || r.result_latex || "";
  const steps: Array<{ title?: string; explanation?: string; math?: string }> = Array.isArray(r.steps) ? r.steps : [];
  const simple: string = r.simple_explanation || "";
  const similar: string[] = Array.isArray(r.similar_exercises) ? r.similar_exercises : [];
  const topic: string = r.topic || result?.topic || "";
  const difficulty: string = r.difficulty || "";
  const isOffTopic = !!r.is_off_topic;

  if (isOffTopic) {
    return (
      <div style={{
        padding: 20, borderRadius: radius.lg,
        background: `${colors.orange}12`, border: `1px solid ${colors.orange}55`,
      }}>
        <div style={{ fontSize: 13, fontWeight: 900, letterSpacing: 1, textTransform: "uppercase", color: colors.orange, marginBottom: 8 }}>
          Non è un problema di matematica
        </div>
        <div style={{ fontSize: 14, color: colors.textSub, lineHeight: 1.6 }}>
          Riformula la richiesta o incolla un esercizio numerico/algebrico.
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Header con topic + difficoltà */}
      {(topic || difficulty) && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {topic && <Chip color={colors.cyan}>{topic}</Chip>}
          {difficulty && <Chip color={colors.orange}>Difficoltà: {difficulty}</Chip>}
        </div>
      )}

      {/* Titolo (dal problema o dal titolo passato) */}
      {(result.problem || r.problem || title) && (
        <div style={{ fontSize: 15, color: colors.textSub, fontStyle: "italic", lineHeight: 1.5 }}>
          {result.problem || r.problem || title}
        </div>
      )}

      {/* Risultato finale */}
      {finalAnswer && (
        <div style={{
          padding: 18, borderRadius: radius.lg,
          background: `linear-gradient(135deg, ${colors.green}18, ${colors.cyan}12)`,
          border: `1.5px solid ${colors.green}66`,
        }}>
          <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 1.2, textTransform: "uppercase", color: colors.green, marginBottom: 6 }}>
            Risultato
          </div>
          <div style={{
            fontSize: 22, fontWeight: 900,
            fontFamily: "'JetBrains Mono', 'Fira Code', ui-monospace, monospace",
            color: "#fff", letterSpacing: -0.2,
          }}>
            {finalAnswer}
          </div>
        </div>
      )}

      {/* Step-by-step */}
      {steps.length > 0 && (
        <div style={{
          padding: 18, borderRadius: radius.lg,
          background: colors.bgGlass, border: `1px solid ${colors.border}`,
        }}>
          <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 1.2, textTransform: "uppercase", color: colors.cyan, marginBottom: 14 }}>
            Soluzione passo passo
          </div>
          <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 14 }}>
            {steps.map((s, i) => (
              <li key={i} style={{ display: "flex", gap: 12 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 999,
                  background: `${colors.cyan}18`, border: `1px solid ${colors.cyan}55`,
                  color: colors.cyan, fontWeight: 900, fontSize: 12,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                }}>{i + 1}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {s.title && <div style={{ fontSize: 14, fontWeight: 800, color: "#fff", marginBottom: 4 }}>{s.title}</div>}
                  {s.explanation && <div style={{ fontSize: 13, color: colors.textSub, lineHeight: 1.6, marginBottom: s.math ? 6 : 0 }}>{s.explanation}</div>}
                  {s.math && (
                    <div style={{
                      padding: "8px 12px",
                      borderRadius: radius.sm,
                      background: colors.bg,
                      border: `1px solid ${colors.border}`,
                      fontFamily: "'JetBrains Mono', 'Fira Code', ui-monospace, monospace",
                      fontSize: 13.5,
                      color: colors.textPrimary,
                      overflowX: "auto",
                    }}>{s.math}</div>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Spiegamelo facile */}
      {simple && (
        <div style={{
          padding: 16, borderRadius: radius.lg,
          background: `${colors.purple}0d`, border: `1px solid ${colors.purple}44`,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <Sparkles size={14} color={colors.purple} />
            <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 1.2, textTransform: "uppercase", color: colors.purple }}>
              Spiegamelo facile
            </div>
          </div>
          <div style={{ fontSize: 14, color: colors.textPrimary, lineHeight: 1.65 }}>{simple}</div>
        </div>
      )}

      {/* Esercizi simili */}
      {similar.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 1.2, textTransform: "uppercase", color: colors.textMuted, marginBottom: 8 }}>
            Esercizi simili
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {similar.map((q, i) => (
              <div key={i} style={{
                padding: "10px 14px",
                borderRadius: radius.md,
                background: colors.bgGlass,
                border: `1px solid ${colors.border}`,
                fontFamily: "'JetBrains Mono', 'Fira Code', ui-monospace, monospace",
                fontSize: 13, color: colors.textPrimary,
                display: "flex", alignItems: "center", gap: 8,
              }}>
                <Zap size={12} color={colors.cyan} />
                {q}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Chip({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span style={{
      fontSize: 10, fontWeight: 900, letterSpacing: 0.8,
      color, background: `${color}18`, border: `1px solid ${color}55`,
      padding: "3px 10px", borderRadius: 999, textTransform: "uppercase",
    }}>{children}</span>
  );
}

function DiffChip({ active, onClick, label, color, locked, lockLabel }: {
  active: boolean; onClick: () => void; label: string; color: string; locked?: boolean; lockLabel?: string;
}) {
  return (
    <button
      onClick={locked ? undefined : onClick}
      disabled={locked}
      style={{
        padding: "8px 16px",
        borderRadius: 999,
        background: active ? `${color}22` : colors.bgGlass,
        border: `1px solid ${active ? color : colors.border}`,
        color: locked ? colors.textMuted : active ? color : colors.textSub,
        fontSize: 12,
        fontWeight: 800,
        cursor: locked ? "not-allowed" : "pointer",
        display: "flex", alignItems: "center", gap: 6,
        opacity: locked ? 0.65 : 1,
      }}
      title={locked ? `Sblocca con ${lockLabel}` : label}
    >
      {label}
      {locked && (
        <span style={{
          fontSize: 9,
          fontWeight: 900,
          letterSpacing: 0.6,
          padding: "2px 6px",
          borderRadius: 999,
          background: `${colors.pink}22`,
          color: colors.pink,
          textTransform: "uppercase",
        }}>{lockLabel}</span>
      )}
    </button>
  );
}

function iconWrap(c: string): React.CSSProperties {
  return {
    width: 44, height: 44, borderRadius: 14,
    background: `${c}1a`, border: `1px solid ${c}55`,
    display: "flex", alignItems: "center", justifyContent: "center",
  };
}
const labelStyle: React.CSSProperties = {
  display: "flex", flexDirection: "column", gap: 6,
  fontSize: 11, fontWeight: 800, color: colors.textMuted,
  textTransform: "uppercase", letterSpacing: 0.8,
};
const errorStyle: React.CSSProperties = {
  padding: 12, borderRadius: radius.sm,
  background: `${colors.red}1a`, border: `1px solid ${colors.red}55`,
  color: colors.red, fontSize: 13, fontWeight: 600,
};
