import { NavLink } from "react-router-dom";
import {
  Home,
  ScanLine,
  Calculator,
  BarChart3,
  Calendar,
  Settings,
  LogOut,
} from "lucide-react";
import { colors } from "../theme";
import { useAuth } from "../store/auth";

const NAV = [
  { to: "/", label: "Home", icon: Home, end: true },
  { to: "/scanner", label: "Scannerizza", icon: ScanLine },
  { to: "/math", label: "Matematica", icon: Calculator },
  { to: "/voti", label: "Voti", icon: BarChart3 },
  { to: "/calendario", label: "Calendario", icon: Calendar },
  { to: "/impostazioni", label: "Impostazioni", icon: Settings },
];

export function Sidebar() {
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);

  return (
    <aside
      style={{
        width: 220,
        borderRight: `1px solid ${colors.border}`,
        background: colors.bg,
        display: "flex",
        flexDirection: "column",
        padding: "20px 12px",
        gap: 4,
        flexShrink: 0,
      }}
    >
      {/* User */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 8px",
          marginBottom: 16,
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 12,
            background: "linear-gradient(135deg, #a855f7 0%, #3b82f6 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 800,
            fontSize: 14,
          }}
        >
          {(user?.username || "?").slice(0, 2).toUpperCase()}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {user?.username || "Studente"}
          </div>
          <div
            style={{
              fontSize: 11,
              color: colors.textMuted,
              textTransform: "uppercase",
              letterSpacing: 0.6,
              fontWeight: 700,
            }}
          >
            {user?.plan === "free" ? "Free" : (user?.plan || "").toUpperCase()}
          </div>
        </div>
      </div>

      {/* Nav */}
      {NAV.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          style={({ isActive }) => ({
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 12px",
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 600,
            color: isActive ? "#fff" : colors.textSub,
            background: isActive ? "rgba(168,85,247,0.18)" : "transparent",
            border: `1px solid ${isActive ? "rgba(168,85,247,0.5)" : "transparent"}`,
            transition: "all 120ms ease",
            textDecoration: "none",
          })}
        >
          <Icon size={16} />
          <span>{label}</span>
        </NavLink>
      ))}

      <div style={{ flex: 1 }} />

      {/* Logout */}
      <button
        onClick={logout}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 12px",
          borderRadius: 10,
          fontSize: 13,
          fontWeight: 600,
          color: colors.red,
          background: "transparent",
          border: `1px solid transparent`,
          transition: "all 120ms ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "rgba(239,68,68,0.12)";
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
    </aside>
  );
}
