import { useEffect, useRef, useState } from "react";
import { ScanLine, Upload, Loader2, FileText, Sparkles, Image as ImageIcon, Link as LinkIcon, Youtube, FileType2, ClipboardPaste, type LucideIcon } from "lucide-react";
import { useAuth } from "../store/auth";
import { api } from "../api/client";
import { radius } from "../theme";
import { Select } from "../components/Select";

import { useTheme } from "../lib/theme-provider";
type Source = "image" | "text" | "url" | "youtube" | "pdf";

export function ScannerPage() {
  const { colors } = useTheme();
  const token = useAuth((s) => s.token);
  const user = useAuth((s) => s.user);
  const [source, setSource] = useState<Source>("image");
  const [text, setText] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageB64, setImageB64] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState("");
  const [ytInput, setYtInput] = useState("");
  const [pdfName, setPdfName] = useState<string | null>(null);
  const [extractedText, setExtractedText] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  const subjects: string[] = (user as any)?.subjects || [];

  useEffect(() => {
    if (!subject && subjects.length > 0) setSubject(subjects[0]);
  }, [subjects]); // eslint-disable-line react-hooks/exhaustive-deps

  // Quando cambio source, reset degli input specifici per non contaminare
  useEffect(() => {
    setError(null);
    setExtractedText(null);
    // (non resetto title/subject perche' sono cross-source)
  }, [source]);

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

  const readPdf = async (file: File) => {
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setError("Il file deve essere un PDF.");
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      setError("PDF troppo grande (max 12 MB).");
      return;
    }
    if (!token) return;
    setError(null);
    setPdfName(file.name);
    setExtracting(true);
    try {
      const buf = await file.arrayBuffer();
      const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
      const r = await api.extractPdf({ pdf_base64: b64, max_pages: 25 }, token);
      setExtractedText(r.text);
      if (!title) setTitle(file.name.replace(/\.pdf$/i, ""));
    } catch (e: any) {
      setError(e?.message || "Estrazione PDF fallita");
      setPdfName(null);
    } finally {
      setExtracting(false);
    }
  };

  const doExtractUrl = async () => {
    if (!token || !urlInput.trim()) return;
    setExtracting(true);
    setError(null);
    setExtractedText(null);
    try {
      const r = await api.extractUrl({ url: urlInput.trim() }, token);
      setExtractedText(r.text);
      if (!title) setTitle(r.title || "Pagina web");
    } catch (e: any) {
      setError(e?.message || "Errore estrazione URL");
    } finally {
      setExtracting(false);
    }
  };

  const doExtractYoutube = async () => {
    if (!token || !ytInput.trim()) return;
    setExtracting(true);
    setError(null);
    setExtractedText(null);
    try {
      const r = await api.extractYoutube({ url: ytInput.trim(), language: "it" }, token);
      setExtractedText(r.text);
      if (!title) setTitle(r.title || "Video YouTube");
    } catch (e: any) {
      setError(e?.message || "Errore estrazione YouTube (trascrizione non disponibile?)");
    } finally {
      setExtracting(false);
    }
  };

  const onSubmit = async () => {
    if (!token) return;
    // Costruisco il payload in base alla source attiva
    const textPayload =
      source === "text" ? text.trim()
      : source === "url" || source === "youtube" || source === "pdf" ? (extractedText || "").trim()
      : "";
    const imagePayload = source === "image" ? imageB64 : null;
    if (!textPayload && !imagePayload) {
      setError("Aggiungi contenuto: immagine, testo, URL, video YouTube o PDF.");
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
          text: textPayload || undefined,
          image_base64: imagePayload || undefined,
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
            <label style={getLabelStyle(colors)}>
              Titolo (opzionale)
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="es. Riassunto Storia cap. 5" style={getInputStyle(colors)} />
            </label>
            <label style={getLabelStyle(colors)}>
              Materia
              <Select
                value={subject}
                onChange={setSubject}
                options={subjects.map((s) => ({ value: s, label: s }))}
                placeholder="— Seleziona —"
              />
            </label>
          </div>

          {/* Source tabs */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", padding: 4, borderRadius: radius.md, background: colors.bgGlass, border: `1px solid ${colors.border}` }}>
            <SourceTab active={source === "image"} onClick={() => setSource("image")} icon={ImageIcon} label="Immagine" color={colors.purple} />
            <SourceTab active={source === "text"} onClick={() => setSource("text")} icon={ClipboardPaste} label="Testo" color={colors.cyan} />
            <SourceTab active={source === "url"} onClick={() => setSource("url")} icon={LinkIcon} label="Sito web" color={colors.green} />
            <SourceTab active={source === "youtube"} onClick={() => setSource("youtube")} icon={Youtube} label="YouTube" color={colors.red} />
            <SourceTab active={source === "pdf"} onClick={() => setSource("pdf")} icon={FileType2} label="PDF" color={colors.orange} />
          </div>

          {/* Panel: Immagine */}
          {source === "image" && (
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
          )}

          {/* Panel: Testo */}
          {source === "text" && (
            <label style={getLabelStyle(colors)}>
              Incolla il testo da riassumere
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Incolla qui il testo (appunti, capitolo, articolo)…"
                rows={10}
                style={{ ...getInputStyle(colors), height: "auto", padding: 12, resize: "vertical", fontFamily: "inherit" }}
              />
            </label>
          )}

          {/* Panel: URL */}
          {source === "url" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <label style={getLabelStyle(colors)}>
                URL della pagina
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://…"
                    style={{ ...getInputStyle(colors), flex: 1 }}
                  />
                  <button
                    onClick={doExtractUrl}
                    disabled={extracting || !urlInput.trim()}
                    style={{
                      padding: "0 16px", borderRadius: radius.md,
                      background: `${colors.green}22`,
                      border: `1px solid ${colors.green}`,
                      color: colors.green, fontWeight: 800, fontSize: 12,
                      cursor: extracting ? "not-allowed" : "pointer",
                      display: "flex", alignItems: "center", gap: 6,
                    }}
                  >
                    {extracting ? <><Loader2 size={12} className="spin" /> Estraggo…</> : "Estrai testo"}
                  </button>
                </div>
              </label>
              {extractedText && <ExtractedPreview text={extractedText} />}
            </div>
          )}

          {/* Panel: YouTube */}
          {source === "youtube" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <label style={getLabelStyle(colors)}>
                URL video YouTube
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    value={ytInput}
                    onChange={(e) => setYtInput(e.target.value)}
                    placeholder="https://youtu.be/… o https://youtube.com/watch?v=…"
                    style={{ ...getInputStyle(colors), flex: 1 }}
                  />
                  <button
                    onClick={doExtractYoutube}
                    disabled={extracting || !ytInput.trim()}
                    style={{
                      padding: "0 16px", borderRadius: radius.md,
                      background: `${colors.red}22`,
                      border: `1px solid ${colors.red}`,
                      color: colors.red, fontWeight: 800, fontSize: 12,
                      cursor: extracting ? "not-allowed" : "pointer",
                      display: "flex", alignItems: "center", gap: 6,
                    }}
                  >
                    {extracting ? <><Loader2 size={12} className="spin" /> Trascrivo…</> : "Estrai trascrizione"}
                  </button>
                </div>
              </label>
              <div style={{ fontSize: 11, color: colors.textMuted, fontStyle: "italic" }}>
                Serve una trascrizione disponibile sul video (auto-generata o caricata dall'autore). Preferenza italiano, fallback altre lingue.
              </div>
              {extractedText && <ExtractedPreview text={extractedText} />}
            </div>
          )}

          {/* Panel: PDF */}
          {source === "pdf" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div
                onClick={() => pdfInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                onDragLeave={() => setDragActive(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragActive(false);
                  const f = e.dataTransfer.files?.[0];
                  if (f) readPdf(f);
                }}
                style={{
                  padding: 24,
                  borderRadius: radius.lg,
                  background: dragActive ? `${colors.orange}14` : colors.bgGlass,
                  border: `2px dashed ${dragActive ? colors.orange : colors.border}`,
                  textAlign: "center",
                  cursor: "pointer",
                  transition: "all 150ms",
                }}
              >
                <input
                  ref={pdfInputRef}
                  type="file"
                  accept="application/pdf,.pdf"
                  style={{ display: "none" }}
                  onChange={(e) => e.target.files?.[0] && readPdf(e.target.files[0])}
                />
                {extracting ? (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                    <Loader2 size={32} color={colors.orange} className="spin" />
                    <div style={{ fontWeight: 700, fontSize: 15 }}>Estraggo testo dal PDF…</div>
                  </div>
                ) : pdfName ? (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                    <FileType2 size={28} color={colors.orange} />
                    <div style={{ fontWeight: 800, fontSize: 14 }}>{pdfName}</div>
                    <div style={{ fontSize: 12, color: colors.textSub }}>Clicca per sostituire</div>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                    <Upload size={32} color={colors.textMuted} />
                    <div style={{ fontWeight: 700, fontSize: 15 }}>Trascina un PDF qui</div>
                    <div style={{ fontSize: 12, color: colors.textMuted }}>oppure clicca per selezionarlo · max 12 MB, 25 pagine</div>
                  </div>
                )}
              </div>
              {extractedText && <ExtractedPreview text={extractedText} />}
            </div>
          )}

          {error && <div style={getErrorStyle(colors)}>{error}</div>}

          <button
            onClick={onSubmit}
            disabled={loading || (source === "image" ? !imageB64 : source === "text" ? !text : !extractedText)}
            style={{
              padding: "14px 20px",
              borderRadius: radius.md,
              background: "linear-gradient(135deg, #a855f7 0%, #3b82f6 100%)",
              color: colors.textPrimary,
              fontWeight: 800,
              fontSize: 15,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              opacity: loading || (source === "image" ? !imageB64 : source === "text" ? !text : !extractedText) ? 0.5 : 1,
              cursor: loading ? "not-allowed" : "pointer",
              boxShadow: "0 6px 24px rgba(168,85,247,0.32)",
              border: "none",
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
            onClick={() => {
              setResult(null); setText(""); setImagePreview(null); setImageB64(null);
              setTitle(""); setUrlInput(""); setYtInput(""); setExtractedText(null); setPdfName(null);
            }}
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

function SourceTab({
  active, onClick, icon: Icon, label, color,
}: {
  active: boolean; onClick: () => void;
  icon: LucideIcon;
  label: string; color: string;
}) {
  const { colors } = useTheme();
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        minWidth: 100,
        padding: "10px 12px",
        borderRadius: radius.sm,
        background: active ? `${color}22` : "transparent",
        border: `1px solid ${active ? color : "transparent"}`,
        color: active ? color : colors.textSub,
        fontWeight: active ? 800 : 700,
        fontSize: 12,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        cursor: "pointer",
        transition: "all 120ms",
      }}
    >
      <Icon size={14} color={active ? color : colors.textMuted} />
      {label}
    </button>
  );
}

function ExtractedPreview({ text }: { text: string }) {
  const { colors } = useTheme();
  return (
    <div style={{
      padding: 12,
      borderRadius: radius.md,
      background: colors.bg,
      border: `1px solid ${colors.border}`,
      maxHeight: 220,
      overflowY: "auto",
    }}>
      <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: 1, textTransform: "uppercase", color: colors.textMuted, marginBottom: 6 }}>
        Testo estratto ({text.length.toLocaleString()} caratteri)
      </div>
      <div style={{ fontSize: 12.5, color: colors.textSub, lineHeight: 1.55, whiteSpace: "pre-wrap" }}>
        {text.length > 800 ? text.slice(0, 800) + "…" : text}
      </div>
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
const getLabelStyle = (colors: any): React.CSSProperties => ({
  display: "flex", flexDirection: "column", gap: 6,
  fontSize: 12, fontWeight: 700, color: colors.textMuted, textTransform: "uppercase", letterSpacing: 0.5,
});
const getInputStyle = (colors: any): React.CSSProperties => ({
  height: 42, padding: "0 14px",
  borderRadius: radius.md,
  background: colors.bgGlass, border: `1px solid ${colors.border}`,
  color: colors.textPrimary, fontSize: 14, fontWeight: 500, outline: "none",
});
const getErrorStyle = (colors: any): React.CSSProperties => ({
  padding: 12, borderRadius: radius.sm,
  background: `${colors.red}1a`, border: `1px solid ${colors.red}55`,
  color: colors.red, fontSize: 13, fontWeight: 600,
});
