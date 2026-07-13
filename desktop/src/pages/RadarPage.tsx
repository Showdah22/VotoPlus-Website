import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Radar as RadarIcon,
  Lock,
  Info,
  TrendingUp,
  TrendingDown,
  Minus,
  Sun,
  Loader2,
  Sparkles,
  Newspaper,
  GitBranch,
  Compass,
  Lightbulb,
} from "lucide-react";
import { useAuth } from "../store/auth";
import { api } from "../api/client";
import { colors, radius } from "../theme";
import { RadarChart } from "../components/RadarChart";

// Pagina Maturità Radar per desktop — porting completo del /radar mobile.
// Gestisce 3 stati:
//  1) Utente NON al 5° anno → NotEligible (informativo, senza CTA acquisto)
//  2) Stagione dormiente (22 giu → 15 set) → OffSeason (countdown al risveglio)
//  3) Normale → 4 tab (Trend, Materia, Attualità, Collegamenti)
//
// Requisiti backend: user.school_year === 5 (o `is_5th_year` true).
// Il Pacchetto Maturità (paywall) viene applicato dal backend sul POST /maturita/radar.

const TABS = [
  { id: "trend", label: "Trend 2026" },
  { id: "materia", label: "Per materia" },
  { id: "attualita", label: "Attualità" },
  { id: "collegamenti", label: "Collegamenti" },
];

type Season = {
  state: "active" | "dormant";
  wake_at: string;
  sleep_at: string;
  now: string;
  title: string;
  message: string;
  cta_label: string;
  year_archived: number;
  next_year: number;
};

// Utility: verifica se l'utente è al 5° anno e ha accesso al Radar.
// Rispecchia `/app/frontend/src/lib/gating.ts` per coerenza mobile/desktop.
function isFifthYear(user: any): boolean {
  if (!user) return false;
  if (user.school_year === 5) return true;
  // Fallback per profili senza school_year esplicito (es. utenti "adulto/professionista")
  return false;
}
function yearsUntilFifth(user: any): number {
  const y = user?.school_year;
  if (typeof y !== "number") return 0;
  return Math.max(0, 5 - y);
}

