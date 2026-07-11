import { useEffect, useState } from "react";
import {
  Gauge,
  Crown,
  Users,
  GraduationCap,
  Sparkles,
  Check,
  ExternalLink,
  Info,
  Smartphone,
  type LucideIcon,
} from "lucide-react";
import { colors, radius } from "../theme";
import { useAuth } from "../store/auth";
import { api } from "../api/client";

/**
 * Sezione Piani (Impostazioni desktop) — parity con la pagina Premium mobile.
 * Mostra:
 *  1. Utilizzo del mese (barre progresso da GET /me/quota) — parity mobile.
 *  2. Elenco piani abbonamento + pacchetto Maturità.
 *
 * NB checkout desktop: al momento *non* c'è un flusso di pagamento diretto
 * nell'app desktop. Il pulsante di acquisto apre l'app mobile (deep link o CTA)
 * finché non integriamo Stripe/paddle sul desktop. Il tuo abbonamento attivo
 * comprato su mobile è comunque riconosciuto (login condiviso).
 */

type Plan = {
  id: "free" | "premium" | "family" | "school_year" | "maturita";
  name: string;
  price: string;
  period: string;
  color: string;
  featured?: boolean;
  Icon: LucideIcon;
  description: string;
  perks: string[];
};

const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    price: "Gratis",
    period: "sempre",
    color: colors.textMuted,
    Icon: Info,
    description: "Piano gratuito per iniziare. Nessun addebito, funzionalità di base sempre disponibili.",
    perks: ["Analisi di base", "Matematica base", "Materie illimitate"],
  },
  {
    id: "premium",
    name: "Premium Individual",
    price: "€4,99",
    period: "al mese",
    color: colors.purple,
    featured: true,
    Icon: Crown,
    description: "Tutte le funzioni Voto+ senza limiti, per un solo studente.",
    perks: [
      "Analisi e riassunti illimitati",
      "Interrogazioni vocali illimitate",
      "Dammi un voto in più",
      "Spiegazioni audio",
      "Supporto prioritario",
    ],
  },
  {
    id: "family",
    name: "Premium Family",
    price: "€8,99",
    period: "al mese",
    color: colors.blue,
    Icon: Users,
    description: "Tutte le funzioni Premium condivise fino a 3 persone, un solo pagamento.",
    perks: ["Tutto Premium per 3 persone", "Cronologia indipendente", "Risparmi il 41%"],
  },
  {
    id: "school_year",
    name: "Premium Annuale",
    price: "€34,99",
    period: "all'anno",
    color: colors.orange,
    Icon: Sparkles,
    description: "Copre l'anno scolastico + i mesi estivi, per un solo studente.",
    perks: [
      "9 mesi scolastici Premium",
      "3 mesi gratis in estate",
      "Rinnovo automatico annuale",
      "Risparmi ~22%",
    ],
  },
  {
    id: "maturita",
    name: "Pacchetto Maturità",
    price: "€7,49",
    period: "una tantum",
    color: colors.green,
    Icon: GraduationCap,
    description: "Preparazione mirata all'Esame di Stato: radar, simulazioni, colloquio.",
    perks: [
      "Maturità Radar Pro",
      "Simulazioni prima/seconda prova",
      "Allenamento al colloquio",
      "Rinnovo annuale",
    ],
  },
];

