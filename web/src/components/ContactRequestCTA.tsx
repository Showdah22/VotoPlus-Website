// Voto+ website · Reusable Contact Request CTA + modal (React island).
//
// Componente usato in due punti:
//   - /roadmap  → type="idea"   (CTA "Proponi un'idea")
//   - /faq      → type="support" (CTA "Contatta il supporto")
//
// Espone un button che apre un modal con form (nome, email, oggetto, messaggio +
// honeypot). Al submit chiama POST /api/contact-requests e mostra un thank-you
// inline. Il modal è controllato in-component, quindi Astro può renderizzare
// più istanze indipendenti senza state condiviso.
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { getApiBase } from "@/lib/blogApi";

type ContactType = "idea" | "support";

interface Props {
  type: ContactType;
  buttonLabel?: string;
  buttonStyle?: "primary" | "ghost";
  pageSource?: string;
}

interface FormState {
  name: string;
  email: string;
  subject: string;
  message: string;
  website: string; // honeypot
}

const initial: FormState = { name: "", email: "", subject: "", message: "", website: "" };

const CONFIG: Record<ContactType, { title: string; emoji: string; lead: string; subjectPlaceholder: string; messagePlaceholder: string; cta: string }> = {
  idea: {
    title: "Proponi un'idea",
    emoji: "💡",
    lead: "Che funzione vorresti in Voto+? Raccontaci brevemente cosa ti manca e come useresti la feature — leggiamo ogni proposta.",
    subjectPlaceholder: "Es. Vorrei condividere i riassunti con i miei compagni",
    messagePlaceholder: "Spiega come useresti la funzione, quando ti servirebbe e cosa ti aspetteresti…",
    cta: "Invia idea",
  },
  support: {
    title: "Contatta il supporto",
    emoji: "🛟",
    lead: "Il team ti risponde entro 1 giorno lavorativo. Se hai una richiesta legata al tuo account, includi l'email con cui ti sei registrato.",
    subjectPlaceholder: "Es. Non riesco a caricare un PDF",
    messagePlaceholder: "Descrivi il problema o la domanda: cosa stavi facendo, cosa ti aspettavi, cosa è successo…",
    cta: "Invia richiesta",
  },
};

export default function ContactRequestCTA({
  type,
  buttonLabel,
  buttonStyle = "primary",
  pageSource,
}: Props) {
  const [open, setOpen] = useState(false);
  const cfg = CONFIG[type];

  useEffect(() => {
    // Blocca lo scroll body quando il modal è aperto.
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        style={buttonStyle === "primary" ? styles.btnPrimary : styles.btnGhost}
        onClick={() => setOpen(true)}
      >
        {cfg.emoji} {buttonLabel || cfg.cta}
      </button>

      {open && (
        <Modal onClose={() => setOpen(false)}>
          <ContactRequestForm
            type={type}
            pageSource={pageSource}
            onClose={() => setOpen(false)}
          />
        </Modal>
      )}
    </>
  );
}

// ============================================================================
// Modal shell (portal-less: usa fixed positioning con backdrop)
// ============================================================================
function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div style={styles.backdrop} onClick={onClose} role="dialog" aria-modal="true">
      <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={onClose}
          aria-label="Chiudi"
          style={styles.closeBtn}
        >
          ✕
        </button>
        {children}
      </div>
    </div>
  );
}

