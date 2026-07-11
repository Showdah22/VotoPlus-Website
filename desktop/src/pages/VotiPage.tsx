import { useEffect, useState } from "react";
import { BarChart3, TrendingUp, TrendingDown, Minus, Plus } from "lucide-react";
import { useAuth } from "../store/auth";
import { api } from "../api/client";
import { colors, radius } from "../theme";
import { Modal, labelStyle, inputStyle, primaryBtn } from "../components/Modal";
import { Select } from "../components/Select";

type SubjectStat = {
  subject: string;
  avg: number;
  count: number;
  trend: number;
  last?: number;
};

type StatsResp = {
  by_subject?: SubjectStat[];
  real?: { averages: SubjectStat[]; overall: number | null };
  simulation?: { averages: SubjectStat[]; overall: number | null };
};

export function VotiPage() {
  const token = useAuth((s) => s.token);
  const user = useAuth((s) => s.user);
  const [stats, setStats] = useState<StatsResp | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const subjects: string[] = (user as any)?.subjects || [];

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!token) return;
      setLoading(true);
      try {
        const data = await api.gradesStats(token);
        if (alive) setStats(data);
      } catch (err: any) {
        if (alive) setError(err?.message ?? "Errore nel caricamento");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [token, refreshKey]);

  const realAvgs = stats?.real?.averages ?? [];
  const overall = stats?.real?.overall ?? stats?.simulation?.overall ?? null;
  const displayAvgs =
    realAvgs.length > 0 ? realAvgs : stats?.simulation?.averages ?? [];

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={iconWrapStyle(colors.green)}>
          <BarChart3 size={22} color={colors.green} />
        </div>
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 900, letterSpacing: -0.5 }}>
            I tuoi voti
          </h1>
          <p style={{ margin: "4px 0 0 0", color: colors.textSub, fontSize: 13 }}>
            Medie per materia · aggiornate in tempo reale dal backend
          </p>
        </div>
        <button
          onClick={() => setAddOpen(true)}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "10px 16px", borderRadius: 999,
            background: `${colors.green}1a`, border: `1px solid ${colors.green}77`,
            color: colors.green, fontWeight: 800, fontSize: 13,
          }}
        >
          <Plus size={14} /> Aggiungi voto
        </button>
      </div>

      {/* Overall media card */}
      <div
        style={{
          padding: 24,
          borderRadius: radius.xl,
          background: "linear-gradient(135deg, rgba(16,185,129,0.20) 0%, rgba(6,182,212,0.12) 100%)",
          border: `1px solid ${colors.green}55`,
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 800, color: colors.textMuted, letterSpacing: 1, textTransform: "uppercase" }}>
          Media generale
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 6 }}>
          <div style={{ fontSize: 52, fontWeight: 900, letterSpacing: -2, color: colorForGrade(overall) }}>
            {overall == null ? "—" : overall.toFixed(1)}
          </div>
          <div style={{ fontSize: 20, color: colors.textMuted, fontWeight: 700 }}>/10</div>
        </div>
        <div style={{ fontSize: 13, color: colors.textSub, marginTop: 4 }}>
          {overall == null ? "Nessun voto registrato ancora" : messageForGrade(overall)}
        </div>
      </div>

      {/* Per materia */}
      <section>
        <h2 style={{ margin: "0 0 12px 0", fontSize: 18, fontWeight: 800 }}>Medie per materia</h2>
        {loading ? (
          <div style={placeholder}>Caricamento medie…</div>
        ) : error ? (
          <div style={{ ...placeholder, color: colors.red }}>{error}</div>
        ) : displayAvgs.length === 0 ? (
          <div style={placeholder}>
            Nessun voto ancora. Aggiungi voti dall'app mobile o fai un'interrogazione simulata.
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
            {displayAvgs.map((s) => (
              <SubjectAvgCard key={s.subject} data={s} />
            ))}
          </div>
        )}
      </section>

      <AddGradeModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdded={() => { setAddOpen(false); setRefreshKey((k) => k + 1); }}
        subjects={subjects}
      />
    </div>
  );
}

