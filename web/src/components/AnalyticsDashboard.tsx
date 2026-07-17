// Voto+ Admin · Analytics dashboard con stile neon.
// Grafici recharts + gradient viola→ciano + linea "scan" animata.

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getApiBase } from "@/lib/blogApi";

const TOKEN_KEY = "votoplus_admin_jwt";

async function fetchApi<T>(path: string): Promise<T> {
  const token = sessionStorage.getItem(TOKEN_KEY);
  const r = await fetch(`${getApiBase()}${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

interface Overview {
  period_days: number;
  visitors_period: number;
  visitors_prev: number;
  pageviews_period: number;
  pageviews_prev: number;
  realtime_active: number;
  source_split: Record<string, number>;
  device_split: Record<string, number>;
}

interface DailyRow { date: string; visitors: number; pageviews: number }
interface TopRow { path: string; views: number; unique_visitors: number; title?: string; category_name?: string }
interface RealtimeRow { path: string; views: number; last_seen: string }

const NEON_PURPLE = "#a855f7";
const NEON_CYAN = "#06b6d4";
const NEON_GREEN = "#10b981";
const NEON_ORANGE = "#f59e0b";
const NEON_PINK = "#ec4899";

function trendPct(now: number, prev: number): { pct: number; up: boolean } {
  if (!prev) return { pct: now > 0 ? 100 : 0, up: true };
  const p = ((now - prev) / prev) * 100;
  return { pct: Math.round(Math.abs(p)), up: p >= 0 };
}

const SourceColors: Record<string, string> = {
  search: NEON_CYAN,
  direct: NEON_PURPLE,
  social: NEON_PINK,
  referral: NEON_ORANGE,
  internal: "#71717a",
};

export default function AnalyticsDashboard({ onNotify }: { onNotify: (m: string, k?: "info" | "error") => void }) {
  const [days, setDays] = useState(30);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [daily, setDaily] = useState<DailyRow[]>([]);
  const [topPages, setTopPages] = useState<TopRow[]>([]);
  const [topArticles, setTopArticles] = useState<TopRow[]>([]);
  const [realtime, setRealtime] = useState<{ active_sessions: number; active_paths: RealtimeRow[] } | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ov, d, tp, ta] = await Promise.all([
        fetchApi<Overview>(`/admin/analytics/overview?days=${days}`),
        fetchApi<{ days: DailyRow[] }>(`/admin/analytics/daily?days=${days}`),
        fetchApi<{ items: TopRow[] }>(`/admin/analytics/top-pages?days=${days}&limit=10`),
        fetchApi<{ items: TopRow[] }>(`/admin/analytics/top-articles?days=${days}&limit=10`),
      ]);
      setOverview(ov);
      setDaily(d.days);
      setTopPages(tp.items);
      setTopArticles(ta.items);
    } catch (err: any) {
      onNotify(err?.message || "Errore caricamento analytics", "error");
    } finally {
      setLoading(false);
    }
  }, [days, onNotify]);

  const loadRealtime = useCallback(async () => {
    try {
      const rt = await fetchApi<any>("/admin/analytics/realtime");
      setRealtime(rt);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    loadRealtime();
    const t = setInterval(loadRealtime, 20 * 1000);
    return () => clearInterval(t);
  }, [loadRealtime]);

  const trendVisitors = useMemo(() => (overview ? trendPct(overview.visitors_period, overview.visitors_prev) : null), [overview]);
  const trendPageviews = useMemo(() => (overview ? trendPct(overview.pageviews_period, overview.pageviews_prev) : null), [overview]);

  const sourceData = useMemo(() => {
    if (!overview) return [];
    return Object.entries(overview.source_split).map(([k, v]) => ({ name: k, value: v, color: SourceColors[k] || "#a1a1aa" }));
  }, [overview]);

  const deviceData = useMemo(() => {
    if (!overview) return [];
    const m: Record<string, string> = { desktop: NEON_PURPLE, mobile: NEON_CYAN, tablet: NEON_PINK };
    return Object.entries(overview.device_split).map(([k, v]) => ({ name: k, value: v, color: m[k] || "#a1a1aa" }));
  }, [overview]);

  if (loading && !overview) return <div style={{ padding: 60, textAlign: "center", color: "#a1a1aa" }}>Caricamento analytics…</div>;

  return (
    <div>
      {/* HEADER + SELETTORE PERIODO */}
      <div style={styles.header}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 900, margin: 0 }}>Analytics <span style={{ color: NEON_GREEN, fontSize: 12, marginLeft: 8, verticalAlign: "middle" }}>● LIVE</span></h2>
          <p style={{ color: "#a1a1aa", fontSize: 13, marginTop: 6 }}>Traffico anonimizzato del sito votoplus.it — privacy-first, no cookies</p>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {[7, 30, 90].map(d => (
            <button key={d} onClick={() => setDays(d)}
              style={{ ...styles.chip, ...(days === d ? styles.chipActive : {}) }}>
              {d}gg
            </button>
          ))}
          <button onClick={load} style={styles.chip}>↻</button>
        </div>
      </div>

      {/* KPI CARDS con linea neon scan */}
      <div style={styles.kpiGrid}>
        <KpiCard
          label="Visitatori"
          value={overview?.visitors_period ?? 0}
          trend={trendVisitors}
          color={NEON_CYAN}
        />
        <KpiCard
          label="Pageviews"
          value={overview?.pageviews_period ?? 0}
          trend={trendPageviews}
          color={NEON_PURPLE}
        />
        <KpiCard
          label="Attivi ora"
          value={overview?.realtime_active ?? 0}
          color={NEON_GREEN}
          pulse
        />
        <KpiCard
          label="Pagine/sessione"
          value={overview?.visitors_period ? Number((overview.pageviews_period / overview.visitors_period).toFixed(1)) : 0}
          color={NEON_ORANGE}
        />
      </div>

      {/* GRAFICO AREA GIORNALIERO */}
      <div style={styles.chartCard}>
        <div style={styles.chartHeader}>
          <h3 style={styles.chartTitle}>Andamento — ultimi {days} giorni</h3>
        </div>
        <div style={{ height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={daily} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
              <defs>
                <linearGradient id="gVisitors" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={NEON_CYAN} stopOpacity={0.55} />
                  <stop offset="100%" stopColor={NEON_CYAN} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gPageviews" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={NEON_PURPLE} stopOpacity={0.5} />
                  <stop offset="100%" stopColor={NEON_PURPLE} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="date" stroke="#71717a" tick={{ fontSize: 11 }} tickFormatter={(d) => d.slice(5)} />
              <YAxis stroke="#71717a" tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: "#0f0f14", border: "1px solid rgba(168,85,247,0.4)", borderRadius: 12, color: "#fff", boxShadow: "0 0 20px rgba(168,85,247,0.3)" }}
                labelStyle={{ color: "#a1a1aa", fontSize: 12 }}
              />
              <Area type="monotone" dataKey="pageviews" stroke={NEON_PURPLE} strokeWidth={2} fill="url(#gPageviews)" name="Pageviews" />
              <Area type="monotone" dataKey="visitors" stroke={NEON_CYAN} strokeWidth={2} fill="url(#gVisitors)" name="Visitatori unici" />
              <Legend iconType="line" wrapperStyle={{ paddingTop: 8, fontSize: 12 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={styles.twoCol}>
        {/* SORGENTI TRAFFICO */}
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Sorgenti traffico</h3>
          <div style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={sourceData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={4}>
                  {sourceData.map((s, i) => (
                    <Cell key={i} fill={s.color} stroke="#0a0a0f" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "#0f0f14", border: "1px solid rgba(168,85,247,0.4)", borderRadius: 12, color: "#fff" }} />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* DEVICES */}
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Dispositivi</h3>
          <div style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deviceData} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="name" stroke="#71717a" tick={{ fontSize: 11 }} />
                <YAxis stroke="#71717a" tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "#0f0f14", border: "1px solid rgba(168,85,247,0.4)", borderRadius: 12, color: "#fff" }} />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {deviceData.map((s, i) => <Cell key={i} fill={s.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div style={styles.twoCol}>
        {/* TOP PAGES */}
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Pagine più viste</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {topPages.length === 0 ? (
              <div style={{ color: "#71717a", fontSize: 13, padding: 20, textAlign: "center" }}>Nessun dato — ancora poche visite raccolte</div>
            ) : topPages.map((p, i) => (
              <div key={i} style={styles.listRow}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.path}</div>
                  <div style={{ fontSize: 11, color: "#71717a" }}>{p.unique_visitors} unici</div>
                </div>
                <div style={{ ...styles.pill, background: `${NEON_PURPLE}22`, color: NEON_PURPLE }}>{p.views}</div>
              </div>
            ))}
          </div>
        </div>

        {/* TOP ARTICLES */}
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Articoli blog più letti</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {topArticles.length === 0 ? (
              <div style={{ color: "#71717a", fontSize: 13, padding: 20, textAlign: "center" }}>Nessun dato ancora</div>
            ) : topArticles.map((a, i) => (
              <div key={i} style={styles.listRow}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.title || a.path}</div>
                  <div style={{ fontSize: 11, color: "#71717a" }}>{a.category_name || "—"} · {a.unique_visitors} unici</div>
                </div>
                <div style={{ ...styles.pill, background: `${NEON_CYAN}22`, color: NEON_CYAN }}>{a.views}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* REALTIME */}
      <div style={styles.chartCard}>
        <div style={styles.chartHeader}>
          <h3 style={styles.chartTitle}>
            Real-time · ultimi 5 min
            <span style={{ color: NEON_GREEN, marginLeft: 8, fontSize: 12, verticalAlign: "middle" }}>●</span>
            <span style={{ color: "#a1a1aa", fontSize: 12, marginLeft: 4 }}>{realtime?.active_sessions ?? 0} sessioni attive</span>
          </h3>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {(!realtime || realtime.active_paths.length === 0) ? (
            <div style={{ color: "#71717a", fontSize: 13, padding: 20, textAlign: "center" }}>Nessun visitatore attivo in questo momento</div>
          ) : realtime.active_paths.map((r, i) => (
            <div key={i} style={styles.listRow}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.path}</div>
                <div style={{ fontSize: 11, color: "#71717a" }}>ultimo: {new Date(r.last_seen).toLocaleTimeString("it-IT")}</div>
              </div>
              <div style={{ ...styles.pill, background: `${NEON_GREEN}22`, color: NEON_GREEN }}>{r.views}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function KpiCard({ label, value, trend, color, pulse }: { label: string; value: number; trend?: { pct: number; up: boolean } | null; color: string; pulse?: boolean }) {
  return (
    <div style={{ ...styles.kpiCard, borderColor: `${color}55` }}>
      {/* Neon scan line */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, overflow: "hidden" }}>
        <div style={{ height: 1, width: "40%", background: `linear-gradient(90deg, transparent, ${color}, transparent)`, animation: "neon-scan 3s ease-in-out infinite" }} />
      </div>
      <div style={{ fontSize: 11, color: "#a1a1aa", textTransform: "uppercase", letterSpacing: 1, fontWeight: 800 }}>{label}</div>
      <div style={{ fontSize: 32, fontWeight: 900, color, textShadow: `0 0 20px ${color}55`, marginTop: 6, letterSpacing: -0.5 }}>
        {value.toLocaleString("it-IT")}
        {pulse && <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: color, boxShadow: `0 0 12px ${color}`, marginLeft: 8, verticalAlign: "middle", animation: "pulse-dot 2s ease-in-out infinite" }} />}
      </div>
      {trend && (
        <div style={{ fontSize: 12, color: trend.up ? "#10b981" : "#f87171", marginTop: 4, fontWeight: 700 }}>
          {trend.up ? "↑" : "↓"} {trend.pct}% vs periodo prec.
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12, marginBottom: 20 },
  chip: { padding: "6px 12px", borderRadius: 999, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)", color: "#a1a1aa", fontSize: 12, fontWeight: 700, cursor: "pointer" },
  chipActive: { background: `rgba(168,85,247,0.15)`, border: `1px solid ${NEON_PURPLE}55`, color: "#fff" },
  kpiGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 24 },
  kpiCard: { position: "relative", padding: "18px 20px", background: "linear-gradient(180deg,#12121a,#0e0e14)", border: "1px solid", borderRadius: 16, overflow: "hidden" },
  chartCard: { padding: "18px 20px 20px", background: "#12121a", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, marginBottom: 20 },
  chartHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  chartTitle: { fontSize: 14, fontWeight: 800, color: "#fff", margin: 0, letterSpacing: -0.2 },
  twoCol: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20 },
  listRow: { display: "flex", alignItems: "center", padding: "8px 10px", background: "rgba(255,255,255,0.02)", borderRadius: 10, gap: 12 },
  pill: { padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 800, letterSpacing: 0.5 },
};
