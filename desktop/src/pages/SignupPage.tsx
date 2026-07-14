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
            color: "#ffffff",
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

        {/* Separatore "oppure" */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "6px 0" }}>
          <div style={{ flex: 1, height: 1, background: colors.border }} />
          <span style={{ fontSize: 11, color: colors.textMuted, fontWeight: 700, letterSpacing: 0.4 }}>
            OPPURE
          </span>
          <div style={{ flex: 1, height: 1, background: colors.border }} />
        </div>

        {/* Continua con Google — se l'account non esiste viene creato in automatico */}
        <button
          type="button"
          onClick={async () => {
            try {
              await window.voto?.auth?.startGoogleLogin();
              // Dopo il redirect, il deep-link consegnerà il session_id alla
              // LoginPage (che ascolta onGoogleCallback in useEffect).
              // Naviga verso login per centralizzare la logica di consumo.
              navigate("/login");
            } catch {
              setLocalError("Impossibile aprire il browser per l'accesso Google.");
            }
          }}
          style={{
            height: 46,
            borderRadius: radius.md,
            border: `1px solid ${colors.borderStrong}`,
            background: colors.bgGlass,
            color: colors.textPrimary,
            fontWeight: 700,
            fontSize: 14,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            cursor: "pointer",
          }}
        >
          <SignupGoogleLogo />
          Continua con Google
        </button>

        {/* Continua con Apple — COMING SOON */}
        <button
          type="button"
          disabled
          title="In arrivo prossimamente"
          style={{
            height: 46,
            borderRadius: radius.md,
            border: `1px dashed ${colors.border}`,
            background: "transparent",
            color: colors.textMuted,
            fontWeight: 700,
            fontSize: 13,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            cursor: "not-allowed",
          }}
        >
          <SignupAppleLogo color={colors.textMuted} />
          Continua con Apple
          <span
            style={{
              marginLeft: 6,
              fontSize: 9,
              fontWeight: 900,
              letterSpacing: 0.8,
              padding: "2px 7px",
              borderRadius: 999,
              background: `${colors.purple}22`,
              color: colors.purple,
              textTransform: "uppercase",
            }}
          >
            Presto
          </span>
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


// Google "G" logo ufficiale (Material design colors) — non tintato per brand.
function SignupGoogleLogo() {
  return (
    <svg width={18} height={18} viewBox="0 0 48 48" aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  );
}

function SignupAppleLogo({ color = "#000" }: { color?: string }) {
  return (
    <svg width={16} height={19} viewBox="0 0 384 512" aria-hidden fill={color}>
      <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"/>
    </svg>
  );
}
