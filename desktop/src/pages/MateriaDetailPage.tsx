import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { BookOpen, ArrowLeft, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useAuth } from "../store/auth";
import { api } from "../api/client";
import { colors, radius } from "../theme";

export function MateriaDetailPage() {
  const { name } = useParams<{ name: string }>();
  const subject = decodeURIComponent(name || "");
  const navigate = useNavigate();
  const token = useAuth((s) => s.token);
  const [studies, setStudies] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [grades, setGrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const [h, s, g] = await Promise.allSettled([
          api.studyHistory(token),
          api.gradesStats(token),
          api.gradesRealList(token),
        ]);
        if (h.status === "fulfilled")
          setStudies((h.value || []).filter((x: any) => (x.subject || "") === subject));
        if (s.status === "fulfilled") setStats(s.value);
        if (g.status === "fulfilled")
          setGrades((g.value || []).filter((x: any) => (x.subject || "") === subject));
      } finally {
        setLoading(false);
      }
    })();
  }, [token, subject]);

  const subjectAvg = (stats?.real?.averages || []).find((x: any) => x.subject === subject);

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
      <button onClick={() => navigate(-1)} style={backBtn}>
        <ArrowLeft size={14} /> Indietro
      </button>

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={iconWrap(colors.purple)}><BookOpen size={22} color={colors.purple} /></div>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 900, letterSpacing: -0.5 }}>{subject}</h1>
          <p style={{ margin: "4px 0 0 0", color: colors.textSub, fontSize: 13 }}>
            {studies.length} studi · {grades.length} voti
          </p>
        </div>
      </div>

      {/* Media card */}
      {subjectAvg && (
        <div style={{
          padding: 20, borderRadius: radius.xl,
          background: "linear-gradient(135deg, rgba(16,185,129,0.18) 0%, rgba(6,182,212,0.10) 100%)",
          border: `1px solid ${colors.green}55`,
        }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: colors.textMuted, letterSpacing: 1, textTransform: "uppercase" }}>Media in {subject}</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 6 }}>
            <div style={{ fontSize: 44, fontWeight: 900, color: colorForGrade(subjectAvg.avg), letterSpacing: -1.5 }}>
              {subjectAvg.avg.toFixed(1)}
            </div>
            <div style={{ fontSize: 18, color: colors.textMuted, fontWeight: 700 }}>/10</div>
            {subjectAvg.trend != null && (
              <span style={{
                marginLeft: 12, padding: "3px 10px", borderRadius: 999,
                background: `${trendColor(subjectAvg.trend)}14`,
                border: `1px solid ${trendColor(subjectAvg.trend)}55`,
                color: trendColor(subjectAvg.trend), fontSize: 12, fontWeight: 800,
                display: "inline-flex", alignItems: "center", gap: 4,
              }}>
                {subjectAvg.trend > 0.1 ? <TrendingUp size={12}/> : subjectAvg.trend < -0.1 ? <TrendingDown size={12}/> : <Minus size={12}/>}
                {subjectAvg.trend > 0 ? "+" : ""}{subjectAvg.trend.toFixed(1)}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Voti list */}
      <section>
        <h2 style={sectionTitle}>Voti recenti</h2>
        {loading ? <div style={placeholder}>Caricamento…</div> :
         grades.length === 0 ? <div style={placeholder}>Nessun voto ancora in {subject}</div> :
         <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(120px,1fr))", gap: 8 }}>
           {grades.slice(0, 12).map((g) => (
             <div key={g.id} style={{
               padding: 12, borderRadius: radius.sm,
               background: colors.bgGlass, border: `1px solid ${colorForGrade(g.value)}55`,
               textAlign: "center",
             }}>
               <div style={{ fontSize: 22, fontWeight: 900, color: colorForGrade(g.value) }}>{g.value}</div>
               <div style={{ fontSize: 10, color: colors.textMuted, marginTop: 2 }}>
                 {g.date ? new Date(g.date).toLocaleDateString("it-IT", { day: "numeric", month: "short" }) : ""}
               </div>
             </div>
           ))}
         </div>}
      </section>

      {/* Studies list */}
      <section>
        <h2 style={sectionTitle}>Studi & riassunti</h2>
        {loading ? <div style={placeholder}>Caricamento…</div> :
         studies.length === 0 ? <div style={placeholder}>Nessun riassunto ancora per {subject}</div> :
         <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
           {studies.map((s) => (
             <div key={s.id} style={{ padding: 14, borderRadius: radius.md, background: colors.bgGlass, border: `1px solid ${colors.border}` }}>
               <div style={{ fontSize: 14, fontWeight: 800 }}>{s.title || "Riassunto"}</div>
               <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 4 }}>
                 {s.created_at ? new Date(s.created_at).toLocaleDateString("it-IT") : ""}
               </div>
             </div>
           ))}
         </div>}
      </section>
    </div>
  );
}

function colorForGrade(g: number | null): string {
  if (g == null) return colors.textMuted;
  if (g >= 8) return colors.green;
  if (g >= 6) return colors.cyan;
  if (g >= 5) return colors.orange;
  return colors.red;
}
function trendColor(t: number): string {
  if (t > 0.1) return colors.green;
  if (t < -0.1) return colors.red;
  return colors.textMuted;
}
function iconWrap(c: string): React.CSSProperties {
  return { width: 44, height: 44, borderRadius: 14, background: `${c}1a`, border: `1px solid ${c}55`, display: "flex", alignItems: "center", justifyContent: "center" };
}
const backBtn: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 6,
  padding: "6px 12px", borderRadius: 999,
  background: colors.bgGlass, border: `1px solid ${colors.border}`,
  color: colors.textSub, fontSize: 12, fontWeight: 700, alignSelf: "flex-start",
};
const sectionTitle: React.CSSProperties = {
  margin: "0 0 12px 0", fontSize: 16, fontWeight: 800,
};
const placeholder: React.CSSProperties = {
  padding: 20, borderRadius: radius.md,
  background: colors.bgGlass, border: `1px dashed ${colors.border}`,
  color: colors.textMuted, fontSize: 13, textAlign: "center",
};