export function RadarPage() {
  const navigate = useNavigate();
  const token = useAuth((s) => s.token);
  const user = useAuth((s) => s.user);
  const allowed = isFifthYear(user);
  const hasMaturita = !!(user as any)?.maturita_unlocked;

  const [season, setSeason] = useState<Season | null>(null);
  const [tab, setTab] = useState<string>("trend");
  const [subject, setSubject] = useState<string>((user as any)?.subjects?.[0] || "Storia");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const loadSeason = useCallback(async () => {
    if (!token) return;
    try {
      const s = await api.radarSeason(token);
      setSeason(s);
    } catch {
      /* silenzioso */
    }
  }, [token]);

  const loadRadar = useCallback(async () => {
    if (!token || !allowed) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setErr(null);
    try {
      const body: any = { tab };
      if (tab === "materia") body.subject = subject;
      const r = await api.radar(body, token);
      setData(r);
    } catch (e: any) {
      // 402 = Pacchetto Maturità richiesto (paywall del backend)
      if (e?.status === 402) {
        setErr("locked");
      } else {
        setErr(e?.message || "Errore caricamento");
      }
    } finally {
      setLoading(false);
    }
  }, [tab, subject, token, allowed]);

  useEffect(() => { loadSeason(); }, [loadSeason]);
  useEffect(() => {
    if (season?.state === "active" && allowed) loadRadar();
    else setLoading(false);
  }, [season, allowed, loadRadar]);

  // === GATE 1: utente non al 5° anno ===
  if (!allowed) {
    return <NotEligibleScreen years={yearsUntilFifth(user)} />;
  }

  // === GATE 2: stagione dormiente ===
  if (season?.state === "dormant") {
    return <OffSeasonScreen season={season} onGoHome={() => navigate("/")} />;
  }

  // === Stato normale: radar attivo ===
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <header style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={iconWrap(colors.green)}>
          <RadarIcon size={22} color={colors.green} />
        </div>
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 900, letterSpacing: -0.5 }}>Maturità Radar</h1>
          <p style={{ margin: "4px 0 0", color: colors.textSub, fontSize: 13 }}>
            Trend, attualità e collegamenti interdisciplinari per la Maturità {season?.next_year || 2026}.
          </p>
        </div>
        {hasMaturita && (
          <span style={{
            padding: "6px 12px", borderRadius: 999,
            background: `${colors.green}22`, border: `1px solid ${colors.green}77`,
            color: colors.green, fontSize: 11, fontWeight: 900, letterSpacing: 0.6, textTransform: "uppercase",
          }}>
            Maturità
          </span>
        )}
      </header>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={pillBtn(tab === t.id, colors.green)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Sub-tab: chip materie quando tab === materia */}
      {tab === "materia" && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {((user as any)?.subjects || ["Storia"]).map((s: string) => (
            <button
              key={s}
              onClick={() => setSubject(s)}
              style={pillBtn(subject === s, colors.cyan)}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Contenuti */}
      {loading ? (
        <LoadingCard />
      ) : err === "locked" ? (
        <LockedPaywall onUpgrade={() => navigate("/impostazioni")} />
      ) : err ? (
        <div style={{ padding: 14, borderRadius: radius.md, background: `${colors.red}15`, border: `1px solid ${colors.red}55`, color: colors.red, fontSize: 12, fontWeight: 700 }}>
          {err}
        </div>
      ) : tab === "trend" ? (
        <TrendView data={data} year={season?.next_year || 2026} />
      ) : tab === "materia" ? (
        <SubjectView data={data} />
      ) : tab === "attualita" ? (
        <ActualityView data={data} />
      ) : (
        <ConnectionsView data={data} />
      )}
    </div>
  );
}

// =================================================================================
// GATE 1: utente non al 5° anno
// =================================================================================
function NotEligibleScreen({ years }: { years: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <header style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={iconWrap(colors.orange)}>
          <RadarIcon size={22} color={colors.orange} />
        </div>
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 900, letterSpacing: -0.5 }}>Maturità Radar</h1>
          <p style={{ margin: "4px 0 0", color: colors.textSub, fontSize: 13 }}>
            Disponibile per chi affronta l'esame di Stato.
          </p>
        </div>
      </header>

      <section style={{ padding: 32, borderRadius: radius.xl, background: `linear-gradient(135deg, ${colors.orange}18 0%, ${colors.purple}0a 100%)`, border: `1px solid ${colors.orange}55`, textAlign: "center" }}>
        <div style={{
          width: 88, height: 88, borderRadius: 26,
          background: `${colors.orange}18`, border: `1px solid ${colors.orange}66`,
          display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 16,
        }}>
          <Lock size={40} color={colors.orange} />
        </div>
        <h2 style={{ margin: 0, fontSize: 26, fontWeight: 900, letterSpacing: -0.5 }}>Disponibile dal 5° anno</h2>
        <p style={{ margin: "10px auto 0", color: colors.textSub, fontSize: 14, lineHeight: 1.6, maxWidth: 520 }}>
          Il Radar Maturità è pensato per chi affronta l'esame di Stato.
          {years > 0 && (
            <>
              {" Mancano "}
              <strong style={{ color: colors.orange, fontWeight: 900 }}>
                {years} {years === 1 ? "anno" : "anni"}
              </strong>
              {" alla tua Maturità."}
            </>
          )}
        </p>
      </section>

      <section style={cardStyle({ padding: 20 })}>
        <div style={{ color: "#fff", fontWeight: 800, fontSize: 15, marginBottom: 12 }}>
          Cosa fa il Radar?
        </div>
        <FeatureRow icon={<TrendingUp size={16} color={colors.purple} />} text="Analizza le tracce della Maturità degli ultimi anni" />
        <FeatureRow icon={<Lightbulb size={16} color={colors.purple} />} text="Suggerisce gli argomenti più probabili per l'anno in corso" />
        <FeatureRow icon={<GitBranch size={16} color={colors.purple} />} text="Trova collegamenti interdisciplinari da spendere all'orale" />
        <FeatureRow icon={<Newspaper size={16} color={colors.purple} />} text="Aggancia attualità e correnti culturali agli argomenti di studio" />
      </section>

      <section style={cardStyle({ padding: 16, border: `1px solid ${colors.cyan}55` })}>
        <div style={{ color: colors.cyan, fontSize: 11, fontWeight: 900, letterSpacing: 1.2 }}>NEL FRATTEMPO</div>
        <p style={{ margin: "6px 0 0", color: colors.textSub, fontSize: 13, lineHeight: 1.6 }}>
          Concentrati sulle interrogazioni, sui voti e sui materiali del tuo anno. Voto+ ti seguirà fino
          alla 5ª e poi accenderà automaticamente il Radar per te.
        </p>
      </section>
    </div>
  );
}

