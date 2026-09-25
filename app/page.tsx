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
  previewHint: string;
  confirmNewChat: string;
  donePreview: string;
  done: string;
  errorPrefix: string;
  modelLoadError: string;
  modelFile: string;
  prevCodeIntro: string;
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
    statusLoadingEta: "Modell wird geladen … {pct} % · noch ca. {eta}",
    statusError: "Modell konnte nicht geladen werden",
    statusReady: "Modell bereit · läuft im Browser",
    statusReadyGpu: "Modell bereit · läuft im Browser (GPU)",
    statusIdle: "bereit zu laden",
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
    previewHint: "Läuft komplett auf deinem Gerät – kein Server, kein API-Key.",
    confirmNewChat: "Aktuellen Chat wirklich löschen?",
    donePreview: "✔ Fertig – deine App ist in der Vorschau.",
    done: "✔ Fertig.",
    errorPrefix: "Fehler: ",
    modelLoadError: "Das Modell konnte nicht geladen werden.",
    modelFile: "Modell",
    prevCodeIntro: "Aktueller Code (nimm Änderungen daran vor):",
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
    statusLoadingEta: "Loading model … {pct} % · about {eta} left",
    statusError: "Model could not be loaded",
    statusReady: "Model ready · running in the browser",
    statusReadyGpu: "Model ready · running in the browser (GPU)",
    statusIdle: "ready to load",
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
    previewHint: "Runs entirely on your device – no server, no API key.",
    confirmNewChat: "Really delete the current chat?",
    donePreview: "✔ Done – your app is in the preview.",
    done: "✔ Done.",
    errorPrefix: "Error: ",
    modelLoadError: "The model could not be loaded.",
    modelFile: "model",
    prevCodeIntro: "Current code (make changes to it):",
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
    statusLoadingEta: "Φόρτωση μοντέλου … {pct} % · απομένουν περίπου {eta}",
    statusError: "Το μοντέλο δεν μπόρεσε να φορτωθεί",
    statusReady: "Το μοντέλο είναι έτοιμο · τρέχει στο πρόγραμμα περιήγησης",
    statusReadyGpu: "Το μοντέλο είναι έτοιμο · τρέχει στο πρόγραμμα περιήγησης (GPU)",
    statusIdle: "έτοιμο προς φόρτωση",
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
    previewHint: "Τρέχει εξ ολοκλήρου στη συσκευή σου – χωρίς server, χωρίς API key.",
    confirmNewChat: "Θέλεις σίγουρα να διαγράψεις τη συνομιλία;",
    donePreview: "✔ Έτοιμο – η εφαρμογή σου είναι στην προεπισκόπηση.",
    done: "✔ Έτοιμο.",
    errorPrefix: "Σφάλμα: ",
    modelLoadError: "Το μοντέλο δεν μπόρεσε να φορτωθεί.",
    modelFile: "μοντέλο",
    prevCodeIntro: "Τρέχων κώδικας (κάνε αλλαγές σε αυτόν):",
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
    statusLoadingEta: "モデルを読み込み中 … {pct} % · 残り約 {eta}",
    statusError: "モデルを読み込めませんでした",
    statusReady: "モデル準備完了 · ブラウザで実行中",
    statusReadyGpu: "モデル準備完了 · ブラウザで実行中（GPU）",
    statusIdle: "読み込み準備完了",
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
    previewHint: "すべてお使いのデバイス上で実行 – サーバー不要、APIキー不要。",
    confirmNewChat: "現在のチャットを削除しますか？",
    donePreview: "✔ 完了 – アプリはプレビューにあります。",
    done: "✔ 完了。",
    errorPrefix: "エラー: ",
    modelLoadError: "モデルを読み込めませんでした。",
    modelFile: "モデル",
    prevCodeIntro: "現在のコード（これに変更を加えてください）:",
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
    statusLoadingEta: "正在加载模型 … {pct} % · 剩余约 {eta}",
    statusError: "无法加载模型",
    statusReady: "模型就绪 · 正在浏览器中运行",
    statusReadyGpu: "模型就绪 · 正在浏览器中运行（GPU）",
    statusIdle: "准备加载",
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
    previewHint: "完全在你的设备上运行——无需服务器、无需 API 密钥。",
    confirmNewChat: "确定要删除当前聊天吗？",
    donePreview: "✔ 完成——你的应用已在预览中。",
    done: "✔ 完成。",
    errorPrefix: "错误：",
    modelLoadError: "无法加载模型。",
    modelFile: "模型",
    prevCodeIntro: "当前代码（请在此基础上修改）：",
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
    statusLoadingEta: "मॉडल लोड हो रहा है … {pct} % · लगभग {eta} शेष",
    statusError: "मॉडल लोड नहीं हो सका",
    statusReady: "मॉडल तैयार · ब्राउज़र में चल रहा है",
    statusReadyGpu: "मॉडल तैयार · ब्राउज़र में चल रहा है (GPU)",
    statusIdle: "लोड करने के लिए तैयार",
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
    previewHint: "पूरी तरह आपके डिवाइस पर चलता है – न कोई सर्वर, न API कुंजी।",
    confirmNewChat: "क्या आप वाकई वर्तमान चैट हटाना चाहते हैं?",
    donePreview: "✔ हो गया – आपका ऐप पूर्वावलोकन में है।",
    done: "✔ हो गया।",
    errorPrefix: "त्रुटि: ",
    modelLoadError: "मॉडल लोड नहीं हो सका।",
    modelFile: "मॉडल",
    prevCodeIntro: "वर्तमान कोड (इसमें बदलाव करें):",
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
    statusLoadingEta: "Chargement du modèle … {pct} % · encore environ {eta}",
    statusError: "Le modèle n'a pas pu être chargé",
    statusReady: "Modèle prêt · tourne dans le navigateur",
    statusReadyGpu: "Modèle prêt · tourne dans le navigateur (GPU)",
    statusIdle: "prêt à charger",
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
    previewHint: "Fonctionne entièrement sur ton appareil – sans serveur, sans clé API.",
    confirmNewChat: "Vraiment supprimer la discussion actuelle ?",
    donePreview: "✔ Terminé – ton application est dans l'aperçu.",
    done: "✔ Terminé.",
    errorPrefix: "Erreur : ",
    modelLoadError: "Le modèle n'a pas pu être chargé.",
    modelFile: "modèle",
    prevCodeIntro: "Code actuel (apporte des modifications) :",
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
    statusLoadingEta: "Cargando el modelo … {pct} % · quedan unos {eta}",
    statusError: "El modelo no pudo cargarse",
    statusReady: "Modelo listo · funciona en el navegador",
    statusReadyGpu: "Modelo listo · funciona en el navegador (GPU)",
    statusIdle: "listo para cargar",
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
    previewHint: "Funciona por completo en tu dispositivo – sin servidor, sin clave API.",
    confirmNewChat: "¿Seguro que quieres borrar el chat actual?",
    donePreview: "✔ Listo – tu aplicación está en la vista previa.",
    done: "✔ Listo.",
    errorPrefix: "Error: ",
    modelLoadError: "El modelo no pudo cargarse.",
    modelFile: "modelo",
    prevCodeIntro: "Código actual (haz cambios en él):",
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
    statusLoadingEta: "Inapakia mfano … {pct} % · imesalia takriban {eta}",
    statusError: "Mfano haukuweza kupakiwa",
    statusReady: "Mfano uko tayari · unafanya kazi kwenye kivinjari",
    statusReadyGpu: "Mfano uko tayari · unafanya kazi kwenye kivinjari (GPU)",
    statusIdle: "tayari kupakia",
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
    previewHint: "Yanaendelea kabisa kwenye kifaa chako – hakuna seva, hakuna ufunguo wa API.",
    confirmNewChat: "Kweli unataka kufuta mazungumzo ya sasa?",
    donePreview: "✔ Imekamilika – programu yako iko kwenye hakiki.",
    done: "✔ Imekamilika.",
    errorPrefix: "Hitilafu: ",
    modelLoadError: "Mfano haukuweza kupakiwa.",
    modelFile: "mfano",
    prevCodeIntro: "Msimbo wa sasa (fanya mabadiliko juu yake):",
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
    statusLoadingEta: "Caricamento del modello … {pct} % · mancano circa {eta}",
    statusError: "Impossibile caricare il modello",
    statusReady: "Modello pronto · gira nel browser",
    statusReadyGpu: "Modello pronto · gira nel browser (GPU)",
    statusIdle: "pronto per il caricamento",
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
    previewHint: "Gira interamente sul tuo dispositivo – niente server, niente chiave API.",
    confirmNewChat: "Vuoi davvero eliminare la chat attuale?",
    donePreview: "✔ Fatto – la tua app è nell'anteprima.",
    done: "✔ Fatto.",
    errorPrefix: "Errore: ",
    modelLoadError: "Impossibile caricare il modello.",
    modelFile: "modello",
    prevCodeIntro: "Codice attuale (apportaci delle modifiche):",
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
    statusLoadingEta: "Model yükleniyor … {pct} % · yaklaşık {eta} kaldı",
    statusError: "Model yüklenemedi",
    statusReady: "Model hazır · tarayıcıda çalışıyor",
    statusReadyGpu: "Model hazır · tarayıcıda çalışıyor (GPU)",
    statusIdle: "yüklenmeye hazır",
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
    previewHint: "Tamamen cihazında çalışır – sunucu yok, API anahtarı yok.",
    confirmNewChat: "Mevcut sohbeti gerçekten silmek istiyor musun?",
    donePreview: "✔ Tamam – uygulaman önizlemede.",
    done: "✔ Tamam.",
    errorPrefix: "Hata: ",
    modelLoadError: "Model yüklenemedi.",
    modelFile: "model",
    prevCodeIntro: "Mevcut kod (bunun üzerinde değişiklik yap):",
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
const LOAD_TIMEOUT_MS = 120_000; // Watchdog: Session-Initialisierung nach abgeschlossenem Download
const LOAD_TOTAL_TIMEOUT_MS = 600_000; // Gesamt-Watchdog (auch bei hängendem Download)
const THREAD_CAP = 8; // Obergrenze für WASM-Threads (Stabilität auf Rechnern mit sehr vielen Kernen)

