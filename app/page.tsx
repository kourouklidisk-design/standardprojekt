"use client";

import { type FormEvent, useEffect, useRef, useState } from "react";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  tools: string[];
  reasoning: string;
  streaming?: boolean;
};

type Payload = {
  type: string;
  delta?: string;
  sessionID?: string;
  error?: string;
  id?: string;
  input?: Record<string, unknown>;
};

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [connected, setConnected] = useState<boolean | null>(null);
  const sessionIDRef = useRef<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.ok)
      .then(setConnected)
      .catch(() => setConnected(false));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    const prompt = input.trim();
    if (!prompt || busy) return;
    setInput("");
    setBusy(true);
    setMessages((prev) => [
      ...prev,
      { role: "user", content: prompt, tools: [], reasoning: "" },
      { role: "assistant", content: "", tools: [], reasoning: "", streaming: true },
    ]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prompt, sessionID: sessionIDRef.current }),
      });

      if (!res.ok || !res.body) {
        throw new Error(`Server antwortet mit Status ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            handlePayload(JSON.parse(line) as Payload);
          } catch {
            // Ungültige Zeile ignorieren
          }
        }
      }
    } catch (err) {
      appendToLast((msg) => ({
        ...msg,
        content: msg.content || `Fehler: ${err instanceof Error ? err.message : String(err)}`,
      }));
    } finally {
      appendToLast((msg) => ({ ...msg, streaming: false }));
      setBusy(false);
    }
  }

  function handlePayload(p: Payload) {
    switch (p.type) {
      case "session":
        if (p.sessionID) sessionIDRef.current = p.sessionID;
        break;
      case "text":
        appendToLast((msg) => ({ ...msg, content: msg.content + (p.delta ?? "") }));
        break;
      case "reasoning":
        appendToLast((msg) => ({ ...msg, reasoning: msg.reasoning + (p.delta ?? "") }));
        break;
      case "tool": {
        const input = p.input;
        const name = input?.title ?? input?.tool;
        if (name) {
          appendToLast((msg) => ({ ...msg, tools: [...msg.tools, String(name)] }));
        }
        break;
      }
      case "error":
        appendToLast((msg) => ({ ...msg, content: msg.content || p.error || "Unbekannter Fehler" }));
        break;
      default:
        break;
    }
  }

  function appendToLast(update: (msg: ChatMessage) => ChatMessage) {
    setMessages((prev) => {
      if (prev.length === 0) return prev;
      const copy = prev.slice();
      copy[copy.length - 1] = update(copy[copy.length - 1]);
      return copy;
    });
  }

  return (
    <div className="chat">
      <header>
        <h1>OpenCode Chat</h1>
        <span className="status">
          {connected === null && "prüfe OpenCode-Server …"}
          {connected === true && "OpenCode-Server verbunden"}
          {connected === false && "OpenCode-Server nicht erreichbar"}
        </span>
      </header>

      <div className="messages">
        {messages.length === 0 && (
          <div className="welcome">
            <p>
              Verbunden mit deinem OpenCode-Backend.
              <br />
              Schreib eine Nachricht, um mit dem Agenten zu chatten.
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`message ${msg.role}`}>
            {msg.tools.length > 0 && (
              <div className="tools">
                {msg.tools.map((tool, j) => (
                  <span key={j} className="tool">
                    {tool}
                  </span>
                ))}
              </div>
            )}
            {msg.reasoning && <div className="reasoning">{msg.reasoning}</div>}
            {msg.content}
            {msg.streaming && <span className="cursor" />}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Nachricht an OpenCode …"
          disabled={busy}
          autoFocus
        />
        <button type="submit" disabled={busy || input.trim() === ""}>
          Senden
        </button>
      </form>
    </div>
  );
}