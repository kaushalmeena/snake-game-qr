import { resolve } from "node:path";

/** Repo root, so paths resolve no matter which directory a script is run from. */
const ROOT = resolve(import.meta.dir, "..");

/** Shared file paths so encode and decode stay in sync. */
export const INPUT_HTML = resolve(ROOT, "input/input.html");
export const OUTPUT_HTML = resolve(ROOT, "output/output.html");
export const QR_CODE = resolve(ROOT, "output/qr-code.png");

/**
 * Prefix for a base64 HTML data URL. Encoding the game as a data URL (instead
 * of raw HTML) means a phone's QR scanner treats it as a link and offers to
 * open it in the browser. Base64 is used over percent-encoding because it has
 * no QR-unfriendly characters and a smaller, predictable overhead for HTML.
 */
export const DATA_URL_PREFIX = "data:text/html;base64,";

/** Wrap minified HTML into a base64 `text/html` data URL. */
export function toDataUrl(html: string): string {
  return DATA_URL_PREFIX + Buffer.from(html, "utf8").toString("base64");
}

/** Recover the HTML from a base64 `text/html` data URL. */
export function fromDataUrl(url: string): string {
  if (!url.startsWith(DATA_URL_PREFIX)) {
    throw new Error("QR payload is not an HTML data URL");
  }
  return Buffer.from(url.slice(DATA_URL_PREFIX.length), "base64").toString("utf8");
}
