// Voto+ Desktop 1.2.1 — Verifica email OTP (mirror mobile verify-email.tsx).
import { FormEvent, useEffect, useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../store/auth";
import { useTheme } from "../lib/theme-provider";
import { radius } from "../theme";
import votoIcon from "../assets/voto-icon.png";

const OTP_LENGTH = 6;

export function VerifyEmailPage() {
  const { colors } = useTheme();
  const navigate = useNavigate();
  const token = useAuth((s) => s.token);
  const user = useAuth((s) => s.user);
  const setSession = useAuth((s) => s.setSession);
  const refreshUser = useAuth((s) => s.refreshUser);

  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    // Focus primo input al mount
    inputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  if (!token) return <Navigate to="/login" replace />;
  if (user?.email_verified) {
    if (!user.profile_completed) return <Navigate to="/profile-setup" replace />;
    return <Navigate to="/" replace />;
  }

  const code = digits.join("");

  function handleDigitChange(i: number, raw: string) {
    const clean = raw.replace(/\D/g, "").slice(-1);
    setDigits((prev) => {
      const copy = [...prev];
      copy[i] = clean;
      return copy;
    });
    if (clean && i < OTP_LENGTH - 1) {
      inputRefs.current[i + 1]?.focus();
    }
  }

  function handleKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      inputRefs.current[i - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (text.length === 0) return;
    e.preventDefault();
    const arr = Array(OTP_LENGTH).fill("");
    for (let i = 0; i < text.length; i++) arr[i] = text[i];
    setDigits(arr);
    inputRefs.current[Math.min(text.length, OTP_LENGTH - 1)]?.focus();
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (code.length !== OTP_LENGTH) return;
    setLoading(true);
    setError(null);
    try {
      const updated = await api.emailVerifyOtp(code, token!);
      // Aggiorna user con email_verified=true
      setSession(token!, updated);
      await refreshUser();
      navigate("/profile-setup", { replace: true });
    } catch (err: any) {
      setError(err?.message || "Codice non valido. Riprova.");
      setDigits(Array(OTP_LENGTH).fill(""));
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  }

  async function onResend() {
    if (cooldown > 0 || resending) return;
    setResending(true);
    setError(null);
    try {
      await api.emailResendOtp(token!);
      setCooldown(30);
    } catch (err: any) {
      setError(err?.message || "Impossibile inviare un nuovo codice.");
    } finally {
      setResending(false);
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
        background: `radial-gradient(circle at 30% 20%, ${colors.purple}22, transparent 55%), ${colors.bg}`,
      }}
    >
      <form
        onSubmit={onSubmit}
        style={{
          width: 420,
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
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
          <img
            src={votoIcon}
            alt="Voto+"
            style={{ width: 60, height: 60, objectFit: "contain" }}
          />
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: colors.textPrimary, textAlign: "center" }}>
            Verifica la tua email
          </h1>
          <p style={{ margin: 0, fontSize: 13, color: colors.textSub, textAlign: "center", lineHeight: 1.5 }}>
            Abbiamo inviato un codice a 6 cifre a
            <br />
            <strong style={{ color: colors.textPrimary }}>{user?.email}</strong>
          </p>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 8,
            marginTop: 8,
          }}
        >
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => {
                inputRefs.current[i] = el;
              }}
              value={d}
              onChange={(e) => handleDigitChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              onPaste={handlePaste}
              inputMode="numeric"
              maxLength={1}
              style={{
                width: 48,
                height: 56,
                borderRadius: radius.md,
                border: `1.5px solid ${d ? colors.purple : colors.border}`,
                background: colors.bgGlass,
                color: colors.textPrimary,
                fontSize: 22,
                fontWeight: 800,
                textAlign: "center",
                outline: "none",
              }}
            />
          ))}
        </div>

        {error && (
          <div
            style={{
              padding: 10,
              borderRadius: radius.sm,
              background: `${colors.red}1a`,
              border: `1px solid ${colors.red}55`,
              color: colors.red,
              fontSize: 12.5,
              fontWeight: 600,
              textAlign: "center",
            }}
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || code.length !== OTP_LENGTH}
          style={{
            height: 48,
            borderRadius: radius.md,
            border: "none",
            background: `linear-gradient(135deg, ${colors.purple} 0%, ${colors.blue} 100%)`,
            color: colors.textPrimary,
            fontWeight: 800,
            fontSize: 15,
            opacity: loading || code.length !== OTP_LENGTH ? 0.55 : 1,
            cursor: loading || code.length !== OTP_LENGTH ? "not-allowed" : "pointer",
            boxShadow: `0 6px 24px ${colors.purple}55`,
          }}
        >
          {loading ? "Verifica in corso…" : "Verifica email"}
        </button>

        <div style={{ textAlign: "center", fontSize: 12, color: colors.textMuted }}>
          Non hai ricevuto il codice?{" "}
          <button
            type="button"
            onClick={onResend}
            disabled={cooldown > 0 || resending}
            style={{
              background: "none",
              border: "none",
              color: cooldown > 0 ? colors.textDim : colors.purple,
              fontWeight: 700,
              cursor: cooldown > 0 || resending ? "not-allowed" : "pointer",
              fontSize: 12,
              padding: 0,
            }}
          >
            {resending ? "Invio…" : cooldown > 0 ? `Riprova tra ${cooldown}s` : "Rinvia codice"}
          </button>
        </div>
      </form>
    </div>
  );
}
