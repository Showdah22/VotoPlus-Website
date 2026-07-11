import { FormEvent, useState } from "react";
import { Navigate } from "react-router-dom";
import { colors, radius } from "../theme";
import { useAuth } from "../store/auth";

export function LoginPage() {
  const token = useAuth((s) => s.token);
  const login = useAuth((s) => s.login);
  const loading = useAuth((s) => s.loading);
  const error = useAuth((s) => s.error);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  if (token) return <Navigate to="/" replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      await login(email.trim(), password);
    } catch {
      // errore già nello store
    }
  }

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 32,
        background: `radial-gradient(circle at 30% 20%, rgba(168,85,247,0.20), transparent 55%), radial-gradient(circle at 80% 80%, rgba(6,182,212,0.16), transparent 60%), ${colors.bg}`,
      }}
    >
      <form
        onSubmit={onSubmit}
        style={{
          width: 400,
          padding: 32,
          borderRadius: radius.xl,
          background: colors.bgElevated,
          border: `1px solid ${colors.borderStrong}`,
          boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
          display: "flex",
          flexDirection: "column",
          gap: 18,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: "linear-gradient(135deg, #a855f7 0%, #3b82f6 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 22,
              fontWeight: 900,
              boxShadow: "0 0 30px rgba(168,85,247,0.55)",
            }}
          >
            V+
          </div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, letterSpacing: -0.4 }}>
            Bentornato
          </h1>
          <p style={{ margin: 0, fontSize: 13, color: colors.textSub }}>
            Accedi a Voto+ dal tuo computer
          </p>
        </div>

        <label style={labelStyle}>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
            style={inputStyle}
            placeholder="nome@esempio.it"
          />
        </label>

        <label style={labelStyle}>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={inputStyle}
            placeholder="••••••••"
          />
        </label>

        {error && (
          <div
            style={{
              padding: 12,
              borderRadius: radius.sm,
              background: `${colors.red}1a`,
              border: `1px solid ${colors.red}55`,
              color: colors.red,
              fontSize: 12.5,
              fontWeight: 600,
            }}
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !email || !password}
          style={{
            marginTop: 4,
            height: 48,
            borderRadius: radius.md,
            background: "linear-gradient(135deg, #a855f7 0%, #3b82f6 100%)",
            color: "#fff",
            fontWeight: 800,
            fontSize: 15,
            letterSpacing: 0.2,
            opacity: loading || !email || !password ? 0.55 : 1,
            cursor: loading || !email || !password ? "not-allowed" : "pointer",
            boxShadow: "0 6px 24px rgba(168,85,247,0.35)",
          }}
        >
          {loading ? "Accesso in corso…" : "Accedi"}
        </button>

        <div style={{ fontSize: 11, color: colors.textMuted, textAlign: "center", marginTop: 4 }}>
          Registrazioni e ripristino password disponibili sull&apos;app mobile.
          <br />
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              window.voto?.openExternal("https://voto-plus.app");
            }}
            style={{ color: colors.purple, fontWeight: 700 }}
          >
            Scopri Voto+ →
          </a>
        </div>
      </form>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
  fontSize: 12,
  fontWeight: 700,
  color: colors.textSub,
  textTransform: "uppercase",
  letterSpacing: 0.6,
};
const inputStyle: React.CSSProperties = {
  height: 44,
  padding: "0 14px",
  borderRadius: radius.md,
  background: "rgba(255,255,255,0.04)",
  border: `1px solid ${colors.border}`,
  color: colors.textPrimary,
  fontSize: 14,
  fontWeight: 500,
  outline: "none",
  transition: "border-color 120ms ease",
};
