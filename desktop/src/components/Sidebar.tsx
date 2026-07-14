import { NavLink, useNavigate } from "react-router-dom";
import {
  Home,
  Clock,
  Settings,
  LogOut,
  Flame,
  Mic,
  PenLine,
  Timer,
  Book,
  Layers,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ScanLine,
  Calculator,
  Calendar,
  BarChart3,
  Trophy,
  Sparkles,
  GitBranch,
  Radar as RadarIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { colors, radius } from "../theme";
import { useAuth } from "../store/auth";
import { useLayout } from "../store/layout";
import { api } from "../api/client";
import { useModKey } from "../lib/platform";

// La Sidebar del desktop replica l'esperienza iPad landscape:
// profilo grande + streak + azioni rapide + navigazione + logout.
// Larga 280pt in modalità expanded, 64pt in modalità collapsed (solo icone).
// Lo stato è persistito in localStorage via useLayout store.
export function Sidebar() {
  const user = useAuth((s) => s.user);
  const token = useAuth((s) => s.token);
  const logout = useAuth((s) => s.logout);
  const navigate = useNavigate();
  const { modSymbol, isMac } = useModKey();
  const collapsed = useLayout((s) => s.leftCollapsed);
  const toggle = useLayout((s) => s.toggleLeft);

  const [streak, setStreak] = useState<number | null>(null);

  useEffect(() => {
    if (!token) return;
    api
      .coachNudge(token)
      .then((n) => setStreak(n?.streak?.current ?? 0))
      .catch(() => {});
  }, [token]);

  return (
    <aside
      style={{
        width: collapsed ? 64 : 280,
        borderRight: `1px solid ${colors.border}`,
        background: colors.bg,
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        overflow: "hidden",
        transition: "width 220ms cubic-bezier(0.4, 0, 0.2, 1)",
      }}
    >
      {/* Toggle button */}
      <button
        onClick={toggle}
        title={collapsed ? "Espandi menu" : "Comprimi menu (solo icone)"}
        aria-label={collapsed ? "Espandi menu" : "Comprimi menu"}
        style={{
          margin: collapsed ? "10px auto 4px" : "10px 14px 4px auto",
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
          transition: "background 150ms",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = `${colors.border}88`; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = colors.bgGlass; }}
      >
        {collapsed ? <ChevronsRight size={16} /> : <ChevronsLeft size={16} />}
      </button>

      <div style={{ flex: 1, overflowY: "auto", padding: collapsed ? "6px 8px" : "10px 14px", display: "flex", flexDirection: "column", gap: collapsed ? 8 : 14 }}>
        {/* Profile card — compatta in modalità collapsed (solo avatar 40px) */}
        <button
          onClick={() => navigate("/impostazioni")}
          title={collapsed ? (user?.username || "Profilo") : undefined}
          style={{
            padding: collapsed ? 8 : 16,
            borderRadius: radius.lg,
            background: colors.bgGlass,
            border: `1px solid ${colors.border}`,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: collapsed ? 0 : 10,
            cursor: "pointer",
          }}
        >
          <div style={{ position: "relative", flexShrink: 0, lineHeight: 0 }}>
            {user?.profile_picture ? (
              <img
                src={user.profile_picture}
                alt=""
                style={{
                  width: collapsed ? 40 : 72,
                  height: collapsed ? 40 : 72,
                  minWidth: collapsed ? 40 : 72,
                  minHeight: collapsed ? 40 : 72,
                  aspectRatio: "1 / 1",
                  borderRadius: "50%",
                  objectFit: "cover",
                  border: `2px solid ${colors.borderStrong}`,
                  boxSizing: "border-box",
                  display: "block",
                  flexShrink: 0,
                }}
              />
            ) : (
              <div
                style={{
                  width: collapsed ? 40 : 72,
                  height: collapsed ? 40 : 72,
                  minWidth: collapsed ? 40 : 72,
                  minHeight: collapsed ? 40 : 72,
                  aspectRatio: "1 / 1",
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #a855f7 0%, #3b82f6 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: collapsed ? 14 : 24,
                  fontWeight: 900,
                  color: colors.textPrimary,
                  boxSizing: "border-box",
                  flexShrink: 0,
                }}
              >
                {(user?.username || "?").slice(0, 2).toUpperCase()}
              </div>
            )}
          </div>
          {!collapsed && (
            <>
              <div style={{ textAlign: "center", width: "100%" }}>
                <div style={{ fontSize: 15, fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {user?.username || "Studente"}
                </div>
                <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {user?.email_is_relay ? "Accesso via Apple" : user?.email || ""}
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center" }}>
                {user?.school_year != null && (
                  <span style={chip(colors.cyan)}>
                    🎓 {user.school_year === 5 ? "5° · Maturità" : `${user.school_year}°`}
                  </span>
                )}
                {user?.maturita_unlocked && <span style={chip(colors.green)}>MATURITÀ</span>}
                {user?.plan && user.plan !== "free" && (
                  <span style={chip(colors.purple)}>{user.plan.toUpperCase()}</span>
                )}
              </div>
            </>
          )}
        </button>

        {/* Streak card — icona sola in collapsed, card completa in expanded */}
        {streak != null && streak > 0 && (
          collapsed ? (
            <div title={`Streak ${streak} giorni`} style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "column",
              padding: "6px 4px",
              borderRadius: radius.sm,
              background: `${colors.pink}1a`,
              border: `1px solid ${colors.pink}55`,
            }}>
              <Flame size={16} color={colors.pink} />
              <span style={{ fontSize: 10, fontWeight: 900, color: colors.pink, marginTop: 2 }}>{streak}</span>
            </div>
          ) : (
            <div style={{
              padding: 14,
              borderRadius: radius.lg,
              background: "linear-gradient(135deg, rgba(236,72,153,0.28) 0%, rgba(168,85,247,0.18) 100%)",
              border: `1px solid ${colors.pink}55`,
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: 12,
                background: `${colors.pink}1f`, border: `1px solid ${colors.pink}55`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Flame size={22} color={colors.pink} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 18, fontWeight: 900 }}>{streak} giorni</div>
                <div style={{ fontSize: 11, color: colors.textSub, marginTop: 1 }}>Streak di studio 🔥</div>
              </div>
            </div>
          )
        )}

        {/* Nav principale — Home in primo piano, non richiede scroll */}
        <div>
          {!collapsed && <div style={sectionTitle}>Navigazione</div>}
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <NavItem to="/" icon={Home} label="Home" end primary compact={collapsed} />
            <NavItem to="/scanner" icon={ScanLine} label="Scannerizza" compact={collapsed} />
            <NavItem to="/math" icon={Calculator} label="Matematica" compact={collapsed} />
            <NavItem to="/voti" icon={BarChart3} label="Voti" compact={collapsed} />
            <NavItem to="/calendario" icon={Calendar} label="Calendario" compact={collapsed} />
            <NavItem to="/cronologia" icon={Clock} label="Cronologia" compact={collapsed} />
            <NavItem to="/traguardi" icon={Trophy} label="Traguardi" compact={collapsed} />
            {user?.school_year === 5 && (
              <NavItem to="/radar" icon={RadarIcon} label="Maturità Radar" compact={collapsed} />
            )}
            <NavItem to="/novita" icon={Sparkles} label="Novità" compact={collapsed} />
            <NavItem to="/impostazioni" icon={Settings} label="Impostazioni" compact={collapsed} />
          </div>
        </div>

        {/* Azioni rapide — sotto la nav principale così Home è subito visibile */}
        <div>
          {!collapsed && <div style={sectionTitle}>Azioni rapide</div>}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <QuickAction icon={Mic} label="Interrogazione" hint="Allenati all'orale" color={colors.green} to="/orale" compact={collapsed} />
            <QuickAction icon={PenLine} label="Tema" hint="Traccia tema/saggio" color={colors.cyan} to="/tema" compact={collapsed} />
            <QuickAction icon={Timer} label="Compito" hint="Esercizi cronometrati" color={colors.orange} to="/compito" compact={collapsed} />
            <QuickAction icon={Book} label="Vocabolario AI" hint="Significato ed esempi" color={colors.purple} to="/vocabolario" compact={collapsed} />
            <QuickAction icon={Layers} label="Flashcard" hint="Ripasso rapido" color={colors.pink} to="/flashcards" compact={collapsed} />
            <QuickAction icon={GitBranch} label="Mappa concettuale" hint="Genera mappa gerarchica" color={colors.blue} to="/mindmap" compact={collapsed} />
          </div>
        </div>
      </div>

      {/* Suggerimento ricerca rapida: ⌘K su mac, Ctrl+K altrove */}
      {!collapsed && (
        <div style={{
          padding: "8px 14px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          fontSize: 10.5,
          color: colors.textMuted,
          fontWeight: 700,
        }}>
          <span style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 3,
            padding: "2px 6px",
            borderRadius: 4,
            background: colors.bgGlass,
            border: `1px solid ${colors.border}`,
            fontFamily: isMac ? "inherit" : "inherit",
            fontWeight: 900,
            fontSize: 10,
          }}>
            {modSymbol}{!isMac && "+"}K
          </span>
          <span style={{ marginLeft: 4 }}>ricerca rapida</span>
        </div>
      )}

      {/* Logout footer */}
      <div style={{ borderTop: `1px solid ${colors.border}`, padding: collapsed ? "10px 8px" : "10px 14px" }}>
        <button
          onClick={logout}
          title={collapsed ? "Esci" : undefined}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: collapsed ? "center" : "flex-start",
            gap: collapsed ? 0 : 10,
            padding: collapsed ? "10px 6px" : "10px 12px",
            borderRadius: radius.sm,
            fontSize: 13,
            fontWeight: 700,
            color: colors.red,
            border: `1px solid transparent`,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(239,68,68,0.10)";
            e.currentTarget.style.borderColor = "rgba(239,68,68,0.35)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.borderColor = "transparent";
          }}
        >
          <LogOut size={16} />
          {!collapsed && <span>Esci</span>}
        </button>
      </div>
    </aside>
  );
}

