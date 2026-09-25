"use client";

import { type FormEvent, useEffect, useRef, useState } from "react";

/* ————— Konfiguration ————— */

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  html?: string;
  streaming?: boolean;
  error?: boolean;
};

type LoadState = "idle" | "loading" | "ready" | "error";

type GenProgress = { pct: number; etaSec: number | null; tokens: number };

type BrowserModel = { id: string; label: string; size: string };

type Lang = "de" | "en" | "el" | "ja" | "zh" | "hi" | "fr" | "es" | "sw" | "it" | "tr";

type Texts = {
  subtitle: string;
  statusLoadingNoPct: string;
  statusLoading: string; // Platzhalter {pct}
  statusLoadingEta: string; // Platzhalter {pct} und {eta}
  statusError: string;
  statusReady: string;
  statusReadyGpu: string;
  statusIdle: string;
  gpuToggleTitle: string;
  modelSelectTitle: string;
  langSelectTitle: string;
  newChat: string;
  tabChat: string;
  tabResult: string;
  welcomeTitle: string;
  welcomeText: string;
  hintFree: string;
  hintFirstLoad: string; // Platzhalter {size}
  placeholder: string;
  submit: string;
  viewPreview: string;
  viewCode: string;
  openTabTitle: string;
  copyTitle: string;
  downloadTitle: string;
  previewEmpty: string;
  previewErrorLabel: string; // Vorspann der Skriptfehler-Meldung in der Vorschau
  fixPromptIntro: string; // Einleitung des Auto-Fix-Prompts (Vorschau-Fehler wird angehängt)
  fixButton: string; // Label der „Fehler beheben"-Schaltfläche
  previewDiagLabel: string; // Vorspann der Diagnose-Meldung (fehlende Element-IDs)
  previewDiagIds: string; // Platzhalter {ids} – fehlende Element-IDs
  diagFixIntro: string; // Platzhalter {ids} – Einleitung des Fix-Prompts bei fehlenden Element-IDs
  genFailHint: string; // Hinweis nach einem Generierungs-Crash (Sitzung wird frisch aufgebaut)
  gpuFailHint: string; // Tipp: GPU-Option deaktivieren
  gpuFallbackNote: string; // Chat-Hinweis beim automatischen WASM-Fallback nach GPU-Crash
  emptyDiagNote: string; // Hinweistext: erzeugte Seite ist leer (weiße Vorschau)
  emptyDiagFix: string; // Fix-Prompt bei leerer Seite
  previewHint: string;
  confirmNewChat: string;
  donePreview: string;
  done: string;
  errorPrefix: string;
  modelLoadError: string;
  modelFile: string;
  pendingLoad: string; // Hinweis nach Klick auf Erstellen, solange das Modell lädt
  prefill: string; // Platzhalter {s}: Sekunden seit Start des ersten Rechenschritts
  slowStart: string; // Meldung, wenn der erste Schritt zu lange dauert
  prevCodeIntro: string;
  noCode: string; // Hinweis, wenn das Modell Text statt einer HTML-Datei geliefert hat
  genLabel: string; // Platzhalter {pct}
  etaFmt: string; // Platzhalter {m} (Minuten) und {s} (Sekunden)
  tokensFmt: string; // Platzhalter {n}
  busyNotes: string[];
  examples: { icon: string; label: string; prompt: string }[];
  system: string;
};

const LANGS: { code: Lang; native: string; flag: string }[] = [
  { code: "de", native: "Deutsch", flag: "🇩🇪" },
  { code: "en", native: "English", flag: "🇬🇧" },
  { code: "fr", native: "Français", flag: "🇫🇷" },
  { code: "es", native: "Español", flag: "🇪🇸" },
  { code: "it", native: "Italiano", flag: "🇮🇹" },
  { code: "tr", native: "Türkçe", flag: "🇹🇷" },
  { code: "el", native: "Ελληνικά", flag: "🇬🇷" },
  { code: "ja", native: "日本語", flag: "🇯🇵" },
  { code: "zh", native: "中文", flag: "🇨🇳" },
  { code: "hi", native: "हिन्दी", flag: "🇮🇳" },
  { code: "sw", native: "Kiswahili", flag: "🇹🇿" },
];

