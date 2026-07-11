// Voto+ Desktop — Dynamic download button
// Fetches the latest release from GitHub API and updates the download links
// so the site always points to the newest installer without manual edits.
//
// Repo: Showdah22/VotoPlus-Desktop
// Endpoint: https://api.github.com/repos/{owner}/{repo}/releases/latest
//
// Fallback: if API is rate-limited or offline, we fall back to /releases/latest
// which GitHub auto-redirects to the highest tag.

(function () {
  "use strict";

  var OWNER = "Showdah22";
  var REPO = "VotoPlus-Website";
  var API_URL = "https://api.github.com/repos/" + OWNER + "/" + REPO + "/releases/latest";
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

  function updateButtons(release) {
    if (!release || !release.assets) {
      setFallback();
      return;
    }

    var version = release.tag_name || release.name || "";
    var winAsset = null;
    var macAsset = null;

    for (var i = 0; i < release.assets.length; i++) {
      var a = release.assets[i];
      var n = (a.name || "").toLowerCase();
      if (!winAsset && (n.endsWith(".exe") || n.indexOf("setup") !== -1)) {
        winAsset = a;
      }
      if (!macAsset && n.endsWith(".dmg")) {
        macAsset = a;
      }
    }

    if (winAsset && winBtn) {
      winBtn.setAttribute("href", winAsset.browser_download_url);
      if (winInfo) winInfo.textContent = "Installer .exe · x64 · " + formatBytes(winAsset.size);
      if (winVer && version) winVer.textContent = "Versione " + version;
    } else if (winBtn) {
      winBtn.classList.add("disabled");
      winBtn.textContent = "Non ancora disponibile";
      winBtn.setAttribute("href", "#");
      winBtn.addEventListener("click", function (e) { e.preventDefault(); });
    }

    if (macAsset && macBtn) {
      macBtn.setAttribute("href", macAsset.browser_download_url);
      if (macInfo) macInfo.textContent = "DMG · universal · " + formatBytes(macAsset.size);
      if (macVer && version) macVer.textContent = "Versione " + version;
    } else if (macBtn) {
      macBtn.classList.add("disabled");
      macBtn.textContent = "In arrivo";
      macBtn.setAttribute("href", "#");
      macBtn.addEventListener("click", function (e) { e.preventDefault(); });
    }
  }

  // Fetch latest release
  fetch(API_URL, { headers: { Accept: "application/vnd.github+json" } })
    .then(function (res) {
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res.json();
    })
    .then(updateButtons)
    .catch(function (err) {
      console.warn("[voto+] Latest release fetch failed, using fallback:", err);
      setFallback();
    });
})();
