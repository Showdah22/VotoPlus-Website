import { useEffect, useRef, useState } from "react";
import { Mic, Volume2, MicOff, Play, Square, AlertCircle } from "lucide-react";
import { colors, radius } from "../theme";
import { Select } from "./Select";

// Persistiamo le scelte utente in localStorage così sopravvivono ai riavvii.
const KEY_INPUT = "voto:audio:inputDeviceId";
const KEY_OUTPUT = "voto:audio:outputDeviceId";

type DeviceOpt = { value: string; label: string };

/**
 * Sezione impostazioni audio — stile Discord:
 *  - Select "Entrata audio" (microfono)
 *  - Select "Uscita audio" (altoparlanti/cuffie)
 *  - Bottone "Test del microfono" con barra livello in tempo reale
 *  - Se il browser/dispositivo non supporta setSinkId, l'uscita è read-only
 *
 * L'app userà queste preferenze in tutti i flussi audio (Interrogazione
 * orale voce, TTS Dante, ecc.) leggendole via `getPreferredAudioDevices()`.
 */
export function AudioSettings() {
  const [inputs, setInputs] = useState<DeviceOpt[]>([]);
  const [outputs, setOutputs] = useState<DeviceOpt[]>([]);
  const [inputId, setInputId] = useState<string>(() => localStorage.getItem(KEY_INPUT) || "default");
  const [outputId, setOutputId] = useState<string>(() => localStorage.getItem(KEY_OUTPUT) || "default");

  const [permErr, setPermErr] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [level, setLevel] = useState(0); // 0..1

  const streamRef = useRef<MediaStream | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);
  const supportsOutput = typeof (HTMLMediaElement.prototype as any).setSinkId === "function";

  // ============================================================
  // Enumerate devices — richiede almeno un getUserMedia prima per
  // ottenere le label complete (privacy default del browser).
  // ============================================================
  async function loadDevices() {
    try {
      const list = await navigator.mediaDevices.enumerateDevices();
      const ins: DeviceOpt[] = list
        .filter((d) => d.kind === "audioinput")
        .map((d, i) => ({
          value: d.deviceId,
          label: d.label || `Microfono ${i + 1}`,
        }));
      const outs: DeviceOpt[] = list
        .filter((d) => d.kind === "audiooutput")
        .map((d, i) => ({
          value: d.deviceId,
          label: d.label || `Uscita ${i + 1}`,
        }));
      // Aggiungiamo sempre "Predefinito" in cima
      setInputs([{ value: "default", label: "Predefinito di sistema" }, ...ins.filter((i) => i.value !== "default")]);
      setOutputs([{ value: "default", label: "Predefinito di sistema" }, ...outs.filter((o) => o.value !== "default")]);
    } catch (e) {
      console.warn("[audio] enumerateDevices failed", e);
    }
  }

  useEffect(() => {
    loadDevices();
    const onChange = () => loadDevices();
    navigator.mediaDevices?.addEventListener?.("devicechange", onChange);
    return () => {
      navigator.mediaDevices?.removeEventListener?.("devicechange", onChange);
      stopTest(); // cleanup on unmount
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persistenza scelte
  useEffect(() => {
    localStorage.setItem(KEY_INPUT, inputId);
  }, [inputId]);
  useEffect(() => {
    localStorage.setItem(KEY_OUTPUT, outputId);
  }, [outputId]);

  // ============================================================
  // Test microfono — stream + AnalyserNode + RMS live
  // ============================================================
  async function startTest() {
    setPermErr(null);
    stopTest();
    try {
      const constraints: MediaStreamConstraints = {
        audio: inputId === "default" ? true : { deviceId: { exact: inputId } },
        video: false,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      // Se non avevamo label ma ora sì (perché l'utente ha dato permesso),
      // ricarica la lista per mostrare i nomi reali.
      loadDevices();

      const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
      const ctx: AudioContext = new AudioCtx();
      ctxRef.current = ctx;
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.6;
      src.connect(analyser);

      const data = new Uint8Array(analyser.fftSize);
      const loop = () => {
        analyser.getByteTimeDomainData(data);
        // RMS 0..1
        let sum = 0;
        for (let i = 0; i < data.length; i++) {
          const v = (data[i] - 128) / 128;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / data.length);
        // Espansione percettiva per rendere il livello più visibile
        const normalized = Math.min(1, rms * 3);
        setLevel(normalized);
        rafRef.current = requestAnimationFrame(loop);
      };
      loop();
      setTesting(true);
    } catch (e: any) {
      const msg =
        e?.name === "NotAllowedError"
          ? "Permesso microfono negato. Consenti l'accesso nelle impostazioni di sistema o del browser."
          : e?.name === "NotFoundError"
          ? "Nessun microfono trovato su questo dispositivo."
          : e?.message || "Impossibile aprire il microfono.";
      setPermErr(msg);
      setTesting(false);
    }
  }

  function stopTest() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (ctxRef.current) {
      try {
        ctxRef.current.close();
      } catch {}
      ctxRef.current = null;
    }
    setLevel(0);
    setTesting(false);
  }

  // ============================================================
  // Test uscita audio — beep breve sull'uscita selezionata
  // ============================================================
  async function testOutput() {
    try {
      const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
      const ctx: AudioContext = new AudioCtx();
      const dest = ctx.createMediaStreamDestination();
      const osc = ctx.createOscillator();
      osc.frequency.value = 440;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.28, ctx.currentTime + 0.02);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.4);
      osc.connect(gain).connect(dest);
      osc.start();
      osc.stop(ctx.currentTime + 0.42);

      const audio = new Audio();
      audio.srcObject = dest.stream;
      if (supportsOutput && outputId !== "default") {
        try {
          await (audio as any).setSinkId(outputId);
        } catch (e) {
          console.warn("[audio] setSinkId failed", e);
        }
      }
      await audio.play().catch(() => {});
      setTimeout(() => {
        audio.pause();
        try {
          ctx.close();
        } catch {}
      }, 500);
    } catch (e) {
      console.warn("[audio] output test failed", e);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Entrata */}
      <div>
        <FieldLabel icon={<Mic size={12} color={colors.textMuted} />} label="Entrata audio (microfono)" />
        <Select
          value={inputs.some((i) => i.value === inputId) ? inputId : "default"}
          onChange={(v) => {
            setInputId(v);
            if (testing) {
              // riavvia il test con il nuovo device
              stopTest();
              window.setTimeout(startTest, 50);
            }
          }}
          options={inputs.length > 0 ? inputs : [{ value: "default", label: "Predefinito di sistema" }]}
        />
      </div>

      {/* Uscita */}
      <div>
        <FieldLabel icon={<Volume2 size={12} color={colors.textMuted} />} label="Uscita audio (altoparlanti/cuffie)" />
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ flex: 1 }}>
            <Select
              value={outputs.some((o) => o.value === outputId) ? outputId : "default"}
              onChange={setOutputId}
              options={outputs.length > 0 ? outputs : [{ value: "default", label: "Predefinito di sistema" }]}
              disabled={!supportsOutput}
            />
          </div>
          <button
            onClick={testOutput}
            style={{
              padding: "0 14px",
              borderRadius: radius.md,
              background: colors.bgGlass,
              border: `1px solid ${colors.border}`,
              color: colors.textSub,
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              whiteSpace: "nowrap",
              display: "flex",
              alignItems: "center",
              gap: 6,
              height: 42,
            }}
          >
            <Play size={12} /> Test
          </button>
        </div>
        {!supportsOutput && (
          <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 6, fontStyle: "italic" }}>
            La selezione dell'uscita audio non è supportata dal tuo dispositivo — verrà usata l'uscita di sistema.
          </div>
        )}
      </div>

      {/* Mic test — barra livello */}
      <div>
        <FieldLabel
          icon={testing ? <MicOff size={12} color={colors.red} /> : <Mic size={12} color={colors.textMuted} />}
          label="Test del microfono"
        />
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button
            onClick={testing ? stopTest : startTest}
            style={{
              padding: "10px 18px",
              borderRadius: radius.md,
              background: testing ? `${colors.red}22` : `linear-gradient(135deg, ${colors.purple} 0%, ${colors.blue} 100%)`,
              border: testing ? `1px solid ${colors.red}55` : "none",
              color: "#fff",
              fontWeight: 800,
              fontSize: 13,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              flexShrink: 0,
              boxShadow: testing ? "none" : "0 6px 20px rgba(168,85,247,0.35)",
            }}
          >
            {testing ? (
              <><Square size={12} fill="currentColor" /> Stop</>
            ) : (
              <><Mic size={12} /> Test del microfono</>
            )}
          </button>
          <VolumeBars level={level} active={testing} />
        </div>

        {permErr && (
          <div
            style={{
              marginTop: 10,
              padding: 10,
              borderRadius: radius.sm,
              background: `${colors.red}15`,
              border: `1px solid ${colors.red}55`,
              color: colors.red,
              fontSize: 12,
              display: "flex",
              gap: 8,
              alignItems: "flex-start",
            }}
          >
            <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>{permErr}</span>
          </div>
        )}
        {testing && !permErr && (
          <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 6 }}>
            Parla vicino al microfono — dovresti vedere la barra reagire in tempo reale.
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Barra livello stile Discord: N barre verticali, ognuna si accende se il
 * livello attuale supera la sua soglia. Colore graduale verde → giallo → rosso.
 */