const TEXTS: Record<Lang, Texts> = {
  /* ————————————————— Deutsch ————————————————— */
  de: {
    subtitle: "Homepages, Spiele & Web-Apps per Prompt",
    statusLoadingNoPct: "Modell wird geladen …",
    statusLoading: "Modell wird geladen … {pct} %",
    statusLoadingEta: "Modell wird geladen … {pct} % · noch {eta}",
    statusError: "Modell konnte nicht geladen werden",
    statusReady: "Modell bereit · läuft im Browser",
    statusReadyGpu: "Modell bereit · läuft im Browser (GPU)",
    statusIdle: "bereit zu laden",
    pendingLoad: "Das Modell wird geladen – die Generierung startet automatisch, sobald es bereit ist.",
    prefill: "Vorbereitung … seit {s} Sek",
    slowStart:
      "Der erste Rechenschritt dauert ungewöhnlich lange. Bitte Seite neu laden – auf schwachen Geräten hilft die ⚡-GPU-Option.",
    gpuToggleTitle: "GPU nutzen, falls vorhanden (schneller). Ohne GPU läuft alles im CPU-Modus.",
    modelSelectTitle: "Kostenloses Browser-Modell wählen",
    langSelectTitle: "Sprache wählen",
    newChat: "✦ Neu",
    tabChat: "Chat",
    tabResult: "Ergebnis",
    welcomeTitle: "Was möchtest du bauen?",
    welcomeText:
      "Beschreib einfach, was du brauchst – Homepage, Spiel oder kleine Web-App. Die KI läuft dabei komplett auf diesem Gerät und zeigt dir den Code live an.",
    hintFree: "100 % kostenlos · läuft direkt im Browser · kein Server, kein Account, kein API-Key",
    hintFirstLoad:
      "Beim ersten Start wird das Modell einmalig heruntergeladen ({size}) und danach im Browser zwischengespeichert.",
    placeholder: 'z. B. "Erstelle ein Snake-Spiel mit Punktestand"',
    submit: "Erstellen ▶",
    viewPreview: "Vorschau",
    viewCode: "Code",
    openTabTitle: "In neuem Tab öffnen",
    copyTitle: "Code kopieren",
    downloadTitle: "index.html herunterladen",
    previewEmpty: "Dein Ergebnis erscheint hier – live während die KI den Code schreibt.",
    previewErrorLabel: "⚠ Skriptfehler in der Vorschau: ",
    fixPromptIntro:
      "Der letzte generierte Code verursacht in der Vorschau diesen Fehler – korrigiere ihn und gib die komplette, lauffähige HTML-Datei zurück. Fehler:",
    fixButton: "🔧 Fehler beheben",
    genFailHint:
      "Die fehlgeschlagene Modell-Sitzung wurde verworfen – der nächste Versuch baut sie frisch auf und läuft meist wieder. Einfach noch einmal senden oder „Fehler beheben“ klicken.",
    gpuFailHint: "Tipp: Deaktiviere oben die GPU-Option und versuche es erneut (WASM ist stabiler).",
    gpuFallbackNote: "⚠ GPU-Fehler während der Generierung – versuche automatisch mit WASM (CPU) neu …",
    emptyDiagNote:
      "Die Seite ist leer (kein sichtbarer Text, kein Eingabefeld, keine Buttons). Klicke „Fehler beheben“, damit das Modell die App sichtbar aufbaut.",
    emptyDiagFix:
      "Der letzte generierte Code ergibt eine leere, weiße Seite: kein sichtbarer Text, kein Eingabefeld, kein Button, keine Bedienelemente. Baue die angeforderte App komplett und sichtbar auf (mit Eingabefeld, Buttons und Liste bzw. passenden UI-Elementen) und gib die komplette, lauffähige HTML-Datei zurück.",
    previewDiagLabel: "⚠ Vorschau-Diagnose: ",
    previewDiagIds:
      "Diese Element-ID wird im JavaScript verwendet, existiert aber nicht im HTML: {ids}. Klicke „Fehler beheben“, damit das Modell das fehlende Element ergänzt.",
    diagFixIntro:
      "Der letzte generierte Code verwendet Element-IDs, die im HTML nicht existieren: {ids}. Ergänze die fehlenden Elemente (z. B. ein <input id=\"...\"> für Eingaben), gleiche alle getElementById-/querySelector-IDs mit dem HTML ab und gib die komplette, lauffähige HTML-Datei zurück.",
    previewHint: "Läuft komplett auf deinem Gerät – kein Server, kein API-Key.",
    confirmNewChat: "Aktuellen Chat wirklich löschen?",
    donePreview: "✔ Fertig – deine App ist in der Vorschau.",
    done: "✔ Fertig.",
    errorPrefix: "Fehler: ",
    modelLoadError: "Das Modell konnte nicht geladen werden.",
    modelFile: "Modell",
    prevCodeIntro: "Aktueller Code (nimm Änderungen daran vor):",
    noCode:
      "⚠ Keine HTML-Datei erzeugt – das Modell hat Text statt Code geliefert. Bitte erneut versuchen oder das größere Modell (1.5B) wählen.",
    genLabel: "Generiere … {pct} %",
    etaFmt: "ca. {m} Min {s} Sek",
    tokensFmt: "{n} Tokens",
    busyNotes: ["Schreibt Code …", "Design wird abgerundet …", "Fast fertig …"],
    examples: [
      { icon: "🌐", label: "Landingpage", prompt: "Erstelle eine moderne Landingpage für ein italienisches Café mit Öffnungszeiten und Fotos." },
      { icon: "🐍", label: "Spiel", prompt: "Baue ein klassisches Snake-Spiel mit Punktestand, Level-Display und Game-Over-Ansicht." },
      { icon: "✅", label: "To-Do-App", prompt: "Erstelle eine To-Do-Liste als Web-App mit Addieren, Abhaken, Löschen und Speichern im Browser." },
      { icon: "🧮", label: "Rechner", prompt: "Baue einen schönen Taschenrechner mit Tastatursteuerung und Verlauf." },
    ],
    system: `Du bist "AI-Coder", ein Generator für einzelne HTML-Dateien. Du erstellst komplette, in sich geschlossene Web-Anwendungen als EINE index.html-Datei mit eingebettetem CSS und JavaScript.

Regeln:
- Gib ausschließlich den vollständigen HTML-Code aus, in einem einzigen Markdown-Codeblock, der mit \`\`\`html beginnt und mit \`\`\` endet.
- Keine Erklärungen außerhalb des Codeblocks.
- Keine Build-Tools oder Server nötig: alles läuft offline in einem Browser-Tab (vanilla HTML/CSS/JS).
- Modernes, ansprechendes Design mit CSS-Variablen, responsiv (Desktop + Mobil).
- Der Code muss sofort lauffähig sein – keine Platzhalter, keine TODO-Kommentare.
- Für Spiele: flüssige Steuerung (Tastatur/Touch), Punktestand und Game-Over-Ansicht.
- Für Webseiten: Navigation, mehrere Sektionen und Kontaktbereich.`,
  },

  /* ————————————————— English ————————————————— */
  en: {
    subtitle: "Homepages, games & web apps from a prompt",
    statusLoadingNoPct: "Loading model …",
    statusLoading: "Loading model … {pct} %",
    statusLoadingEta: "Loading model … {pct} % · {eta} left",
    statusError: "Model could not be loaded",
    statusReady: "Model ready · running in the browser",
    statusReadyGpu: "Model ready · running in the browser (GPU)",
    statusIdle: "ready to load",
    pendingLoad: "The model is loading – generation will start automatically once it's ready.",
    prefill: "Preparing … for {s} s",
    slowStart:
      "The first computation step is taking unusually long. Please reload the page – on weaker devices the ⚡ GPU option helps.",
    gpuToggleTitle: "Use GPU if available (faster). Without GPU everything runs in CPU mode.",
    modelSelectTitle: "Choose a free browser model",
    langSelectTitle: "Choose language",
    newChat: "✦ New",
    tabChat: "Chat",
    tabResult: "Result",
    welcomeTitle: "What do you want to build?",
    welcomeText:
      "Just describe what you need – homepage, game or small web app. The AI runs entirely on this device and shows you the code live on the right.",
    hintFree: "100 % free · runs directly in the browser · no server, no account, no API key",
    hintFirstLoad:
      "On first start the model is downloaded once ({size}) and then cached in your browser.",
    placeholder: 'e.g. "Create a Snake game with a score counter"',
    submit: "Create ▶",
    viewPreview: "Preview",
    viewCode: "Code",
    openTabTitle: "Open in new tab",
    copyTitle: "Copy code",
    downloadTitle: "Download index.html",
    previewEmpty: "Your result appears here – live while the AI writes the code.",
    previewErrorLabel: "⚠ Script error in preview: ",
    fixPromptIntro:
      "The last generated code causes this error in the preview – fix it and return the complete, working HTML file. Error:",
    fixButton: "🔧 Fix error",
    genFailHint:
      "The failed model session was discarded – the next attempt rebuilds it fresh and usually works. Simply send again or click “Fix error”.",
    gpuFailHint: "Tip: disable the GPU option above and try again (WASM is more stable).",
    gpuFallbackNote: "⚠ GPU error during generation – automatically retrying with WASM (CPU) …",
    emptyDiagNote:
      "The page is empty (no visible text, no input field, no buttons). Click “Fix error” so the model builds a visible app.",
    emptyDiagFix:
      "The last generated code results in an empty, blank page: no visible text, no input field, no button, no controls. Build the requested app completely and visibly (with input field, buttons and list or fitting UI elements) and return the complete, working HTML file.",
    previewDiagLabel: "⚠ Preview diagnostic: ",
    previewDiagIds:
      "This element ID is used by the JavaScript but is missing from the HTML: {ids}. Click “Fix error” so the model adds the missing element.",
    diagFixIntro:
      "The last generated code uses element IDs that do not exist in the HTML: {ids}. Add the missing elements (e.g. an <input id=\"...\"> for text input), make every getElementById/querySelector ID match the HTML, and return the complete, working HTML file.",
    previewHint: "Runs entirely on your device – no server, no API key.",
    confirmNewChat: "Really delete the current chat?",
    donePreview: "✔ Done – your app is in the preview.",
    done: "✔ Done.",
    errorPrefix: "Error: ",
    modelLoadError: "The model could not be loaded.",
    modelFile: "model",
    prevCodeIntro: "Current code (make changes to it):",
    noCode:
      "⚠ No HTML file created – the model returned text instead of code. Please try again or choose the larger model (1.5B).",
    genLabel: "Generating … {pct} %",
    etaFmt: "about {m} min {s} s",
    tokensFmt: "{n} tokens",
    busyNotes: ["Writing code …", "Polishing design …", "Almost done …"],
    examples: [
      { icon: "🌐", label: "Landing page", prompt: "Create a modern landing page for an Italian café with opening hours and photos." },
      { icon: "🐍", label: "Game", prompt: "Build a classic Snake game with a score counter, level display and game-over screen." },
      { icon: "✅", label: "To-do app", prompt: "Create a to-do list web app with adding, checking off, deleting and saving in the browser." },
      { icon: "🧮", label: "Calculator", prompt: "Build a nice calculator with keyboard controls and a history." },
    ],
    system: `You are "AI-Coder", a generator for single HTML files. You create complete, self-contained web applications as ONE index.html file with embedded CSS and JavaScript.

Rules:
- Output only the complete HTML code, in a single Markdown code block starting with \`\`\`html and ending with \`\`\`.
- No explanations outside the code block.
- No build tools or servers needed: everything runs offline in a browser tab (vanilla HTML/CSS/JS).
- Modern, appealing design with CSS variables, responsive (desktop + mobile).
- The code must work immediately – no placeholders, no TODO comments.
- For games: smooth controls (keyboard/touch), score display and game-over screen.
- For websites: navigation, multiple sections and a contact area.`,
  },

  /* ————————————————— Ελληνικά ————————————————— */
  el: {
    subtitle: "Ιστοσελίδες, παιχνίδια και web εφαρμογές με prompt",
    statusLoadingNoPct: "Φόρτωση μοντέλου …",
    statusLoading: "Φόρτωση μοντέλου … {pct} %",
    statusLoadingEta: "Φόρτωση μοντέλου … {pct} % · απομένουν {eta}",
    statusError: "Το μοντέλο δεν μπόρεσε να φορτωθεί",
    statusReady: "Το μοντέλο είναι έτοιμο · τρέχει στο πρόγραμμα περιήγησης",
    statusReadyGpu: "Το μοντέλο είναι έτοιμο · τρέχει στο πρόγραμμα περιήγησης (GPU)",
    statusIdle: "έτοιμο προς φόρτωση",
    pendingLoad: "Το μοντέλο φορτώνει – η δημιουργία θα ξεκινήσει αυτόματα μόλις είναι έτοιμο.",
    prefill: "Προετοιμασία … εδώ και {s} δευτ.",
    slowStart:
      "Το πρώτο βήμα υπολογισμού καθυστερεί ασυνήθιστα. Παρακαλώ επαναφορτώστε τη σελίδα – σε αδύναμες συσκευές βοηθά η επιλογή ⚡ GPU.",
    gpuToggleTitle: "Χρησιμοποίησε GPU αν υπάρχει (γρηγορότερο). Χωρίς GPU όλα τρέχουν σε λειτουργία CPU.",
    modelSelectTitle: "Επίλεξε δωρεάν μοντέλο στο πρόγραμμα περιήγησης",
    langSelectTitle: "Επίλεξε γλώσσα",
    newChat: "✦ Νέο",
    tabChat: "Συνομιλία",
    tabResult: "Αποτέλεσμα",
    welcomeTitle: "Τι θέλεις να φτιάξεις;",
    welcomeText:
      "Περίγραψε απλά τι χρειάζεσαι – ιστοσελίδα, παιχνίδι ή μικρή web εφαρμογή. Η AI τρέχει εξ ολοκλήρου στη συσκευή σου και σου δείχνει τον κώδικα ζωντανά στα δεξιά.",
    hintFree: "100 % δωρεάν · τρέχει απευθείας στον browser · χωρίς server, χωρίς λογαριασμό, χωρίς API key",
    hintFirstLoad:
      "Στην πρώτη εκκίνηση το μοντέλο κατεβαίνει μία φορά ({size}) και μετά μένει στην κρυφή μνήμη του browser.",
    placeholder: 'π.χ. "Φτιάξε ένα παιχνίδι Snake με μετρητή πόντων"',
    submit: "Δημιουργία ▶",
    viewPreview: "Προεπισκόπηση",
    viewCode: "Κώδικας",
    openTabTitle: "Άνοιγμα σε νέα καρτέλα",
    copyTitle: "Αντιγραφή κώδικα",
    downloadTitle: "Λήψη index.html",
    previewEmpty: "Το αποτέλεσμά σου εμφανίζεται εδώ – ζωντανά όσο η AI γράφει τον κώδικα.",
    previewErrorLabel: "⚠ Σφάλμα σεναρίου στην προεπισκόπηση: ",
    fixPromptIntro:
      "Ο τελευταίος κώδικας που δημιουργήθηκε προκαλεί αυτό το σφάλμα στην προεπισκόπηση – διόρθωσέ το και επέστρεψε το πλήρες, λειτουργικό αρχείο HTML. Σφάλμα:",
    fixButton: "🔧 Διόρθωση σφάλματος",
    genFailHint:
      "Η αποτυχημένη συνεδρία του μοντέλου απορρίφθηκε – η επόμενη προσπάθεια τη δημιουργεί από την αρχή και συνήθως λειτουργεί. Απλώς στείλε ξανά ή κάνε κλικ στο „Διόρθωση σφάλματος“.",
    gpuFailHint: "Συμβουλή: Απενεργοποίησε την επιλογή GPU και δοκίμασε ξανά (το WASM είναι πιο σταθερό).",
    gpuFallbackNote: "⚠ Σφάλμα GPU κατά τη δημιουργία – γίνεται αυτόματη επανάληψη με WASM (CPU) …",
    emptyDiagNote:
      "Η σελίδα είναι κενή (κανένα ορατό κείμενο, κανένα πεδίο εισαγωγής, κανένα κουμπί). Κάνε κλικ στο „Διόρθωση σφάλματος“ για να φτιάξει το μοντέλο μια εμφανή εφαρμογή.",
    emptyDiagFix:
      "Ο τελευταίος κώδικας δίνει μια κενή, λευκή σελίδα: κανένα ορατό κείμενο, κανένα πεδίο εισαγωγής, κανένα κουμπί, κανένα στοιχείο ελέγχου. Φτιάξε την εφαρμογή που ζητήθηκε πλήρως και εμφανώς (με πεδίο εισαγωγής, κουμπιά και λίστα ή κατάλληλα στοιχεία UI) και επέστρεψε το πλήρες, λειτουργικό αρχείο HTML.",
    previewDiagLabel: "⚠ Διάγνωση προεπισκόπησης: ",
    previewDiagIds:
      "Αυτό το αναγνωριστικό στοιχείου χρησιμοποιείται από την JavaScript αλλά λείπει από το HTML: {ids}. Κάνε κλικ στο „Διόρθωση σφάλματος“ για να προσθέσει το μοντέλο το στοιχείο που λείπει.",
    diagFixIntro:
      "Ο τελευταίος κώδικας χρησιμοποιεί αναγνωριστικά στοιχείων που δεν υπάρχουν στο HTML: {ids}. Πρόσθεσε τα στοιχεία που λείπουν (π.χ. ένα <input id=\"...\"> για εισαγωγή κειμένου), ευθυγράμμισε όλα τα getElementById/querySelector IDs με το HTML και επέστρεψε το πλήρες, λειτουργικό αρχείο HTML.",
    previewHint: "Τρέχει εξ ολοκλήρου στη συσκευή σου – χωρίς server, χωρίς API key.",
    confirmNewChat: "Θέλεις σίγουρα να διαγράψεις τη συνομιλία;",
    donePreview: "✔ Έτοιμο – η εφαρμογή σου είναι στην προεπισκόπηση.",
    done: "✔ Έτοιμο.",
    errorPrefix: "Σφάλμα: ",
    modelLoadError: "Το μοντέλο δεν μπόρεσε να φορτωθεί.",
    modelFile: "μοντέλο",
    prevCodeIntro: "Τρέχων κώδικας (κάνε αλλαγές σε αυτόν):",
    noCode:
      "⚠ Δεν δημιουργήθηκε αρχείο HTML – το μοντέλο έδωσε κείμενο αντί για κώδικα. Δοκιμάστε ξανά ή επιλέξτε το μεγαλύτερο μοντέλο (1.5B).",
    genLabel: "Δημιουργία … {pct} %",
    etaFmt: "περίπου {m} λεπ. {s} δευτ.",
    tokensFmt: "{n} tokens",
    busyNotes: ["Γράφει κώδικα …", "Ολοκληρώνει το σχέδιο …", "Σχεδόν έτοιμο …"],
    examples: [
      { icon: "🌐", label: "Σελίδα προορισμού", prompt: "Δημιούργησε μια μοντέρνα σελίδα προορισμού για ένα ιταλικό καφέ με ώρες λειτουργίας και φωτογραφίες." },
      { icon: "🐍", label: "Παιχνίδι", prompt: "Φτιάξε ένα κλασικό παιχνίδι φιδιού (Snake) με μετρητή πόντων, ένδειξη επιπέδου και οθόνη game-over." },
      { icon: "✅", label: "Λίστα εργασιών", prompt: "Δημιούργησε μια λίστα εργασιών (to-do) ως web εφαρμογή με προσθήκη, ολοκλήρωση, διαγραφή και αποθήκευση στον browser." },
      { icon: "🧮", label: "Αριθμομηχανή", prompt: "Φτιάξε μια όμορφη αριθμομηχανή με έλεγχο πληκτρολογίου και ιστορικό." },
    ],
    system: `Είσαι ο "AI-Coder", ένας δημιουργός μεμονωμένων αρχείων HTML. Δημιουργείς πλήρεις, αυτόνομες διαδικτυακές εφαρμογές ως ΕΝΑ αρχείο index.html με ενσωματωμένο CSS και JavaScript.

Κανόνες:
- Εξάγεις μόνο τον πλήρη κώδικα HTML, σε ένα μόνο μπλοκ κώδικα Markdown που αρχίζει με \`\`\`html και τελειώνει με \`\`\`.
- Καμία επεξήγηση εκτός του μπλοκ κώδικα.
- Δεν χρειάζονται build tools ή server: όλα τρέχουν offline σε μια καρτέλα του προγράμματος περιήγησης (vanilla HTML/CSS/JS).
- Μοντέρνο, ελκυστικό σχέδιο με CSS μεταβλητές, responsive (desktop + κινητό).
- Ο κώδικας πρέπει να λειτουργεί αμέσως – χωρίς placeholders, χωρίς σχόλια TODO.
- Για παιχνίδια: ομαλός χειρισμός (πληκτρολόγιο/αφή), σκορ και οθόνη game-over.
- Για ιστοσελίδες: πλοήγηση, πολλαπλές ενότητες και περιοχή επικοινωνίας.`,
  },

  /* ————————————————— 日本語 ————————————————— */
  ja: {
    subtitle: "プロンプトからホームページ・ゲーム・Webアプリ",
    statusLoadingNoPct: "モデルを読み込み中 …",
    statusLoading: "モデルを読み込み中 … {pct} %",
    statusLoadingEta: "モデルを読み込み中 … {pct} % · 残り {eta}",
    statusError: "モデルを読み込めませんでした",
    statusReady: "モデル準備完了 · ブラウザで実行中",
    statusReadyGpu: "モデル準備完了 · ブラウザで実行中（GPU）",
    statusIdle: "読み込み準備完了",
    pendingLoad: "モデルを読み込み中です – 準備ができ次第、自動的に生成を開始します。",
    prefill: "準備中 … {s} 秒経過",
    slowStart:
      "最初の計算ステップに異常に時間がかかっています。ページを再読み込みしてください – 性能の低い端末では ⚡ GPU オプションが役立ちます。",
    gpuToggleTitle: "利用可能ならGPUを使います（高速）。GPUがない場合はCPUモードで動作します。",
    modelSelectTitle: "無料のブラウザモデルを選択",
    langSelectTitle: "言語を選択",
    newChat: "✦ 新規",
    tabChat: "チャット",
    tabResult: "結果",
    welcomeTitle: "何を作りたいですか？",
    welcomeText:
      "ホームページ、ゲーム、小さなWebアプリなど、必要なものを説明するだけです。AIはすべてこのデバイス上で動作し、コードを右側にライブ表示します。",
    hintFree: "100%無料 · ブラウザ内で直接実行 · サーバー不要、アカウント不要、APIキー不要",
    hintFirstLoad: "初回起動時、モデルが一度だけダウンロードされ（{size}）、その後ブラウザにキャッシュされます。",
    placeholder: '例：「スコアカウンター付きのスネークゲームを作って」',
    submit: "作成 ▶",
    viewPreview: "プレビュー",
    viewCode: "コード",
    openTabTitle: "新しいタブで開く",
    copyTitle: "コードをコピー",
    downloadTitle: "index.htmlをダウンロード",
    previewEmpty: "AIがコードを書いている間、ここに結果がライブ表示されます。",
    previewErrorLabel: "⚠ プレビューのスクリプトエラー: ",
    fixPromptIntro:
      "最後に生成されたコードがプレビューでこのエラーを引き起こしています – 修正して、完全に動作する HTML ファイルを返してください。エラー:",
    fixButton: "🔧 エラーを修正",
    genFailHint:
      "失敗したモデルセッションは破棄されました – 次の試行で新しく構築され、通常は再び動作します。もう一度送信するか、「エラーを修正」をクリックしてください。",
    gpuFailHint: "ヒント: 上記の GPU オプションを無効にして再試行してください（WASM の方が安定しています）。",
    gpuFallbackNote: "⚠ 生成中に GPU エラーが発生しました – WASM（CPU）で自動的に再試行しています…",
    emptyDiagNote:
      "ページが空です（表示されるテキスト、入力フィールド、ボタンがありません）。「エラーを修正」をクリックすると、モデルが目に見えるアプリを作成します。",
    emptyDiagFix:
      "最後に生成されたコードは、空の白いページになっています: 表示されるテキスト、入力フィールド、ボタン、操作要素がありません。要求されたアプリを完全かつ目に見える形で（入力フィールド、ボタン、リスト、または適切な UI 要素を使って）構築し、完全に動作する HTML ファイルを返してください。",
    previewDiagLabel: "⚠ プレビュー診断: ",
    previewDiagIds:
      "この要素 ID は JavaScript で使われていますが、HTML に存在しません: {ids}。「エラーを修正」をクリックすると、モデルが不足している要素を追加します。",
    diagFixIntro:
      "最後に生成されたコードは、HTML に存在しない要素 ID を使用しています: {ids}。不足している要素（テキスト入力用の <input id=\"...\"> など）を追加し、すべての getElementById/querySelector の ID を HTML と一致させ、完全に動作する HTML ファイルを返してください。",
    previewHint: "すべてお使いのデバイス上で実行 – サーバー不要、APIキー不要。",
    confirmNewChat: "現在のチャットを削除しますか？",
    donePreview: "✔ 完了 – アプリはプレビューにあります。",
    done: "✔ 完了。",
    errorPrefix: "エラー: ",
    modelLoadError: "モデルを読み込めませんでした。",
    modelFile: "モデル",
    prevCodeIntro: "現在のコード（これに変更を加えてください）:",
    noCode:
      "⚠ HTMLファイルが作成されませんでした – モデルがコードではなくテキストを出力しました。再試行するか、より大きなモデル（1.5B）を選択してください。",
    genLabel: "生成中 … {pct} %",
    etaFmt: "約{m}分{s}秒",
    tokensFmt: "{n}トークン",
    busyNotes: ["コードを書いています …", "デザインを仕上げています …", "もうすぐ完成 …"],
    examples: [
      { icon: "🌐", label: "ランディングページ", prompt: "営業時間と写真付きのイタリアンカフェ向けモダンなランディングページを作成してください。" },
      { icon: "🐍", label: "ゲーム", prompt: "スコアカウンター、レベル表示、ゲームオーバー画面付きのクラシックなスネークゲームを作成してください。" },
      { icon: "✅", label: "To-Doアプリ", prompt: "追加、チェック、削除、ブラウザへの保存ができるTo-DoリストのWebアプリを作成してください。" },
      { icon: "🧮", label: "電卓", prompt: "キーボード操作と履歴付きの美しい電卓を作成してください。" },
    ],
    system: `あなたは「AI-Coder」、単一のHTMLファイルを生成するツールです。完全で自己完結したウェブアプリケーションを、CSSとJavaScriptを埋め込んだ1つのindex.htmlファイルとして作成してください。

ルール:
- \`\`\`html で始まり \`\`\` で終わる、単一のMarkdownコードブロック内に、完全なHTMLコードのみを出力してください。
- コードブロックの外に説明を書かないでください。
- ビルドツールやサーバーは不要です: すべてブラウザタブ内でオフラインで動作します（vanilla HTML/CSS/JS）。
- CSS変数を使ったモダンで魅力的なデザイン、レスポンシブ（デスクトップ＋モバイル）。
- コードはすぐに実行できるものでなければなりません – プレースホルダーやTODOコメントは禁止です。
- ゲームの場合: スムーズな操作（キーボード/タッチ）、スコア表示、ゲームオーバー画面。
- ウェブサイトの場合: ナビゲーション、複数のセクション、お問い合わせエリア。`,
  },

  /* ————————————————— 中文 ————————————————— */
  zh: {
    subtitle: "通过提示词创建主页、游戏和 Web 应用",
    statusLoadingNoPct: "正在加载模型 …",
    statusLoading: "正在加载模型 … {pct} %",
    statusLoadingEta: "正在加载模型 … {pct} % · 剩余 {eta}",
    statusError: "无法加载模型",
    statusReady: "模型就绪 · 正在浏览器中运行",
    statusReadyGpu: "模型就绪 · 正在浏览器中运行（GPU）",
    statusIdle: "准备加载",
    pendingLoad: "模型正在加载 – 就绪后会自动开始生成。",
    prefill: "正在准备 … 已过去 {s} 秒",
    slowStart:
      "第一步计算异常缓慢。请重新加载页面 – 在性能较弱的设备上启用 ⚡ GPU 选项会有帮助。",
    gpuToggleTitle: "如果有 GPU 则使用 GPU（更快）。没有 GPU 时以 CPU 模式运行。",
    modelSelectTitle: "选择免费浏览器模型",
    langSelectTitle: "选择语言",
    newChat: "✦ 新建",
    tabChat: "聊天",
    tabResult: "结果",
    welcomeTitle: "你想构建什么？",
    welcomeText:
      "简单描述你的需求——主页、游戏或小型 Web 应用。AI 完全在你的设备上运行，并在右侧实时显示代码。",
    hintFree: "100% 免费 · 直接在浏览器中运行 · 无需服务器、无需账号、无需 API 密钥",
    hintFirstLoad: "首次启动时会下载一次模型（{size}），之后缓存在浏览器中。",
    placeholder: '例如："创建一个带计分器的贪吃蛇游戏"',
    submit: "创建 ▶",
    viewPreview: "预览",
    viewCode: "代码",
    openTabTitle: "在新标签页中打开",
    copyTitle: "复制代码",
    downloadTitle: "下载 index.html",
    previewEmpty: "你的结果会在这里实时显示——AI 编写代码的同时。",
    previewErrorLabel: "⚠ 预览脚本错误：",
    fixPromptIntro:
      "最后生成的代码在预览中引发了此错误 – 请修复它并返回完整的、可正常运行的 HTML 文件。错误：",
    fixButton: "🔧 修复错误",
    genFailHint:
      "失败的模型会话已被丢弃 – 下次尝试会重新构建，通常即可正常运行。请再次发送或点击“修复错误”。",
    gpuFailHint: "提示：请停用上方的 GPU 选项后重试（WASM 更稳定）。",
    gpuFallbackNote: "⚠ 生成期间出现 GPU 错误 – 正在自动改用 WASM（CPU）重试…",
    emptyDiagNote:
      "页面为空（没有可见文本、输入框或按钮）。点击“修复错误”，模型将构建一个可见的应用。",
    emptyDiagFix:
      "最后生成的代码产生了一个空白的页面：没有可见文本、输入框、按钮或控件。请完整、可视化地构建所要求的应用（包含输入框、按钮和列表或合适的 UI 元素），并返回完整、可正常运行的 HTML 文件。",
    previewDiagLabel: "⚠ 预览诊断：",
    previewDiagIds:
      "此元素 ID 在 JavaScript 中使用，但 HTML 中不存在：{ids}。点击“修复错误”，模型会补充缺失的元素。",
    diagFixIntro:
      "最后生成的代码使用了 HTML 中不存在的元素 ID：{ids}。请补充缺失的元素（例如用于文本输入的 <input id=\"...\">），使所有 getElementById/querySelector 的 ID 与 HTML 一致，并返回完整、可正常运行的 HTML 文件。",
    previewHint: "完全在你的设备上运行——无需服务器、无需 API 密钥。",
    confirmNewChat: "确定要删除当前聊天吗？",
    donePreview: "✔ 完成——你的应用已在预览中。",
    done: "✔ 完成。",
    errorPrefix: "错误：",
    modelLoadError: "无法加载模型。",
    modelFile: "模型",
    prevCodeIntro: "当前代码（请在此基础上修改）：",
    noCode:
      "⚠ 未生成 HTML 文件——模型输出了文本而非代码。请重试或选择更大的模型（1.5B）。",
    genLabel: "生成中 … {pct} %",
    etaFmt: "约{m}分{s}秒",
    tokensFmt: "{n} 个 Token",
    busyNotes: ["正在编写代码 …", "正在完善设计 …", "即将完成 …"],
    examples: [
      { icon: "🌐", label: "落地页", prompt: "为一个意大利咖啡馆创建一个现代落地页，包含营业时间和照片。" },
      { icon: "🐍", label: "游戏", prompt: "创建一个经典贪吃蛇游戏，包含计分器、等级显示和游戏结束界面。" },
      { icon: "✅", label: "待办应用", prompt: "创建一个待办事项 Web 应用，支持添加、勾选、删除并在浏览器中保存。" },
      { icon: "🧮", label: "计算器", prompt: "创建一个漂亮的计算器，支持键盘操作和历史记录。" },
    ],
    system: `你是 "AI-Coder"，一个生成单个 HTML 文件的工具。请创建完整、自包含的 Web 应用程序，作为一个 index.html 文件，内嵌 CSS 和 JavaScript。

规则：
- 只输出完整的 HTML 代码，放在一个 Markdown 代码块中，以 \`\`\`html 开头，以 \`\`\` 结尾。
- 代码块外不写任何解释。
- 不需要构建工具或服务器：一切都在浏览器标签页中离线运行（原生 HTML/CSS/JS）。
- 使用 CSS 变量，现代、美观的设计，响应式（桌面端 + 移动端）。
- 代码必须立即可运行——不要占位符，不要 TODO 注释。
- 游戏：流畅的操作（键盘/触摸）、分数显示和游戏结束界面。
- 网页：导航、多个版块和联系区域。`,
  },

  /* ————————————————— हिन्दी ————————————————— */
  hi: {
    subtitle: "प्रॉम्प्ट से होमपेज, गेम और वेब ऐप",
    statusLoadingNoPct: "मॉडल लोड हो रहा है …",
    statusLoading: "मॉडल लोड हो रहा है … {pct} %",
    statusLoadingEta: "मॉडल लोड हो रहा है … {pct} % · {eta} शेष",
    statusError: "मॉडल लोड नहीं हो सका",
    statusReady: "मॉडल तैयार · ब्राउज़र में चल रहा है",
    statusReadyGpu: "मॉडल तैयार · ब्राउज़र में चल रहा है (GPU)",
    statusIdle: "लोड करने के लिए तैयार",
    pendingLoad: "मॉडल लोड हो रहा है – तैयार होते ही निर्माण स्वतः शुरू हो जाएगा।",
    prefill: "तैयारी … {s} सेकंड बीत गए",
    slowStart:
      "पहला गणना चरण असामान्य रूप से धीमा है। कृपया पेज फिर से लोड करें – कमज़ोर डिवाइस पर ⚡ GPU विकल्प मदद करता है।",
    gpuToggleTitle: "उपलब्ध होने पर GPU का उपयोग करें (तेज़)। GPU न होने पर सब कुछ CPU मोड में चलता है।",
    modelSelectTitle: "मुफ्त ब्राउज़र मॉडल चुनें",
    langSelectTitle: "भाषा चुनें",
    newChat: "✦ नया",
    tabChat: "चैट",
    tabResult: "परिणाम",
    welcomeTitle: "आप क्या बनाना चाहते हैं?",
    welcomeText:
      "बस बताएं कि आपको क्या चाहिए – होमपेज, गेम या छोटा वेब ऐप। AI पूरी तरह से आपके डिवाइस पर चलती है और दाईं ओर कोड लाइव दिखाती है।",
    hintFree: "100% मुफ्त · सीधे ब्राउज़र में चलता है · न कोई सर्वर, न खाता, न API कुंजी",
    hintFirstLoad: "पहली बार शुरू करने पर मॉडल एक बार डाउनलोड होता है ({size}) और फिर ब्राउज़र में कैश हो जाता है।",
    placeholder: 'जैसे "स्कोर काउंटर के साथ स्नेक गेम बनाएं"',
    submit: "बनाएं ▶",
    viewPreview: "पूर्वावलोकन",
    viewCode: "कोड",
    openTabTitle: "नए टैब में खोलें",
    copyTitle: "कोड कॉपी करें",
    downloadTitle: "index.html डाउनलोड करें",
    previewEmpty: "आपका परिणाम यहाँ दिखाई देगा – AI कोड लिखते समय लाइव।",
    previewErrorLabel: "⚠ पूर्वावलोकन में स्क्रिप्ट त्रुटि: ",
    fixPromptIntro:
      "पिछले जनरेट किए गए कोड से पूर्वावलोकन में यह त्रुटि हो रही है – इसे ठीक करें और पूरी, काम करने वाली HTML फ़ाइल लौटाएं। त्रुटि:",
    fixButton: "🔧 त्रुटि ठीक करें",
    genFailHint:
      "विफल मॉडल सत्र को हटा दिया गया है – अगला प्रयास इसे नए सिरे से बनाता है और आमतौर पर काम करता है। बस फिर से भेजें या „त्रुटि ठीक करें“ पर क्लिक करें।",
    gpuFailHint: "सुझाव: ऊपर GPU विकल्प बंद करके दोबारा प्रयास करें (WASM अधिक स्थिर है)।",
    gpuFallbackNote: "⚠ जनरेशन के दौरान GPU त्रुटि – WASM (CPU) के साथ स्वचालित रूप से पुनः प्रयास किया जा रहा है…",
    emptyDiagNote:
      "पेज खाली है (कोई दृश्यमान टेक्स्ट, कोई इनपुट फ़ील्ड, कोई बटन नहीं)। „त्रुटि ठीक करें“ पर क्लिक करें ताकि मॉडल एक दृश्यमान ऐप बनाए।",
    emptyDiagFix:
      "पिछले जनरेट किए गए कोड से एक खाली, सफेद पेज बनता है: कोई दृश्यमान टेक्स्ट, कोई इनपुट फ़ील्ड, कोई बटन, कोई नियंत्रण नहीं। मांगी गई ऐप को पूरी और दृश्यमान रूप से बनाएं (इनपुट फ़ील्ड, बटन और सूची या उपयुक्त UI तत्वों के साथ) और पूरी, काम करने वाली HTML फ़ाइल लौटाएं।",
    previewDiagLabel: "⚠ पूर्वावलोकन निदान: ",
    previewDiagIds:
      "यह एलिमेंट ID JavaScript में उपयोग होती है, लेकिन HTML में मौजूद नहीं है: {ids}। „त्रुटि ठीक करें“ पर क्लिक करें ताकि मॉडल लापता एलिमेंट जोड़ दे।",
    diagFixIntro:
      "पिछले जनरेट किए गए कोड में वे एलिमेंट IDs उपयोग होती हैं जो HTML में मौजूद नहीं हैं: {ids}। लापता एलिमेंट जोड़ें (जैसे टेक्स्ट इनपुट के लिए <input id=\"...\">), सभी getElementById/querySelector IDs को HTML से मिलाएँ और पूरी, काम करने वाली HTML फ़ाइल लौटाएं।",
    previewHint: "पूरी तरह आपके डिवाइस पर चलता है – न कोई सर्वर, न API कुंजी।",
    confirmNewChat: "क्या आप वाकई वर्तमान चैट हटाना चाहते हैं?",
    donePreview: "✔ हो गया – आपका ऐप पूर्वावलोकन में है।",
    done: "✔ हो गया।",
    errorPrefix: "त्रुटि: ",
    modelLoadError: "मॉडल लोड नहीं हो सका।",
    modelFile: "मॉडल",
    prevCodeIntro: "वर्तमान कोड (इसमें बदलाव करें):",
    noCode:
      "⚠ कोई HTML फ़ाइल नहीं बनी – मॉडल ने कोड की जगह टेक्स्ट दिया। कृपया फिर से प्रयास करें या बड़ा मॉडल (1.5B) चुनें।",
    genLabel: "बना रहे हैं … {pct} %",
    etaFmt: "लगभग {m} मिनट {s} सेकंड",
    tokensFmt: "{n} टोकन",
    busyNotes: ["कोड लिख रहा है …", "डिज़ाइन को अंतिम रूप दे रहा है …", "लगभग तैयार …"],
    examples: [
      { icon: "🌐", label: "लैंडिंग पेज", prompt: "खुलने के समय और तस्वीरों के साथ एक इतालवी कैफ़े के लिए एक आधुनिक लैंडिंग पेज बनाएं।" },
      { icon: "🐍", label: "गेम", prompt: "स्कोर काउंटर, लेवल डिस्प्ले और गेम-ओवर स्क्रीन के साथ एक क्लासिक स्नेक गेम बनाएं।" },
      { icon: "✅", label: "टू-डू ऐप", prompt: "एक टू-डू लिस्ट वेब ऐप बनाएं जिसमें जोड़ना, टिक करना, हटाना और ब्राउज़र में सेव करना हो।" },
      { icon: "🧮", label: "कैलकुलेटर", prompt: "कीबोर्ड नियंत्रण और इतिहास के साथ एक सुंदर कैलकुलेटर बनाएं।" },
    ],
    system: `आप "AI-Coder" हैं, जो एकल HTML फ़ाइलें बनाने वाला एक टूल है। आप CSS और JavaScript के साथ एक index.html फ़ाइल के रूप में पूर्ण, स्व-निहित वेब एप्लिकेशन बनाते हैं।

नियम:
- केवल पूरा HTML कोड आउटपुट करें, एक Markdown कोड ब्लॉक में जो \`\`\`html से शुरू होता है और \`\`\` पर समाप्त होता है।
- कोड ब्लॉक के बाहर कोई स्पष्टीकरण नहीं।
- कोई बिल्ड टूल या सर्वर नहीं चाहिए: सब कुछ ब्राउज़र टैब में ऑफ़लाइन चलता है (वेनिला HTML/CSS/JS)।
- CSS वेरिएबल्स के साथ आधुनिक, आकर्षक डिज़ाइन, रिस्पॉन्सिव (डेस्कटॉप + मोबाइल)।
- कोड तुरंत चलने योग्य होना चाहिए – कोई प्लेसहोल्डर नहीं, कोई TODO टिप्पणी नहीं।
- गेम के लिए: स्मूथ कंट्रोल (कीबोर्ड/टच), स्कोर डिस्प्ले और गेम-ओवर स्क्रीन।
- वेबसाइट के लिए: नेविगेशन, कई सेक्शन और संपर्क क्षेत्र।`,
  },

  /* ————————————————— Français ————————————————— */
  fr: {
    subtitle: "Pages d'accueil, jeux et applications web à partir d'un prompt",
    statusLoadingNoPct: "Chargement du modèle …",
    statusLoading: "Chargement du modèle … {pct} %",
    statusLoadingEta: "Chargement du modèle … {pct} % · encore {eta}",
    statusError: "Le modèle n'a pas pu être chargé",
    statusReady: "Modèle prêt · tourne dans le navigateur",
    statusReadyGpu: "Modèle prêt · tourne dans le navigateur (GPU)",
    statusIdle: "prêt à charger",
    pendingLoad: "Le modèle se charge – la génération démarrera automatiquement dès qu'il sera prêt.",
    prefill: "Préparation … depuis {s} s",
    slowStart:
      "La première étape de calcul prend anormalement longtemps. Veuillez recharger la page – sur les appareils plus faibles, l'option ⚡ GPU aide.",
    gpuToggleTitle: "Utiliser le GPU si disponible (plus rapide). Sans GPU, tout fonctionne en mode CPU.",
    modelSelectTitle: "Choisir un modèle gratuit dans le navigateur",
    langSelectTitle: "Choisir la langue",
    newChat: "✦ Nouveau",
    tabChat: "Discussion",
    tabResult: "Résultat",
    welcomeTitle: "Que veux-tu créer ?",
    welcomeText:
      "Décris simplement ce dont tu as besoin – page d'accueil, jeu ou petite application web. L'IA tourne entièrement sur cet appareil et t'affiche le code en direct à droite.",
    hintFree: "100 % gratuit · fonctionne directement dans le navigateur · sans serveur, sans compte, sans clé API",
    hintFirstLoad:
      "Au premier démarrage, le modèle est téléchargé une seule fois ({size}) puis mis en cache dans le navigateur.",
    placeholder: 'ex. "Crée un jeu Snake avec un compteur de points"',
    submit: "Créer ▶",
    viewPreview: "Aperçu",
    viewCode: "Code",
    openTabTitle: "Ouvrir dans un nouvel onglet",
    copyTitle: "Copier le code",
    downloadTitle: "Télécharger index.html",
    previewEmpty: "Ton résultat apparaît ici – en direct pendant que l'IA écrit le code.",
    previewErrorLabel: "⚠ Erreur de script dans l'aperçu : ",
    fixPromptIntro:
      "Le dernier code généré provoque cette erreur dans l'aperçu – corrige-la et renvoie le fichier HTML complet et fonctionnel. Erreur :",
    fixButton: "🔧 Corriger l'erreur",
    genFailHint:
      "La session de modèle ayant échoué a été supprimée – la prochaine tentative la reconstruit et fonctionne généralement. Il suffit de renvoyer ou de cliquer sur « Corriger l'erreur ».",
    gpuFailHint: "Astuce : désactivez l'option GPU ci-dessus et réessayez (WASM est plus stable).",
    gpuFallbackNote: "⚠ Erreur GPU pendant la génération – nouvelle tentative automatique avec WASM (CPU) …",
    emptyDiagNote:
      "La page est vide (aucun texte visible, aucun champ de saisie, aucun bouton). Cliquez sur « Corriger l'erreur » pour que le modèle crée une application visible.",
    emptyDiagFix:
      "Le dernier code généré donne une page vide et blanche : aucun texte visible, aucun champ de saisie, aucun bouton, aucun élément de contrôle. Construis l'application demandée de manière complète et visible (avec champ de saisie, boutons et liste ou éléments d'interface appropriés) et renvoie le fichier HTML complet et fonctionnel.",
    previewDiagLabel: "⚠ Diagnostic de l'aperçu : ",
    previewDiagIds:
      "Cet ID d'élément est utilisé par le JavaScript mais est absent du HTML : {ids}. Cliquez sur « Corriger l'erreur » pour que le modèle ajoute l'élément manquant.",
    diagFixIntro:
      "Le dernier code généré utilise des IDs d'éléments qui n'existent pas dans le HTML : {ids}. Ajoute les éléments manquants (par ex. un <input id=\"...\"> pour la saisie de texte), fais correspondre tous les IDs getElementById/querySelector avec le HTML et renvoie le fichier HTML complet et fonctionnel.",
    previewHint: "Fonctionne entièrement sur ton appareil – sans serveur, sans clé API.",
    confirmNewChat: "Vraiment supprimer la discussion actuelle ?",
    donePreview: "✔ Terminé – ton application est dans l'aperçu.",
    done: "✔ Terminé.",
    errorPrefix: "Erreur : ",
    modelLoadError: "Le modèle n'a pas pu être chargé.",
    modelFile: "modèle",
    prevCodeIntro: "Code actuel (apporte des modifications) :",
    noCode:
      "⚠ Aucun fichier HTML créé – le modèle a renvoyé du texte au lieu de code. Réessayez ou choisissez le modèle plus grand (1.5B).",
    genLabel: "Génération … {pct} %",
    etaFmt: "environ {m} min {s} s",
    tokensFmt: "{n} jetons",
    busyNotes: ["Écrit le code …", "Peaufine le design …", "Presque terminé …"],
    examples: [
      { icon: "🌐", label: "Page d'accueil", prompt: "Crée une page d'accueil moderne pour un café italien avec horaires d'ouverture et photos." },
      { icon: "🐍", label: "Jeu", prompt: "Crée un jeu Snake classique avec compteur de points, affichage du niveau et écran de fin de partie." },
      { icon: "✅", label: "To-do list", prompt: "Crée une application web de liste de tâches avec ajout, validation, suppression et sauvegarde dans le navigateur." },
      { icon: "🧮", label: "Calculatrice", prompt: "Crée une belle calculatrice avec contrôle au clavier et historique." },
    ],
    system: `Tu es "AI-Coder", un générateur de fichiers HTML uniques. Tu crées des applications web complètes et autonomes sous la forme d'UN fichier index.html avec CSS et JavaScript intégrés.

Règles :
- Produis uniquement le code HTML complet, dans un seul bloc de code Markdown commençant par \`\`\`html et se terminant par \`\`\`.
- Aucune explication en dehors du bloc de code.
- Aucun outil de build ni serveur nécessaire : tout fonctionne hors ligne dans un onglet du navigateur (HTML/CSS/JS pur).
- Design moderne et attrayant avec variables CSS, responsive (desktop + mobile).
- Le code doit fonctionner immédiatement – pas d'espaces réservés, pas de commentaires TODO.
- Pour les jeux : contrôles fluides (clavier/tactile), affichage du score et écran de fin de partie.
- Pour les sites web : navigation, plusieurs sections et zone de contact.`,
  },

  /* ————————————————— Español ————————————————— */
  es: {
    subtitle: "Páginas de inicio, juegos y aplicaciones web a partir de un prompt",
    statusLoadingNoPct: "Cargando el modelo …",
    statusLoading: "Cargando el modelo … {pct} %",
    statusLoadingEta: "Cargando el modelo … {pct} % · quedan {eta}",
    statusError: "El modelo no pudo cargarse",
    statusReady: "Modelo listo · funciona en el navegador",
    statusReadyGpu: "Modelo listo · funciona en el navegador (GPU)",
    statusIdle: "listo para cargar",
    pendingLoad: "El modelo se está cargando: la generación comenzará automáticamente cuando esté listo.",
    prefill: "Preparando … desde hace {s} s",
    slowStart:
      "El primer paso de cálculo tarda inusualmente mucho. Recarga la página: en dispositivos débiles ayuda la opción ⚡ GPU.",
    gpuToggleTitle: "Usar GPU si está disponible (más rápido). Sin GPU, todo funciona en modo CPU.",
    modelSelectTitle: "Elegir un modelo gratuito en el navegador",
    langSelectTitle: "Elegir idioma",
    newChat: "✦ Nuevo",
    tabChat: "Chat",
    tabResult: "Resultado",
    welcomeTitle: "¿Qué quieres crear?",
    welcomeText:
      "Describe simplemente lo que necesitas – página de inicio, juego o pequeña aplicación web. La IA funciona por completo en este dispositivo y te muestra el código en vivo a la derecha.",
    hintFree: "100 % gratis · funciona directamente en el navegador · sin servidor, sin cuenta, sin clave API",
    hintFirstLoad:
      "En el primer inicio, el modelo se descarga una sola vez ({size}) y luego se guarda en la caché del navegador.",
    placeholder: 'p. ej. "Crea un juego de la serpiente con marcador"',
    submit: "Crear ▶",
    viewPreview: "Vista previa",
    viewCode: "Código",
    openTabTitle: "Abrir en una pestaña nueva",
    copyTitle: "Copiar código",
    downloadTitle: "Descargar index.html",
    previewEmpty: "Tu resultado aparece aquí – en vivo mientras la IA escribe el código.",
    previewErrorLabel: "⚠ Error de script en la vista previa: ",
    fixPromptIntro:
      "El último código generado provoca este error en la vista previa: corrígelo y devuelve el archivo HTML completo y funcional. Error:",
    fixButton: "🔧 Corregir error",
    genFailHint:
      "La sesión de modelo fallida se ha descartado: el siguiente intento la reconstruye desde cero y suele funcionar. Simplemente envía de nuevo o haz clic en « Corregir error ».",
    gpuFailHint: "Consejo: desactiva la opción de GPU de arriba y vuelve a intentarlo (WASM es más estable).",
    gpuFallbackNote: "⚠ Error de GPU durante la generación: reintentando automáticamente con WASM (CPU) …",
    emptyDiagNote:
      "La página está vacía (sin texto visible, sin campo de entrada, sin botones). Haz clic en « Corregir error » para que el modelo construya una aplicación visible.",
    emptyDiagFix:
      "El último código generado produce una página vacía y en blanco: sin texto visible, sin campo de entrada, sin botones, sin controles. Construye la aplicación solicitada de forma completa y visible (con campo de entrada, botones y lista o elementos de interfaz adecuados) y devuelve el archivo HTML completo y funcional.",
    previewDiagLabel: "⚠ Diagnóstico de la vista previa: ",
    previewDiagIds:
      "Este ID de elemento lo usa el JavaScript, pero no existe en el HTML: {ids}. Haz clic en « Corregir error » para que el modelo añada el elemento que falta.",
    diagFixIntro:
      "El último código generado usa IDs de elementos que no existen en el HTML: {ids}. Añade los elementos que faltan (p. ej. un <input id=\"...\"> para escribir texto), haz que todos los IDs de getElementById/querySelector coincidan con el HTML y devuelve el archivo HTML completo y funcional.",
    previewHint: "Funciona por completo en tu dispositivo – sin servidor, sin clave API.",
    confirmNewChat: "¿Seguro que quieres borrar el chat actual?",
    donePreview: "✔ Listo – tu aplicación está en la vista previa.",
    done: "✔ Listo.",
    errorPrefix: "Error: ",
    modelLoadError: "El modelo no pudo cargarse.",
    modelFile: "modelo",
    prevCodeIntro: "Código actual (haz cambios en él):",
    noCode:
      "⚠ No se creó un archivo HTML: el modelo devolvió texto en lugar de código. Inténtalo de nuevo o elige el modelo más grande (1.5B).",
    genLabel: "Generando … {pct} %",
    etaFmt: "unos {m} min {s} s",
    tokensFmt: "{n} tokens",
    busyNotes: ["Escribiendo código …", "Puliendo el diseño …", "Casi listo …"],
    examples: [
      { icon: "🌐", label: "Página de inicio", prompt: "Crea una página de inicio moderna para un café italiano con horarios y fotos." },
      { icon: "🐍", label: "Juego", prompt: "Crea un juego clásico de la serpiente con marcador, nivel y pantalla de fin de juego." },
      { icon: "✅", label: "Lista de tareas", prompt: "Crea una aplicación web de lista de tareas con añadir, marcar, borrar y guardar en el navegador." },
      { icon: "🧮", label: "Calculadora", prompt: "Crea una bonita calculadora con control por teclado e historial." },
    ],
    system: `Eres "AI-Coder", un generador de archivos HTML individuales. Creas aplicaciones web completas y autónomas como UN archivo index.html con CSS y JavaScript integrados.

Reglas:
- Produce únicamente el código HTML completo, en un solo bloque de código Markdown que empiece con \`\`\`html y termine con \`\`\`.
- Sin explicaciones fuera del bloque de código.
- No se necesitan herramientas de compilación ni servidores: todo funciona sin conexión en una pestaña del navegador (HTML/CSS/JS puro).
- Diseño moderno y atractivo con variables CSS, responsive (escritorio + móvil).
- El código debe funcionar de inmediato – sin marcadores de posición, sin comentarios TODO.
- Para juegos: controles fluidos (teclado/táctil), marcador y pantalla de fin de juego.
- Para sitios web: navegación, varias secciones y zona de contacto.`,
  },

  /* ————————————————— Kiswahili ————————————————— */
  sw: {
    subtitle: "Kurasa za nyumbani, michezo na programu za wavuti kwa prompt",
    statusLoadingNoPct: "Inapakia mfano …",
    statusLoading: "Inapakia mfano … {pct} %",
    statusLoadingEta: "Inapakia mfano … {pct} % · imesalia {eta}",
    statusError: "Mfano haukuweza kupakiwa",
    statusReady: "Mfano uko tayari · unafanya kazi kwenye kivinjari",
    statusReadyGpu: "Mfano uko tayari · unafanya kazi kwenye kivinjari (GPU)",
    statusIdle: "tayari kupakia",
    pendingLoad: "Mfano unapakia – uundaji utaanza kiotomatiki ukishatayari.",
    prefill: "Kutayarisha … kwa sekunde {s}",
    slowStart:
      "Hatua ya kwanza ya hesabu inachukua muda mrefu mno. Tafadhali pakia upya ukurasa – kwenye vifaa dhaifu chaguo la ⚡ GPU husaidia.",
    gpuToggleTitle: "Tumia GPU ikiwa inapatikana (haraka zaidi). Bila GPU kila kitu kinafanya kazi kwa njia ya CPU.",
    modelSelectTitle: "Chagua mfano wa bure wa kivinjari",
    langSelectTitle: "Chagua lugha",
    newChat: "✦ Mpya",
    tabChat: "Mazungumzo",
    tabResult: "Matokeo",
    welcomeTitle: "Unataka kuunda nini?",
    welcomeText:
      "Eleza tu kile unachohitaji – ukurasa wa nyumbani, mchezo au programu ndogo ya wavuti. AI inafanya kazi kabisa kwenye kifaa chako na inakuonyesha msimbo moja kwa moja upande wa kulia.",
    hintFree: "Bure 100 % · inafanya kazi moja kwa moja kwenye kivinjari · hakuna seva, hakuna akaunti, hakuna ufunguo wa API",
    hintFirstLoad:
      "Mara ya kwanza mfano unapakuliwa mara moja ({size}) kisha unahifadhiwa kwenye kache ya kivinjari.",
    placeholder: 'mf. "Unda mchezo wa nyoka wenye alama"',
    submit: "Unda ▶",
    viewPreview: "Hakiki",
    viewCode: "Msimbo",
    openTabTitle: "Fungua kwenye kichupo kipya",
    copyTitle: "Nakili msimbo",
    downloadTitle: "Pakua index.html",
    previewEmpty: "Matokeo yako yataonekana hapa – moja kwa moja huku AI ikiandika msimbo.",
    previewErrorLabel: "⚠ Hitilafu ya hati katika onyesho: ",
    fixPromptIntro:
      "Msimbo wa mwisho uliozalishwa unasababisha hitilafu hii katika onyesho – lisahihishe na urudishe faili kamili la HTML linalofanya kazi. Hitilafu:",
    fixButton: "🔧 Sahihisha hitilafu",
    genFailHint:
      "Kika cha mfano kilichoshindwa kimetupwa – jaribio linalofuata linajenga upya na kwa kawaida hufanya kazi. Tuma tena au bofya „Sahihisha hitilafu“.",
    gpuFailHint: "Kidokezo: zima chaguo la GPU hapo juu na ujaribu tena (WASM ni thabiti zaidi).",
    gpuFallbackNote: "⚠ Hitilafu ya GPU wakati wa utengenezaji – inajaribu tena kiotomatiki kwa WASM (CPU) …",
    emptyDiagNote:
      "Ukurasa ni tupu (hakuna maandishi yanayoonekana, hakuna sehemu ya kuingiza, hakuna vitufe). Bofya „Sahihisha hitilafu“ ili muundo uunde programu inayoonekana.",
    emptyDiagFix:
      "Msimbo wa mwisho uliozalishwa unatoa ukurasa tupu na mweupe: hakuna maandishi yanayoonekana, hakuna sehemu ya kuingiza, hakuna kitufe, hakuna vidhibiti. Jenga programu iliyoombwa kikamilifu na inayoonekana (kwa sehemu ya kuingiza, vitufe na orodha au vipengele vinavyofaa vya UI) na urudishe faili kamili la HTML linalofanya kazi.",
    previewDiagLabel: "⚠ Utambuzi wa onyesho: ",
    previewDiagIds:
      "Kitambulisho hiki cha kipengele kinatumiwa na JavaScript lakini hakipo kwenye HTML: {ids}. Bofya „Sahihisha hitilafu“ ili muundo uongeze kipengele kinachokosekana.",
    diagFixIntro:
      "Msimbo wa mwisho uliozalishwa unatumia vitambulisho vya vitu ambavyo havipo kwenye HTML: {ids}. Ongeza vipengele vinavyokosekana (k.m. <input id=\"...\"> kwa maingizo ya maandishi), linganisha vitambulisho vyote vya getElementById/querySelector na HTML na urudishe faili kamili la HTML linalofanya kazi.",
    previewHint: "Yanaendelea kabisa kwenye kifaa chako – hakuna seva, hakuna ufunguo wa API.",
    confirmNewChat: "Kweli unataka kufuta mazungumzo ya sasa?",
    donePreview: "✔ Imekamilika – programu yako iko kwenye hakiki.",
    done: "✔ Imekamilika.",
    errorPrefix: "Hitilafu: ",
    modelLoadError: "Mfano haukuweza kupakiwa.",
    modelFile: "mfano",
    prevCodeIntro: "Msimbo wa sasa (fanya mabadiliko juu yake):",
    noCode:
      "⚠ Hakuna faili la HTML lililoundwa – mfano ulitoa maandishi badala ya msimbo. Jaribu tena au chagua mfano mkubwa (1.5B).",
    genLabel: "Inaunda … {pct} %",
    etaFmt: "takriban {m} dk {s} sek",
    tokensFmt: "ishara {n}",
    busyNotes: ["Inaandika msimbo …", "Inamaliza muundo …", "Karibu kumaliza …"],
    examples: [
      { icon: "🌐", label: "Ukurasa wa nyumbani", prompt: "Unda ukurasa wa kisasa wa kivutio kwa mkahawa wa Kiitaliano wenye saa za kufunguliwa na picha." },
      { icon: "🐍", label: "Mchezo", prompt: "Unda mchezo wa kawaida wa nyoka wenye alama, kiwango na skrini ya mwisho wa mchezo." },
      { icon: "✅", label: "Orodha ya kazi", prompt: "Unda programu ya wavuti ya orodha ya kazi yenye kuongeza, kuweka alama, kufuta na kuhifadhi kwenye kivinjari." },
      { icon: "🧮", label: "Kikokotoo", prompt: "Unda kikokotoo kizuri chenye udhibiti wa kibodi na historia." },
    ],
    system: `Wewe ni "AI-Coder", kiinjinia cha kuzalisha faili za HTML moja. Unaunda programu kamili za wavuti zinazojitegemea kama faili MOJA ya index.html yenye CSS na JavaScript zilizowekwa ndani.

Sheria:
- Toa tu msimbo kamili wa HTML, katika kizuizi kimoja cha msimbo cha Markdown kinachoanza na \`\`\`html na kuishia na \`\`\`.
- Hakuna maelezo nje ya kizuizi cha msimbo.
- Hakuna zana za ujenzi au seva zinazohitajika: kila kitu kinafanya kazi nje ya mtandao kwenye kichupo cha kivinjari (HTML/CSS/JS safi).
- Muundo wa kisasa, wa kuvutia wenye vigeu vya CSS, responsive (desktop + simu).
- Msimbo lazima ufanye kazi mara moja – hakuna maeneo ya mabaki, hakuna maoni ya TODO.
- Kwa michezo: udhibiti laini (kibodi/kugusa), alama na skrini ya mwisho wa mchezo.
- Kwa tovuti: urambazaji, sehemu nyingi na eneo la mawasiliano.`,
  },

  /* ————————————————— Italiano ————————————————— */
  it: {
    subtitle: "Homepage, giochi e web app da un prompt",
    statusLoadingNoPct: "Caricamento del modello …",
    statusLoading: "Caricamento del modello … {pct} %",
    statusLoadingEta: "Caricamento del modello … {pct} % · mancano {eta}",
    statusError: "Impossibile caricare il modello",
    statusReady: "Modello pronto · gira nel browser",
    statusReadyGpu: "Modello pronto · gira nel browser (GPU)",
    statusIdle: "pronto per il caricamento",
    pendingLoad: "Il modello si sta caricando: la generazione partirà automaticamente quando sarà pronto.",
    prefill: "Preparazione … da {s} s",
    slowStart:
      "Il primo passaggio di calcolo sta richiedendo molto più tempo del previsto. Ricarica la pagina: sui dispositivi meno potenti aiuta l'opzione ⚡ GPU.",
    gpuToggleTitle: "Usa la GPU se disponibile (più veloce). Senza GPU tutto gira in modalità CPU.",
    modelSelectTitle: "Scegli un modello gratuito nel browser",
    langSelectTitle: "Scegli la lingua",
    newChat: "✦ Nuovo",
    tabChat: "Chat",
    tabResult: "Risultato",
    welcomeTitle: "Cosa vuoi creare?",
    welcomeText:
      "Descrivi semplicemente ciò di cui hai bisogno – homepage, gioco o piccola web app. L'IA gira interamente su questo dispositivo e ti mostra il codice in tempo reale a destra.",
    hintFree: "100 % gratuito · gira direttamente nel browser · niente server, niente account, niente chiave API",
    hintFirstLoad:
      "Al primo avvio il modello viene scaricato una sola volta ({size}) e poi messo in cache nel browser.",
    placeholder: 'es. "Crea un gioco Snake con il punteggio"',
    submit: "Crea ▶",
    viewPreview: "Anteprima",
    viewCode: "Codice",
    openTabTitle: "Apri in una nuova scheda",
    copyTitle: "Copia il codice",
    downloadTitle: "Scarica index.html",
    previewEmpty: "Il tuo risultato appare qui – in tempo reale mentre l'IA scrive il codice.",
    previewErrorLabel: "⚠ Errore di script nell'anteprima: ",
    fixPromptIntro:
      "L'ultimo codice generato causa questo errore nell'anteprima – correggilo e restituisci il file HTML completo e funzionante. Errore:",
    fixButton: "🔧 Correggi errore",
    genFailHint:
      "La sessione del modello non riuscita è stata scartata: il prossimo tentativo la ricostruisce da zero e di solito funziona. Basta inviare di nuovo o cliccare su « Correggi errore ».",
    gpuFailHint: "Suggerimento: disattiva l'opzione GPU qui sopra e riprova (WASM è più stabile).",
    gpuFallbackNote: "⚠ Errore GPU durante la generazione – riprovo automaticamente con WASM (CPU) …",
    emptyDiagNote:
      "La pagina è vuota (nessun testo visibile, nessun campo di inserimento, nessun pulsante). Clicca su « Correggi errore » per far creare al modello un'applicazione visibile.",
    emptyDiagFix:
      "L'ultimo codice generato produce una pagina vuota e bianca: nessun testo visibile, nessun campo di inserimento, nessun pulsante, nessun controllo. Costruisci l'app richiesta in modo completo e visibile (con campo di inserimento, pulsanti ed elenco o elementi UI appropriati) e restituisci il file HTML completo e funzionante.",
    previewDiagLabel: "⚠ Diagnosi dell'anteprima: ",
    previewDiagIds:
      "Questo ID di elemento è usato dal JavaScript ma non esiste nell'HTML: {ids}. Clicca su « Correggi errore » per far aggiungere al modello l'elemento mancante.",
    diagFixIntro:
      "L'ultimo codice generato usa ID di elementi che non esistono nell'HTML: {ids}. Aggiungi gli elementi mancanti (es. un <input id=\"...\"> per l'immissione di testo), fai corrispondere tutti gli ID di getElementById/querySelector all'HTML e restituisci il file HTML completo e funzionante.",
    previewHint: "Gira interamente sul tuo dispositivo – niente server, niente chiave API.",
    confirmNewChat: "Vuoi davvero eliminare la chat attuale?",
    donePreview: "✔ Fatto – la tua app è nell'anteprima.",
    done: "✔ Fatto.",
    errorPrefix: "Errore: ",
    modelLoadError: "Impossibile caricare il modello.",
    modelFile: "modello",
    prevCodeIntro: "Codice attuale (apportaci delle modifiche):",
    noCode:
      "⚠ Nessun file HTML creato – il modello ha restituito testo invece di codice. Riprova o scegli il modello più grande (1.5B).",
    genLabel: "Generazione … {pct} %",
    etaFmt: "circa {m} min {s} s",
    tokensFmt: "{n} token",
    busyNotes: ["Scrive codice …", "Rifinisce il design …", "Quasi pronto …"],
    examples: [
      { icon: "🌐", label: "Landing page", prompt: "Crea una landing page moderna per un caffè italiano con orari di apertura e foto." },
      { icon: "🐍", label: "Gioco", prompt: "Crea un classico gioco Snake con punteggio, livello e schermata di fine partita." },
      { icon: "✅", label: "To-do list", prompt: "Crea un'app web di elenco attività con aggiunta, spunta, eliminazione e salvataggio nel browser." },
      { icon: "🧮", label: "Calcolatrice", prompt: "Crea una bella calcolatrice con controllo da tastiera e cronologia." },
    ],
    system: `Sei "AI-Coder", un generatore di singoli file HTML. Crei applicazioni web complete e autonome come UN unico file index.html con CSS e JavaScript incorporati.

Regole:
- Emetti solo il codice HTML completo, in un unico blocco di codice Markdown che inizia con \`\`\`html e termina con \`\`\`.
- Nessuna spiegazione fuori dal blocco di codice.
- Nessun tool di build o server necessario: tutto gira offline in una scheda del browser (HTML/CSS/JS puro).
- Design moderno e accattivante con variabili CSS, responsive (desktop + mobile).
- Il codice deve funzionare subito – niente segnaposto, niente commenti TODO.
- Per i giochi: controlli fluidi (tastiera/touch), punteggio e schermata di fine partita.
- Per i siti web: navigazione, più sezioni e area contatti.`,
  },

  /* ————————————————— Türkçe ————————————————— */
  tr: {
    subtitle: "Prompt ile ana sayfalar, oyunlar ve web uygulamaları",
    statusLoadingNoPct: "Model yükleniyor …",
    statusLoading: "Model yükleniyor … {pct} %",
    statusLoadingEta: "Model yükleniyor … {pct} % · {eta} kaldı",
    statusError: "Model yüklenemedi",
    statusReady: "Model hazır · tarayıcıda çalışıyor",
    statusReadyGpu: "Model hazır · tarayıcıda çalışıyor (GPU)",
    statusIdle: "yüklenmeye hazır",
    pendingLoad: "Model yükleniyor – hazır olduğunda oluşturma otomatik başlayacak.",
    prefill: "Hazırlanıyor … {s} saniyedir",
    slowStart:
      "İlk hesaplama adımı alışılmadık şekilde uzun sürüyor. Lütfen sayfayı yenileyin – zayıf cihazlarda ⚡ GPU seçeneği yardımcı olur.",
    gpuToggleTitle: "Varsa GPU kullan (daha hızlı). GPU yoksa her şey CPU modunda çalışır.",
    modelSelectTitle: "Ücretsiz tarayıcı modeli seç",
    langSelectTitle: "Dil seç",
    newChat: "✦ Yeni",
    tabChat: "Sohbet",
    tabResult: "Sonuç",
    welcomeTitle: "Ne oluşturmak istiyorsun?",
    welcomeText:
      "İhtiyacın olanı basitçe açıkla – ana sayfa, oyun veya küçük bir web uygulaması. Yapay zekâ tamamen bu cihazda çalışır ve kodu sağda canlı olarak gösterir.",
    hintFree: "%100 ücretsiz · doğrudan tarayıcıda çalışır · sunucu yok, hesap yok, API anahtarı yok",
    hintFirstLoad: "İlk açılışta model bir kez indirilir ({size}) ve sonra tarayıcıda önbelleğe alınır.",
    placeholder: 'ör. "Puan sayaçlı bir yılan oyunu oluştur"',
    submit: "Oluştur ▶",
    viewPreview: "Önizleme",
    viewCode: "Kod",
    openTabTitle: "Yeni sekmede aç",
    copyTitle: "Kodu kopyala",
    downloadTitle: "index.html indir",
    previewEmpty: "Sonucun burada görünür – yapay zekâ kodu yazarken canlı olarak.",
    previewErrorLabel: "⚠ Önizlemede betik hatası: ",
    fixPromptIntro:
      "Son oluşturulan kod önizlemede şu hataya neden oluyor – hatayı düzelt ve eksiksiz, çalışan HTML dosyasını geri döndür. Hata:",
    fixButton: "🔧 Hatayı düzelt",
    genFailHint:
      "Başarısız model oturumu atıldı – bir sonraki deneme onu sıfırdan oluşturur ve genellikle çalışır. Tekrar gönderin veya „Hatayı düzelt“e tıklayın.",
    gpuFailHint: "İpucu: Yukarıdaki GPU seçeneğini kapatıp tekrar deneyin (WASM daha stabildir).",
    gpuFallbackNote: "⚠ Oluşturma sırasında GPU hatası – WASM (CPU) ile otomatik yeniden deneniyor…",
    emptyDiagNote:
      "Sayfa boş (görünür metin, giriş alanı veya düğme yok). Modelin görünür bir uygulama oluşturması için „Hatayı düzelt“e tıklayın.",
    emptyDiagFix:
      "Son oluşturulan kod boş, beyaz bir sayfa oluşturuyor: görünür metin yok, giriş alanı yok, düğme yok, kontrol öğesi yok. İstenen uygulamayı eksiksiz ve görünür şekilde (giriş alanı, düğmeler ve liste veya uygun UI öğeleriyle) oluştur ve eksiksiz, çalışan HTML dosyasını geri döndür.",
    previewDiagLabel: "⚠ Önizleme teşhisi: ",
    previewDiagIds:
      "Bu öğe Kimliği JavaScript tarafından kullanılıyor ancak HTML'de yok: {ids}. Modelin eksik öğeyi eklemesi için „Hatayı düzelt“e tıklayın.",
    diagFixIntro:
      "Son oluşturulan kod, HTML'de bulunmayan öğe Kimliklerini kullanıyor: {ids}. Eksik öğeleri ekle (ör. metin girişi için <input id=\"...\">), tüm getElementById/querySelector Kimliklerini HTML ile eşleştir ve eksiksiz, çalışan HTML dosyasını geri döndür.",
    previewHint: "Tamamen cihazında çalışır – sunucu yok, API anahtarı yok.",
    confirmNewChat: "Mevcut sohbeti gerçekten silmek istiyor musun?",
    donePreview: "✔ Tamam – uygulaman önizlemede.",
    done: "✔ Tamam.",
    errorPrefix: "Hata: ",
    modelLoadError: "Model yüklenemedi.",
    modelFile: "model",
    prevCodeIntro: "Mevcut kod (bunun üzerinde değişiklik yap):",
    noCode:
      "⚠ HTML dosyası oluşturulmadı – model kod yerine metin üretti. Lütfen tekrar deneyin veya daha büyük modeli (1.5B) seçin.",
    genLabel: "Oluşturuluyor … {pct} %",
    etaFmt: "yaklaşık {m} dk {s} sn",
    tokensFmt: "{n} token",
    busyNotes: ["Kod yazıyor …", "Tasarımı bitiriyor …", "Neredeyse hazır …"],
    examples: [
      { icon: "🌐", label: "Açılış sayfası", prompt: "Açılış saatleri ve fotoğraflarla bir İtalyan kafesi için modern bir açılış sayfası oluştur." },
      { icon: "🐍", label: "Oyun", prompt: "Puan sayacı, seviye göstergesi ve oyun sonu ekranıyla klasik bir yılan oyunu oluştur." },
      { icon: "✅", label: "Yapılacaklar", prompt: "Tarayıcıda ekleme, işaretleme, silme ve kaydetme özellikli bir yapılacaklar listesi web uygulaması oluştur." },
      { icon: "🧮", label: "Hesap makinesi", prompt: "Klavye kontrolü ve geçmişi olan şık bir hesap makinesi oluştur." },
    ],
    system: `Sen "AI-Coder"sın, tek bir HTML dosyası üreten bir araçsın. CSS ve JavaScript gömülü TEK bir index.html dosyası olarak eksiksiz, kendi kendine yeten web uygulamaları oluşturursun.

Kurallar:
- Yalnızca tam HTML kodunu, \`\`\`html ile başlayıp \`\`\` ile biten tek bir Markdown kod bloğu içinde çıkar.
- Kod bloğunun dışında hiçbir açıklama yok.
- Derleme aracı veya sunucu gerekmez: her şey bir tarayıcı sekmesinde çevrimdışı çalışır (saf HTML/CSS/JS).
- CSS değişkenleriyle modern, çekici tasarım, duyarlı (masaüstü + mobil).
- Kod hemen çalışabilir olmalı – yer tutucu yok, TODO yorumu yok.
- Oyunlar için: akıcı kontrol (klavye/dokunmatik), puan göstergesi ve oyun sonu ekranı.
- Web siteleri için: gezinme, birden çok bölüm ve iletişim alanı.`,
  },
};

