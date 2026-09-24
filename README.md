# Standardprojekt – OpenCode Chat App

Eine Next.js-App, die eine Chat-Oberfläche bereitstellt und sich über die
[OpenCode HTTP API](https://opencode.ai/v2/docs/api) mit einem OpenCode-Server
verbindet. Das Frontend läuft auf **Vercel**, der eigentliche OpenCode-Agent
läuft auf einem Rechner deiner Wahl (lokal, VPS, Docker …).

## Architektur

```
Browser  →  Vercel (Next.js)  →  OpenCode-Server  →  LLM-Provider
           UI + /api/chat         (opencode serve)
           + /api/health          Zustand & Agenten-Logik
```

Warum so? OpenCode ist ein zustandsbehafteter Server (Sessions, Dateisystem,
Laufzeitprozesse). Vercel-Funktionen sind kurzlebig und ohne dauerhaften
Speicher – daher lebt die OpenCode-Instanz extern und die Vercel-App spricht
sie per HTTP an.

## Lokales Setup

Voraussetzungen: Node.js ≥ 20, eine OpenCode-Installation mit mindestens einem
konfigurierten Modell.

```sh
# 1. Abhängigkeiten installieren
npm install

# 2. Umgebungsvariablen anlegen
cp .env.example .env.local
#   → OPENCODE_PASSWORD setzen (wird beim Serverstart ausgegeben)

# 3. OpenCode-Server starten (in einem separaten Terminal)
opencode serve --port 4096
#   → merkt euch das "server password …"

# 4. Next.js-Dev-Server starten
npm run dev
# → http://localhost:3000
```

### Umgebungsvariablen

| Variable | Beschreibung |
| --- | --- |
| `OPENCODE_BASE_URL` | Adresse des OpenCode-Servers (Standard: `http://127.0.0.1:4096`) |
| `OPENCODE_PASSWORD` | Passwort aus der Serve-Ausgabe; Auth per Basic Auth (Benutzer `opencode`) |
| `OPENCODE_WORKSPACE` | Arbeitsverzeichnis des Agents auf dem Server-Rechner (Standard: `standardprojekt-workspace`) |

## Deployment auf Vercel

1. Projekt bei Vercel importieren (Git-Repository oder `vercel` CLI):

   ```sh
   npm install -g vercel
   vercel login
   vercel
   ```

2. Umgebungsvariablen in Vercel setzen (Dashboard → Project → Settings →
   Environment Variables):
   - `OPENCODE_BASE_URL` → öffentlich erreichbare Adresse deines OpenCode-Servers
     (z. B. `https://opencode.deinedomain.de`)
   - `OPENCODE_PASSWORD` → Passwort deines OpenCode-Servers
   - `OPENCODE_WORKSPACE` → Arbeitsverzeichnis auf dem Server

3. Wichtig: Der OpenCode-Server muss aus dem öffentlichen Internet erreichbar
   sein. Sichere ihn zusätzlich ab (das Basic-Passwort ist die Mindestabsicherung).

> Hinweis: API-Routen sind mit `maxDuration = 300` (5 Minuten) konfiguriert.
> Auf dem kostenlosen Vercel-Plan ist die Standardgrenze 60 s – kürzere
> Agent-Antworten wählen oder [Fluid Compute](https://vercel.com/docs/functions/fluid-compute)
> aktivieren.

## API

### `POST /api/chat`

Body: `{ "prompt": "text", "sessionID": "optional" }`

Antwort: NDJSON-Stream mit Zeilen:

| Typ | Bedeutung |
| --- | --- |
| `{"type":"session","sessionID":…}` | Session-ID (für Folge-Nachrichten wiederverwenden) |
| `{"type":"text","delta":"…"}` | Text-Teil der Antwort |
| `{"type":"reasoning","delta":"…"}` | Reasoning-Teil (wenn das Modell es liefert) |
| `{"type":"tool","input":…}` | Aufgerufenes Tool |
| `{"type":"toolresult","finished":true}` | Tool beendet |
| `{"type":"done","error":…}` | Antwort fertig (optional mit Fehler) |
| `{"type":"error","message":…}` | Fehler |

### `GET /api/health`

Prüft, ob der OpenCode-Server erreichbar ist (`200`/`503`).

## Projektstruktur

```
app/
  page.tsx            Chat-Oberfläche
  api/chat/route.ts   Proxy zum OpenCode-Server (Streaming)
  api/health/route.ts Gesundheitscheck
lib/
  opencode.ts         Client-Wrapper (Basic Auth, Konfiguration)
```