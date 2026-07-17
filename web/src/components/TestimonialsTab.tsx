// Voto+ website · Admin — Testimonials moderation tab.
//
// Consente al team di:
//   - Vedere le recensioni pending (evidenziate in cima)
//   - Approvare / rifiutare / eliminare
//   - Segnare come "featured" (mostrata per prima nella lista pubblica)
//   - Editare tipos / lunghezza prima di approvare
//   - Aggiungere note interne (non pubblicate)
//
// Usa lo stesso token JWT dell'AdminPanel principale.
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { getApiBase } from "@/lib/blogApi";

interface AdminTestimonial {
  id: string;
  name: string;
  school_type: string;
  school_name?: string | null;
  grade?: string | null;
  rating: number;
  text: string;
  status: "pending" | "approved" | "rejected";
  is_featured: boolean;
  email?: string | null;
  admin_notes?: string | null;
  created_at?: string | null;
  reviewed_at?: string | null;
  reviewed_by?: string | null;
}

interface Counts {
  pending: number;
  approved: number;
  rejected: number;
}

interface Props {
  onNotify: (msg: string, kind?: "info" | "error") => void;
}

const SCHOOL_LABELS: Record<string, string> = {
  liceo: "Liceo",
  istituto_tecnico: "Istituto Tecnico",
  istituto_professionale: "Istituto Professionale",
  universita: "Università",
  genitore: "Genitore",
  altro: "Altro",
};