const BROWSER_MODELS: BrowserModel[] = [
  { id: "onnx-community/Qwen2.5-Coder-0.5B-Instruct", label: "Qwen Coder 0.5B", size: "≈ 500 MB" },
  { id: "onnx-community/Qwen2.5-Coder-1.5B-Instruct", label: "Qwen Coder 1.5B", size: "≈ 1 GB" },
];
const DEFAULT_MODEL = BROWSER_MODELS[0].id;
const STORAGE_KEY = "ai-coder.v2";
const MAX_TOKENS = 2048;

// Prolog für die Vorschau-Iframe. Zwei Aufgaben:
// 1) localStorage/sessionStorage-Ersatz, falls das iframe keine gleiche Origin hat –
//    sonst bricht ein Highscore-/Speicher-Zugriff das komplette Spiel-Skript ab
//    („Start"-Button tut dann nichts).
// 2) Skriptfehler in der Vorschau an die App melden (wird über dem iframe angezeigt).
const PREVIEW_SHIM = `
<script>
(function(){
  // Häufigster Modell-Fehler: undeklarierte Variablen wie \`interval\`, \`timer\`, \`raf\` …
  // vorbelegen, damit Lesen UND Schreiben nicht crashen (auch unter "use strict",
  // wo die Zuweisung an eine vorhandene globale Eigenschaft erlaubt ist).
  // Auch typische Objekt-/Game-Namen: Guards wie \`if (chart)\` / \`if (audio)\`
  // treffen dann auf null (falsy) und werfen keinen \`…is not defined\`-Crash.
  var names = ['interval','timer','timeout','raf','intervalId','timerId','gameInterval',
    'moveInterval','gameTimer','gameLoop','gameOver','rafId','loop','animation',
    'chart','chartInstance','game','app','player','audio','sound','video','engine','stage',
    'ctx','canvas','renderer','scene','camera','world','state','score','highScore','best']; 
  for (var i = 0; i < names.length; i++) {
    try { window[names[i]] = null; } catch(e){}
  }
  function shim(prop){
    try { void window[prop]; return; } catch(e){}
    var store = {};
    var api = {
      getItem: function(k){ return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
      setItem: function(k, v){ store[k] = String(v); },
      removeItem: function(k){ delete store[k]; },
      clear: function(){ store = {}; },
      key: function(){ return null; },
      get length(){ return 0; }
    };
    try { Object.defineProperty(window, prop, { value: api, configurable: true }); } catch(e){}
  }
  shim('localStorage'); shim('sessionStorage');
  window.addEventListener('error', function(e){
    var msg = String((e && (e.message || e.error)) || 'Script-Fehler');
    if (e && e.lineno != null) {
      msg += ' (line ' + e.lineno + (e.colno != null ? ':' + e.colno : '') + ')';
    }
    try { parent.postMessage({ type: 'aicoder-preview-error', msg: msg }, '*'); } catch(err){}
  });
  window.addEventListener('unhandledrejection', function(e){
    try { parent.postMessage({ type: 'aicoder-preview-error', msg: 'Promise: ' + String(e && e.reason) }, '*'); } catch(err){}
  });
})();
</script>
`;

