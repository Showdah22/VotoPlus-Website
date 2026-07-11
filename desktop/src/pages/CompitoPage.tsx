import { useEffect, useRef, useState } from "react";
import { Timer, Play, Clock, CheckCircle2, XCircle, ChevronRight, RefreshCw, Loader2 } from "lucide-react";
import { useAuth } from "../store/auth";
import { api } from "../api/client";
import { colors, radius } from "../theme";
import { Select } from "../components/Select";

type ClassworkItem = {
  kind: "math" | "open" | "multiple";
  q: string;
  options?: string[];
  answer: string;
  rubric: string;
};

type Classwork = {
  id: string;
  title: string;
  subject: string;
  difficulty: string;
  duration_min: number;
  items: ClassworkItem[];
  submitted_at?: string | null;
  final_grade?: number | null;
};

type Grading = {
  grade: number;
  per_item: Array<{ index: number; correct: boolean; points: number; comment: string }>;
  summary: string;
};

const DIFFICULTIES = [
  { value: "base", label: "Base" },
  { value: "standard", label: "Standard" },
  { value: "avanzato", label: "Avanzato" },
  { value: "maturita", label: "Maturità" },
];

export function CompitoPage() {
  const token = useAuth((s) => s.token);
  const user = useAuth((s) => s.user);
  const subjects: string[] = (user as any)?.subjects || [];

  const [subject, setSubject] = useState<string>(subjects[0] || "");
  const [difficulty, setDifficulty] = useState("standard");
  const [nItems, setNItems] = useState(5);
  const [duration, setDuration] = useState(30);

  const [starting, setStarting] = useState(false);
  const [cw, setCw] = useState<Classwork | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [grading, setGrading] = useState<Grading | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // Timer
  const [remaining, setRemaining] = useState<number | null>(null);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (!subject && subjects.length > 0) setSubject(subjects[0]);
  }, [subjects, subject]);

  useEffect(() => {
    if (cw && !grading && remaining == null) {
      setRemaining(cw.duration_min * 60);
    }
    if (remaining != null && !grading) {
      if (remaining <= 0) {
        onSubmit();
        return;
      }
      intervalRef.current = window.setTimeout(() => setRemaining((r) => (r == null ? null : r - 1)), 1000);
      return () => {
        if (intervalRef.current) window.clearTimeout(intervalRef.current);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cw, remaining, grading]);

  async function onStart() {
    if (!token || !subject) return;
    setStarting(true);
    setErr(null);
    setAnswers({});
    setGrading(null);
    setRemaining(null);
    try {
      const c = (await api.classworkStart(
        { subject, difficulty: difficulty as any, n_items: nItems, duration_min: duration },
        token,
      )) as Classwork;
      setCw(c);
    } catch (e: any) {
      const msg = e?.status === 402
        ? "Il Compito in Classe è una funzione Premium o Maturità."
        : (e?.message || "Errore avvio compito");
      setErr(msg);
    } finally {
      setStarting(false);
    }
  }

  async function onSubmit() {
    if (!token || !cw) return;
    if (intervalRef.current) window.clearTimeout(intervalRef.current);
    setSubmitting(true);
    setErr(null);
    try {
      const arr = cw.items.map((_, i) => ({ index: i, answer: answers[i] || "" }));
      const r = await api.classworkSubmit({ classwork_id: cw.id, answers: arr }, token);
      setGrading((r as any).evaluation);
    } catch (e: any) {
      setErr(e?.message || "Errore consegna");
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setCw(null);
    setAnswers({});
    setGrading(null);
    setRemaining(null);
    setErr(null);
  }

  const timeLabel = formatTime(remaining ?? (cw ? cw.duration_min * 60 : 0));
  const timeUrgent = remaining != null && remaining < 60;

  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 20 }}>
      <header style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={iconWrap(colors.orange)}><Timer size={22} color={colors.orange} /></div>
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 900, letterSpacing: -0.5 }}>Compito in classe</h1>
          <p style={{ margin: "4px 0 0 0", color: colors.textSub, fontSize: 13 }}>
            Esercizi cronometrati generati dall'AI. Consegna prima del tempo o allo scadere del cronometro.
          </p>
        </div>
        {cw && !grading && (
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "8px 14px", borderRadius: 999,
            background: timeUrgent ? `${colors.red}22` : `${colors.orange}18`,
            border: `1px solid ${timeUrgent ? colors.red : colors.orange}`,
          }}>
            <Clock size={14} color={timeUrgent ? colors.red : colors.orange} />
            <span style={{ fontWeight: 900, fontSize: 15, color: timeUrgent ? colors.red : colors.orange, fontVariantNumeric: "tabular-nums" }}>{timeLabel}</span>
          </div>
        )}
      </header>

      {!cw && (
        <section style={{ ...cardStyle(), opacity: starting ? 0.55 : 1, pointerEvents: starting ? "none" : "auto", transition: "opacity 150ms" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <FieldLabel label="Materia">
              <Select value={subject} onChange={setSubject} options={subjects.map((s) => ({ value: s, label: s }))} placeholder="— Seleziona —" />
            </FieldLabel>
            <FieldLabel label="Difficoltà">
              <Select value={difficulty} onChange={setDifficulty} options={DIFFICULTIES} />
            </FieldLabel>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <FieldLabel label={`Numero esercizi: ${nItems}`}>
              <input type="range" min={3} max={10} value={nItems} onChange={(e) => setNItems(Number(e.target.value))} style={{ width: "100%" }} />
            </FieldLabel>
            <FieldLabel label={`Durata: ${duration} minuti`}>
              <input type="range" min={5} max={90} step={5} value={duration} onChange={(e) => setDuration(Number(e.target.value))} style={{ width: "100%" }} />
            </FieldLabel>
          </div>

          {err && <ErrorBox msg={err} />}

          <button onClick={onStart} disabled={!subject || starting} style={primaryBtn(!subject || starting, colors.orange, colors.pink)}>
            {starting ? (<><Loader2 size={16} className="spin" /> Generazione compito…</>) : (<><Play size={16} /> Inizia compito</>)}
          </button>
        </section>
      )}

      {cw && !grading && (
        <>
          <div style={{ fontSize: 18, fontWeight: 900 }}>{cw.title}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {cw.items.map((it, i) => (
              <ItemCard key={i} idx={i} item={it} value={answers[i] || ""} onChange={(v) => setAnswers((a) => ({ ...a, [i]: v }))} />
            ))}
          </div>
          {err && <ErrorBox msg={err} />}
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={reset} style={secondaryBtn()}>Annulla</button>
            <button onClick={onSubmit} disabled={submitting} style={{ ...primaryBtn(submitting, colors.orange, colors.pink), flex: 1 }}>
              {submitting ? (<><Loader2 size={16} className="spin" /> Correzione in corso…</>) : (
                <>Consegna compito <ChevronRight size={16} /></>
              )}
            </button>
          </div>
        </>
      )}

      {grading && cw && (
        <section style={cardStyle({
          background: `linear-gradient(135deg, ${gradeColor(grading.grade)}18 0%, ${colors.purple}0a 100%)`,
          border: `1.5px solid ${gradeColor(grading.grade)}55`,
        })}>
          <div style={{ textAlign: "center", padding: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: 1.4, color: gradeColor(grading.grade), textTransform: "uppercase" }}>Voto finale</div>
            <div style={{ fontSize: 52, fontWeight: 900, marginTop: 6 }}>
              {grading.grade.toFixed(1)}<span style={{ fontSize: 22, color: colors.textMuted }}>/10</span>
            </div>
            {grading.summary && (
              <p style={{ maxWidth: 520, margin: "10px auto 0", fontSize: 13, color: colors.textSub, lineHeight: 1.6, fontStyle: "italic" }}>«Professore:» {grading.summary}</p>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {grading.per_item?.map((p) => (
              <div key={p.index} style={{
                padding: 12,
                borderRadius: radius.sm,
                background: colors.bg,
                border: `1px solid ${p.correct ? colors.green + "44" : colors.red + "44"}`,
                display: "flex", gap: 10, alignItems: "flex-start",
              }}>
                {p.correct ? <CheckCircle2 size={18} color={colors.green} /> : <XCircle size={18} color={colors.red} />}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: colors.textPrimary, marginBottom: 4 }}>
                    Esercizio {p.index + 1} · {Math.round(p.points * 100)}%
                  </div>
                  {p.comment && <div style={{ fontSize: 12, color: colors.textSub, lineHeight: 1.5 }}>{p.comment}</div>}
                </div>
              </div>
            ))}
          </div>

          <button onClick={reset} style={secondaryBtn()}>
            <RefreshCw size={14} /> Nuovo compito
          </button>
        </section>
      )}
    </div>
  );
}