function FeatureRow({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "6px 0" }}>
      <div style={{
        width: 30, height: 30, borderRadius: 10,
        background: `${colors.purple}1c`, border: `1px solid ${colors.purple}55`,
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>
        {icon}
      </div>
      <div style={{ color: colors.textSub, fontSize: 13, lineHeight: 1.5 }}>{text}</div>
    </div>
  );
}

// =================================================================================
// GATE 2: off-season (estate)
// =================================================================================
function OffSeasonScreen({ season, onGoHome }: { season: Season; onGoHome: () => void }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60 * 1000);
    return () => clearInterval(t);
  }, []);

  const wake = useMemo(() => new Date(season.wake_at), [season.wake_at]);
  const diffMs = Math.max(0, wake.getTime() - now.getTime());
  const days = Math.floor(diffMs / (24 * 3600 * 1000));
  const hours = Math.floor((diffMs % (24 * 3600 * 1000)) / (3600 * 1000));
  const wakeFmt = wake.toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <header style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={iconWrap(colors.orange)}>
          <Sun size={22} color={colors.orange} />
        </div>
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 900, letterSpacing: -0.5 }}>Maturità Radar</h1>
          <p style={{ margin: "4px 0 0", color: colors.textSub, fontSize: 13 }}>Pausa estiva — torna a settembre.</p>
        </div>
      </header>

      <section style={{
        padding: 32,
        borderRadius: radius.xl,
        background: `linear-gradient(135deg, rgba(251,191,36,0.2) 0%, rgba(249,115,22,0.12) 100%)`,
        border: `1px solid rgba(251,191,36,0.4)`,
        textAlign: "center",
      }}>
        {/* Sole animato (pulse) */}
        <div style={{
          width: 90, height: 90, borderRadius: 45,
          background: "radial-gradient(circle, #FBBF24 0%, #F97316 100%)",
          boxShadow: "0 0 60px rgba(249,115,22,0.6)",
          margin: "0 auto 16px",
          animation: "radar-sun-pulse 3.5s ease-in-out infinite",
        }} />
        <h2 style={{ margin: 0, fontSize: 26, fontWeight: 900, letterSpacing: -0.5 }}>{season.title}</h2>
        <p style={{ margin: "10px auto 0", color: colors.textSub, fontSize: 14, lineHeight: 1.6, maxWidth: 560 }}>
          {season.message}
        </p>
        <style>{`
          @keyframes radar-sun-pulse {
            0%, 100% { transform: scale(1); opacity: 0.9; }
            50% { transform: scale(1.08); opacity: 1; }
          }
        `}</style>
      </section>

      {/* Countdown */}
      <section style={cardStyle({ padding: 20, alignItems: "center", border: `1px solid ${colors.cyan}55` })}>
        <div style={{ color: colors.cyan, fontSize: 11, fontWeight: 900, letterSpacing: 1.2, textAlign: "center" }}>
          IL RADAR SI RIACCENDE
        </div>
        <div style={{ color: colors.textSub, fontSize: 13, marginTop: 4, textAlign: "center" }}>{wakeFmt}</div>
        <div style={{ display: "flex", gap: 20, marginTop: 14, justifyContent: "center" }}>
          <CountCell num={days} label={days === 1 ? "GIORNO" : "GIORNI"} />
          <div style={{ width: 1, background: `${colors.border}` }} />
          <CountCell num={hours} label={hours === 1 ? "ORA" : "ORE"} />
        </div>
      </section>

      <section style={cardStyle({ padding: 16 })}>
        <div style={{ color: colors.textPrimary, fontSize: 14, fontWeight: 800, marginBottom: 6 }}>
          Nel frattempo…
        </div>
        <p style={{ margin: 0, color: colors.textSub, fontSize: 13, lineHeight: 1.6 }}>
          Puoi continuare a studiare, fare interrogazioni con l'AI, generare mappe concettuali e
          allenarti con temi. Il Radar tornerà attivo automaticamente per la sessione {season.next_year}.
        </p>
        <button onClick={onGoHome} style={{
          marginTop: 12, padding: "10px 18px", borderRadius: radius.md,
          background: `${colors.purple}22`, border: `1px solid ${colors.purple}77`,
          color: colors.purple, fontWeight: 800, fontSize: 13, cursor: "pointer",
        }}>
          Torna alla home
        </button>
      </section>
    </div>
  );
}

