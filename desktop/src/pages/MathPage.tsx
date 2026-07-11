import { useState } from "react";
import { Calculator, Loader2, Sparkles } from "lucide-react";
import { useAuth } from "../store/auth";
import { api } from "../api/client";
import { colors, radius } from "../theme";

export function MathPage() {
  const token = useAuth((s) => s.token);
  const [problem, setProblem] = useState("");
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const onSolve = async () => {
    if (!token || !problem.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const r = await api.mathSolve({ problem: problem.trim(), difficulty }, token);
      setResult(r);
    } catch (err: any) {
      setError(err?.message ?? "Errore durante la risoluzione");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={iconWrap(colors.cyan)}>
          <Calculator size={22} color={colors.cyan} />
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 900, letterSpacing: -0.5 }}>Matematica</h1>
          <p style={{ margin: "4px 0 0 0", color: colors.textSub, fontSize: 13 }}>
            Descrivi il problema → soluzione step-by-step
          </p>
        </div>
      </div>

      {!result && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <label style={labelStyle}>
            Problema
            <textarea
              value={problem}
              onChange={(e) => setProblem(e.target.value)}
              placeholder="Es. Risolvi l'equazione 2x² + 3x - 5 = 0"
              rows={5}
              style={{ ...inputStyle, height: "auto", padding: 12, resize: "vertical", fontFamily: "inherit" }}
              autoFocus
            />
          </label>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {(["easy", "medium", "hard"] as const).map((d) => (
              <button
                key={d}
                onClick={() => setDifficulty(d)}
                style={{
                  padding: "8px 16px",
                  borderRadius: 999,
                  background: difficulty === d ? `${colors.cyan}22` : colors.bgGlass,
                  border: `1px solid ${difficulty === d ? colors.cyan : colors.border}`,
                  color: difficulty === d ? colors.cyan : colors.textSub,
                  fontSize: 12,
                  fontWeight: 700,
                  textTransform: "capitalize",
                }}
              >
                {d === "easy" ? "Facile" : d === "medium" ? "Medio" : "Avanzato"}
              </button>
            ))}
          </div>

          {error && <div style={errorStyle}>{error}</div>}

          <button
            onClick={onSolve}
            disabled={loading || !problem.trim()}
            style={{
              padding: "14px 20px",
              borderRadius: radius.md,
              background: "linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)",
              color: "#fff",
              fontWeight: 800,
              fontSize: 15,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              opacity: loading || !problem.trim() ? 0.5 : 1,
              cursor: loading ? "not-allowed" : "pointer",
              boxShadow: "0 6px 24px rgba(6,182,212,0.32)",
            }}
          >
            {loading ? (
              <><Loader2 size={18} className="spin" /> Risolvo…</>
            ) : (
              <><Sparkles size={18} /> Risolvi con AI</>
            )}
          </button>
        </div>
      )}

      {result && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{
            padding: 20,
            borderRadius: radius.lg,
            background: `${colors.cyan}0d`,
            border: `1px solid ${colors.cyan}55`,
          }}>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: colors.cyan, marginBottom: 10 }}>
              Soluzione
            </div>
            {result.solution && (
              <div style={{ fontSize: 14, lineHeight: 1.7, whiteSpace: "pre-wrap", color: colors.textPrimary }}>
                {result.solution}
              </div>
            )}
            {result.steps && Array.isArray(result.steps) && (
              <ol style={{ paddingLeft: 20, marginTop: 12 }}>
                {result.steps.map((s: any, i: number) => (
                  <li key={i} style={{ marginBottom: 8, fontSize: 14, lineHeight: 1.6 }}>
                    {typeof s === "string" ? s : (s.text || s.description || JSON.stringify(s))}
                  </li>
                ))}
              </ol>
            )}
            {result.final_answer && (
              <div style={{
                marginTop: 16,
                padding: 12,
                borderRadius: radius.sm,
                background: `${colors.green}14`,
                border: `1px solid ${colors.green}55`,
              }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: colors.green, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 4 }}>Risultato</div>
                <div style={{ fontSize: 16, fontWeight: 800 }}>{result.final_answer}</div>
              </div>
            )}
            {!result.solution && !result.steps && !result.final_answer && (
              <pre style={{ fontSize: 12, color: colors.textSub, overflow: "auto" }}>
                {JSON.stringify(result, null, 2)}
              </pre>
            )}
          </div>
          <button
            onClick={() => { setResult(null); setProblem(""); }}
            style={{
              padding: "12px 20px",
              borderRadius: radius.sm,
              background: colors.bgGlass,
              border: `1px solid ${colors.border}`,
              color: colors.textPrimary,
              fontWeight: 700,
              alignSelf: "flex-start",
            }}
          >
            ← Nuovo problema
          </button>
        </div>
      )}
    </div>
  );
}

function iconWrap(c: string): React.CSSProperties {
  return {
    width: 44, height: 44, borderRadius: 14,
    background: `${c}1a`, border: `1px solid ${c}55`,
    display: "flex", alignItems: "center", justifyContent: "center",
  };
}
const labelStyle: React.CSSProperties = {
  display: "flex", flexDirection: "column", gap: 6,
  fontSize: 12, fontWeight: 700, color: colors.textSub,
  textTransform: "uppercase", letterSpacing: 0.6,
};
const inputStyle: React.CSSProperties = {
  height: 42, padding: "0 14px",
  borderRadius: radius.md,
  background: colors.bgGlass, border: `1px solid ${colors.border}`,
  color: colors.textPrimary, fontSize: 14,
  outline: "none",
};
const errorStyle: React.CSSProperties = {
  padding: 12, borderRadius: radius.sm,
  background: `${colors.red}1a`, border: `1px solid ${colors.red}55`,
  color: colors.red, fontSize: 13, fontWeight: 600,
};
