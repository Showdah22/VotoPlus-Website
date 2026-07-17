// Voto+ website · Admin Blog panel (React SPA client-only).
//
// Pannello amministrativo per la gestione del blog. Girera esclusivamente
// nel browser (isolato via `client:only="react"`) e comunica con FastAPI via
// `PUBLIC_BLOG_API_BASE`.
//
// Flusso:
//   1. Login con email + password  → POST /api/auth/login  → JWT in sessionStorage
//   2. Fetch /api/auth/me per verificare is_admin: true (altrimenti kick)
//   3. Sezione ARTICOLI: lista, filtri (status, origin), edit modal, publish/unpublish/delete
//   4. Sezione WEBHOOK: audit log ultime 50 chiamate BabyLoveGrowth
//   5. Sezione EDITORIALE: brief, style guide, banned/preferred topics
//   6. Pulsante "Ricostruisci sito" (trigger GitHub Actions workflow_dispatch)
//
// Nota: NON esiste routing interno complesso (evitiamo react-router). Tab basati
// su state locale. La UI è mobile-friendly e resta usabile da tablet.

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { getApiBase } from "@/lib/blogApi";
import AnalyticsDashboard from "./AnalyticsDashboard";
import ContentPlanTab from "./ContentPlanTab";
import TestimonialsTab from "./TestimonialsTab";
import ContactRequestsTab from "./ContactRequestsTab";

// ============================================================================
// Types (mirror del backend)
// ============================================================================
interface Me {
  id: string;
  email: string;
  username: string;
  is_admin: boolean;
}

interface AdminArticle {
  id: string;
  slug: string;
  title: string;
  excerpt?: string | null;
  content_html?: string | null;
  meta_title?: string | null;
  meta_description?: string | null;
  featured_image_url?: string | null;
  featured_image_alt?: string | null;
  author_name?: string | null;
  category_name?: string | null;
  category_slug?: string | null;
  tags: string[];
  tag_slugs: string[];
  canonical_url?: string | null;
  status: "draft" | "published" | "archived";
  origin: "manual" | "babylovegrowth";
  external_id?: string | null;
  reading_time_minutes?: number;
  created_at?: string;
  updated_at?: string;
  published_at?: string | null;
  last_synced_at?: string | null;
  admin_locked_fields?: string[];
}

interface WebhookEvent {
  id: string;
  created_at: string;
  external_id?: string;
  title?: string;
  outcome: "created" | "updated" | "error";
  action?: string;
  http_status: number;
  duration_ms: number;
  error_message?: string;
}

interface EditorialConfig {
  brief: string;
  style_guide: string;
  banned_topics: string[];
  preferred_topics: string[];
  target_audience: string;
  notes: string;
  version: number;
  updated_at?: string | null;
}

// ============================================================================
// HTTP client
// ============================================================================
const TOKEN_KEY = "votoplus_admin_jwt";

function getToken(): string | null {
  try {
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}
function setToken(t: string | null) {
  try {
    if (t) sessionStorage.setItem(TOKEN_KEY, t);
    else sessionStorage.removeItem(TOKEN_KEY);
  } catch { /* no-op */ }
}

async function api<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const base = getApiBase();
  const headers = new Headers(opts.headers || {});
  headers.set("Accept", "application/json");
  if (!headers.has("Content-Type") && opts.body) headers.set("Content-Type", "application/json");
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const res = await fetch(`${base}${path}`, { ...opts, headers });
  if (res.status === 401) {
    setToken(null);
    throw new Error("Sessione scaduta — riautentica");
  }
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const j = await res.json();
      msg = j.detail || j.error || msg;
    } catch { /* body non json */ }
    throw new Error(msg);
  }
  if (res.status === 204) return undefined as any;
  return res.json();
}

// ============================================================================
// Login screen
// ============================================================================
function LoginScreen({ onLogin }: { onLogin: (jwt: string, me: Me) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api<{ access_token: string; user: Me }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      if (!res.user.is_admin) throw new Error("Questo account non ha permessi admin");
      setToken(res.access_token);
      onLogin(res.access_token, res.user);
    } catch (err: any) {
      setError(err?.message || "Login fallito");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.loginWrap}>
      <form style={styles.loginCard} onSubmit={submit}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <img src="/favicon.png" width={48} height={48} alt="Voto+" style={{ margin: "0 auto 14px" }} />
          <h1 style={{ fontSize: 26, fontWeight: 900, letterSpacing: -0.5 }}>Voto+ Admin</h1>
          <p style={{ color: "#a1a1aa", fontSize: 14, marginTop: 6 }}>Accesso al pannello di gestione blog</p>
        </div>
        <label style={styles.label}>Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoFocus
          autoComplete="username"
          style={styles.input}
          placeholder="admin@voto-plus.app"
        />
        <label style={styles.label}>Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
          style={styles.input}
        />
        {error && <div style={styles.errorBox}>{error}</div>}
        <button type="submit" disabled={loading} style={{ ...styles.btnPrimary, marginTop: 20, width: "100%" }}>
          {loading ? "Accesso in corso…" : "Accedi"}
        </button>
        <a href="/" style={{ display: "block", textAlign: "center", marginTop: 20, color: "#a1a1aa", fontSize: 13 }}>
          ← Torna al sito
        </a>
      </form>
    </div>
  );
}

