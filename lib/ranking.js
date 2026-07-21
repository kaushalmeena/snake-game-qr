import { gzipSync } from "node:zlib";
import QRCode from "qrcode";
import { minify as baselineMinify, label as baselineLabel } from "./baseline.js";
import { readEntries } from "./entries.js";
import { toDataUrl } from "./config.js";

/**
 * Shared ranking computation: measures every submission's output.html (plus the
 * html-minifier baseline and the raw input as reference floors) and
 * returns fully-measured rows (bytes, gzip, savings vs baseline, data URL, QR
 * version), ranked smallest-first. `scripts/compare.js` renders the README
 * table from this; `scripts/encode.js`/`decode.js` take the winner (models[0]).
 */

/**
 * @typedef {object} Entry
 * @property {number} [rank]
 * @property {string} name - display name
 * @property {string} [slug]
 * @property {string} [outputPath] - repo-relative link to output.html
 * @property {string|null} [writeupPath] - repo-relative link to WRITEUP.md
 * @property {string} [note] - e.g. "baseline tool"
 * @property {string} html
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
 * @returns {Promise<{ models: Entry[], baseline: Entry, raw: Entry }>}
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

  const submissions = await readEntries();
  const models = submissions
    .map((s) => make(s.html, { slug: s.slug, name: s.name, outputPath: s.outputPath, writeupPath: s.writeupPath }))
    .sort((a, b) => a.bytes - b.bytes)
    .map((entry, i) => ({ ...entry, rank: i + 1 }));

  const baseline = make(baselineOutput, { slug: "baseline", name: baselineLabel, note: "baseline tool", vs: "—" });
  const raw = make(input, { name: "`input.html` (raw)" });

  return { models, baseline, raw };
}

/** The smallest submission — what ships in the QR code. */
export function winner(models) {
  if (models.length === 0) throw new Error("no submissions to pick a winner from");
  return models[0];
}
