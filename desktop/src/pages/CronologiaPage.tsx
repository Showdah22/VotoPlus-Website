import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, BookOpen, ChevronRight } from "lucide-react";
import { useAuth } from "../store/auth";
import { api } from "../api/client";
import { colors, radius } from "../theme";

export function CronologiaPage() {
  const token = useAuth((s) => s.token);
  const navigate = useNavigate();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    api
      .studyHistory(token)
      .then((d) => setItems(Array.isArray(d) ? d : []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={iconWrap(colors.purple)}>
          <Clock size={22} color={colors.purple} />
        </div>
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 900, letterSpacing: -0.5 }}>Cronologia</h1>
          <p style={{ margin: "4px 0 0 0", color: colors.textSub, fontSize: 13 }}>Tutti i riassunti generati dall'AI</p>
        </div>
        <div style={{ padding: "6px 14px", borderRadius: 999, background: colors.bgGlass, border: `1px solid ${colors.border}`, fontSize: 12, color: colors.textMuted, fontWeight: 700 }}>
          {items.length}
        </div>
      </div>

      {loading ? (
        <div style={placeholder}>Caricamento cronologia…</div>
      ) : items.length === 0 ? (
        <div style={placeholder}>
          <div style={{ fontWeight: 700, color: colors.textPrimary, marginBottom: 4 }}>Nessuno studio ancora</div>
          <div>Vai in Scannerizza e genera il tuo primo riassunto.</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {items.map((it) => (
            <button
              key={it.id}
              onClick={() => navigate(`/materia/${encodeURIComponent(it.subject || "Generale")}`)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: 16,
                borderRadius: radius.md,
                background: colors.bgGlass,
                border: `1px solid ${colors.border}`,
                textAlign: "left",
              }}
            >
              <div style={{ width: 44, height: 44, borderRadius: 14, background: `${colors.purple}1a`, border: `1px solid ${colors.purple}55`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <BookOpen size={20} color={colors.purple} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 800 }}>{it.title || "Riassunto"}</div>
                <div style={{ fontSize: 12, color: colors.textSub, marginTop: 2 }}>
                  {it.subject || "Generale"}
                  {it.created_at ? ` · ${formatDate(it.created_at)}` : ""}
                </div>
              </div>
              <ChevronRight size={16} color={colors.textMuted} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("it-IT", { day: "numeric", month: "short" });
  } catch { return ""; }
}
function iconWrap(c: string): React.CSSProperties {
  return { width: 44, height: 44, borderRadius: 14, background: `${c}1a`, border: `1px solid ${c}55`, display: "flex", alignItems: "center", justifyContent: "center" };
}
const placeholder: React.CSSProperties = {
  padding: 24, borderRadius: radius.md,
  background: colors.bgGlass, border: `1px dashed ${colors.border}`,
  color: colors.textMuted, fontSize: 13, textAlign: "center",
};
