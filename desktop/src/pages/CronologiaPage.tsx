import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, BookOpen, ChevronRight, Mic, Calculator } from "lucide-react";
import { useAuth } from "../store/auth";
import { api } from "../api/client";
import { colors, radius } from "../theme";

type FilterKey = "all" | "study" | "oral" | "math";

type Row = {
  id: string;
  type: "study" | "oral" | "math";
  title: string;
  subtitle: string;
  date: string;
  grade?: number | null;
  route: string;
};

// Cronologia unificata: riassunti (study) + interrogazioni (oral) + esercizi
// matematica (math). Ricalca l'esperienza mobile (`app/(tabs)/cronologia.tsx`)
// così l'utente ritrova tutte le sue attività a prescindere dal dispositivo.
// Le voci sono ordinate per data (più recenti prima) e filtrabili per tipo.
export function CronologiaPage() {
  const token = useAuth((s) => s.token);
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    let alive = true;
    (async () => {
      try {
        const [study, oral, math] = await Promise.all([
          api.studyHistory(token).catch(() => []),
          api.oralHistory(token).catch(() => []),
          api.mathHistory(token).catch(() => []),
        ]);
        if (!alive) return;
        const merged: Row[] = [];
        (Array.isArray(study) ? study : []).forEach((s: any) => merged.push({
          id: s.id,
          type: "study",
          title: s.title || "Riassunto",
          subtitle: s.subject || "Generale",
          date: s.created_at,
          route: `/materia/${encodeURIComponent(s.subject || "Generale")}`,
        }));
        (Array.isArray(oral) ? oral : []).forEach((o: any) => merged.push({
          id: o.id,
          type: "oral",
          title: `Interrogazione · ${o.subject}`,
          subtitle: `${o.severity || "medio"} · ${o.mode === "lampo" ? "3 domande" : "5 domande"}`,
          date: o.created_at,
          grade: o.avg_grade,
          // Su desktop l'orale si rivede aprendo la pagina Interrogazione: click
          // sulla card cronologia lì apre la review in sola lettura.
          route: `/orale?review=${encodeURIComponent(o.id)}`,
        }));
        (Array.isArray(math) ? math : []).forEach((m: any) => merged.push({
          id: m.id,
          type: "math",
          title: m.result?.problem || m.problem || "Esercizio di matematica",
          subtitle: m.topic || "Matematica",
          date: m.created_at,
          route: `/math?review=${encodeURIComponent(m.id)}`,
        }));
        // Ordina: più recenti prima
        merged.sort((a, b) => (a.date < b.date ? 1 : -1));
        setRows(merged);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [token]);

  const counts = useMemo(() => ({
    all: rows.length,
    study: rows.filter((r) => r.type === "study").length,
    oral: rows.filter((r) => r.type === "oral").length,
    math: rows.filter((r) => r.type === "math").length,
  }), [rows]);

  const filtered = useMemo(
    () => (filter === "all" ? rows : rows.filter((r) => r.type === filter)),
    [rows, filter],
  );

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={iconWrap(colors.purple)}>
          <Clock size={22} color={colors.purple} />
        </div>
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 900, letterSpacing: -0.5 }}>Cronologia</h1>
          <p style={{ margin: "4px 0 0 0", color: colors.textSub, fontSize: 13 }}>
            Riassunti, interrogazioni ed esercizi — sincronizzati con il tuo mobile.
          </p>
        </div>
        <div style={{ padding: "6px 14px", borderRadius: 999, background: colors.bgGlass, border: `1px solid ${colors.border}`, fontSize: 12, color: colors.textMuted, fontWeight: 700 }}>
          {counts.all}
        </div>
      </div>

      {/* Chip di filtro tipo */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <FilterChip label="Tutti" count={counts.all} active={filter === "all"} onClick={() => setFilter("all")} color={colors.purple} />
        <FilterChip label="Riassunti" count={counts.study} active={filter === "study"} onClick={() => setFilter("study")} color={colors.purple} icon={<BookOpen size={12} />} />
        <FilterChip label="Interrogazioni" count={counts.oral} active={filter === "oral"} onClick={() => setFilter("oral")} color={colors.pink} icon={<Mic size={12} />} />
        <FilterChip label="Matematica" count={counts.math} active={filter === "math"} onClick={() => setFilter("math")} color={colors.cyan} icon={<Calculator size={12} />} />
      </div>

      {loading ? (
        <div style={placeholder}>Caricamento cronologia…</div>
      ) : filtered.length === 0 ? (
        <div style={placeholder}>
          <div style={{ fontWeight: 700, color: colors.textPrimary, marginBottom: 4 }}>
            {filter === "all" ? "Nessuna attività ancora" : "Nessun risultato per questo filtro"}
          </div>
          <div>
            {filter === "all"
              ? "Vai in Scannerizza, Matematica o Interrogazione per iniziare."
              : "Prova con un altro filtro."}
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map((it) => {
            const style = typeStyle(it.type);
            const TypeIcon = style.icon;
            return (
              <button
                key={`${it.type}-${it.id}`}
                onClick={() => navigate(it.route)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: 16,
                  borderRadius: radius.md,
                  background: colors.bgGlass,
                  border: `1px solid ${style.color}33`,
                  textAlign: "left",
                  transition: "border-color 150ms, transform 150ms",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-1px)";
                  e.currentTarget.style.borderColor = `${style.color}77`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.borderColor = `${style.color}33`;
                }}
              >
                <div style={{
                  width: 44, height: 44, borderRadius: 14,
                  background: `${style.color}1a`, border: `1px solid ${style.color}55`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                }}>
                  <TypeIcon size={20} color={style.color} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {it.title}
                  </div>
                  <div style={{ fontSize: 12, color: colors.textSub, marginTop: 2 }}>
                    {it.subtitle}
                    {it.date ? ` · ${formatDate(it.date)}` : ""}
                  </div>
                </div>
                {it.grade != null && (
                  <div style={{
                    padding: "3px 10px", borderRadius: 999,
                    background: `${gradeC(it.grade)}1a`, border: `1px solid ${gradeC(it.grade)}77`,
                    color: gradeC(it.grade), fontSize: 12, fontWeight: 900,
                    flexShrink: 0,
                  }}>
                    {it.grade.toFixed(1)}/10
                  </div>
                )}
                <ChevronRight size={16} color={colors.textMuted} />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FilterChip({
  label, count, active, onClick, color, icon,
}: {
  label: string; count: number; active: boolean; onClick: () => void; color: string; icon?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: "6px 14px", borderRadius: 999,
        background: active ? `${color}22` : colors.bgGlass,
        border: `1px solid ${active ? color : colors.border}`,
        color: active ? color : colors.textSub,
        fontSize: 12, fontWeight: 800,
        cursor: "pointer",
        transition: "background 150ms, border-color 150ms",
      }}
    >
      {icon}
      <span>{label}</span>
      <span style={{
        padding: "1px 7px", borderRadius: 999,
        background: active ? `${color}33` : `${colors.border}77`,
        color: active ? color : colors.textMuted,
        fontSize: 10, fontWeight: 900,
      }}>{count}</span>
    </button>
  );
}

function typeStyle(t: Row["type"]) {
  switch (t) {
    case "oral": return { icon: Mic, color: colors.pink };
    case "math": return { icon: Calculator, color: colors.cyan };
    case "study":
    default: return { icon: BookOpen, color: colors.purple };
  }
}

function gradeC(g: number): string {
  if (g >= 8) return colors.green;
  if (g >= 6) return colors.cyan;
  if (g >= 5) return colors.orange;
  return colors.red;
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
    const isYesterday = d.toDateString() === yesterday.toDateString();
    if (sameDay) return `oggi ${d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}`;
    if (isYesterday) return "ieri";
    return d.toLocaleDateString("it-IT", { day: "numeric", month: "short" });
  } catch { return ""; }
}
function iconWrap(c: string): React.CSSProperties {
  return { width: 44, height: 44, borderRadius: 14, background: `${c}1a`, border: `1px solid ${c}55`, display: "flex", alignItems: "center", justifyContent: "center" };
}
const placeholder: React.CSSProperties = {
  padding: 24, borderRadius: radius.md,
  background: colors.bgGlass, border: `1px dashed ${colors.border}`,
  color: colors.textMuted, fontSize: 13, textAlign: "center",
};
