import type { NextConfig } from "next";

// Vollständig statische App: kein Server-Code nötig, die KI läuft direkt im Browser.
// COOP/COEP aktivieren SharedArrayBuffer → ort-web (transformers.js) kann bei WASM
// mehrere Threads nutzen: deutlich schnellere Modell-Initialisierung und Generierung.
const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
        ],
      },
      {
        // Dokument nie cachen: verhindert, dass eine alte App-Version „kleben bleibt",
        // bis der Browser neu lädt (Ursache: „Klick auf Erstellen reagiert nicht").
        source: "/",
        headers: [{ key: "Cache-Control", value: "no-store" }],
      },
    ];
  },
};

export default nextConfig;