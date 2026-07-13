/**
 * Cronologia release DESKTOP di Voto+.
 * NB: intenzionalmente separata dal changelog mobile (backend `/api/app/changelog`)
 * perché il desktop ha ciclo di rilascio, feature set e installazione autonomi.
 * Ogni volta che shippi una nuova versione desktop, aggiungi un blocco qui in
 * cima (versione più recente per prima).
 */
export type DesktopHighlight = { icon: string; title: string; body: string };
export type DesktopRelease = {
  version: string;
  date: string;
  title: string;
  emoji: string;
  highlights: DesktopHighlight[];
};

export const DESKTOP_CHANGELOG: DesktopRelease[] = [
  {
    version: "0.8.1",
    date: "2026-07-13",
    title: "✨ Cambia piano in un click (mensile ↔ annuale)",
    emoji: "🔁",
    highlights: [
      { icon: "refresh-cw", title: "✨ Passa da mensile ad annuale (o viceversa) senza attriti", body: "Se sei già abbonato via Stripe, ora puoi passare tra Premium mensile, Family, Annuale e Maturità con un solo click. Stripe calcola in automatico la proration: paghi solo la differenza, niente doppio addebito." },
      { icon: "settings", title: "✨ Gestisci abbonamento dal Portale Stripe", body: "Nuovo pulsante 'Gestisci abbonamento' che apre il Portale Stripe: aggiorna carta, scarica fatture, cambia piano o cancella — tutto self-service, senza contattarci." },
      { icon: "info", title: "🐛 Correzione — messaggio bloccante rimosso", body: "Rimosso il messaggio d'errore rosso che appariva erroneamente quando cercavi di passare a un altro piano Stripe. Ora l'app apre direttamente il flusso di cambio." },
    ],
  },
  {
    version: "0.8.0",
    date: "2026-07-13",
    title: "✨ Abbonamenti direttamente dal desktop",
    emoji: "💳",
    highlights: [
      { icon: "credit-card", title: "✨ Acquista Premium senza uscire dall'app", body: "Ora puoi attivare gli abbonamenti Premium, Family, Annuale e Maturità direttamente dall'app desktop. Il checkout si apre nel browser di sistema (Stripe), 7 giorni di prova gratuita, zero addebiti se cancelli entro la settimana." },
      { icon: "shield-check", title: "✨ Riconosciamo l'abbonamento mobile", body: "Se hai già un abbonamento attivo su iPhone/iPad/Android, viene riconosciuto automaticamente qui — non serve pagare due volte. Il pulsante di acquisto si disabilita se sei già Premium." },
      { icon: "refresh-cw", title: "✨ Attivazione automatica post-pagamento", body: "Appena Stripe conferma il pagamento (di solito entro 10 secondi), l'abbonamento si sblocca qui automaticamente senza dover chiudere e riaprire l'app." },
    ],
  },
  {
    version: "0.7.0",
    date: "2026-07-11",
    title: "🐛 Bug Fix — Accenti Novità + testi Unicode",
    emoji: "🐛",
    highlights: [
      { icon: "type", title: "🐛 Correzione di bug — Accenti resi correttamente in tutta l'app", body: "Fix ai testi 'Novità', '·' e '—' nella pagina Novità che apparivano come escape Unicode letterali ('Novit\\u00e0'). Ora tutto renderizzato in italiano corretto." },
    ],
  },
  {
    version: "0.6.9",
    date: "2026-07-11",
    title: "Icona Windows trasparente",
    emoji: "🪟",
    highlights: [
      { icon: "image", title: "Nuova icona Windows senza sfondo nero", body: "Su Windows la vecchia icona aveva angoli neri opachi nella taskbar. Ora usa il logo V+ colorato con sfondo trasparente (basato sull'adaptive-icon dell'app mobile) — si integra perfettamente con qualsiasi tema Windows." },
    ],
  },
  {
    version: "0.6.8",
    date: "2026-07-11",
    title: "App firmata Apple + auto-update in-app",
    emoji: "🔏",
    highlights: [
      { icon: "shield-check", title: "Firma Developer ID + notarizzazione Apple", body: "L'app macOS è firmata con 'Developer ID Application: TOMMASO CORRAO' e notarizzata da Apple. Niente più warning 'App non verificata'." },
      { icon: "download", title: "Auto-update in-app funzionante su macOS", body: "Da questa release in poi gli aggiornamenti si applicano direttamente dall'app senza scaricare manualmente il DMG." },
    ],
  },
  {
    version: "0.6.7",
    date: "2026-07-11",
    title: "App firmata Apple + auto-update in-app funzionante",
    emoji: "🔏",
    highlights: [
      { icon: "shield-check", title: "App firmata con Developer ID Apple", body: "Voto+ Desktop è ora firmato con il certificato Developer ID di Tommaso Corrao (Team KG3PL923Z5). Niente più warning 'App non verificata' all'apertura del DMG. Gatekeeper approva l'app senza chiedere conferma." },
      { icon: "check-check", title: "Notarizzazione Apple", body: "Ogni build viene ora notarizzata da Apple tramite notarytool: viene verificata l'assenza di malware e stapled un ticket direttamente nell'app. Massima fiducia utente." },
      { icon: "download", title: "Auto-update in-app finalmente funziona su macOS", body: "L'errore 'ZIP file not provided / code signature did not pass validation' è risolto: da questa release in poi, quando esce un aggiornamento, si aggiorna direttamente dall'app senza scaricare manualmente il DMG." },
    ],
  },
  {
    version: "0.6.6",
    date: "2026-07-11",
    title: "Bug fix critico: il prof usa argomento e nome corretti",
    emoji: "🎯",
    highlights: [
      { icon: "target", title: "Il prof rispetta materia, argomento e tuo nome", body: "Bug della 0.6.3-0.6.5: quando il prof apriva la conversazione, chiamava lo studente con nome inventato (es. 'Luca' invece del tuo) e faceva domande di tutt'altra materia. Root cause: l'evento response.create iniziale passava override delle instructions che sostituivano il context della sessione. Fix: response.create senza instructions → usa quelle della sessione (nome, materia, argomento, severità)." },
    ],
  },
  {
    version: "0.6.5",
    date: "2026-07-11",
    title: "Fix aggiornamenti in-app su macOS",
    emoji: "🔄",
    highlights: [
      { icon: "download", title: "Auto-update ora funziona su macOS", body: "Aggiunto il target 'zip' alla build macOS. electron-updater richiede il file .zip (oltre al .dmg) per gli aggiornamenti in-app. L'errore 'ZIP file not provided' è risolto: dalla prossima release potrai aggiornare Voto+ direttamente dall'app." },
    ],
  },
  {
    version: "0.6.4",
    date: "2026-07-11",
    title: "Fix permesso microfono macOS",
    emoji: "🍎",
    highlights: [
      { icon: "mic", title: "Niente più popup ripetuti del microfono su macOS", body: "Aggiunti NSMicrophoneUsageDescription nell'Info.plist, entitlement com.apple.security.device.audio-input e setPermissionCheckHandler nel main process. Ora macOS chiede il permesso UNA sola volta all'avvio e lo ricorda per sempre." },
      { icon: "shield", title: "Hardened Runtime + entitlements", body: "Nuovo file entitlements.mac.plist per l'esecuzione in Hardened Runtime, con permessi di rete, audio input e file utente. Necessario per notarizzazione futura." },
    ],
  },
  {
    version: "0.6.3",
    date: "2026-07-11",
    title: "Il prof apre la conversazione",
    emoji: "🎤",
    highlights: [
      { icon: "mic", title: "Il prof rompe il ghiaccio", body: "Nella modalità Realtime ora è il professore ad aprire la conversazione con il saluto + prima domanda, invece di aspettare che parli tu. UX più naturale, come in un'interrogazione vera." },
    ],
  },
  {
    version: "0.6.2",
    date: "2026-07-11",
    title: "Interrogazione Realtime + parity mobile completa + icona macOS",
    emoji: "🚀",
    highlights: [
      { icon: "mic", title: "Interrogazione vocale REALTIME (OpenAI gpt-realtime)", body: "Riscritta da zero con la nuova OpenAI Realtime API su WebRTC. Nessun bottone da premere: parli naturalmente, il prof ti ascolta in tempo reale, ti risponde con voce italiana veramente naturale (voci marin/cedar, GA 2025) e puoi anche interromperlo. Latenza < 500ms." },
      { icon: "sparkles", title: "Parity 1:1 con l'app mobile", body: "La schermata di setup ora ha tutti gli elementi del mobile: modalità Domande secche / Esposizione + approfondimenti, durata Standard 15min / Lampo 5min, scope 'Tutta la materia' o singoli riassunti (max 8), lingua straniera solo quando serve, argomento obbligatorio, nomi voci italiani (Alex, Marco, Prof. Giorgio, Prof.ssa Sofia, Prof.ssa Chiara)." },
      { icon: "shield", title: "Filtro allucinazioni Whisper", body: "Non vedrai più frasi come 'Sottotitoli creati dalla comunità Amara.org' quando resti in silenzio: il backend filtra le note allucinazioni di Whisper e chiede semplicemente di riprovare." },
      { icon: "apple", title: "Icona macOS non trasparente", body: "Nuova icona con sfondo opaco che si visualizza correttamente su Dock, Launchpad e Finder di macOS." },
      { icon: "graduation-cap", title: "Voto finale automatico", body: "Il prof chiama il tool `end_session` alla fine dell'interrogazione: voto 1-10, punti forti, punti deboli e riepilogo del prof salvati automaticamente in cronologia." },
      { icon: "mic-off", title: "Controlli live", body: "Durante la sessione: pulsante Silenzia mic, Interrompi audio del prof (barge-in manuale) e Termina anticipatamente." },
    ],
  },
  {
    version: "0.6.0",
    date: "2026-07-11",
    title: "Interrogazione vocale + Mindmap SVG + Fullscreen + Loading spinners + Math parsed",
    emoji: "🎙️",
    highlights: [
      { icon: "mic", title: "Interrogazione VOCALE (Premium)", body: "Nuova modalità Voce nella pagina Interrogazione: parli al microfono, l'AI trascrive con Whisper, il professore risponde a voce con TTS OpenAI. 9 voci selezionabili (Alloy, Coral, Nova, Onyx, ...), severità configurabile, supporto lingue straniere con modalità immersione/misto/italiano. Usa mic + speaker configurati in Impostazioni → Audio." },
      { icon: "maximize", title: "UI fullscreen davvero fullscreen", body: "Rimosso il tetto di 1600px: sidebar + main + right panel ora si espandono per riempire tutta la finestra su monitor ultrawide senza black bar." },
      { icon: "git-branch", title: "Mappa concettuale ridisegnata in SVG", body: "Nuovo rendering ad albero orizzontale con nodi arrotondati (root al centro, figli distribuiti proporzionalmente ai sottonodi) e connettori curvi Bezier con freccia. Ogni ramo eredita il colore." },
      { icon: "refresh-cw", title: "Loading spinner + UI bloccata durante le chiamate AI", body: "Ora quando premi 'Genera' su Tema, Compito, Interrogazione, Vocabolario o Mappa vedi la rotellina che gira dentro il bottone e il form diventa non-interattivo finché l'AI risponde. Niente più doppi click accidentali." },
      { icon: "calculator", title: "Matematica: risposta AI renderizzata bene", body: "Prima mostrava il JSON grezzo. Ora vedi il risultato in evidenza, gli step numerati con formula in mono-font, la spiegazione facile in card viola e gli esercizi simili suggeriti." },
      { icon: "download", title: "Errori update-check più leggibili", body: "Quando la ricerca aggiornamenti fallisce (release non ancora pubblicata, offline, timeout) mostriamo un messaggio pulito e utile invece dello stack trace tecnico." },
    ],
  },
  {
    version: "0.5.0",
    date: "2026-07-11",
    title: "Single instance + Scanner multi-sorgente + Piani/utilizzi",
    emoji: "🔒",
    highlights: [
      { icon: "layout", title: "Un'unica finestra alla volta", body: "Voto+ Desktop non può più essere aperto più volte contemporaneamente. Se provi a lanciarlo mentre è già in esecuzione, viene messo in primo piano quello esistente." },
      { icon: "command", title: "Shortcut nativi per OS", body: "Il suggerimento della ricerca rapida ora mostra ⌘K su macOS e Ctrl+K su Windows/Linux, coerente con le convenzioni del sistema operativo." },
      { icon: "trophy", title: "Utilizzi e Piani in Impostazioni", body: "Nuova sezione 'Piani & utilizzo': vedi le tue quote mensili con barre di progresso, i piani disponibili (Free, Premium, Family, Annuale, Maturità) e il tuo piano attivo evidenziato. Gli acquisti restano sul mobile finché non integriamo Stripe sul desktop." },
      { icon: "calendar", title: "Fix salvataggio eventi calendario", body: "Correzione errore HTTP 422 quando creavi un nuovo evento: il tipo 'Esame' ora viene mappato correttamente e il titolo viene generato automaticamente se lo lasci vuoto. Messaggi di errore più leggibili in tutta l'app." },
      { icon: "link", title: "Scanner da URL", body: "Nella pagina Scannerizza & Riassumi ora puoi incollare l'URL di una pagina web e generare il riassunto AI del suo contenuto (senza ads/menu/footer)." },
      { icon: "video", title: "Scanner da YouTube", body: "Incolla l'URL di un video YouTube: l'app estrae la trascrizione automatica e ne genera il riassunto." },
      { icon: "file-type-2", title: "Scanner da PDF", body: "Trascina un PDF (max 12 MB, 25 pagine) e ottieni il riassunto AI dell'intero documento." },
      { icon: "layers", title: "Scanner riprogettato", body: "Nuove tab per scegliere la sorgente (Immagine · Testo · Sito web · YouTube · PDF), preview dinamiche del contenuto estratto." },
    ],
  },
  {
    version: "0.4.0",
    date: "2026-07-11",
    title: "Splash Discord-style + audio settings + math parity mobile",
    emoji: "🎧",
    highlights: [
      { icon: "sparkles", title: "Splash iniziale", body: "Schermata di avvio Discord-style che controlla gli aggiornamenti prima ancora di aprire l'app. Se ne trova uno, ti chiede se aggiornare subito o continuare." },
      { icon: "refresh-cw", title: "Auto-check ogni 30 minuti", body: "L'app cerca aggiornamenti in background ogni 30 minuti. Il badge nella titlebar appare automaticamente non appena una nuova versione è disponibile." },
      { icon: "headphones", title: "Impostazioni audio dedicate", body: "Nuova sezione Audio in Impostazioni: scegli microfono ed uscita audio, prova il mic con la barra di livello in tempo reale stile Discord, testa gli altoparlanti selezionati." },
      { icon: "calculator", title: "Matematica in parity col mobile", body: "Aggiunta upload immagine (drag-drop + file picker), tastiera formule rapide, suggerimenti quick-start, contatore caratteri, difficoltà Maturità." },
      { icon: "book-open", title: "Novità desktop-only", body: "Questa pagina ora mostra solo le release desktop, non più quelle mobile: contenuti coerenti con l'app che stai usando." },
    ],
  },
  {
    version: "0.3.0",
    date: "2026-07-11",
    title: "Sprint 3 completo — parity mobile 100% + ⌘K",
    emoji: "🎓",
    highlights: [
      { icon: "mic", title: "Interrogazione", body: "Simula un'interrogazione col professore AI con severità configurabile e valutazione per risposta (voto, punti forti, punti deboli, risposta ideale)." },
      { icon: "pen-line", title: "Tema", body: "Genera tracce di tema/saggio con struttura, criteri di valutazione e argomenti chiave. Tipologie A/B/C + narrativo/descrittivo." },
      { icon: "timer", title: "Compito in classe", body: "Compiti cronometrati Premium/Maturità con esercizi math/aperti/scelta multipla e correzione AI dettagliata per singolo esercizio." },
      { icon: "git-branch", title: "Mappa concettuale", body: "Genera mappe gerarchiche ad albero fino a 3 livelli, con colori dinamici e connettori per organizzare visivamente lo studio." },
      { icon: "command", title: "Command Palette ⌘K", body: "Premi Cmd/Ctrl+K ovunque per aprire una ricerca rapida tra tutti i comandi e le pagine dell'app." },
      { icon: "trophy", title: "Fix icone Traguardi", body: "Le icone degli achievement ora si vedono correttamente (in precedenza appariva il testo del nome invece dell'icona)." },
    ],
  },
  {
    version: "0.2.2",
    date: "2026-07-11",
    title: "Dropdown dark ovunque",
    emoji: "🎨",
    highlights: [
      { icon: "chevron-down", title: "Select custom", body: "I menu a tendina (materia, tipologia, ecc.) ora rispettano il dark theme anche su Windows, dove il native <select> mostrava una lista bianca." },
    ],
  },
  {
    version: "0.2.1",
    date: "2026-07-11",
    title: "Home in primo piano + badge aggiornamento in titlebar",
    emoji: "🏠",
    highlights: [
      { icon: "home", title: "Home visibile subito", body: "La sezione Navigazione (con Home in primo piano) ora è sopra le Azioni rapide — nessuno scroll per raggiungere il tasto Home." },
      { icon: "download", title: "Badge aggiornamento automatico", body: "Un badge cliccabile nella titlebar compare automaticamente quando c'è un update: clicca per scaricare, poi per riavviare e installare." },
    ],
  },
  {
    version: "0.2.0",
    date: "2026-07-11",
    title: "Sprint 2 — Flashcards, Vocabolario AI, Traguardi, Novità",
    emoji: "🎴",
    highlights: [
      { icon: "layers", title: "Flashcards", body: "Crea, filtra per materia e ripassa le tue flashcard con la modalità review a card flip." },
      { icon: "book", title: "Vocabolario AI", body: "Cerca il significato di parole in 7 lingue (IT/EN/LA/GR/FR/ES/DE) con esempi, sinonimi, contrari, etimologia." },
      { icon: "trophy", title: "Traguardi", body: "Griglia gamification con progress ring, filtro sbloccati/da sbloccare, gruppi tematici." },
      { icon: "sparkles", title: "Novità", body: "Cronologia release direttamente in app." },
      { icon: "layout", title: "Titlebar macOS-style", body: "Titlebar più sottile con logo e titolo centrati, senza più la linea bianca in alto." },
    ],
  },
  {
    version: "0.1.5",
    date: "2026-07-11",
    title: "UI parity mobile + logo trasparente",
    emoji: "🖼️",
    highlights: [
      { icon: "image", title: "Logo Voto+ trasparente", body: "Il logo dell'app usa ora la versione con sfondo trasparente, coerente con il mobile." },
      { icon: "maximize", title: "Fullscreen elegante", body: "Su monitor ultrawide sidebar + main + right panel restano visivamente connessi senza gap." },
      { icon: "calculator", title: "Icone materie specifiche", body: "Le materie nella dashboard usano icone dedicate (Matematica=Calculator, Italiano=Languages, ecc.) come sul mobile." },
    ],
  },
  {
    version: "0.1.4",
    date: "2026-07-11",
    title: "Sprint 1 — Scanner, Math, Voti, Calendario",
    emoji: "🚀",
    highlights: [
      { icon: "scan-line", title: "Scannerizza & Riassumi", body: "Foto/PDF/testo → riassunto AI passo passo, integrato col backend Voto+." },
      { icon: "calculator", title: "Matematica", body: "Esercizi con soluzione step-by-step generata dall'AI." },
      { icon: "bar-chart-3", title: "Voti", body: "Voti reali + statistiche per materia." },
      { icon: "calendar", title: "Calendario", body: "Verifiche, interrogazioni ed esami sincronizzati col mobile." },
      { icon: "clock", title: "Cronologia", body: "Tutti i materiali passati riorganizzati per data." },
    ],
  },
  {
    version: "0.1.0",
    date: "2026-07-11",
    title: "Voto+ Desktop nasce",
    emoji: "🎉",
    highlights: [
      { icon: "monitor", title: "Prima release desktop", body: "Voto+ ora ha un'app dedicata per Windows e macOS. Auto-update via GitHub Releases, dark theme, login JWT che si sincronizza col mobile." },
    ],
  },
];
