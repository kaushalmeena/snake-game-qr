import { Jimp } from "jimp";
import jsQR from "jsqr";
import { fromDataUrl, OUTPUT_HTML, QR_CODE } from "./config";

const { bitmap } = await Jimp.read(QR_CODE);
const result = jsQR(
  new Uint8ClampedArray(bitmap.data),
  bitmap.width,
  bitmap.height
);

if (!result) {
  throw new Error(`No QR code found in ${QR_CODE}`);
}

const html = fromDataUrl(result.data);
await Bun.write(OUTPUT_HTML, html);

console.log(`${OUTPUT_HTML} saved! (${html.length} bytes decoded)`);