// Zusätzliche, sprachunabhängige Ausgabe-Regel – verstärkt die System-Prompt-Regeln,
// weil kleine Modelle (0.5B) sonst oft Text/Markdown statt Code liefern.
const OUTPUT_RULE =
  'CRITICAL: Reply with exactly ONE fenced code block, starting with ```html as the very first characters and ending with the final ```. Inside it: one complete, self-contained, ready-to-run HTML file (embedded CSS and JS). No explanation, no markdown lists, no text outside the code block. The JavaScript must run without errors: declare every variable with let or const before using it, never reference an undefined identifier, and only call clearInterval/clearTimeout on values that were actually assigned. Before reading or writing ANY property of a DOM element (.value, .textContent, .style, .innerHTML, ...) you MUST first check that the element exists, e.g.: const el = document.getElementById("..."); if (!el) return; — document.getElementById can return null. Put your single <script> at the END of the body so all elements already exist when the script runs.';
const LOAD_TIMEOUT_MS = 120_000; // Watchdog: Session-Initialisierung nach abgeschlossenem Download
const LOAD_TOTAL_TIMEOUT_MS = 600_000; // Gesamt-Watchdog (auch bei hängendem Download)
const IMPORT_TIMEOUT_MS = 60_000; // Watchdog: Laden der transformers.js-Laufzeit vom CDN

