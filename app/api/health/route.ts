import { createOpenCodeClient } from "@/lib/opencode";

export const runtime = "nodejs";

/**
 * Prüft, ob der OpenCode-Server erreichbar ist (wird von der
 * Chat-Oberfläche für die Statusanzeige genutzt).
 */
export async function GET() {
  const client = createOpenCodeClient();
  try {
    const info = await client.server.info();
    return Response.json({ ok: true, info });
  } catch {
    return Response.json({ ok: false }, { status: 503 });
  }
}