import { useEffect, useState } from "react";
import { Sparkles, ChevronRight } from "lucide-react";
import { colors, radius } from "../theme";
import { api } from "../api/client";

type Release = {
  version: string;
  date?: string;
  title?: string;
  highlights?: Array<string | { text?: string; title?: string; body?: string; icon?: string }>;
  body?: string;
  emoji?: string;
};

export function NovitaPage() {
  const [releases, setReleases] = useState<Release[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .appChangelog(undefined, "web")
      .then((r) => setReleases(r.releases || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 24 }}>
      <div>
        <div style={{ fontSize: 26, fontWeight: 900, letterSpacing: -0.4 }}>Novità</div>
        <div style={{ fontSize: 13, color: colors.textSub, marginTop: 4 }}>
          La cronologia completa delle release Voto+ — quello che è stato aggiunto in ogni versione.
        </div>
      </div>

      {loading ? (
        <Placeholder label="Caricamento changelog…" />
      ) : releases.length === 0 ? (
        <Placeholder label="Nessuna release disponibile." />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {releases.map((r, idx) => (
            <ReleaseCard key={r.version || idx} release={r} latest={idx === 0} />
          ))}
        </div>
      )}
    </div>
  );
}

function ReleaseCard({ release, latest }: { release: Release; latest: boolean }) {
  const highlights = (release.highlights || []).map((h) => {
    if (typeof h === "string") return { text: h, icon: "✨" };
    return {
      text: h.text || h.title || h.body || "",
      icon: h.icon || "•",
      title: h.title,
      body: h.body,
    };
  });

  return (
    <article
      style={{
        padding: 20,
        borderRadius: radius.lg,
        background: latest
          ? `linear-gradient(135deg, ${colors.purple}12 0%, ${colors.blue}08 100%)`
          : colors.bgGlass,
        border: `1px solid ${latest ? `${colors.purple}55` : colors.border}`,
      }}
    >
      <header style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: latest ? `${colors.purple}22` : `${colors.textMuted}22`,
            border: `1px solid ${latest ? colors.purple : colors.textMuted}55`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 18,
          }}
        >
          {release.emoji || "🚀"}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 18, fontWeight: 900 }}>v{release.version}</span>
            {latest && (
              <span style={{
                fontSize: 10,
                fontWeight: 900,
                letterSpacing: 0.8,
                color: colors.purple,
                background: `${colors.purple}22`,
                border: `1px solid ${colors.purple}55`,
                padding: "2px 8px",
                borderRadius: 999,
                textTransform: "uppercase",
              }}>ULTIMA</span>
            )}
          </div>
          {(release.title || release.date) && (
            <div style={{ fontSize: 12, color: colors.textSub, marginTop: 2 }}>
              {release.title}
              {release.title && release.date && " · "}
              {release.date}
            </div>
          )}
        </div>
      </header>

      {release.body && (
        <p style={{ margin: "0 0 12px 0", fontSize: 13, color: colors.textSub, lineHeight: 1.6 }}>{release.body}</p>
      )}

      {highlights.length > 0 && (
        <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
          {highlights.map((h, i) => (
            <li key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <span style={{ fontSize: 16, flexShrink: 0, marginTop: -1 }}>{h.icon}</span>
              <div style={{ fontSize: 13, color: colors.textPrimary, lineHeight: 1.5 }}>
                {h.title && <strong style={{ fontWeight: 800 }}>{h.title}</strong>}
                {h.title && (h.body || h.text) && " — "}
                <span style={{ color: colors.textSub }}>{h.body || h.text}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

function Placeholder({ label }: { label: string }) {
  return (
    <div style={{
      padding: 30,
      borderRadius: radius.md,
      background: colors.bgGlass,
      border: `1px dashed ${colors.border}`,
      color: colors.textSub,
      fontSize: 13,
      textAlign: "center",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 10,
    }}>
      <Sparkles size={22} color={colors.textMuted} />
      {label}
    </div>
  );
}

// Silenzia lint per icona non usata in questo file (mantenuta per futura riga clicabile).
void ChevronRight;
