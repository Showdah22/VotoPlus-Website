import { useEffect, useRef, useState } from "react";
import {
  Mic,
  MicOff,
  Volume2,
  Square,
  Play,
  RefreshCw,
  Loader2,
  Sparkles,
} from "lucide-react";
import { useAuth } from "../store/auth";
import { api } from "../api/client";
import { colors, radius } from "../theme";
import { Select } from "./Select";
import { getPreferredAudioDevices } from "./AudioSettings";

// ============================================================
// OraleVoiceMode — interrogazione con VOCE (STT + TTS OpenAI).
// Usa le preferenze audio salvate in Impostazioni (mic input +
// speaker output se supportato via setSinkId).
// ============================================================

type Attempt = {
  id: string;
  speak: string;
  audio_base64?: string;
  audio_url?: string;
  finished?: boolean;
  voice?: string;
};

type TurnResp = {
  transcript?: string;
  speak?: string;
  audio_base64?: string;
  audio_url?: string;
  finished?: boolean;
  need_retry?: boolean;
  message?: string;
};

const VOICES = [
  { value: "alloy", label: "Alloy — neutra, calda" },
  { value: "ash", label: "Ash — profonda maschile" },
  { value: "coral", label: "Coral — femminile chiara" },
  { value: "echo", label: "Echo — maschile calmo" },
  { value: "fable", label: "Fable — narrativa" },
  { value: "nova", label: "Nova — femminile vivace" },
  { value: "onyx", label: "Onyx — profonda autorevole" },
  { value: "sage", label: "Sage — riflessiva" },
  { value: "shimmer", label: "Shimmer — femminile brillante" },
];

const SEVERITIES = [
  { value: "facile", label: "Facile" },
  { value: "medio", label: "Medio" },
  { value: "severo", label: "Severo" },
  { value: "spietato", label: "Spietato" },
];

const LANG_MODES = [
  { value: "immersione", label: "Immersione (solo lingua)" },
  { value: "misto", label: "Misto (lingua + IT)" },
  { value: "italiano", label: "Italiano (traduzioni)" },
];