export function PianiSection() {
  const token = useAuth((s) => s.token);
  const user = useAuth((s) => s.user);
  const [quota, setQuota] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const currentPlan = (user?.plan || "free") as Plan["id"];

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    api
      .meQuota(token)
      .then(setQuota)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  const tierLabel = quota?.tier === "premium" ? "PIANO ATTIVO" : "PIANO FREE";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Utilizzo del mese */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <Gauge size={14} color={colors.purple} />
          <span style={{ fontSize: 13, fontWeight: 800, color: colors.textPrimary }}>Utilizzo di questo mese</span>
          <div style={{ flex: 1 }} />
          <span style={{
            fontSize: 10,
            fontWeight: 900,
            letterSpacing: 0.8,
            color: quota?.tier === "premium" ? colors.purple : colors.textMuted,
            background: quota?.tier === "premium" ? `${colors.purple}18` : colors.bgGlass,
            border: `1px solid ${quota?.tier === "premium" ? colors.purple + "55" : colors.border}`,
            padding: "3px 10px",
            borderRadius: 999,
            textTransform: "uppercase",
          }}>{tierLabel}</span>
        </div>

        {loading ? (
          <div style={{ padding: 20, textAlign: "center", fontSize: 12, color: colors.textMuted }}>
            Caricamento utilizzo…
          </div>
        ) : !quota || !quota.items || Object.keys(quota.items).length === 0 ? (
          <div style={{
            padding: 14,
            borderRadius: radius.sm,
            background: colors.bgGlass,
            border: `1px solid ${colors.border}`,
            fontSize: 12,
            color: colors.textSub,
          }}>
            Nessuna quota da mostrare. Se sei Premium hai accesso illimitato a tutte le funzionalità.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {Object.entries(quota.items).map(([k, v]: [string, any]) => (
              <QuotaBar key={k} label={v.label} used={v.used} limit={v.limit} />
            ))}
          </div>
        )}
      </div>

      {/* Piani */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <Crown size={14} color={colors.purple} />
          <span style={{ fontSize: 13, fontWeight: 800, color: colors.textPrimary }}>Piani &amp; abbonamenti</span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
          {PLANS.map((p) => (
            <PlanCard key={p.id} plan={p} isCurrent={currentPlan === p.id} />
          ))}
        </div>

        {/* Disclaimer desktop */}
        <div style={{
          marginTop: 14,
          padding: 14,
          borderRadius: radius.md,
          background: `${colors.cyan}10`,
          border: `1px solid ${colors.cyan}44`,
          display: "flex",
          gap: 12,
          alignItems: "flex-start",
        }}>
          <Smartphone size={18} color={colors.cyan} style={{ flexShrink: 0, marginTop: 2 }} />
          <div style={{ fontSize: 12.5, color: colors.textSub, lineHeight: 1.6 }}>
            <strong style={{ color: colors.textPrimary }}>Acquisti dall'app mobile.</strong>{" "}
            Al momento gli abbonamenti si acquistano solo dall'app iOS/Android di Voto+.
            Il tuo abbonamento è riconosciuto anche qui: appena lo attivi, tutte le funzioni
            Premium sono sbloccate anche sul desktop.
            <br />
            <span style={{ color: colors.textMuted, fontStyle: "italic", fontSize: 11 }}>
              Nelle prossime release integreremo il checkout Stripe direttamente dal desktop.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function QuotaBar({ label, used, limit }: { label: string; used: number; limit: number }) {
  const unlimited = limit >= 9999;
  const pct = unlimited ? 0 : Math.min(100, Math.round((used / Math.max(1, limit)) * 100));
  const barColor = unlimited
    ? colors.purple
    : pct >= 90
    ? colors.red
    : pct >= 60
    ? colors.orange
    : colors.green;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <span style={{ fontSize: 12, color: colors.textSub, fontWeight: 700 }}>{label}</span>
        <span style={{ fontSize: 12, color: "#fff", fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>
          {used}
          <span style={{ color: colors.textMuted, fontWeight: 600 }}>
            {" / "}{unlimited ? "∞" : limit}
          </span>
        </span>
      </div>
      <div style={{
        height: 8,
        borderRadius: 999,
        background: colors.bg,
        border: `1px solid ${colors.border}`,
        overflow: "hidden",
      }}>
        <div
          style={{
            width: unlimited ? "100%" : `${pct}%`,
            height: "100%",
            background: unlimited
              ? `linear-gradient(90deg, ${colors.purple}, ${colors.blue})`
              : barColor,
            transition: "width 300ms ease",
          }}
        />
      </div>
    </div>
  );
}

function PlanCard({ plan, isCurrent }: { plan: Plan; isCurrent: boolean }) {
  const { Icon, color, featured } = plan;
  return (
    <article
      style={{
        position: "relative",
        padding: 16,
        borderRadius: radius.md,
        background: featured
          ? `linear-gradient(135deg, ${color}18 0%, ${colors.blue}08 100%)`
          : colors.bgGlass,
        border: `1px solid ${isCurrent ? color : featured ? `${color}55` : colors.border}`,
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      {/* Ribbon per plan featured / current */}
      {(featured || isCurrent) && (
        <div style={{ position: "absolute", top: 10, right: 10, display: "flex", gap: 6 }}>
          {isCurrent && (
            <span style={{
              fontSize: 9,
              fontWeight: 900,
              letterSpacing: 0.8,
              color: colors.green,
              background: `${colors.green}22`,
              border: `1px solid ${colors.green}77`,
              padding: "2px 8px",
              borderRadius: 999,
              textTransform: "uppercase",
            }}>Attivo</span>
          )}
          {featured && !isCurrent && (
            <span style={{
              fontSize: 9,
              fontWeight: 900,
              letterSpacing: 0.8,
              color,
              background: `${color}22`,
              border: `1px solid ${color}77`,
              padding: "2px 8px",
              borderRadius: 999,
              textTransform: "uppercase",
            }}>Consigliato</span>
          )}
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: `${color}18`,
          border: `1px solid ${color}55`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Icon size={18} color={color} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: colors.textPrimary }}>{plan.name}</div>
          <div style={{ fontSize: 11, color: colors.textMuted, fontWeight: 700 }}>{plan.period}</div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
        <span style={{ fontSize: 22, fontWeight: 900, color, letterSpacing: -0.5 }}>{plan.price}</span>
      </div>

      <p style={{ margin: 0, fontSize: 12, color: colors.textSub, lineHeight: 1.5 }}>{plan.description}</p>

      <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 5 }}>
        {plan.perks.map((p, i) => (
          <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 6, fontSize: 12, color: colors.textPrimary }}>
            <Check size={12} color={color} style={{ marginTop: 3, flexShrink: 0 }} />
            <span>{p}</span>
          </li>
        ))}
      </ul>

      <button
        onClick={() => {
          // Nessun checkout desktop ancora: apri deep-link universale mobile
          // (o comunque il sito votoplus.it → download store). Per ora un alert
          // esplicito, evolveremo con Stripe.
          alert(
            plan.id === "free"
              ? "Sei sul piano Free."
              : "Per acquistare questo piano usa l'app Voto+ mobile (iOS o Android). L'abbonamento verrà riconosciuto anche qui sul desktop.",
          );
        }}
        disabled={isCurrent || plan.id === "free"}
        style={{
          marginTop: 4,
          padding: "9px 12px",
          borderRadius: radius.sm,
          background: isCurrent || plan.id === "free" ? colors.bgGlass : `${color}18`,
          border: `1px solid ${isCurrent || plan.id === "free" ? colors.border : color}`,
          color: isCurrent ? colors.green : plan.id === "free" ? colors.textMuted : color,
          fontWeight: 800,
          fontSize: 12,
          cursor: isCurrent || plan.id === "free" ? "default" : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
        }}
      >
        {isCurrent ? "Il tuo piano" : plan.id === "free" ? "Piano base" : <>
          Acquista su mobile <ExternalLink size={12} />
        </>}
      </button>
    </article>
  );
}
