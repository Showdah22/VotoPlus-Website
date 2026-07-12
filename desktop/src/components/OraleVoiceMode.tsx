import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Mic,
  MicOff,
  Volume2,
  Square,
  RefreshCw,
  Loader2,
  Sparkles,
  Clock,
  GraduationCap,
  Star,
  BookOpen,
  Zap,
  MessageCircle,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "../store/auth";
import { api, backendUrl } from "../api/client";
import { colors, radius } from "../theme";
import { Select } from "./Select";
import { getPreferredAudioDevices } from "./AudioSettings";
import { OralRealtimeClient, type RealtimeMessage } from "../lib/realtimeClient";

// ============================================================
// OraleVoiceMode — interrogazione vocale con OpenAI REALTIME API.
//
// Il modello parla e ascolta in tempo reale via WebRTC — nessun
// bottone di registrazione. Server-side VAD gestisce automaticamente
// gli inizio/fine turno.
//
// UI parity 1:1 con l'app mobile:
//  • Nomi voci: Alex / Marco / Prof. Giorgio / Prof.ssa Sofia / Prof.ssa Chiara
//  • Nomi severità: Comprensivo / Standard / Esigente / Spietato
//  • Modalità: Domande secche / Esposizione + approfondimenti
//  • Durata: Standard 15min / Lampo 5min
//  • Scope: Tutta la materia / Riassunti specifici
//  • Lingua mostrata solo per lingue straniere
//  • Argomento obbligatorio
// ============================================================

type FinalResult = {
  grade?: number;
  grade_label?: string;
  summary?: string;
  strengths?: string[];
  weaknesses?: string[];
};

const SEVERITIES = [
  { value: "facile", label: "Comprensivo" },
  { value: "medio", label: "Standard" },
  { value: "severo", label: "Esigente" },
  { value: "spietato", label: "Spietato" },
];

const VOICES = [
  { value: "alloy", label: "Alex — neutro" },
  { value: "echo", label: "Marco" },
  { value: "onyx", label: "Prof. Giorgio" },
  { value: "nova", label: "Prof.ssa Sofia" },
  { value: "shimmer", label: "Prof.ssa Chiara" },
];

const LANG_MODES = [
  { value: "italiano", label: "🇮🇹 Italiano (beginner)" },
  { value: "misto", label: "🌐 Misto (intermedio)" },
  { value: "immersione", label: "🌍 Immersione (avanzato)" },
];

const FOREIGN_LANG_KW = ["inglese", "english", "francese", "français", "tedesco", "deutsch", "spagnolo", "español"];

function isForeignLanguage(subject: string): boolean {
  const s = (subject || "").toLowerCase();
  return FOREIGN_LANG_KW.some((k) => s.includes(k));
}

