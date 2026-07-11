// ============================================================
// OpenAI Realtime API — WebRTC client per l'interrogazione orale.
//
// Flusso:
//   1. Backend crea sessione effimera (POST /api/oral/realtime/session)
//      → ritorna { client_secret.value, _client_config, ... }
//   2. Client crea RTCPeerConnection + microphone track + data channel
//   3. Client posta SDP offer direttamente a
//      https://api.openai.com/v1/realtime/calls con il token effimero
//   4. Peer-to-peer audio bidirezionale + eventi via data channel
// ============================================================

export type RealtimeMessage = {
  role: "prof" | "you";
  text: string;
};

export type RealtimeSessionParams = {
  subject: string;
  severity: string;
  topic: string;
  voice: string;
  mode: "domande" | "esposizione";
  duration_min: number;
  language_mode?: "immersione" | "misto" | "italiano";
  material_ids?: string[];
};

export type RealtimeCallbacks = {
  onConnected?: () => void;
  onTranscript?: (m: RealtimeMessage) => void;
  onProfSpeakingChange?: (speaking: boolean) => void;
  onEndSession?: (data: {
    grade?: number;
    grade_label?: string;
    summary?: string;
    strengths?: string[];
    weaknesses?: string[];
  }) => void;
  onError?: (message: string) => void;
};

export type RealtimeConfig = {
  attemptId: string;
  voice: string;
  model: string;
};

// Frasi ricorrenti Whisper (allucinazioni) — filtriamo anche client-side
// perché il transcript del Realtime arriva via data channel indipendente.
const WHISPER_HALLUCINATIONS = [
  "sottotitoli creati dalla comunità amara.org",
  "sottotitoli e revisione a cura di",
  "sottotitoli a cura di",
  "grazie per aver guardato",
  "grazie per l'attenzione",
  "iscriviti al canale",
  "iscrivetevi al canale",
  "clicca sulla campanella",
  "sottotitoli in italiano",
  "sottotitoli italiani",
  "thanks for watching",
  "subtitles by",
];

function isWhisperHallucination(text: string): boolean {
  if (!text) return false;
  const t = text.toLowerCase().trim().replace(/[.!? \t\n\r]+$/g, "");
  if (!t || t.length > 90) return false;
  return WHISPER_HALLUCINATIONS.some((h) => t.includes(h));
}

export class OralRealtimeClient {
  private pc: RTCPeerConnection | null = null;
  private dc: RTCDataChannel | null = null;
  private stream: MediaStream | null = null;
  private audioEl: HTMLAudioElement | null = null;
  private cbs: RealtimeCallbacks;
  private config: RealtimeConfig | null = null;
  private profSpeaking = false;
  // Buffer per la trascrizione utente (arriva in delta successivi)
  private userTranscriptBuf: Record<string, string> = {};
  // Buffer per la risposta prof (transcription del suo audio)
  private profTranscriptBuf: Record<string, string> = {};

  constructor(callbacks: RealtimeCallbacks = {}) {
    this.cbs = callbacks;
  }

  get isConnected(): boolean {
    return this.pc?.connectionState === "connected";
  }

  get attemptId(): string | null {
    return this.config?.attemptId ?? null;
  }

  async start(
    params: RealtimeSessionParams,
    token: string,
    apiBaseUrl: string,
    preferredMicId?: string,
    preferredOutputId?: string,
  ): Promise<RealtimeConfig> {
    // 1) Sessione effimera dal backend
    const sessionRes = await fetch(`${apiBaseUrl}/api/oral/realtime/session`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(params),
    });

    if (!sessionRes.ok) {
      let detail = `HTTP ${sessionRes.status}`;
      try {
        const j = await sessionRes.json();
        detail = j?.detail || detail;
      } catch {}
      // Propago con status per gestione Premium a valle
      const err: any = new Error(detail);
      err.status = sessionRes.status;
      throw err;
    }

    const sessionData = await sessionRes.json();
    const ephemeralKey =
      sessionData?.value ||
      sessionData?.client_secret?.value ||
      sessionData?.client_secret;
    if (!ephemeralKey) {
      throw new Error("Sessione Realtime non valida (token mancante)");
    }
    const cfg = sessionData._client_config || {};
    const model = cfg.model || "gpt-realtime";

    this.config = {
      attemptId: cfg.attempt_id,
      voice: cfg.voice || params.voice,
      model,
    };

    // 2) PeerConnection + microphone + data channel
    this.pc = new RTCPeerConnection();

    this.audioEl = document.createElement("audio");
    this.audioEl.autoplay = true;
    // sinkId support (Chrome/Edge) per usare lo speaker preferito.
    if (preferredOutputId && preferredOutputId !== "default") {
      const anyEl = this.audioEl as any;
      if (typeof anyEl.setSinkId === "function") {
        try {
          await anyEl.setSinkId(preferredOutputId);
        } catch (e) {
          console.warn("[realtime] setSinkId failed", e);
        }
      }
    }
    this.pc.ontrack = (ev) => {
      if (this.audioEl) this.audioEl.srcObject = ev.streams[0];
    };

    // Microfono
    const constraints: MediaStreamConstraints = {
      audio:
        preferredMicId && preferredMicId !== "default"
          ? { deviceId: { exact: preferredMicId }, echoCancellation: true, noiseSuppression: true }
          : { echoCancellation: true, noiseSuppression: true },
    };
    this.stream = await navigator.mediaDevices.getUserMedia(constraints);
    this.stream.getTracks().forEach((t) => this.pc!.addTrack(t, this.stream!));