// ============================================================================
// Article Editor (modal)
// ============================================================================
function ArticleEditor({
  article,
  onClose,
  onSaved,
}: {
  article: AdminArticle;
  onClose: () => void;
  onSaved: (a: AdminArticle) => void;
}) {
  const [form, setForm] = useState<AdminArticle>(article);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tagsText, setTagsText] = useState((article.tags || []).join(", "));

  const set = <K extends keyof AdminArticle>(k: K, v: AdminArticle[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const save = async () => {
    setError(null);
    setSaving(true);
    try {
      const body = {
        title: form.title,
        slug: form.slug,
        excerpt: form.excerpt,
        content_html: form.content_html,
        meta_title: form.meta_title,
        meta_description: form.meta_description,
        featured_image_url: form.featured_image_url,
        featured_image_alt: form.featured_image_alt,
        author_name: form.author_name,
        category_name: form.category_name,
        canonical_url: form.canonical_url,
        tags: tagsText
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      };
      const updated = await api<AdminArticle>(`/admin/blog/articles/${form.id}`, {
        method: "PUT",
        body: JSON.stringify(body),
      });
      onSaved(updated);
    } catch (err: any) {
      setError(err?.message || "Salvataggio fallito");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={styles.modalBackdrop} onClick={onClose}>
      <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
        <div style={styles.modalHead}>
          <h2 style={{ fontSize: 20, fontWeight: 900 }}>Modifica articolo</h2>
          <button onClick={onClose} style={styles.iconBtn} aria-label="Chiudi">✕</button>
        </div>
        <div style={styles.modalBody}>
          <div style={styles.chipRow}>
            <span style={{ ...styles.badge, background: form.status === "published" ? "#10b98122" : "#a855f722", color: form.status === "published" ? "#10b981" : "#a855f7" }}>
              {form.status}
            </span>
            <span style={{ ...styles.badge, background: "rgba(255,255,255,0.06)", color: "#a1a1aa" }}>
              origin: {form.origin}
            </span>
            {form.external_id && (
              <span style={{ ...styles.badge, background: "rgba(255,255,255,0.06)", color: "#a1a1aa" }}>
                ext: {form.external_id}
              </span>
            )}
          </div>

          <label style={styles.label}>Titolo</label>
          <input style={styles.input} value={form.title || ""} onChange={(e) => set("title", e.target.value)} />

          <label style={styles.label}>Slug URL</label>
          <input style={styles.input} value={form.slug || ""} onChange={(e) => set("slug", e.target.value)} />

          <label style={styles.label}>Estratto (excerpt)</label>
          <textarea rows={2} style={styles.textarea} value={form.excerpt || ""} onChange={(e) => set("excerpt", e.target.value)} />

          <label style={styles.label}>Categoria</label>
          <input style={styles.input} value={form.category_name || ""} onChange={(e) => set("category_name", e.target.value)} placeholder="Guide" />

          <label style={styles.label}>Tag (separati da virgola)</label>
          <input style={styles.input} value={tagsText} onChange={(e) => setTagsText(e.target.value)} placeholder="maturità, studio, metodo" />

          <label style={styles.label}>Autore</label>
          <input style={styles.input} value={form.author_name || ""} onChange={(e) => set("author_name", e.target.value)} />

          <label style={styles.label}>Immagine copertina (URL)</label>
          <input style={styles.input} value={form.featured_image_url || ""} onChange={(e) => set("featured_image_url", e.target.value)} placeholder="https://..." />

          <label style={styles.label}>Alt testo immagine</label>
          <input style={styles.input} value={form.featured_image_alt || ""} onChange={(e) => set("featured_image_alt", e.target.value)} />

          <label style={styles.label}>Meta title (SEO)</label>
          <input style={styles.input} value={form.meta_title || ""} onChange={(e) => set("meta_title", e.target.value)} />

          <label style={styles.label}>Meta description (SEO)</label>
          <textarea rows={2} style={styles.textarea} value={form.meta_description || ""} onChange={(e) => set("meta_description", e.target.value)} />

          <label style={styles.label}>Canonical URL (opzionale)</label>
          <input style={styles.input} value={form.canonical_url || ""} onChange={(e) => set("canonical_url", e.target.value)} placeholder="https://…" />

          <label style={styles.label}>Contenuto HTML</label>
          <textarea
            rows={16}
            style={{ ...styles.textarea, fontFamily: "ui-monospace, SFMono-Regular, monospace", fontSize: 13 }}
            value={form.content_html || ""}
            onChange={(e) => set("content_html", e.target.value)}
          />

          <div style={{ marginTop: 12 }}>
            <details>
              <summary style={{ cursor: "pointer", color: "#a1a1aa", fontSize: 13, fontWeight: 700 }}>
                Anteprima contenuto (sanitizzato lato server)
              </summary>
              <div
                style={{
                  marginTop: 12,
                  padding: 16,
                  background: "#0f0f14",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 12,
                  color: "#e4e4e7",
                  lineHeight: 1.65,
                }}
                dangerouslySetInnerHTML={{ __html: form.content_html || "" }}
              />
            </details>
          </div>

          {error && <div style={styles.errorBox}>{error}</div>}
        </div>

        <div style={styles.modalFoot}>
          <button onClick={onClose} style={styles.btnGhost}>Annulla</button>
          <button onClick={save} disabled={saving} style={styles.btnPrimary}>
            {saving ? "Salvataggio…" : "Salva modifiche"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Articles tab
// ============================================================================
function ArticlesTab({ onNotify }: { onNotify: (m: string, kind?: "info" | "error") => void }) {
  const [items, setItems] = useState<AdminArticle[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [filterOrigin, setFilterOrigin] = useState<string>("");
  const [editing, setEditing] = useState<AdminArticle | null>(null);
  const [creating, setCreating] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [q, setQ] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      qs.set("limit", "100");
      if (filterStatus) qs.set("status", filterStatus);
      if (filterOrigin) qs.set("origin", filterOrigin);
      if (q.trim().length >= 2) qs.set("q", q.trim());
      const res = await api<{ items: AdminArticle[]; total: number }>(`/admin/blog/articles?${qs}`);
      setItems(res.items);
      setTotal(res.total);
    } catch (err: any) {
      onNotify(err?.message || "Errore caricamento articoli", "error");
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterOrigin, q, onNotify]);

  useEffect(() => { load(); }, [load]);

  const publish = async (a: AdminArticle) => {
    try {
      const updated = await api<AdminArticle>(`/admin/blog/articles/${a.id}/publish`, { method: "POST" });
      setItems((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
      onNotify(`Articolo pubblicato: ${updated.title}`);
    } catch (err: any) {
      onNotify(err?.message || "Pubblicazione fallita", "error");
    }
  };

  const unpublish = async (a: AdminArticle) => {
    if (!confirm(`Rimuovere dalla pubblicazione "${a.title}"?`)) return;
    try {
      const updated = await api<AdminArticle>(`/admin/blog/articles/${a.id}/unpublish`, { method: "POST" });
      setItems((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
      onNotify(`Articolo rimosso dalla pubblicazione`);
    } catch (err: any) {
      onNotify(err?.message || "Operazione fallita", "error");
    }
  };

  const del = async (a: AdminArticle) => {
    if (!confirm(`Eliminare definitivamente "${a.title}"?`)) return;
    try {
      await api(`/admin/blog/articles/${a.id}`, { method: "DELETE" });
      setItems((prev) => prev.filter((x) => x.id !== a.id));
      onNotify("Articolo eliminato");
    } catch (err: any) {
      onNotify(err?.message || "Eliminazione fallita", "error");
    }
  };

  return (
    <div>
      <div style={styles.toolbar}>
        <input
          placeholder="Cerca (min 2 caratteri)…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ ...styles.input, maxWidth: 260, margin: 0 }}
        />
        <select style={styles.select} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">Tutti gli stati</option>
          <option value="draft">Bozze</option>
          <option value="published">Pubblicati</option>
          <option value="archived">Archiviati</option>
        </select>
        <select style={styles.select} value={filterOrigin} onChange={(e) => setFilterOrigin(e.target.value)}>
          <option value="">Tutte le origini</option>
          <option value="manual">Manuali</option>
          <option value="babylovegrowth">BabyLoveGrowth</option>
        </select>
        <button style={styles.btnGhost} onClick={load}>Aggiorna</button>
        <div style={{ flex: 1 }} />
        <button style={styles.btnGhost} onClick={() => setCreating(true)}>+ Nuovo (vuoto)</button>
        <button style={styles.btnPrimary} onClick={() => setAiGenerating(true)}>🤖 Genera con AI</button>
      </div>

      {loading ? (
        <div style={styles.center}>Caricamento…</div>
      ) : items.length === 0 ? (
        <div style={styles.center}>
          <p style={{ color: "#a1a1aa" }}>Nessun articolo trovato.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ color: "#71717a", fontSize: 13 }}>Totale: {total}</div>
          {items.map((a) => (
            <div key={a.id} style={styles.articleRow}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={styles.chipRow}>
                  <span style={{
                    ...styles.badge,
                    background: a.status === "published" ? "#10b98122" : a.status === "draft" ? "#a855f722" : "#71717a22",
                    color: a.status === "published" ? "#10b981" : a.status === "draft" ? "#a855f7" : "#a1a1aa",
                  }}>{a.status}</span>
                  {a.origin === "babylovegrowth" && (
                    <span style={{ ...styles.badge, background: "#06b6d422", color: "#06b6d4" }}>BLG</span>
                  )}
                  {a.category_name && <span style={{ ...styles.badge, background: "rgba(255,255,255,0.06)", color: "#a1a1aa" }}>{a.category_name}</span>}
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 800, marginTop: 8, marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis" }}>{a.title}</h3>
                <div style={{ fontSize: 12, color: "#71717a" }}>
                  /{a.slug} · aggiornato {a.updated_at ? new Date(a.updated_at).toLocaleString("it-IT") : "—"}
                </div>
              </div>
              <div style={styles.actions}>
                <button style={styles.btnGhost} onClick={() => setEditing(a)}>Modifica</button>
                {a.status !== "published" ? (
                  <button style={styles.btnPrimary} onClick={() => publish(a)}>Pubblica</button>
                ) : (
                  <button style={styles.btnGhost} onClick={() => unpublish(a)}>Rimuovi</button>
                )}
                <button style={{ ...styles.btnGhost, color: "#f87171", borderColor: "#f8717133" }} onClick={() => del(a)}>Elimina</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <ArticleEditor
          article={editing}
          onClose={() => setEditing(null)}
          onSaved={(a) => {
            setItems((prev) => prev.map((x) => (x.id === a.id ? a : x)));
            setEditing(null);
            onNotify("Modifiche salvate");
          }}
        />
      )}
      {creating && (
        <CreateArticleModal
          onClose={() => setCreating(false)}
          onCreated={(a) => {
            setItems((prev) => [a, ...prev]);
            setCreating(false);
            onNotify("Articolo creato come bozza");
          }}
        />
      )}
      {aiGenerating && (
        <AIGenerateModal
          onClose={() => setAiGenerating(false)}
          onCreated={(a) => {
            setItems((prev) => [a, ...prev]);
            setAiGenerating(false);
            onNotify(`✨ Articolo AI generato: ${a.title}`);
          }}
        />
      )}
    </div>
  );
}

// ============================================================================
// AI Generate Modal
// ============================================================================
function AIGenerateModal({ onClose, onCreated }: { onClose: () => void; onCreated: (a: AdminArticle) => void }) {
  const [topic, setTopic] = useState("");
  const [length, setLength] = useState<"short" | "medium" | "long">("medium");
  const [category, setCategory] = useState("");
  const [generateImage, setGenerateImage] = useState(true);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setError(null);
    setSaving(true);
    setProgress("🧠 Generazione testo in corso… (~30s)");
    try {
      const body = {
        topic,
        length,
        category_hint: category || undefined,
        generate_image: generateImage,
      };
      // Aggiorna il progress dopo un po'
      const t = setTimeout(() => setProgress("🎨 Testo pronto, generazione immagine… (~30s)"), 25000);
      const article = await api<AdminArticle>("/admin/blog/ai-generate", { method: "POST", body: JSON.stringify(body) });
      clearTimeout(t);
      onCreated(article);
    } catch (err: any) {
      setError(err?.message || "Generazione fallita");
    } finally {
      setSaving(false);
      setProgress("");
    }
  };

  const lengthLabels: Record<string, string> = { short: "Corto · ~500 parole (3 min lettura)", medium: "Medio · ~1000 parole (5-6 min)", long: "Lungo · ~2000 parole (10-12 min)" };

  return (
    <div style={styles.modalBackdrop} onClick={saving ? undefined : onClose}>
      <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
        <div style={styles.modalHead}>
          <h2 style={{ fontSize: 20, fontWeight: 900 }}>🤖 Genera articolo con AI</h2>
          <button onClick={onClose} style={styles.iconBtn} aria-label="Chiudi" disabled={saving}>✕</button>
        </div>
        <div style={styles.modalBody}>
          <p style={{ color: "#a1a1aa", fontSize: 13, marginBottom: 20 }}>
            L'AI userà la tua configurazione editoriale (tab Editoriale) come system prompt.
            Costo indicativo: ~0.25€ per articolo completo con immagine.
          </p>

          <label style={styles.label}>Tema / argomento *</label>
          <input
            style={styles.input}
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="es. Come studiare per la Maturità 2027 senza stress"
            autoFocus
            disabled={saving}
          />
          <p style={{ color: "#71717a", fontSize: 11, marginTop: 4 }}>Sii specifico: "Metodo Feynman per il liceo classico" funziona meglio di "Come studiare"</p>

          <label style={{ ...styles.label, marginTop: 16 }}>Lunghezza</label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {(["short", "medium", "long"] as const).map(l => (
              <button
                key={l}
                onClick={() => setLength(l)}
                disabled={saving}
                style={{ ...styles.btnGhost, ...(length === l ? { background: "rgba(168,85,247,0.14)", borderColor: "#a855f7", color: "#fff" } : {}) }}
              >
                {lengthLabels[l]}
              </button>
            ))}
          </div>

          <label style={{ ...styles.label, marginTop: 16 }}>Categoria (opzionale)</label>
          <select style={styles.input} value={category} onChange={(e) => setCategory(e.target.value)} disabled={saving}>
            <option value="">Lascia scegliere all'AI</option>
            <option value="Guide">Guide</option>
            <option value="Metodo di studio">Metodo di studio</option>
            <option value="Novità Voto+">Novità Voto+</option>
            <option value="Vita scolastica">Vita scolastica</option>
          </select>

          <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 20, cursor: "pointer" }}>
            <input type="checkbox" checked={generateImage} onChange={(e) => setGenerateImage(e.target.checked)} disabled={saving} />
            <span style={{ fontSize: 14, color: "#fff" }}>Genera anche immagine di copertina</span>
            <span style={{ fontSize: 11, color: "#71717a" }}>(+30s, ~0.15€)</span>
          </label>

          {saving && progress && (
            <div style={{ marginTop: 20, padding: "12px 16px", background: "rgba(168,85,247,0.1)", border: "1px solid rgba(168,85,247,0.3)", borderRadius: 10, color: "#a855f7", fontSize: 14 }}>
              {progress}
            </div>
          )}

          {error && <div style={styles.errorBox}>{error}</div>}
        </div>
        <div style={styles.modalFoot}>
          <button onClick={onClose} style={styles.btnGhost} disabled={saving}>Annulla</button>
          <button onClick={save} disabled={saving || topic.trim().length < 5} style={styles.btnPrimary}>
            {saving ? "Generazione…" : "✨ Genera bozza"}
          </button>
        </div>
      </div>
    </div>
  );
}

function CreateArticleModal({ onClose, onCreated }: { onClose: () => void; onCreated: (a: AdminArticle) => void }) {
  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [contentHtml, setContentHtml] = useState("<h2>Introduzione</h2><p>Scrivi qui…</p>");
  const [category, setCategory] = useState("");
  const [tags, setTags] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setError(null);
    setSaving(true);
    try {
      const body = {
        title,
        excerpt,
        content_html: contentHtml,
        category_name: category || undefined,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      };
      const created = await api<AdminArticle>("/admin/blog/articles", { method: "POST", body: JSON.stringify(body) });
      onCreated(created);
    } catch (err: any) {
      setError(err?.message || "Creazione fallita");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={styles.modalBackdrop} onClick={onClose}>
      <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
        <div style={styles.modalHead}>
          <h2 style={{ fontSize: 20, fontWeight: 900 }}>Nuovo articolo</h2>
          <button onClick={onClose} style={styles.iconBtn} aria-label="Chiudi">✕</button>
        </div>
        <div style={styles.modalBody}>
          <label style={styles.label}>Titolo *</label>
          <input style={styles.input} value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
          <label style={styles.label}>Estratto</label>
          <textarea rows={2} style={styles.textarea} value={excerpt} onChange={(e) => setExcerpt(e.target.value)} />
          <label style={styles.label}>Categoria</label>
          <input style={styles.input} value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Guide" />
          <label style={styles.label}>Tag (separati da virgola)</label>
          <input style={styles.input} value={tags} onChange={(e) => setTags(e.target.value)} />
          <label style={styles.label}>Contenuto HTML *</label>
          <textarea
            rows={12}
            style={{ ...styles.textarea, fontFamily: "ui-monospace, SFMono-Regular, monospace", fontSize: 13 }}
            value={contentHtml}
            onChange={(e) => setContentHtml(e.target.value)}
          />
          {error && <div style={styles.errorBox}>{error}</div>}
        </div>
        <div style={styles.modalFoot}>
          <button onClick={onClose} style={styles.btnGhost}>Annulla</button>
          <button onClick={save} disabled={saving || !title.trim()} style={styles.btnPrimary}>
            {saving ? "Creazione…" : "Crea bozza"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Webhook events tab
// ============================================================================
function WebhookTab({ onNotify }: { onNotify: (m: string, kind?: "info" | "error") => void }) {
  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api<{ items: WebhookEvent[] }>(`/admin/blog/webhook-events?limit=100`);
      setEvents(res.items);
    } catch (err: any) {
      onNotify(err?.message || "Errore caricamento log webhook", "error");
    } finally {
      setLoading(false);
    }
  }, [onNotify]);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <div style={styles.toolbar}>
        <div style={{ color: "#a1a1aa", fontSize: 14 }}>
          Log ricezioni webhook BabyLoveGrowth (ultime 100)
        </div>
        <div style={{ flex: 1 }} />
        <button style={styles.btnGhost} onClick={load}>Aggiorna</button>
      </div>
      {loading ? (
        <div style={styles.center}>Caricamento…</div>
      ) : events.length === 0 ? (
        <div style={styles.center}>
          <p style={{ color: "#a1a1aa" }}>Nessun evento webhook ancora registrato.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {events.map((e) => (
            <div key={e.id} style={styles.eventRow}>
              <div>
                <div style={styles.chipRow}>
                  <span style={{
                    ...styles.badge,
                    background: e.outcome === "error" ? "#f8717122" : e.outcome === "created" ? "#10b98122" : "#06b6d422",
                    color: e.outcome === "error" ? "#f87171" : e.outcome === "created" ? "#10b981" : "#06b6d4",
                  }}>{e.outcome}</span>
                  <span style={{ ...styles.badge, background: "rgba(255,255,255,0.06)", color: "#a1a1aa" }}>HTTP {e.http_status}</span>
                  <span style={{ ...styles.badge, background: "rgba(255,255,255,0.06)", color: "#a1a1aa" }}>{e.duration_ms}ms</span>
                </div>
                <div style={{ marginTop: 6, fontSize: 14, fontWeight: 700 }}>{e.title || "(senza titolo)"}</div>
                <div style={{ fontSize: 12, color: "#71717a", marginTop: 2 }}>
                  {new Date(e.created_at).toLocaleString("it-IT")}
                  {e.external_id && <span> · ext:{e.external_id}</span>}
                </div>
                {e.error_message && (
                  <div style={{ marginTop: 6, fontSize: 12, color: "#f87171" }}>{e.error_message}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Editorial config tab
// ============================================================================
function EditorialTab({ onNotify }: { onNotify: (m: string, kind?: "info" | "error") => void }) {
  const [cfg, setCfg] = useState<EditorialConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bannedText, setBannedText] = useState("");
  const [preferredText, setPreferredText] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const c = await api<EditorialConfig>("/admin/blog/editorial-config");
        setCfg(c);
        setBannedText((c.banned_topics || []).join(", "));
        setPreferredText((c.preferred_topics || []).join(", "));
      } catch (err: any) {
        onNotify(err?.message || "Errore caricamento config", "error");
      }
    })();
  }, [onNotify]);

  if (!cfg) return <div style={styles.center}>Caricamento…</div>;

  const save = async () => {
    if (!cfg) return;
    setSaving(true);
    setError(null);
    try {
      const body = {
        brief: cfg.brief,
        style_guide: cfg.style_guide,
        target_audience: cfg.target_audience,
        notes: cfg.notes,
        banned_topics: bannedText.split(",").map((s) => s.trim()).filter(Boolean),
        preferred_topics: preferredText.split(",").map((s) => s.trim()).filter(Boolean),
      };
      const updated = await api<EditorialConfig>("/admin/blog/editorial-config", {
        method: "PUT",
        body: JSON.stringify(body),
      });
      setCfg(updated);
      onNotify(`Configurazione salvata (versione ${updated.version})`);
    } catch (err: any) {
      setError(err?.message || "Salvataggio fallito");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <p style={{ color: "#a1a1aa", fontSize: 14, lineHeight: 1.5 }}>
          Definisci la linea editoriale che BabyLoveGrowth deve seguire per generare articoli
          coerenti con il tono di voce di Voto+. Le modifiche vengono versionate.
        </p>
        {cfg.updated_at && (
          <p style={{ color: "#71717a", fontSize: 12, marginTop: 6 }}>
            Ultima modifica: {new Date(cfg.updated_at).toLocaleString("it-IT")} · v{cfg.version}
          </p>
        )}
      </div>

      <label style={styles.label}>Brief editoriale principale</label>
      <textarea rows={5} style={styles.textarea} value={cfg.brief} onChange={(e) => setCfg({ ...cfg, brief: e.target.value })} />

      <label style={styles.label}>Style guide / tone of voice</label>
      <textarea rows={5} style={styles.textarea} value={cfg.style_guide} onChange={(e) => setCfg({ ...cfg, style_guide: e.target.value })} />

      <label style={styles.label}>Target audience</label>
      <textarea rows={2} style={styles.textarea} value={cfg.target_audience} onChange={(e) => setCfg({ ...cfg, target_audience: e.target.value })} placeholder="Es: studenti scuole superiori italiane, 14-19 anni" />

      <label style={styles.label}>Argomenti preferiti (separati da virgola)</label>
      <input style={styles.input} value={preferredText} onChange={(e) => setPreferredText(e.target.value)} />

      <label style={styles.label}>Argomenti banditi (separati da virgola)</label>
      <input style={styles.input} value={bannedText} onChange={(e) => setBannedText(e.target.value)} />

      <label style={styles.label}>Note operative interne</label>
      <textarea rows={3} style={styles.textarea} value={cfg.notes} onChange={(e) => setCfg({ ...cfg, notes: e.target.value })} />

      {error && <div style={styles.errorBox}>{error}</div>}
      <div style={{ marginTop: 20 }}>
        <button style={styles.btnPrimary} onClick={save} disabled={saving}>
          {saving ? "Salvataggio…" : "Salva configurazione"}
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Main panel
// ============================================================================
type Tab = "articles" | "plan" | "analytics" | "testimonials" | "requests" | "webhook" | "editorial";

export default function AdminPanel() {
  const [me, setMe] = useState<Me | null>(null);
  const [booting, setBooting] = useState(true);
  const [tab, setTab] = useState<Tab>("articles");
  const [notice, setNotice] = useState<{ msg: string; kind: "info" | "error" } | null>(null);
  const [rebuildLoading, setRebuildLoading] = useState(false);

  const notify = useCallback((msg: string, kind: "info" | "error" = "info") => {
    setNotice({ msg, kind });
    setTimeout(() => setNotice(null), 4000);
  }, []);

  useEffect(() => {
    (async () => {
      const t = getToken();
      if (!t) {
        setBooting(false);
        return;
      }
      try {
        const u = await api<Me>("/auth/me");
        if (u.is_admin) setMe(u);
        else setToken(null);
      } catch { setToken(null); }
      finally { setBooting(false); }
    })();
  }, []);

  const logout = () => {
    setToken(null);
    setMe(null);
  };

  const triggerRebuild = async () => {
    setRebuildLoading(true);
    try {
      const res = await api<{ status: string; workflow: string }>("/admin/blog/rebuild", { method: "POST" });
      notify(`Rebuild avviato (${res.workflow})`);
    } catch (err: any) {
      notify(err?.message || "Rebuild fallito", "error");
    } finally {
      setRebuildLoading(false);
    }
  };

  if (booting) return <div style={styles.center}>Verifica sessione…</div>;
  if (!me) return <LoginScreen onLogin={(_, u) => setMe(u)} />;

  return (
    <div style={styles.appWrap}>
      <header style={styles.appBar}>
        <div style={styles.appBarInner}>
          <a href="/" style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img src="/favicon.png" width={28} height={28} alt="Voto+" />
            <div>
              <div style={{ fontWeight: 900, fontSize: 15 }}>Voto+ Admin</div>
              <div style={{ fontSize: 11, color: "#a1a1aa" }}>Pannello blog</div>
            </div>
          </a>
          <nav style={styles.tabs}>
            <button style={tab === "articles" ? styles.tabActive : styles.tab} onClick={() => setTab("articles")}>Articoli</button>
            <button style={tab === "plan" ? styles.tabActive : styles.tab} onClick={() => setTab("plan")}>📅 Piano</button>
            <button style={tab === "analytics" ? styles.tabActive : styles.tab} onClick={() => setTab("analytics")}>📊 Analytics</button>
            <button style={tab === "testimonials" ? styles.tabActive : styles.tab} onClick={() => setTab("testimonials")}>💬 Recensioni</button>
            <button style={tab === "requests" ? styles.tabActive : styles.tab} onClick={() => setTab("requests")}>📮 Richieste</button>
            <button style={tab === "webhook" ? styles.tabActive : styles.tab} onClick={() => setTab("webhook")}>Webhook</button>
            <button style={tab === "editorial" ? styles.tabActive : styles.tab} onClick={() => setTab("editorial")}>Editoriale</button>
          </nav>
          <div style={styles.userChip}>
            <button style={styles.btnGhost} onClick={triggerRebuild} disabled={rebuildLoading}>
              {rebuildLoading ? "Rebuild…" : "↻ Ricostruisci sito"}
            </button>
            <span style={{ fontSize: 13, color: "#a1a1aa" }}>{me.email}</span>
            <button style={styles.btnGhost} onClick={logout}>Esci</button>
          </div>
        </div>
      </header>

      {notice && (
        <div
          style={{
            ...styles.notice,
            background: notice.kind === "error" ? "#f8717122" : "#10b98122",
            color: notice.kind === "error" ? "#fca5a5" : "#6ee7b7",
            borderColor: notice.kind === "error" ? "#f8717155" : "#10b98155",
          }}
        >
          {notice.msg}
        </div>
      )}

      <main style={styles.mainArea}>
        {tab === "articles" && <ArticlesTab onNotify={notify} />}
        {tab === "plan" && <ContentPlanTab onNotify={notify} />}
        {tab === "analytics" && <AnalyticsDashboard onNotify={notify} />}
        {tab === "testimonials" && <TestimonialsTab onNotify={notify} />}
        {tab === "requests" && <ContactRequestsTab onNotify={notify} />}
        {tab === "webhook" && <WebhookTab onNotify={notify} />}
        {tab === "editorial" && <EditorialTab onNotify={notify} />}
      </main>
    </div>
  );
}

// ============================================================================
// Styles (inline per evitare CSS extra, coerenti con la palette del sito)
// ============================================================================
const styles: Record<string, React.CSSProperties> = {
  appWrap: { minHeight: "100vh", background: "#0a0a0f", color: "#fff", fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" },
  appBar: { position: "sticky", top: 0, zIndex: 20, background: "rgba(10,10,15,0.85)", backdropFilter: "blur(14px)", borderBottom: "1px solid rgba(255,255,255,0.08)" },
  appBarInner: { maxWidth: 1200, margin: "0 auto", padding: "12px 20px", display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" },
  tabs: { display: "flex", gap: 4, marginLeft: "auto", marginRight: "auto" },
  tab: { padding: "8px 14px", borderRadius: 999, background: "transparent", border: "1px solid transparent", color: "#a1a1aa", cursor: "pointer", fontWeight: 700, fontSize: 14 },
  tabActive: { padding: "8px 14px", borderRadius: 999, background: "rgba(168,85,247,0.14)", border: "1px solid rgba(168,85,247,0.3)", color: "#fff", cursor: "pointer", fontWeight: 800, fontSize: 14 },
  userChip: { display: "flex", alignItems: "center", gap: 10 },
  mainArea: { maxWidth: 1200, margin: "0 auto", padding: "28px 20px 80px" },
  toolbar: { display: "flex", gap: 10, alignItems: "center", marginBottom: 20, flexWrap: "wrap" },
  loginWrap: { minHeight: "100vh", background: "linear-gradient(180deg,#0a0a0f,#050508)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, color: "#fff", fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" },
  loginCard: { width: "100%", maxWidth: 420, background: "#12121a", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: "32px 28px" },
  label: { display: "block", fontSize: 12, fontWeight: 800, letterSpacing: 0.4, color: "#a1a1aa", marginTop: 14, marginBottom: 6, textTransform: "uppercase" },
  input: { width: "100%", padding: "12px 14px", background: "#0f0f14", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, color: "#fff", fontSize: 15, marginBottom: 6, outline: "none" },
  textarea: { width: "100%", padding: "12px 14px", background: "#0f0f14", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, color: "#fff", fontSize: 14, marginBottom: 6, outline: "none", resize: "vertical", fontFamily: "inherit" },
  select: { padding: "10px 14px", background: "#0f0f14", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, color: "#fff", fontSize: 14 },
  btnPrimary: { padding: "10px 18px", background: "linear-gradient(135deg,#a855f7,#ec4899)", color: "#fff", border: "none", borderRadius: 999, fontWeight: 800, fontSize: 14, cursor: "pointer" },
  btnGhost: { padding: "9px 16px", background: "transparent", color: "#fff", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 999, fontWeight: 700, fontSize: 13, cursor: "pointer" },
  errorBox: { marginTop: 12, padding: "10px 14px", background: "#f8717122", border: "1px solid #f8717155", borderRadius: 10, color: "#fca5a5", fontSize: 14 },
  center: { padding: 60, textAlign: "center", color: "#a1a1aa" },
  notice: { maxWidth: 1200, margin: "12px auto 0", padding: "10px 16px", borderRadius: 12, border: "1px solid" },
  articleRow: { display: "flex", gap: 20, alignItems: "center", padding: 16, background: "#12121a", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, flexWrap: "wrap" },
  actions: { display: "flex", gap: 8, flexWrap: "wrap" },
  chipRow: { display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" },
  badge: { padding: "3px 8px", borderRadius: 6, fontSize: 11, fontWeight: 800, letterSpacing: 0.5, textTransform: "uppercase" },
  eventRow: { padding: 14, background: "#12121a", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12 },
  modalBackdrop: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, overflowY: "auto" },
  modalCard: { width: "100%", maxWidth: 780, maxHeight: "90vh", background: "#0f0f14", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, display: "flex", flexDirection: "column", overflow: "hidden" },
  modalHead: { padding: "18px 24px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between" },
  modalBody: { padding: "20px 24px", overflowY: "auto", flex: 1 },
  modalFoot: { padding: "16px 24px", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "flex-end", gap: 10 },
  iconBtn: { background: "transparent", border: "none", color: "#a1a1aa", cursor: "pointer", fontSize: 20, padding: 4 },
};