/* ————— Helfer ————— */

function newId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

/** Extrahiert den HTML-Code aus einer Modell-Antwort. */
function extractHtml(text: string): { html: string; asCode: boolean } {
  // 1) Bevorzugt: ```html-Markdown-Codeblock (auch CRLF, mit/ohne Leerzeichen)
  const htmlBlock = text.match(/```html\s*\r?\n?([\s\S]*?)```/i);
  if (htmlBlock && htmlBlock[1].trim()) return { html: htmlBlock[1].trim(), asCode: true };

  // 2) Beliebiger ```-Block, dessen Inhalt nach HTML aussieht
  const anyBlock = text.match(/```[a-zA-Z]*\s*\r?\n?([\s\S]*?)```/);
  if (anyBlock && anyBlock[1] && /<\/?[a-zA-Z][\s\S]*>/.test(anyBlock[1])) {
    return { html: anyBlock[1].trim(), asCode: true };
  }

  // 3) Modell hat die Fences vergessen, aber die Antwort IST HTML
  const trimmed = text.trim();
  if (/<!DOCTYPE html>/i.test(trimmed) || /^\s*<html[\s>]/i.test(trimmed)) {
    return { html: trimmed, asCode: true };
  }

  // 4) Kein Code – Text/Markdown: als solches kennzeichnen (kein HTML)
  return { html: "", asCode: false };
}

