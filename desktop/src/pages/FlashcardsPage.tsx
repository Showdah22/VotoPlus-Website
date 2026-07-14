import { useEffect, useState, useMemo } from "react";
import { Plus, Trash2, RotateCw, ChevronLeft, ChevronRight, Sparkles, Layers } from "lucide-react";
import { radius } from "../theme";
import { useAuth } from "../store/auth";
import { api } from "../api/client";
import { Modal } from "../components/Modal";

import { useTheme } from "../lib/theme-provider";
type Card = {
  id: string;
  front: string;
  back: string;
  subject?: string;
  created_at?: string;
};

export function FlashcardsPage() {
  const { colors } = useTheme();
  const token = useAuth((s) => s.token);
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("__all__");
  const [showCreate, setShowCreate] = useState(false);
  const [reviewIndex, setReviewIndex] = useState<number | null>(null);
  const [flipped, setFlipped] = useState(false);

  // create form
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [subject, setSubject] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    if (!token) return;
    setLoading(true);
    try {
      const list = await api.flashcardsList(token);
      setCards(list);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const subjects = useMemo(() => {
    const set = new Set<string>();
    cards.forEach((c) => set.add(c.subject || "Generale"));
    return Array.from(set).sort();
  }, [cards]);

  const filtered = useMemo(() => {
    if (filter === "__all__") return cards;
    return cards.filter((c) => (c.subject || "Generale") === filter);
  }, [cards, filter]);

  async function onSave() {
    if (!token) return;
    const f = front.trim();
    const b = back.trim();
    if (!f || !b) {
      setErr("Fronte e retro sono obbligatori.");
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      await api.flashcardsAdd({ front: f, back: b, subject: subject.trim() || "Generale" }, token);
      setFront("");
      setBack("");
      setSubject("");
      setShowCreate(false);
      await load();
    } catch (e: any) {
      setErr(e?.message || "Errore salvataggio");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(id: string) {
    if (!token) return;
    if (!confirm("Eliminare questa flashcard?")) return;
    try {
      await api.flashcardsDelete(id, token);
      setCards((cs) => cs.filter((c) => c.id !== id));
    } catch {}
  }

  function startReview() {
    if (filtered.length === 0) return;
    setReviewIndex(0);
    setFlipped(false);
  }
  function nextCard() {
    if (reviewIndex == null) return;
    setFlipped(false);
    setReviewIndex((i) => (i == null ? 0 : Math.min(filtered.length - 1, i + 1)));
  }
  function prevCard() {
    if (reviewIndex == null) return;
    setFlipped(false);
    setReviewIndex((i) => (i == null ? 0 : Math.max(0, i - 1)));
  }
  function exitReview() {
    setReviewIndex(null);
    setFlipped(false);
  }

  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 26, fontWeight: 900, letterSpacing: -0.4 }}>Flashcard</div>
          <div style={{ fontSize: 13, color: colors.textSub, marginTop: 4 }}>
            Ripasso rapido — {cards.length} carte · {subjects.length} materie
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={startReview}
            disabled={filtered.length === 0}
            style={{
              padding: "10px 16px",
              borderRadius: radius.md,
              background: filtered.length ? `${colors.pink}22` : colors.bgGlass,
              border: `1px solid ${filtered.length ? colors.pink : colors.border}`,
              color: filtered.length ? colors.pink : colors.textMuted,
              fontWeight: 800,
              fontSize: 13,
              display: "flex",
              alignItems: "center",
              gap: 8,
              cursor: filtered.length ? "pointer" : "not-allowed",
            }}
          >
            <Sparkles size={16} /> Inizia ripasso
          </button>
          <button
            onClick={() => setShowCreate(true)}
            style={{
              padding: "10px 16px",
              borderRadius: radius.md,
              background: `${colors.purple}22`,
              border: `1px solid ${colors.purple}`,
              color: colors.purple,
              fontWeight: 800,
              fontSize: 13,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Plus size={16} /> Nuova
          </button>
        </div>
      </div>

      {subjects.length > 1 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <FilterChip active={filter === "__all__"} onClick={() => setFilter("__all__")} label={`Tutte · ${cards.length}`} color={colors.purple} />
          {subjects.map((s) => (
            <FilterChip
              key={s}
              active={filter === s}
              onClick={() => setFilter(s)}
              label={`${s} · ${cards.filter((c) => (c.subject || "Generale") === s).length}`}
              color={colors.cyan}
            />
          ))}
        </div>
      )}

      {loading ? (
        <Placeholder label="Caricamento…" />
      ) : filtered.length === 0 ? (
        <Placeholder
          label={
            cards.length === 0
              ? "Ancora nessuna flashcard. Crea la tua prima con il pulsante Nuova o generale automaticamente da uno studio nel mobile."
              : "Nessuna carta per questa materia."
          }
        />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14 }}>
          {filtered.map((c) => (
            <div
              key={c.id}
              style={{
                padding: 16,
                borderRadius: radius.md,
                background: colors.bgGlass,
                border: `1px solid ${colors.border}`,
                display: "flex",
                flexDirection: "column",
                gap: 10,
                position: "relative",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{
                  fontSize: 10,
                  fontWeight: 900,
                  letterSpacing: 0.6,
                  color: colors.pink,
                  background: `${colors.pink}1a`,
                  border: `1px solid ${colors.pink}55`,
                  padding: "2px 8px",
                  borderRadius: 999,
                  textTransform: "uppercase",
                }}>{c.subject || "Generale"}</span>
                <button
                  onClick={() => onDelete(c.id)}
                  style={{
                    background: "transparent",
                    border: `1px solid ${colors.border}`,
                    borderRadius: 8,
                    padding: 6,
                    cursor: "pointer",
                    color: colors.textMuted,
                  }}
                  title="Elimina"
                >
                  <Trash2 size={13} />
                </button>
              </div>
              <div style={{ fontWeight: 800, fontSize: 14, color: colors.textPrimary }}>{c.front}</div>
              <div style={{ height: 1, background: colors.border }} />
              <div style={{ fontSize: 13, color: colors.textSub, lineHeight: 1.5 }}>{c.back}</div>
            </div>
          ))}
        </div>
      )}

      {/* Modal review */}
      <Modal open={reviewIndex !== null} onClose={exitReview} title="Ripasso Flashcard">
        {reviewIndex !== null && filtered[reviewIndex] && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 380 }}>
            <div style={{ fontSize: 12, color: colors.textMuted, textAlign: "center" }}>
              {reviewIndex + 1} / {filtered.length} · {filtered[reviewIndex].subject || "Generale"}
            </div>
            <div
              onClick={() => setFlipped((f) => !f)}
              style={{
                minHeight: 220,
                padding: 24,
                borderRadius: radius.lg,
                background: flipped ? `${colors.cyan}15` : `${colors.purple}15`,
                border: `1.5px solid ${flipped ? colors.cyan : colors.purple}55`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
                cursor: "pointer",
                transition: "all 200ms ease",
              }}
            >
              <div>
                <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1.2, color: colors.textMuted, textTransform: "uppercase", marginBottom: 12 }}>
                  {flipped ? "Retro" : "Fronte"}
                </div>
                <div style={{ fontSize: 18, fontWeight: 800, lineHeight: 1.4 }}>
                  {flipped ? filtered[reviewIndex].back : filtered[reviewIndex].front}
                </div>
                <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 16, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                  <RotateCw size={12} /> Clicca per {flipped ? "vedere il fronte" : "scoprire la risposta"}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
              <button
                onClick={prevCard}
                disabled={reviewIndex === 0}
                style={navBtn(reviewIndex === 0)}
              >
                <ChevronLeft size={16} /> Precedente
              </button>
              <button
                onClick={nextCard}
                disabled={reviewIndex >= filtered.length - 1}
                style={navBtn(reviewIndex >= filtered.length - 1)}
              >
                Successiva <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal create */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Nuova flashcard">
        <div style={{ display: "flex", flexDirection: "column", gap: 12, width: 400 }}>
          <TextField label="Fronte (domanda)" value={front} onChange={setFront} placeholder="es. Pitagora" />
          <TextArea label="Retro (risposta)" value={back} onChange={setBack} placeholder="es. In un triangolo rettangolo…" />
          <TextField label="Materia" value={subject} onChange={setSubject} placeholder="es. Matematica" />
          {err && (
            <div style={{ color: colors.red, fontSize: 12, fontWeight: 700 }}>{err}</div>
          )}
          <button
            onClick={onSave}
            disabled={saving}
            style={{
              marginTop: 6,
              padding: "12px 20px",
              borderRadius: radius.md,
              background: `linear-gradient(135deg, ${colors.purple} 0%, ${colors.blue} 100%)`,
              border: "none",
              color: colors.textPrimary,
              fontWeight: 800,
              fontSize: 14,
              cursor: saving ? "not-allowed" : "pointer",
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? "Salvataggio…" : "Salva flashcard"}
          </button>
        </div>
      </Modal>
    </div>
  );
}

