import { useEffect, useState } from "react";
import { Mic, Play, ChevronRight, GraduationCap, Sparkles, Star, RefreshCw, Loader2, MessageSquare, Volume2 } from "lucide-react";
import { useAuth } from "../store/auth";
import { api } from "../api/client";
import { colors, radius } from "../theme";
import { Select } from "../components/Select";
import { OraleVoiceMode } from "../components/OraleVoiceMode";

type OralAttempt = {
  id: string;
  subject: string;
  severity: string;
  mode: "standard" | "lampo";
  intro: string;
  questions: Array<{ q: string; focus: string; difficulty: "facile" | "medio" | "difficile" }>;
  evaluations: any[];
  avg_grade?: number | null;
};

type Evaluation = {
  grade: number;
  grade_label: string;
  strengths: string[];
  weaknesses: string[];
  improved_answer: string;
  professor_feedback: string;
};

const SEVERITIES = [
  { value: "facile", label: "Facile — incoraggiante" },
  { value: "medio", label: "Medio — standard" },
  { value: "severo", label: "Severo — esigente" },
  { value: "spietato", label: "Spietato — massima esigenza" },
];

export function OralePage() {
  const token = useAuth((s) => s.token);
  const user = useAuth((s) => s.user);
  const subjects: string[] = (user as any)?.subjects || [];
  const [inputMode, setInputMode] = useState<"text" | "voice">("text");

  const [subject, setSubject] = useState<string>(subjects[0] || "");
  const [severity, setSeverity] = useState<string>("medio");
  const [mode, setMode] = useState<"standard" | "lampo">("standard");
  const [topic, setTopic] = useState("");
  const [starting, setStarting] = useState(false);
  const [attempt, setAttempt] = useState<OralAttempt | null>(null);
  const [currentQ, setCurrentQ] = useState(0);
  const [answer, setAnswer] = useState("");
  const [evaluating, setEvaluating] = useState(false);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    if (!subject && subjects.length > 0) setSubject(subjects[0]);
  }, [subjects, subject]);

  useEffect(() => {
    if (!token) return;
    api.oralStats(token).then(setStats).catch(() => {});
  }, [token]);

  async function onStart() {
    if (!token || !subject) return;
    setStarting(true);
    setErr(null);
    setEvaluations([]);
    setCurrentQ(0);
    setAnswer("");
    try {
      const a = (await api.oralStart(
        { subject, severity: severity as any, mode, topic: topic.trim() || undefined },
        token,
      )) as OralAttempt;
      setAttempt(a);
    } catch (e: any) {
      setErr(e?.message || "Impossibile avviare l'interrogazione");
    } finally {
      setStarting(false);
    }
  }

  async function onSubmitAnswer() {
    if (!token || !attempt) return;
    const q = attempt.questions[currentQ];
    if (!q || !answer.trim()) return;
    setEvaluating(true);
    setErr(null);
    try {
      const ev = (await api.oralEvaluate(
        {
          attempt_id: attempt.id,
          subject: attempt.subject,
          severity: attempt.severity,
          question: q.q,
          answer: answer.trim(),
          difficulty: q.difficulty,
        },
        token,
      )) as Evaluation;
      setEvaluations((es) => [...es, ev]);
      setAnswer("");
      setCurrentQ((c) => c + 1);
    } catch (e: any) {
      setErr(e?.message || "Errore valutazione");
    } finally {
      setEvaluating(false);
    }
  }

  function reset() {
    setAttempt(null);
    setEvaluations([]);
    setCurrentQ(0);
    setAnswer("");
    setErr(null);
  }

  const isFinished = attempt && currentQ >= attempt.questions.length;
  const overallGrade =
    evaluations.length > 0
      ? evaluations.reduce((s, e) => s + (e.grade || 0), 0) / evaluations.length
      : null;

  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 20 }}>
      <header style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={iconWrap(colors.green)}>
          <Mic size={22} color={colors.green} />
        </div>
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 900, letterSpacing: -0.5 }}>Interrogazione</h1>
          <p style={{ margin: "4px 0 0 0", color: colors.textSub, fontSize: 13 }}>
            Allenati all'orale col professore AI. La versione voce arriverà sul desktop in una prossima release.
          </p>
        </div>
        {stats?.overall != null && (
          <StatPill label="Media" value={stats.overall.toFixed(1)} color={colors.green} />
        )}
      </header>

      {/* Mode toggle: Testo vs Voce */}
      <div style={{ display: "flex", gap: 6, padding: 4, borderRadius: radius.md, background: colors.bgGlass, border: `1px solid ${colors.border}` }}>
        <button
          onClick={() => setInputMode("text")}
          style={{
            flex: 1, padding: "10px 14px", borderRadius: radius.sm,
            background: inputMode === "text" ? `${colors.cyan}22` : "transparent",
            border: `1px solid ${inputMode === "text" ? colors.cyan : "transparent"}`,
            color: inputMode === "text" ? colors.cyan : colors.textSub,
            fontWeight: 800, fontSize: 13, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          }}
        >
          <MessageSquare size={14} /> Testo
        </button>
        <button
          onClick={() => setInputMode("voice")}
          style={{
            flex: 1, padding: "10px 14px", borderRadius: radius.sm,
            background: inputMode === "voice" ? `${colors.green}22` : "transparent",
            border: `1px solid ${inputMode === "voice" ? colors.green : "transparent"}`,
            color: inputMode === "voice" ? colors.green : colors.textSub,
            fontWeight: 800, fontSize: 13, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          }}
        >
          <Volume2 size={14} /> Voce
          <span style={{ fontSize: 9, fontWeight: 900, letterSpacing: 0.6, color: colors.pink, background: `${colors.pink}22`, padding: "2px 6px", borderRadius: 999, textTransform: "uppercase" }}>Premium</span>
        </button>
      </div>

      {inputMode === "voice" && <OraleVoiceMode />}
      {inputMode === "text" && !attempt && (
        <section style={{ ...cardStyle(), opacity: starting ? 0.55 : 1, pointerEvents: starting ? "none" : "auto", transition: "opacity 150ms" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <FieldLabel label="Materia">
              <Select
                value={subject}
                onChange={setSubject}
                options={subjects.map((s) => ({ value: s, label: s }))}
                placeholder="— Seleziona —"
              />
            </FieldLabel>
            <FieldLabel label="Severità professore">
              <Select value={severity} onChange={setSeverity} options={SEVERITIES} />
            </FieldLabel>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <FieldLabel label="Modalità">
              <div style={{ display: "flex", gap: 8 }}>
                {([["standard", "Standard · 5 domande"], ["lampo", "Lampo · 3 domande"]] as const).map(([v, l]) => (
                  <button
                    key={v}
                    onClick={() => setMode(v as any)}
                    style={{
                      flex: 1,
                      padding: "10px 12px",
                      borderRadius: radius.md,
                      background: mode === v ? `${colors.green}22` : colors.bgGlass,
                      border: `1px solid ${mode === v ? colors.green : colors.border}`,
                      color: mode === v ? colors.green : colors.textSub,
                      fontWeight: 800,
                      fontSize: 12,
                      cursor: "pointer",
                    }}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </FieldLabel>
            <FieldLabel label="Argomento specifico (opzionale)">
              <input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="es. Guerra Fredda"
                style={txtInput()}
              />
            </FieldLabel>
          </div>

          {err && <ErrorBox msg={err} />}

          <button
            onClick={onStart}
            disabled={!subject || starting}
            style={primaryBtn(!subject || starting)}
          >
            {starting ? (<><Loader2 size={16} className="spin" /> Il prof sta preparando le domande…</>) : (
              <>Inizia interrogazione <ChevronRight size={16} /></>
            )}
          </button>
        </section>
      )}

      {inputMode === "text" && attempt && !isFinished && (
        <section style={{ ...cardStyle(), opacity: evaluating ? 0.55 : 1, pointerEvents: evaluating ? "none" : "auto", transition: "opacity 150ms" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 11, letterSpacing: 1.2, fontWeight: 900, color: colors.textMuted, textTransform: "uppercase" }}>
              Domanda {currentQ + 1} / {attempt.questions.length}
            </div>
            <DifficultyBadge diff={attempt.questions[currentQ]?.difficulty || "medio"} />
          </div>
          {currentQ === 0 && attempt.intro && (
            <div style={{ fontSize: 13, fontStyle: "italic", color: colors.textSub, padding: 12, borderRadius: radius.sm, background: `${colors.green}0f`, border: `1px solid ${colors.green}33` }}>
              «Professore:» {attempt.intro}
            </div>
          )}
          <div style={{ fontSize: 18, fontWeight: 800, lineHeight: 1.5 }}>{attempt.questions[currentQ]?.q}</div>
          {attempt.questions[currentQ]?.focus && (
            <div style={{ fontSize: 12, color: colors.textMuted, fontStyle: "italic" }}>Focus richiesto: {attempt.questions[currentQ].focus}</div>
          )}

          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Scrivi qui la tua risposta come se stessi parlando al prof…"
            rows={6}
            style={txtArea()}
          />

          {err && <ErrorBox msg={err} />}

          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={reset} style={secondaryBtn()}>Annulla</button>
            <button
              onClick={onSubmitAnswer}
              disabled={!answer.trim() || evaluating}
              style={{ ...primaryBtn(!answer.trim() || evaluating), flex: 1 }}
            >
              {evaluating ? (<><Loader2 size={16} className="spin" /> Il prof sta valutando…</>) : (
                <>Invia risposta <ChevronRight size={16} /></>
              )}
            </button>
          </div>

          {evaluations.length > 0 && (
            <PastEval evals={evaluations.slice(-1)} />
          )}
        </section>
      )}

      {inputMode === "text" && attempt && isFinished && (
        <section style={cardStyle({
          background: `linear-gradient(135deg, ${colors.green}18 0%, ${colors.cyan}10 100%)`,
          border: `1.5px solid ${colors.green}55`,
        })}>
          <div style={{ textAlign: "center", padding: 16 }}>
            <GraduationCap size={40} color={colors.green} style={{ marginBottom: 8 }} />
            <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: 1.4, color: colors.green, textTransform: "uppercase" }}>
              Interrogazione conclusa
            </div>
            <div style={{ fontSize: 48, fontWeight: 900, marginTop: 8 }}>
              {overallGrade != null ? overallGrade.toFixed(1) : "—"}
              <span style={{ fontSize: 22, color: colors.textMuted }}>/10</span>
            </div>
          </div>

          <PastEval evals={evaluations} full />

          <button onClick={reset} style={secondaryBtn()}>
            <RefreshCw size={14} /> Nuova interrogazione
          </button>
        </section>
      )}

      {inputMode === "text" && !attempt && stats?.by_subject?.length > 0 && (
        <section>
          <h2 style={{ margin: "0 0 10px 0", fontSize: 16, fontWeight: 800 }}>Le tue medie per materia</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10 }}>
            {stats.by_subject.map((s: any) => (
              <div key={s.subject} style={{
                padding: 12,
                borderRadius: radius.md,
                background: colors.bgGlass,
                border: `1px solid ${colors.border}`,
              }}>
                <div style={{ fontSize: 12, color: colors.textMuted, fontWeight: 700 }}>{s.subject}</div>
                <div style={{ fontSize: 22, fontWeight: 900, marginTop: 2 }}>
                  {s.avg.toFixed(1)}<span style={{ fontSize: 12, color: colors.textMuted }}>/10</span>
                </div>
                <div style={{ fontSize: 11, color: colors.textSub }}>{s.count} interrogazioni</div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function PastEval({ evals, full = false }: { evals: Evaluation[]; full?: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
      {evals.map((e, i) => (
        <div key={i} style={{
          padding: 14,
          borderRadius: radius.md,
          background: colors.bgGlass,
          border: `1px solid ${colors.border}`,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <div style={{
              padding: "4px 10px",
              borderRadius: 999,
              background: gradeColor(e.grade) + "1a",
              border: `1px solid ${gradeColor(e.grade)}77`,
              color: gradeColor(e.grade),
              fontSize: 13,
              fontWeight: 900,
            }}>{e.grade.toFixed(1)}/10</div>
            <div style={{ fontSize: 12, color: colors.textMuted, fontWeight: 700 }}>{e.grade_label}</div>
          </div>
          {e.professor_feedback && (
            <div style={{ fontSize: 13, color: colors.textSub, lineHeight: 1.5, marginBottom: 8, fontStyle: "italic" }}>
              «Professore:» {e.professor_feedback}
            </div>
          )}
          {full && (
            <>
              {e.strengths?.length > 0 && (
                <ChipList label="Punti forti" items={e.strengths} color={colors.green} />
              )}
              {e.weaknesses?.length > 0 && (
                <ChipList label="Da migliorare" items={e.weaknesses} color={colors.orange} />
              )}
              {e.improved_answer && (
                <details style={{ marginTop: 8 }}>
                  <summary style={{ cursor: "pointer", fontSize: 12, fontWeight: 700, color: colors.cyan }}>
                    <Sparkles size={12} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} /> Vedi risposta ideale
                  </summary>
                  <div style={{ marginTop: 8, padding: 10, borderRadius: radius.sm, background: colors.bg, fontSize: 13, lineHeight: 1.6, color: colors.textSub }}>
                    {e.improved_answer}
                  </div>
                </details>
              )}
            </>
          )}
        </div>
      ))}
    </div>
  );
}

function ChipList({ label, items, color }: { label: string; items: string[]; color: string }) {
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: 0.8, color: colors.textMuted, textTransform: "uppercase", marginBottom: 4 }}>{label}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
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

function gradeColor(g: number): string {
  if (g >= 8) return colors.green;
  if (g >= 6) return colors.cyan;
  if (g >= 5) return colors.orange;
  return colors.red;
}

function DifficultyBadge({ diff }: { diff: string }) {
  const c = diff === "difficile" ? colors.red : diff === "facile" ? colors.green : colors.cyan;
  return (
    <span style={{
      fontSize: 10,
      fontWeight: 900,
      letterSpacing: 0.6,
      color: c,
      background: `${c}18`,
      border: `1px solid ${c}55`,
      padding: "3px 10px",
      borderRadius: 999,
      textTransform: "uppercase",
    }}>{diff}</span>
  );
}

function StatPill({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 6,
      padding: "6px 12px",
      borderRadius: 999,
      background: `${color}12`,
      border: `1px solid ${color}55`,
    }}>
      <Star size={12} color={color} />
      <span style={{ fontSize: 11, color: colors.textMuted, fontWeight: 700 }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 900, color }}>{value}</span>
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
  return {
    width: 44, height: 44, borderRadius: 14,
    background: `${color}1a`, border: `1px solid ${color}55`,
    display: "flex", alignItems: "center", justifyContent: "center",
  };
}
function cardStyle(extra: React.CSSProperties = {}): React.CSSProperties {
  return {
    padding: 18,
    borderRadius: radius.lg,
    background: colors.bgGlass,
    border: `1px solid ${colors.border}`,
    display: "flex",
    flexDirection: "column",
    gap: 14,
    ...extra,
  };
}
function txtInput(): React.CSSProperties {
  return {
    height: 42, padding: "0 14px",
    borderRadius: radius.md, background: colors.bgGlass,
    border: `1px solid ${colors.border}`,
    color: colors.textPrimary, fontSize: 14, outline: "none",
    fontFamily: "inherit",
  };
}
function txtArea(): React.CSSProperties {
  return {
    padding: "12px 14px",
    borderRadius: radius.md, background: colors.bgGlass,
    border: `1px solid ${colors.border}`,
    color: colors.textPrimary, fontSize: 14, outline: "none",
    resize: "vertical",
    fontFamily: "inherit",
  };
}
function primaryBtn(disabled: boolean): React.CSSProperties {
  return {
    padding: "12px 18px",
    borderRadius: radius.md,
    background: disabled ? colors.bgGlass : `linear-gradient(135deg, ${colors.green} 0%, ${colors.cyan} 100%)`,
    border: "none",
    color: disabled ? colors.textMuted : "#fff",
    fontWeight: 800,
    fontSize: 14,
    cursor: disabled ? "not-allowed" : "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  };
}
function secondaryBtn(): React.CSSProperties {
  return {
    padding: "12px 18px",
    borderRadius: radius.md,
    background: colors.bgGlass,
    border: `1px solid ${colors.border}`,
    color: colors.textSub,
    fontWeight: 700,
    fontSize: 13,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  };
}
function ErrorBox({ msg }: { msg: string }) {
  return (
    <div style={{
      padding: 10,
      borderRadius: radius.sm,
      background: `${colors.red}15`,
      border: `1px solid ${colors.red}55`,
      color: colors.red,
      fontSize: 12,
      fontWeight: 700,
    }}>{msg}</div>
  );
}

// Silenzia lint per icona non usata
void Play;
