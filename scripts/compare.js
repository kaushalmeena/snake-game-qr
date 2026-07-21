import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import { computeRanking } from "../lib/ranking.js";
import { INPUT_HTML } from "../lib/config.js";

/**
 * The leaderboard, to the terminal and the README. Ranks every submission in
 * output/ by page size (with the baseline and raw input as reference floors)
 * and, after confirmation, rewrites the table between the README's leaderboard
 * markers. Each model row links to its output.html and WRITEUP.md. All
 * measurement lives in lib/ranking.js.
 */

/** Ask a yes/no question; false when not attached to a terminal. */
async function confirm(question) {
  if (!process.stdin.isTTY) return false;
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = (await rl.question(question)).trim().toLowerCase();
    return answer === "y" || answer === "yes";
  } finally {
    rl.close();
  }
}

const README = resolve(import.meta.dirname, "../README.md");
const START = "<!-- leaderboard:start -->";
const END = "<!-- leaderboard:end -->";

const input = await readFile(INPUT_HTML, "utf8");
const { models, baseline, raw } = await computeRanking(input);
const rows = [...models, baseline, raw];

// ── Console output ────────────────────────────────────────────────────────
const con = (r, m, h, g, v, q) =>
  console.log(r.padEnd(4) + m.padEnd(26) + h.padStart(7) + g.padStart(7) + v.padStart(7) + `  ${q}`);
con("#", "model", "html", "gzip", "vs", "QR code");
for (const row of rows) {
  const name = row.name.replace(/`/g, "") + (row.note ? ` (${row.note})` : "");
  con(`${row.rank ?? ""}`, name, `${row.bytes}B`, `${row.gzip}B`, row.vs.replace("−", "-"), row.qr.replace("×", "x"));
}

// ── Rewrite the README leaderboard table ────────────────────────────────────
const mdRow = (row) => {
  const model = row.note ? `${row.name} *(${row.note})*` : row.name;
  const output = row.outputPath ? `[output](${row.outputPath})` : "—";
  const writeup = row.writeupPath ? `[writeup](${row.writeupPath})` : "—";
  return `| ${row.rank ?? ""} | ${model} | ${row.bytes} B | ${row.gzip} B | ${row.vs} | ${row.qr} | ${output} | ${writeup} |`;
};
const table = [
  "| # | model | html | gzip | vs baseline | QR code | output | writeup |",
  "|---|-------|-----:|-----:|:-----------:|---------|:------:|:-------:|",
  ...rows.map(mdRow),
].join("\n");

const readme = await readFile(README, "utf8");
const re = new RegExp(`${START}[\\s\\S]*?${END}`);
if (!re.test(readme)) {
  console.log(`\nNote: add ${START} / ${END} markers around the README table to update it.`);
} else {
  const updated = readme.replace(re, `${START}\n\n${table}\n\n${END}`);
  if (updated === readme) {
    console.log("\nREADME leaderboard table is already up to date.");
  } else if (await confirm("\nUpdate the README leaderboard table with these numbers? (y/N) ")) {
    await writeFile(README, updated);
    console.log("README updated.");
  } else {
    console.log("README left unchanged.");
  }
}