export function OraleVoiceMode() {
  const token = useAuth((s) => s.token);
  const user = useAuth((s) => s.user);
  const subjects: string[] = ((user as any)?.subjects || []).filter(
    (s: string) => (s || "").toLowerCase() !== "matematica",
  );

  // ─── Setup state (parity mobile) ────────────────────────────
  const [subject, setSubject] = useState<string>(subjects[0] || "");
  const [severity, setSeverity] = useState("medio");
  const [voice, setVoice] = useState("alloy");
  const [mode, setMode] = useState<"domande" | "esposizione">("domande");
  const [duration, setDuration] = useState<5 | 15>(15);
  const [languageMode, setLanguageMode] = useState<"immersione" | "misto" | "italiano">("immersione");
  const [topic, setTopic] = useState("");
  // Scope (Sprint C parity)
  const [scopeAll, setScopeAll] = useState(true);
  const [selectedMats, setSelectedMats] = useState<string[]>([]);
  const [availableMats, setAvailableMats] = useState<Array<{ id: string; title: string }>>([]);
  const [matsLoading, setMatsLoading] = useState(false);

  // ─── Session state ──────────────────────────────────────────
  const [phase, setPhase] = useState<"setup" | "live" | "result">("setup");
  const [starting, setStarting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [profSpeaking, setProfSpeaking] = useState(false);
  const [micMuted, setMicMuted] = useState(false);
  const [messages, setMessages] = useState<RealtimeMessage[]>([]);
  const [finalResult, setFinalResult] = useState<FinalResult | null>(null);

  // Timer
  const [sessionStart, setSessionStart] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);

  const clientRef = useRef<OralRealtimeClient | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!subject && subjects.length > 0) setSubject(subjects[0]);
  }, [subjects, subject]);

  // Carica riassunti quando cambia materia
  useEffect(() => {
    if (!token || !subject) return;
    let cancelled = false;
    setMatsLoading(true);
    api
      .studyHistory(token)
      .then((all: any[]) => {
        if (cancelled) return;
        const filtered = (all || [])
          .filter((m: any) => (m.subject || "").toLowerCase() === subject.toLowerCase())
          .map((m: any) => ({ id: m.id, title: m.title || "Senza titolo" }));
        setAvailableMats(filtered);
        setSelectedMats([]);
        setScopeAll(true);
      })
      .catch(() => setAvailableMats([]))
      .finally(() => {
        if (!cancelled) setMatsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token, subject]);

  // Timer tick
  useEffect(() => {
    if (phase !== "live" || sessionStart == null) return;
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - sessionStart) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [phase, sessionStart]);

  const fmtMMSS = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;
  const timerExpired = elapsed >= duration * 60;

  // Autoscroll conversazione
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  const foreign = useMemo(() => isForeignLanguage(subject), [subject]);

  // ─── Actions ────────────────────────────────────────────────
  const stopClient = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.stop();
      clientRef.current = null;
    }
    setConnected(false);
    setProfSpeaking(false);
  }, []);

  useEffect(() => {
    return () => {
      stopClient();
    };
  }, [stopClient]);

  async function onStart() {
    if (!token || !subject) return;
    const t = topic.trim();
    if (!t) {
      setErr("Inserisci l'argomento dell'interrogazione prima di iniziare.");
      return;
    }
    setStarting(true);
    setErr(null);
    setMessages([]);
    setFinalResult(null);
    try {
      const { inputDeviceId, outputDeviceId } = getPreferredAudioDevices();
      const client = new OralRealtimeClient({
        onConnected: () => setConnected(true),
        onTranscript: (m) => setMessages((cur) => [...cur, m]),
        onProfSpeakingChange: (v) => setProfSpeaking(v),
        onEndSession: (data) => {
          setFinalResult(data);
          // persisti backend
          if (clientRef.current?.attemptId) {
            api
              .oralRealtimeFinish(
                {
                  attempt_id: clientRef.current.attemptId,
                  grade: data.grade,
                  grade_label: data.grade_label,
                  summary: data.summary,
                  strengths: data.strengths,
                  weaknesses: data.weaknesses,
                  transcript: (messages || []).map((m) => ({ role: m.role, text: m.text })),
                },
                token!,
              )
              .catch(() => {});
          }
          // Diamo qualche secondo al prof per finire di parlare
          setTimeout(() => {
            stopClient();
            setPhase("result");
          }, 4500);
        },
        onError: (msg) => {
          setErr(msg);
        },
      });
      await client.start(
        {
          subject,
          severity,
          topic: t,
          voice,
          mode,
          duration_min: duration,
          language_mode: foreign ? languageMode : undefined,
          material_ids: !scopeAll && selectedMats.length > 0 ? selectedMats : undefined,
        },
        token,
        backendUrl,
        inputDeviceId,
        outputDeviceId,
      );
      clientRef.current = client;
      setPhase("live");
      setSessionStart(Date.now());
      setElapsed(0);
    } catch (e: any) {
      if (e?.status === 402) {
        setErr("Funzione Premium: la modalità Voce richiede l'abbonamento attivo.");
      } else if (e?.name === "NotAllowedError") {
        setErr("Permesso microfono negato. Consenti l'accesso al mic dalle impostazioni del sistema.");
      } else {
        setErr(e?.message || "Impossibile avviare la sessione vocale.");
      }
    } finally {
      setStarting(false);
    }
  }

  function endEarly() {
    stopClient();
    setPhase("result");
  }

  function reset() {
    stopClient();
    setPhase("setup");
    setMessages([]);
    setFinalResult(null);
    setElapsed(0);
    setSessionStart(null);
    setErr(null);
    setMicMuted(false);
  }

  function toggleMute() {
    if (!clientRef.current) return;
    const next = !micMuted;
    setMicMuted(next);
    clientRef.current.setMicMuted(next);
  }

  // ═══════════════════════════════════════════════════════════
  // RENDER — SETUP
  // ═══════════════════════════════════════════════════════════
  if (phase === "setup") {
    const canStart = !!subject && !!topic.trim() && !starting;
    return (
      <section
        style={{
          ...cardStyle(),
          opacity: starting ? 0.55 : 1,
          pointerEvents: starting ? "none" : "auto",
          transition: "opacity 150ms",
        }}
      >
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <FieldLabel label="Materia">
            <Select
              value={subject}
              onChange={setSubject}
              options={subjects.map((s) => ({ value: s, label: s }))}
              placeholder="— Seleziona —"
            />
          </FieldLabel>
          <FieldLabel label="Severità del prof">
            <Select value={severity} onChange={setSeverity} options={SEVERITIES} />
          </FieldLabel>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <FieldLabel label="Voce del prof">
            <Select value={voice} onChange={setVoice} options={VOICES} />
          </FieldLabel>
          {foreign ? (
            <FieldLabel label="Modalità lingua">
              <Select
                value={languageMode}
                onChange={(v) => setLanguageMode(v as any)}
                options={LANG_MODES}
              />
            </FieldLabel>
          ) : (
            <div />
          )}
        </div>

        <FieldLabel label={<>Argomento <span style={{ color: colors.red }}>*</span></>}>
          <input
            value={topic}
            onChange={(e) => {
              setTopic(e.target.value);
              if (err) setErr(null);
            }}
            placeholder="Es. Rivoluzione francese, La Divina Commedia…"
            style={txtInput(!!err && !topic.trim())}
          />
          <span style={{ fontSize: 11, color: colors.textMuted }}>
            Il prof userà questo argomento per costruire le domande. Obbligatorio.
          </span>
        </FieldLabel>

        <FieldLabel label="Modalità interrogazione">
          <div style={{ display: "flex", gap: 8 }}>
            <ModePill
              active={mode === "domande"}
              onClick={() => setMode("domande")}
              icon={<MessageCircle size={14} />}
              title="Domande secche"
              subtitle="Una domanda alla volta"
              color={colors.cyan}
            />
            <ModePill
              active={mode === "esposizione"}
              onClick={() => setMode("esposizione")}
              icon={<BookOpen size={14} />}
              title="Esposizione + approfondimenti"
              subtitle="Esponi, poi ti chiede dettagli"
              color={colors.pink}
            />
          </div>
        </FieldLabel>

        <FieldLabel label="Durata">
          <div style={{ display: "flex", gap: 8 }}>
            <ModePill
              active={duration === 15}
              onClick={() => setDuration(15)}
              icon={<Clock size={14} />}
              title="Standard"
              subtitle="15 minuti"
              color={colors.green}
            />
            <ModePill
              active={duration === 5}
              onClick={() => setDuration(5)}
              icon={<Zap size={14} />}
              title="Lampo"
              subtitle="5 minuti, ritmo veloce"
              color={colors.orange}
            />
          </div>
        </FieldLabel>

        <FieldLabel label="Cosa interrogare">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <ScopeRow
              active={scopeAll}
              onClick={() => setScopeAll(true)}
              title="Tutta la materia"
              subtitle={`Il prof può chiederti qualsiasi cosa di ${subject || "questa materia"}`}
            />
            {matsLoading ? (
              <div style={mutedRow()}>
                <Loader2 size={14} className="spin" /> Caricamento riassunti…
              </div>
            ) : availableMats.length === 0 ? (
              <div style={mutedRow()}>
                Nessun riassunto salvato per {subject}. Creane uno dalla Home per interrogarti solo su quello.
              </div>
            ) : (
              <>
                <span style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>
                  Oppure seleziona uno o più riassunti specifici (max 8):
                </span>
                {availableMats.map((m) => {
                  const selected = selectedMats.includes(m.id);
                  return (
                    <button
                      key={m.id}
                      onClick={() => {
                        setScopeAll(false);
                        setSelectedMats((cur) =>
                          cur.includes(m.id)
                            ? cur.filter((x) => x !== m.id)
                            : cur.length < 8
                            ? [...cur, m.id]
                            : cur,
                        );
                      }}
                      style={{
                        display: "flex",
                        gap: 10,
                        alignItems: "center",
                        padding: "10px 12px",
                        borderRadius: radius.md,
                        background: selected ? `${colors.cyan}18` : colors.bgGlass,
                        border: `1px solid ${selected ? colors.cyan : colors.border}`,
                        color: selected ? "#fff" : colors.textSub,
                        fontWeight: 700,
                        fontSize: 12,
                        cursor: "pointer",
                        textAlign: "left",
                      }}
                    >
                      <div
                        style={{
                          width: 16,
                          height: 16,
                          borderRadius: 4,
                          border: `2px solid ${selected ? colors.cyan : colors.border}`,
                          background: selected ? colors.cyan : "transparent",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        {selected && <span style={{ color: "#000", fontSize: 12, fontWeight: 900 }}>✓</span>}
                      </div>
                      <span style={{ flex: 1 }}>{m.title}</span>
                    </button>
                  );
                })}
                {!scopeAll && selectedMats.length > 0 && (
                  <span style={{ fontSize: 11, color: colors.cyan, fontWeight: 800 }}>
                    📌 {selectedMats.length} riassunto{selectedMats.length > 1 ? "i" : ""} selezionato{selectedMats.length > 1 ? "i" : ""} — il prof interrogherà solo su questi
                  </span>
                )}
              </>
            )}
          </div>
        </FieldLabel>

        <div
          style={{
            padding: 12,
            borderRadius: radius.md,
            background: `${colors.cyan}10`,
            border: `1px solid ${colors.cyan}44`,
            display: "flex",
            gap: 10,
            alignItems: "flex-start",
          }}
        >
          <Sparkles size={16} color={colors.cyan} style={{ flexShrink: 0, marginTop: 2 }} />
          <div style={{ fontSize: 12, color: colors.textSub, lineHeight: 1.6 }}>
            <strong style={{ color: "#fff" }}>Modalità Voce Realtime.</strong> Parla naturalmente — il prof
            ti ascolta in tempo reale e risponde con voce naturale italiana. Nessun bottone da premere,
            puoi anche interromperlo. Assicurati che mic e speaker siano configurati in{" "}
            <em>Impostazioni → Audio</em>.
          </div>
        </div>

        {err && <ErrorBox msg={err} />}

        <button onClick={onStart} disabled={!canStart} style={primaryBtn(!canStart)}>
          {starting ? (
            <>
              <Loader2 size={16} className="spin" /> Sto connettendo il prof…
            </>
          ) : (
            <>
              <Mic size={16} /> Inizia interrogazione vocale
            </>
          )}
        </button>
      </section>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // RENDER — LIVE
  // ═══════════════════════════════════════════════════════════
  if (phase === "live") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Header live */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: 14,
            borderRadius: radius.md,
            background: colors.bgGlass,
            border: `1px solid ${colors.border}`,
          }}
        >
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: 999,
              background: connected ? colors.green : colors.orange,
              boxShadow: connected ? `0 0 10px ${colors.green}` : `0 0 10px ${colors.orange}`,
              animation: connected ? "voto-pulse-glow 1.5s ease-in-out infinite" : "none",
            }}
          />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 900 }}>
              {connected ? "Interrogazione in corso" : "Connessione in corso…"}
            </div>
            <div style={{ fontSize: 11, color: colors.textMuted }}>
              {subject} · {topic} · {mode === "domande" ? "Domande" : "Esposizione"} · {duration}min
            </div>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 12px",
              borderRadius: 999,
              background: timerExpired ? `${colors.red}22` : `${colors.cyan}18`,
              border: `1px solid ${timerExpired ? colors.red : colors.cyan}66`,
            }}
          >
            <Clock size={13} color={timerExpired ? colors.red : colors.cyan} />
            <span style={{ fontSize: 13, fontWeight: 900, color: timerExpired ? colors.red : colors.cyan }}>
              {fmtMMSS(elapsed)} / {duration}:00
            </span>
          </div>
        </div>

        {/* Conversazione */}
        <div style={cardStyle()}>
          <div
            ref={scrollRef}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 14,
              maxHeight: 380,
              overflowY: "auto",
              paddingRight: 4,
            }}
          >
            {messages.length === 0 && (
              <div style={{ fontSize: 13, color: colors.textMuted, fontStyle: "italic", textAlign: "center", padding: "24px 12px" }}>
                Il professore sta aprendo la conversazione… parla quando lo senti.
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <div
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 999,
                    background: m.role === "prof" ? `${colors.green}18` : `${colors.purple}18`,
                    border: `1px solid ${m.role === "prof" ? colors.green : colors.purple}66`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {m.role === "prof" ? (
                    <Volume2 size={14} color={colors.green} />
                  ) : (
                    <Mic size={14} color={colors.purple} />
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 900,
                      letterSpacing: 0.8,
                      color: colors.textMuted,
                      textTransform: "uppercase",
                      marginBottom: 2,
                    }}
                  >
                    {m.role === "prof" ? "Professore" : "Tu"}
                  </div>
                  <div style={{ fontSize: 14, color: colors.textPrimary, lineHeight: 1.55 }}>{m.text}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Live controls */}
        <div
          style={{
            padding: 20,
            borderRadius: radius.lg,
            background: `linear-gradient(135deg, ${colors.green}10 0%, ${colors.cyan}08 100%)`,
            border: `1.5px solid ${colors.green}44`,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 16,
          }}
        >
          <div
            style={{
              width: 110,
              height: 110,
              borderRadius: 999,
              background: profSpeaking
                ? `radial-gradient(circle, ${colors.cyan}66, ${colors.green}44)`
                : micMuted
                ? `radial-gradient(circle, ${colors.red}66, ${colors.pink}33)`
                : `radial-gradient(circle, ${colors.green}, ${colors.cyan})`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: profSpeaking
                ? `0 0 40px ${colors.cyan}88`
                : micMuted
                ? `0 0 20px ${colors.red}66`
                : `0 0 30px ${colors.green}66`,
              transition: "all 200ms",
              animation: profSpeaking
                ? "voto-pulse-glow 1.2s ease-in-out infinite"
                : !micMuted && connected
                ? "voto-pulse-glow 2.4s ease-in-out infinite"
                : "none",
            }}
          >
            {profSpeaking ? (
              <Volume2 size={44} color="#fff" />
            ) : micMuted ? (
              <MicOff size={44} color="#fff" />
            ) : (
              <Mic size={44} color="#fff" />
            )}
          </div>

          <div style={{ fontSize: 14, fontWeight: 800, color: colors.textPrimary, textAlign: "center", minHeight: 22 }}>
            {profSpeaking
              ? "Il prof sta parlando… ascolta bene."
              : micMuted
              ? "Microfono silenziato."
              : connected
              ? "Parla naturalmente — il prof ti ascolta."
              : "Connessione in corso…"}
          </div>

          {err && <ErrorBox msg={err} />}

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
            <button onClick={toggleMute} style={secondaryBtn(micMuted ? colors.red : undefined)}>
              {micMuted ? <MicOff size={14} /> : <Mic size={14} />}
              {micMuted ? "Riattiva mic" : "Silenzia mic"}
            </button>
            {profSpeaking && (
              <button
                onClick={() => clientRef.current?.stopOutput()}
                style={secondaryBtn()}
              >
                <Square size={12} /> Interrompi audio
              </button>
            )}
            <button onClick={endEarly} style={secondaryBtn(colors.red)}>
              <Square size={12} /> Termina interrogazione
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // RENDER — RESULT
  // ═══════════════════════════════════════════════════════════
  const g = finalResult?.grade;
  const gColor = g == null ? colors.textMuted : g >= 8 ? colors.green : g >= 6 ? colors.cyan : g >= 5 ? colors.orange : colors.red;
  return (
    <section
      style={cardStyle({
        background: `linear-gradient(135deg, ${gColor}18 0%, ${colors.cyan}10 100%)`,
        border: `1.5px solid ${gColor}55`,
      })}
    >
      <div style={{ textAlign: "center", padding: 12 }}>
        <GraduationCap size={40} color={gColor} style={{ marginBottom: 8 }} />
        <div
          style={{
            fontSize: 11,
            fontWeight: 900,
            letterSpacing: 1.4,
            color: gColor,
            textTransform: "uppercase",
          }}
        >
          Interrogazione conclusa
        </div>
        <div style={{ fontSize: 48, fontWeight: 900, marginTop: 8, color: "#fff" }}>
          {g != null ? g.toFixed(1) : "—"}
          <span style={{ fontSize: 22, color: colors.textMuted }}>/10</span>
        </div>
        {finalResult?.grade_label && (
          <div style={{ fontSize: 14, fontWeight: 800, color: gColor, marginTop: 4 }}>
            {finalResult.grade_label}
          </div>
        )}
      </div>

      {finalResult?.summary && (
        <div
          style={{
            padding: 14,
            borderRadius: radius.md,
            background: colors.bgGlass,
            border: `1px solid ${colors.border}`,
            fontSize: 13,
            color: colors.textSub,
            lineHeight: 1.6,
            fontStyle: "italic",
          }}
        >
          «Professore:» {finalResult.summary}
        </div>
      )}

      {finalResult?.strengths && finalResult.strengths.length > 0 && (
        <ChipList label="Punti forti" items={finalResult.strengths} color={colors.green} />
      )}
      {finalResult?.weaknesses && finalResult.weaknesses.length > 0 && (
        <ChipList label="Da migliorare" items={finalResult.weaknesses} color={colors.orange} />
      )}

      {messages.length > 0 && (
        <details style={{ marginTop: 4 }}>
          <summary style={{ cursor: "pointer", fontSize: 12, fontWeight: 700, color: colors.cyan }}>
            <Star size={12} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} />
            Vedi trascrizione ({messages.length} turni)
          </summary>
          <div
            style={{
              marginTop: 10,
              padding: 12,
              borderRadius: radius.sm,
              background: colors.bg,
              maxHeight: 300,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            {messages.map((m, i) => (
              <div key={i} style={{ fontSize: 13, lineHeight: 1.5 }}>
                <span
                  style={{
                    fontWeight: 900,
                    color: m.role === "prof" ? colors.green : colors.purple,
                    marginRight: 8,
                  }}
                >
                  {m.role === "prof" ? "Prof:" : "Tu:"}
                </span>
                <span style={{ color: colors.textSub }}>{m.text}</span>
              </div>
            ))}
          </div>
        </details>
      )}

      <button onClick={reset} style={secondaryBtn()}>
        <RefreshCw size={14} /> Nuova interrogazione
      </button>
    </section>
  );
}

// ─── Small helpers ─────────────────────────────────────────────
function ModePill({
  active,
  onClick,
  icon,
  title,
  subtitle,
  color,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  color: string;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        display: "flex",
        gap: 10,
        alignItems: "center",
        padding: "12px 14px",
        borderRadius: radius.md,
        background: active ? `${color}18` : colors.bgGlass,
        border: `1px solid ${active ? color : colors.border}`,
        color: active ? "#fff" : colors.textSub,
        fontWeight: 800,
        fontSize: 13,
        cursor: "pointer",
        textAlign: "left",
      }}
    >
      <span style={{ color: active ? color : colors.textMuted, flexShrink: 0 }}>{icon}</span>
      <span style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1, minWidth: 0 }}>
        <span>{title}</span>
        <span style={{ fontSize: 11, fontWeight: 600, color: colors.textMuted }}>{subtitle}</span>
      </span>
      {active && <ChevronRight size={14} color={color} />}
    </button>
  );
}

