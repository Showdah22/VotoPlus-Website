import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, ArrowRight } from "lucide-react";
import { colors, radius } from "../theme";
import { useModKey } from "../lib/platform";

type CmdItem = {
  id: string;
  label: string;
  hint?: string;
  route: string;
  keywords?: string[];
  section: string;
};

const COMMANDS: CmdItem[] = [
  { id: "home", label: "Home", hint: "Dashboard principale", route: "/", section: "Navigazione", keywords: ["dashboard"] },
  { id: "scanner", label: "Scannerizza & Riassumi", hint: "Foto/PDF/testo → riassunto AI", route: "/scanner", section: "Studio", keywords: ["scanner", "riassumi", "scan", "summary", "pdf"] },
  { id: "math", label: "Matematica", hint: "Esercizi passo passo", route: "/math", section: "Studio", keywords: ["math", "calcolo", "formula"] },
  { id: "voti", label: "Voti", hint: "Voti e statistiche", route: "/voti", section: "Studio", keywords: ["voti", "grades", "medie"] },
  { id: "calendario", label: "Calendario", hint: "Verifiche, interrogazioni, esami", route: "/calendario", section: "Studio", keywords: ["calendar", "scadenze", "eventi"] },
  { id: "cronologia", label: "Cronologia", hint: "Materiali passati", route: "/cronologia", section: "Studio", keywords: ["history", "materiali"] },
  { id: "orale", label: "Interrogazione", hint: "Allenati all'orale", route: "/orale", section: "Allenamento", keywords: ["oral", "prof", "interrogazione"] },
  { id: "tema", label: "Tema", hint: "Traccia tema/saggio", route: "/tema", section: "Allenamento", keywords: ["essay", "tema", "saggio"] },
  { id: "compito", label: "Compito in classe", hint: "Esercizi cronometrati", route: "/compito", section: "Allenamento", keywords: ["classwork", "esame"] },
  { id: "flashcards", label: "Flashcards", hint: "Ripasso rapido", route: "/flashcards", section: "Allenamento", keywords: ["cards", "ripasso"] },
  { id: "vocabolario", label: "Vocabolario AI", hint: "Significato ed esempi", route: "/vocabolario", section: "Allenamento", keywords: ["dictionary", "parola"] },
  { id: "mindmap", label: "Mappa concettuale", hint: "Genera mappa gerarchica", route: "/mindmap", section: "Allenamento", keywords: ["map", "mind"] },
  { id: "traguardi", label: "Traguardi", hint: "Achievement e progressi", route: "/traguardi", section: "Profilo", keywords: ["badges", "achievement", "trofei"] },
  { id: "novita", label: "Novità", hint: "Cronologia release", route: "/novita", section: "Profilo", keywords: ["changelog", "news"] },
  { id: "impostazioni", label: "Impostazioni", hint: "Account e preferenze", route: "/impostazioni", section: "Profilo", keywords: ["settings", "preferences"] },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [idx, setIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { modSymbol, isMac } = useModKey();

  // Shortcut globale: Cmd/Ctrl + K
  useEffect(() => {
    function handle(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === "Escape" && open) {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, [open]);

  useEffect(() => {
    if (open) {
      setQ("");
      setIdx(0);
      setTimeout(() => inputRef.current?.focus(), 40);
    }
  }, [open]);

  const query = q.trim().toLowerCase();
  const filtered = query
    ? COMMANDS.filter((c) =>
        c.label.toLowerCase().includes(query) ||
        (c.hint || "").toLowerCase().includes(query) ||
        (c.keywords || []).some((k) => k.includes(query)),
      )
    : COMMANDS;

  function go(item: CmdItem) {
    navigate(item.route);
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIdx((i) => Math.min(filtered.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIdx((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const it = filtered[idx];
      if (it) go(it);
    }
  }

  // Raggruppa per sezione
  const grouped: Record<string, CmdItem[]> = {};
  filtered.forEach((c) => {
    if (!grouped[c.section]) grouped[c.section] = [];
    grouped[c.section].push(c);
  });

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed", inset: 0,
        background: "rgba(0,0,0,0.55)",
        zIndex: 20000,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: 100,
        backdropFilter: "blur(6px)",
      }}
      onClick={() => setOpen(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "92%",
          maxWidth: 560,
          background: colors.bgElevated,
          border: `1px solid ${colors.borderStrong}`,
          borderRadius: radius.lg,
          boxShadow: "0 24px 80px rgba(0,0,0,0.7)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 18px", borderBottom: `1px solid ${colors.border}` }}>
          <Search size={16} color={colors.textMuted} />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => { setQ(e.target.value); setIdx(0); }}
            onKeyDown={onKeyDown}
            placeholder="Cerca comando o pagina…"
            style={{
              flex: 1, background: "transparent", border: "none", outline: "none",
              color: colors.textPrimary, fontSize: 15, fontFamily: "inherit",
            }}
          />
          <span style={{
            display: "flex", alignItems: "center", gap: 4,
            padding: "3px 8px", borderRadius: 6,
            background: colors.bg, border: `1px solid ${colors.border}`,
            fontSize: 10, fontWeight: 800, color: colors.textMuted,
          }}>
            {modSymbol}{!isMac && "+"}K
          </span>
        </div>

        <div style={{ maxHeight: "55vh", overflowY: "auto", padding: 8 }}>
          {filtered.length === 0 ? (
            <div style={{ padding: 30, textAlign: "center", color: colors.textMuted, fontSize: 13 }}>
              Nessun comando corrispondente.
            </div>
          ) : (
            Object.keys(grouped).map((section) => (
              <div key={section} style={{ marginBottom: 6 }}>
                <div style={{ fontSize: 10, letterSpacing: 1.2, fontWeight: 900, color: colors.textMuted, textTransform: "uppercase", padding: "8px 10px 4px" }}>{section}</div>
                {grouped[section].map((c) => {
                  const globalIdx = filtered.indexOf(c);
                  const active = globalIdx === idx;
                  return (
                    <button
                      key={c.id}
                      onClick={() => go(c)}
                      onMouseEnter={() => setIdx(globalIdx)}
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        borderRadius: radius.sm,
                        background: active ? `${colors.purple}22` : "transparent",
                        border: `1px solid ${active ? `${colors.purple}55` : "transparent"}`,
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        textAlign: "left",
                        cursor: "pointer",
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 800, color: active ? "#fff" : colors.textPrimary }}>{c.label}</div>
                        {c.hint && (
                          <div style={{ fontSize: 11.5, color: colors.textSub, marginTop: 2 }}>{c.hint}</div>
                        )}
                      </div>
                      {active && <ArrowRight size={14} color={colors.purple} />}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        <div style={{
          borderTop: `1px solid ${colors.border}`,
          padding: "8px 14px",
          display: "flex", alignItems: "center", gap: 14,
          fontSize: 10, color: colors.textMuted, fontWeight: 700,
        }}>
          <Hint keys="↑ ↓" label="naviga" />
          <Hint keys="↵" label="apri" />
          <Hint keys="esc" label="chiudi" />
          <div style={{ flex: 1 }} />
          <span>Voto+ Desktop</span>
        </div>
      </div>
    </div>
  );
}

function Hint({ keys, label }: { keys: string; label: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
      <span style={{
        padding: "2px 6px", borderRadius: 4,
        background: colors.bg,
        border: `1px solid ${colors.border}`,
        fontWeight: 900,
      }}>{keys}</span>
      {label}
    </span>
  );
}
