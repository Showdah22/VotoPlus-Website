import { useEffect, useRef, useState } from "react";
import { ScanLine, Upload, Loader2, FileText, Sparkles } from "lucide-react";
import { useAuth } from "../store/auth";
import { api } from "../api/client";
import { colors, radius } from "../theme";

export function ScannerPage() {
  const token = useAuth((s) => s.token);
  const user = useAuth((s) => s.user);
  const [text, setText] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageB64, setImageB64] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const subjects: string[] = (user as any)?.subjects || [];

  useEffect(() => {
    if (!subject && subjects.length > 0) setSubject(subjects[0]);
  }, [subjects]); // eslint-disable-line react-hooks/exhaustive-deps

  const readFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Al momento supportato solo formato immagine (PNG/JPG)");
      return;
    }
    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setImagePreview(dataUrl);
      setImageB64(dataUrl.split(",")[1]);
    };
    reader.readAsDataURL(file);
  };

  const onSubmit = async () => {
    if (!token) return;
    if (!text && !imageB64) {
      setError("Aggiungi del testo o carica un'immagine");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const r = await api.studyAnalyze(
        {
          title: title || "Studio da desktop",
          subject: subject || "Generale",
          text: text || undefined,
          image_base64: imageB64 || undefined,
        },
        token,
      );
      setResult(r);
    } catch (err: any) {
      setError(err?.message ?? "Errore durante l'analisi");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={iconWrap(colors.purple)}>
          <ScanLine size={22} color={colors.purple} />
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 900, letterSpacing: -0.5 }}>Scannerizza & Riassumi</h1>
          <p style={{ margin: "4px 0 0 0", color: colors.textSub, fontSize: 13 }}>
            Trascina un'immagine o incolla del testo → l'AI ti fa il riassunto
          </p>
        </div>
      </div>

      {/* Input area */}
      {!result && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <label style={labelStyle}>
              Titolo (opzionale)
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="es. Riassunto Storia cap. 5" style={inputStyle} />
            </label>
            <label style={labelStyle}>
              Materia
              <select value={subject} onChange={(e) => setSubject(e.target.value)} style={inputStyle}>
                <option value="">— Seleziona —</option>
                {subjects.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </label>
          </div>

          {/* Drag-drop area */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragActive(false);
              const f = e.dataTransfer.files?.[0];
              if (f) readFile(f);
            }}
            onClick={() => fileInputRef.current?.click()}
            style={{
              padding: 24,
              borderRadius: radius.lg,
              background: dragActive ? `${colors.purple}14` : colors.bgGlass,
              border: `2px dashed ${dragActive ? colors.purple : colors.border}`,
              textAlign: "center",
              cursor: "pointer",
              transition: "all 150ms",
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => e.target.files?.[0] && readFile(e.target.files[0])}
            />
            {imagePreview ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                <img src={imagePreview} alt="preview" style={{ maxWidth: "100%", maxHeight: 180, borderRadius: 12, border: `1px solid ${colors.border}` }} />
                <div style={{ fontSize: 12, color: colors.textSub }}>Immagine caricata — clicca per sostituirla</div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                <Upload size={32} color={colors.textMuted} />
                <div style={{ fontWeight: 700, fontSize: 15 }}>Trascina un'immagine qui</div>
                <div style={{ fontSize: 12, color: colors.textMuted }}>oppure clicca per selezionarla · PNG, JPG</div>
              </div>
            )}
          </div>

          <label style={labelStyle}>
            Oppure incolla testo
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Incolla qui il testo da riassumere…"
              rows={6}
              style={{ ...inputStyle, height: "auto", padding: 12, resize: "vertical", fontFamily: "inherit" }}
            />
          </label>

          {error && <div style={errorStyle}>{error}</div>}

          <button
            onClick={onSubmit}
            disabled={loading || (!text && !imageB64)}
            style={{
              padding: "14px 20px",
              borderRadius: radius.md,
              background: "linear-gradient(135deg, #a855f7 0%, #3b82f6 100%)",
              color: "#fff",
              fontWeight: 800,
              fontSize: 15,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              opacity: loading || (!text && !imageB64) ? 0.5 : 1,
              cursor: loading ? "not-allowed" : "pointer",
              boxShadow: "0 6px 24px rgba(168,85,247,0.32)",
            }}
          >
            {loading ? (
              <>
                <Loader2 size={18} className="spin" /> Analisi in corso…
              </>
            ) : (
              <>
                <Sparkles size={18} /> Genera riassunto AI
              </>
            )}
          </button>
        </div>
      )}

      {/* Result */}
      {result && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{
            padding: 20,
            borderRadius: radius.lg,
            background: `${colors.green}0d`,
            border: `1px solid ${colors.green}55`,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <FileText size={18} color={colors.green} />
              <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: colors.green }}>
                Riassunto generato
              </div>
            </div>
            <div style={{ fontSize: 20, fontWeight: 900, marginBottom: 12 }}>{result.title || title || "Studio"}</div>
            <div style={{ fontSize: 14, color: colors.textPrimary, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
              {result.summary || result.content || JSON.stringify(result, null, 2)}
            </div>
          </div>
          <button
            onClick={() => { setResult(null); setText(""); setImagePreview(null); setImageB64(null); setTitle(""); }}
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
            ← Nuovo riassunto
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
  color: colors.textPrimary, fontSize: 14, fontWeight: 500,
  outline: "none",
};
const errorStyle: React.CSSProperties = {
  padding: 12, borderRadius: radius.sm,
  background: `${colors.red}1a`, border: `1px solid ${colors.red}55`,
  color: colors.red, fontSize: 13, fontWeight: 600,
};
