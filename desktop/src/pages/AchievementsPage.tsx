import { useEffect, useState } from "react";
import { Trophy, Lock, CheckCircle2 } from "lucide-react";
import { colors, radius } from "../theme";
import { useAuth } from "../store/auth";
import { api } from "../api/client";

type Achievement = {
  id: string;
  title: string;
  desc: string;
  icon: string;
  color: string;
  group: string;
  target: number;
  current: number;
  percent: number;
  unlocked: boolean;
};

type Progress = {
  total: number;
  unlocked: number;
  percent: number;
  achievements: Achievement[];
};

export function AchievementsPage() {
  const token = useAuth((s) => s.token);
  const [data, setData] = useState<Progress | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unlocked" | "locked">("all");

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    api
      .gamificationProgress(token)
      .then((d) => setData(d as Progress))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  const filtered = data
    ? filter === "unlocked"
      ? data.achievements.filter((a) => a.unlocked)
      : filter === "locked"
      ? data.achievements.filter((a) => !a.unlocked)
      : data.achievements
    : [];

  const groups = groupBy(filtered, (a) => a.group);

  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 26, fontWeight: 900, letterSpacing: -0.4 }}>Traguardi</div>
          <div style={{ fontSize: 13, color: colors.textSub, marginTop: 4 }}>
            Sblocca obiettivi studiando, migliorando i voti e usando ogni feature di Voto+.
          </div>
        </div>
        {data && (
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <ProgressRing percent={data.percent} />
            <div>
              <div style={{ fontSize: 22, fontWeight: 900 }}>
                {data.unlocked}<span style={{ color: colors.textMuted, fontSize: 15, fontWeight: 700 }}>/{data.total}</span>
              </div>
              <div style={{ fontSize: 11, color: colors.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6 }}>
                Sbloccati
              </div>
            </div>
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <FilterChip active={filter === "all"} onClick={() => setFilter("all")} label={`Tutti · ${data?.total ?? 0}`} color={colors.purple} />
        <FilterChip active={filter === "unlocked"} onClick={() => setFilter("unlocked")} label={`Sbloccati · ${data?.unlocked ?? 0}`} color={colors.green} />
        <FilterChip active={filter === "locked"} onClick={() => setFilter("locked")} label={`Da sbloccare · ${data ? data.total - data.unlocked : 0}`} color={colors.orange} />
      </div>

      {loading ? (
        <Placeholder label="Caricamento traguardi…" />
      ) : !data || data.total === 0 ? (
        <Placeholder label="Nessun traguardo disponibile." />
      ) : (
        Object.keys(groups).map((g) => (
          <section key={g}>
            <div style={{
              fontSize: 11,
              fontWeight: 900,
              letterSpacing: 1.2,
              textTransform: "uppercase",
              color: colors.textMuted,
              marginBottom: 10,
              paddingLeft: 4,
            }}>{g}</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
              {groups[g].map((a) => (
                <AchievementCard key={a.id} a={a} />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}

function AchievementCard({ a }: { a: Achievement }) {
  const tint = a.unlocked ? a.color : colors.textMuted;
  return (
    <div
      style={{
        padding: 14,
        borderRadius: radius.md,
        background: a.unlocked ? `${a.color}0f` : colors.bgGlass,
        border: `1px solid ${a.unlocked ? `${a.color}55` : colors.border}`,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        opacity: a.unlocked ? 1 : 0.85,
        position: "relative",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{
          width: 40, height: 40, borderRadius: 12,
          background: `${tint}1f`, border: `1px solid ${tint}55`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 18,
        }}>
          {a.icon || "🏆"}
        </div>
        {a.unlocked ? (
          <CheckCircle2 size={16} color={a.color} />
        ) : (
          <Lock size={14} color={colors.textMuted} />
        )}
      </div>
      <div style={{ fontWeight: 800, fontSize: 14, color: a.unlocked ? colors.textPrimary : colors.textSub }}>{a.title}</div>
      <div style={{ fontSize: 11.5, color: colors.textSub, lineHeight: 1.5 }}>{a.desc}</div>
      <div>
        <div style={{
          height: 6,
          borderRadius: 999,
          background: colors.bg,
          border: `1px solid ${colors.border}`,
          overflow: "hidden",
          marginTop: 4,
        }}>
          <div style={{
            height: "100%",
            width: `${a.percent}%`,
            background: a.unlocked ? `linear-gradient(90deg, ${a.color} 0%, ${colors.purple} 100%)` : colors.textMuted,
            transition: "width 300ms ease",
          }} />
        </div>
        <div style={{ fontSize: 10.5, color: colors.textMuted, marginTop: 4, fontWeight: 700, display: "flex", justifyContent: "space-between" }}>
          <span>{a.current}/{a.target}</span>
          <span>{a.percent}%</span>
        </div>
      </div>
    </div>
  );
}

function ProgressRing({ percent }: { percent: number }) {
  const r = 22;
  const c = 2 * Math.PI * r;
  const dash = c * (percent / 100);
  return (
    <svg width={56} height={56} viewBox="0 0 56 56">
      <circle cx={28} cy={28} r={r} stroke={colors.border} strokeWidth={4} fill="none" />
      <circle
        cx={28}
        cy={28}
        r={r}
        stroke={colors.purple}
        strokeWidth={4}
        fill="none"
        strokeDasharray={`${dash} ${c}`}
        strokeDashoffset={0}
        transform="rotate(-90 28 28)"
        strokeLinecap="round"
      />
      <g transform="translate(28,28)">
        <Trophy x={-8} y={-8} width={16} height={16} color={colors.purple} />
      </g>
    </svg>
  );
}

function FilterChip({ active, onClick, label, color }: { active: boolean; onClick: () => void; label: string; color: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "6px 12px",
        borderRadius: 999,
        background: active ? `${color}22` : colors.bgGlass,
        border: `1px solid ${active ? color : colors.border}`,
        color: active ? color : colors.textSub,
        fontSize: 12,
        fontWeight: 700,
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}

function Placeholder({ label }: { label: string }) {
  return (
    <div style={{
      padding: 30,
      borderRadius: radius.md,
      background: colors.bgGlass,
      border: `1px dashed ${colors.border}`,
      color: colors.textSub,
      fontSize: 13,
      textAlign: "center",
    }}>{label}</div>
  );
}

function groupBy<T>(arr: T[], key: (item: T) => string): Record<string, T[]> {
  return arr.reduce((acc, item) => {
    const k = key(item);
    if (!acc[k]) acc[k] = [];
    acc[k].push(item);
    return acc;
  }, {} as Record<string, T[]>);
}
