// Voto+ website · Public testimonials list (React island).
//
// Carica le recensioni approvate dall'API pubblica e le mostra a griglia con
// filtro per tipo di scuola. Include: hero stats (numero + media rating),
// filtri, empty state, loading state.
//
// Non usiamo SSR/SSG per queste card così una nuova approvazione dell'admin
// diventa immediatamente visibile senza rebuild del sito.
import React, { useEffect, useMemo, useState } from "react";
import { getApiBase } from "@/lib/blogApi";

interface Testimonial {
  id: string;
  name: string;
  school_type: string;
  school_name?: string | null;
  grade?: string | null;
  rating: number;
  text: string;
  is_featured: boolean;
  created_at?: string | null;
}

interface Stats {
  count: number;
  avg_rating: number;
}

interface ApiResp {
  items: Testimonial[];
  stats: Stats;
}

const SCHOOL_FILTERS: { value: string; label: string; emoji: string }[] = [
  { value: "", label: "Tutte", emoji: "✨" },
  { value: "liceo", label: "Liceo", emoji: "🎓" },
  { value: "istituto_tecnico", label: "Istituto Tecnico", emoji: "🔧" },
  { value: "istituto_professionale", label: "Ist. Professionale", emoji: "🛠️" },
  { value: "universita", label: "Università", emoji: "📚" },
  { value: "genitore", label: "Genitori", emoji: "👪" },
];

function schoolLabel(t: string): string {
  const map: Record<string, string> = {
    liceo: "Liceo",
    istituto_tecnico: "Istituto Tecnico",
    istituto_professionale: "Istituto Professionale",
    universita: "Università",
    genitore: "Genitore",
    altro: "Altro",
  };
  return map[t] || t;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] || "?";
  const second = parts[1]?.[0] || "";
  return (first + second).toUpperCase();
}

function avatarColor(name: string): string {
  const palette = ["#a855f7", "#ec4899", "#06b6d4", "#10b981", "#f59e0b", "#3b82f6"];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return palette[Math.abs(hash) % palette.length];
}

