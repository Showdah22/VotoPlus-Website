// Voto+ website · Admin — Contact Requests moderation tab.
//
// Gestisce sia le proposte di idea (dal CTA /roadmap) che le richieste di
// supporto (dal CTA /faq). Nella stessa vista, filtrabili per:
//   - Tipo: idea | support | tutte
//   - Status: new | reviewed | archived | tutte
//
// Ogni item mostra: nome + email cliccabile (mailto), oggetto, corpo, source
// page, timestamp. Azioni: segna letta, archivia, note interne, elimina.
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { getApiBase } from "@/lib/blogApi";

interface ContactRequest {
  id: string;
  type: "idea" | "support";
  name: string;
  email: string;
  subject: string;
  message: string;
  page_source?: string | null;
  status: "new" | "reviewed" | "archived";
  admin_notes?: string | null;
  created_at?: string | null;
  reviewed_at?: string | null;
  reviewed_by?: string | null;
}

interface Counts {
  total: number;
  new: number;
  reviewed: number;
  archived: number;
  idea_total: number;
  idea_new: number;
  support_total: number;
  support_new: number;
}

interface Props {
  onNotify: (msg: string, kind?: "info" | "error") => void;
}

const TOKEN_KEY = "votoplus_admin_jwt";
function getToken(): string | null {
  try {
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

type TypeFilter = "all" | "idea" | "support";
type StatusFilter = "all" | "new" | "reviewed" | "archived";

export default function ContactRequestsTab({ onNotify }: Props) {
  const [items, setItems] = useState<ContactRequest[]>([]);
  const [counts, setCounts] = useState<Counts>({
    total: 0,
    new: 0,
    reviewed: 0,
    archived: 0,
    idea_total: 0,
    idea_new: 0,
    support_total: 0,
    support_new: 0,
  });
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("new");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});

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
      const qs = new URLSearchParams();
      if (typeFilter !== "all") qs.set("type", typeFilter);
      if (statusFilter !== "all") qs.set("status", statusFilter);
      const q = qs.toString();
      const data = await api<{ items: ContactRequest[]; counts: Counts }>(
        `/admin/contact-requests${q ? `?${q}` : ""}`
      );
      setItems(data.items || []);
      setCounts(data.counts);
    } catch (err: any) {
      setError(err?.message || "Errore caricamento");
    } finally {
      setLoading(false);
    }
  }, [api, typeFilter, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const updateOne = useCallback(
    async (id: string, body: Record<string, unknown>) => {
      try {
        await api(`/admin/contact-requests/${id}`, { method: "PATCH", body: JSON.stringify(body) });
        onNotify("Richiesta aggiornata");
        load();
      } catch (err: any) {
        onNotify(err?.message || "Aggiornamento fallito", "error");
      }
    },
    [api, load, onNotify]
  );

  const deleteOne = useCallback(
    async (id: string) => {
      if (!window.confirm("Eliminare definitivamente questa richiesta?")) return;
      try {
        await api(`/admin/contact-requests/${id}`, { method: "DELETE" });
        onNotify("Richiesta eliminata");
        load();
      } catch (err: any) {
        onNotify(err?.message || "Eliminazione fallita", "error");
      }
    },
    [api, load, onNotify]
  );

  const saveNotes = useCallback(
    async (id: string) => {
      const notes = notesDraft[id] ?? "";
      await updateOne(id, { admin_notes: notes });
    },
    [notesDraft, updateOne]
  );

  const typeFilters: { key: TypeFilter; label: string; count: number }[] = useMemo(
    () => [
      { key: "all", label: "Tutte", count: counts.total },
      { key: "idea", label: "💡 Idee", count: counts.idea_total },
      { key: "support", label: "🛟 Supporto", count: counts.support_total },
    ],
    [counts]
  );

  const statusFilters: { key: StatusFilter; label: string; count: number }[] = useMemo(
    () => [
      { key: "new", label: "🔵 Nuove", count: counts.new },
      { key: "reviewed", label: "✓ Lette", count: counts.reviewed },
      { key: "archived", label: "📦 Archiviate", count: counts.archived },
      { key: "all", label: "Tutti gli stati", count: counts.total },
    ],
    [counts]
  );

  return (
    <div>
      <div style={styles.toolbar}>
        <h2 style={{ fontSize: 22, fontWeight: 900, margin: 0 }}>Richieste dal sito</h2>
        <button style={styles.btnGhost} onClick={load} disabled={loading}>
          {loading ? "…" : "↻ Ricarica"}
        </button>
      </div>

      <div style={styles.filterGroup}>
        <span style={styles.filterGroupLabel}>Categoria</span>
        {typeFilters.map((f) => (
          <button
            key={f.key}
            style={typeFilter === f.key ? styles.filterBtnActive : styles.filterBtn}
            onClick={() => setTypeFilter(f.key)}
          >
            {f.label} <span style={styles.countPill}>{f.count}</span>
          </button>
        ))}
      </div>

      <div style={styles.filterGroup}>
        <span style={styles.filterGroupLabel}>Stato</span>
        {statusFilters.map((f) => (
          <button
            key={f.key}
            style={statusFilter === f.key ? styles.filterBtnActive : styles.filterBtn}
            onClick={() => setStatusFilter(f.key)}
          >
            {f.label} <span style={styles.countPill}>{f.count}</span>
          </button>
        ))}
      </div>

      {error && <div style={styles.errorBox}>{error}</div>}

      {loading && !items.length && <div style={styles.emptyCard}>Caricamento…</div>}

      {!loading && items.length === 0 && (
        <div style={styles.emptyCard}>Nessuna richiesta in questa vista.</div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {items.map((r) => {
          const expanded = expandedId === r.id;
          const typeMeta = r.type === "idea"
            ? { emoji: "💡", color: "#a855f7", label: "IDEA" }
            : { emoji: "🛟", color: "#06b6d4", label: "SUPPORTO" };
          return (
            <div key={r.id} style={{
              ...styles.row,
              borderLeft: `3px solid ${typeMeta.color}`,
              opacity: r.status === "archived" ? 0.6 : 1,
            }}>
              <div style={styles.rowHead}>
                <span style={{ ...styles.typeChip, background: `${typeMeta.color}22`, color: typeMeta.color, borderColor: `${typeMeta.color}55` }}>
                  {typeMeta.emoji} {typeMeta.label}
                </span>
                <span style={{ ...styles.badge, ...statusBadge(r.status) }}>{r.status.toUpperCase()}</span>
                <strong style={styles.subject}>{r.subject}</strong>
                <span style={styles.dateChip}>{formatDate(r.created_at)}</span>
              </div>

              <div style={styles.metaRow}>
                <span style={styles.metaName}>👤 {r.name}</span>
                <a href={`mailto:${r.email}?subject=Re: ${encodeURIComponent(r.subject)}`} style={styles.emailLink}>
                  ✉️ {r.email}
                </a>
                {r.page_source && (
                  <span style={styles.sourceTag}>📍 da {r.page_source}</span>
                )}
              </div>

              <p style={{ ...styles.messageBlock, ...(expanded ? {} : styles.messageClamp) }}>
                {r.message}
              </p>
              {r.message.length > 200 && (
                <button
                  type="button"
                  style={styles.expandBtn}
                  onClick={() => setExpandedId(expanded ? null : r.id)}
                >
                  {expanded ? "Mostra meno" : "Mostra tutto"}
                </button>
              )}

              {(r.admin_notes || expanded) && (
                <div style={styles.notesArea}>
                  <label style={styles.label}>Note interne (non inviate al mittente)</label>
                  <textarea
                    style={styles.notesInput}
                    value={notesDraft[r.id] ?? r.admin_notes ?? ""}
                    onChange={(e) => setNotesDraft((prev) => ({ ...prev, [r.id]: e.target.value }))}
                    maxLength={1000}
                    rows={2}
                    placeholder="Es. Risposta inviata via email il 17/07"
                  />
                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 6 }}>
                    <button style={styles.btnGhostSmall} onClick={() => saveNotes(r.id)}>Salva note</button>
                  </div>
                </div>
              )}

              <div style={styles.actions}>
                {r.status === "new" && (
                  <button style={styles.btnPrimary} onClick={() => updateOne(r.id, { status: "reviewed" })}>
                    ✓ Segna come letta
                  </button>
                )}
                {r.status !== "archived" && (
                  <button style={styles.btnGhost} onClick={() => updateOne(r.id, { status: "archived" })}>
                    📦 Archivia
                  </button>
                )}
                {r.status === "archived" && (
                  <button style={styles.btnGhost} onClick={() => updateOne(r.id, { status: "reviewed" })}>
                    ↺ Ripristina
                  </button>
                )}
                {r.status === "reviewed" && (
                  <button style={styles.btnGhost} onClick={() => updateOne(r.id, { status: "new" })}>
                    ⚫ Segna come nuova
                  </button>
                )}
                <button style={styles.btnDanger} onClick={() => deleteOne(r.id)}>
                  🗑 Elimina
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// Helpers
// ============================================================================
function statusBadge(status: string): React.CSSProperties {
  switch (status) {
    case "new":
      return { background: "rgba(59,130,246,0.14)", color: "#93c5fd", border: "1px solid rgba(59,130,246,0.4)" };
    case "reviewed":
      return { background: "rgba(16,185,129,0.14)", color: "#6ee7b7", border: "1px solid rgba(16,185,129,0.4)" };
    case "archived":
      return { background: "rgba(113,113,122,0.18)", color: "#a1a1aa", border: "1px solid rgba(113,113,122,0.4)" };
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

// ============================================================================
// Styles
// ============================================================================
const styles: Record<string, React.CSSProperties> = {
  toolbar: { display: "flex", gap: 12, alignItems: "center", marginBottom: 20, flexWrap: "wrap" },
  filterGroup: { display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", marginBottom: 12 },
  filterGroupLabel: { fontSize: 11, fontWeight: 900, letterSpacing: 1, color: "#71717a", textTransform: "uppercase", marginRight: 4 },
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
    gap: 10,
    padding: 18,
    background: "#12121a",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 14,
  },
  rowHead: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" },
  typeChip: {
    padding: "3px 10px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 900,
    letterSpacing: 0.5,
    border: "1px solid",
  },
  badge: {
    padding: "3px 8px",
    borderRadius: 6,
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: 0.5,
  },
  subject: { color: "#fff", fontSize: 15, marginRight: "auto" },
  dateChip: { color: "#71717a", fontSize: 12, fontWeight: 600 },
  metaRow: { display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap", fontSize: 13 },
  metaName: { color: "#e4e4e7" },
  emailLink: { color: "#93c5fd", textDecoration: "none", fontFamily: "monospace" },
  sourceTag: { color: "#71717a", fontSize: 12 },
  messageBlock: {
    color: "#e4e4e7",
    fontSize: 14.5,
    lineHeight: 1.6,
    padding: "10px 14px",
    background: "rgba(255,255,255,0.02)",
    borderRadius: 8,
    whiteSpace: "pre-wrap",
  },
  messageClamp: {
    display: "-webkit-box",
    WebkitLineClamp: 3,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  },
  expandBtn: {
    alignSelf: "flex-start",
    background: "transparent",
    border: "none",
    color: "#a855f7",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 700,
    padding: 0,
  },
  notesArea: {
    padding: 12,
    background: "rgba(245,158,11,0.05)",
    border: "1px solid rgba(245,158,11,0.2)",
    borderRadius: 10,
  },
  label: { display: "block", fontSize: 11, fontWeight: 800, letterSpacing: 0.5, color: "#fcd34d", marginBottom: 6, textTransform: "uppercase" },
  notesInput: {
    width: "100%",
    padding: "8px 12px",
    background: "#0a0a0f",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 8,
    color: "#fff",
    fontSize: 13.5,
    outline: "none",
    resize: "vertical",
    fontFamily: "inherit",
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
  btnGhostSmall: {
    padding: "5px 12px",
    background: "transparent",
    color: "#fbbf24",
    border: "1px solid rgba(245,158,11,0.4)",
    borderRadius: 999,
    fontWeight: 700,
    fontSize: 12,
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
};