    // Data channel per eventi
    this.dc = this.pc.createDataChannel("oai-events");
    this.dc.addEventListener("open", () => {
      this.cbs.onConnected?.();
    });
    this.dc.addEventListener("message", (ev) => this.handleEvent(ev.data));

    // 3) SDP offer verso OpenAI (chiamata diretta con l'ephemeral token)
    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);

    const sdpRes = await fetch(
      `https://api.openai.com/v1/realtime/calls?model=${encodeURIComponent(model)}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${ephemeralKey}`,
          "Content-Type": "application/sdp",
        },
        body: offer.sdp || "",
      },
    );
    if (!sdpRes.ok) {
      const t = await sdpRes.text().catch(() => "");
      throw new Error(`OpenAI SDP: ${t.slice(0, 200) || sdpRes.status}`);
    }
    const answerSdp = await sdpRes.text();
    await this.pc.setRemoteDescription({ type: "answer", sdp: answerSdp });

    return this.config;
  }

  /** Cancella la sessione (chiude peer connection + microphone). */
  stop() {
    try {
      if (this.dc) {
        this.dc.close();
        this.dc = null;
      }
    } catch {}
    try {
      if (this.pc) {
        this.pc.getSenders().forEach((s) => {
          try { s.track?.stop(); } catch {}
        });
        this.pc.close();
        this.pc = null;
      }
    } catch {}
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }
    if (this.audioEl) {
      try { this.audioEl.pause(); } catch {}
      this.audioEl.srcObject = null;
      this.audioEl = null;
    }
  }

  /** Silenzia/riattiva il microfono (mute toggle). */
  setMicMuted(muted: boolean) {
    if (!this.stream) return;
    this.stream.getAudioTracks().forEach((t) => (t.enabled = !muted));
  }

  /** Ferma solo l'audio in output (interrompi la voce del prof). */
  stopOutput() {
    if (this.audioEl) {
      try { this.audioEl.pause(); } catch {}
    }
    this.setProfSpeaking(false);
  }

  // -----------------------------------------------------------
  // Event handling — parsing eventi Realtime API
  // -----------------------------------------------------------
  private setProfSpeaking(v: boolean) {
    if (this.profSpeaking !== v) {
      this.profSpeaking = v;
      this.cbs.onProfSpeakingChange?.(v);
    }
  }

  private handleEvent(raw: any) {
    let ev: any = null;
    try {
      ev = typeof raw === "string" ? JSON.parse(raw) : raw;
    } catch {
      return;
    }
    if (!ev || !ev.type) return;

    // Debug logging (silenzioso in produzione)
    if (import.meta.env.DEV) console.debug("[realtime]", ev.type, ev);

    switch (ev.type) {
      // ============ AUDIO OUTPUT (prof parla) ============
      case "response.audio.delta":
      case "response.output_audio.delta":
        this.setProfSpeaking(true);
        break;
      case "response.audio.done":
      case "response.output_audio.done":
      case "response.done":
        this.setProfSpeaking(false);
        break;

      // ============ TRASCRIZIONE AUDIO PROF ============
      case "response.audio_transcript.delta":
      case "response.output_audio_transcript.delta": {
        const id = ev.response_id || ev.item_id || "prof-current";
        this.profTranscriptBuf[id] = (this.profTranscriptBuf[id] || "") + (ev.delta || "");
        break;
      }
      case "response.audio_transcript.done":
      case "response.output_audio_transcript.done": {
        const id = ev.response_id || ev.item_id || "prof-current";
        const text = (ev.transcript || this.profTranscriptBuf[id] || "").trim();
        delete this.profTranscriptBuf[id];
        if (text) {
          this.cbs.onTranscript?.({ role: "prof", text });
        }
        break;
      }

      // ============ TRASCRIZIONE AUDIO UTENTE ============
      case "conversation.item.input_audio_transcription.delta": {
        const id = ev.item_id || "user-current";
        this.userTranscriptBuf[id] = (this.userTranscriptBuf[id] || "") + (ev.delta || "");
        break;
      }
      case "conversation.item.input_audio_transcription.completed": {
        const id = ev.item_id || "user-current";
        const text = (ev.transcript || this.userTranscriptBuf[id] || "").trim();
        delete this.userTranscriptBuf[id];
        if (text && !isWhisperHallucination(text)) {
          this.cbs.onTranscript?.({ role: "you", text });
        }
        break;
      }

      // ============ TOOL CALL: end_session ============
      case "response.function_call_arguments.done":
      case "response.output_item.done": {
        // Cerca la function call end_session
        const item = ev.item || ev;
        const name = item?.name || ev.name;
        if (name === "end_session") {
          let args: any = {};
          try {
            const argsStr = ev.arguments || item?.arguments || "{}";
            args = typeof argsStr === "string" ? JSON.parse(argsStr) : argsStr;
          } catch {}
          this.cbs.onEndSession?.(args);
        }
        break;
      }

      case "error": {
        const msg =
          ev?.error?.message || ev?.message || "Errore Realtime";
        this.cbs.onError?.(String(msg));
        break;
      }

      default:
        break;
    }
  }
}
