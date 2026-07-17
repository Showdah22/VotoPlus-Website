// Voto+ Desktop · React Island client-side per detect OS + fetch ultima release GitHub.
//
// Uso:
//   <DesktopDownloadButton client:load />
//
// Comportamento:
//   1. Rileva OS al mount (Windows / macOS / Linux)
//   2. Fetch GET https://api.github.com/repos/Showdah22/VotoPlus-Website/releases?per_page=10
//   3. Cerca il primo release con asset .exe (Windows) o .dmg (macOS) validi
//   4. Mostra pulsante "Scarica per Windows/macOS" col link diretto all'installer
//   5. Se API GitHub è down o rate-limited, fallback graceful al link /releases
import { useEffect, useState } from "react";

type OS = "windows" | "macos" | "linux" | "unknown";

type ReleaseAsset = {
  name: string;
  browser_download_url: string;
  size: number;
};

type Release = {
  tag_name: string;
  name: string;
  published_at: string;
  assets: ReleaseAsset[];
};

const API_URL = "https://api.github.com/repos/Showdah22/VotoPlus-Website/releases?per_page=10";
const RELEASES_URL = "https://github.com/Showdah22/VotoPlus-Website/releases";

function detectOS(): OS {
  if (typeof navigator === "undefined") return "unknown";
  const p = navigator.platform || "";
  const ua = navigator.userAgent || "";
  if (/Win/i.test(p) || /Windows/i.test(ua)) return "windows";
  if (/Mac/i.test(p) || /Macintosh/i.test(ua)) return "macos";
  if (/Linux/i.test(p) || /X11/i.test(ua)) return "linux";
  return "unknown";
}

function findAsset(releases: Release[], os: OS): { asset: ReleaseAsset; release: Release } | null {
  const isMatch = (name: string) => {
    const lower = name.toLowerCase();
    if (os === "windows") return lower.endsWith(".exe") || lower.endsWith(".msi");
    if (os === "macos") return lower.endsWith(".dmg");
    if (os === "linux") return lower.endsWith(".appimage") || lower.endsWith(".deb");
    return false;
  };
  for (const r of releases) {
    // Filtra bozze e prerelease escludendo tag che non iniziano con "v-desktop-"
    if (!r.tag_name?.startsWith("v-desktop-")) continue;
    for (const a of r.assets || []) {
      if (isMatch(a.name)) return { asset: a, release: r };
    }
  }
  return null;
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

export default function DesktopDownloadButton() {
  const [os, setOs] = useState<OS>("unknown");
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<{ asset: ReleaseAsset; release: Release } | null>(null);
  const [allReleases, setAllReleases] = useState<Release[]>([]);

  useEffect(() => {
    const currentOs = detectOS();
    setOs(currentOs);

    (async () => {
      try {
        const res = await fetch(API_URL, {
          headers: { Accept: "application/vnd.github+json" },
        });
        if (!res.ok) throw new Error(`GitHub API ${res.status}`);
        const data: Release[] = await res.json();
        setAllReleases(data);
        const found = findAsset(data, currentOs);
        setResult(found);
      } catch (err) {
        console.warn("[desktop-download] GitHub API unavailable:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const osLabel = os === "windows" ? "Windows" : os === "macos" ? "macOS" : os === "linux" ? "Linux" : "il tuo dispositivo";

  // Trova le opzioni per l'altra piattaforma (secondaria)
  const macAsset = findAsset(allReleases, "macos");
  const winAsset = findAsset(allReleases, "windows");

  return (
    <div className="desktop-cta">
      {loading ? (
        <div className="cta-loading">
          <div className="spinner" aria-hidden />
          <p>Sto trovando l'ultima versione per te…</p>
        </div>
      ) : result ? (
        <>
          <a className="btn-mega" href={result.asset.browser_download_url} download>
            <span className="btn-mega-title">Scarica per {osLabel}</span>
            <span className="btn-mega-sub">
              {result.release.tag_name.replace("v-desktop-", "v")} · {formatBytes(result.asset.size)}
            </span>
          </a>
          <p className="cta-meta">
            Ultima versione: <strong>{result.release.tag_name.replace("v-desktop-", "v")}</strong>
            {result.release.published_at ? ` • rilasciata il ${formatDate(result.release.published_at)}` : ""}
          </p>
          <div className="cta-alt">
            {os !== "windows" && winAsset && (
              <a href={winAsset.asset.browser_download_url} download>Scarica per Windows ({formatBytes(winAsset.asset.size)})</a>
            )}
            {os !== "macos" && macAsset && (
              <a href={macAsset.asset.browser_download_url} download>Scarica per macOS ({formatBytes(macAsset.asset.size)})</a>
            )}
            <a href={RELEASES_URL} target="_blank" rel="noopener">Tutte le versioni →</a>
          </div>
        </>
      ) : (
        <>
          <a className="btn-mega" href={RELEASES_URL} target="_blank" rel="noopener">
            <span className="btn-mega-title">Vedi tutte le versioni</span>
            <span className="btn-mega-sub">Su GitHub Releases</span>
          </a>
          <p className="cta-meta">
            Non siamo riusciti a rilevare automaticamente il tuo sistema. Scegli manualmente dalla lista.
          </p>
        </>
      )}
    </div>
  );
}