function VolumeBars({ level, active }: { level: number; active: boolean }) {
  const N = 40;
  const bars = Array.from({ length: N }, (_, i) => i);
  return (
    <div
      style={{
        flex: 1,
        height: 34,
        display: "flex",
        alignItems: "center",
        gap: 3,
        padding: "0 12px",
        borderRadius: radius.md,
        background: colors.bg,
        border: `1px solid ${colors.border}`,
      }}
    >
      {bars.map((i) => {
        const threshold = (i + 1) / N;
        const on = active && level >= threshold - 0.02;
        // Colore: primi 60% verde, 60-80% giallo, 80-100% rosso
        const c = threshold < 0.6 ? colors.green : threshold < 0.85 ? colors.orange : colors.red;
        return (
          <span
            key={i}
            style={{
              flex: 1,
              height: `${Math.max(30, 30 + threshold * 55)}%`,
              borderRadius: 2,
              background: on ? c : "rgba(255,255,255,0.10)",
              transition: "background 60ms linear",
            }}
          />
        );
      })}
    </div>
  );
}

function FieldLabel({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 6,
      marginBottom: 8,
      fontSize: 11,
      fontWeight: 800,
      color: colors.textMuted,
      textTransform: "uppercase",
      letterSpacing: 0.8,
    }}>
      {icon}
      <span>{label}</span>
    </div>
  );
}

/**
 * Utility esportata per il resto dell'app (Interrogazione orale voce, ecc.):
 * legge le preferenze salvate e restituisce i deviceId che vanno passati a
 * `getUserMedia({ audio: { deviceId } })` e `setSinkId()`.
 */
export function getPreferredAudioDevices() {
  return {
    inputDeviceId: localStorage.getItem(KEY_INPUT) || "default",
    outputDeviceId: localStorage.getItem(KEY_OUTPUT) || "default",
  };
}
