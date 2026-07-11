# Voto+ Desktop

App companion di Voto+ per **Windows** e **macOS**, costruita con **Electron 32 + Vite + React 18 + TypeScript**.

Condivide lo stesso backend FastAPI del mobile (autenticazione JWT, dashboard, materie, calendario).

**Vive dentro il repo `Showdah22/VotoPlus-Website`** — stesso repo del sito votoplus.it. Gli installer vengono pubblicati automaticamente in **GitHub Releases** dello stesso repo via CI (vedi `DEPLOYMENT.md`).

---

## 🚀 Quick start (sviluppo locale)

### Prerequisiti
- Node.js **20 LTS** o superiore
- npm 10+ (arriva con Node)
- Su Windows: nulla di aggiuntivo
- Su macOS: Xcode Command Line Tools (`xcode-select --install`)

### Installazione e avvio dev

```bash
cd desktop
npm install
npm run dev
```

Si apre automaticamente la finestra Electron con **hot reload** su renderer e main process.

---

## 📦 Build di produzione (locale, solo test)

### Windows (installer NSIS)
```bash
npx electron-builder --win --publish never
```
Output: `release/VotoPlus-Setup-0.1.0.exe`

### macOS (DMG universal)
```bash
npx electron-builder --mac --publish never
```
Output: `release/VotoPlus-0.1.0.dmg`

---

## 🚀 Release ufficiale (automatica via CI)

Vedi **`DEPLOYMENT.md`** per la procedura completa. TL;DR:

```bash
npm version patch --no-git-tag-version
VERSION=$(node -p "require('./package.json').version")
git add package.json && git commit -m "chore(desktop): bump to $VERSION"
git tag "v-desktop-$VERSION"
git push --follow-tags
```

GitHub Actions builda Win + Mac in parallelo (≈ 10 min) e pubblica su Releases.

---

## 🏗️ Architettura

```
desktop/
├── electron/
│   ├── main.ts        # Processo main: BrowserWindow frameless + IPC + updater
│   └── preload.ts     # Bridge sicuro Main ↔ Renderer (contextIsolation)
├── src/
│   ├── main.tsx       # Entry React
│   ├── App.tsx        # HashRouter + shell
│   ├── theme.ts       # Design tokens (colori, radius, gradient)
│   ├── global.css     # Reset + variabili CSS
│   ├── api/client.ts  # Fetch wrapper con Bearer JWT
│   ├── store/auth.ts  # Zustand auth (JWT persistito in localStorage)
│   ├── store/updater.ts
│   ├── components/
│   │   ├── TitleBar.tsx        # Titlebar custom Win frameless
│   │   ├── AppShell.tsx        # Sidebar + Outlet + RightPanel
│   │   ├── Sidebar.tsx
│   │   ├── RightPanel.tsx      # Prossime scadenze
│   │   └── UpdateToast.tsx     # Toast update pronto
│   └── pages/
│       ├── LoginPage.tsx
│       ├── HomePage.tsx        # Dashboard con dati reali dal backend
│       ├── ScannerPage.tsx     # Placeholder (Phase 2)
│       ├── MathPage.tsx        # Placeholder (Phase 2)
│       ├── VotiPage.tsx        # Placeholder (Phase 2)
│       ├── CalendarioPage.tsx  # Placeholder (Phase 2)
│       └── ImpostazioniPage.tsx  # Cerca aggiornamenti + info
├── vite.config.ts
├── package.json
└── .env               # VITE_BACKEND_URL
```

---

## 🔒 Sicurezza

- `contextIsolation: true` + `nodeIntegration: false` → il renderer NON ha accesso a Node.js
- Tutte le API native (window controls, updater) esposte via `preload.ts` con `contextBridge`
- JWT salvato in `localStorage` (per MVP; upgradabile a `electron-store` cifrato in futuro)

---

## 🎨 Design system

Replicato dal mobile (`/app/DESIGN_SYSTEM.md`):
- **Colors**: purple `#a855f7`, cyan `#06b6d4`, glass `rgba(255,255,255,0.04)`
- **Radius**: sm 10, md 16, lg 22, xl 28
- **Typography**: system font stack
- **Style**: glass morphism con blur, gradient viola-blu

---

## 🐛 Troubleshooting

**"npm install" fallisce su Windows** — manca il build tools per node-gyp:
```bash
npm install --global windows-build-tools
```

**Schermata bianca all'avvio** — apri DevTools con `Ctrl+Shift+I` (Win) o `Cmd+Opt+I` (Mac).

**Backend irraggiungibile** — verifica `.env`:
```bash
curl https://votop-maturita.preview.emergentagent.com/api/health
```
