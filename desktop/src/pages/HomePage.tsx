import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ScanLine, Calculator, BookOpen, TrendingUp } from "lucide-react";
import { useAuth } from "../store/auth";
import { api } from "../api/client";
import { colors, radius } from "../theme";

type SubjectStat = { subject: string; avg: number; count: number };

export function HomePage() {
  const user = useAuth((s) => s.user);
  const token = useAuth((s) => s.token);
  const navigate = useNavigate();

  const [dashboard, setDashboard] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!token) return;
      try {
        const [d, s] = await Promise.allSettled([
          api.dashboard(token),
          api.gradesStats(token),
        ]);
        if (!alive) return;
        if (d.status === "fulfilled") setDashboard(d.value);
        if (s.status === "fulfilled") setStats(s.value);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [token]);

  const allSubjects: string[] = (user as any)?.subjects || dashboard?.subjects || [];
  const subjects = showAll ? allSubjects : allSubjects.slice(0, 6);
  const gradesBySubj: SubjectStat[] = stats?.real?.averages ?? [];
  const recentStudies: any[] = dashboard?.recent_studies ?? [];

  const greet = greeting();

  return (
    <div style={{ maxWidth: 1000, display: "flex", flexDirection: "column", gap: 28 }}>
      {/* Greeting */}
      <div>
        <div style={{ fontSize: 15, color: colors.textSub }}>
          Ciao, {user?.username || "Studente"} {greet.emoji}
        </div>
        <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>{greet.label}</div>
      </div>

      {/* Big title */}
      <div style={{ fontSize: 32, fontWeight: 900, letterSpacing: -0.8, lineHeight: 1.15 }}>
        Cosa vuoi studiare oggi?
      </div>

      {/* Big actions */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <BigCard
          icon={ScanLine}
          title="Scannerizza & Riassumi"
          sub="Foto, PDF o testo → riassunto AI"
          tint={colors.purple}
          onClick={() => navigate("/scanner")}
        />
        <BigCard
          icon={Calculator}
          title="Matematica"
          sub="Esercizi e formule spiegate passo passo"
          tint={colors.cyan}
          onClick={() => navigate("/math")}
        />
      </div>

      {/* Materie con voto badge (come iPad) */}
      <section>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, letterSpacing: -0.2 }}>Le tue materie</h2>
          <div style={{ display: "flex", gap: 14 }}>
            {allSubjects.length > 6 && (
              <button
                onClick={() => setShowAll((v) => !v)}
                style={{ color: colors.cyan, fontWeight: 700, fontSize: 13 }}
              >
                {showAll ? "Mostra meno" : "Mostra tutte"}
              </button>
            )}
            <button
              onClick={() => alert("Gestione materie in arrivo — per ora modifica dal mobile")}
              style={{ color: colors.purple, fontWeight: 700, fontSize: 13 }}
            >
              Modifica
            </button>
          </div>
        </div>

        {loading ? (
          <div style={placeholder}>Caricamento…</div>
        ) : subjects.length === 0 ? (
          <div style={placeholder}>Configura le tue materie dall'app mobile.</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
            {subjects.map((s) => {
              const stat = gradesBySubj.find((g) => g.subject === s);
              const avg = stat?.avg ?? null;
              const count = recentStudies.filter((r) => r.subject === s).length;
              const meta = subjectMeta(s);
              const gradeColor = colorForGrade(avg);
              return (
                <button
                  key={s}
                  onClick={() => navigate(`/voti?subject=${encodeURIComponent(s)}`)}
                  style={{
                    padding: 14,
                    borderRadius: radius.md,
                    background: colors.bgGlass,
                    border: `1px solid ${meta.color}33`,
                    textAlign: "left",
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                    transition: "transform 150ms, border-color 150ms",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.borderColor = `${meta.color}77`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.borderColor = `${meta.color}33`;
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 12,
                      background: `${meta.color}1a`, border: `1px solid ${meta.color}55`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <BookOpen size={18} color={meta.color} />
                    </div>
                    <div style={{
                      padding: "3px 10px",
                      borderRadius: 999,
                      background: `${gradeColor}1a`,
                      border: `1px solid ${gradeColor}77`,
                      color: gradeColor,
                      fontSize: 12,
                      fontWeight: 900,
                    }}>
                      {avg == null ? "0" : avg.toFixed(1)}<span style={{ color: colors.textMuted, fontWeight: 700, fontSize: 10 }}>/10</span>
                    </div>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{s}</div>
                  <div style={{ fontSize: 11, color: colors.textMuted }}>
                    {count} document{count === 1 ? "o" : "i"} · {avg == null ? "nessun voto" : `media ${avg.toFixed(1)}`}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Continua a studiare */}
      <section>
        <h2 style={{ margin: "0 0 12px 0", fontSize: 18, fontWeight: 800 }}>Continua a studiare</h2>
        {loading ? (
          <div style={placeholder}>Caricamento…</div>
        ) : recentStudies.length === 0 ? (
          <div style={placeholder}>
            <div style={{ fontWeight: 700, color: colors.textPrimary, marginBottom: 4 }}>Nessun materiale ancora</div>
            <div style={{ fontSize: 12 }}>Clicca Scannerizza per iniziare il tuo primo studio.</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {recentStudies.slice(0, 3).map((r) => {
              const meta = subjectMeta(r.subject || "Generale");
              return (
                <button
                  key={r.id}
                  onClick={() => alert(`Riassunto "${r.title}" — apri nel mobile per ora`)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: 14,
                    borderRadius: radius.md,
                    background: colors.bgGlass,
                    border: `1px solid ${meta.color}33`,
                    textAlign: "left",
                  }}
                >
                  <div style={{
                    width: 44, height: 44, borderRadius: 14,
                    background: `${meta.color}1a`, border: `1px solid ${meta.color}55`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <BookOpen size={20} color={meta.color} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 800 }}>{r.title}</div>
                    <div style={{ fontSize: 12, color: colors.textSub, marginTop: 2 }}>
                      {r.subject || "Generale"} · Riassunto completato
                    </div>
                  </div>
                  <TrendingUp size={16} color={colors.textMuted} />
                </button>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 6) return { label: "Notte. Studio notturno?", emoji: "🌙" };
  if (h < 12) return { label: "Buongiorno, pronto per iniziare?", emoji: "☀️" };
  if (h < 18) return { label: "Buon pomeriggio!", emoji: "📚" };
  return { label: "Buonasera, ripasso serale?", emoji: "🌙" };
}

function subjectMeta(_s: string) {
  return { color: colors.purple };
}
function colorForGrade(g: number | null): string {
  if (g == null) return colors.textMuted;
  if (g >= 8) return colors.green;
  if (g >= 6) return colors.cyan;
  if (g >= 5) return colors.orange;
  return colors.red;
}

function BigCard({
  icon: Icon,
  title,
  sub,
  tint,
  onClick,
}: {
  icon: any;
  title: string;
  sub: string;
  tint: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: 24,
        borderRadius: radius.xl,
        background: `linear-gradient(135deg, ${tint}30 0%, ${tint}10 100%)`,
        border: `1px solid ${tint}55`,
        textAlign: "left",
        display: "flex",
        flexDirection: "column",
        gap: 14,
        height: 190,
        justifyContent: "space-between",
        transition: "transform 150ms, box-shadow 150ms",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-3px)";
        e.currentTarget.style.boxShadow = `0 12px 40px ${tint}44`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      <div style={{
        width: 60, height: 60, borderRadius: 18,
        background: `${tint}25`, border: `1px solid ${tint}66`,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Icon size={30} color={tint} />
      </div>
      <div>
        <div style={{ fontSize: 19, fontWeight: 800, marginBottom: 4 }}>{title}</div>
        <div style={{ fontSize: 13, color: colors.textSub, lineHeight: 1.4 }}>{sub}</div>
      </div>
    </button>
  );
}

const placeholder: React.CSSProperties = {
  padding: 20,
  borderRadius: radius.md,
  background: colors.bgGlass,
  border: `1px dashed ${colors.border}`,
  color: colors.textSub,
  fontSize: 13,
};
