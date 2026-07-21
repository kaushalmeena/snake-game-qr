import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import QRCode from "qrcode";
import { computeRanking, winner } from "../lib/ranking.js";
import { INPUT_HTML, ASSETS_DIR } from "../lib/config.js";

/**
 * Renders the leaderboard winner's page into assets/qrcode.png and records the
 * winner in assets/winner.txt. `decode` recovers the page from the QR.
 */

const input = await readFile(INPUT_HTML, "utf8");
const { models } = await computeRanking(input);
const best = winner(models);

await mkdir(ASSETS_DIR, { recursive: true });
await QRCode.toFile(resolve(ASSETS_DIR, "qrcode.png"), best.dataUrl);
await writeFile(resolve(ASSETS_DIR, "winner.txt"), `model: ${best.slug}\nbytes: ${best.bytes} B\n`);

console.log(`winner: ${best.slug} — ${best.bytes} B`);
console.log(`assets/qrcode.png + assets/winner.txt saved (${best.dataUrl.length} chars encoded — scan to open the game)`);
