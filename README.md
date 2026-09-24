# AppForge – AI-App-Builder

Eine komplett kostenlose AI-Coding-Web-App: Über einen Prompt erstellst du
**Homepages, Spiele und kleine Web-Apps** – das Ergebnis wird direkt im Browser
angezeigt. Rechts siehst du die Live-Vorschau, links läuft der Chat.

Gebaut mit Next.js (Frontend) und einem **OpenCode-Server** als kostenlosem
KI-Backend (Standardmodell `space-bunny-free`, inkl. Tool-Unterstützung, ohne
API-Key).

```
Browser  →  Vercel (Next.js)  →  OpenCode-Server  →  Free-Modell (opencode.ai)
           Chat + Vorschau          (opencode serve)   Generiert HTML/CSS/JS
```

## Features

- 💬 **Chat** mit Prompt: „Erstelle eine Landingpage …", „Baue ein Snake-Spiel …"
- 🖼️ **Live-Vorschau** des erzeugten Ergebnisses (sandboxed iframe)
- 🧩 **Code-Ansicht**, Kopieren & Download als `index.html`, in neuem Tab öffnen
- 🧠 **Kostenlose Modell-Auswahl** (alle `opencode`-Modelle ohne Kosten, live vom Server geladen)
- 🔁 **Iterativ verbessern** – Folge-Prompts berücksichtigen den zuletzt erzeugten Code
- 💾 Persistenter Chat-Verlauf im Browser (localStorage)
- 📱 Responsive: Mobil (Tab-Umschalter) und Desktop (zweispaltig)

## Lokales Setup

Voraussetzungen: Node.js ≥ 20, OpenCode-CLI mit mind. einem kostenlosen Modell konfiguriert.

```sh
# 1. Abhängigkeiten installieren
npm install

# 2. Umgebungsvariablen anlegen
cp .env.example .env.local
#   → OPENCODE_PASSWORD setzen (wird beim Serverstart ausgegeben)

# 3. OpenCode-Server starten (separates Terminal)
opencode serve --port 4096
#   → "server password …" merken

# 4. Dev-Server starten
npm run dev
# → http://localhost:3000
```

### Umgebungsvariablen

| Variable | Beschreibung |
| --- | --- |
| `OPENCODE_BASE_URL` | Adresse des OpenCode-Servers (Standard: `http://127.0.0.1:4096`) |
| `OPENCODE_PASSWORD` | Passwort aus der Serve-Ausgabe; Auth per Basic Auth (Benutzer `opencode`) |
| `OPENCODE_WORKSPACE` | Optional: Arbeitsverzeichnis auf dem Server-Rechner (absoluter Pfad) |

## Deployment auf Vercel

1. Repository auf GitHub pushen und bei [vercel.com/new](https://vercel.com/new) importieren
   (Framework wird automatisch als Next.js erkannt).
2. Umgebungsvariablen im Vercel-Dashboard setzen:
   - `OPENCODE_BASE_URL` → öffentlich erreichbare Adresse deines OpenCode-Servers
     (z. B. ein Cloudflare-Tunnel oder ein gehosteter Server)
   - `OPENCODE_PASSWORD` → Passwort des OpenCode-Servers
3. Deploy – fertig.

### Backend öffentlich erreichbar machen (Tunnel)

Der OpenCode-Server läuft nicht auf Vercel (zustandsbehaftet). Für Tests/Demos:

```sh
# cloudflared installieren (Windows: winget install Cloudflare.cloudflared)
cloudflared tunnel --url http://127.0.0.1:4096
# → URL wie https://xxx.trycloudflare.com nutzen
```

Diese URL als `OPENCODE_BASE_URL` eintragen. Achtung: Quick-Tunnel-URLs ändern
sich bei jedem Neustart. Für Produktion einen benannten Tunnel (eigene Domain)
oder einen gehosteten Server verwenden.

> ⚠️ Der Tunnel macht den Server öffentlich erreichbar – wer das Basic-Passwort
> kennt, hat Zugriff. Für echte Produktion stärker absichern (Reverse Proxy mit
> Auth o. ä.).

## API

| Route | Beschreibung |
| --- | --- |
| `POST /api/generate` | Body `{ prompt, previousHtml?, modelID? }` → `{ html, model }` (One-Shot-Generierung) |
| `GET /api/models` | Kostenlose Modelle des OpenCode-Servers (`{ models: [{ id, providerID, name }] }`) |
| `GET /api/health` | Erreichbarkeit des OpenCode-Servers (`200`/`503`) |

## Projektstruktur

```
app/
  page.tsx              AppForge UI (Chat + Vorschau + Code)
  api/generate/route.ts Code-Generierung via OpenCode (One-Shot)
  api/models/route.ts   Kostenlose Modell-Liste
  api/health/route.ts   Gesundheitscheck
lib/
  opencode.ts           Client-Wrapper, Prompt-Bau & HTML-Extraktion
```

## Sicherheit

Generierte Ergebnisse laufen in einem sandboxed iframe
(`allow-scripts allow-modals allow-forms`, ohne `allow-same-origin`), damit
modell-generierter Code die App nicht verlassen kann.