// Voto+ Admin · Sezione "Piano editoriale" (content plan + scheduler).

import React, { useCallback, useEffect, useState } from "react";
import { getApiBase } from "@/lib/blogApi";

const TOKEN_KEY = "votoplus_admin_jwt";

async function api<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const token = sessionStorage.getItem(TOKEN_KEY);
  const headers = new Headers(opts.headers || {});
  headers.set("Authorization", `Bearer ${token}`);
  headers.set("Accept", "application/json");
  if (opts.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const r = await fetch(`${getApiBase()}${path}`, { ...opts, headers });
  if (!r.ok) {
    let msg = `HTTP ${r.status}`;
    try { const j = await r.json(); msg = j.detail || msg; } catch {}
    throw new Error(msg);
  }
  if (r.status === 204) return undefined as any;
  return r.json();
}

interface PlanItem {
  id: string;
  topic: string;
  category: string;
  length: string;
  keyword_primary: string;
  rationale: string;
  status: string;  // queued | generating | published | skipped | error
  article_id: string | null;
  error_message: string | null;
  generated_at: string | null;
}

interface Plan {
  _id?: string;
  month: string;
  theme_of_month: string;
  status: string;  // draft | active | archived | not_created
  items: PlanItem[];
  approved_at?: string;
  updated_at?: string;
}

interface SchedulerSettings {
  paused: boolean;
  articles_per_month: number;
  notify_email: string;
  notify_on_success: boolean;
  notify_on_error: boolean;
  last_tick_at?: string | null;
}

const CATEGORIES = ["Guide", "Metodo di studio", "Novità Voto+", "Vita scolastica"];
const STATUS_COLORS: Record<string, { bg: string; fg: string; label: string }> = {
  queued: { bg: "#a855f722", fg: "#a855f7", label: "In coda" },
  generating: { bg: "#f59e0b22", fg: "#f59e0b", label: "In generazione…" },
  published: { bg: "#10b98122", fg: "#10b981", label: "Pubblicato" },
  skipped: { bg: "#71717a22", fg: "#a1a1aa", label: "Saltato" },
  error: { bg: "#f8717122", fg: "#f87171", label: "Errore" },
};