/* ————— Helfer ————— */

function newId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

/** Extrahiert den HTML-Code aus einer Modell-Antwort. */
function extractHtml(text: string): { html: string; asCode: boolean } {
  const htmlBlock = text.match(/```html\s*\n([\s\S]*?)```/i);
  if (htmlBlock && htmlBlock[1].trim()) return { html: htmlBlock[1].trim(), asCode: true };

  const anyBlock = text.match(/```\s*\n?([\s\S]*?)```/);
  if (anyBlock && anyBlock[1] && /<\/?[a-zA-Z][\s\S]*>/.test(anyBlock[1])) {
    return { html: anyBlock[1].trim(), asCode: true };
  }

  return { html: text.trim(), asCode: false };
}

/** Entfernt Codeblöcke – übrig bleibt die „sichtbare" Antwort. */
function stripCode(text: string): string {
  return text.replace(/```[\s\S]*?```/g, "").trim();
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
  const tok = ` · ${TEXTS[lang].tokensFmt.replace("{n}", String(p.tokens))}`;
  return label + eta + tok;
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
  const [genProgress, setGenProgress] = useState<GenProgress | null>(null);
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
      const { pipeline, TextStreamer, env } = await import(
        /* webpackIgnore: true */
        "https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.0/+esm",
      );
      // WASM-Threads: Standard = alle Kerne (schneller via SharedArrayBuffer/COOP-COEP).
      // Mit `?threads=1` lässt sich Single-Thread erzwingen (stabilste Umgebung, z. B. eingebettete Browser).
      const threadsParam = new URLSearchParams(window.location.search).get("threads");
      if (threadsParam) {
        env.backends.onnx.wasm.numThreads = Math.max(1, parseInt(threadsParam, 10) || 1);
      } else {
        // Obergrenze: verhindert Worker-Explosion/endlose Init-Zeit auf Rechnern mit sehr vielen Kernen
        env.backends.onnx.wasm.numThreads = Math.min(navigator.hardwareConcurrency || 1, THREAD_CAP);
      }
      const dev = await detectDevice(gpu);
      // q4 für beide Wege: kompatibel mit WebGPU UND WASM, spart Download & Speicher.
      const dtype = "q4";

      // Versuch auf einem Gerät (webgpu|wasm) mit eigenem Watchdog.
      // Watchdog: Gesamtlimit ab Start (auch bei hängendem Download) UND
      // Init-Limit, sobald der Download fertig ist – verhindert ewiges Hängen.
      const tryLoad = async (device: "webgpu" | "wasm"): Promise<{ gen: unknown; tokenizer: unknown }> => {
        let aborted = false;
        let filesDone = false;
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
              const rate = p.loaded / Math.max(0.1, elapsed);
              if (elapsed > 2 && rate > 0) eta = Math.round((p.total - p.loaded) / rate);
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

    prom.catch(() => onStatus({ state: "error", pct: null, device: "", eta: null }));
    pipelinesRef.current.set(cacheKey, prom);
    return prom;
  }

  async function handleSend(e?: FormEvent) {
    e?.preventDefault();
    const prompt = input.trim();
    if (!prompt || busy) return;
    setInput("");
    setMobileTab("chat");

    const lastHtml = [...messages].reverse().find((m) => m.html)?.html ?? "";

    const userMsg: ChatMessage = { id: newId(), role: "user", content: prompt };
    const assistantMsg: ChatMessage = { id: newId(), role: "assistant", content: "", streaming: true };
    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setBusy(true);
    setGenProgress({ pct: 0, etaSec: null, tokens: 0 });
    streamRef.current = { content: "" };

    const genStart = performance.now();
    let tokenCount = 0;

    try {
      const r = (await loadPipeline(modelID, useGpu, () => {})) as {
        gen: (messages: unknown[], opts: Record<string, unknown>) => Promise<unknown>;
        tokenizer: unknown;
        TextStreamer: new (tokenizer: unknown, opts: Record<string, unknown>) => unknown;
      };

      const task = buildTaskPrompt(prompt, lastHtml, T.prevCodeIntro);
      const chatMessages = [
        { role: "system", content: T.system },
        { role: "user", content: task },
      ];

      const streamer = new r.TextStreamer(r.tokenizer, {
        skip_prompt: true,
        skip_special_tokens: true,
        callback_function: (text: string) => {
          streamRef.current.content += text;
          tokenCount += 1;

          // Fortschritt + geschätzte Restzeit (aus Tokens/Sekunde)
          const elapsed = (performance.now() - genStart) / 1000;
          let etaSec: number | null = null;
          if (tokenCount >= 5 && elapsed > 1) {
            const tps = tokenCount / elapsed;
            etaSec = Math.max(0, Math.round((MAX_TOKENS - tokenCount) / tps));
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

      await r.gen(chatMessages, { max_new_tokens: MAX_TOKENS, do_sample: false, streamer });

      const { html, asCode } = extractHtml(streamRef.current.content);
      const visible = stripCode(streamRef.current.content);
      setPreviewHtml(html);
      updateAssistant(assistantMsg.id, {
        streaming: false,
        content: asCode
          ? visible.slice(0, 400) || T.donePreview
          : streamRef.current.content.trim().slice(0, 400) || T.done,
        html,
      });
      setMobileTab("preview");
    } catch (err) {
      updateAssistant(assistantMsg.id, {
        streaming: false,
        content: `${T.errorPrefix}${err instanceof Error ? err.message : String(err)}`,
        error: true,
      });
    } finally {
      setBusy(false);
      setGenProgress(null);
    }
  }

  function newChat() {
    if (messages.length > 0 && !window.confirm(T.confirmNewChat)) return;
    setMessages([]);
    setPreviewHtml("");
    setInput("");
    setView("preview");
    setMobileTab("chat");
    setGenProgress(null);
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
              <iframe
                key={previewHtml.length}
                title={T.viewPreview}
                srcDoc={previewHtml}
                sandbox="allow-scripts allow-modals allow-forms"
                className="preview-frame"
              />
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