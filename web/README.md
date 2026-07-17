# Voto+ Website (Astro SSG)

Sito pubblico di Voto+ costruito con **Astro 5** (SSG puro) + **React Islands** dove serve interattività.

## Struttura

```
web/
├── src/
│   ├── layouts/BaseLayout.astro   # <head> SEO condiviso + Nav + Footer
│   ├── components/                # Nav.astro, Footer.astro
│   ├── pages/                     # Route (file-based)
│   │   ├── index.astro            → /
│   │   ├── overview.astro         → /overview
│   │   ├── prezzi.astro           → /prezzi
│   │   └── blog.astro             → /blog (placeholder — sarà dinamico in Fase 2)
│   └── styles/global.css          # Design tokens (viola/pink/cyan)
├── public/                        # File statici copiati as-is
│   ├── favicon.png
│   ├── voto-icon-512.png
│   ├── privacy.html / terms.html / support.html
│   ├── desktop-login.html         # Bridge OAuth Google Desktop
│   ├── desktop-cancel.html
│   ├── desktop-success.html
│   ├── delete-account.html
│   ├── confirm-deletion.html
│   ├── assets/
│   ├── robots.txt                 # Con Sitemap
│   └── CNAME                      # votoplus.it
├── astro.config.mjs
└── package.json
```

## Sviluppo locale

```bash
cd web
yarn install
yarn dev            # dev server su http://localhost:4321
yarn build          # build in web/dist/
yarn preview        # anteprima del build
```

## Deploy

Deploy automatico su GitHub Pages via workflow `.github/workflows/deploy-web.yml`.
Trigger: push su `main` che tocca `web/**`.

**IMPORTANTE**: dopo il primo deploy, in Settings > Pages del repo GitHub bisogna:
1. Impostare **Source** su **GitHub Actions** (non più "Deploy from a branch")
2. Verificare che il dominio custom **votoplus.it** sia configurato (via CNAME file già in `public/`)

## Route generate

- `/` — Home
- `/overview` — Panoramica funzionalità
- `/prezzi` — Piani e prezzi con FAQ
- `/blog` — Placeholder (dinamico in Fase 2)
- `/sitemap-index.xml` — Sitemap auto-generato
- `/robots.txt` — Direttive crawler
- Static preservati: `/privacy.html`, `/terms.html`, `/support.html`, `/desktop-login.html`, `/desktop-cancel.html`, `/desktop-success.html`, `/delete-account.html`, `/confirm-deletion.html`

## Prossime fasi

- **Fase 2**: Backend blog (articles, categories, tags, editorial_config) + API pubbliche
- **Fase 3**: Webhook BabyLoveGrowth (`POST /api/integrations/babylovegrowth/webhook`)
- **Fase 4**: Blog dinamico + admin panel `/admin/*` React
- **Fase 5**: SEO tech avanzato (RSS feed, canonical dinamico, redirect slug)
- **Fase 6**: Test suite completa + documentazione produzione
