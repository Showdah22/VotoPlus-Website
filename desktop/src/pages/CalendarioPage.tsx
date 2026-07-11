import { useEffect, useState } from "react";
import { Calendar, GraduationCap, Sparkles, TrendingUp, Bookmark } from "lucide-react";
import { useAuth } from "../store/auth";
import { api } from "../api/client";
import { colors, radius } from "../theme";

type EventItem = {
  id: string;
  type: "interrogazione" | "verifica" | "esame" | string;
  subject: string;
  title?: string;
  topic?: string;
  date: string;
};

const eventMeta = (t: string) =>
  t === "interrogazione"
    ? { icon: GraduationCap, color: colors.pink, label: "Interrogazione" }
    : t === "verifica"
    ? { icon: Sparkles, color: colors.cyan, label: "Verifica" }
    : t === "esame"
    ? { icon: TrendingUp, color: colors.orange, label: "Esame" }
    : { icon: Bookmark, color: colors.purple, label: "Evento" };

const daysUntil = (iso: string) => {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  const d = new Date(iso);
  d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - t.getTime()) / 86400000);
};

export function CalendarioPage() {
  const token = useAuth((s) => s.token);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!token) return;
      try {
        const d = await api.dashboard(token);
        if (alive) setEvents(d?.upcoming_events || []);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [token]);

  // Separo eventi imminenti (≤7gg) da futuri
  const imminent = events.filter((e) => daysUntil(e.date) <= 7 && daysUntil(e.date) >= 0);
  const future = events.filter((e) => daysUntil(e.date) > 7);
  const past = events.filter((e) => daysUntil(e.date) < 0);

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={iconWrapStyle(colors.orange)}>
          <Calendar size={22} color={colors.orange} />
        </div>
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 900, letterSpacing: -0.5 }}>
            Calendario
          </h1>
          <p style={{ margin: "4px 0 0 0", color: colors.textSub, fontSize: 13 }}>
            Verifiche, interrogazioni ed esami in programma
          </p>
        </div>
        <div style={{ padding: "8px 14px", borderRadius: 999, background: colors.bgGlass, border: `1px solid ${colors.border}`, fontSize: 12, color: colors.textMuted, fontWeight: 700 }}>
          {events.length} evento{events.length !== 1 ? "i" : ""}
        </div>
      </div>

      {loading ? (
        <div style={placeholder}>Caricamento eventi…</div>
      ) : events.length === 0 ? (
        <div style={placeholder}>
          Nessun evento in calendario. Aggiungi verifiche e interrogazioni dall'app mobile per pianificare lo studio.
        </div>
      ) : (
        <>
          {imminent.length > 0 && (
            <Section title="⚡ Imminenti (entro 7 giorni)" tint={colors.red}>
              {imminent.map((ev) => (
                <EventCard key={ev.id} ev={ev} />
              ))}
            </Section>
          )}

          {future.length > 0 && (
            <Section title="📅 In programma" tint={colors.cyan}>
              {future.map((ev) => (
                <EventCard key={ev.id} ev={ev} />
              ))}
            </Section>
          )}

          {past.length > 0 && (
            <Section title="✅ Passati" tint={colors.textMuted}>
              {past.slice(0, 5).map((ev) => (
                <EventCard key={ev.id} ev={ev} muted />
              ))}
            </Section>
          )}
        </>
      )}

      <div
        style={{
          padding: 14,
          borderRadius: radius.md,
          background: `${colors.cyan}0d`,
          border: `1px solid ${colors.cyan}33`,
          color: colors.textSub,
          fontSize: 12,
          textAlign: "center",
        }}
      >
        💡 Aggiungi nuove verifiche o interrogazioni dall'app Voto+ mobile — verranno sincronizzate qui in tempo reale.
      </div>
    </div>
  );
}

function Section({
  title,
  tint,
  children,
}: {
  title: string;
  tint: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2
        style={{
          margin: "0 0 12px 0",
          fontSize: 15,
          fontWeight: 800,
          textTransform: "uppercase",
          letterSpacing: 1,
          color: tint,
        }}
      >
        {title}
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{children}</div>
    </section>
  );
}

function EventCard({ ev, muted = false }: { ev: EventItem; muted?: boolean }) {
  const m = eventMeta(ev.type);
  const dleft = daysUntil(ev.date);
  const urgency = dleft <= 2 ? colors.red : dleft <= 5 ? colors.orange : colors.cyan;
  const dayLabel =
    dleft < 0
      ? `${Math.abs(dleft)} giorni fa`
      : dleft === 0
      ? "Oggi"
      : dleft === 1
      ? "Domani"
      : `Tra ${dleft} giorni`;
  const Icon = m.icon;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: 16,
        borderRadius: radius.md,
        background: colors.bgGlass,
        border: `1px solid ${muted ? colors.border : m.color + "55"}`,
        opacity: muted ? 0.6 : 1,
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 14,
          background: `${m.color}1f`,
          border: `1px solid ${m.color}55`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Icon size={22} color={m.color} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: colors.textPrimary }}>
          {m.label} · {ev.subject}
        </div>
        <div
          style={{
            fontSize: 12,
            color: colors.textSub,
            marginTop: 2,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {ev.title || ev.topic || "Senza titolo"}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
        <div style={{ fontSize: 11, color: colors.textMuted, fontWeight: 700 }}>
          {new Date(ev.date).toLocaleDateString("it-IT", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </div>
        {!muted && (
          <div
            style={{
              padding: "3px 10px",
              borderRadius: 999,
              background: `${urgency}1a`,
              border: `1px solid ${urgency}88`,
              color: urgency,
              fontSize: 11,
              fontWeight: 900,
            }}
          >
            {dayLabel}
          </div>
        )}
      </div>
    </div>
  );
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
