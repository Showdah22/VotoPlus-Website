// Voto+ Desktop — Dynamic download button
// Fetches the latest release from GitHub API and updates the download links
// so the site always points to the newest installer without manual edits.
//
// Repo: Showdah22/VotoPlus-Website (single-repo setup: sito + app desktop)
// Endpoint: https://api.github.com/repos/{owner}/{repo}/releases
//
// Robustness:
//  - Iteriamo la lista di release (non solo /latest) così se la release più
//    recente è ancora "in corso" di upload (durante un GitHub Actions workflow)
//    ripieghiamo automaticamente sull'ultima con asset validi per la piattaforma.
//  - Se GitHub API è irraggiungibile (rate-limit / offline) fallback a /releases.

(function () {
  "use strict";

  var OWNER = "Showdah22";
  var REPO = "VotoPlus-Website";
  var API_URL =
    "https://api.github.com/repos/" + OWNER + "/" + REPO + "/releases?per_page=10";
  var RELEASES_URL = "https://github.com/" + OWNER + "/" + REPO + "/releases";

  var winBtn = document.getElementById("dl-win");
  var macBtn = document.getElementById("dl-mac");
  var winInfo = document.getElementById("dl-win-info");
  var macInfo = document.getElementById("dl-mac-info");
  var winVer = document.querySelector('[data-version="win"]');
  var macVer = document.querySelector('[data-version="mac"]');

  function formatBytes(n) {
    if (!n) return "";
    var units = ["B", "KB", "MB", "GB"];
    var i = 0;
    var v = n;
    while (v >= 1024 && i < units.length - 1) {
      v /= 1024;
      i++;
    }
    return v.toFixed(0) + " " + units[i];
  }

  function setFallback() {
    if (winBtn) winBtn.setAttribute("href", RELEASES_URL);
    if (macBtn) macBtn.setAttribute("href", RELEASES_URL);
  }

  // Trova l'ultima release che ha un asset che soddisfa `predicate`.
  // Salta bozze e pre-release. Ritorna { release, asset } o null.
  function findFirstReleaseWithAsset(releases, predicate) {
    if (!Array.isArray(releases)) return null;
    for (var i = 0; i < releases.length; i++) {
      var r = releases[i];
      if (r.draft || r.prerelease) continue;
      var assets = r.assets || [];
      for (var j = 0; j < assets.length; j++) {
        if (predicate(assets[j])) {
          return { release: r, asset: assets[j] };
        }
      }
    }
    return null;
  }

  function isWinAsset(a) {
    var n = (a.name || "").toLowerCase();
    return n.endsWith(".exe") || n.indexOf("setup") !== -1;
  }
  function isMacAsset(a) {
    return (a.name || "").toLowerCase().endsWith(".dmg");
  }

  function updateButtons(releases) {
    var winMatch = findFirstReleaseWithAsset(releases, isWinAsset);
    var macMatch = findFirstReleaseWithAsset(releases, isMacAsset);

    if (winMatch && winBtn) {
      winBtn.setAttribute("href", winMatch.asset.browser_download_url);
      winBtn.setAttribute("download", winMatch.asset.name || "");
      if (winInfo)
        winInfo.textContent =
          "Installer .exe · x64 · " + formatBytes(winMatch.asset.size);
      if (winVer)
        winVer.textContent =
          "Versione " + (winMatch.release.tag_name || winMatch.release.name || "");
      attachSafariSafeDownload(winBtn);
    } else if (winBtn) {
      winBtn.classList.add("disabled");
      winBtn.textContent = "In arrivo";
      winBtn.setAttribute("href", "#");
      winBtn.addEventListener("click", function (e) {
        e.preventDefault();
      });
    }

    if (macMatch && macBtn) {
      macBtn.setAttribute("href", macMatch.asset.browser_download_url);
      macBtn.setAttribute("download", macMatch.asset.name || "");
      if (macInfo)
        macInfo.textContent = "DMG · universal · " + formatBytes(macMatch.asset.size);
      if (macVer)
        macVer.textContent =
          "Versione " + (macMatch.release.tag_name || macMatch.release.name || "");
      attachSafariSafeDownload(macBtn);
    } else if (macBtn) {
      macBtn.classList.add("disabled");
      macBtn.textContent = "In arrivo";
      macBtn.setAttribute("href", "#");
      macBtn.addEventListener("click", function (e) {
        e.preventDefault();
      });
    }
  }

  // Su Safari, i download cross-origin verso release GitHub falliscono
  // perché il primo hop 302 restituisce `Content-Type: text/html` e Safari
  // decide di trattarlo come navigazione HTML invece che come download.
  // Fix: al click, forziamo il download tramite un iframe nascosto.
  // L'iframe carica il DMG URL, riceve `Content-Disposition: attachment`
  // dal S3 finale e triggera il download nativo del browser senza uscire
  // dalla pagina votoplus.it.
  var _dlIframe = null;
  function attachSafariSafeDownload(btn) {
    if (!btn || btn._safariSafe) return;
    btn._safariSafe = true;
    btn.addEventListener("click", function (e) {
      var href = btn.getAttribute("href") || "";
      if (!href || href === "#") return; // guardClick gestirà
      e.preventDefault();
      if (!_dlIframe) {
        _dlIframe = document.createElement("iframe");
        _dlIframe.style.display = "none";
        _dlIframe.setAttribute("aria-hidden", "true");
        _dlIframe.title = "Download frame";
        document.body.appendChild(_dlIframe);
      }
      _dlIframe.src = href;
      // Feedback visuale
      var orig = btn.textContent;
      btn.textContent = "Download in corso…";
      setTimeout(function () {
        btn.textContent = orig;
      }, 3000);
    });
  }

  // Bloccante finché non abbiamo il vero URL: se l'utente clicca prima che
  // download.js abbia risposto (Safari ITP, adblock, connessione lenta),
  // NON deve finire su una pagina GitHub 404 — meglio bloccarlo e mostrare
  // un messaggio di "attendere qualche istante".
  function guardClick(btn) {
    if (!btn) return;
    btn.addEventListener("click", function (e) {
      var href = btn.getAttribute("href") || "";
      if (!href || href === "#" || href.length < 5) {
        e.preventDefault();
        alert("Attendi qualche istante mentre carichiamo il link ufficiale, poi riprova. Se il problema persiste ricarica la pagina.");
      }
    });
  }
  guardClick(winBtn);
  guardClick(macBtn);

  // Imposta lo stato iniziale "Sto controllando…" per feedback visivo
  if (winBtn && winBtn.getAttribute("href") === "#") {
    winBtn.textContent = "Controllo aggiornamenti…";
  }
  if (macBtn && macBtn.getAttribute("href") === "#") {
    macBtn.textContent = "Controllo aggiornamenti…";
  }

  function restoreLabels() {
    if (winBtn) winBtn.textContent = "Scarica per Windows";
    if (macBtn) macBtn.textContent = "Scarica per Mac";
  }

  fetch(API_URL, {
    headers: { Accept: "application/vnd.github+json" },
    // Cache buster: forza sempre refresh, così se una release è appena stata
    // pubblicata l'utente non vede quella vecchia dalla cache HTTP.
    cache: "no-store",
  })
    .then(function (res) {
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res.json();
    })
    .then(function (releases) {
      updateButtons(releases);
      restoreLabels();
    })
    .catch(function (err) {
      console.warn("[voto+] Releases fetch failed, using fallback:", err);
      setFallback();
      restoreLabels();
    });
})();
