// Voto+ website · Live counter di studenti che usano Voto+ (homepage).
//
// Fetcha /api/public/stats al mount e mostra il numero con animazione
// count-up neon (0 → N in 2s). Aggiornato ogni 5 min via polling.

import { useEffect, useState } from "react";

interface Stats {
  total_users: number;
  published_articles: number;
  visitors_30d: number;
}

const API_BASE =
  (import.meta as any).env?.PUBLIC_BLOG_API_BASE ||
  "https://votop-maturita.emergent.host/api";

function useCountUp(target: number, duration = 1800): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!target) { setValue(0); return; }
    const start = performance.now();
    let raf = 0;
    const step = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.floor(eased * target));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

function formatNumber(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(n < 10000 ? 1 : 0).replace(".0", "") + "k";
  return n.toString();
}

export default function LiveCounter() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const r = await fetch(`${API_BASE}/public/stats`, { cache: "no-cache" });
        if (r.ok) setStats(await r.json());
      } catch { /* silent */ }
    };
    load();
    const t = setInterval(load, 5 * 60 * 1000);
    return () => clearInterval(t);
  }, []);

  const users = useCountUp(stats?.total_users || 0);
  const articles = useCountUp(stats?.published_articles || 0);
  const visitors = useCountUp(stats?.visitors_30d || 0);

  return (
    <div style={styles.wrap}>
      <div style={styles.card}>
        <div style={styles.value}>
          {stats ? formatNumber(users) + "+" : "—"}
        </div>
        <div style={styles.label}>studenti su Voto+</div>
        <div style={styles.pulseDot} />
      </div>
      <div style={styles.card}>
        <div style={styles.value}>{stats ? articles : "—"}</div>
        <div style={styles.label}>articoli sul blog</div>
      </div>
      <div style={styles.card}>
        <div style={styles.value}>{stats ? formatNumber(visitors) : "—"}</div>
        <div style={styles.label}>visite ultimo mese</div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
    gap: 20,
    maxWidth: 640,
    margin: "0 auto",
    padding: "20px 0",
  },
  card: {
    position: "relative",
    padding: "18px 20px",
    background: "rgba(255,255,255,0.02)",
    border: "1px solid rgba(168,85,247,0.2)",
    borderRadius: 16,
    textAlign: "center",
    backdropFilter: "blur(6px)",
  },
  value: {
    fontSize: 32,
    fontWeight: 900,
    letterSpacing: -1,
    background: "linear-gradient(135deg, #06b6d4, #a855f7)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    lineHeight: 1.1,
  },
  label: {
    marginTop: 4,
    fontSize: 12,
    color: "#a1a1aa",
    textTransform: "uppercase",
    letterSpacing: 1,
    fontWeight: 700,
  },
  pulseDot: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: "#10b981",
    boxShadow: "0 0 12px #10b981",
    animation: "pulse-dot 2s ease-in-out infinite",
  },
};
