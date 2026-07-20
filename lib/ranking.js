import { gzipSync } from "node:zlib";
import QRCode from "qrcode";
import { minify as baselineMinify, label as baselineLabel } from "./baseline.js";
import { runModels } from "./models.js";
import { toDataUrl } from "./config.js";

/**
 * Shared ranking computation: runs every model + the baseline against the
 * input and returns fully-measured rows (bytes, gzip, savings vs baseline,
 * data URL, QR version), ranked smallest-first. `scripts/compare.js` builds on
 * this to render the README leaderboard table.
 */

/**
 * @typedef {object} Entry
 * @property {number} [rank]
 * @property {string} name - display name
 * @property {string} [slug] - project/file slug
 * @property {string} [file] - repo-relative path, for models
 * @property {string} [note] - e.g. "baseline tool"
 * @property {string} html - the generated page
 * @property {number} bytes
 * @property {number} gzip
 * @property {string} vs - savings vs baseline ("−39%") or a placeholder
 * @property {string} dataUrl
 * @property {number} urlLen
 * @property {string} qr - e.g. "v30 (137×137)" or "does not fit"
 */

/** QR version a data URL needs, or "does not fit" past a v40 code's capacity. */
export function qrVersion(dataUrl, sep = "×") {
  try {
    const qr = QRCode.create(dataUrl);
    return `v${qr.version} (${qr.modules.size}${sep}${qr.modules.size})`;
  } catch {
    return "does not fit";
  }
}

/**
 * @param {string} input - contents of input.html
 * @returns {Promise<{ models: Entry[], baseline: Entry, raw: Entry, failed: {file:string, error:string}[] }>}
 */
export async function computeRanking(input) {
  const baselineOutput = await baselineMinify(input);
  const baselineBytes = Buffer.byteLength(baselineOutput);
  const vsBaseline = (bytes) => {
    const pct = Math.round(((bytes - baselineBytes) / baselineBytes) * 100);
    return pct === 0 ? "0%" : `${pct < 0 ? "−" : "+"}${Math.abs(pct)}%`;
  };

  /** @returns {Entry} */
  const make = (html, extra = {}) => {
    const dataUrl = toDataUrl(html);
    const bytes = Buffer.byteLength(html);
    return {
      html,
      bytes,
      gzip: gzipSync(html).length,
      vs: vsBaseline(bytes),
      dataUrl,
      urlLen: dataUrl.length,
      qr: qrVersion(dataUrl),
      ...extra,
    };
  };

  const results = await runModels(input);
  const failed = results.filter((r) => r.error).map((r) => ({ file: r.file, error: r.error }));
  const ranked = results.filter((r) => !r.error).sort((a, b) => Buffer.byteLength(a.output) - Buffer.byteLength(b.output));

  const models = ranked.map((r, i) =>
    make(r.output, { rank: i + 1, slug: r.file.replace(/\.js$/, ""), name: r.model, file: `./models/${r.file}` })
  );
  const baseline = make(baselineOutput, { slug: "baseline", name: baselineLabel, note: "baseline tool", vs: "—" });
  const raw = make(input, { name: "`input.html` (raw)" });

  return { models, baseline, raw, failed };
}
