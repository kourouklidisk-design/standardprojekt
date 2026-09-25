/* Typdeklaration für den Laufzeit-Import von transformers.js vom CDN. */
declare module "https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.0/+esm" {
  // Für dieses Projekt reicht eine lockere Typisierung (any).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const pipeline: (task: string, model: string, options?: Record<string, unknown>) => Promise<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export class TextStreamer {
    constructor(tokenizer: unknown, options: Record<string, unknown>);
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const env: any;
}