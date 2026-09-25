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

type BrowserModel = { id: string; label: string; size: string };

const BROWSER_MODELS: BrowserModel[] = [
  { id: "onnx-community/Qwen2.5-Coder-0.5B-Instruct", label: "Qwen Coder 0.5B", size: "≈ 500 MB" },
  { id: "onnx-community/Qwen2.5-Coder-1.5B-Instruct", label: "Qwen Coder 1.5B", size: "≈ 1 GB" },
];
const DEFAULT_MODEL = BROWSER_MODELS[0].id;
const STORAGE_KEY = "ai-coder.v2";

const SYSTEM_INSTRUCTIONS = `Du bist "AI-Coder", ein Generator für einzelne HTML-Dateien. Du erstellst komplette, in sich geschlossene Web-Anwendungen als EINE index.html-Datei mit eingebettetem CSS und JavaScript.

Regeln:
- Gib ausschließlich den vollständigen HTML-Code aus, in einem einzigen Markdown-Codeblock, der mit \`\`\`html beginnt und mit \`\`\` endet.
- Keine Erklärungen außerhalb des Codeblocks.
- Keine Build-Tools oder Server nötig: alles läuft offline in einem Browser-Tab (vanilla HTML/CSS/JS).
- Modernes, ansprechendes Design mit CSS-Variablen, responsiv (Desktop + Mobil).
- Der Code muss sofort lauffähig sein – keine Platzhalter, keine TODO-Kommentare.
- Für Spiele: flüssige Steuerung (Tastatur/Touch), Punktestand und Game-Over-Ansicht.
- Für Webseiten: Navigation, mehrere Sektionen und Kontaktbereich.`;

const EXAMPLES: { icon: string; label: string; prompt: string }[] = [
  { icon: "🌐", label: "Landingpage", prompt: "Erstelle eine moderne Landingpage für ein italienisches Café mit Öffnungszeiten und Fotos." },
  { icon: "🐍", label: "Spiel", prompt: "Baue ein klassisches Snake-Spiel mit Punktestand, Level-Display und Game-Over-Ansicht." },
  { icon: "✅", label: "To-Do-App", prompt: "Erstelle eine To-Do-Liste als Web-App mit Addieren, Abhaken, Löschen und Speichern im Browser." },
  { icon: "🧮", label: "Rechner", prompt: "Baue einen schönen Taschenrechner mit Tastatursteuerung und Verlauf." },
];

