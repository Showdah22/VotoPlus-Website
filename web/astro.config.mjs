// Voto+ website · Astro SSG + React Islands
//
// Perchè Astro:
//   - Zero-JS di default → best-in-class SEO, LCP e Core Web Vitals
//   - Islands architecture per interattività locale (React solo dove serve)
//   - Sitemap + RSS integrati e ottimizzazione immagini nativa
//   - MDX per il blog editoriale (non usato inizialmente, articoli DB-driven)
//
// Output: SSG puro (`output: 'static'`) → carichiamo il build in `dist/`
// e lo pubblichiamo via GitHub Pages (workflow deploy-web.yml).

import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: "https://votoplus.it",
  output: "static",
  trailingSlash: "ignore",
  integrations: [
    react(),
    sitemap({
      // Escludiamo pagine amministrative e utility dal sitemap.
      filter: (page) =>
        !page.includes("/admin") &&
        !page.includes("/desktop-login") &&
        !page.includes("/desktop-cancel") &&
        !page.includes("/desktop-success") &&
        !page.includes("/delete-account") &&
        !page.includes("/confirm-deletion"),
      changefreq: "weekly",
      priority: 0.7,
      lastmod: new Date(),
    }),
  ],
  build: {
    // Assets con nome canonico (hash) per max cache-ability.
    assets: "_assets",
  },
  server: {
    host: "0.0.0.0",
    port: 4321,
  },
});
