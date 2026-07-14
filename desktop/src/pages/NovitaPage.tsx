import { useEffect, useState } from "react";
import {
  Sparkles,
  ChevronRight,
  RefreshCw,
  Headphones,
  Calculator,
  BookOpen,
  Mic,
  PenLine,
  Timer,
  GitBranch,
  Command,
  Trophy,
  ChevronDown,
  Home,
  Download,
  Layers,
  Book,
  Layout,
  Image as ImageIcon,
  Maximize,
  ScanLine,
  BarChart3,
  Calendar,
  Clock,
  Monitor,
  Link as LinkIcon,
  Video,
  FileType2,
  type LucideIcon,
} from "lucide-react";
import { radius } from "../theme";
import { DESKTOP_CHANGELOG, type DesktopRelease, type DesktopHighlight } from "../lib/desktopChangelog";

import { useTheme } from "../lib/theme-provider";
// Mappa icon-string → componente Lucide. Le stringhe le decidiamo noi nel
// file desktopChangelog.ts quindi \u00e8 controllato al 100%.
const ICON_MAP: Record<string, LucideIcon> = {
  sparkles: Sparkles,
  "refresh-cw": RefreshCw,
  headphones: Headphones,
  calculator: Calculator,
  "book-open": BookOpen,
  mic: Mic,
  "pen-line": PenLine,
  timer: Timer,
  "git-branch": GitBranch,
  command: Command,
  trophy: Trophy,
  "chevron-down": ChevronDown,
  home: Home,
  download: Download,
  layers: Layers,
  book: Book,
  layout: Layout,
  image: ImageIcon,
  maximize: Maximize,
  "scan-line": ScanLine,
  "bar-chart-3": BarChart3,
  calendar: Calendar,
  clock: Clock,
  monitor: Monitor,
};

function iconFor(name: string): LucideIcon {
  return ICON_MAP[name] || Sparkles;
}

export function NovitaPage() {
  const { colors } = useTheme();
  const [installed, setInstalled] = useState<string | null>(null);

  useEffect(() => {
    window.voto?.app?.getVersion().then(setInstalled).catch(() => {});
  }, []);

  const releases = DESKTOP_CHANGELOG;

  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 24 }}>
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <div style={{ fontSize: 26, fontWeight: 900, letterSpacing: -0.4 }}>Novità</div>
          <span style={{
            fontSize: 10,
            fontWeight: 900,
            letterSpacing: 0.8,
            color: colors.purple,
            background: `${colors.purple}22`,
            border: `1px solid ${colors.purple}55`,
            padding: "3px 10px",
            borderRadius: 999,
            textTransform: "uppercase",
          }}>Desktop</span>
        </div>
        <div style={{ fontSize: 13, color: colors.textSub }}>
          Cronologia release dell'app desktop — quello che è stato aggiunto in ogni versione.
          {installed && (
            <> Stai usando <strong>v{installed}</strong>.</>
          )}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {releases.map((r, idx) => (
          <ReleaseCard
            key={r.version}
            release={r}
            latest={idx === 0}
            current={installed === r.version}
          />
        ))}
      </div>
    </div>
  );
}

function ReleaseCard({ release, latest, current }: { release: DesktopRelease; latest: boolean; current: boolean }) {
  const { colors } = useTheme();
  const highlight = latest || current;
  return (
    <article
      style={{
        padding: 20,
        borderRadius: radius.lg,
        background: highlight
          ? `linear-gradient(135deg, ${colors.purple}12 0%, ${colors.blue}08 100%)`
          : colors.bgGlass,
        border: `1px solid ${highlight ? `${colors.purple}55` : colors.border}`,
      }}
    >
      <header style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 14,
            background: highlight ? `${colors.purple}22` : `${colors.textMuted}22`,
            border: `1px solid ${highlight ? colors.purple : colors.textMuted}55`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 22,
          }}
        >
          {release.emoji}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 18, fontWeight: 900 }}>v{release.version}</span>
            {latest && <Badge label="ULTIMA" color={colors.purple} />}
            {current && <Badge label="INSTALLATA" color={colors.green} />}
          </div>
          <div style={{ fontSize: 12, color: colors.textSub, marginTop: 2 }}>
            {release.title} · {release.date}
          </div>
        </div>
      </header>

      <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
        {release.highlights.map((h, i) => (
          <HighlightRow key={i} h={h} />
        ))}
      </ul>
    </article>
  );
}

function HighlightRow({ h }: { h: DesktopHighlight }) {
  const { colors } = useTheme();
  const Icon = iconFor(h.icon);
  return (
    <li style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
      <div
        style={{
          width: 30,
          height: 30,
          borderRadius: 10,
          background: `${colors.cyan}15`,
          border: `1px solid ${colors.cyan}44`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          marginTop: 1,
        }}
      >
        <Icon size={14} color={colors.cyan} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13.5, fontWeight: 800, color: colors.textPrimary, marginBottom: 2 }}>{h.title}</div>
        <div style={{ fontSize: 12.5, color: colors.textSub, lineHeight: 1.55 }}>{h.body}</div>
      </div>
    </li>
  );
}

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span style={{
      fontSize: 10,
      fontWeight: 900,
      letterSpacing: 0.8,
      color,
      background: `${color}22`,
      border: `1px solid ${color}55`,
      padding: "2px 8px",
      borderRadius: 999,
      textTransform: "uppercase",
    }}>{label}</span>
  );
}

// Suppress lint warning for icon not used elsewhere
void ChevronRight;
