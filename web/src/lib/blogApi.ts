// Voto+ website · Blog API client (used at build-time in Astro SSG + runtime in /admin).
//
// La base URL è configurabile via env `PUBLIC_BLOG_API_BASE`. In assenza:
//   - build/dev di sviluppo (interno al pod): 'http://localhost:8001/api'
//   - produzione (deploy su GitHub Pages): dominio backend prod definito nel workflow
//
// Le chiamate al build sono wrappate in try/catch per non rompere il deploy se il
// backend è offline: in tal caso ritornano una lista vuota e il sito viene
// rigenerato al prossimo dispatch quando il backend è di nuovo up.

export interface BlogArticleCard {
  slug: string;
  title: string;
  excerpt?: string | null;
  meta_title?: string | null;
  meta_description?: string | null;
  featured_image_url?: string | null;
  featured_image_alt?: string | null;
  author_name?: string | null;
  category_name?: string | null;
  category_slug?: string | null;
  tags: string[];
  tag_slugs: string[];
  reading_time_minutes: number;
  canonical_url?: string | null;
  published_at?: string | null;
}

export interface BlogArticleFull extends BlogArticleCard {
  content_html?: string;
}

export interface BlogCategory {
  slug: string;
  name: string;
  count: number;
}

const DEFAULT_BASE = "http://localhost:8001/api";

export function getApiBase(): string {
  // Astro esplicita PUBLIC_ prefix per env accessibili al client + build.
  // Anche l'admin panel usa questa base a runtime.
  const fromEnv = (import.meta as any).env?.PUBLIC_BLOG_API_BASE;
  return (fromEnv && String(fromEnv).replace(/\/+$/, "")) || DEFAULT_BASE;
}

async function safeFetchJson<T>(url: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) {
      console.warn(`[blogApi] ${url} → HTTP ${res.status}`);
      return fallback;
    }
    return (await res.json()) as T;
  } catch (err) {
    console.warn(`[blogApi] ${url} → fetch error`, err);
    return fallback;
  }
}

export async function listArticles(params: {
  page?: number;
  limit?: number;
  category?: string;
  tag?: string;
} = {}): Promise<{ items: BlogArticleCard[]; total: number; page: number; limit: number; has_next: boolean }> {
  const qs = new URLSearchParams();
  if (params.page) qs.set("page", String(params.page));
  if (params.limit) qs.set("limit", String(params.limit));
  if (params.category) qs.set("category", params.category);
  if (params.tag) qs.set("tag", params.tag);
  const q = qs.toString();
  const url = `${getApiBase()}/blog/articles${q ? `?${q}` : ""}`;
  return safeFetchJson(url, { items: [], total: 0, page: 1, limit: 12, has_next: false });
}

export async function getArticle(slug: string): Promise<{ article: BlogArticleFull; related: BlogArticleCard[] } | null> {
  const url = `${getApiBase()}/blog/articles/${encodeURIComponent(slug)}`;
  try {
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (res.status === 404) return null;
    if (!res.ok) {
      console.warn(`[blogApi] ${url} → HTTP ${res.status}`);
      return null;
    }
    return await res.json();
  } catch (err) {
    console.warn(`[blogApi] ${url} → fetch error`, err);
    return null;
  }
}

export async function listCategories(): Promise<BlogCategory[]> {
  const r = await safeFetchJson<{ items: BlogCategory[] }>(`${getApiBase()}/blog/categories`, { items: [] });
  return r.items || [];
}

export async function listAllPublishedSlugs(): Promise<BlogArticleCard[]> {
  // Paginiamo per assicurarci di prendere tutti i pubblicati (max ~500).
  const acc: BlogArticleCard[] = [];
  let page = 1;
  const limit = 50;
  while (page <= 20) {
    const r = await listArticles({ page, limit });
    acc.push(...r.items);
    if (!r.has_next) break;
    page += 1;
  }
  return acc;
}

export function formatDate(iso?: string | null): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" });
  } catch {
    return "";
  }
}
