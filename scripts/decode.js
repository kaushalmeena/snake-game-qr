import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Jimp } from "jimp";
import jsQR from "jsqr";
import { computeRanking, winner } from "../lib/ranking.js";
import { INPUT_HTML, ASSETS_DIR, fromDataUrl } from "../lib/config.js";

/**
 * Recovers the page from assets/qrcode.png (written by `encode`) into
 * assets/output.html — the round-trip check that the QR really carries the
 * whole game, byte-identical to the winning submission.
 */

const qrPath = resolve(ASSETS_DIR, "qrcode.png");
const { bitmap } = await Jimp.read(qrPath); // throws if `encode` hasn't run
const result = jsQR(new Uint8ClampedArray(bitmap.data), bitmap.width, bitmap.height);
if (!result) throw new Error(`no QR code found in ${qrPath}`);

const html = fromDataUrl(result.data);

const input = await readFile(INPUT_HTML, "utf8");
const best = winner((await computeRanking(input)).models);
if (html !== best.html) {
  throw new Error("decoded page does not match the winning submission — QR round-trip failed");
}

await mkdir(ASSETS_DIR, { recursive: true });
await writeFile(resolve(ASSETS_DIR, "output.html"), html);

console.log(`assets/output.html saved (${Buffer.byteLength(html)} B decoded, matches ${best.slug})`);