/** Entfernt Codeblöcke – übrig bleibt die „sichtbare" Antwort. */
function stripCode(text: string): string {
  return text.replace(/```[\s\S]*?```/g, "").trim();
}

/** Statische Vorschau-Diagnose: Welche per getElementById/querySelector(#…)
 *  referenzierten Element-IDs fehlen im generierten HTML? Das ist der häufigste
 *  Modell-Bug (z. B. `getElementById('task-input')` ohne passendes `<input>`) und
 *  crasht beim Klicken mit „Cannot read properties of null (reading 'value')". */
function analyzeMissingIds(html: string): string[] {
  const known = new Set<string>();
  const idRe = /\bid=["']([^"']+)["']/g;
  let m: RegExpExecArray | null;
  while ((m = idRe.exec(html))) known.add(m[1]);

  const refs = new Set<string>();
  const getRe = /getElementById\(\s*["']([^"']+)["']\s*\)/g;
  while ((m = getRe.exec(html))) refs.add(m[1]);
  const qsRe = /querySelector(?:All)?\(\s*["']#([^"'"\s.:[>]+)["']\s*\)/g;
  while ((m = qsRe.exec(html))) refs.add(m[1]);

  const missing: string[] = [];
  for (const id of refs) if (!known.has(id) && !missing.includes(id)) missing.push(id);
  return missing;
}

/** Erkennt „leere" Seiten: kein sichtbarer Text, kein Eingabefeld, kein Button,
 *  kein Canvas – dann bleibt die Vorschau weiß und die App wirkt nicht erstellt. */
function assessEmptyPreview(html: string): boolean {
  const body = html.replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<script[\s\S]*?<\/script>/gi, "");
  const text = body.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  const hasControl = /<(button|input|textarea|select|a\b|canvas)\b/i.test(body);
  return text.length < 8 && !hasControl;
}

/** Baut den Nutzer-Task inkl. bisherigem Code für Verbesserungen. */
function buildTaskPrompt(userPrompt: string, previousHtml: string | undefined, prevIntro: string): string {
  let prompt = userPrompt;
  if (previousHtml && previousHtml.trim()) {
    prompt += `\n\n${prevIntro}\n\`\`\`html\n${previousHtml.trim().slice(0, 8000)}\n\`\`\``;
  }
  return prompt;
}

/** Prüft, ob WebGPU verfügbar ist (sonst WASM-Fallback). */
async function detectDevice(useGpu: boolean): Promise<"webgpu" | "wasm"> {
  if (!useGpu) return "wasm";
  try {
    if (typeof navigator !== "undefined" && "gpu" in navigator) {
      const adapter = await (navigator as unknown as { gpu: { requestAdapter(): Promise<unknown> } }).gpu.requestAdapter();
      if (adapter) return "webgpu";
    }
  } catch {
    // kein WebGPU – WASM
  }
  return "wasm";
}

function isLang(v: unknown): v is Lang {
  return typeof v === "string" && LANGS.some((l) => l.code === v);
}

/** Erkennt die Sprache anhand der Browser-/Systemsprache (beste clientseitige Standort-Signale). */
function detectLang(): Lang {
  try {
    if (typeof navigator === "undefined") return "en";
    const prefs =
      navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language];
    for (const raw of prefs) {
      const b = String(raw).toLowerCase();
      if (b.startsWith("de")) return "de";
      if (b.startsWith("el")) return "el";
      if (b.startsWith("ja")) return "ja";
      if (b.startsWith("zh")) return "zh";
      if (b.startsWith("hi")) return "hi";
      if (b.startsWith("fr")) return "fr";
      if (b.startsWith("es")) return "es";
      if (b.startsWith("it")) return "it";
      if (b.startsWith("tr")) return "tr";
      if (b.startsWith("sw")) return "sw";
      if (b.startsWith("en")) return "en";
    }
  } catch {
    // ignorieren
  }
  return "en";
}

/** Formatiert eine Restzeit (Sekunden) sprachabhängig. */
function formatEta(lang: Lang, seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.max(0, Math.round(seconds % 60));
  return TEXTS[lang].etaFmt.replace("{m}", String(m)).replace("{s}", String(s));
}

function progressLabel(lang: Lang, p: GenProgress): string {
  const label = TEXTS[lang].genLabel.replace("{pct}", String(p.pct));
  const eta = p.etaSec == null ? "" : ` · ${formatEta(lang, p.etaSec)}`;
  return label + eta;
}