function ItemCard({ idx, item, value, onChange }: { idx: number; item: ClassworkItem; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{
      padding: 16,
      borderRadius: radius.md,
      background: colors.bgGlass,
      border: `1px solid ${colors.border}`,
      display: "flex", flexDirection: "column", gap: 10,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 900, color: colors.orange, background: `${colors.orange}18`, border: `1px solid ${colors.orange}55`, padding: "3px 10px", borderRadius: 999, textTransform: "uppercase" }}>#{idx + 1}</span>
        <span style={{ fontSize: 10, fontWeight: 800, color: colors.textMuted, textTransform: "uppercase", letterSpacing: 0.8 }}>{item.kind === "math" ? "Matematica" : item.kind === "multiple" ? "Scelta multipla" : "Aperta"}</span>
      </div>
      <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.5 }}>{item.q}</div>
      {item.kind === "multiple" && item.options ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {item.options.map((o) => (
            <button
              key={o}
              onClick={() => onChange(o)}
              style={{
                padding: "10px 12px",
                borderRadius: radius.sm,
                background: value === o ? `${colors.orange}22` : colors.bg,
                border: `1px solid ${value === o ? colors.orange : colors.border}`,
                color: value === o ? colors.orange : colors.textPrimary,
                fontWeight: value === o ? 800 : 600,
                fontSize: 13,
                textAlign: "left",
                cursor: "pointer",
              }}
            >
              {o}
            </button>
          ))}
        </div>
      ) : (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Scrivi qui la tua risposta…"
          rows={item.kind === "math" ? 3 : 5}
          style={{
            padding: "10px 12px",
            borderRadius: radius.sm,
            background: colors.bg,
            border: `1px solid ${colors.border}`,
            color: colors.textPrimary,
            fontSize: 14,
            outline: "none",
            resize: "vertical",
            fontFamily: "inherit",
          }}
        />
      )}
    </div>
  );
}

