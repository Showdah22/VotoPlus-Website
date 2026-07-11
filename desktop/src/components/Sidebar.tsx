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
  ScanLine,
  Calculator,
  Calendar,
  BarChart3,
  Trophy,
  Sparkles,
  GitBranch,
} from "lucide-react";
import { useEffect, useState } from "react";
import { colors, radius } from "../theme";
import { useAuth } from "../store/auth";
import { api } from "../api/client";
import { useModKey } from "../lib/platform";

// La Sidebar del desktop replica l'esperienza iPad landscape:
// profilo grande + streak + azioni rapide + navigazione + logout.
// Larga 280pt, scrollabile se il contenuto eccede.
export function Sidebar() {
  const user = useAuth((s) => s.user);
  const token = useAuth((s) => s.token);
  const logout = useAuth((s) => s.logout);
  const navigate = useNavigate();
  const { modSymbol, isMac } = useModKey();

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
        width: 280,
        borderRight: `1px solid ${colors.border}`,
        background: colors.bg,
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        overflow: "hidden",
      }}
    >
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 14px", display: "flex", flexDirection: "column", gap: 14 }}>
        {/* Profile card */}
        <button
          onClick={() => navigate("/impostazioni")}
          style={{
            padding: 16,
            borderRadius: radius.lg,
            background: colors.bgGlass,
            border: `1px solid ${colors.border}`,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 10,
            cursor: "pointer",
          }}
        >
          <div style={{ position: "relative" }}>
            {user?.profile_picture ? (
              <img
                src={user.profile_picture}
                alt=""
                style={{ width: 72, height: 72, borderRadius: 36, objectFit: "cover", border: `2px solid ${colors.borderStrong}` }}
              />
            ) : (
              <div
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 36,
                  background: "linear-gradient(135deg, #a855f7 0%, #3b82f6 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 24,
                  fontWeight: 900,
                }}
              >
                {(user?.username || "?").slice(0, 2).toUpperCase()}
              </div>
            )}
          </div>
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
        </button>

        {/* Streak card */}
        {streak != null && streak > 0 && (
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
        )}

        {/* Nav principale — Home in primo piano, non richiede scroll */}
        <div>
          <div style={sectionTitle}>Navigazione</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <NavItem to="/" icon={Home} label="Home" end primary />
            <NavItem to="/scanner" icon={ScanLine} label="Scannerizza" />
            <NavItem to="/math" icon={Calculator} label="Matematica" />
            <NavItem to="/voti" icon={BarChart3} label="Voti" />
            <NavItem to="/calendario" icon={Calendar} label="Calendario" />
            <NavItem to="/cronologia" icon={Clock} label="Cronologia" />
            <NavItem to="/traguardi" icon={Trophy} label="Traguardi" />
            <NavItem to="/novita" icon={Sparkles} label="Novità" />
            <NavItem to="/impostazioni" icon={Settings} label="Impostazioni" />
          </div>
        </div>

        {/* Azioni rapide — sotto la nav principale così Home è subito visibile */}
        <div>
          <div style={sectionTitle}>Azioni rapide</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <QuickAction icon={Mic} label="Interrogazione" hint="Allenati all'orale" color={colors.green} to="/orale" />
            <QuickAction icon={PenLine} label="Tema" hint="Traccia tema/saggio" color={colors.cyan} to="/tema" />
            <QuickAction icon={Timer} label="Compito" hint="Esercizi cronometrati" color={colors.orange} to="/compito" />
            <QuickAction icon={Book} label="Vocabolario AI" hint="Significato ed esempi" color={colors.purple} to="/vocabolario" />
            <QuickAction icon={Layers} label="Flashcard" hint="Ripasso rapido" color={colors.pink} to="/flashcards" />
            <QuickAction icon={GitBranch} label="Mappa concettuale" hint="Genera mappa gerarchica" color={colors.blue} to="/mindmap" />
          </div>
        </div>
      </div>

      {/* Suggerimento ricerca rapida: ⌘K su mac, Ctrl+K altrove */}
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

      {/* Logout footer */}
      <div style={{ borderTop: `1px solid ${colors.border}`, padding: "10px 14px" }}>
        <button
          onClick={logout}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 12px",
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
          <span>Esci</span>
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
}: {
  icon: any;
  label: string;
  hint: string;
  color: string;
  to: string;
}) {
  const navigate = useNavigate();
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
}: {
  to: string;
  icon: any;
  label: string;
  end?: boolean;
  /** primary=true → Home: stile leggermente più marcato per essere subito individuato (icona colorata purple, testo bianco anche quando inattivo). */
  primary?: boolean;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      style={({ isActive }) => ({
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: primary ? "11px 12px" : "9px 12px",
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
      <span>{label}</span>
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
  color: colors.textMuted,
  marginBottom: 8,
  marginLeft: 4,
};
