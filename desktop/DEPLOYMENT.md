# Voto+ Desktop — Release procedure

Aggiornato: 2026-07-11

Questa cartella `desktop/` vive **dentro** il repo `Showdah22/VotoPlus-Website`. Un unico repo per il sito + l'app desktop:
- Il **sito** (index.html, css, ecc.) sta nella root del repo
- L'**app desktop** (Electron/React) sta in `desktop/`
- Gli **installer prodotti** vanno automaticamente in **GitHub Releases** dello stesso repo (non nei file, per non appesantirlo)
- Il **sito legge le release** via GitHub API e aggiorna dinamicamente il bottone download

---

## 🎯 Come rilasciare una nuova versione desktop (procedura automatica)

```bash
cd desktop

# 1. Bump versione
npm version patch --no-git-tag-version    # 0.1.0 → 0.1.1

# 2. Commit + tag col PREFISSO v-desktop-
# Il prefisso serve perché il repo contiene anche il sito — così la CI parte SOLO per il desktop.
VERSION=$(node -p "require('./package.json').version")
git add package.json
git commit -m "chore(desktop): bump to $VERSION"
git tag "v-desktop-$VERSION"
git push --follow-tags
```

**FINE.** 🎉 In ~10 minuti:
- Installer Windows `.exe` è su `https://github.com/Showdah22/VotoPlus-Website/releases/latest`
- DMG macOS sullo stesso URL
- Il bottone "Scarica" su [votoplus.it](https://voto-plus.app) punta già alla nuova versione (via `download.js` che legge GitHub API in runtime)
- Tutti gli utenti già installati vedranno l'update al prossimo boot (silent check dopo 3s)

---

## 🧪 Testare in locale prima di rilasciare

```bash
cd desktop
npm install
npm run dev              # apre l'app in modalità sviluppo con hot reload
```

Per generare l'installer localmente senza pubblicare:

```bash
cd desktop
npx electron-builder --win --publish never    # solo Windows, output in ./release/
npx electron-builder --mac --publish never    # solo Mac (solo se sei su Mac)
```

---

## 🔐 Setup iniziale (una tantum, prima release)

Se non hai ancora rilasciato la 0.1.0:

```bash
cd desktop
git tag v-desktop-0.1.0
git push --follow-tags
```

Controlla che GitHub Actions parta su https://github.com/Showdah22/VotoPlus-Website/actions.

---

## ✅ Auto-update per gli utenti installati

1. **Silent check all'avvio** — 3 secondi dopo l'apertura, l'app contatta GitHub Releases del repo Website.
2. Se c'è una nuova versione:
   - **Notifica toast** in basso a destra "Aggiornamento pronto" dopo il download.
   - Oppure l'utente può andare in **Impostazioni → Aggiornamenti → Cerca aggiornamenti** manualmente.
3. Al click su **Riavvia ora**: l'app si chiude, installa la nuova versione, si riapre.

**Nessun re-download manuale dal sito richiesto** — gli utenti restano sempre aggiornati.

---

## ⚠️ Firma digitale (unsigned per ora)

### Windows
- L'installer NON è firmato Authenticode → SmartScreen mostrerà un warning al primo lancio.
- L'utente clicca **"Ulteriori informazioni" → "Esegui comunque"**.
- L'auto-update funziona comunque su Windows anche senza firma.
- Per rimuovere il warning: cert Authenticode (≈ 200€/anno da SSL.com/Sectigo) + secrets GitHub `WIN_CSC_LINK`/`WIN_CSC_KEY_PASSWORD`.

### macOS
- Il DMG NON è firmato/notarized → macOS lo blocca ("impossibile aprire").
- L'utente fa **clic destro sull'app → Apri** la prima volta.
- ⚠️ **Auto-update NON funziona su Mac senza firma.** Gli utenti Mac riscaricheranno manualmente ogni volta.
- Per abilitarlo: Apple Developer ID ($99/anno) + secrets `CSC_LINK`/`CSC_KEY_PASSWORD`.

---

## 📊 Bottone "Scarica" su votoplus.it — come funziona

`/download.js` (root del repo, non in `desktop/`) chiama:

```
GET https://api.github.com/repos/Showdah22/VotoPlus-Website/releases/latest
```

Trova l'asset con estensione `.exe` (Win) o `.dmg` (Mac) e imposta il bottone. Così quando pubblichi una nuova release, il sito si aggiorna automaticamente senza dover toccare l'HTML.

---

## 🛠 Troubleshooting

**GitHub Actions non parte** — verifica che il tag inizi con `v-desktop-` (es. `v-desktop-0.1.0`), non `v0.1.0`.

**"Cannot find latest.yml" nell'auto-update** — electron-builder genera `latest.yml` solo con `publish: always`. Il workflow lo fa già.

**Il bottone del sito continua a puntare a `#`** — GitHub API rate-limit (60 req/h da IP non autenticati). Attendi 1h o hard-refresh dal browser dell'utente. Se persistente, mostra fallback verso `/releases`.