function ScopeRow({
  active,
  onClick,
  title,
  subtitle,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  subtitle: string;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        gap: 10,
        alignItems: "center",
        padding: "10px 12px",
        borderRadius: radius.md,
        background: active ? `${colors.pink}15` : colors.bgGlass,
        border: `1px solid ${active ? colors.pink : colors.border}`,
        color: active ? "#fff" : colors.textSub,
        fontWeight: 700,
        fontSize: 13,
        cursor: "pointer",
        textAlign: "left",
      }}
    >
      <BookOpen size={16} color={active ? colors.pink : colors.textMuted} style={{ flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div>{title}</div>
        <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>{subtitle}</div>
      </div>
      {active && (
        <div style={{ color: colors.pink, fontWeight: 900 }}>✓</div>
      )}
    </button>
  );
}

function ChipList({ label, items, color }: { label: string; items: string[]; color: string }) {
  return (
    <div>
      <div
        style={{
          fontSize: 10,
          fontWeight: 900,
          letterSpacing: 0.8,
          color: colors.textMuted,
          textTransform: "uppercase",
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {items.map((it, i) => (
          <span
            key={i}
            style={{
              fontSize: 12,
              padding: "3px 10px",
              borderRadius: 999,
              background: `${color}15`,
              border: `1px solid ${color}55`,
              color,
              fontWeight: 700,
            }}
          >
            {it}
          </span>
        ))}
      </div>
    </div>
  );
}

function FieldLabel({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span
        style={{
          fontSize: 11,
          fontWeight: 800,
          color: colors.textMuted,
          textTransform: "uppercase",
          letterSpacing: 0.8,
        }}
      >
        {label}
      </span>
      {children}
    </label>
  );
}

function cardStyle(extra: React.CSSProperties = {}): React.CSSProperties {
  return {
    padding: 18,
    borderRadius: radius.lg,
    background: colors.bgGlass,
    border: `1px solid ${colors.border}`,
    display: "flex",
    flexDirection: "column",
    gap: 14,
    ...extra,
  };
}
function txtInput(error = false): React.CSSProperties {
  return {
    height: 42,
    padding: "0 14px",
    borderRadius: radius.md,
    background: colors.bgGlass,
    border: `1px solid ${error ? colors.red : colors.border}`,
    color: colors.textPrimary,
    fontSize: 14,
    outline: "none",
    fontFamily: "inherit",
  };
}
function primaryBtn(disabled: boolean): React.CSSProperties {
  return {
    padding: "12px 18px",
    borderRadius: radius.md,
    background: disabled ? colors.bgGlass : `linear-gradient(135deg, ${colors.green} 0%, ${colors.cyan} 100%)`,
    border: "none",
    color: disabled ? colors.textMuted : "#fff",
    fontWeight: 800,
    fontSize: 14,
    cursor: disabled ? "not-allowed" : "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  };
}
function secondaryBtn(color?: string): React.CSSProperties {
  return {
    padding: "10px 14px",
    borderRadius: radius.md,
    background: color ? `${color}18` : colors.bgGlass,
    border: `1px solid ${color ? color : colors.border}`,
    color: color ? color : colors.textSub,
    fontWeight: 700,
    fontSize: 12,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 6,
  };
}
function mutedRow(): React.CSSProperties {
  return {
    display: "flex",
    gap: 8,
    alignItems: "center",
    padding: "10px 12px",
    borderRadius: radius.md,
    background: colors.bgGlass,
    border: `1px dashed ${colors.border}`,
    color: colors.textMuted,
    fontSize: 12,
  };
}
function ErrorBox({ msg }: { msg: string }) {
  return (
    <div
      style={{
        padding: 10,
        borderRadius: radius.sm,
        background: `${colors.red}15`,
        border: `1px solid ${colors.red}55`,
        color: colors.red,
        fontSize: 12,
        fontWeight: 700,
      }}
    >
      {msg}
    </div>
  );
}