function CountCell({ num, label }: { num: number; label: string }) {
  return (
    <div style={{ textAlign: "center", minWidth: 72 }}>
      <div style={{ color: "#fff", fontSize: 38, fontWeight: 900, letterSpacing: -1, lineHeight: 1 }}>{num}</div>
      <div style={{ color: colors.textMuted, fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginTop: 4 }}>
        {label}
      </div>
    </div>
  );
}

// =================================================================================
// LOCKED (Pacchetto Maturità paywall)
// =================================================================================
function LockedPaywall({ onUpgrade }: { onUpgrade: () => void }) {
  return (
    <section style={{
      padding: 32,
      borderRadius: radius.xl,
      background: `linear-gradient(135deg, ${colors.orange}18 0%, ${colors.purple}0a 100%)`,
      border: `1px solid ${colors.orange}55`,
      textAlign: "center",
    }}>
      <div style={{
        width: 76, height: 76, borderRadius: 22,
        background: `${colors.orange}18`, border: `1px solid ${colors.orange}66`,
        display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 14,
      }}>
        <Lock size={34} color={colors.orange} />
      </div>
      <h2 style={{ margin: 0, fontSize: 22, fontWeight: 900, letterSpacing: -0.5 }}>Sblocca il Pacchetto Maturità</h2>
      <p style={{ margin: "10px auto 16px", color: colors.textSub, fontSize: 14, lineHeight: 1.6, maxWidth: 500 }}>
        Il Radar Maturità è incluso nel <strong>Pacchetto Maturità</strong>: acquisto una tantum, valido
        fino al tuo esame. Analisi trend, argomenti probabili, attualità e collegamenti interdisciplinari.
      </p>
      <button onClick={onUpgrade} style={{
        padding: "12px 22px", borderRadius: radius.md,
        background: `linear-gradient(135deg, ${colors.orange} 0%, ${colors.purple} 100%)`,
        color: "#fff", fontWeight: 900, fontSize: 14, border: "none", cursor: "pointer",
        display: "inline-flex", alignItems: "center", gap: 6,
      }}>
        <Sparkles size={16} /> Vai alla Maturità
      </button>
    </section>
  );
}

// =================================================================================
// TAB VIEWS
// =================================================================================
function LoadingCard() {
  return (
    <section style={cardStyle({ padding: 40, alignItems: "center", justifyContent: "center", gap: 12 })}>
      <Loader2 size={26} color={colors.green} className="spin" />
      <div style={{ color: colors.textSub, fontSize: 13 }}>Il Radar sta analizzando trend e tracce…</div>
    </section>
  );
}

