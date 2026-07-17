// Voto+ website · Public testimonials submission form (React island).
//
// Girato come `client:only="react"` sulla pagina /testimonianze. Espone un
// form di invio recensione con:
//   - Nome (2-60 char)
//   - Tipo scuola (radio select)
//   - Nome scuola / classe (opzionali)
//   - Rating a stelle (1-5, obbligatorio)
//   - Testo (20-1000 char)
//   - Email (opzionale, mai mostrata pubblicamente)
//   - Honeypot `website` (nascosto agli umani)
//
// Post-submit: mostra un thank-you inline. La recensione entra in stato
// `pending` e diventa pubblica solo dopo approvazione admin.
import React, { useCallback, useMemo, useState } from "react";
import { getApiBase } from "@/lib/blogApi";

interface Props {
  onSubmitted?: () => void;
}

const SCHOOL_OPTIONS: { value: string; label: string; emoji: string }[] = [
  { value: "liceo", label: "Liceo", emoji: "🎓" },
  { value: "istituto_tecnico", label: "Istituto Tecnico", emoji: "🔧" },
  { value: "istituto_professionale", label: "Istituto Professionale", emoji: "🛠️" },
  { value: "universita", label: "Università", emoji: "📚" },
  { value: "genitore", label: "Sono un genitore", emoji: "👪" },
  { value: "altro", label: "Altro", emoji: "✨" },
];

interface FormState {
  name: string;
  school_type: string;
  school_name: string;
  grade: string;
  rating: number;
  text: string;
  email: string;
  website: string; // honeypot
}

const initialState: FormState = {
  name: "",
  school_type: "",
  school_name: "",
  grade: "",
  rating: 0,
  text: "",
  email: "",
  website: "",
};

