import { readdir } from "node:fs/promises";
import { join, resolve } from "node:path";

/** Where the competing minification algorithms live (see algos/PROMPT.md). */
export const ALGOS_DIR = resolve(import.meta.dir, "../algos");

export interface AlgoResult {
  file: string;
  algo: string;
  model: string;
  /** Minified HTML; empty string when the algorithm failed. */
  output: string;
  error?: string;
}

/** Run every algorithm in algos/ against the given input HTML. */
export async function runAlgos(input: string): Promise<AlgoResult[]> {
  const files = (await readdir(ALGOS_DIR)).filter((f) => f.endsWith(".js")).sort();
  if (files.length === 0) {
    throw new Error(`no algorithms found in ${ALGOS_DIR}`);
  }

  const results: AlgoResult[] = [];
  for (const file of files) {
    const result: AlgoResult = { file, algo: file.replace(/\.js$/, ""), model: "unknown", output: "" };
    try {
      const mod = await import(join(ALGOS_DIR, file));
      result.algo = mod.meta?.algo ?? result.algo;
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
export function winner(results: AlgoResult[]): AlgoResult {
  const ok = results.filter((r) => !r.error);
  if (ok.length === 0) {
    throw new Error("every algorithm failed; run `bun run compare` for details");
  }
  return ok.reduce((a, b) => (Buffer.byteLength(b.output) < Buffer.byteLength(a.output) ? b : a));
}
