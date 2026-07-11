import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ScanLine, Calculator, BarChart3, Calendar, BookOpen, Flame } from "lucide-react";
import { useAuth } from "../store/auth";
import { api } from "../api/client";
import { colors, radius } from "../theme";

export function HomePage() {
  const user = useAuth((s) => s.user);
  const token = useAuth((s) => s.token);
  const navigate = useNavigate();

  const [dashboard, setDashboard] = useState<any>(null);
  const [nudge, setNudge] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!token) return;
      try {
        const [d, n] = await Promise.allSettled([
          api.dashboard(token),
          api.coachNudge(token),
        ]);
        if (!alive) return;
        if (d.status === "fulfilled") setDashboard(d.value);
        if (n.status === "fulfilled") setNudge(n.value);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [token]);

  const subjects: string[] = (user as any)?.subjects || dashboard?.subjects || [];

  const greet = greeting();

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", flexDirection: "column", gap: 28 }}>
      {/* Greeting */}
      <div>
        <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: -0.5 }}>
          Ciao, {user?.username || "Studente"} {greet.emoji}
        </div>
        <div style={{ fontSize: 14, color: colors.textSub, marginTop: 4 }}>{greet.label}</div>
      </div>

      {/* Streak card compact (se presente) */}
      {nudge?.streak?.current ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: 14,
            borderRadius: radius.md,
            background: "linear-gradient(135deg, rgba(236,72,153,0.20) 0%, rgba(168,85,247,0.12) 100%)",
            border: `1px solid ${colors.pink}55`,
          }}
        >
          <Flame size={22} color={colors.pink} />
          <div>
            <div style={{ fontWeight: 900, fontSize: 16 }}>{nudge.streak.current} giorni di studio consecutivi</div>
            <div style={{ fontSize: 12, color: colors.textSub }}>Streak di studio 🔥 — continua così!</div>
          </div>
        </div>
      ) : null}

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
          sub="Esercizi e formule spiegate"
          tint={colors.cyan}
          onClick={() => navigate("/math")}
        />
      </div>

      {/* Subjects */}
      <section>
        <SectionTitle>Le tue materie</SectionTitle>
        {loading ? (
          <div style={{ color: colors.textMuted, fontSize: 13 }}>Caricamento…</div>
        ) : subjects.length === 0 ? (
          <div
            style={{
              padding: 24,
              borderRadius: radius.md,
              border: `1px dashed ${colors.border}`,
              color: colors.textMuted,
              fontSize: 13,
            }}
          >
            Nessuna materia impostata. Configurale dall&apos;app mobile.
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
              gap: 12,
            }}
          >
            {subjects.map((s: string) => (
              <button
                key={s}
                onClick={() => navigate(`/voti?subject=${encodeURIComponent(s)}`)}
                style={subjectTile}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.borderColor = colors.borderStrong;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.borderColor = colors.border;
                }}
              >
                <BookOpen size={18} color={colors.purple} />
                <div style={{ fontWeight: 700, fontSize: 14 }}>{s}</div>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* CTA row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <MiniCta
          icon={BarChart3}
          label="I tuoi voti e medie"
          tint={colors.green}
          onClick={() => navigate("/voti")}
        />
        <MiniCta
          icon={Calendar}
          label="Calendario verifiche"
          tint={colors.orange}
          onClick={() => navigate("/calendario")}
        />
      </div>
    </div>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 6) return { label: "Notte fonda. Studio notturno?", emoji: "🌙" };
  if (h < 12) return { label: "Buongiorno, pronto per iniziare?", emoji: "☀️" };
  if (h < 18) return { label: "Buon pomeriggio!", emoji: "📚" };
  return { label: "Buonasera, ripasso serale?", emoji: "🌙" };
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{ margin: "0 0 12px 0", fontSize: 18, fontWeight: 800, letterSpacing: -0.2 }}>
      {children}
    </h2>
  );
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
        gap: 12,
        height: 180,
        justifyContent: "space-between",
        transition: "transform 150ms ease, box-shadow 150ms ease",
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
      <div
        style={{
          width: 60,
          height: 60,
          borderRadius: 18,
          background: `${tint}25`,
          border: `1px solid ${tint}66`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon size={30} color={tint} />
      </div>
      <div>
        <div style={{ fontSize: 19, fontWeight: 800, marginBottom: 4 }}>{title}</div>
        <div style={{ fontSize: 13, color: colors.textSub, lineHeight: 1.4 }}>{sub}</div>
      </div>
    </button>
  );
}

function MiniCta({
  icon: Icon,
  label,
  tint,
  onClick,
}: {
  icon: any;
  label: string;
  tint: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: 18,
        borderRadius: radius.lg,
        background: colors.bgGlass,
        border: `1px solid ${colors.border}`,
        textAlign: "left",
        transition: "all 150ms ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = `${tint}88`;
        e.currentTarget.style.background = `${tint}0d`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = colors.border;
        e.currentTarget.style.background = colors.bgGlass;
      }}
    >
      <Icon size={22} color={tint} />
      <div style={{ fontWeight: 700, fontSize: 15 }}>{label}</div>
    </button>
  );
}

const subjectTile: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: 14,
  borderRadius: radius.md,
  background: colors.bgGlass,
  border: `1px solid ${colors.border}`,
  textAlign: "left",
  transition: "transform 150ms ease, border-color 150ms ease",
};