function AddGradeModal({
  open, onClose, onAdded, subjects,
}: { open: boolean; onClose: () => void; onAdded: () => void; subjects: string[] }) {
  const token = useAuth((s) => s.token);
  const [subject, setSubject] = useState(subjects[0] || "");
  const [value, setValue] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => { if (open) { setSubject(subjects[0] || ""); setValue(""); setNote(""); setErr(null); } }, [open, subjects]);

  const submit = async () => {
    if (!token) return;
    const v = parseFloat(value.replace(",", "."));
    if (!subject || isNaN(v) || v < 0 || v > 10) {
      setErr("Inserisci materia e voto valido (0-10)");
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      await api.gradesRealAdd({ subject, value: v, date, note: note || undefined }, token);
      onAdded();
    } catch (e: any) {
      setErr(e?.message ?? "Errore nel salvataggio");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Nuovo voto">
      <label style={labelStyle}>
        Materia
        <Select
          value={subject}
          onChange={setSubject}
          options={subjects.map((s) => ({ value: s, label: s }))}
          placeholder={subjects.length === 0 ? "— Nessuna materia —" : "— Seleziona —"}
        />
      </label>
      <label style={labelStyle}>
        Voto (0-10)
        <input type="number" step="0.25" min="0" max="10" value={value} onChange={(e) => setValue(e.target.value)} placeholder="es. 7.5" style={inputStyle} autoFocus />
      </label>
      <label style={labelStyle}>
        Data
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={inputStyle} />
      </label>
      <label style={labelStyle}>
        Note (opzionale)
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="es. Verifica cap. 3" style={inputStyle} />
      </label>
      {err && <div style={{ padding: 10, borderRadius: 8, background: `${colors.red}1a`, border: `1px solid ${colors.red}55`, color: colors.red, fontSize: 12, fontWeight: 600 }}>{err}</div>}
      <button onClick={submit} disabled={saving} style={{ ...primaryBtn, opacity: saving ? 0.6 : 1 }}>
        {saving ? "Salvataggio…" : "Salva voto"}
      </button>
    </Modal>
  );
}

function SubjectAvgCard({ data }: { data: SubjectStat }) {
  const color = colorForGrade(data.avg);
  const trendIcon =
    data.trend > 0.1 ? TrendingUp : data.trend < -0.1 ? TrendingDown : Minus;
  const trendColor =
    data.trend > 0.1 ? colors.green : data.trend < -0.1 ? colors.red : colors.textMuted;
  const TrendIcon = trendIcon;

  return (
    <div
      style={{
        padding: 16,
        borderRadius: radius.md,
        background: colors.bgGlass,
        border: `1px solid ${color}33`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: colors.textPrimary }}>{data.subject}</div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            fontSize: 11,
            fontWeight: 700,
            color: trendColor,
            padding: "2px 8px",
            borderRadius: 999,
            background: `${trendColor}14`,
            border: `1px solid ${trendColor}44`,
          }}
        >
          <TrendIcon size={12} />
          <span>{data.trend > 0 ? "+" : ""}{data.trend.toFixed(1)}</span>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginTop: 10 }}>
        <div style={{ fontSize: 30, fontWeight: 900, color, letterSpacing: -0.5 }}>
          {data.avg.toFixed(1)}
        </div>
        <div style={{ fontSize: 12, color: colors.textMuted, fontWeight: 700 }}>/10</div>
      </div>
      <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 4 }}>
        {data.count} {data.count === 1 ? "voto" : "voti"}
      </div>
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
function messageForGrade(g: number): string {
  if (g >= 8) return "Ottimo! Continua così";
  if (g >= 6.5) return "In carreggiata";
  if (g >= 6) return "Sufficienza raggiunta";
  return "C'è ancora margine di miglioramento";
}

const placeholder: React.CSSProperties = {
  padding: 24,
  borderRadius: radius.md,
  background: colors.bgGlass,
  border: `1px dashed ${colors.border}`,
  color: colors.textMuted,
  fontSize: 13,
  textAlign: "center",
};

function iconWrapStyle(color: string): React.CSSProperties {
  return {
    width: 44,
    height: 44,
    borderRadius: 14,
    background: `${color}1a`,
    border: `1px solid ${color}55`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };
}
