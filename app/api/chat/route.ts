import { createOpenCodeClient, workspaceDirectory } from "@/lib/opencode";

// Erlaubt lange Agent-Antworten (max. 5 Minuten; für längere Streams
// auf Vercel "Fluid Compute" verwenden).
export const maxDuration = 300;
export const runtime = "nodejs";

const encoder = new TextEncoder();

type StreamChunk = {
  type: string;
  [key: string]: unknown;
};

/**
 * Gibt eine Nachricht als NDJSON-Zeile an den Browser aus.
 */
function send(controller: ReadableStreamDefaultController, chunk: StreamChunk) {
  try {
    controller.enqueue(encoder.encode(JSON.stringify(chunk) + "\n"));
  } catch {
    // Stream wurde vom Client geschlossen – ignorieren.
  }
}

export async function POST(req: Request) {
  let body: { prompt?: unknown; sessionID?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Ungültiges JSON im Request-Body." }, { status: 400 });
  }

  const { prompt, sessionID } = body;
  if (typeof prompt !== "string" || prompt.trim() === "") {
    return Response.json({ error: "Feld 'prompt' ist erforderlich." }, { status: 400 });
  }

  const client = createOpenCodeClient();

  // Stream, der als NDJSON direkt in die Browser-Antwort läuft.
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let sessionId = typeof sessionID === "string" ? sessionID : undefined;

      // 1) Session anlegen (falls noch keine existiert)
      try {
        if (!sessionId) {
          const directory = workspaceDirectory();
          const session = await client.session.create({
            title: "Chat vom Standardprojekt",
            ...(directory ? { location: { directory } } : {}),
          });
          sessionId = session.id;
        }
      } catch (err) {
        send(controller, { type: "error", message: `Session konnte nicht erstellt werden: ${errorMessage(err)}` });
        try { await controller.close(); } catch { /* noop */ }
        return;
      }

      send(controller, { type: "session", sessionID: sessionId });

      let done = false;

      // 2) Event-Stream öffnen, BEVOR die Nachricht gesendet wird,
      //    damit keine Deltas verloren gehen. Events global für die
      //    Session durchreichen.
      const events = client.event.subscribe();
      const iterator = events[Symbol.asyncIterator]();

      const pump = (async () => {
        try {
          for await (const event of events) {
            const eventSession = (event as { data?: { sessionID?: string } }).data?.sessionID;
            if (eventSession && eventSession !== sessionId) continue;

            switch (event.type) {
              case "session.text.delta":
                send(controller, { type: "text", delta: (event as { data: { delta: string } }).data.delta });
                break;
              case "session.reasoning.delta":
                send(controller, { type: "reasoning", delta: (event as { data: { delta: string } }).data.delta });
                break;
              case "session.tool.called":
                send(controller, {
                  type: "tool",
                  id: (event as { data: { id: string } }).data.id,
                  input: (event as { data: { input: object } }).data.input,
                });
                break;
              case "session.tool.success":
              case "session.tool.failed":
                send(controller, { type: "toolresult", finished: true });
                break;
              case "session.execution.succeeded":
              case "session.execution.interrupted":
              case "session.execution.failed": {
                const failed = event.type === "session.execution.failed";
                send(controller, {
                  type: "done",
                  error: failed ? "Die Ausführung des Agents ist fehlgeschlagen." : undefined,
                });
                done = true;
                return;
              }
            }
          }
        } catch (err) {
          send(controller, { type: "error", message: `Event-Stream beendet: ${errorMessage(err)}` });
        } finally {
          done = true;
        }
      })();

      // 3) Nachricht an die Session senden.
      try {
        await client.session.prompt({ sessionID: sessionId, text: prompt });
      } catch (err) {
        send(controller, { type: "error", message: `Nachricht konnte nicht gesendet werden: ${errorMessage(err)}` });
      }

      // 4) Warten, bis der Event-Stream beendet wird (Terminal-Event),
      //    dann Subskription sauber schließen.
      await pump;
      try { await iterator.return?.(); } catch { /* noop */ }

      if (!done) {
        send(controller, { type: "done", sessionID: sessionId });
      }
      try { await controller.close(); } catch { /* noop */ }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "application/x-ndjson; charset=utf-8",
      "cache-control": "no-cache, no-transform",
    },
  });
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}