function Disclaimer({ text }: { text?: string }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 6,
      padding: 10, borderRadius: radius.md,
      background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.3)",
    }}>
      <Info size={14} color={colors.orange} />
      <span style={{ color: colors.orange, fontSize: 11, flex: 1 }}>
        {text || "Si tratta di trend e probabilità, non di previsioni certe."}
      </span>
    </div>
  );
}

function TrendView({ data, year }: { data: any; year: number }) {
  return (
    <>
      <section style={cardStyle({
        padding: 24,
        alignItems: "center",
        border: `1px solid ${colors.green}44`,
        background: `linear-gradient(135deg, ${colors.green}0d 0%, ${colors.cyan}05 100%)`,
      })}>
        <div style={{ color: "#fff", fontWeight: 900, fontSize: 20 }}>I temi più probabili</div>
        <div style={{ color: colors.textSub, fontSize: 12, marginTop: 4, textAlign: "center" }}>
          Analisi basata su tracce passate, eventi e attualità
        </div>
        <div style={{ marginTop: 20, marginBottom: 4, display: "flex", justifyContent: "center" }}>
          <RadarChart items={data?.topics || []} year={data?.year || year} />
        </div>
      </section>

      <Disclaimer text={data?.disclaimer} />

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {(data?.topics || []).map((it: any) => (
          <TopicRow key={it.rank} item={it} />
        ))}
      </div>

      {data?.focus_month && (
        <section style={cardStyle({ padding: 18, border: `1px solid ${colors.green}55` })}>
          <div style={{ color: colors.green, fontWeight: 900, fontSize: 11, letterSpacing: 1.2 }}>
            FOCUS DEL MESE
          </div>
          <div style={{ color: "#fff", fontWeight: 800, fontSize: 17, marginTop: 6 }}>{data.focus_month.title}</div>
          <div style={{ color: colors.textSub, fontSize: 13, marginTop: 4, lineHeight: 1.5 }}>
            {data.focus_month.detail}
          </div>
        </section>
      )}
    </>
  );
}

