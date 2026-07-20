import { readdir } from "node:fs/promises";
import { join, resolve } from "node:path";

/** Where the competing models' submissions live (see input/PROMPT.md). */
export const MODELS_DIR = resolve(import.meta.dir, "../models");

export interface ModelResult {
  file: string;
  model: string;
  /** Minified HTML; empty string when the submission failed. */
  output: string;
  error?: string;
}

/** Run every model submission in models/ against the given input HTML. */
export async function runModels(input: string): Promise<ModelResult[]> {
  const files = (await readdir(MODELS_DIR)).filter((f) => f.endsWith(".js")).sort();
  if (files.length === 0) {
    throw new Error(`no submissions found in ${MODELS_DIR}`);
  }

  const results: ModelResult[] = [];
  for (const file of files) {
    const result: ModelResult = { file, model: file.replace(/\.js$/, ""), output: "" };
    try {
      const mod = await import(join(MODELS_DIR, file));
      result.model = mod.meta?.model ?? result.model;
      const output = await mod.minify(input);
      if (typeof output !== "string" || output.length === 0) {
        throw new Error("minify() must return a non-empty string");
      }
      result.output = output;
    } catch (e) {
      result.error = e instanceof Error ? e.message : String(e);
    }
    results.push(result);
  }
  return results;
}

/** The smallest successful output — what goes into the QR code. */
export function winner(results: ModelResult[]): ModelResult {
  const ok = results.filter((r) => !r.error);
  if (ok.length === 0) {
    throw new Error("every submission failed; run `bun run compare` for details");
  }
  return ok.reduce((a, b) => (Buffer.byteLength(b.output) < Buffer.byteLength(a.output) ? b : a));
}