const BUSY_NOTES = ["Schreibt Code …", "Design wird abgerundet …", "Fast fertig …"];

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
function buildTaskPrompt(userPrompt: string, previousHtml?: string): string {
  let prompt = userPrompt;
  if (previousHtml && previousHtml.trim()) {
    prompt += `\n\nAktueller Code (nimm Änderungen daran vor):\n\`\`\`html\n${previousHtml.trim().slice(0, 8000)}\n\`\`\``;
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

/* ————— Komponente ————— */

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [busyNote, setBusyNote] = useState(BUSY_NOTES[0]);
  const [modelID, setModelID] = useState(DEFAULT_MODEL);
  const [useGpu, setUseGpu] = useState(false);
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [loadPct, setLoadPct] = useState<{ label: string; pct: number } | null>(null);
  const [device, setDevice] = useState<string>("");
  const [previewHtml, setPreviewHtml] = useState("");
  const [view, setView] = useState<"preview" | "code">("preview");
  const [mobileTab, setMobileTab] = useState<"chat" | "preview">("chat");
  const [copied, setCopied] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const streamRef = useRef<{ content: string }>({ content: "" });
  const pipelinesRef = useRef<Map<string, Promise<unknown>>>(new Map());

  // Beim Start: Verlauf laden, Modell im Hintergrund vorladen
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as { messages?: ChatMessage[]; model?: string; useGpu?: boolean };
        if (Array.isArray(saved.messages)) {
          setMessages(saved.messages);
          const last = [...saved.messages].reverse().find((m) => m.html);
          if (last?.html) setPreviewHtml(last.html);
        }
        if (typeof saved.model === "string" && BROWSER_MODELS.some((m) => m.id === saved.model)) {
          setModelID(saved.model);
        }
        if (typeof saved.useGpu === "boolean") setUseGpu(saved.useGpu);
      }
    } catch {
      // beschädigter Verlauf – ignorieren
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
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ messages, model: modelID, useGpu }));
    } catch {
      // Speicher voll o. ä. – ignorieren
    }
  }, [messages, modelID, useGpu]);

  // Scroll ans Ende
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Rotierender Status-Text während der Generierung
  useEffect(() => {
    if (!busy) return;
    setBusyNote(BUSY_NOTES[0]);
    let i = 0;
    const t = setInterval(() => {
      i = (i + 1) % BUSY_NOTES.length;
      setBusyNote(BUSY_NOTES[i]);
    }, 3000);
    return () => clearInterval(t);
  }, [busy]);

  function updateAssistant(id: string, patch: Partial<ChatMessage>) {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  }

  /** Lädt das Modell einmalig (gecacht pro Modell+Gerät) und liefert Generator + Tokenizer. */
  function loadPipeline(
    modelId: string,
    gpu: boolean,
    onStatus: (s: { state: LoadState; pct: { label: string; pct: number } | null; device: string }) => void,
  ): Promise<unknown> {
    const cacheKey = `${modelId}|${gpu ? "gpu" : "cpu"}`;
    const cached = pipelinesRef.current.get(cacheKey);
    if (cached) return cached;

    onStatus({ state: "loading", pct: null, device: "" });
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
        env.backends.onnx.wasm.numThreads = navigator.hardwareConcurrency || 1;
      }
      const dev = await detectDevice(gpu);
      // q4 für beide Wege: kompatibel mit WebGPU UND WASM, spart Download & Speicher.
      const dtype = "q4";

      const progress = (p: { status?: string; file?: string; loaded?: number; total?: number; progress?: number }) => {
        if (p.status === "progress") {
          const total = p.total ? p.total / 1048576 : 0;
          const loaded = p.loaded ? p.loaded / 1048576 : 0;
          const pct = total > 0 ? Math.round((loaded / total) * 100) : Math.round((p.progress ?? 0) * 100);
          onStatus({ state: "loading", pct: { label: String(p.file ?? "Modell"), pct }, device: dev });
        } else if (p.status === "done" || p.status === "ready") {
          onStatus({ state: "ready", pct: null, device: dev });
        }
      };

      try {
        const gen = await pipeline("text-generation", modelId, { device: dev, dtype, progress_callback: progress });
        onStatus({ state: "ready", pct: null, device: dev });
        return { gen, tokenizer: gen.tokenizer, TextStreamer, device: dev };
      } catch {
        if (dev !== "wasm") {
          const gen = await pipeline("text-generation", modelId, { device: "wasm", dtype: "q4", progress_callback: progress });
          onStatus({ state: "ready", pct: null, device: "wasm" });
          return { gen, tokenizer: gen.tokenizer, TextStreamer, device: "wasm" };
        }
        throw new Error("Das Modell konnte nicht geladen werden.");
      }
    })();

    prom.catch(() => onStatus({ state: "error", pct: null, device: "" }));
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
    streamRef.current = { content: "" };

    try {
      const r = (await loadPipeline(modelID, useGpu, () => {})) as {
        gen: (messages: unknown[], opts: Record<string, unknown>) => Promise<unknown>;
        tokenizer: unknown;
        TextStreamer: new (tokenizer: unknown, opts: Record<string, unknown>) => unknown;
      };

      const task = buildTaskPrompt(prompt, lastHtml);
      const chatMessages = [
        { role: "system", content: SYSTEM_INSTRUCTIONS },
        { role: "user", content: task },
      ];

      const streamer = new r.TextStreamer(r.tokenizer, {
        skip_prompt: true,
        skip_special_tokens: true,
        callback_function: (text: string) => {
          streamRef.current.content += text;
          const { html, asCode } = extractHtml(streamRef.current.content);
          if (asCode) setPreviewHtml(html);
          updateAssistant(assistantMsg.id, { streaming: true });
        },
      });

      await r.gen(chatMessages, { max_new_tokens: 2048, do_sample: false, streamer });

      const { html, asCode } = extractHtml(streamRef.current.content);
      const visible = stripCode(streamRef.current.content);
      setPreviewHtml(html);
      updateAssistant(assistantMsg.id, {
        streaming: false,
        content: asCode
          ? visible.slice(0, 400) || "✔ Fertig – deine App ist in der Vorschau."
          : streamRef.current.content.trim().slice(0, 400) || "✔ Fertig.",
        html,
      });
      setMobileTab("preview");
    } catch (err) {
      updateAssistant(assistantMsg.id, {
        streaming: false,
        content: `Fehler: ${err instanceof Error ? err.message : String(err)}`,
        error: true,
      });
    } finally {
      setBusy(false);
    }
  }

  function newChat() {
    if (messages.length > 0 && !window.confirm("Aktuellen Chat wirklich löschen?")) return;
    setMessages([]);
    setPreviewHtml("");
    setInput("");
    setView("preview");
    setMobileTab("chat");
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
    if (loadState === "loading") {
      return {
        text: loadPct ? `Modell wird geladen … ${loadPct.pct} %` : "Modell wird geladen …",
        cls: "",
      };
    }
    if (loadState === "error") return { text: "Modell konnte nicht geladen werden", cls: "bad" };
    if (loadState === "ready") {
      return { text: `Modell bereit · läuft im ${device === "webgpu" ? "Browser (GPU)" : "Browser"}`, cls: "ok" };
    }
    return { text: "bereit zu laden", cls: "" };
  }

  return (
    <div className="app">
      <header>
        <div className="brand">
          <span className="logo">⚡</span>
          <div>
            <h1>AI-Coder</h1>
            <span className="subtitle">Homepages, Spiele &amp; Web-Apps per Prompt</span>
          </div>
        </div>

        <div className="header-actions">
          <span className={`status ${statusLabel().cls}`}>
            <i />
            {statusLabel().text}
          </span>

          <label className="gpu-toggle" title="GPU nutzen, falls vorhanden (schneller). Ohne GPU läuft alles im CPU-Modus.">
            <input type="checkbox" checked={useGpu} onChange={(e) => setUseGpu(e.target.checked)} disabled={busy} />
            ⚡ GPU
          </label>

          <select
            value={modelID}
            onChange={(e) => setModelID(e.target.value)}
            disabled={busy}
            title="Kostenloses Browser-Modell wählen"
          >
            {BROWSER_MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label} · {m.size}
              </option>
            ))}
          </select>

          <button className="new-btn" onClick={newChat} disabled={busy}>
            ✦ Neu
          </button>
        </div>
      </header>

      {/* Mobile Umschalter */}
      <div className="mobile-tabs">
        <button className={mobileTab === "chat" ? "active" : ""} onClick={() => setMobileTab("chat")}>
          Chat
        </button>
        <button className={mobileTab === "preview" ? "active" : ""} onClick={() => setMobileTab("preview")}>
          Ergebnis
        </button>
      </div>

      <main>
        {/* ————— Chat-Panel ————— */}
        <section className={`panel chat-panel ${mobileTab === "chat" ? "" : "mobile-hidden"}`}>
          <div className="messages">
            {messages.length === 0 && (
              <div className="welcome">
                <div className="welcome-emoji">🛠️</div>
                <h2>Was möchtest du bauen?</h2>
                <p>
                  Beschreib einfach, was du brauchst – Homepage, Spiel oder kleine Web-App.
                  Die KI läuft dabei komplett auf diesem Gerät und zeigt dir den Code rechts live an.
                </p>
                <div className="examples">
                  {EXAMPLES.map((ex) => (
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
                  100 % kostenlos · läuft direkt im Browser · kein Server, kein Account, kein API-Key
                  <br />
                  <small>
                    Beim ersten Start wird das Modell einmalig heruntergeladen
                    ({BROWSER_MODELS.find((m) => m.id === modelID)?.size ?? "≈ 1 GB"}) und danach im Browser
                    zwischengespeichert.
                  </small>
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
              placeholder='z. B. "Erstelle ein Snake-Spiel mit Punktestand"'
              disabled={busy}
            />
            <button type="submit" disabled={busy || input.trim() === ""}>
              {busy ? "…" : "Erstellen ▶"}
            </button>
          </form>
        </section>

        {/* ————— Ergebnis-Panel ————— */}
        <section className={`panel preview-panel ${mobileTab === "preview" ? "" : "mobile-hidden"}`}>
          <div className="preview-toolbar">
            <div className="segmented">
              <button className={view === "preview" ? "active" : ""} onClick={() => setView("preview")}>
                Vorschau
              </button>
              <button className={view === "code" ? "active" : ""} onClick={() => setView("code")}>
                Code
              </button>
            </div>
            <div className="toolbar-actions">
              <button onClick={openNewTab} disabled={!previewHtml} title="In neuem Tab öffnen">↗</button>
              <button onClick={copyHtml} disabled={!previewHtml} title="Code kopieren">
                {copied ? "✓" : "⧉"}
              </button>
              <button onClick={downloadHtml} disabled={!previewHtml} title="index.html herunterladen">⬇</button>
            </div>
          </div>

          <div className="preview-body">
            {!previewHtml ? (
              <div className="preview-empty">
                <span className="preview-empty-icon">🖼️</span>
                <p>Dein Ergebnis erscheint hier – live während die KI den Code schreibt.</p>
                <p className="hint">Läuft komplett auf deinem Gerät – kein Server, kein API-Key.</p>
              </div>
            ) : view === "preview" ? (
              <iframe
                key={previewHtml.length}
                title="Vorschau"
                srcDoc={previewHtml}
                sandbox="allow-scripts allow-modals allow-forms"
                className="preview-frame"
              />
            ) : (
              <pre className="code-view">{previewHtml}</pre>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}