function relativeDate(iso?: string | null): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    const diff = (Date.now() - d.getTime()) / 1000;
    if (diff < 60) return "adesso";
    if (diff < 3600) return `${Math.floor(diff / 60)} min fa`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} h fa`;
    if (diff < 86400 * 30) return `${Math.floor(diff / 86400)} g fa`;
    return d.toLocaleDateString("it-IT", { month: "short", year: "numeric" });
  } catch {
    return "";
  }
}

export default function TestimonialsList({ refreshKey = 0 }: { refreshKey?: number }) {
  const [data, setData] = useState<ApiResp | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const base = getApiBase();
        const url = filter
          ? `${base}/testimonials/public?school_type=${encodeURIComponent(filter)}&limit=60`
          : `${base}/testimonials/public?limit=60`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json: ApiResp = await res.json();
        if (!cancelled) setData(json);
      } catch (err: any) {
        if (!cancelled) setError(err?.message || "Errore di rete");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [filter, refreshKey]);

  const items = data?.items || [];
  const totalStats = data?.stats;

  const featuredItems = useMemo(() => items.filter((t) => t.is_featured), [items]);
  const regularItems = useMemo(() => items.filter((t) => !t.is_featured), [items]);

  return (
    <div style={styles.wrap}>
      {/* STATS BAR */}
      {totalStats && totalStats.count > 0 && (
        <div style={styles.statsBar}>
          <div style={styles.statBlock}>
            <div style={styles.statValue}>{totalStats.count}</div>
            <div style={styles.statLabel}>Recensioni verificate</div>
          </div>
          <div style={styles.statBlock}>
            <div style={styles.statValue}>
              <span style={{ color: "#f59e0b" }}>★</span> {totalStats.avg_rating.toFixed(2)}
            </div>
            <div style={styles.statLabel}>Media valutazioni</div>
          </div>
        </div>
      )}

      {/* FILTERS */}
      <div style={styles.filterRow}>
        {SCHOOL_FILTERS.map((f) => {
          const active = filter === f.value;
          return (
            <button
              key={f.value || "all"}
              type="button"
              style={{ ...styles.filterBtn, ...(active ? styles.filterBtnActive : {}) }}
              onClick={() => setFilter(f.value)}
              aria-pressed={active}
            >
              <span style={{ fontSize: 15 }}>{f.emoji}</span>
              <span>{f.label}</span>
            </button>
          );
        })}
      </div>

      {loading && (
        <div style={styles.emptyState}>
          <div style={styles.spinner} aria-hidden="true" />
          <p>Caricamento recensioni…</p>
        </div>
      )}

      {!loading && error && (
        <div style={styles.errorBox}>Non siamo riusciti a caricare le recensioni. Riprova più tardi.</div>
      )}

      {!loading && !error && items.length === 0 && (
        <div style={styles.emptyState}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>💬</div>
          <p style={{ marginBottom: 4, fontSize: 16, color: "#fff" }}>Nessuna recensione ancora in questa categoria.</p>
          <p style={{ fontSize: 14, color: "#a1a1aa" }}>Potresti essere il primo a lasciarne una qui sotto!</p>
        </div>
      )}

      {!loading && !error && items.length > 0 && (
        <>
          {featuredItems.length > 0 && (
            <div style={styles.grid}>
              {featuredItems.map((t) => (
                <TestimonialCard key={t.id} item={t} featured />
              ))}
            </div>
          )}
          {regularItems.length > 0 && (
            <div style={{ ...styles.grid, marginTop: featuredItems.length ? 16 : 0 }}>
              {regularItems.map((t) => (
                <TestimonialCard key={t.id} item={t} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function TestimonialCard({ item, featured }: { item: Testimonial; featured?: boolean }) {
  const color = avatarColor(item.name);
  return (
    <article style={{ ...styles.card, ...(featured ? styles.cardFeatured : {}) }}>
      {featured && <div style={styles.featuredFlag}>⭐ In evidenza</div>}
      <div style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map((n) => (
          <span key={n} style={{ color: n <= item.rating ? "#f59e0b" : "#3f3f46", fontSize: 18 }}>
            ★
          </span>
        ))}
      </div>
      <p style={styles.textBody}>“{item.text}”</p>
      <div style={styles.metaRow}>
        <div style={{ ...styles.avatar, background: color }}>{initials(item.name)}</div>
        <div style={{ flex: 1 }}>
          <div style={styles.authorName}>{item.name}</div>
          <div style={styles.authorSub}>
            {schoolLabel(item.school_type)}
            {item.school_name ? ` · ${item.school_name}` : ""}
            {item.grade ? ` · ${item.grade}` : ""}
          </div>
        </div>
        <div style={styles.dateChip}>{relativeDate(item.created_at)}</div>
      </div>
    </article>
  );
}

// ============================================================================
// Styles
// ============================================================================
const styles: Record<string, React.CSSProperties> = {
  wrap: { fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" },
  statsBar: {
    display: "flex",
    gap: 24,
    justifyContent: "center",
    marginBottom: 28,
    flexWrap: "wrap",
  },
  statBlock: {
    padding: "16px 28px",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 16,
    textAlign: "center",
  },
  statValue: { fontSize: 28, fontWeight: 900, color: "#fff", letterSpacing: "-0.5px" },
  statLabel: { fontSize: 12, fontWeight: 700, letterSpacing: 0.8, color: "#a1a1aa", textTransform: "uppercase", marginTop: 4 },
  filterRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "center",
    marginBottom: 28,
  },
  filterBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "8px 14px",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 999,
    color: "#a1a1aa",
    fontSize: 13.5,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  filterBtnActive: {
    background: "rgba(168,85,247,0.14)",
    borderColor: "rgba(168,85,247,0.5)",
    color: "#fff",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
    gap: 16,
  },
  card: {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 20,
    padding: 22,
    display: "flex",
    flexDirection: "column",
    gap: 14,
    position: "relative",
    transition: "transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease",
  },
  cardFeatured: {
    background: "linear-gradient(135deg, rgba(168,85,247,0.10), rgba(236,72,153,0.06))",
    borderColor: "rgba(168,85,247,0.35)",
    boxShadow: "0 12px 32px rgba(168,85,247,0.12)",
  },
  featuredFlag: {
    position: "absolute",
    top: 12,
    right: 12,
    fontSize: 11,
    fontWeight: 900,
    letterSpacing: 0.5,
    padding: "3px 8px",
    borderRadius: 999,
    background: "rgba(168,85,247,0.2)",
    color: "#c084fc",
    border: "1px solid rgba(168,85,247,0.4)",
  },
  starsRow: { display: "inline-flex", gap: 2, lineHeight: 1 },
  textBody: {
    color: "#e4e4e7",
    fontSize: 15,
    lineHeight: 1.6,
    fontWeight: 400,
    fontStyle: "italic",
  },
  metaRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    borderTop: "1px solid rgba(255,255,255,0.06)",
    paddingTop: 14,
    marginTop: "auto",
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: "50%",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 800,
    fontSize: 14,
    color: "#fff",
    flexShrink: 0,
    letterSpacing: 0.3,
  },
  authorName: { fontSize: 14, fontWeight: 800, color: "#fff", lineHeight: 1.2 },
  authorSub: { fontSize: 12, color: "#a1a1aa", marginTop: 2, lineHeight: 1.3 },
  dateChip: { fontSize: 11, color: "#71717a", fontWeight: 600, flexShrink: 0 },
  emptyState: {
    textAlign: "center",
    padding: "40px 20px",
    color: "#a1a1aa",
    fontSize: 15,
  },
  errorBox: {
    padding: "12px 16px",
    background: "rgba(248,113,113,0.12)",
    border: "1px solid rgba(248,113,113,0.35)",
    borderRadius: 12,
    color: "#fca5a5",
    textAlign: "center",
  },
  spinner: {
    width: 32,
    height: 32,
    margin: "0 auto 12px",
    border: "3px solid rgba(255,255,255,0.15)",
    borderTopColor: "#a855f7",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
};
