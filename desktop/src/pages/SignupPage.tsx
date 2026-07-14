// Voto+ Desktop 1.2.1 — Registrazione (mirror mobile signup.tsx).
// Flow: email + username + password → /verify-email
import { FormEvent, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../store/auth";
import { useTheme } from "../lib/theme-provider";
import { radius } from "../theme";
import votoIcon from "../assets/voto-icon.png";

export function SignupPage() {
  const { colors } = useTheme();
  const navigate = useNavigate();
  const token = useAuth((s) => s.token);
  const user = useAuth((s) => s.user);
  const signup = useAuth((s) => s.signup);
  const loading = useAuth((s) => s.loading);
  const error = useAuth((s) => s.error);

  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  // Se già loggato, decidiamo la destinazione in base allo stato
  if (token && user) {
    if (!user.email_verified) return <Navigate to="/verify-email" replace />;
    if (!user.profile_completed) return <Navigate to="/profile-setup" replace />;
    return <Navigate to="/" replace />;
  }

  const passwordStrong = password.length >= 8;
  const passwordsMatch = password === confirmPassword && password.length > 0;
  const validEmail = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim());
  const validUsername = username.trim().length >= 2 && username.trim().length <= 30;

  const canSubmit =
    validEmail && validUsername && passwordStrong && passwordsMatch && acceptedTerms && !loading;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLocalError(null);
    if (!canSubmit) return;
    try {
      await signup(email.trim().toLowerCase(), username.trim(), password);
      navigate("/verify-email", { replace: true });
    } catch (err: any) {
      setLocalError(err?.message || "Errore imprevisto. Riprova.");
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
        overflow: "auto",
        background: `radial-gradient(circle at 30% 20%, ${colors.purple}22, transparent 55%), radial-gradient(circle at 80% 80%, ${colors.cyan}20, transparent 60%), ${colors.bg}`,
      }}
    >
      <form
        onSubmit={onSubmit}
        style={{
          width: 440,
          padding: 32,
          borderRadius: radius.xl,
          background: colors.bgElevated,
          border: `1px solid ${colors.borderStrong}`,
          boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <img
            src={votoIcon}
            alt="Voto+"
            style={{
              width: 64,
              height: 64,
              objectFit: "contain",
              filter: `drop-shadow(0 0 24px ${colors.purple}88)`,
            }}
          />
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: -0.4, color: colors.textPrimary }}>
            Crea il tuo account
          </h1>
          <p style={{ margin: 0, fontSize: 13, color: colors.textSub, textAlign: "center" }}>
            Inizia con 7 giorni gratis di Voto+ Premium
          </p>
        </div>

        <label style={labelStyle(colors)}>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
            style={inputStyle(colors)}
            placeholder="nome@esempio.it"
          />
        </label>

        <label style={labelStyle(colors)}>
          Nome utente
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            minLength={2}
            maxLength={30}
            style={inputStyle(colors)}
            placeholder="Come vuoi essere chiamato?"
          />
        </label>

        <label style={labelStyle(colors)}>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            style={inputStyle(colors)}
            placeholder="Almeno 8 caratteri"
          />
          {password.length > 0 && !passwordStrong && (
            <span style={{ fontSize: 11, color: colors.orange, fontWeight: 600 }}>
              La password deve avere almeno 8 caratteri
            </span>
          )}
        </label>

        <label style={labelStyle(colors)}>
          Conferma password
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            style={inputStyle(colors)}
            placeholder="Ripeti la password"
          />
          {confirmPassword.length > 0 && !passwordsMatch && (
            <span style={{ fontSize: 11, color: colors.red, fontWeight: 600 }}>
              Le password non coincidono
            </span>
          )}
        </label>

        <label
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
            fontSize: 12,
            color: colors.textSub,
            cursor: "pointer",
            lineHeight: 1.5,
          }}
        >
          <input
            type="checkbox"
            checked={acceptedTerms}
            onChange={(e) => setAcceptedTerms(e.target.checked)}
            style={{ marginTop: 3, accentColor: colors.purple, cursor: "pointer" }}
          />
          <span>
            Accetto i{" "}
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                window.voto?.openExternal("https://votoplus.it/terms");
              }}
              style={{ color: colors.purple, fontWeight: 700 }}
            >
              Termini
            </a>{" "}
            e la{" "}
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                window.voto?.openExternal("https://votoplus.it/privacy");
              }}
              style={{ color: colors.purple, fontWeight: 700 }}
            >
              Privacy Policy
            </a>
            .
          </span>
        </label>

        {(localError || error) && (
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
            {localError || error}
          </div>
        )}

        <button
          type="submit"
          disabled={!canSubmit}
          style={{
            marginTop: 4,
            height: 48,
            borderRadius: radius.md,
            border: "none",
            background: `linear-gradient(135deg, ${colors.purple} 0%, ${colors.blue} 100%)`,
            color: colors.textPrimary,
            fontWeight: 800,
            fontSize: 15,
            letterSpacing: 0.2,
            opacity: canSubmit ? 1 : 0.5,
            cursor: canSubmit ? "pointer" : "not-allowed",
            boxShadow: `0 6px 24px ${colors.purple}55`,
          }}
        >
          {loading ? "Creazione account…" : "Crea account"}
        </button>

        <div style={{ fontSize: 12, color: colors.textMuted, textAlign: "center", marginTop: 6 }}>
          Hai già un account?{" "}
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              navigate("/login");
            }}
            style={{ color: colors.purple, fontWeight: 700 }}
          >
            Accedi
          </a>
        </div>
      </form>
    </div>
  );
}

const labelStyle = (colors: any): React.CSSProperties => ({
  display: "flex",
  flexDirection: "column",
  gap: 6,
  fontSize: 12,
  fontWeight: 700,
  color: colors.textSub,
  textTransform: "uppercase",
  letterSpacing: 0.6,
});

const inputStyle = (colors: any): React.CSSProperties => ({
  height: 44,
  padding: "0 14px",
  borderRadius: radius.md,
  background: colors.bgGlass,
  border: `1px solid ${colors.border}`,
  color: colors.textPrimary,
  fontSize: 14,
  fontWeight: 500,
  outline: "none",
  transition: "border-color 120ms ease",
});
