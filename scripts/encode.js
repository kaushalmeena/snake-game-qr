import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import QRCode from "qrcode";
import { runModels, winner } from "../lib/models";
import { INPUT_HTML, QR_CODE, toDataUrl } from "../lib/config";

const html = await Bun.file(INPUT_HTML).text();

// The leaderboard winner's output is what ships in the QR code.
const best = winner(await runModels(html));
const dataUrl = toDataUrl(best.output);

console.log(`winner: ${best.model} — ${best.output.length} bytes`);

// QRCode.toFile won't create the output directory, so make sure it exists.
await mkdir(dirname(QR_CODE), { recursive: true });
await QRCode.toFile(QR_CODE, dataUrl);

console.log(`${QR_CODE} saved! (${dataUrl.length} bytes encoded — scan to open the game)`);
