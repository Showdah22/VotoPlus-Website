// Voto+ Desktop \u00b7 React Island per download automatico installer.
//
// Strategia:
//   1. Astro pre-fetcha al build time l'ultima release GitHub (vedi
//      download.astro) e la passa come prop `initialRelease`. Cos\u00ec la pagina
//      renderizzata ha SEMPRE link funzionanti anche senza JavaScript.
//   2. Al mount, React Island:
//      - rileva OS (Windows/macOS/Linux)
//      - ri-fetcha l'API GitHub per catturare eventuali release pi\u00f9 recenti
//        (rilasciate dopo l'ultimo build del sito ma prima del rebuild)
//      - se il fetch fallisce, MANTIENE i dati dal build (no fallback rotto)
//
// Naming asset electron-builder:
//   - Windows: VotoPlus-Setup-{ver}.exe
//   - macOS:   VotoPlus-{ver}.dmg
//   - Linux:   (nessuno per ora, non generato)
import { useEffect, useState } from "react";

type OS = "windows" | "macos" | "linux" | "unknown";

export type ReleaseAsset = {
  name: string;
  browser_download_url: string;
  size: number;
};

export type Release = {
  tag_name: string;
  name?: string;
  published_at: string;
  assets: ReleaseAsset[];
};

const API_URL = "https://api.github.com/repos/Showdah22/VotoPlus-Website/releases?per_page=10";

function detectOS(): OS {
  if (typeof navigator === "undefined") return "unknown";
  const p = navigator.platform || "";
  const ua = navigator.userAgent || "";
  if (/Win/i.test(p) || /Windows/i.test(ua)) return "windows";
  if (/Mac/i.test(p) || /Macintosh/i.test(ua)) return "macos";
  if (/Linux/i.test(p) || /X11/i.test(ua)) return "linux";
  return "unknown";
}

function findAsset(release: Release, os: OS): ReleaseAsset | null {
  const isMatch = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.endsWith(".blockmap") || lower.endsWith(".yml")) return false;
    if (os === "windows") return lower.endsWith(".exe") || lower.endsWith(".msi");
    if (os === "macos") return lower.endsWith(".dmg");
    if (os === "linux") return lower.endsWith(".appimage") || lower.endsWith(".deb");
    return false;
  };
  return release.assets.find((a) => isMatch(a.name)) || null;
}

function formatBytes(bytes: number): string {
  if (!bytes) return "";
  const mb = bytes / (1024 * 1024);
  return mb >= 100 ? `${mb.toFixed(0)} MB` : `${mb.toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("it-IT", { day: "2-digit", month: "long", year: "numeric" });
  } catch {
    return "";
  }
}

type Props = {
  initialRelease: Release | null;
};

export default function DesktopDownloadButton({ initialRelease }: Props) {
  const [os, setOs] = useState<OS>("unknown");
  const [release, setRelease] = useState<Release | null>(initialRelease);

  useEffect(() => {
    const currentOs = detectOS();
    setOs(currentOs);

    (async () => {
      try {
        const res = await fetch(API_URL, { headers: { Accept: "application/vnd.github+json" } });
        if (!res.ok) return; // Mantieni initialRelease
        const data: Release[] = await res.json();
        // Prendi la prima release valida con assets (ignora bozze / prerelease vuote).
        const latest = data.find((r) => (r.assets || []).length > 2) || data[0];
        if (latest) setRelease(latest);
      } catch {
        /* Silenzioso, restiamo su initialRelease */
      }
    })();
  }, []);

  const osLabel =
    os === "windows"
      ? "Windows"
      : os === "macos"
      ? "macOS"
      : os === "linux"
      ? "Linux"
      : "il tuo dispositivo";

  if (!release) {
    // Situazione impossibile in pratica (build sempre pre-fetcha), ma safe fallback.
    return (
      <a className="btn-mega" href="/download">
        <span className="btn-mega-title">Ricarica la pagina</span>
        <span className="btn-mega-sub">Impossibile leggere le release al momento</span>
      </a>
    );
  }

  const mainAsset = findAsset(release, os);
  const winAsset = findAsset(release, "windows");
  const macAsset = findAsset(release, "macos");

  // Se il main asset non c'\u00e8 (Linux o OS sconosciuto), fallback a Windows
  // (l'utente probabilmente sta usando browser desktop generico).
  const effective = mainAsset || winAsset || macAsset;
  const effectiveLabel = mainAsset ? osLabel : winAsset ? "Windows" : macAsset ? "macOS" : "desktop";
  const versionClean = release.tag_name.replace(/^v-?desktop-?/, "").replace(/^v/, "");

  return (
    <div className="desktop-cta">
      {effective ? (
        <a className="btn-mega" href={effective.browser_download_url} download>
          <span className="btn-mega-title">Scarica per {effectiveLabel}</span>
          <span className="btn-mega-sub">
            v{versionClean} \u00b7 {formatBytes(effective.size)}
          </span>
        </a>
      ) : null}

      <p className="cta-meta">
        Ultima versione: <strong>v{versionClean}</strong>
        {release.published_at ? ` \u2022 rilasciata il ${formatDate(release.published_at)}` : ""}
      </p>

      <div className="cta-alt">
        {os !== "windows" && winAsset && (
          <a href={winAsset.browser_download_url} download>
            Scarica per Windows ({formatBytes(winAsset.size)})
          </a>
        )}
        {os !== "macos" && macAsset && (
          <a href={macAsset.browser_download_url} download>
            Scarica per macOS ({formatBytes(macAsset.size)})
          </a>
        )}
      </div>
    </div>
  );
}
