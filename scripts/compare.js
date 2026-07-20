import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import QRCode from "qrcode";
import { minify as baselineMinify, label as baselineLabel } from "../lib/baseline";
import { runModels } from "../lib/models";
import { INPUT_HTML, toDataUrl } from "../lib/config";

/**
 * The leaderboard: runs every model's submission in models/ against input.html
 * and ranks them by output size, with the html-minifier-terser baseline and
 * the raw input shown as reference floors. Also rewrites the leaderboard table
 * in README.md (between the leaderboard markers) so it never drifts.
 */

const README = resolve(import.meta.dir, "../README.md");
const START = "<!-- leaderboard:start -->";
const END = "<!-- leaderboard:end -->";

/**
 * @typedef {object} Row
 * @property {string} rank
 * @property {string} model
 * @property {string} [file] - relative path, when the row links to a submission
 * @property {string} [note] - e.g. "baseline"
 * @property {number} bytes
 * @property {number} urlLen
 * @property {string} qr
 */

/**
 * QR version a data URL needs, or "does not fit" past a v40 code's capacity.
 * @param {string} dataUrl
 * @param {string} sep - character between the two module counts
 * @returns {string}
 */
function qrVersion(dataUrl, sep) {
  try {
    const qr = QRCode.create(dataUrl);
    return `v${qr.version} (${qr.modules.size}${sep}${qr.modules.size})`;
  } catch {
    return "does not fit";
  }
}

/**
 * @param {string} rank
 * @param {string} model
 * @param {string} output
 * @param {Partial<Row>} [extra]
 * @returns {Row}
 */
function toRow(rank, model, output, extra = {}) {
  const dataUrl = toDataUrl(output);
  return {
    rank,
    model,
    bytes: Buffer.byteLength(output),
    urlLen: dataUrl.length,
    qr: qrVersion(dataUrl, "×"), // × for the markdown table
    ...extra,
  };
}

const input = await Bun.file(INPUT_HTML).text();
const results = await runModels(input);
const failed = results.filter((r) => r.error);

const ranked = results
  .filter((r) => !r.error)
  .sort((a, b) => Buffer.byteLength(a.output) - Buffer.byteLength(b.output));

/** @type {Row[]} */
const rows = ranked.map((r, i) => toRow(`${i + 1}`, r.model, r.output, { file: `./models/${r.file}` }));
rows.push(toRow("", baselineLabel, await baselineMinify(input), { note: "baseline tool" }));
rows.push(toRow("", "`input.html` (raw)", input));

// ── Console output ────────────────────────────────────────────────────────
const con = (r, m, h, u, q) =>
  console.log(r.padEnd(4) + m.padEnd(26) + h.padStart(7) + u.padStart(10) + `  ${q}`);
con("#", "model", "html", "data URL", "QR code");
for (const row of rows) {
  const model = row.model.replace(/`/g, "") + (row.note ? ` (${row.note})` : "");
  con(row.rank, model, `${row.bytes}B`, `${row.urlLen}ch`, row.qr.replace("×", "x"));
}
for (const r of failed) console.log(`\nFAILED ${r.file}: ${r.error}`);

// ── Rewrite the README leaderboard table ────────────────────────────────────
/** @param {Row} row */
const mdRow = (row) => {
  const name = row.file ? `[${row.model}](${row.file})` : row.model;
  const label = row.note ? `${name} *(${row.note})*` : name;
  return `| ${row.rank} | ${label} | ${row.bytes} B | ${row.urlLen} ch | ${row.qr} |`;
};
const table = [
  "| # | model | html | data URL | QR code |",
  "|---|-------|-----:|---------:|---------|",
  ...rows.map(mdRow),
].join("\n");

const readme = await readFile(README, "utf8");
const re = new RegExp(`${START}[\\s\\S]*?${END}`);
if (!re.test(readme)) {
  console.log(`\nNote: add ${START} / ${END} markers around the README table to auto-update it.`);
} else {
  const updated = readme.replace(re, `${START}\n\n${table}\n\n${END}`);
  if (updated !== readme) {
    await writeFile(README, updated);
    console.log("\nREADME leaderboard table updated.");
  } else {
    console.log("\nREADME leaderboard table already up to date.");
  }
}

if (failed.length > 0) process.exit(1);