export function OraleVoiceMode() {
  const token = useAuth((s) => s.token);
  const user = useAuth((s) => s.user);
  const subjects: string[] = (user as any)?.subjects || [];

  // Setup
  const [subject, setSubject] = useState<string>(subjects[0] || "");
  const [severity, setSeverity] = useState("medio");
  const [voice, setVoice] = useState("alloy");
  const [languageMode, setLanguageMode] = useState<"immersione" | "misto" | "italiano">("immersione");
  const [topic, setTopic] = useState("");
  const [starting, setStarting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Session
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [messages, setMessages] = useState<Array<{ role: "prof" | "you"; text: string }>>([]);
  const [profSpeaking, setProfSpeaking] = useState(false);

  // Recording
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!subject && subjects.length > 0) setSubject(subjects[0]);
  }, [subjects]); // eslint-disable-line

  // Play helper: prende il base64 dal backend, lo setta come src, applica
  // setSinkId all'uscita preferita se supportato.
  async function playFromBase64(b64: string | undefined) {
    if (!b64) return;
    const { outputDeviceId } = getPreferredAudioDevices();
    const audio = new Audio(`data:audio/mp3;base64,${b64}`);
    audioRef.current = audio;
    audio.onplaying = () => setProfSpeaking(true);
    audio.onended = () => setProfSpeaking(false);
    audio.onerror = () => setProfSpeaking(false);
    if (outputDeviceId !== "default" && typeof (audio as any).setSinkId === "function") {
      try {
        await (audio as any).setSinkId(outputDeviceId);
      } catch {}
    }
    try {
      await audio.play();
    } catch (e) {
      // autoplay potrebbe fallire, mostriamo un CTA "Ascolta"
      console.warn("[oral-voice] autoplay blocked", e);
    }
  }

  async function onStart() {
    if (!token || !subject) return;
    setErr(null);
    setStarting(true);
    try {
      const a = (await api.oralVoiceStart(
        {
          subject,
          severity: severity as any,
          voice: voice as any,
          language_mode: languageMode,
          topic: topic.trim() || undefined,
          mode: "domande",
        },
        token,
      )) as Attempt;
      setAttempt(a);
      setMessages([{ role: "prof", text: a.speak }]);
      await playFromBase64(a.audio_base64);
    } catch (e: any) {
      setErr(e?.message || "Impossibile avviare l'interrogazione vocale");
    } finally {
      setStarting(false);
    }
  }

  async function startRecording() {
    if (!attempt) return;
    setErr(null);
    try {
      const { inputDeviceId } = getPreferredAudioDevices();
      const constraints: MediaStreamConstraints = {
        audio: inputDeviceId === "default" ? true : { deviceId: { exact: inputDeviceId } },
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "";
      const mr = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: mimeType || "audio/webm" });
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        setRecording(false);
        await submitTurn(blob);
      };
      mr.start();
      setRecording(true);
    } catch (e: any) {
      setErr(
        e?.name === "NotAllowedError"
          ? "Permesso microfono negato. Consenti l'accesso al mic dalle impostazioni."
          : e?.message || "Impossibile aprire il microfono.",
      );
    }
  }

  function stopRecording() {
    const mr = mediaRecorderRef.current;
    if (mr && mr.state !== "inactive") mr.stop();
  }

  async function submitTurn(blob: Blob) {
    if (!token || !attempt) return;
    setProcessing(true);
    setErr(null);
    try {
      const r = (await api.oralVoiceTurn(attempt.id, blob, token)) as TurnResp;
      if (r.need_retry) {
        setErr(r.message || "Non ho sentito bene. Prova di nuovo.");
        return;
      }
      if (r.transcript) {
        setMessages((m) => [...m, { role: "you", text: r.transcript! }]);
      }
      if (r.speak) {
        setMessages((m) => [...m, { role: "prof", text: r.speak! }]);
        await playFromBase64(r.audio_base64);
      }
      if (r.finished) {
        setAttempt((a) => (a ? { ...a, finished: true } : a));
      }
    } catch (e: any) {
      setErr(e?.message || "Errore turno vocale");
    } finally {
      setProcessing(false);
    }
  }

  function reset() {
    // Cleanup audio + stream
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setAttempt(null);
    setMessages([]);
    setProfSpeaking(false);
    setRecording(false);
    setProcessing(false);
    setErr(null);
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) audioRef.current.pause();
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  if (!attempt) {
    return (
      <section style={{ ...cardStyle(), opacity: starting ? 0.55 : 1, pointerEvents: starting ? "none" : "auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <FieldLabel label="Materia">
            <Select value={subject} onChange={setSubject} options={subjects.map((s) => ({ value: s, label: s }))} placeholder="— Seleziona —" />
          </FieldLabel>
          <FieldLabel label="Severità professore">
            <Select value={severity} onChange={setSeverity} options={SEVERITIES} />
          </FieldLabel>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <FieldLabel label="Voce del prof">
            <Select value={voice} onChange={setVoice} options={VOICES} />
          </FieldLabel>
          <FieldLabel label="Modalità lingua">
            <Select value={languageMode} onChange={(v) => setLanguageMode(v as any)} options={LANG_MODES} />
          </FieldLabel>
        </div>
        <FieldLabel label="Argomento specifico (opzionale)">
          <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="es. Guerra Fredda" style={txtInput()} />
        </FieldLabel>

        {err && <ErrorBox msg={err} />}

        <div style={{
          padding: 12,
          borderRadius: radius.md,
          background: `${colors.cyan}10`,
          border: `1px solid ${colors.cyan}44`,
          display: "flex",
          gap: 10,
          alignItems: "flex-start",
        }}>
          <Sparkles size={16} color={colors.cyan} style={{ flexShrink: 0, marginTop: 2 }} />
          <div style={{ fontSize: 12, color: colors.textSub, lineHeight: 1.6 }}>
            <strong style={{ color: "#fff" }}>Come funziona.</strong> Parli e il prof ti risponde a voce.
            Usa mic + speaker configurati in <em>Impostazioni → Audio</em>. Premi il grande cerchio microfono per registrare, ri-premi per inviare.
          </div>
        </div>

        <button onClick={onStart} disabled={!subject || starting} style={primaryBtn(!subject || starting)}>
          {starting ? (<><Loader2 size={16} className="spin" /> Il prof sta aprendo la sessione…</>) : (<><Mic size={16} /> Inizia interrogazione vocale</>)}
        </button>
      </section>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Conversation trascritta */}
      <div style={cardStyle()}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, maxHeight: 340, overflowY: "auto" }}>
          {messages.map((m, i) => (
            <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <div style={{
                width: 32, height: 32, borderRadius: 999,
                background: m.role === "prof" ? `${colors.green}18` : `${colors.purple}18`,
                border: `1px solid ${m.role === "prof" ? colors.green : colors.purple}66`,
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}>
                {m.role === "prof" ? <Volume2 size={14} color={colors.green} /> : <Mic size={14} color={colors.purple} />}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: 0.8, color: colors.textMuted, textTransform: "uppercase", marginBottom: 2 }}>
                  {m.role === "prof" ? "Professore" : "Tu"}
                </div>
                <div style={{ fontSize: 14, color: colors.textPrimary, lineHeight: 1.55 }}>{m.text}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Mic panel */}
      <div style={{
        padding: 20,
        borderRadius: radius.lg,
        background: `linear-gradient(135deg, ${colors.green}10 0%, ${colors.cyan}08 100%)`,
        border: `1.5px solid ${colors.green}44`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 14,
      }}>
        <button
          onClick={recording ? stopRecording : startRecording}
          disabled={processing || profSpeaking || attempt.finished}
          style={{
            width: 100,
            height: 100,
            borderRadius: 999,
            background: recording
              ? `radial-gradient(circle, ${colors.red}, ${colors.pink})`
              : profSpeaking
              ? `radial-gradient(circle, ${colors.cyan}66, ${colors.green}44)`
              : `radial-gradient(circle, ${colors.green}, ${colors.cyan})`,
            border: "none",
            color: "#fff",
            cursor: processing || profSpeaking ? "not-allowed" : "pointer",
            boxShadow: recording
              ? `0 0 40px ${colors.red}88`
              : `0 0 30px ${colors.green}66`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 200ms",
            transform: recording ? "scale(1.05)" : "scale(1)",
            animation: recording ? "voto-pulse-red 1.4s ease-in-out infinite" : "none",
            opacity: processing || profSpeaking ? 0.6 : 1,
          }}
        >
          {processing ? <Loader2 size={36} className="spin" />
          : recording ? <Square size={32} fill="#fff" />
          : profSpeaking ? <Volume2 size={36} />
          : <Mic size={36} />}
        </button>

        <div style={{ fontSize: 13, fontWeight: 700, color: colors.textSub, textAlign: "center", minHeight: 20 }}>
          {profSpeaking
            ? "Il prof sta parlando… ascolta bene."
            : processing
            ? "Trascrivo e faccio valutare la risposta…"
            : recording
            ? "Sto registrando — premi il cerchio per inviare"
            : attempt.finished
            ? "Sessione conclusa."
            : "Premi il cerchio per rispondere"}
        </div>

        {err && <ErrorBox msg={err} />}

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={reset} style={secondaryBtn()}>
            <RefreshCw size={12} /> Nuova sessione
          </button>
          {profSpeaking && (
            <button
              onClick={() => audioRef.current && (audioRef.current.pause(), setProfSpeaking(false))}
              style={secondaryBtn()}
            >
              <Square size={12} /> Interrompi audio
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function FieldLabel({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ fontSize: 11, fontWeight: 800, color: colors.textMuted, textTransform: "uppercase", letterSpacing: 0.8 }}>{label}</span>
      {children}
    </label>
  );
}
function cardStyle(extra: React.CSSProperties = {}): React.CSSProperties {
  return { padding: 18, borderRadius: radius.lg, background: colors.bgGlass, border: `1px solid ${colors.border}`, display: "flex", flexDirection: "column", gap: 14, ...extra };
}
function txtInput(): React.CSSProperties {
  return { height: 42, padding: "0 14px", borderRadius: radius.md, background: colors.bgGlass, border: `1px solid ${colors.border}`, color: colors.textPrimary, fontSize: 14, outline: "none", fontFamily: "inherit" };
}
function primaryBtn(disabled: boolean): React.CSSProperties {
  return {
    padding: "12px 18px",
    borderRadius: radius.md,
    background: disabled ? colors.bgGlass : `linear-gradient(135deg, ${colors.green} 0%, ${colors.cyan} 100%)`,
    border: "none",
    color: disabled ? colors.textMuted : "#fff",
    fontWeight: 800, fontSize: 14,
    cursor: disabled ? "not-allowed" : "pointer",
    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
  };
}
function secondaryBtn(): React.CSSProperties {
  return {
    padding: "10px 14px", borderRadius: radius.md,
    background: colors.bgGlass, border: `1px solid ${colors.border}`,
    color: colors.textSub, fontWeight: 700, fontSize: 12,
    cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
  };
}
function ErrorBox({ msg }: { msg: string }) {
  return (
    <div style={{ padding: 10, borderRadius: radius.sm, background: `${colors.red}15`, border: `1px solid ${colors.red}55`, color: colors.red, fontSize: 12, fontWeight: 700 }}>{msg}</div>
  );
}

// Silenzia icone non usate
void Play;
void MicOff;