function TopicRow({ item }: { item: any }) {
  const p = Number(item.probability) || 0;
  const c = p >= 80 ? colors.green : p >= 70 ? colors.cyan : p >= 60 ? colors.purple : colors.orange;
  const TrendIcon = item.trend === "up" ? TrendingUp : item.trend === "down" ? TrendingDown : Minus;
  return (
    <div style={cardStyle({ padding: 14, gap: 10 })}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 12,
          background: `${c}1c`, border: `1px solid ${c}55`,
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}>
          <span style={{ color: c, fontWeight: 900, fontSize: 15 }}>{item.rank}</span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: "#fff", fontWeight: 800, fontSize: 15 }}>{item.topic}</div>
          <div style={{ color: colors.textSub, fontSize: 11, marginTop: 2 }}>
            {(item.subjects || []).join(" • ")}
          </div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ color: c, fontWeight: 900, fontSize: 20 }}>{p}%</div>
          <TrendIcon size={14} color={c} />
        </div>
      </div>
      {(item.exam_hook || item.interdisciplinary) && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {item.interdisciplinary && (
            <div style={{ color: colors.textSub, fontSize: 12, lineHeight: 1.5 }}>
              <span style={{ color: colors.cyan, fontWeight: 700 }}>Collegamenti: </span>
              {item.interdisciplinary}
            </div>
          )}
          {item.exam_hook && (
            <div style={{ color: colors.textSub, fontSize: 12, lineHeight: 1.5 }}>
              <span style={{ color: colors.purple, fontWeight: 700 }}>Spunto: </span>
              {item.exam_hook}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SubjectView({ data }: { data: any }) {
  return (
    <>
      <Disclaimer text={data?.disclaimer} />
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {(data?.topics || []).map((t: any, i: number) => (
          <div key={i} style={cardStyle({ padding: 14, gap: 8 })}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
              <div style={{ color: "#fff", fontWeight: 800, fontSize: 15, flex: 1 }}>{t.topic}</div>
              <div style={{
                padding: "4px 12px", borderRadius: 999,
                background: `${colors.purple}22`, border: `1px solid ${colors.purple}77`,
                color: colors.purple, fontSize: 12, fontWeight: 900,
              }}>{t.probability}%</div>
            </div>
            {t.why && <div style={{ color: colors.textSub, fontSize: 12, lineHeight: 1.5 }}>{t.why}</div>}
            {t.exam_hook && (
              <div style={{ color: colors.cyan, fontSize: 12, lineHeight: 1.5 }}>
                💡 {t.exam_hook}
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}

function ActualityView({ data }: { data: any }) {
  return (
    <>
      <Disclaimer text={data?.disclaimer} />
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {(data?.topics || []).map((t: any, i: number) => (
          <div key={i} style={cardStyle({ padding: 14, gap: 8 })}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
              <div style={{ color: "#fff", fontWeight: 800, fontSize: 15, flex: 1 }}>{t.topic}</div>
              <div style={{ color: colors.orange, fontWeight: 900, fontSize: 17 }}>{t.probability}%</div>
            </div>
            <div style={{ color: colors.textSub, fontSize: 11 }}>{(t.subjects || []).join(" • ")}</div>
            {t.why && <div style={{ color: colors.textSub, fontSize: 12, lineHeight: 1.5 }}>{t.why}</div>}
            {t.exam_hook && <div style={{ color: colors.green, fontSize: 12 }}>💡 {t.exam_hook}</div>}
          </div>
        ))}
      </div>
    </>
  );
}

function ConnectionsView({ data }: { data: any }) {
  return (
    <>
      <Disclaimer text={data?.disclaimer} />
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {(data?.connections || []).map((c: any, i: number) => (
          <div key={i} style={cardStyle({ padding: 16, gap: 12, border: `1px solid ${colors.cyan}44` })}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{
                width: 10, height: 10, borderRadius: 5,
                background: `linear-gradient(135deg, ${colors.cyan} 0%, ${colors.purple} 100%)`,
              }} />
              <div style={{ color: "#fff", fontWeight: 800, fontSize: 15 }}>{c.theme}</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {(c.links || []).map((l: any, j: number) => (
                <div key={j} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <div style={{
                    padding: "3px 10px", borderRadius: 6,
                    background: `${colors.cyan}12`, border: `1px solid ${colors.cyan}55`,
                    color: colors.cyan, fontWeight: 700, fontSize: 11,
                    flexShrink: 0,
                  }}>{l.subject}</div>
                  <div style={{ color: colors.textSub, fontSize: 13, flex: 1, lineHeight: 1.55 }}>{l.point}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

// =================================================================================
// STYLE HELPERS
// =================================================================================
function iconWrap(color: string): React.CSSProperties {
  return {
    width: 44, height: 44, borderRadius: 14,
    background: `${color}1a`, border: `1px solid ${color}55`,
    display: "flex", alignItems: "center", justifyContent: "center",
  };
}

function cardStyle(extra: React.CSSProperties = {}): React.CSSProperties {
  return {
    padding: 18,
    borderRadius: radius.lg,
    background: colors.bgGlass,
    border: `1px solid ${colors.border}`,
    display: "flex",
    flexDirection: "column",
    gap: 10,
    ...extra,
  };
}

function pillBtn(active: boolean, color: string): React.CSSProperties {
  return {
    padding: "8px 16px",
    borderRadius: 999,
    background: active ? `${color}22` : colors.bgGlass,
    border: `1px solid ${active ? color : colors.border}`,
    color: active ? color : colors.textSub,
    fontSize: 12,
    fontWeight: 800,
    cursor: "pointer",
    transition: "background 150ms, border-color 150ms, color 150ms",
  };
}

// Re-export Compass just to satisfy lucide-react tree-shaking hint if any consumer needs it later.
export { Compass as MaturitaCompassIcon };