function FilterChip({ active, onClick, label, color }: { active: boolean; onClick: () => void; label: string; color: string }) {
  const { colors } = useTheme();
  return (
    <button
      onClick={onClick}
      style={{
        padding: "6px 12px",
        borderRadius: 999,
        background: active ? `${color}22` : colors.bgGlass,
        border: `1px solid ${active ? color : colors.border}`,
        color: active ? color : colors.textSub,
        fontSize: 12,
        fontWeight: 700,
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}

function Placeholder({ label }: { label: string }) {
  const { colors } = useTheme();
  return (
    <div
      style={{
        padding: 40,
        borderRadius: radius.md,
        background: colors.bgGlass,
        border: `1px dashed ${colors.border}`,
        color: colors.textSub,
        fontSize: 13,
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 12,
      }}
    >
      <Layers size={32} color={colors.textMuted} />
      <div>{label}</div>
    </div>
  );
}

function TextField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  const { colors } = useTheme();
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ fontSize: 11, fontWeight: 800, color: colors.textMuted, textTransform: "uppercase", letterSpacing: 0.8 }}>{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          padding: "10px 12px",
          borderRadius: radius.sm,
          background: colors.bg,
          border: `1px solid ${colors.border}`,
          color: colors.textPrimary,
          fontSize: 14,
          outline: "none",
        }}
      />
    </label>
  );
}
function TextArea({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  const { colors } = useTheme();
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ fontSize: 11, fontWeight: 800, color: colors.textMuted, textTransform: "uppercase", letterSpacing: 0.8 }}>{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={4}
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
    </label>
  );
}

function navBtn(disabled: boolean): React.CSSProperties {
  const { colors } = useTheme();
  return {
    flex: 1,
    padding: "10px 14px",
    borderRadius: radius.md,
    background: disabled ? "transparent" : colors.bgGlass,
    border: `1px solid ${disabled ? colors.border : colors.borderStrong}`,
    color: disabled ? colors.textMuted : colors.textPrimary,
    fontWeight: 700,
    fontSize: 13,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    cursor: disabled ? "not-allowed" : "pointer",
  };
}
