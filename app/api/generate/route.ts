import {
  createOpenCodeClient,
  buildGenerationPrompt,
  extractHtml,
  DEFAULT_MODEL_ID,
  FALLBACK_MODELS,
} from "@/lib/opencode";

export const runtime = "nodejs";
export const maxDuration = 300;

type GenerateRequest = {
  prompt?: unknown;
  previousHtml?: unknown;
  modelID?: unknown;
};

/**
 * Generiert per Prompt eine komplette Ein-Datei-Web-App (HTML/CSS/JS).
 * Nutzt den One-Shot-Endpunkt des OpenCode-Servers mit einem kostenlosen Modell.
 */
export async function POST(req: Request) {
  let body: GenerateRequest;
  try {
    body = (await req.json()) as GenerateRequest;
  } catch {
    return Response.json({ error: "Ungültiges JSON im Request-Body." }, { status: 400 });
  }

  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  if (!prompt) {
    return Response.json({ error: "Feld 'prompt' ist erforderlich." }, { status: 400 });
  }

  const previousHtml = typeof body.previousHtml === "string" ? body.previousHtml : undefined;
  const modelID = typeof body.modelID === "string" ? body.modelID : DEFAULT_MODEL_ID;
  const model = FALLBACK_MODELS.find((m) => m.id === modelID) ?? FALLBACK_MODELS[0];

  const client = createOpenCodeClient();

  try {
    const { text } = await client.generate.text({
      prompt: buildGenerationPrompt(prompt, previousHtml),
      model: { id: model.id, providerID: model.providerID },
    });

    const raw = text ?? "";
    const { html, asCode } = extractHtml(raw);

    return Response.json({
      html,
      model: model.id,
      note: asCode ? undefined : "Die Antwort konnte nicht als HTML interpretiert werden – sie wird als Datei angezeigt.",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // Häufig auftretende Fehler kurz und verständlich fassen.
    if (/no supported model|no model/i.test(message)) {
      return Response.json(
        { error: "Auf dem OpenCode-Server ist kein passendes Modell verfügbar." },
        { status: 502 },
      );
    }
    return Response.json({ error: `Generation fehlgeschlagen: ${message}` }, { status: 502 });
  }
}