export default function TestimonialForm({ onSubmitted }: Props) {
  const [form, setForm] = useState<FormState>(initialState);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [hoverRating, setHoverRating] = useState(0);

  const setField = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const textCount = form.text.length;
  const textValid = textCount >= 20 && textCount <= 1000;

  const canSubmit = useMemo(() => {
    return (
      form.name.trim().length >= 2 &&
      form.name.trim().length <= 60 &&
      SCHOOL_OPTIONS.some((s) => s.value === form.school_type) &&
      form.rating >= 1 &&
      form.rating <= 5 &&
      textValid &&
      !submitting
    );
  }, [form, textValid, submitting]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!canSubmit) return;
      setSubmitting(true);
      setError(null);
      try {
        const base = getApiBase();
        const res = await fetch(`${base}/testimonials`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name.trim(),
            school_type: form.school_type,
            school_name: form.school_name.trim() || undefined,
            grade: form.grade.trim() || undefined,
            rating: form.rating,
            text: form.text.trim(),
            email: form.email.trim() || undefined,
            website: form.website, // honeypot: sempre vuoto per umani
          }),
        });
        if (!res.ok) {
          if (res.status === 429) {
            throw new Error("Hai già inviato troppe recensioni oggi. Riprova domani.");
          }
          let msg = "Invio non riuscito. Riprova.";
          try {
            const j = await res.json();
            if (j?.detail) msg = typeof j.detail === "string" ? j.detail : msg;
          } catch { /* ignore JSON parse errors */ }
          throw new Error(msg);
        }
        const data = await res.json();
        setSuccess(
          data?.message ||
            "Grazie! La tua recensione è in attesa di approvazione. Sarà pubblicata a breve."
        );
        setForm(initialState);
        onSubmitted?.();
      } catch (err: any) {
        setError(err?.message || "Errore di rete");
      } finally {
        setSubmitting(false);
      }
    },
    [form, canSubmit, onSubmitted]
  );

  if (success) {
    return (
      <div style={styles.successCard}>
        <div style={styles.successEmoji}>💜</div>
        <h3 style={styles.successTitle}>Grazie!</h3>
        <p style={styles.successText}>{success}</p>
        <button
          type="button"
          style={styles.btnGhost}
          onClick={() => setSuccess(null)}
        >
          Invia un&apos;altra recensione
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={styles.form} noValidate>
      {/* Rating */}
      <div style={styles.field}>
        <label style={styles.label}>La tua valutazione *</label>
        <div style={styles.stars} role="radiogroup" aria-label="Valutazione">
          {[1, 2, 3, 4, 5].map((n) => {
            const active = (hoverRating || form.rating) >= n;
            return (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={form.rating === n}
                aria-label={`${n} stell${n === 1 ? "a" : "e"}`}
                style={{ ...styles.starBtn, color: active ? "#f59e0b" : "#3f3f46" }}
                onMouseEnter={() => setHoverRating(n)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => setField("rating", n)}
              >
                ★
              </button>
            );
          })}
          {form.rating > 0 && (
            <span style={styles.ratingLabel}>{ratingText(form.rating)}</span>
          )}
        </div>
      </div>

      {/* Nome */}
      <div style={styles.field}>
        <label style={styles.label} htmlFor="tst-name">Nome *</label>
        <input
          id="tst-name"
          style={styles.input}
          type="text"
          value={form.name}
          maxLength={60}
          placeholder="Es. Giulia"
          onChange={(e) => setField("name", e.target.value)}
          required
        />
      </div>

      {/* Tipo scuola */}
      <div style={styles.field}>
        <label style={styles.label}>Chi sei? *</label>
        <div style={styles.schoolGrid}>
          {SCHOOL_OPTIONS.map((opt) => {
            const selected = form.school_type === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                style={{
                  ...styles.schoolChip,
                  ...(selected ? styles.schoolChipActive : {}),
                }}
                onClick={() => setField("school_type", opt.value)}
                aria-pressed={selected}
              >
                <span style={{ fontSize: 18 }}>{opt.emoji}</span>
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Scuola + classe */}
      <div style={styles.row2}>
        <div style={styles.field}>
          <label style={styles.label} htmlFor="tst-school">Scuola / Università (opzionale)</label>
          <input
            id="tst-school"
            style={styles.input}
            type="text"
            value={form.school_name}
            maxLength={100}
            placeholder="Es. Liceo Scientifico Fermi"
            onChange={(e) => setField("school_name", e.target.value)}
          />
        </div>
        <div style={styles.field}>
          <label style={styles.label} htmlFor="tst-grade">Classe / Corso (opzionale)</label>
          <input
            id="tst-grade"
            style={styles.input}
            type="text"
            value={form.grade}
            maxLength={60}
            placeholder="Es. 4°B"
            onChange={(e) => setField("grade", e.target.value)}
          />
        </div>
      </div>

      {/* Testo */}
      <div style={styles.field}>
        <label style={styles.label} htmlFor="tst-text">
          La tua esperienza * <span style={styles.counter}>{textCount} / 1000</span>
        </label>
        <textarea
          id="tst-text"
          style={{ ...styles.textarea, borderColor: textCount > 0 && !textValid ? "#f87171" : "rgba(255,255,255,0.12)" }}
          value={form.text}
          maxLength={1000}
          rows={5}
          placeholder="Racconta come Voto+ ti ha aiutato nello studio (min. 20 caratteri)…"
          onChange={(e) => setField("text", e.target.value)}
          required
        />
        {textCount > 0 && textCount < 20 && (
          <div style={styles.hint}>Ancora {20 - textCount} caratteri per continuare.</div>
        )}
      </div>

      {/* Email opzionale */}
      <div style={styles.field}>
        <label style={styles.label} htmlFor="tst-email">
          Email (opzionale, non pubblicata)
        </label>
        <input
          id="tst-email"
          style={styles.input}
          type="email"
          value={form.email}
          placeholder="Solo se vuoi essere ricontattato"
          onChange={(e) => setField("email", e.target.value)}
        />
      </div>

      {/* Honeypot */}
      <div style={styles.honeypot} aria-hidden="true">
        <label>
          Sito web (non compilare)
          <input
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={form.website}
            onChange={(e) => setField("website", e.target.value)}
          />
        </label>
      </div>

      {error && <div style={styles.error}>{error}</div>}

      <button type="submit" style={styles.submitBtn} disabled={!canSubmit}>
        {submitting ? "Invio in corso…" : "Invia recensione"}
      </button>
      <p style={styles.privacy}>
        Le recensioni sono moderate a mano prima della pubblicazione. La tua email, se la fornisci,
        NON verrà mostrata pubblicamente.
      </p>
    </form>
  );
}

function ratingText(r: number): string {
  return ["", "Meh", "Ok", "Buono", "Ottimo", "Adoro!"][r] || "";
}

// ============================================================================
// Styles
// ============================================================================
const styles: Record<string, React.CSSProperties> = {
  form: {
    display: "flex",
    flexDirection: "column",
    gap: 20,
    padding: 28,
    background: "#12121a",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 20,
    fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif",
    color: "#fff",
  },
  field: { display: "flex", flexDirection: "column", gap: 8 },
  row2: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: 0.6,
    color: "#a1a1aa",
    textTransform: "uppercase",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  counter: {
    fontSize: 11,
    color: "#71717a",
    fontWeight: 700,
    letterSpacing: 0,
    textTransform: "none",
  },
  input: {
    padding: "12px 14px",
    background: "#0a0a0f",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 10,
    color: "#fff",
    fontSize: 15,
    outline: "none",
    fontFamily: "inherit",
  },
  textarea: {
    padding: "12px 14px",
    background: "#0a0a0f",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 10,
    color: "#fff",
    fontSize: 15,
    outline: "none",
    resize: "vertical",
    fontFamily: "inherit",
    minHeight: 110,
  },
  hint: { fontSize: 12, color: "#f87171", marginTop: 2 },
  stars: { display: "flex", alignItems: "center", gap: 4 },
  starBtn: {
    background: "transparent",
    border: "none",
    fontSize: 32,
    cursor: "pointer",
    padding: 4,
    lineHeight: 1,
    transition: "color 0.15s ease, transform 0.15s ease",
  },
  ratingLabel: {
    marginLeft: 12,
    fontSize: 14,
    fontWeight: 700,
    color: "#f59e0b",
  },
  schoolGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
    gap: 8,
  },
  schoolChip: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "10px 14px",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 12,
    color: "#a1a1aa",
    fontSize: 13.5,
    fontWeight: 700,
    cursor: "pointer",
    textAlign: "left",
    fontFamily: "inherit",
  },
  schoolChipActive: {
    background: "rgba(168,85,247,0.12)",
    borderColor: "rgba(168,85,247,0.5)",
    color: "#fff",
  },
  honeypot: {
    position: "absolute",
    left: "-9999px",
    opacity: 0,
    pointerEvents: "none",
    height: 0,
    overflow: "hidden",
  },
  submitBtn: {
    padding: "14px 26px",
    background: "linear-gradient(135deg,#a855f7,#ec4899)",
    color: "#fff",
    border: "none",
    borderRadius: 999,
    fontWeight: 800,
    fontSize: 15,
    cursor: "pointer",
    boxShadow: "0 12px 36px rgba(168,85,247,0.35)",
  },
  error: {
    padding: "10px 14px",
    background: "rgba(248,113,113,0.15)",
    border: "1px solid rgba(248,113,113,0.4)",
    borderRadius: 10,
    color: "#fca5a5",
    fontSize: 14,
  },
  privacy: {
    fontSize: 12,
    color: "#71717a",
    textAlign: "center",
    marginTop: 4,
    lineHeight: 1.5,
  },
  btnGhost: {
    padding: "10px 18px",
    background: "transparent",
    color: "#fff",
    border: "1px solid rgba(255,255,255,0.14)",
    borderRadius: 999,
    fontWeight: 700,
    fontSize: 14,
    cursor: "pointer",
  },
  successCard: {
    padding: 32,
    background: "linear-gradient(135deg, rgba(168,85,247,0.14), rgba(236,72,153,0.10))",
    border: "1px solid rgba(168,85,247,0.35)",
    borderRadius: 20,
    textAlign: "center",
    color: "#fff",
    fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif",
  },
  successEmoji: { fontSize: 48, marginBottom: 12 },
  successTitle: { fontSize: 24, fontWeight: 900, marginBottom: 8 },
  successText: { fontSize: 15, color: "#d4d4d8", marginBottom: 20, lineHeight: 1.5 },
};
