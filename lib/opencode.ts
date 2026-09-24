import { OpenCode } from "@opencode/client";

export type OpenCodeClient = ReturnType<typeof OpenCode.make>;

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