import QRCode from "qrcode";
import { runModels } from "./models";
import { INPUT_HTML, toDataUrl } from "./config";

/**
 * The leaderboard: runs every model's submission in models/ against input.html
 * and ranks them by output size — HTML bytes, data-URL length, and the QR code
 * version each one would need. Raw input.html is shown as a reference.
 */

/** QR version a data URL needs, or "does not fit" past a v40 code's capacity. */
function qrCell(dataUrl: string): string {
  try {
    const qr = QRCode.create(dataUrl);
    return `v${qr.version} (${qr.modules.size}x${qr.modules.size})`;
  } catch {
    return "does not fit";
  }
}

const input = await Bun.file(INPUT_HTML).text();
const results = await runModels(input);

const ranked = results
  .filter((r) => !r.error)
  .sort((a, b) => Buffer.byteLength(a.output) - Buffer.byteLength(b.output));
const failed = results.filter((r) => r.error);

const row = (rank: string, model: string, html: string, url: string, qr: string) =>
  console.log(rank.padEnd(4) + model.padEnd(24) + html.padStart(6) + url.padStart(10) + `  ${qr}`);

row("#", "model", "html", "data URL", "QR code");
ranked.forEach((r, i) => {
  const dataUrl = toDataUrl(r.output);
  row(`${i + 1}`, r.model, `${Buffer.byteLength(r.output)}B`, `${dataUrl.length}ch`, qrCell(dataUrl));
});
row("", "input.html (raw)", `${Buffer.byteLength(input)}B`, `${toDataUrl(input).length}ch`, qrCell(toDataUrl(input)));

for (const r of failed) {
  console.log(`\nFAILED ${r.file}: ${r.error}`);
}
if (failed.length > 0) process.exit(1);
