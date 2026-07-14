import { useEffect, useState } from "react";
import { Calendar, GraduationCap, Sparkles, TrendingUp, Flame, ChevronsLeft, ChevronsRight } from "lucide-react";
import { colors, radius } from "../theme";
import { useAuth } from "../store/auth";
import { useLayout } from "../store/layout";
import { api } from "../api/client";
import { useNavigate } from "react-router-dom";

const eventMeta = (t: string) =>
  t === "interrogazione"
    ? { icon: GraduationCap, color: colors.pink, label: "Interrogazione" }
    : t === "verifica"
    ? { icon: Sparkles, color: colors.cyan, label: "Verifica" }
    : t === "esame"
    ? { icon: TrendingUp, color: colors.orange, label: "Esame" }
    : { icon: Calendar, color: colors.purple, label: "Evento" };

const daysUntil = (iso: string) => {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  const d = new Date(iso);
  d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - t.getTime()) / 86400000);
};

export function RightPanel() {
  const token = useAuth((s) => s.token);
  const navigate = useNavigate();
  const [events, setEvents] = useState<any[]>([]);
  const [nudge, setNudge] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const collapsed = useLayout((s) => s.rightCollapsed);
  const toggle = useLayout((s) => s.toggleRight);

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
        if (d.status === "fulfilled")
          setEvents((d.value?.upcoming_events || []).slice(0, 8));
        if (n.status === "fulfilled") setNudge(n.value);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [token]);

  // Modalità collapsed: solo icone verticali (Calendar + Flame se nudge attivo)
  if (collapsed) {
    return (
      <aside
        style={{
          width: 64,
          borderLeft: `1px solid ${colors.border}`,
          background: colors.bg,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "10px 8px",
          gap: 8,
          flexShrink: 0,
          transition: "width 220ms cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        <button
          onClick={toggle}
          title="Espandi pannello scadenze"
          aria-label="Espandi pannello"
          style={toggleBtnStyle()}
        >
          <ChevronsLeft size={16} />
        </button>
        <button
          onClick={() => navigate("/calendario")}
          title={events.length > 0 ? `${events.length} scadenze in arrivo` : "Calendario"}
          aria-label="Calendario"
          style={compactIconBtn(colors.pink)}
        >
          <Calendar size={18} color={colors.pink} />
          {events.length > 0 && (
            <span style={{
              position: "absolute", top: -4, right: -4,
              width: 18, height: 18, borderRadius: 9,
              background: colors.pink, color: colors.textPrimary,
              fontSize: 10, fontWeight: 900,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>{events.length}</span>
          )}
        </button>
        {nudge && (
          <button
            onClick={() => navigate("/")}
            title={nudge.headline || "Suggerimento del coach"}
            aria-label="Suggerimento del coach"
            style={compactIconBtn(colors.orange)}
          >
            <Flame size={18} color={colors.orange} />
          </button>
        )}
      </aside>
    );
  }

  return (
    <aside
      style={{
        width: 340,
        borderLeft: `1px solid ${colors.border}`,
        background: colors.bg,
        display: "flex",
        flexDirection: "column",
        overflow: "auto",
        padding: 20,
        gap: 16,
        flexShrink: 0,
        transition: "width 220ms cubic-bezier(0.4, 0, 0.2, 1)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          paddingBottom: 12,
          borderBottom: `1px solid ${colors.border}`,
        }}
      >
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: 10,
            background: `${colors.pink}1a`,
            border: `1px solid ${colors.pink}55`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Calendar size={17} color={colors.pink} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: 14 }}>Prossime scadenze</div>
          <div style={{ fontSize: 11, color: colors.textMuted }}>
            Verifiche, interrogazioni ed esami
          </div>
        </div>
        <button
          onClick={toggle}
          title="Comprimi pannello (solo icone)"
          aria-label="Comprimi pannello"
          style={toggleBtnStyle()}
        >
          <ChevronsRight size={16} />
        </button>
      </div>

      {loading ? (
        <div style={{ color: colors.textMuted, fontSize: 12 }}>Caricamento…</div>
      ) : events.length === 0 ? (
        <div
          style={{
            padding: 20,
            borderRadius: radius.md,
            border: `1px dashed ${colors.border}`,
            background: colors.bgGlass,
            textAlign: "center",
          }}
        >
          <Calendar size={36} color={colors.textMuted} style={{ margin: "4px auto 8px" }} />
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>
            Nessuna scadenza
          </div>
          <div style={{ fontSize: 11, color: colors.textMuted, lineHeight: 1.5 }}>
            Aggiungi verifiche dal calendario per pianificare lo studio.
          </div>
          <button
            onClick={() => navigate("/calendario")}
            style={{
              marginTop: 12,
              padding: "8px 14px",
              borderRadius: 999,
              background: `${colors.pink}1a`,
              border: `1px solid ${colors.pink}55`,
              color: colors.pink,
              fontWeight: 700,
              fontSize: 12,
            }}
          >
            + Aggiungi al calendario
          </button>
        </div>
      ) : (
        events.map((ev) => {
          const m = eventMeta(ev.type);
          const dleft = daysUntil(ev.date);
          const urgency =
            dleft <= 2 ? colors.red : dleft <= 5 ? colors.orange : colors.cyan;
          const dayLabel =
            dleft < 0 ? "Scaduto" : dleft === 0 ? "Oggi" : dleft === 1 ? "Domani" : `Tra ${dleft} giorni`;
          const Icon = m.icon;
          return (
            <button
              key={ev.id}
              onClick={() => navigate("/calendario")}
              style={{
                display: "flex",
                gap: 10,
                padding: 12,
                borderRadius: radius.md,
                background: colors.bgGlass,
                border: `1px solid ${m.color}55`,
                textAlign: "left",
                transition: "transform 120ms ease, border-color 120ms ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-1px)";
                e.currentTarget.style.borderColor = `${m.color}aa`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.borderColor = `${m.color}55`;
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  background: `${m.color}1f`,
                  border: `1px solid ${m.color}55`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Icon size={18} color={m.color} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 800 }}>
                  {m.label} · {ev.subject}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: colors.textSub,
                    marginTop: 2,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {ev.title || ev.topic || "Senza titolo"}
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginTop: 6,
                    alignItems: "center",
                  }}
                >
                  <span style={{ fontSize: 10, color: colors.textMuted, fontWeight: 700 }}>
                    {new Date(ev.date).toLocaleDateString("it-IT", {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 900,
                      color: urgency,
                      padding: "2px 8px",
                      borderRadius: 999,
                      background: `${urgency}1a`,
                      border: `1px solid ${urgency}88`,
                    }}
                  >
                    {dayLabel}
                  </span>
                </div>
              </div>
            </button>
          );
        })
      )}

      {/* Coach nudge — replicato dall'iPad landscape */}
      {nudge?.nudges?.[0] && (
        <button
          onClick={() => navigate("/")}
          style={{
            marginTop: 6,
            padding: 14,
            borderRadius: radius.md,
            background: colors.bgGlass,
            border: `1.5px solid ${colors.purple}55`,
            textAlign: "left",
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: `${colors.purple}1f`,
              border: `1px solid ${colors.purple}66`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 2,
            }}
          >
            <Flame size={18} color={colors.purple} />
          </div>
          <div
            style={{
              fontSize: 10.5,
              fontWeight: 800,
              letterSpacing: 1,
              textTransform: "uppercase",
              color: colors.textMuted,
            }}
          >
            Suggerimento del giorno
          </div>
          <div style={{ fontSize: 14, fontWeight: 900, color: colors.textPrimary }}>
            {nudge.nudges[0].title}
          </div>
          <div style={{ fontSize: 12, color: colors.textSub, lineHeight: 1.5, marginTop: 2 }}>
            {nudge.nudges[0].body}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: 6,
            }}
          >
            <span style={{ color: colors.purple, fontWeight: 800, fontSize: 12 }}>
              {nudge.nudges[0].cta_label || "Studia ora"} →
            </span>
            <span
              style={{
                color: colors.textMuted,
                fontSize: 10.5,
                fontStyle: "italic",
                fontWeight: 700,
              }}
            >
              — {nudge.nudges[0].signature || "Voto+"}
            </span>
          </div>
        </button>
      )}
    </aside>
  );
}

function toggleBtnStyle(): React.CSSProperties {
  return {
    width: 32,
    height: 32,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    background: colors.bgGlass,
    border: `1px solid ${colors.border}`,
    color: colors.textSub,
    cursor: "pointer",
    flexShrink: 0,
  };
}

function compactIconBtn(color: string): React.CSSProperties {
  return {
    position: "relative",
    width: 44,
    height: 44,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.sm,
    background: `${color}1a`,
    border: `1px solid ${color}55`,
    cursor: "pointer",
    flexShrink: 0,
  };
}
