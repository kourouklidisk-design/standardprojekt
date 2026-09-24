import { createOpenCodeClient, FALLBACK_MODELS, type FreeModel } from "@/lib/opencode";

export const runtime = "nodejs";

/**
 * Listet alle kostenlosen Modelle des OpenCode-Servers für den Auswahl-Dialog.
 * Fallback auf eine feste Liste, falls der Server nicht erreichbar ist.
 */
export async function GET() {
  const client = createOpenCodeClient();

  try {
    const result = await client.model.list();
    const data = Array.isArray(result) ? result : result.data ?? [];

    const free = data
      .filter((m) => {
        const isOurs = m.providerID === "opencode";
        const active = m.status === "active";
        const noCost = Array.isArray(m.cost) && m.cost.length > 0 && m.cost.every((c: { input?: number; output?: number }) => (Number(c.input) || 0) + (Number(c.output) || 0) === 0);
        return isOurs && active && noCost;
      })
      .map((m): FreeModel => ({ id: m.id, providerID: m.providerID, name: m.name }));

    return Response.json({ models: free.length > 0 ? free : FALLBACK_MODELS });
  } catch {
    return Response.json({ models: FALLBACK_MODELS });
  }
}