function formatTime(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}
function gradeColor(g: number): string {
  if (g >= 8) return colors.green;
  if (g >= 6) return colors.cyan;
  if (g >= 5) return colors.orange;
  return colors.red;
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
function primaryBtn(disabled: boolean, cA = colors.purple, cB = colors.blue): React.CSSProperties {
  return {
    padding: "12px 18px", borderRadius: radius.md,
    background: disabled ? colors.bgGlass : `linear-gradient(135deg, ${cA} 0%, ${cB} 100%)`,
    border: "none", color: disabled ? colors.textMuted : "#fff",
    fontWeight: 800, fontSize: 14, cursor: disabled ? "not-allowed" : "pointer",
    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
  };
}
function secondaryBtn(): React.CSSProperties {
  return {
    padding: "12px 18px", borderRadius: radius.md,
    background: colors.bgGlass, border: `1px solid ${colors.border}`,
    color: colors.textSub, fontWeight: 700, fontSize: 13,
    cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
  };
}
function ErrorBox({ msg }: { msg: string }) {
  return (
    <div style={{ padding: 10, borderRadius: radius.sm, background: `${colors.red}15`, border: `1px solid ${colors.red}55`, color: colors.red, fontSize: 12, fontWeight: 700 }}>{msg}</div>
  );
}