export default function ContentPlanTab({ onNotify }: { onNotify: (m: string, k?: "info" | "error") => void }) {
  const [plan, setPlan] = useState<Plan | null>(null);
  const [settings, setSettings] = useState<SchedulerSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [month] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM corrente

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, s] = await Promise.all([
        api<Plan>(`/admin/blog/content-plan/current?month=${month}`),
        api<SchedulerSettings>("/admin/blog/scheduler/settings"),
      ]);
      setPlan(p);
      setSettings(s);
    } catch (err: any) {
      onNotify(err?.message || "Errore caricamento", "error");
    } finally {
      setLoading(false);
    }
  }, [month, onNotify]);

  useEffect(() => { load(); }, [load]);

  const genPlan = async () => {
    if (plan?.status === "active" && !confirm("Esiste già un piano attivo. Vuoi sostituirlo?")) return;
    setGenerating(true);
    try {
      await api<Plan>("/admin/blog/content-plan/generate", { method: "POST", body: JSON.stringify({ month, count: 10 }) });
      onNotify("Piano generato — rivedi e approva quando pronto");
      await load();
    } catch (err: any) {
      onNotify(err?.message || "Generazione fallita", "error");
    } finally {
      setGenerating(false);
    }
  };

  const approvePlan = async () => {
    if (!plan) return;
    if (!confirm("Approvare questo piano? Da questo momento gli articoli verranno generati e PUBBLICATI automaticamente ogni 3 giorni.")) return;
    try {
      await api(`/admin/blog/content-plan/${plan.month}/approve`, { method: "POST" });
      onNotify("Piano attivato! Il primo articolo verrà pubblicato al prossimo cron (max 3 giorni)");
      load();
    } catch (err: any) { onNotify(err?.message || "Errore", "error"); }
  };

  const deletePlan = async () => {
    if (!plan) return;
    if (!confirm(`Eliminare il piano di ${plan.month}?`)) return;
    try {
      await api(`/admin/blog/content-plan/${plan.month}`, { method: "DELETE" });
      onNotify("Piano eliminato");
      load();
    } catch (err: any) { onNotify(err?.message || "Errore", "error"); }
  };

  const updateItem = async (itemId: string, updates: Partial<PlanItem>) => {
    if (!plan) return;
    try {
      const upd = await api<Plan>(`/admin/blog/content-plan/${plan.month}`, {
        method: "PUT",
        body: JSON.stringify({ items: [{ id: itemId, ...updates }] }),
      });
      setPlan(upd);
    } catch (err: any) { onNotify(err?.message || "Errore", "error"); }
  };

  const reorder = async (id: string, direction: "up" | "down") => {
    if (!plan) return;
    const idx = plan.items.findIndex(i => i.id === id);
    if (idx < 0) return;
    const newIdx = direction === "up" ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= plan.items.length) return;
    const ids = plan.items.map(i => i.id);
    [ids[idx], ids[newIdx]] = [ids[newIdx], ids[idx]];
    try {
      const upd = await api<Plan>(`/admin/blog/content-plan/${plan.month}`, {
        method: "PUT",
        body: JSON.stringify({ reorder_ids: ids }),
      });
      setPlan(upd);
    } catch (err: any) { onNotify(err?.message || "Errore", "error"); }
  };

  const togglePause = async () => {
    if (!settings) return;
    try {
      const s = await api<SchedulerSettings>("/admin/blog/scheduler/settings", {
        method: "PUT",
        body: JSON.stringify({ paused: !settings.paused }),
      });
      setSettings(s);
      onNotify(s.paused ? "Automazione in pausa" : "Automazione riattivata");
    } catch (err: any) { onNotify(err?.message || "Errore", "error"); }
  };

  const runTickNow = async () => {
    if (!confirm("Vuoi generare + pubblicare SUBITO il prossimo articolo del piano? (Ci vorrà ~1 minuto)")) return;
    try {
      // Chiamiamo il tick con force=true; usa l'endpoint pubblico (auth via secret) — l'admin lo triggera dal pannello via endpoint dedicato usando il proprio JWT
      onNotify("Esecuzione manuale non ancora esposta via UI — vai su GitHub Actions → 'Blog Auto-Publish' → Run workflow, oppure attendi il prossimo cron", "info");
    } catch (err: any) { onNotify(err?.message || "Errore", "error"); }
  };

  if (loading) return <div style={{ padding: 60, textAlign: "center", color: "#a1a1aa" }}>Caricamento…</div>;

  const isActive = plan?.status === "active";
  const publishedCount = plan?.items?.filter(i => i.status === "published").length || 0;
  const queuedCount = plan?.items?.filter(i => i.status === "queued").length || 0;

  return (
    <div>
      {/* HEADER */}
      <div style={styles.headerCard}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 900, margin: 0 }}>📅 Piano editoriale · {month}</h2>
          {plan?.theme_of_month && <p style={{ color: "#a1a1aa", fontSize: 14, marginTop: 6 }}>“{plan.theme_of_month}”</p>}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {!plan || plan.status === "not_created" ? (
            <button style={styles.btnPrimary} onClick={genPlan} disabled={generating}>
              {generating ? "Generazione (~30s)…" : "🤖 Genera piano di 10 articoli"}
            </button>
          ) : (
            <>
              {plan.status === "draft" && (
                <>
                  <button style={styles.btnPrimary} onClick={approvePlan}>✅ Approva & attiva</button>
                  <button style={styles.btnGhost} onClick={genPlan} disabled={generating}>{generating ? "…" : "🔄 Rigenera"}</button>
                </>
              )}
              {plan.status !== "active" && (
                <button style={{ ...styles.btnGhost, color: "#f87171", borderColor: "#f8717133" }} onClick={deletePlan}>🗑 Elimina</button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Automation status card */}
      {isActive && settings && (
        <div style={{ ...styles.headerCard, marginTop: 12 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: settings.paused ? "#f59e0b" : "#10b981", boxShadow: `0 0 12px ${settings.paused ? "#f59e0b" : "#10b981"}`, animation: "pulse-dot 2s ease-in-out infinite" }} />
              <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>
                Automazione {settings.paused ? "in pausa" : "attiva"}
              </h3>
            </div>
            <p style={{ color: "#a1a1aa", fontSize: 13, marginTop: 6 }}>
              Pubblicati: <strong style={{ color: "#10b981" }}>{publishedCount}</strong> · In coda: <strong style={{ color: "#a855f7" }}>{queuedCount}</strong>
              {settings.last_tick_at && <> · Ultimo tick: {new Date(settings.last_tick_at).toLocaleString("it-IT")}</>}
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button style={styles.btnGhost} onClick={togglePause}>
              {settings.paused ? "▶️ Riattiva" : "⏸ Metti in pausa"}
            </button>
            <button style={styles.btnGhost} onClick={runTickNow}>⚡ Genera ora</button>
          </div>
        </div>
      )}

      {/* LISTA ITEM DEL PIANO */}
      {plan && plan.items && plan.items.length > 0 && (
        <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 10 }}>
          {plan.items.map((it, idx) => {
            const sc = STATUS_COLORS[it.status] || STATUS_COLORS.queued;
            return (
              <div key={it.id} style={styles.itemRow}>
                <div style={styles.orderCell}>
                  <button style={styles.arrowBtn} onClick={() => reorder(it.id, "up")} disabled={idx === 0}>▲</button>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "#71717a" }}>{idx + 1}</div>
                  <button style={styles.arrowBtn} onClick={() => reorder(it.id, "down")} disabled={idx === plan.items.length - 1}>▼</button>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", marginBottom: 6 }}>
                    <span style={{ ...styles.badge, background: sc.bg, color: sc.fg }}>{sc.label}</span>
                    <span style={{ ...styles.badge, background: "rgba(255,255,255,0.06)", color: "#a1a1aa" }}>{it.category}</span>
                    <span style={{ ...styles.badge, background: "rgba(255,255,255,0.06)", color: "#a1a1aa" }}>{it.length}</span>
                    {it.keyword_primary && <span style={{ ...styles.badge, background: "#06b6d422", color: "#06b6d4" }}>🔍 {it.keyword_primary}</span>}
                  </div>
                  <input
                    type="text"
                    value={it.topic}
                    onChange={(e) => setPlan(p => p ? { ...p, items: p.items.map(x => x.id === it.id ? { ...x, topic: e.target.value } : x) } : p)}
                    onBlur={(e) => e.target.value !== it.topic && updateItem(it.id, { topic: e.target.value })}
                    style={styles.topicInput}
                    disabled={it.status === "published" || it.status === "generating"}
                  />
                  {it.rationale && <div style={{ fontSize: 11, color: "#71717a", marginTop: 6 }}>💡 {it.rationale}</div>}
                  {it.error_message && <div style={{ fontSize: 12, color: "#f87171", marginTop: 6 }}>❌ {it.error_message}</div>}
                </div>
                <div>
                  {it.status === "queued" && (
                    <select
                      value={it.status}
                      onChange={(e) => updateItem(it.id, { status: e.target.value as any })}
                      style={styles.select}
                    >
                      <option value="queued">In coda</option>
                      <option value="skipped">Salta</option>
                    </select>
                  )}
                  {it.article_id && (
                    <a href={`/admin`} onClick={() => onNotify("Vai al tab Articoli per vedere il dettaglio")} style={{ fontSize: 12, color: "#a855f7", textDecoration: "underline" }}>
                      Vedi articolo →
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* EMPTY STATE */}
      {(!plan || plan.status === "not_created") && (
        <div style={{ textAlign: "center", padding: 60, color: "#71717a" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🌱</div>
          <p style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 8 }}>Nessun piano editoriale per {month}</p>
          <p style={{ fontSize: 14, maxWidth: 400, margin: "0 auto 24px" }}>
            Genera un piano di 10 articoli AI in ~30 secondi. Poi rileggi, riordina e approva → il resto è automatico ogni 3 giorni.
          </p>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  headerCard: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", background: "linear-gradient(180deg,#12121a,#0e0e14)", border: "1px solid rgba(168,85,247,0.2)", borderRadius: 16, gap: 12, flexWrap: "wrap" },
  btnPrimary: { padding: "10px 18px", background: "linear-gradient(135deg,#a855f7,#ec4899)", color: "#fff", border: "none", borderRadius: 999, fontWeight: 800, fontSize: 13, cursor: "pointer" },
  btnGhost: { padding: "9px 16px", background: "transparent", color: "#fff", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 999, fontWeight: 700, fontSize: 12, cursor: "pointer" },
  itemRow: { display: "flex", gap: 12, alignItems: "flex-start", padding: 14, background: "#12121a", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12 },
  orderCell: { display: "flex", flexDirection: "column", gap: 2, alignItems: "center", minWidth: 24 },
  arrowBtn: { background: "transparent", border: "none", color: "#71717a", cursor: "pointer", fontSize: 10, padding: 0 },
  badge: { padding: "3px 8px", borderRadius: 6, fontSize: 11, fontWeight: 800, letterSpacing: 0.5, textTransform: "uppercase" },
  topicInput: { width: "100%", padding: "8px 10px", background: "#0f0f14", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, color: "#fff", fontSize: 15, fontWeight: 700, outline: "none" },
  select: { padding: "6px 10px", background: "#0f0f14", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, color: "#fff", fontSize: 12 },
};
