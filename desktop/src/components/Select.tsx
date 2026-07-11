import { useEffect, useRef, useState } from "react";
import { ChevronDown, Check } from "lucide-react";
import { colors, radius } from "../theme";

/**
 * Select custom cross-platform: sostituisce il native <select> che su Windows
 * mostra la lista opzioni con background bianco (non rispetta `color-scheme:
 * dark` per il popup OS-native). Rende un menu completamente stilato in dark
 * theme, coerente col resto dell'app.
 *
 * API compatibile con la struttura native:
 *   <Select
 *     value={subject}
 *     onChange={setSubject}
 *     options={[{ value: "math", label: "Matematica" }, ...]}
 *     placeholder="— Seleziona —"
 *   />
 */
export type SelectOption = { value: string; label: string; disabled?: boolean };

export function Select({
  value,
  onChange,
  options,
  placeholder = "— Seleziona —",
  style,
  disabled = false,
}: {
  value: string;
  onChange: (v: string) => void;
  options: SelectOption[];
  placeholder?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [drop, setDrop] = useState<"down" | "up">("down");
  const wrapRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  const current = options.find((o) => o.value === value);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) {
      document.addEventListener("mousedown", onDoc);
      document.addEventListener("keydown", onEsc);
      // Decide drop direction: se lo spazio sotto è insufficiente, apri in alto
      if (btnRef.current) {
        const r = btnRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - r.bottom;
        const spaceAbove = r.top;
        const est = Math.min(240, options.length * 38 + 12);
        setDrop(spaceBelow < est && spaceAbove > est ? "up" : "down");
      }
    }
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open, options.length]);

  return (
    <div ref={wrapRef} style={{ position: "relative", width: "100%" }}>
      <button
        ref={btnRef}
        type="button"
        onClick={() => !disabled && setOpen((v) => !v)}
        disabled={disabled}
        style={{
          width: "100%",
          height: 42,
          padding: "0 14px",
          paddingRight: 36,
          borderRadius: radius.md,
          background: colors.bgGlass,
          border: `1px solid ${open ? colors.borderStrong : colors.border}`,
          color: current ? colors.textPrimary : colors.textMuted,
          fontSize: 14,
          fontWeight: 600,
          textAlign: "left",
          display: "flex",
          alignItems: "center",
          cursor: disabled ? "not-allowed" : "pointer",
          transition: "border-color 120ms ease",
          fontFamily: "inherit",
          ...style,
        }}
      >
        <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {current ? current.label : placeholder}
        </span>
        <ChevronDown
          size={14}
          color={colors.textMuted}
          style={{
            position: "absolute",
            right: 12,
            top: "50%",
            transform: `translateY(-50%) rotate(${open ? 180 : 0}deg)`,
            transition: "transform 150ms ease",
            pointerEvents: "none",
          }}
        />
      </button>

      {open && (
        <div
          role="listbox"
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            ...(drop === "down" ? { top: "calc(100% + 6px)" } : { bottom: "calc(100% + 6px)" }),
            background: colors.bgElevated,
            border: `1px solid ${colors.borderStrong}`,
            borderRadius: radius.md,
            boxShadow: "0 12px 40px rgba(0,0,0,0.6)",
            zIndex: 10001,
            padding: 6,
            maxHeight: 240,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          {options.length === 0 ? (
            <div style={{ padding: "10px 12px", color: colors.textMuted, fontSize: 13 }}>
              Nessuna opzione disponibile
            </div>
          ) : (
            options.map((o) => {
              const selected = o.value === value;
              return (
                <button
                  key={o.value}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => {
                    if (o.disabled) return;
                    onChange(o.value);
                    setOpen(false);
                  }}
                  disabled={o.disabled}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                    padding: "9px 12px",
                    borderRadius: radius.sm,
                    background: selected ? `${colors.purple}22` : "transparent",
                    border: `1px solid ${selected ? `${colors.purple}55` : "transparent"}`,
                    color: o.disabled ? colors.textMuted : selected ? "#fff" : colors.textSub,
                    fontSize: 13,
                    fontWeight: selected ? 800 : 600,
                    textAlign: "left",
                    cursor: o.disabled ? "not-allowed" : "pointer",
                    transition: "background 100ms ease",
                  }}
                  onMouseEnter={(e) => {
                    if (o.disabled || selected) return;
                    e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                  }}
                  onMouseLeave={(e) => {
                    if (o.disabled || selected) return;
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {o.label}
                  </span>
                  {selected && <Check size={14} color={colors.purple} />}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
