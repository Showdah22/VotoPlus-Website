// Voto+ Desktop 1.2.1 — Wizard di setup profilo (mirror mobile profile-setup.tsx).
// 4 step: anno → tipo scuola → materie → tema (nuovo)
import { useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../store/auth";
import { useTheme, ThemeMode } from "../lib/theme-provider";
import { radius } from "../theme";
import votoIcon from "../assets/voto-icon.png";

type SchoolType =
  | "liceo_classico" | "liceo_scientifico" | "liceo_linguistico"
  | "liceo_artistico" | "liceo_scienze_umane" | "liceo_musicale"
  | "itis" | "itc" | "ipsia" | "professionale" | "altro";

const YEARS: { value: number; label: string; sub: string; maturita?: boolean }[] = [
  { value: 1, label: "1ª", sub: "Primo anno" },
  { value: 2, label: "2ª", sub: "Secondo anno" },
  { value: 3, label: "3ª", sub: "Terzo anno" },
  { value: 4, label: "4ª", sub: "Quarto anno" },
  { value: 5, label: "5ª", sub: "Maturità", maturita: true },
];

const SCHOOL_OPTIONS: { value: SchoolType; label: string; icon: string }[] = [
  { value: "liceo_classico", label: "Liceo Classico", icon: "📚" },
  { value: "liceo_scientifico", label: "Liceo Scientifico", icon: "🔬" },
  { value: "liceo_linguistico", label: "Liceo Linguistico", icon: "🌍" },
  { value: "liceo_scienze_umane", label: "Liceo Scienze Umane", icon: "🧑‍🤝‍🧑" },
  { value: "liceo_artistico", label: "Liceo Artistico", icon: "🎨" },
  { value: "liceo_musicale", label: "Liceo Musicale", icon: "🎵" },
  { value: "itis", label: "ITIS (Tecnico Industriale)", icon: "⚙️" },
  { value: "itc", label: "ITC (Tecnico Commerciale)", icon: "📊" },
  { value: "ipsia", label: "IPSIA", icon: "🛠️" },
  { value: "professionale", label: "Istituto Professionale", icon: "💼" },
  { value: "altro", label: "Altro indirizzo", icon: "🎓" },
];

const DEFAULT_SUBJECTS_BY_TYPE: Record<SchoolType, string[]> = {
  liceo_classico: ["Italiano", "Latino", "Greco", "Storia", "Filosofia", "Inglese", "Matematica", "Scienze"],
  liceo_scientifico: ["Italiano", "Matematica", "Fisica", "Scienze", "Storia", "Filosofia", "Inglese", "Latino"],
  liceo_linguistico: ["Italiano", "Inglese", "Spagnolo", "Francese", "Storia", "Filosofia", "Matematica", "Scienze"],
  liceo_artistico: ["Italiano", "Storia dell'arte", "Discipline pittoriche", "Storia", "Filosofia", "Matematica", "Inglese"],
  liceo_scienze_umane: ["Italiano", "Scienze umane", "Storia", "Filosofia", "Matematica", "Inglese", "Diritto"],
  liceo_musicale: ["Italiano", "Storia della musica", "Teoria musicale", "Storia", "Inglese", "Matematica"],
  itis: ["Italiano", "Matematica", "Elettronica", "Informatica", "Sistemi", "Inglese", "Storia"],
  itc: ["Italiano", "Economia aziendale", "Diritto", "Matematica", "Inglese", "Informatica", "Storia"],
  ipsia: ["Italiano", "Matematica", "Tecnologie meccaniche", "Inglese", "Storia", "Laboratorio"],
  professionale: ["Italiano", "Matematica", "Inglese", "Storia", "Tecnologie"],
  altro: ["Italiano", "Matematica", "Inglese", "Storia"],
};

const SCHOOL_TYPE_LABEL: Record<SchoolType, string> = {
  liceo_classico: "Liceo Classico",
  liceo_scientifico: "Liceo Scientifico",
  liceo_linguistico: "Liceo Linguistico",
  liceo_artistico: "Liceo Artistico",
  liceo_scienze_umane: "Liceo Scienze Umane",
  liceo_musicale: "Liceo Musicale",
  itis: "ITIS",
  itc: "ITC",
  ipsia: "IPSIA",
  professionale: "Istituto Professionale",
  altro: "Altro indirizzo",
};

const TOTAL_STEPS = 4;

export function ProfileSetupPage() {
  const { colors, mode, setMode } = useTheme();
  const navigate = useNavigate();
  const token = useAuth((s) => s.token);
  const user = useAuth((s) => s.user);
  const setSession = useAuth((s) => s.setSession);

  const [step, setStep] = useState<0 | 1 | 2 | 3>(0);
  const [year, setYear] = useState<number | null>(null);
  const [schoolType, setSchoolType] = useState<SchoolType | null>(null);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [customSubject, setCustomSubject] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!token) return <Navigate to="/login" replace />;
  if (user && !user.email_verified) return <Navigate to="/verify-email" replace />;
  if (user?.profile_completed) return <Navigate to="/" replace />;

  const handleSchoolPick = (t: SchoolType) => {
    setSchoolType(t);
    if (subjects.length === 0) {
      setSubjects(DEFAULT_SUBJECTS_BY_TYPE[t].slice(0, 8));
    }
  };

  const toggleSubject = (s: string) => {
    setSubjects((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  };

  const addCustomSubject = () => {
    const v = customSubject.trim();
    if (!v) return;
    if (subjects.length >= 12) return;
    if (!subjects.some((s) => s.toLowerCase() === v.toLowerCase())) {
      setSubjects((prev) => [...prev, v]);
    }
    setCustomSubject("");
  };

  const canGoNext = useMemo(() => {
    if (step === 0) return year !== null;
    if (step === 1) return schoolType !== null;
    if (step === 2) return subjects.length >= 2;
    if (step === 3) return mode !== undefined; // sempre valido
    return false;
  }, [step, year, schoolType, subjects, mode]);

  const onSubmit = async () => {
    if (!year || !schoolType || !token) return;
    setSubmitting(true);
    setError(null);
    try {
      const updated = await api.profileSetup({ school_year: year, school_type: schoolType, subjects }, token);
      setSession(token, updated);
      navigate("/", { replace: true });
    } catch (err: any) {
      setError(err?.message || "Impossibile salvare il profilo. Riprova.");
    } finally {
      setSubmitting(false);
    }
  };

  const progressPct = ((step + 1) / TOTAL_STEPS) * 100;

  return (
    <div
      style={{
        height: "100%",
        overflowY: "auto",
        background: `radial-gradient(circle at 30% 20%, ${colors.purple}18, transparent 55%), radial-gradient(circle at 80% 80%, ${colors.cyan}18, transparent 60%), ${colors.bg}`,
      }}
    >
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "32px 24px 120px", display: "flex", flexDirection: "column", gap: 20 }}>
        {/* HEADER */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <img src={votoIcon} alt="Voto+" style={{ width: 44, height: 44, objectFit: "contain" }} />
          <div style={{ flex: 1 }}>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: colors.textPrimary }}>Voto+</h1>
            <p style={{ margin: 0, fontSize: 12, color: colors.textMuted }}>Configurazione profilo</p>
          </div>
          <div
            style={{
              padding: "6px 14px",
              borderRadius: 999,
              background: `${colors.purple}22`,
              border: `1px solid ${colors.purple}55`,
              color: colors.purple,
              fontWeight: 800,
              fontSize: 12,
            }}
          >
            {step + 1} di {TOTAL_STEPS}
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ height: 5, background: colors.bgGlass, borderRadius: 999, overflow: "hidden" }}>
          <div
            style={{
              width: `${progressPct}%`,
              height: "100%",
              background: `linear-gradient(90deg, ${colors.purple} 0%, ${colors.cyan} 100%)`,
              transition: "width 220ms ease",
            }}
          />
        </div>

        {/* STEP CONTENT */}
        {step === 0 && (
          <StepYear year={year} onPick={setYear} colors={colors} />
        )}
        {step === 1 && (
          <StepSchool selected={schoolType} onPick={handleSchoolPick} colors={colors} />
        )}
        {step === 2 && schoolType && (
          <StepSubjects
            schoolType={schoolType}
            selected={subjects}
            onToggle={toggleSubject}
            customSubject={customSubject}
            onChangeCustom={setCustomSubject}
            onAddCustom={addCustomSubject}
            colors={colors}
          />
        )}
        {step === 3 && (
          <StepTheme mode={mode} setMode={setMode} colors={colors} />
        )}

        {error && (
          <div
            style={{
              padding: 12,
              borderRadius: radius.md,
              background: `${colors.red}1a`,
              border: `1px solid ${colors.red}55`,
              color: colors.red,
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            {error}
          </div>
        )}

        {/* FOOTER NAV */}
        <div
          style={{
            display: "flex",
            gap: 12,
            marginTop: 8,
            paddingTop: 16,
            borderTop: `1px solid ${colors.border}`,
          }}
        >
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(0, s - 1) as any)}
            disabled={step === 0}
            style={{
              padding: "14px 22px",
              borderRadius: radius.lg,
              border: `1px solid ${colors.border}`,
              background: colors.bgGlass,
              color: colors.textPrimary,
              fontWeight: 700,
              fontSize: 14,
              cursor: step === 0 ? "default" : "pointer",
              opacity: step === 0 ? 0 : 1,
              transition: "opacity 200ms",
            }}
          >
            ← Indietro
          </button>
          <div style={{ flex: 1 }} />
          {step < 3 ? (
            <button
              type="button"
              onClick={() => setStep((s) => (s + 1) as any)}
              disabled={!canGoNext}
              style={{
                padding: "14px 28px",
                borderRadius: radius.lg,
                border: "none",
                background: canGoNext
                  ? `linear-gradient(135deg, ${colors.purple} 0%, ${colors.blue} 100%)`
                  : colors.bgGlass,
                color: canGoNext ? "#fff" : colors.textMuted,
                fontWeight: 800,
                fontSize: 15,
                cursor: canGoNext ? "pointer" : "not-allowed",
                boxShadow: canGoNext ? `0 6px 24px ${colors.purple}55` : "none",
              }}
            >
              Avanti →
            </button>
          ) : (
            <button
              type="button"
              onClick={onSubmit}
              disabled={!canGoNext || submitting}
              style={{
                padding: "14px 28px",
                borderRadius: radius.lg,
                border: "none",
                background: `linear-gradient(135deg, ${colors.purple} 0%, ${colors.blue} 100%)`,
                color: colors.textPrimary,
                fontWeight: 800,
                fontSize: 15,
                cursor: submitting ? "wait" : "pointer",
                opacity: submitting ? 0.7 : 1,
                boxShadow: `0 6px 24px ${colors.purple}55`,
              }}
            >
              {submitting ? "Salvataggio…" : "Inizia con Voto+ ✨"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// STEP COMPONENTS
// ============================================================================

function StepYear({ year, onPick, colors }: { year: number | null; onPick: (y: number) => void; colors: any }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div>
        <h2 style={{ margin: 0, fontSize: 26, fontWeight: 900, color: colors.textPrimary, letterSpacing: -0.5 }}>
          In che anno sei?
        </h2>
        <p style={{ margin: "6px 0 0 0", fontSize: 14, color: colors.textSub, lineHeight: 1.5 }}>
          L&apos;app calibrerà difficoltà, esempi e strumenti sul tuo livello. Al primo settembre la classe avanza da sola.
        </p>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {YEARS.map((y) => {
          const active = year === y.value;
          return (
            <button
              key={y.value}
              type="button"
              onClick={() => onPick(y.value)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                padding: "16px 18px",
                borderRadius: radius.lg,
                border: `1.5px solid ${active ? colors.purple : colors.border}`,
                background: active
                  ? `linear-gradient(135deg, ${colors.purple} 0%, ${colors.cyan} 100%)`
                  : colors.bgGlass,
                cursor: "pointer",
                transition: "all 180ms ease",
                textAlign: "left",
                width: "100%",
              }}
            >
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 14,
                  background: active ? "rgba(255,255,255,0.22)" : `${colors.purple}22`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 20,
                  fontWeight: 900,
                  color: active ? "#fff" : colors.purple,
                }}
              >
                {y.label}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: active ? "#fff" : colors.textPrimary }}>
                  {y.sub}
                </div>
                {y.maturita && (
                  <div style={{ fontSize: 11, color: active ? "rgba(255,255,255,0.9)" : colors.orange, marginTop: 3, fontWeight: 700 }}>
                    ✨ Sblocca il Maturità Radar
                  </div>
                )}
              </div>
              {active && <span style={{ fontSize: 22, color: colors.textPrimary }}>✓</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StepSchool({ selected, onPick, colors }: { selected: SchoolType | null; onPick: (t: SchoolType) => void; colors: any }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div>
        <h2 style={{ margin: 0, fontSize: 26, fontWeight: 900, color: colors.textPrimary, letterSpacing: -0.5 }}>
          Che scuola frequenti?
        </h2>
        <p style={{ margin: "6px 0 0 0", fontSize: 14, color: colors.textSub, lineHeight: 1.5 }}>
          Questo aiuta Voto+ a tarare il vocabolario, gli esempi e il livello richiesto agli orali.
        </p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
        {SCHOOL_OPTIONS.map((opt) => {
          const active = selected === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onPick(opt.value)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "14px 16px",
                borderRadius: radius.md,
                border: `1.5px solid ${active ? colors.purple : colors.border}`,
                background: active
                  ? `linear-gradient(135deg, ${colors.purple} 0%, ${colors.cyan} 100%)`
                  : colors.bgGlass,
                cursor: "pointer",
                transition: "all 180ms",
                textAlign: "left",
              }}
            >
              <span style={{ fontSize: 22 }}>{opt.icon}</span>
              <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: active ? "#fff" : colors.textPrimary }}>
                {opt.label}
              </span>
              {active && <span style={{ fontSize: 18, color: colors.textPrimary }}>✓</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StepSubjects({
  schoolType, selected, onToggle, customSubject, onChangeCustom, onAddCustom, colors,
}: {
  schoolType: SchoolType;
  selected: string[];
  onToggle: (s: string) => void;
  customSubject: string;
  onChangeCustom: (s: string) => void;
  onAddCustom: () => void;
  colors: any;
}) {
  const suggested = DEFAULT_SUBJECTS_BY_TYPE[schoolType] || [];
  const allChips = useMemo(() => {
    const set = new Set([...suggested, ...selected]);
    return Array.from(set);
  }, [suggested, selected]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div>
        <h2 style={{ margin: 0, fontSize: 26, fontWeight: 900, color: colors.textPrimary, letterSpacing: -0.5 }}>
          Quali materie studi?
        </h2>
        <p style={{ margin: "6px 0 0 0", fontSize: 14, color: colors.textSub, lineHeight: 1.5 }}>
          Abbiamo pre-selezionato le materie tipiche del {SCHOOL_TYPE_LABEL[schoolType]}. Puoi
          rimuoverle o aggiungerne di nuove. Scegli almeno 2.
        </p>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {allChips.map((s) => {
          const active = selected.includes(s);
          return (
            <button
              key={s}
              type="button"
              onClick={() => onToggle(s)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "9px 14px",
                borderRadius: 999,
                border: `1.5px solid ${active ? colors.purple : colors.border}`,
                background: active ? colors.purple : colors.bgGlass,
                color: active ? "#fff" : colors.textPrimary,
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {active && <span>✓</span>}
              {s}
            </button>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 6 }}>
        <input
          value={customSubject}
          onChange={(e) => onChangeCustom(e.target.value)}
          placeholder="Aggiungi materia (es. Diritto)"
          maxLength={28}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onAddCustom();
            }
          }}
          style={{
            flex: 1,
            height: 44,
            padding: "0 14px",
            borderRadius: radius.md,
            background: colors.bgGlass,
            border: `1px solid ${colors.border}`,
            color: colors.textPrimary,
            fontSize: 14,
            outline: "none",
          }}
        />
        <button
          type="button"
          onClick={onAddCustom}
          disabled={!customSubject.trim()}
          style={{
            width: 44,
            height: 44,
            borderRadius: radius.md,
            border: "none",
            background: colors.purple,
            color: colors.textPrimary,
            fontSize: 22,
            fontWeight: 900,
            cursor: customSubject.trim() ? "pointer" : "not-allowed",
            opacity: customSubject.trim() ? 1 : 0.5,
          }}
        >
          +
        </button>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 2, fontSize: 11 }}>
        <span style={{ color: colors.textMuted }}>Selezionate: {selected.length}/12</span>
        {selected.length < 2 && (
          <span style={{ color: colors.orange, fontWeight: 700 }}>Scegli almeno 2 materie</span>
        )}
      </div>
    </div>
  );
}

function StepTheme({ mode, setMode, colors }: { mode: ThemeMode; setMode: (m: ThemeMode) => void; colors: any }) {
  const options: { value: ThemeMode; label: string; sub: string; emoji: string }[] = [
    { value: "light", label: "Chiaro", sub: "Interfaccia luminosa, ideale di giorno", emoji: "☀️" },
    { value: "dark", label: "Scuro", sub: "Interfaccia scura, riposa gli occhi", emoji: "🌙" },
    { value: "auto", label: "Automatico", sub: "Segue il tema del sistema operativo", emoji: "🌗" },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div>
        <h2 style={{ margin: 0, fontSize: 26, fontWeight: 900, color: colors.textPrimary, letterSpacing: -0.5 }}>
          Scegli il tuo tema
        </h2>
        <p style={{ margin: "6px 0 0 0", fontSize: 14, color: colors.textSub, lineHeight: 1.5 }}>
          Puoi cambiarlo in qualsiasi momento dalle Impostazioni.
        </p>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {options.map((opt) => {
          const active = mode === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => setMode(opt.value)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                padding: "16px 18px",
                borderRadius: radius.lg,
                border: `1.5px solid ${active ? colors.purple : colors.border}`,
                background: active
                  ? `linear-gradient(135deg, ${colors.purple} 0%, ${colors.cyan} 100%)`
                  : colors.bgGlass,
                cursor: "pointer",
                transition: "all 180ms",
                textAlign: "left",
                width: "100%",
              }}
            >
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 14,
                  background: active ? "rgba(255,255,255,0.22)" : `${colors.purple}22`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 26,
                }}
              >
                {opt.emoji}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: active ? "#fff" : colors.textPrimary }}>
                  {opt.label}
                </div>
                <div style={{ fontSize: 12, color: active ? "rgba(255,255,255,0.85)" : colors.textSub, marginTop: 2 }}>
                  {opt.sub}
                </div>
              </div>
              {active && <span style={{ fontSize: 22, color: colors.textPrimary }}>✓</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
