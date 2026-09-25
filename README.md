# AI-Coder – Homepages, Spiele & Web-Apps per Prompt

Eine komplett kostenlose KI-Coding-Web-App, die **ganz ohne Server** auskommt:

- 💬 Prompt eingeben: „Erstelle eine Landingpage …", „Baue ein Snake-Spiel …"
- 🧠 Das KI-Modell (**Qwen 2.5 Coder**) läuft **direkt im Browser** deines Geräts
  (WASM im CPU-Modus, optional WebGPU) – **kein Server, kein Account, kein API-Key**
- 🖼️ Das Ergebnis erscheint als **Live-Vorschau** (sandboxed iframe) mit
  Streaming: Der Code wird sichtbar, während er entsteht
- 🧩 Code-Ansicht, Kopieren, Download als `index.html`, in neuem Tab öffnen
- 🔁 Iteratives Verbessern: Folge-Prompts berücksichtigen den zuletzt erzeugten Code
- 💾 Chat-Verlauf wird im Browser gespeichert (localStorage)
- 📱 Responsiv: Mobil mit Tab-Umschalter, Desktop zweispaltig

```
Browser (dein Gerät)  →  Qwen Coder 0.5B/1.5B (läuft lokal, WASM/WebGPU)
                        Generiert HTML/CSS/JS → Vorschau im iframe
```

## Warum so?

Die meisten „AI-Apps" brauchen einen Server (Cloud-API). Diese App nicht:
transformers.js wird zur Laufzeit von einem CDN geladen und das Modell
**einmalig beim ersten Besuch heruntergeladen** (≈ 380 MB bei 0.5B, ≈ 1 GB bei
1.5B). Ab dann läuft jede Generation **kostenlos und unbegrenzt** – ganz ohne
Server, API-Key oder Account.

> ⚠️ **Erster Besuch braucht Geduld:** Je nach Verbindung dauert der
> Modell-Download einige Minuten. Browser sollen das Modell danach
> zwischencachen, das hängt aber vom Browser ab. Auf sehr schwachen CPUs ist
> auch die einmalige Initialisierung (WASM) langsam – ein normaler PC/Smartphone
> mit WebGPU ist deutlich schneller.
>
> Ein sehr kleines Modell stößt bei komplexen Anfragen an Grenzen – für
> Homepages, einfache Spiele und kleine Web-Apps reicht es sehr gut.

## Lokales Setup

Voraussetzungen: Node.js ≥ 20

```sh
npm install
npm run dev
# → http://localhost:3000
```

Tipp: `npm run build && npm start` ist deutlich stabiler als der Dev-Server
(der Dev-Modus mit HMR kann die lange Modell-Initialisierung stören).
Bei Problemen mit mehreren Threads: `http://localhost:3000/?threads=1`.

## Deployment auf Vercel (kostenlos, ohne Server-Funktionen)

Die App ist **vollständig statisch** – kein Backend, keine Server-Funktionen,
keine Umgebungsvariablen. Damit läuft sie im kostenlosen Vercel-Hobby-Tarif.

1. Repository auf GitHub pushen und bei [vercel.com/new](https://vercel.com/new) importieren.
2. Projekt-Name vergeben (z. B. `ai-coder-ai`) → URL `https://ai-coder-ai.vercel.app`.
3. Deploy – fertig. Es ist nichts weiter zu konfigurieren.

> Namens-Tipp: `ai-coder`, `aicoder`, `ai-coder-app` und `ai-app-builder` sind
> bereits vergeben. Frei und geprüft: **`ai-coder-ai`** und **`aicoder-app`**.

Hinweis: Die App setzt `Cross-Origin-Opener-Policy: same-origin` und
`Cross-Origin-Embedder-Policy: require-corp` (in `next.config.ts`), damit
WASM-Threads (SharedArrayBuffer) genutzt werden können. Nicht entfernen.

## Projektstruktur

```
app/
  page.tsx            Komplette App (Chat + Vorschau + Code), KI läuft im Browser
  layout.tsx          Metadaten (Titel, Beschreibung)
  globals.css         Styling (dunkles, responsives Layout)
  transformers-cdn.d.ts  Typdeklaration für den CDN-Import von transformers.js
```

## Sicherheit

Das erzeugte HTML läuft nur in einem sandboxed iframe
(`allow-scripts allow-modals allow-forms`, ohne `allow-same-origin`), damit
modell-generierter Code die App nicht verlassen kann. Deine Prompts verlassen
**niemals dein Gerät** – das Modell arbeitet komplett lokal.