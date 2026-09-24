"use client";

import { type FormEvent, useEffect, useRef, useState } from "react";

type FreeModel = { id: string; providerID: string; name: string };

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  html?: string;
  busy?: boolean;
  error?: boolean;
};

const STORAGE_KEY = "appforge.v1";
const DEFAULT_MODEL = "space-bunny-free";

const EXAMPLES: { icon: string; label: string; prompt: string }[] = [
  { icon: "🌐", label: "Landingpage", prompt: "Erstelle eine moderne Landingpage für ein italienisches Café mit Öffnungszeiten und Fotos." },
  { icon: "🐍", label: "Spiel", prompt: "Baue ein klassisches Snake-Spiel mit Punktestand, Level-Display und Game-Over-Ansicht." },
  { icon: "✅", label: "To-Do-App", prompt: "Erstelle eine To-Do-Liste als Web-App mit Addieren, Abhaken, Löschen und Speichern im Browser." },
  { icon: "🧮", label: "Rechner", prompt: "Baue einen schönen Taschenrechner mit Tastatursteuerung und Verlauf." },
];

const BUSY_NOTES = [
  "Idee wird umgesetzt …",
  "Code wird geschrieben …",
  "Design wird abgerundet …",
  "Fast fertig …",
];

function newId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [busyNote, setBusyNote] = useState(BUSY_NOTES[0]);
  const [models, setModels] = useState<FreeModel[]>([]);
  const [modelID, setModelID] = useState(DEFAULT_MODEL);
  const [connected, setConnected] = useState<boolean | null>(null);
  const [view, setView] = useState<"preview" | "code">("preview");
  const [mobileTab, setMobileTab] = useState<"chat" | "preview">("chat");
  const [copied, setCopied] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const lastHtml = [...messages].reverse().find((m) => m.html)?.html ?? "";

  // Initial laden: Verlauf, Modell-Liste, Server-Status
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as { messages?: ChatMessage[]; model?: string };
        if (Array.isArray(saved.messages)) setMessages(saved.messages);
        if (typeof saved.model === "string") setModelID(saved.model);
      }
    } catch {
      // ignorieren – gespeicherter Verlauf ist beschädigt
    }

    fetch("/api/health")
      .then((r) => r.ok)
      .then(setConnected)
      .catch(() => setConnected(false));

    fetch("/api/models")
      .then((r) => r.json() as Promise<{ models: FreeModel[] }>)
      .then((data) => {
        if (Array.isArray(data.models) && data.models.length > 0) setModels(data.models);
      })
      .catch(() => setModels([]));
  }, []);

  // Verlauf automatisch speichern
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ messages, model: modelID }));
    } catch {
      // Speicher voll o. ä. – still ignorieren
    }
  }, [messages, modelID]);

  // Scroll ans Ende, wenn sich Nachrichten ändern
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
    }, 2600);
    return () => clearInterval(t);
  }, [busy]);

  async function handleSend(e?: FormEvent) {
    e?.preventDefault();
    const prompt = input.trim();
    if (!prompt || busy) return;
    setInput("");
    setMobileTab("chat");

    setMessages((prev) => [
      ...prev,
      { id: newId(), role: "user", content: prompt },
      { id: newId(), role: "assistant", content: "", busy: true },
    ]);
    setBusy(true);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prompt, previousHtml: lastHtml, modelID }),
      });

      const data = (await res.json()) as { html?: string; error?: string; note?: string };
      if (!res.ok || data.error) {
        throw new Error(data.error ?? `Server antwortet mit Status ${res.status}`);
      }

      setMessages((prev) => {
        const copy = prev.slice();
        const idx = copy.findLastIndex((m) => m.role === "assistant" && m.busy);
        if (idx >= 0) {
          copy[idx] = {
            ...copy[idx],
            content: data.note ?? "✔ Fertig – deine App ist in der Vorschau.",
            html: data.html ?? "",
            busy: false,
          };
        }
        return copy;
      });
      setView("preview");
      setMobileTab("preview");
    } catch (err) {
      setMessages((prev) => {
        const copy = prev.slice();
        const idx = copy.findLastIndex((m) => m.role === "assistant" && m.busy);
        if (idx >= 0) {
          copy[idx] = {
            ...copy[idx],
            content: `Fehler: ${err instanceof Error ? err.message : String(err)}`,
            busy: false,
            error: true,
          };
        }
        return copy;
      });
    } finally {
      setBusy(false);
    }
  }

  function newChat() {
    if (messages.length > 0 && !window.confirm("Aktuellen Chat wirklich löschen?")) return;
    setMessages([]);
    setInput("");
    setView("preview");
    setMobileTab("chat");
    textareaRef.current?.focus();
  }

  async function copyHtml() {
    if (!lastHtml) return;
    try {
      await navigator.clipboard.writeText(lastHtml);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // kein Clipboard-Zugriff
    }
  }

  function downloadHtml() {
    if (!lastHtml) return;
    const blob = new Blob([lastHtml], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "index.html";
    a.click();
    URL.revokeObjectURL(url);
  }

  function openNewTab() {
    if (!lastHtml) return;
    const url = URL.createObjectURL(new Blob([lastHtml], { type: "text/html" }));
    window.open(url, "_blank");
  }

  return (
    <div className="app">
      <header>
        <div className="brand">
          <span className="logo">⚡</span>
          <div>
            <h1>AppForge</h1>
            <span className="subtitle">AI-App-Builder – Homepages, Spiele &amp; Web-Apps</span>
          </div>
        </div>

        <div className="header-actions">
          <span className={`status ${connected === true ? "ok" : connected === false ? "bad" : ""}`}>
            <i />
            {connected === null
              ? "verbinde …"
              : connected
                ? "Server verbunden"
                : "Server offline"}
          </span>

          {models.length > 0 && (
            <select value={modelID} onChange={(e) => setModelID(e.target.value)} title="Kostenloses Modell wählen">
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} · kostenlos
                </option>
              ))}
            </select>
          )}

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
                  AppForge erstellt den kompletten Code und zeigt ihn dir rechts live an.
                </p>
                <div className="examples">
                  {EXAMPLES.map((ex) => (
                    <button key={ex.label} onClick={() => { setInput(ex.prompt); textareaRef.current?.focus(); }}>
                      <span>{ex.icon}</span> {ex.label}
                    </button>
                  ))}
                </div>
                <p className="hint">100 % kostenlos · läuft direkt im Browser · keine Anmeldung</p>
              </div>
            )}

            {messages.map((msg) => (
              <div key={msg.id} className={`message ${msg.role}`}>
                <div className="bubble">
                  {msg.role === "user" && msg.content}
                  {msg.role === "assistant" && msg.busy && (
                    <span className="busy">
                      <span className="spinner" /> {busyNote}
                    </span>
                  )}
                  {msg.role === "assistant" && !msg.busy && (
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
              <button onClick={openNewTab} disabled={!lastHtml} title="In neuem Tab öffnen">↗</button>
              <button onClick={copyHtml} disabled={!lastHtml} title="Code kopieren">
                {copied ? "✓" : "⧉"}
              </button>
              <button onClick={downloadHtml} disabled={!lastHtml} title="index.html herunterladen">⬇</button>
            </div>
          </div>

          <div className="preview-body">
            {!lastHtml ? (
              <div className="preview-empty">
                <span className="preview-empty-icon">🖼️</span>
                <p>Dein Ergebnis erscheint hier – bereit zum Anklicken, Ausprobieren und Weitergestalten.</p>
              </div>
            ) : view === "preview" ? (
              <iframe
                key={lastHtml.length}
                title="Vorschau"
                srcDoc={lastHtml}
                sandbox="allow-scripts allow-modals allow-forms"
                className="preview-frame"
              />
            ) : (
              <pre className="code-view">{lastHtml}</pre>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}