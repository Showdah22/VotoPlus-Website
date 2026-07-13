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
  type LucideIcon,
} from "lucide-react";
import { colors, radius } from "../theme";
import { useAuth } from "../store/auth";
import { api, ApiError } from "../api/client";

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
  const refreshUser = useAuth((s) => s.refreshUser);
  const [quota, setQuota] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  // Stripe checkout state (Fase B — 2026-07)
  const [purchasing, setPurchasing] = useState<Plan["id"] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pollingSince, setPollingSince] = useState<number | null>(null);
  // Subscription state (per capire se mostrare checkout / portal / niente)
  const [subStatus, setSubStatus] = useState<{
    active: boolean;
    provider: "apple" | "google" | "stripe" | null;
    plan_sku: string | null;
    is_trial: boolean;
    plan_expires_at: string | null;
  } | null>(null);
  const [portalLoading, setPortalLoading] = useState<Plan["id"] | "manage" | null>(null);

  // Il piano corrente si desume dal plan_sku (più preciso di `plan`, che
  // colassa "premium" e "school_year" entrambi su "premium").
  const currentPlanFromSku = (subStatus?.plan_sku || null) as Plan["id"] | null;
  const currentPlanFromUser = (user?.plan || "free") as Plan["id"];
  const currentPlan: Plan["id"] = currentPlanFromSku ?? currentPlanFromUser;
  const currentProvider = subStatus?.provider ?? null;
  const hasActiveSub = !!subStatus?.active;

  // Trial-onboarding: dato dal backend al primo signup (7gg universali).
  // È DIVERSO dal trial di Stripe: qui l'utente è già Premium senza aver
  // pagato. Se si abbona ora, Stripe allinea il primo addebito alla scadenza
  // del nostro trial (nessun doppio addebito).
  const isTrialOnboarding = !!subStatus?.is_trial;
  const trialDaysLeft = (() => {
    if (!isTrialOnboarding || !subStatus?.plan_expires_at) return 0;
    const exp = new Date(subStatus.plan_expires_at).getTime();
    const now = Date.now();
    if (isNaN(exp) || exp <= now) return 0;
    return Math.max(1, Math.ceil((exp - now) / (24 * 60 * 60 * 1000)));
  })();

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    Promise.all([
      api.meQuota(token).then(setQuota).catch(() => {}),
      api
        .billingSubscriptionStatus(token)
        .then((s) => setSubStatus({
          active: s.active,
          provider: s.provider,
          plan_sku: s.plan_sku,
          is_trial: s.is_trial,
          plan_expires_at: s.plan_expires_at,
        }))
        .catch(() => {}),
    ]).finally(() => setLoading(false));
  }, [token]);

  // Polling subscription status dopo apertura Stripe Checkout esterna.
  // L'utente completa il pagamento nel browser → Stripe manda webhook al
  // backend → backend aggiorna il DB. Noi polliamo GET /subscription-status
  // ogni 3s per max 5 minuti, e appena `active=true` con `provider=stripe`
  // aggiorniamo user store + notifichiamo l'utente.
  useEffect(() => {
    if (!pollingSince || !token) return;
    let stopped = false;
    let attempts = 0;
    const MAX_ATTEMPTS = 100; // ~5 min a 3s interval

    const tick = async () => {
      if (stopped) return;
      attempts += 1;
      if (attempts > MAX_ATTEMPTS) {
        setPollingSince(null);
        setError(
          "Non abbiamo ancora rilevato l'attivazione. Se hai completato il pagamento, chiudi e riapri l'app.",
        );
        return;
      }
      try {
        const status = await api.billingSubscriptionStatus(token);
        if (status.active && status.provider === "stripe") {
          // Abbonamento attivato! Refresh dell'user store + stop polling.
          setPollingSince(null);
          setPurchasing(null);
          setError(null);
          setInfo("✅ Abbonamento attivato! Grazie 🎉");
          setSubStatus({
            active: status.active,
            provider: status.provider,
            plan_sku: status.plan_sku,
            is_trial: status.is_trial,
            plan_expires_at: status.plan_expires_at,
          });
          try {
            await refreshUser?.();
          } catch (_e) {
            /* refresh ottimistico: se il refresh fallisce non ha importanza,
               al prossimo refetch dell'user store verrà preso comunque. */
          }
          return;
        }
      } catch {
        // Ignora errori transitori (rete), continua polling
      }
      if (!stopped) setTimeout(tick, 3000);
    };
    setTimeout(tick, 2500); // primo tick dopo 2.5s (dà tempo al webhook)
    return () => { stopped = true; };
  }, [pollingSince, token, refreshUser]);

  // Apre il Billing Portal Stripe. Se `targetSku` è passato → deep-link al
  // flusso "subscription_update" (proration automatica). Se non è passato →
  // portale generico (gestione carta, fatture, cancellazione).
  const openBillingPortal = async (targetSku?: Plan["id"]) => {
    setError(null);
    setInfo(null);
    if (!token) {
      setError("Devi essere loggato per gestire l'abbonamento.");
      return;
    }
    const key: Plan["id"] | "manage" = targetSku ?? "manage";
    setPortalLoading(key);
    try {
      const body: {
        target_sku?: "premium" | "family" | "school_year" | "maturita";
      } = {};
      if (targetSku && targetSku !== "free") {
        body.target_sku = targetSku as "premium" | "family" | "school_year" | "maturita";
      }
      const resp = await api.billingStripePortal(body, token);
      const w = (window as any).voto;
      if (w?.openExternal) {
        await w.openExternal(resp.portal_url);
      } else {
        window.open(resp.portal_url, "_blank");
      }
      // Dopo aver aperto il portale, avviamo un polling leggero per
      // captare eventuali cambi (upgrade da mensile ad annuale).
      setPollingSince(Date.now());
      setInfo(
        targetSku
          ? "Ti abbiamo mandato al Portale Stripe per il cambio piano. Torna qui dopo la conferma — aggiorneremo tutto in automatico."
          : "Ti abbiamo mandato al Portale Stripe per gestire il tuo abbonamento.",
      );
    } catch (e: any) {
      const msg = String(e?.message || e || "Errore sconosciuto");
      if (msg.toLowerCase().includes("customer portal") || msg.includes("503")) {
        setError(
          "Il Portale Stripe non è ancora attivo lato Dashboard. " +
          "Amministratore: Dashboard Stripe → Settings → Billing → Customer portal → Activate.",
        );
      } else {
        setError(`Errore Portale Stripe: ${msg.slice(0, 200)}`);
      }
    } finally {
      setPortalLoading(null);
    }
  };

  const handlePurchase = async (planId: Plan["id"]) => {
    setError(null);
    setInfo(null);
    if (!token) {
      setError("Devi essere loggato per acquistare un abbonamento.");
      return;
    }
    if (planId === "free") return;

    // Se l'utente ha già una sub attiva Stripe su un altro SKU → non fare
    // checkout, apri direttamente il Portal in modalità update-subscription.
    if (hasActiveSub && currentProvider === "stripe" && currentPlanFromSku !== planId) {
      await openBillingPortal(planId);
      return;
    }

    setPurchasing(planId);
    try {
      const sku = planId as "premium" | "family" | "school_year" | "maturita";
      const resp = await api.billingStripeCreateCheckout({ sku }, token);
      // Apri il checkout nel browser di sistema (fuori dall'Electron)
      const w = (window as any).voto;
      if (w?.openExternal) {
        await w.openExternal(resp.checkout_url);
      } else {
        window.open(resp.checkout_url, "_blank");
      }
      // Avvia polling per detectare l'attivazione
      setPollingSince(Date.now());
    } catch (e: any) {
      const code = e instanceof ApiError ? e.code : undefined;
      const msg = String(e?.message || e || "Errore sconosciuto");
      // Il backend risponde 409 con detail.code = "use_portal_to_switch"
      // quando l'utente ha già Stripe attivo su un altro SKU. In quel caso,
      // invece di mostrare errore, apriamo il Portal con target_sku.
      if (code === "use_portal_to_switch") {
        setPurchasing(null);
        await openBillingPortal(planId);
        return;
      }
      if (code === "already_on_this_sku") {
        setError("Hai già questo piano attivo. Usa 'Gestisci abbonamento' se vuoi modificarlo o cancellarlo.");
      } else if (code === "already_on_other_provider") {
        const prov = (e instanceof ApiError && typeof e.detailObj?.provider === "string")
          ? (e.detailObj.provider as string)
          : "mobile";
        const provLabel = prov === "apple"
          ? "App Store (iPhone/iPad)"
          : prov === "google"
            ? "Google Play (Android)"
            : "sul tuo dispositivo mobile";
        setError(
          `Hai già un abbonamento attivo su ${provLabel}. ` +
          "Gestiscilo da lì — non serve pagare di nuovo qui, il tuo Premium è già attivo.",
        );
      } else if (msg.includes("409")) {
        setError(
          "Hai già un abbonamento attivo. Usa 'Gestisci abbonamento' per modificarlo.",
        );
      } else {
        setError(`Errore checkout: ${msg}`);
      }
      setPurchasing(null);
    }
  };

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
            <PlanCard
              key={p.id}
              plan={p}
              isCurrent={currentPlan === p.id}
              onPurchase={handlePurchase}
              onOpenPortal={openBillingPortal}
              purchasing={purchasing === p.id}
              anyPurchasing={purchasing !== null}
              pollingActive={pollingSince !== null}
              subStatus={subStatus}
              portalLoading={portalLoading === p.id}
              anyPortalLoading={portalLoading !== null}
            />
          ))}
        </div>

        {/* Bottone "Gestisci abbonamento" — visibile solo se Stripe attivo */}
        {hasActiveSub && currentProvider === "stripe" && (
          <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end" }}>
            <button
              onClick={() => openBillingPortal()}
              disabled={portalLoading !== null || pollingSince !== null}
              style={{
                padding: "9px 16px",
                borderRadius: radius.sm,
                background: `${colors.purple}18`,
                border: `1px solid ${colors.purple}77`,
                color: colors.purple,
                fontSize: 12,
                fontWeight: 800,
                cursor: portalLoading !== null ? "default" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
                opacity: portalLoading === "manage" ? 0.6 : 1,
              }}
            >
              {portalLoading === "manage" ? "Apertura Portale…" : "Gestisci abbonamento"}
              <ExternalLink size={12} />
            </button>
          </div>
        )}

        {/* Banner info (upgrade in corso, riuscito, ecc.) */}
        {info && (
          <div style={{
            marginTop: 12,
            padding: 12,
            borderRadius: radius.sm,
            background: `${colors.green}15`,
            border: `1px solid ${colors.green}55`,
            color: colors.green,
            fontSize: 12,
            lineHeight: 1.5,
          }}>
            {info}
          </div>
        )}

        {/* Banner errore checkout */}
        {error && (
          <div style={{
            marginTop: 12,
            padding: 12,
            borderRadius: radius.sm,
            background: `${colors.red}15`,
            border: `1px solid ${colors.red}55`,
            color: colors.red,
            fontSize: 12,
            lineHeight: 1.5,
          }}>
            {error}
          </div>
        )}

        {/* Banner polling in corso */}
        {pollingSince && (
          <div style={{
            marginTop: 12,
            padding: 12,
            borderRadius: radius.sm,
            background: `${colors.cyan}12`,
            border: `1px solid ${colors.cyan}55`,
            color: colors.textSub,
            fontSize: 12,
            lineHeight: 1.5,
            display: "flex",
            gap: 10,
            alignItems: "center",
          }}>
            <div style={{
              width: 14,
              height: 14,
              borderRadius: "50%",
              border: `2px solid ${colors.cyan}`,
              borderTopColor: "transparent",
              animation: "spin 1s linear infinite",
            }} />
            <span>
              Completa il pagamento nel browser. Appena Stripe ci conferma l&apos;attivazione
              (di solito entro 10 secondi), l&apos;abbonamento si sbloccherà qui automaticamente.
            </span>
          </div>
        )}

        {/* Info Stripe checkout desktop (allineato al trial universale onboarding) */}
        <div style={{
          marginTop: 14,
          padding: 14,
          borderRadius: radius.md,
          background: `${colors.purple}10`,
          border: `1px solid ${colors.purple}44`,
          display: "flex",
          gap: 12,
          alignItems: "flex-start",
        }}>
          <Crown size={18} color={colors.purple} style={{ flexShrink: 0, marginTop: 2 }} />
          <div style={{ fontSize: 12.5, color: colors.textSub, lineHeight: 1.6 }}>
            {isTrialOnboarding ? (
              <>
                <strong style={{ color: colors.textPrimary }}>
                  Sei già in prova gratuita — ti restano {trialDaysLeft} {trialDaysLeft === 1 ? "giorno" : "giorni"}.
                </strong>{" "}
                Se ti abboni ora, il primo addebito parte solo alla fine dei tuoi giorni di prova.
                Il checkout si apre nel browser di sistema (via Stripe).
              </>
            ) : (
              <>
                <strong style={{ color: colors.textPrimary }}>Come funziona.</strong>{" "}
                I 7 giorni di prova gratuita partono automaticamente dal tuo primo accesso a Voto+.
                Se ti abboni ora, l&apos;addebito è immediato e continui senza interruzioni.
                Il checkout si apre nel browser di sistema (via Stripe).
              </>
            )}
            <br />
            <span style={{ color: colors.textMuted, fontSize: 11 }}>
              Se hai già un abbonamento attivo su iPhone/Android, verrà riconosciuto qui
              automaticamente al login — non serve acquistare di nuovo.
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

