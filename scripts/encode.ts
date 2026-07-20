import QRCode from "qrcode";
import { runAlgos, winner } from "./algos";
import { INPUT_HTML, QR_CODE, toDataUrl } from "./config";

const html = await Bun.file(INPUT_HTML).text();

// The leaderboard winner's output is what ships in the QR code.
const best = winner(await runAlgos(html));
const dataUrl = toDataUrl(best.output);

console.log(`winner: ${best.algo} by ${best.model} — ${best.output.length} bytes`);

await QRCode.toFile(QR_CODE, dataUrl);

console.log(`${QR_CODE} saved! (${dataUrl.length} bytes encoded — scan to open the game)`);
