import { minify } from "html-minifier-terser";
import QRCode from "qrcode";
import { INPUT_HTML, MINIFY_OPTIONS, QR_CODE, toDataUrl } from "./config";

const html = await Bun.file(INPUT_HTML).text();
const minified = await minify(html, MINIFY_OPTIONS);
const dataUrl = toDataUrl(minified);

await QRCode.toFile(QR_CODE, dataUrl);

console.log(`${QR_CODE} saved! (${dataUrl.length} bytes encoded — scan to open the game)`);
