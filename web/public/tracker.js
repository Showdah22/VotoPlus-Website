// Voto+ website · custom pageview tracker (privacy-first, no cookies, no PII).
//
// Chiamato in <head> di ogni pagina Astro. Genera un session_id anonimo
// (memoria: sessionStorage) e invia una pageview beacon al backend a ogni
// caricamento pagina. Beacon = fire-and-forget, non blocca il rendering.
//
// PRIVACY:
//   - Nessun cookie
//   - session_id è solo un token random locale (non trackabile cross-site)
//   - Nessun raccolto di IP, user-agent → tutto anonimizzato server-side
//   - Backend hasha IP + rispetta TTL 180gg

(function () {
  "use strict";
  try {
    var API_BASE = window.__VOTOPLUS_API_BASE__ || "https://votop-maturita.emergent.host/api";

    // Skip localhost dev + bot user agents
    if (location.hostname === "localhost" || location.hostname === "127.0.0.1") return;
    var ua = navigator.userAgent || "";
    if (/bot|crawler|spider/i.test(ua)) return;

    // Session ID anonimo (persiste per la durata della sessione browser)
    var sessionId = sessionStorage.getItem("vp_sid");
    if (!sessionId) {
      sessionId = Math.random().toString(36).slice(2) + Date.now().toString(36);
      sessionStorage.setItem("vp_sid", sessionId);
    }

    var payload = JSON.stringify({
      path: location.pathname + location.search,
      referrer: document.referrer || "",
      screen_width: window.innerWidth || 0,
      session_id: sessionId,
    });

    // Preferiamo sendBeacon (non blocca l'unload); fallback fetch.
    var url = API_BASE.replace(/\/+$/, "") + "/analytics/track";
    if (navigator.sendBeacon) {
      var blob = new Blob([payload], { type: "application/json" });
      navigator.sendBeacon(url, blob);
    } else {
      fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true,
        credentials: "omit",
      }).catch(function () { /* ignore errors */ });
    }
  } catch (e) {
    // Fail silent: analytics non deve mai rompere la pagina.
  }
})();