const TOKEN_KEY = "votoplus_admin_jwt";
function getToken(): string | null {
  try {
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export default function TestimonialsTab({ onNotify }: Props) {
  const [items, setItems] = useState<AdminTestimonial[]>([]);
  const [counts, setCounts] = useState<Counts>({ pending: 0, approved: 0, rejected: 0 });
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<AdminTestimonial | null>(null);

  const api = useCallback(
    async <T,>(path: string, opts: RequestInit = {}): Promise<T> => {
      const base = getApiBase();
      const token = getToken();
      const res = await fetch(`${base}${path}`, {
        ...opts,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(opts.headers || {}),
        },
      });
      if (!res.ok) {
        let msg = `HTTP ${res.status}`;
        try {
          const j = await res.json();
          if (j?.detail) msg = typeof j.detail === "string" ? j.detail : msg;
        } catch { /* ignore JSON parse errors */ }
        throw new Error(msg);
      }
      return (await res.json()) as T;
    },
    []
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = filter === "all" ? "" : `?status=${filter}`;
      const data = await api<{ items: AdminTestimonial[]; counts: Counts }>(
        `/admin/testimonials${qs}`
      );
      setItems(data.items || []);
      setCounts(data.counts || { pending: 0, approved: 0, rejected: 0 });
    } catch (err: any) {
      setError(err?.message || "Errore caricamento");
    } finally {
      setLoading(false);
    }
  }, [api, filter]);

  useEffect(() => {
    load();
  }, [load]);

  const updateOne = useCallback(
    async (id: string, body: Record<string, unknown>) => {
      try {
        await api(`/admin/testimonials/${id}`, { method: "PATCH", body: JSON.stringify(body) });
        onNotify("Recensione aggiornata");
        load();
      } catch (err: any) {
        onNotify(err?.message || "Aggiornamento fallito", "error");
      }
    },
    [api, load, onNotify]
  );

  const deleteOne = useCallback(
    async (id: string) => {
      if (!window.confirm("Eliminare definitivamente questa recensione?")) return;
      try {
        await api(`/admin/testimonials/${id}`, { method: "DELETE" });
        onNotify("Recensione eliminata");
        load();
      } catch (err: any) {
        onNotify(err?.message || "Eliminazione fallita", "error");
      }
    },
    [api, load, onNotify]
  );

  const filters: { key: "pending" | "approved" | "rejected" | "all"; label: string; count: number }[] = useMemo(
    () => [
      { key: "pending", label: "⏳ Pending", count: counts.pending },
      { key: "approved", label: "✅ Approvate", count: counts.approved },
      { key: "rejected", label: "🗑 Rifiutate", count: counts.rejected },
      { key: "all", label: "Tutte", count: counts.pending + counts.approved + counts.rejected },
    ],
    [counts]
  );

  return (
    <div>
      <div style={styles.toolbar}>
        <h2 style={{ fontSize: 22, fontWeight: 900, margin: 0 }}>Recensioni</h2>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {filters.map((f) => (
            <button
              key={f.key}
              style={filter === f.key ? styles.filterBtnActive : styles.filterBtn}
              onClick={() => setFilter(f.key)}
            >
              {f.label} <span style={styles.countPill}>{f.count}</span>
            </button>
          ))}
        </div>
        <button style={styles.btnGhost} onClick={load} disabled={loading}>
          {loading ? "…" : "↻ Ricarica"}
        </button>
      </div>

      {error && <div style={styles.errorBox}>{error}</div>}

      {loading && !items.length && <div style={styles.emptyCard}>Caricamento…</div>}

      {!loading && items.length === 0 && (
        <div style={styles.emptyCard}>Nessuna recensione in questa vista.</div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {items.map((t) => (
          <div key={t.id} style={styles.row}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <span style={{ ...styles.badge, ...statusBadge(t.status) }}>{t.status.toUpperCase()}</span>
              {t.is_featured && <span style={styles.badgeFeatured}>⭐ FEATURED</span>}
              <span style={styles.stars}>
                {"★".repeat(t.rating)}
                <span style={{ color: "#3f3f46" }}>{"★".repeat(5 - t.rating)}</span>
              </span>
              <span style={styles.metaText}>
                <strong style={{ color: "#fff" }}>{t.name}</strong> · {SCHOOL_LABELS[t.school_type] || t.school_type}
                {t.school_name ? ` · ${t.school_name}` : ""}
                {t.grade ? ` · ${t.grade}` : ""}
              </span>
              {t.email && <span style={styles.emailTag}>📧 {t.email}</span>}
              <span style={styles.date}>{formatDate(t.created_at)}</span>
            </div>
            <p style={styles.textBlock}>“{t.text}”</p>
            {t.admin_notes && (
              <div style={styles.notesBlock}>
                <strong>Note interne:</strong> {t.admin_notes}
              </div>
            )}
            <div style={styles.actions}>
              {t.status !== "approved" && (
                <button
                  style={styles.btnPrimary}
                  onClick={() => updateOne(t.id, { status: "approved" })}
                >
                  ✓ Approva
                </button>
              )}
              {t.status !== "rejected" && (
                <button style={styles.btnGhost} onClick={() => updateOne(t.id, { status: "rejected" })}>
                  ✗ Rifiuta
                </button>
              )}
              <button
                style={styles.btnGhost}
                onClick={() => updateOne(t.id, { is_featured: !t.is_featured })}
              >
                {t.is_featured ? "Rimuovi ⭐" : "In evidenza ⭐"}
              </button>
              <button style={styles.btnGhost} onClick={() => setEditing(t)}>
                ✎ Modifica
              </button>
              <button style={styles.btnDanger} onClick={() => deleteOne(t.id)}>
                🗑 Elimina
              </button>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <EditModal
          item={editing}
          onClose={() => setEditing(null)}
          onSave={async (body) => {
            await updateOne(editing.id, body);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function EditModal({
  item,
  onClose,
  onSave,
}: {
  item: AdminTestimonial;
  onClose: () => void;
  onSave: (body: Record<string, unknown>) => Promise<void>;
}) {
  const [name, setName] = useState(item.name);
  const [text, setText] = useState(item.text);
  const [notes, setNotes] = useState(item.admin_notes || "");
  const [schoolName, setSchoolName] = useState(item.school_name || "");
  const [grade, setGrade] = useState(item.grade || "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await onSave({
        name,
        text,
        admin_notes: notes,
        school_name: schoolName,
        grade,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={styles.modalBackdrop} onClick={onClose}>
      <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
        <div style={styles.modalHead}>
          <h3 style={{ margin: 0, fontSize: 18 }}>Modifica recensione</h3>
          <button style={styles.iconBtn} onClick={onClose}>✕</button>
        </div>
        <div style={styles.modalBody}>
          <label style={styles.label}>Nome</label>
          <input style={styles.input} value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />

          <label style={styles.label}>Scuola / Università</label>
          <input style={styles.input} value={schoolName} onChange={(e) => setSchoolName(e.target.value)} maxLength={100} />

          <label style={styles.label}>Classe / Corso</label>
          <input style={styles.input} value={grade} onChange={(e) => setGrade(e.target.value)} maxLength={60} />

          <label style={styles.label}>Testo</label>
          <textarea
            style={{ ...styles.input, minHeight: 140, resize: "vertical" }}
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={1000}
          />
          <div style={{ fontSize: 11, color: "#71717a" }}>{text.length} / 1000</div>

          <label style={styles.label}>Note interne (non pubblicate)</label>
          <textarea
            style={{ ...styles.input, minHeight: 60, resize: "vertical" }}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={500}
          />
        </div>
        <div style={styles.modalFoot}>
          <button style={styles.btnGhost} onClick={onClose}>Annulla</button>
          <button style={styles.btnPrimary} onClick={save} disabled={saving}>
            {saving ? "Salvataggio…" : "Salva"}
          </button>
        </div>
      </div>
    </div>
  );
}

function statusBadge(status: string): React.CSSProperties {
  switch (status) {
    case "pending":
      return { background: "rgba(245,158,11,0.14)", color: "#fbbf24", border: "1px solid rgba(245,158,11,0.4)" };
    case "approved":
      return { background: "rgba(16,185,129,0.14)", color: "#6ee7b7", border: "1px solid rgba(16,185,129,0.4)" };
    case "rejected":
      return { background: "rgba(248,113,113,0.14)", color: "#fca5a5", border: "1px solid rgba(248,113,113,0.4)" };
    default:
      return {};
  }
}

function formatDate(iso?: string | null): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString("it-IT", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

const styles: Record<string, React.CSSProperties> = {
  toolbar: { display: "flex", gap: 12, alignItems: "center", marginBottom: 20, flexWrap: "wrap" },
  filterBtn: {
    padding: "7px 12px",
    borderRadius: 999,
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.1)",
    color: "#a1a1aa",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: 13,
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
  },
  filterBtnActive: {
    padding: "7px 12px",
    borderRadius: 999,
    background: "rgba(168,85,247,0.14)",
    border: "1px solid rgba(168,85,247,0.4)",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 800,
    fontSize: 13,
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
  },
  countPill: {
    padding: "1px 7px",
    borderRadius: 999,
    background: "rgba(255,255,255,0.08)",
    fontSize: 11,
    fontWeight: 800,
  },
  row: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    padding: 18,
    background: "#12121a",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 14,
  },
  badge: {
    padding: "3px 8px",
    borderRadius: 6,
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: 0.5,
  },
  badgeFeatured: {
    padding: "3px 8px",
    borderRadius: 6,
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: 0.5,
    background: "rgba(168,85,247,0.16)",
    color: "#c084fc",
    border: "1px solid rgba(168,85,247,0.4)",
  },
  stars: { color: "#f59e0b", fontSize: 14, letterSpacing: 1 },
  metaText: { color: "#a1a1aa", fontSize: 13.5 },
  emailTag: { color: "#71717a", fontSize: 12, fontFamily: "monospace" },
  date: { color: "#71717a", fontSize: 12, marginLeft: "auto" },
  textBlock: {
    color: "#e4e4e7",
    fontSize: 14.5,
    lineHeight: 1.6,
    fontStyle: "italic",
    padding: "10px 14px",
    background: "rgba(255,255,255,0.02)",
    borderLeft: "3px solid rgba(168,85,247,0.4)",
    borderRadius: 4,
  },
  notesBlock: {
    padding: "8px 12px",
    background: "rgba(245,158,11,0.06)",
    border: "1px solid rgba(245,158,11,0.2)",
    borderRadius: 8,
    color: "#fcd34d",
    fontSize: 12.5,
    lineHeight: 1.5,
  },
  actions: { display: "flex", gap: 8, flexWrap: "wrap" },
  btnPrimary: {
    padding: "8px 14px",
    background: "linear-gradient(135deg,#a855f7,#ec4899)",
    color: "#fff",
    border: "none",
    borderRadius: 999,
    fontWeight: 800,
    fontSize: 13,
    cursor: "pointer",
  },
  btnGhost: {
    padding: "7px 14px",
    background: "transparent",
    color: "#fff",
    border: "1px solid rgba(255,255,255,0.14)",
    borderRadius: 999,
    fontWeight: 700,
    fontSize: 13,
    cursor: "pointer",
  },
  btnDanger: {
    padding: "7px 14px",
    background: "transparent",
    color: "#fca5a5",
    border: "1px solid rgba(248,113,113,0.4)",
    borderRadius: 999,
    fontWeight: 700,
    fontSize: 13,
    cursor: "pointer",
  },
  emptyCard: { padding: 40, textAlign: "center", color: "#71717a", background: "#12121a", border: "1px dashed rgba(255,255,255,0.1)", borderRadius: 14 },
  errorBox: { marginBottom: 12, padding: "10px 14px", background: "#f8717122", border: "1px solid #f8717155", borderRadius: 10, color: "#fca5a5", fontSize: 14 },
  modalBackdrop: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 },
  modalCard: { width: "100%", maxWidth: 640, maxHeight: "90vh", background: "#0f0f14", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, display: "flex", flexDirection: "column", overflow: "hidden" },
  modalHead: { padding: "18px 24px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between" },
  modalBody: { padding: "20px 24px", overflowY: "auto", flex: 1 },
  modalFoot: { padding: "16px 24px", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "flex-end", gap: 10 },
  label: { display: "block", fontSize: 12, fontWeight: 800, letterSpacing: 0.4, color: "#a1a1aa", marginTop: 12, marginBottom: 6, textTransform: "uppercase" },
  input: { width: "100%", padding: "10px 14px", background: "#0a0a0f", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, color: "#fff", fontSize: 14, outline: "none", fontFamily: "inherit" },
  iconBtn: { background: "transparent", border: "none", color: "#a1a1aa", cursor: "pointer", fontSize: 20, padding: 4 },
};