function QuickAction({
  icon: Icon,
  label,
  hint,
  color,
  to,
  compact = false,
}: {
  icon: any;
  label: string;
  hint: string;
  color: string;
  to: string;
  compact?: boolean;
}) {
  const navigate = useNavigate();
  if (compact) {
    return (
      <button
        onClick={() => navigate(to)}
        title={`${label} — ${hint}`}
        aria-label={label}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 8,
          borderRadius: radius.sm,
          background: colors.bgGlass,
          border: `1px solid ${color}33`,
          transition: "border-color 120ms",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = `${color}88`; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = `${color}33`; }}
      >
        <div style={{
          width: 30, height: 30, borderRadius: 8,
          background: `${color}1f`, border: `1px solid ${color}55`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Icon size={15} color={color} />
        </div>
      </button>
    );
  }
  return (
    <button
      onClick={() => navigate(to)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 10px",
        borderRadius: radius.sm,
        background: colors.bgGlass,
        border: `1px solid ${color}33`,
        textAlign: "left",
        transition: "border-color 120ms ease, transform 120ms ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = `${color}88`;
        e.currentTarget.style.transform = "translateX(2px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = `${color}33`;
        e.currentTarget.style.transform = "translateX(0)";
      }}
    >
      <div style={{
        width: 34, height: 34, borderRadius: 10,
        background: `${color}1f`, border: `1px solid ${color}55`,
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>
        <Icon size={16} color={color} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: colors.textPrimary }}>{label}</div>
        <div style={{ fontSize: 10.5, color: colors.textSub, marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{hint}</div>
      </div>
      <ChevronRight size={12} color={colors.textMuted} />
    </button>
  );
}

function NavItem({
  to,
  icon: Icon,
  label,
  end = false,
  primary = false,
  compact = false,
}: {
  to: string;
  icon: any;
  label: string;
  end?: boolean;
  /** primary=true → Home: stile leggermente più marcato per essere subito individuato (icona colorata purple, testo bianco anche quando inattivo). */
  primary?: boolean;
  compact?: boolean;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      title={compact ? label : undefined}
      aria-label={label}
      style={({ isActive }) => ({
        display: "flex",
        alignItems: "center",
        justifyContent: compact ? "center" : "flex-start",
        gap: compact ? 0 : 10,
        padding: compact ? "10px 6px" : primary ? "11px 12px" : "9px 12px",
        borderRadius: radius.sm,
        fontSize: primary ? 14 : 13,
        fontWeight: primary ? 800 : 700,
        color: isActive || primary ? "#fff" : colors.textSub,
        background: isActive
          ? "rgba(168,85,247,0.16)"
          : primary
          ? "rgba(168,85,247,0.06)"
          : "transparent",
        border: `1px solid ${
          isActive
            ? "rgba(168,85,247,0.5)"
            : primary
            ? "rgba(168,85,247,0.22)"
            : "transparent"
        }`,
        textDecoration: "none",
        transition: "all 120ms ease",
      })}
    >
      <Icon size={primary ? 16 : 15} color={primary ? colors.purple : undefined} />
      {!compact && <span>{label}</span>}
    </NavLink>
  );
}

function chip(color: string): React.CSSProperties {
  return {
    display: "inline-flex",
    padding: "3px 8px",
    borderRadius: 999,
    background: `${color}14`,
    border: `1px solid ${color}55`,
    color,
    fontSize: 10.5,
    fontWeight: 800,
    letterSpacing: 0.3,
  };
}

const sectionTitle: React.CSSProperties = {
  fontSize: 10.5,
  fontWeight: 900,
  letterSpacing: 1.2,
  textTransform: "uppercase",
  color: "var(--text-muted)",
  marginBottom: 8,
  marginLeft: 4,
};