// ============================================================================
// Form vero e proprio
// ============================================================================
function ContactRequestForm({
  type,
  pageSource,
  onClose,
}: {
  type: ContactType;
  pageSource?: string;
  onClose: () => void;
}) {
  const cfg = CONFIG[type];
  const [form, setForm] = useState<FormState>(initial);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const set = useCallback(<K extends keyof FormState>(k: K, v: FormState[K]) => {
    setForm((prev) => ({ ...prev, [k]: v }));
  }, []);

  const canSubmit = useMemo(() => {
    return (
      form.name.trim().length >= 2 &&
      form.email.trim().length >= 5 &&
      form.subject.trim().length >= 3 &&
      form.message.trim().length >= 10 &&
      !submitting
    );
  }, [form, submitting]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!canSubmit) return;
      setSubmitting(true);
      setError(null);
      try {
        const base = getApiBase();
        const res = await fetch(`${base}/contact-requests`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type,
            name: form.name.trim(),
            email: form.email.trim(),
            subject: form.subject.trim(),
            message: form.message.trim(),
            page_source: pageSource,
            website: form.website,
          }),
        });
        if (!res.ok) {
          if (res.status === 429) {
            throw new Error("Troppe richieste da questo dispositivo. Riprova più tardi.");
          }
          let msg = "Invio non riuscito. Riprova.";
          try {
            const j = await res.json();
            if (j?.detail) msg = typeof j.detail === "string" ? j.detail : msg;
          } catch { /* ignore JSON parse errors */ }
          throw new Error(msg);
        }
        const data = await res.json();
        setSuccess(data?.message || "Grazie! Ti risponderemo a breve.");
        setForm(initial);
      } catch (err: any) {
        setError(err?.message || "Errore di rete");
      } finally {
        setSubmitting(false);
      }
    },
    [form, type, pageSource, canSubmit]
  );

  if (success) {
    return (
      <div style={styles.success}>
        <div style={{ fontSize: 44, marginBottom: 8 }}>{type === "idea" ? "💜" : "✅"}</div>
        <h3 style={styles.successTitle}>Ricevuto!</h3>
        <p style={styles.successText}>{success}</p>
        <button type="button" style={styles.btnPrimary} onClick={onClose}>
          Chiudi
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={styles.form} noValidate>
      <div style={styles.head}>
        <div style={styles.headEmoji}>{cfg.emoji}</div>
        <div>
          <h3 style={styles.headTitle}>{cfg.title}</h3>
          <p style={styles.headLead}>{cfg.lead}</p>
        </div>
      </div>

      <div style={styles.row2}>
        <div style={styles.field}>
          <label style={styles.label} htmlFor="cr-name">Nome *</label>
          <input
            id="cr-name"
            style={styles.input}
            type="text"
            value={form.name}
            maxLength={80}
            placeholder="Es. Giulia"
            onChange={(e) => set("name", e.target.value)}
            required
          />
        </div>
        <div style={styles.field}>
          <label style={styles.label} htmlFor="cr-email">Email *</label>
          <input
            id="cr-email"
            style={styles.input}
            type="email"
            value={form.email}
            maxLength={200}
            placeholder="tua@email.it"
            onChange={(e) => set("email", e.target.value)}
            required
          />
        </div>
      </div>

      <div style={styles.field}>
        <label style={styles.label} htmlFor="cr-subject">Oggetto *</label>
        <input
          id="cr-subject"
          style={styles.input}
          type="text"
          value={form.subject}
          maxLength={140}
          placeholder={cfg.subjectPlaceholder}
          onChange={(e) => set("subject", e.target.value)}
          required
        />
      </div>

      <div style={styles.field}>
        <label style={styles.label} htmlFor="cr-message">
          Messaggio * <span style={styles.counter}>{form.message.length} / 2000</span>
        </label>
        <textarea
          id="cr-message"
          style={styles.textarea}
          value={form.message}
          maxLength={2000}
          rows={6}
          placeholder={cfg.messagePlaceholder}
          onChange={(e) => set("message", e.target.value)}
          required
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
            onChange={(e) => set("website", e.target.value)}
          />
        </label>
      </div>

      {error && <div style={styles.error}>{error}</div>}

      <div style={styles.footRow}>
        <button type="button" style={styles.btnGhost} onClick={onClose}>
          Annulla
        </button>
        <button type="submit" style={styles.btnPrimary} disabled={!canSubmit}>
          {submitting ? "Invio…" : cfg.cta}
        </button>
      </div>
      <p style={styles.privacy}>
        Usiamo la tua email solo per risponderti. Non la condivideremo con nessuno.
      </p>
    </form>
  );
}

// ============================================================================
// Styles
// ============================================================================
const styles: Record<string, React.CSSProperties> = {
  btnPrimary: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "14px 26px",
    background: "linear-gradient(135deg,#a855f7,#ec4899)",
    color: "#fff",
    border: "none",
    borderRadius: 999,
    fontWeight: 800,
    fontSize: 15,
    cursor: "pointer",
    boxShadow: "0 12px 36px rgba(168,85,247,0.35)",
    fontFamily: "inherit",
    letterSpacing: 0.2,
  },
  btnGhost: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "14px 24px",
    background: "rgba(255,255,255,0.04)",
    color: "#fff",
    border: "1px solid rgba(255,255,255,0.14)",
    borderRadius: 999,
    fontWeight: 700,
    fontSize: 15,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  backdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.75)",
    backdropFilter: "blur(4px)",
    WebkitBackdropFilter: "blur(4px)",
    zIndex: 1000,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    overflowY: "auto",
    fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif",
  },
  modalCard: {
    position: "relative",
    width: "100%",
    maxWidth: 560,
    maxHeight: "92vh",
    overflowY: "auto",
    background: "#12121a",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 22,
    color: "#fff",
    boxShadow: "0 30px 80px rgba(0,0,0,0.6)",
  },
  closeBtn: {
    position: "absolute",
    top: 14,
    right: 14,
    width: 34,
    height: 34,
    borderRadius: 999,
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.1)",
    color: "#e4e4e7",
    cursor: "pointer",
    fontSize: 16,
    fontWeight: 700,
    zIndex: 2,
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: 18,
    padding: "32px 28px 24px",
  },
  head: { display: "flex", gap: 14, alignItems: "flex-start", marginBottom: 4 },
  headEmoji: { fontSize: 36, lineHeight: 1 },
  headTitle: { fontSize: 22, fontWeight: 900, letterSpacing: -0.4, margin: 0 },
  headLead: { fontSize: 14, color: "#a1a1aa", lineHeight: 1.5, marginTop: 4, margin: 0 },
  field: { display: "flex", flexDirection: "column", gap: 8 },
  row2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  label: {
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: 0.6,
    color: "#a1a1aa",
    textTransform: "uppercase",
    display: "flex",
    justifyContent: "space-between",
  },
  counter: { fontSize: 11, color: "#71717a", fontWeight: 700, letterSpacing: 0, textTransform: "none" },
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
    minHeight: 130,
  },
  honeypot: {
    position: "absolute",
    left: "-9999px",
    opacity: 0,
    pointerEvents: "none",
    height: 0,
    overflow: "hidden",
  },
  footRow: {
    display: "flex",
    gap: 10,
    justifyContent: "flex-end",
    flexWrap: "wrap",
    marginTop: 6,
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
    lineHeight: 1.5,
  },
  success: {
    padding: "40px 28px 32px",
    textAlign: "center",
    fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif",
  },
  successTitle: { fontSize: 24, fontWeight: 900, marginBottom: 8 },
  successText: {
    fontSize: 15,
    color: "#d4d4d8",
    marginBottom: 24,
    lineHeight: 1.5,
    maxWidth: 400,
    margin: "0 auto 24px",
  },
};