function PlanCard({
  plan,
  isCurrent,
  onPurchase,
  onOpenPortal,
  purchasing,
  anyPurchasing,
  pollingActive,
  subStatus,
  portalLoading,
  anyPortalLoading,
}: {
  plan: Plan;
  isCurrent: boolean;
  onPurchase: (planId: Plan["id"]) => void;
  onOpenPortal: (targetSku?: Plan["id"]) => void;
  purchasing: boolean;
  anyPurchasing: boolean;
  pollingActive: boolean;
  subStatus: {
    active: boolean;
    provider: "apple" | "google" | "stripe" | null;
    plan_sku: string | null;
  } | null;
  portalLoading: boolean;
  anyPortalLoading: boolean;
}) {
  const { Icon, color, featured } = plan;

  // Deriva "stato del pulsante" in base al contesto:
  const provider = subStatus?.provider ?? null;
  const hasActiveSub = !!subStatus?.active;
  const isFree = plan.id === "free";
  const isMobileProvider = provider === "apple" || provider === "google";

  // Cosa mostrare come label del CTA
  let ctaLabel: React.ReactNode;
  let ctaMode: "checkout" | "portal_upgrade" | "current_manage" | "disabled_free" | "disabled_mobile" | "loading";
  let ctaDisabled = false;

  if (isFree) {
    ctaMode = "disabled_free";
    ctaLabel = "Piano base";
    ctaDisabled = true;
  } else if (purchasing) {
    ctaMode = "loading";
    ctaLabel = "Apertura checkout…";
    ctaDisabled = true;
  } else if (portalLoading) {
    ctaMode = "loading";
    ctaLabel = "Apertura Portale…";
    ctaDisabled = true;
  } else if (isCurrent && hasActiveSub) {
    // È il piano corrente ATTIVO
    if (provider === "stripe") {
      ctaMode = "current_manage";
      ctaLabel = (
        <>
          Il tuo piano · Gestisci <ExternalLink size={12} />
        </>
      );
    } else {
      // Apple/Google: il piano corrente si gestisce sullo store, non qui
      ctaMode = "disabled_mobile";
      ctaLabel = provider === "apple"
        ? "Gestisci su App Store"
        : "Gestisci su Google Play";
      ctaDisabled = true;
    }
  } else if (hasActiveSub && provider === "stripe") {
    // Utente ha Stripe attivo su un ALTRO piano → propone upgrade/downgrade
    ctaMode = "portal_upgrade";
    ctaLabel = (
      <>
        Passa a {plan.name.replace("Premium ", "").toLowerCase()} <ExternalLink size={12} />
      </>
    );
  } else if (isMobileProvider) {
    // Utente ha Apple/Google attivo → non ha senso comprare qui
    ctaMode = "disabled_mobile";
    ctaLabel = provider === "apple"
      ? "Attivo su App Store"
      : "Attivo su Google Play";
    ctaDisabled = true;
  } else {
    // Nessuna sub attiva → checkout classico. Se l'utente è in trial-onboarding
    // il primo addebito Stripe verrà allineato dal backend alla fine del trial
    // (cioè `plan_expires_at`) — non serve promettere "7gg di prova" qui.
    ctaMode = "checkout";
    ctaLabel = (
      <>
        Attiva Premium <ExternalLink size={12} />
      </>
    );
  }

  const globallyBlocked = (anyPurchasing && !purchasing)
    || (anyPortalLoading && !portalLoading)
    || pollingActive;
  if (globallyBlocked && !ctaDisabled) ctaDisabled = true;

  const onCtaClick = () => {
    if (ctaMode === "checkout" || ctaMode === "portal_upgrade") {
      onPurchase(plan.id);
    } else if (ctaMode === "current_manage") {
      onOpenPortal();
    }
    // Gli altri stati sono disabled → nessuna azione
  };

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
        onClick={onCtaClick}
        disabled={ctaDisabled}
        style={{
          marginTop: 4,
          padding: "9px 12px",
          borderRadius: radius.sm,
          background: ctaMode === "disabled_free" || ctaMode === "disabled_mobile"
            ? colors.bgGlass
            : ctaMode === "current_manage"
              ? `${colors.green}18`
              : `${color}18`,
          border: `1px solid ${
            ctaMode === "disabled_free" || ctaMode === "disabled_mobile"
              ? colors.border
              : ctaMode === "current_manage"
                ? colors.green
                : color
          }`,
          color: ctaMode === "disabled_free"
            ? colors.textMuted
            : ctaMode === "disabled_mobile"
              ? colors.textSub
              : ctaMode === "current_manage"
                ? colors.green
                : color,
          fontWeight: 800,
          fontSize: 12,
          cursor: ctaDisabled ? "default" : "pointer",
          opacity: globallyBlocked ? 0.5 : 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
        }}
      >
        {ctaLabel}
      </button>
    </article>
  );
}
