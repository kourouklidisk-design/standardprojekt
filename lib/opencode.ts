import { OpenCode } from "@opencode/client";

export type OpenCodeClient = ReturnType<typeof OpenCode.make>;

export type FreeModel = {
  id: string;
  providerID: string;
  name: string;
};

/**
 * Erzeugt einen Client für den OpenCode-Server.
 * Konfiguration über Umgebungsvariablen (siehe .env.example):
 *   OPENCODE_BASE_URL   – Adresse des OpenCode-Servers (Standard: http://127.0.0.1:4096)
 *   OPENCODE_PASSWORD   – das Server-Passwort, das `opencode serve` beim Start ausgibt
 *                         (Auth erfolgt per Basic Auth, Benutzer "opencode")
 */
export function createOpenCodeClient(): OpenCodeClient {
  const baseUrl = (process.env.OPENCODE_BASE_URL ?? "http://127.0.0.1:4096").replace(/\/+$/, "");
  const password = process.env.OPENCODE_PASSWORD;

  let headers: Record<string, string> | undefined;
  if (password) {
    const basic = "Basic " + Buffer.from(`opencode:${password}`, "utf8").toString("base64");
    headers = { authorization: basic };
  }

  return OpenCode.make({
    baseUrl,
    ...(headers ? { headers } : {}),
  });
}

/**
 * Arbeitsverzeichnis (absoluter Pfad auf dem SERVER-Rechner) für die
 * Chat-Sessions. Wenn nicht gesetzt, nutzt der Server sein Standard-Verzeichnis.
 */
export function workspaceDirectory(): string | undefined {
  const dir = process.env.OPENCODE_WORKSPACE;
  return dir && dir.trim() !== "" ? dir : undefined;
}

/** Standardmodell und Fallback-Modelle, die garantiert kostenlos sind. */
export const DEFAULT_MODEL_ID = "space-bunny-free";

export const FALLBACK_MODELS: FreeModel[] = [
  { id: "space-bunny-free", providerID: "opencode", name: "Space Bunny Free" },
  { id: "big-pickle", providerID: "opencode", name: "Big Pickle" },
];

const SYSTEM_INSTRUCTIONS = `Du bist "AppForge", ein Generator für einzelne HTML-Dateien. Du erstellst komplette, in sich geschlossene Web-Anwendungen als EINE index.html-Datei mit eingebettetem CSS und JavaScript.

Regeln:
- Gib ausschließlich den vollständigen HTML-Code aus, in einem einzigen Markdown-Codeblock, der mit \`\`\`html beginnt und mit \`\`\` endet.
- Keine Erklärungen, keine Kommentare außerhalb des Codeblocks, kein ganzes Programm drumherum.
- Keine Build-Tools oder Server nötig: alles läuft offline in einem Browser-Tab (vanilla HTML/CSS/JS).
- Modernes, ansprechendes Design mit CSS-Variablen, responsiv (Desktop + Mobil).
- Der Code muss sofort lauffähig sein – keine Platzhalter, keine TODO-Kommentare.
- Für Spiele: flüssige Steuerung (Tastatur/Touch), Punktestand und "Game Over"-Ansicht.
- Für Webseiten: mehrere Sektionen, Navigation, Kontaktbereich und Call-to-Action.`;

/**
 * Baut den Prompt für die One-Shot-Code-Generierung.
 * Bei einer Verbesserung wird der bisherige Code als Kontext mitgegeben.
 */
export function buildGenerationPrompt(userPrompt: string, previousHtml?: string): string {
  let prompt = `${SYSTEM_INSTRUCTIONS}\n\nAufgabe des Nutzers:\n${userPrompt}`;
  if (previousHtml && previousHtml.trim()) {
    // Begrenzen, damit sehr lange Vorschauen nicht den Kontext sprengen.
    prompt += `\n\nAktueller Code (nimm Änderungen daran vor):\n${previousHtml.trim().slice(0, 24000)}`;
  }
  return prompt;
}

/**
 * Extrahiert den HTML-Code aus der Modell-Antwort.
 * Bevorzugt einen ```html-Codeblock; fällt auf den Rohtext zurück.
 */
export function extractHtml(text: string): { html: string; asCode: boolean } {
  const htmlBlock = text.match(/```html\s*\n([\s\S]*?)```/i);
  if (htmlBlock && htmlBlock[1].trim()) {
    return { html: htmlBlock[1].trim(), asCode: true };
  }

  const anyBlock = text.match(/```\s*\n?([\s\S]*?)```/);
  if (anyBlock && anyBlock[1] && /<\/?[a-zA-Z][\s\S]*>/.test(anyBlock[1])) {
    return { html: anyBlock[1].trim(), asCode: true };
  }

  return { html: text.trim(), asCode: false };
}