/* ————— Komponente ————— */

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [busyNote, setBusyNote] = useState("");
  const [modelID, setModelID] = useState(DEFAULT_MODEL);
  const [useGpu, setUseGpu] = useState(false);
  const [lang, setLang] = useState<Lang>("en");
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [loadPct, setLoadPct] = useState<{ label: string; pct: number } | null>(null);
  const [loadEta, setLoadEta] = useState<number | null>(null);
  const [device, setDevice] = useState<string>("");
  const [previewHtml, setPreviewHtml] = useState("");
  const [view, setView] = useState<"preview" | "code">("preview");
  const [mobileTab, setMobileTab] = useState<"chat" | "preview">("chat");
  const [copied, setCopied] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewDiag, setPreviewDiag] = useState<string[] | null>(null); // fehlende Element-IDs
  const [previewEmpty, setPreviewEmpty] = useState(false); // leere/weiße Seite erkannt
  const [genProgress, setGenProgress] = useState<GenProgress | null>(null);
  const [genStartAt, setGenStartAt] = useState<number | null>(null);
  const [, setTick] = useState(0); // löst Re-Render für den Sekunden-Zähler aus
  const [runtimeError, setRuntimeError] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const streamRef = useRef<{ content: string }>({ content: "" });
  const pipelinesRef = useRef<Map<string, Promise<unknown>>>(new Map());

  const T = TEXTS[lang];

  // Beim Start: Verlauf + Sprache laden, Modell im Hintergrund vorladen
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as { messages?: ChatMessage[]; model?: string; useGpu?: boolean; lang?: unknown };
        if (Array.isArray(saved.messages)) {
          setMessages(saved.messages);
          const last = [...saved.messages].reverse().find((m) => m.html);
          if (last?.html) setPreviewHtml(last.html);
        }
        if (typeof saved.model === "string" && BROWSER_MODELS.some((m) => m.id === saved.model)) {
          setModelID(saved.model);
        }
        if (typeof saved.useGpu === "boolean") setUseGpu(saved.useGpu);
        if (isLang(saved.lang)) {
          setLang(saved.lang);
        } else {
          setLang(detectLang());
        }
      } else {
        setLang(detectLang());
      }
    } catch {
      // beschädigter Verlauf – ignorieren
      setLang(detectLang());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Modell laden (vorab + bei Modell-/GPU-Wechsel)
  useEffect(() => {
    let cancelled = false;
    loadPipeline(modelID, useGpu, (p) => {
      if (!cancelled) {
        setLoadState(p.state);
        setLoadPct(p.pct);
        setLoadEta(p.eta ?? null);
        setDevice(p.device);
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelID, useGpu]);

  // Verlauf automatisch speichern
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ messages, model: modelID, useGpu, lang }));
    } catch {
      // Speicher voll o. ä. – ignorieren
    }
  }, [messages, modelID, useGpu, lang]);

  // Scroll ans Ende
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Rotierender Status-Text während der Generierung
  useEffect(() => {
    if (!busy) return;
    setBusyNote(T.busyNotes[0]);
    let i = 0;
    const t = setInterval(() => {
      i = (i + 1) % T.busyNotes.length;
      setBusyNote(T.busyNotes[i]);
    }, 3000);
    return () => clearInterval(t);
  }, [busy, T]);

  // Stille JS-Fehler/Rejections sichtbar machen (statt „es passiert nichts")
  useEffect(() => {
    const clean = (m: string) => m.replace(/^Error:\s*/i, "").slice(0, 200);
    const onErr = (e: ErrorEvent) => setRuntimeError(clean(e.message || "JavaScript-Fehler"));
    const onRej = (e: PromiseRejectionEvent) => {
      const m = e.reason instanceof Error ? e.reason.message : String(e.reason);
      setRuntimeError(clean(m || "Unbehandelte Promise"));
    };
    window.addEventListener("error", onErr);
    window.addEventListener("unhandledrejection", onRej);
    return () => {
      window.removeEventListener("error", onErr);
      window.removeEventListener("unhandledrejection", onRej);
    };
  }, []);

  // Sobald das Modell bereit ist, verschwindet eine ggf. angezeigte Fehlermeldung
  useEffect(() => {
    if (loadState === "ready") setRuntimeError(null);
  }, [loadState]);

  // Sekunden-Zähler während der Prefill-Phase (0 Tokens): tickt jede Sekunde,
  // damit die „Vorbereitung …"-Anzeige mitlaufende Sekunden zeigt.
  useEffect(() => {
    if (!genProgress || genProgress.tokens > 0 || genStartAt == null) return;
    const t = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, [genProgress, genStartAt]);

  // Skriptfehler aus der Vorschau-Iframe anzeigen (meldet das PREVIEW_SHIM per postMessage).
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      const d = e.data as { type?: string; msg?: unknown } | undefined;
      if (d && d.type === "aicoder-preview-error") {
        setPreviewError(String(d.msg ?? "").replace(/^Error:\s*/i, "").slice(0, 300));
        // Eine echte Laufzeit-Fehlermeldung ersetzt die statische Diagnose.
        setPreviewDiag(null);
        setPreviewEmpty(false);
      }
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);

  function updateAssistant(id: string, patch: Partial<ChatMessage>) {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  }

  /** Lädt das Modell einmalig (gecacht pro Modell+Gerät) und liefert Generator + Tokenizer. */
  function loadPipeline(
    modelId: string,
    gpu: boolean,
    onStatus: (s: { state: LoadState; pct: { label: string; pct: number } | null; device: string; eta?: number | null }) => void,
  ): Promise<unknown> {
    const cacheKey = `${modelId}|${gpu ? "gpu" : "cpu"}`;
    const cached = pipelinesRef.current.get(cacheKey);
    if (cached) return cached;

    onStatus({ state: "loading", pct: null, device: "", eta: null });
    const prom = (async () => {
      // Laufzeit-Import vom CDN (bewährt; mit webpackIgnore damit Turbopack/webpack
      // den Remote-Import NICHT anfasst – sonst wird er verschluckt).
      // Mit Watchdog: auch ein hängender Modul-Download darf `busy` nie endlos festhalten.
      let importTimer: ReturnType<typeof setTimeout> | undefined;
      const mod = (await Promise.race([
        import(/* webpackIgnore: true */ "https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.0/+esm"),
        new Promise((_, rej) => {
          importTimer = setTimeout(() => rej(new Error("transformers.js-Laufzeit konnte nicht geladen werden")), IMPORT_TIMEOUT_MS);
        }),
      ])) as typeof import("https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.0/+esm");
      if (importTimer) clearTimeout(importTimer);
      const { pipeline, TextStreamer, env } = mod;
      // WASM komplett in einem Web-Worker ausführen (proxy=true):
      // verhindert, dass Modell-Initialisierung und erste Inferenz den Haupt-Thread
      // blockieren (sonst meldet der Browser „Seite reagiert nicht").
      env.backends.onnx.wasm.proxy = true;
      // WICHTIG: proxy=true ist mit Multi-Thread-WASM NICHT kompatibel – pthreads
      // innerhalb des Workers crashen mit „RuntimeError: table index is out of bounds"
      // (die WASM-Funktionstabelle wird zwischen Threads nicht geteilt, emscripten #19307).
      // Daher läuft WASM im Worker immer Single-Thread: stabil, dafür langsamer.
      env.backends.onnx.wasm.numThreads = 1;
      const dev = await detectDevice(gpu);
      // q4 für beide Wege: kompatibel mit WebGPU UND WASM, spart Download & Speicher.
      const dtype = "q4";

      // Versuch auf einem Gerät (webgpu|wasm) mit eigenem Watchdog.
      // Watchdog: Gesamtlimit ab Start (auch bei hängendem Download) UND
      // Init-Limit, sobald der Download fertig ist – verhindert ewiges Hängen.
      const tryLoad = async (device: "webgpu" | "wasm"): Promise<{ gen: unknown; tokenizer: unknown }> => {
        let aborted = false;
        let filesDone = false;
        // Rollendes Fenster für die Download-Rate (Bytes), damit ein langsamer
        // Start die ETA nicht dauerhaft nach oben verzerrt.
        const rateWindow: { t: number; loaded: number }[] = [];
        const progress = (p: { status?: string; file?: string; loaded?: number; total?: number; progress?: number }) => {
          if (aborted) return;
          if (p.status === "progress") {
            const total = p.total ? p.total / 1048576 : 0;
            const loaded = p.loaded ? p.loaded / 1048576 : 0;
            const pct = total > 0 ? Math.round((loaded / total) * 100) : Math.round((p.progress ?? 0) * 100);
            // Restzeit aus Download-Geschwindigkeit schätzen
            let eta: number | null = null;
            if (p.total && p.loaded && p.loaded > 0) {
              const elapsed = (performance.now() - t0) / 1000;
              rateWindow.push({ t: elapsed, loaded: p.loaded });
              if (rateWindow.length > 40) rateWindow.shift();
              const cutoff = elapsed - 10; // Fenster: letzte 10 Sekunden
              let oldest = rateWindow[0];
              for (const w of rateWindow) {
                if (w.t >= cutoff) { oldest = w; break; }
              }
              if (elapsed > 2 && oldest && elapsed - oldest.t >= 3) {
                const rate = (p.loaded - oldest.loaded) / (elapsed - oldest.t);
                if (rate > 0) eta = Math.round((p.total - p.loaded) / rate);
              }
            }
            onStatus({
              state: "loading",
              pct: { label: String(p.file ?? TEXTS[lang].modelFile), pct },
              device,
              eta,
            });
          } else if (p.status === "done" || p.status === "ready") {
            filesDone = true;
            // Download fertig, Initialisierung läuft noch – ehrlich „100 %" statt „bereit" zeigen.
            onStatus({
              state: "loading",
              pct: { label: String(p.file ?? TEXTS[lang].modelFile), pct: 100 },
              device,
              eta: null,
            });
          }
        };

        const t0 = performance.now();
        return new Promise<{ gen: unknown; tokenizer: unknown }>((resolve, reject) => {
          const timer = setInterval(() => {
            if (aborted) return;
            const elapsed = performance.now() - t0;
            if (elapsed > LOAD_TOTAL_TIMEOUT_MS || (filesDone && elapsed > LOAD_TIMEOUT_MS)) {
              aborted = true;
              clearInterval(timer);
              reject(new Error("Modell-Initialisierung dauert zu lange"));
            }
          }, 1000);
          pipeline("text-generation", modelId, { device, dtype, progress_callback: progress }).then(
            (gen) => {
              if (aborted) return;
              aborted = true;
              clearInterval(timer);
              const tokenizer = (gen as { tokenizer?: unknown }).tokenizer;
              resolve({ gen, tokenizer: tokenizer ?? gen });
            },
            (e) => {
              if (aborted) return;
              aborted = true;
              clearInterval(timer);
              reject(e instanceof Error ? e : new Error(TEXTS[lang].modelLoadError));
            },
          );
        });
      };

      try {
        const loaded = await tryLoad(dev);
        onStatus({ state: "ready", pct: null, device: dev, eta: null });
        return { gen: loaded.gen, tokenizer: loaded.tokenizer, TextStreamer, device: dev };
      } catch (err) {
        if (dev !== "wasm") {
          // Fallback: WASM Single-Thread (stabilste Umgebung) – rettet WebGPU- und Multi-Thread-Hänger
          env.backends.onnx.wasm.numThreads = 1;
          const loaded = await tryLoad("wasm");
          onStatus({ state: "ready", pct: null, device: "wasm", eta: null });
          return { gen: loaded.gen, tokenizer: loaded.tokenizer, TextStreamer, device: "wasm" };
        }
        throw err instanceof Error ? err : new Error(TEXTS[lang].modelLoadError);
      }
    })();

    prom.catch(() => {
      onStatus({ state: "error", pct: null, device: "", eta: null });
      // Fehlgeschlagene Pipeline NICHT im Cache behalten – sonst scheitert auch
      // jeder spätere Versuch an demselben kaputten Promise.
      pipelinesRef.current.delete(cacheKey);
    });
    pipelinesRef.current.set(cacheKey, prom);
    return prom;
  }

  async function handleSend(e?: FormEvent, forcedPrompt?: string) {
    e?.preventDefault();
    const prompt = (forcedPrompt ?? input).trim();
    if (!prompt || busy) return;
    setInput("");
    setMobileTab("chat");

    const lastHtml = [...messages].reverse().find((m) => m.html)?.html ?? "";

    const userMsg: ChatMessage = { id: newId(), role: "user", content: prompt };
    const assistantMsg: ChatMessage = { id: newId(), role: "assistant", content: "", streaming: true };
    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setBusy(true);
    setGenProgress({ pct: 0, etaSec: null, tokens: 0 });
    setPreviewError(null);
    setPreviewDiag(null);
    setPreviewEmpty(false);
    streamRef.current = { content: "" };

    // Führt die eigentliche Generierung aus (Modell laden, streamen, auswerten).
    // Wirft bei jedem Fehler – der Aufrufer entscheidet über Fallback bzw. Meldung.
    const runGeneration = async (gpu: boolean) => {
      const genStart = performance.now();
      setGenStartAt(genStart);
      let tokenCount = 0;
      // Token-Rate nur aus den echten Decode-Schritten messen (EWMA). Der Prefill
      // (Zeit bis zum ersten Token) würde die Durchschnittsrate verwässern und die
      // Restzeit massiv überschätzen (z. B. „ca. 20 Min" bei tatsächlich ~14 Min).
      let genTps: number | null = null;
      let lastTokAt: number | null = null;

      const r = (await loadPipeline(modelID, gpu, () => {})) as {
        gen: (messages: unknown[], opts: Record<string, unknown>) => Promise<unknown>;
        tokenizer: unknown;
        TextStreamer: new (tokenizer: unknown, opts: Record<string, unknown>) => unknown;
      };

      const task = buildTaskPrompt(prompt, lastHtml, T.prevCodeIntro);
      const chatMessages = [
        { role: "system", content: `${T.system}\n\n${OUTPUT_RULE}` },
        { role: "user", content: task },
      ];

      const streamer = new r.TextStreamer(r.tokenizer, {
        skip_prompt: true,
        skip_special_tokens: true,
        callback_function: (text: string) => {
          streamRef.current.content += text;
          tokenCount += 1;

          // Fortschritt + geschätzte Restzeit (aus Tokens/Sekunde).
          // Decode-Rate: Abstand zwischen den Token-Callbacks; der Prefill wandert
          // nie in die Rate, weil der erste Token keinen Vorgänger hat.
          const nowTok = performance.now();
          if (lastTokAt != null) {
            const dt = (nowTok - lastTokAt) / 1000;
            if (dt > 0) {
              const instTps = 1 / dt;
              genTps = genTps == null ? instTps : genTps * 0.75 + instTps * 0.25;
            }
          }
          lastTokAt = nowTok;
          let etaSec: number | null = null;
          if (tokenCount >= 8 && genTps != null && genTps > 0) {
            etaSec = Math.max(0, Math.round((MAX_TOKENS - tokenCount) / genTps));
          }
          setGenProgress({
            pct: Math.min(99, Math.round((tokenCount / MAX_TOKENS) * 100)),
            etaSec,
            tokens: tokenCount,
          });

          const { html, asCode } = extractHtml(streamRef.current.content);
          if (asCode) setPreviewHtml(html);
          updateAssistant(assistantMsg.id, { streaming: true });
        },
      });

      // Kurz dem Browser die Chance geben, den Status zu rendern, bevor die Inferenz startet.
      await new Promise((res) => setTimeout(res, 80));

      // Watchdog: Kommt sehr lange kein erstes Token (Prefill blockiert/steckt fest),
      // mit einer klaren Meldung abbrechen statt endlos bei 0 % zu hängen.
      // Single-Thread-WASM ist langsamer: legitimer Prefill kann 2–4 Min dauern.
      const FIRST_TOKEN_TIMEOUT_MS = 360_000;
      let firstTokenTimer: ReturnType<typeof setInterval> | null = null;
      const firstTokenTimeout = new Promise<never>((_, rej) => {
        firstTokenTimer = setInterval(() => {
          if (tokenCount > 0) {
            if (firstTokenTimer) clearInterval(firstTokenTimer);
            return;
          }
          if (performance.now() - genStart > FIRST_TOKEN_TIMEOUT_MS) {
            if (firstTokenTimer) clearInterval(firstTokenTimer);
            rej(new Error(T.slowStart));
          }
        }, 4000);
      });

      await Promise.race([
        r.gen(chatMessages, { max_new_tokens: MAX_TOKENS, do_sample: false, streamer }),
        firstTokenTimeout,
      ]);
      if (firstTokenTimer) clearInterval(firstTokenTimer);

      const { html, asCode } = extractHtml(streamRef.current.content);
      const visible = stripCode(streamRef.current.content);
      // Kein Code erzeugt? Dann nicht roh in die Vorschau werfen, sondern klar melden.
      setPreviewHtml(asCode ? html : "");
      // Statische Diagnose: fehlende Element-IDs sind der häufigste Modell-Bug und
      // würden erst beim Klicken crashen – das jetzt schon melden (fixfähig).
      // Ebenso: komplett leere Seiten (weiße Vorschau) sofort als Diagnose melden.
      if (asCode) {
        const diagIds = analyzeMissingIds(html);
        setPreviewDiag(diagIds.length > 0 ? diagIds : null);
        setPreviewEmpty(assessEmptyPreview(html));
      } else {
        setPreviewEmpty(false);
      }
      updateAssistant(assistantMsg.id, {
        streaming: false,
        content: asCode
          ? visible.slice(0, 400) || T.donePreview
          : `${T.noCode}${visible.trim() ? `\n\n${visible.trim().slice(0, 400)}` : ""}`,
        html: asCode ? html : "",
      });
    };

    let didRetry = false;
    try {
      await runGeneration(useGpu);
      setMobileTab("preview");
    } catch (err) {
      // Generierungs-Crash (z. B. „Cannot read properties of undefined (reading
      // 'destroy')" aus den transformers.js-/onnxruntime-Interna): die (vermutlich
      // kaputte) Modell-Sitzung verwerfen, sonst reproduziert jeder weitere Versuch
      // – auch über „Fehler beheben" – denselben Fehler.
      pipelinesRef.current.delete(`${modelID}|${useGpu ? "gpu" : "cpu"}`);
      // Die GPU-Laufzeit kann auch NACH erfolgreichem Laden während der Generierung
      // crashen (siehe Stack: WASM-Funktion im WebGPU-Worker). Dann automatisch
      // EINMAL auf WASM (CPU) ausweichen – ohne dass der Nutzer etwas umschalten muss.
      if (useGpu && !didRetry) {
        didRetry = true;
        setUseGpu(false);
        setGenProgress({ pct: 0, etaSec: null, tokens: 0 });
        streamRef.current = { content: "" };
        updateAssistant(assistantMsg.id, { streaming: true, content: T.gpuFallbackNote });
        try {
          await runGeneration(false);
          setMobileTab("preview");
          return;
        } catch (err2) {
          err = err2;
        }
      }
      const emg = err instanceof Error ? err.message : String(err);
      let hint = T.genFailHint;
      if (useGpu) hint += ` ${T.gpuFailHint}`;
      const stackLine =
        err instanceof Error && err.stack
          ? err.stack
              .split("\n")
              .slice(1)
              .map((l) => l.trim())
              .filter((l) => l.startsWith("at "))
              .slice(0, 2)
              .join(" ")
          : "";
      updateAssistant(assistantMsg.id, {
        streaming: false,
        content: `${T.errorPrefix}${emg}\n${hint}${stackLine ? `\n${stackLine}` : ""}`,
        error: true,
      });
    } finally {
      setBusy(false);
      setGenProgress(null);
      setGenStartAt(null);
    }
  }

  // „Fehler beheben": schickt den Vorschau-Fehler bzw. die Diagnose (fehlende
  // Element-IDs / leere Seite) + den bisherigen Code an das Modell zur Korrektur.
  function fixPreviewError() {
    if (busy) return;
    if (previewEmpty) {
      handleSend(undefined, `${T.emptyDiagFix}\n\n${previewError ?? ""}`);
      return;
    }
    if (previewDiag && previewDiag.length > 0) {
      const ids = previewDiag.join(", ");
      handleSend(undefined, `${T.diagFixIntro.replace("{ids}", ids)}\n\n${previewError ?? ""}`);
      return;
    }
    if (!previewError) return;
    handleSend(undefined, `${T.fixPromptIntro}\n\n${previewError}`);
  }

  function newChat() {
    if (messages.length > 0 && !window.confirm(T.confirmNewChat)) return;
    setMessages([]);
    setPreviewHtml("");
    setPreviewError(null);
    setPreviewDiag(null);
    setPreviewEmpty(false);
    setInput("");
    setView("preview");
    setMobileTab("chat");
    setGenProgress(null);
    setGenStartAt(null);
    setPreviewError(null);
    textareaRef.current?.focus();
  }

  async function copyHtml() {
    if (!previewHtml) return;
    try {
      await navigator.clipboard.writeText(previewHtml);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // kein Clipboard-Zugriff
    }
  }

  function downloadHtml() {
    if (!previewHtml) return;
    const blob = new Blob([previewHtml], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "index.html";
    a.click();
    URL.revokeObjectURL(url);
  }

  function openNewTab() {
    if (!previewHtml) return;
    const url = URL.createObjectURL(new Blob([previewHtml], { type: "text/html" }));
    window.open(url, "_blank");
  }

  function statusLabel(): { text: string; cls: string } {
    if (runtimeError) return { text: `${T.errorPrefix}${runtimeError}`, cls: "bad" };
    if (loadState === "loading") {
      if (loadPct) {
        const tpl = loadEta != null ? T.statusLoadingEta : T.statusLoading;
        let text = tpl.replace("{pct}", String(loadPct.pct));
        if (loadEta != null) text = text.replace("{eta}", formatEta(lang, loadEta));
        return { text, cls: "" };
      }
      return { text: T.statusLoadingNoPct, cls: "" };
    }
    if (loadState === "error") return { text: T.statusError, cls: "bad" };
    if (loadState === "ready") {
      return { text: device === "webgpu" ? T.statusReadyGpu : T.statusReady, cls: "ok" };
    }
    return { text: T.statusIdle, cls: "" };
  }

  // Einheitliche Fortschrittsanzeige (Modell laden ODER App generieren).
  // Wichtig: Solange das Modell noch lädt und die Generierung noch keine Tokens
  // erzeugt hat, den Download-Fortschritt zeigen – sonst wirkt es wie „hängen".
  const progressInfo = (() => {
    if (loadState === "loading" && loadPct && (!genProgress || genProgress.tokens === 0)) {
      const tpl = loadEta != null ? T.statusLoadingEta : T.statusLoading;
      let text = tpl.replace("{pct}", String(loadPct.pct));
      if (loadEta != null) text = text.replace("{eta}", formatEta(lang, loadEta));
      return { label: text, pct: loadPct.pct };
    }
    if (genProgress) {
      if (genProgress.tokens === 0) {
        // Prefill: der erste Rechenschritt läuft, noch keine Tokens.
        // Sekunden-Zähler zeigt: es arbeitet, nichts hängt.
        const secs = genStartAt != null ? Math.floor((performance.now() - genStartAt) / 1000) : 0;
        return { label: T.prefill.replace("{s}", String(secs)), pct: 0 };
      }
      return { label: progressLabel(lang, genProgress), pct: genProgress.pct };
    }
    return null;
  })();

  const size = BROWSER_MODELS.find((m) => m.id === modelID)?.size ?? "≈ 1 GB";

  return (
    <div className="app">
      <header>
        <div className="brand">
          <span className="logo">⚡</span>
          <div>
            <h1>AI-Coder</h1>
            <span className="subtitle">{T.subtitle}</span>
          </div>
        </div>

        <div className="header-actions">
          <span className={`status ${statusLabel().cls}`}>
            <i />
            {statusLabel().text}
          </span>

          <label className="gpu-toggle" title={T.gpuToggleTitle}>
            <input type="checkbox" checked={useGpu} onChange={(e) => setUseGpu(e.target.checked)} disabled={busy} />
            ⚡ GPU
          </label>

          <select
            className="lang-select"
            value={lang}
            onChange={(e) => setLang(e.target.value as Lang)}
            title={T.langSelectTitle}
            disabled={busy}
            aria-label={T.langSelectTitle}
          >
            {LANGS.map((l) => (
              <option key={l.code} value={l.code}>
                {l.flag} {l.native}
              </option>
            ))}
          </select>

          <select
            value={modelID}
            onChange={(e) => setModelID(e.target.value)}
            disabled={busy}
            title={T.modelSelectTitle}
          >
            {BROWSER_MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label} · {m.size}
              </option>
            ))}
          </select>

          <button className="new-btn" onClick={newChat} disabled={busy}>
            {T.newChat}
          </button>
        </div>
      </header>

      {/* Mobile Umschalter */}
      <div className="mobile-tabs">
        <button className={mobileTab === "chat" ? "active" : ""} onClick={() => setMobileTab("chat")}>
          {T.tabChat}
        </button>
        <button className={mobileTab === "preview" ? "active" : ""} onClick={() => setMobileTab("preview")}>
          {T.tabResult}
        </button>
      </div>

      <main>
        {/* ————— Chat-Panel ————— */}
        <section className={`panel chat-panel ${mobileTab === "chat" ? "" : "mobile-hidden"}`}>
          <div className="messages">
            {messages.length === 0 && (
              <div className="welcome">
                <div className="welcome-emoji">🛠️</div>
                <h2>{T.welcomeTitle}</h2>
                <p>{T.welcomeText}</p>
                <div className="examples">
                  {T.examples.map((ex) => (
                    <button
                      key={ex.label}
                      onClick={() => {
                        setInput(ex.prompt);
                        textareaRef.current?.focus();
                      }}
                    >
                      <span>{ex.icon}</span> {ex.label}
                    </button>
                  ))}
                </div>
                <p className="hint">
                  {T.hintFree}
                  <br />
                  <small>{T.hintFirstLoad.replace("{size}", size)}</small>
                </p>
              </div>
            )}

            {messages.map((msg) => (
              <div key={msg.id} className={`message ${msg.role}`}>
                <div className="bubble">
                  {msg.role === "user" && msg.content}
                  {msg.role === "assistant" && msg.streaming && (
                    <span className="busy">
                      <span className="spinner" /> {busyNote}
                    </span>
                  )}
                  {msg.role === "assistant" && !msg.streaming && (
                    <span className={msg.error ? "error-text" : ""}>{msg.content}</span>
                  )}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {progressInfo && (
            <div className="gen-progress" role="status" aria-live="polite">
              <div className="gen-progress-text">{progressInfo.label}</div>
              <div className="gen-progress-bar">
                <span style={{ width: `${progressInfo.pct}%` }} />
              </div>
            </div>
          )}
          {loadState === "loading" && genProgress && genProgress.tokens === 0 && (
            <p className="gen-progress-note">{T.pendingLoad}</p>
          )}

          <form onSubmit={handleSend}>
            <textarea
              ref={textareaRef}
              rows={2}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={T.placeholder}
              disabled={busy}
            />
            <button type="submit" disabled={busy || input.trim() === ""}>
              {busy ? "…" : T.submit}
            </button>
          </form>
        </section>

        {/* ————— Ergebnis-Panel ————— */}
        <section className={`panel preview-panel ${mobileTab === "preview" ? "" : "mobile-hidden"}`}>
          <div className="preview-toolbar">
            <div className="segmented">
              <button className={view === "preview" ? "active" : ""} onClick={() => setView("preview")}>
                {T.viewPreview}
              </button>
              <button className={view === "code" ? "active" : ""} onClick={() => setView("code")}>
                {T.viewCode}
              </button>
            </div>
            <div className="toolbar-actions">
              <button onClick={openNewTab} disabled={!previewHtml} title={T.openTabTitle}>↗</button>
              <button onClick={copyHtml} disabled={!previewHtml} title={T.copyTitle}>
                {copied ? "✓" : "⧉"}
              </button>
              <button onClick={downloadHtml} disabled={!previewHtml} title={T.downloadTitle}>⬇</button>
            </div>
          </div>

          <div className="preview-body">
            {!previewHtml ? (
              <div className="preview-empty">
                <span className="preview-empty-icon">🖼️</span>
                <p>{T.previewEmpty}</p>
                <p className="hint">{T.previewHint}</p>
              </div>
            ) : view === "preview" ? (
              <>
                {previewEmpty && (
                  <div className="preview-error-note preview-diag-note">
                    <span>{T.previewDiagLabel}</span>
                    <code>{T.emptyDiagNote}</code>
                    <button onClick={fixPreviewError} disabled={busy} className="preview-error-fix">
                      {T.fixButton}
                    </button>
                    <button onClick={() => setPreviewEmpty(false)} title="✕" className="preview-error-close">
                      ✕
                    </button>
                  </div>
                )}
                {!previewEmpty && previewDiag && previewDiag.length > 0 && (
                  <div className="preview-error-note preview-diag-note">
                    <span>{T.previewDiagLabel}</span>
                    <code>{T.previewDiagIds.replace("{ids}", previewDiag.join(", "))}</code>
                    <button onClick={fixPreviewError} disabled={busy} className="preview-error-fix">
                      {T.fixButton}
                    </button>
                    <button onClick={() => setPreviewDiag(null)} title="✕" className="preview-error-close">
                      ✕
                    </button>
                  </div>
                )}
                {previewError && (
                  <div className="preview-error-note">
                    <span>{T.previewErrorLabel}</span>
                    <code>{previewError}</code>
                    <button onClick={fixPreviewError} disabled={busy} className="preview-error-fix">
                      {T.fixButton}
                    </button>
                    <button onClick={() => setPreviewError(null)} title="✕" className="preview-error-close">
                      ✕
                    </button>
                  </div>
                )}
                <iframe
                  key={previewHtml.length}
                  title={T.viewPreview}
                  srcDoc={PREVIEW_SHIM + previewHtml}
                  sandbox="allow-scripts allow-modals allow-forms allow-same-origin"
                  className="preview-frame"
                />
              </>
            ) : (
              <pre className="code-view">{previewHtml}</pre>
            )}

            {progressInfo && (
              <div className="gen-progress preview-progress" role="status" aria-live="polite">
                <div className="gen-progress-text">{progressInfo.label}</div>
                <div className="gen-progress-bar">
                  <span style={{ width: `${progressInfo.pct}%` }} />
                </div>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}