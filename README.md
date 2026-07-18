# Snake-Game-QR

A complete, playable HTML Snake game squeezed into a single QR code.

Scan the code below with your phone and the Snake game opens right in your browser — no install, no server, no network. The entire game (HTML + CSS + JavaScript) lives inside the QR code, encoded as a `text/html` data URL so a scanner treats it as a link and offers to open it.

![QR-Code](./qr-code.png)

## How it works

The game is written in a single [`input.html`](./input.html). Since a QR code can only hold a couple of kilobytes of data, the pipeline aggressively shrinks the game, then wraps it as a data URL before drawing it:

```
input.html ──(minify + base64 data URL)──▶ qr-code.png ──(scan/decode)──▶ output.html
                     encode                                  decode
```

- **encode** ([`src/encode.ts`](./src/encode.ts)) — minifies `input.html` with `html-minifier-terser` (collapsing whitespace, mangling JS variables, minifying CSS), wraps it in a `data:text/html;base64,…` URL, and renders that into `qr-code.png` with `qrcode`.
- **decode** ([`src/decode.ts`](./src/decode.ts)) — reads `qr-code.png` with `jimp`, extracts the data URL with `jsqr`, and unwraps it back to `output.html` (byte-identical to the minified input).

Shared file paths, minify options, and the data-URL helpers live in [`src/config.ts`](./src/config.ts).

> [!NOTE]
> Whether a scan opens the game depends on the browser. **iOS Safari** renders `data:text/html` URLs directly. **Chrome and Firefox** (desktop and Android) block top-level navigation to `data:` URLs as an anti-phishing measure, so they may show the URL as text instead of opening it. In those cases, save `output.html` and open it locally.

## Getting Started

### Requirements

- [Bun](https://bun.sh/ "Bun") — runs the TypeScript directly, no build step
- [git](https://git-scm.com/downloads "git") (only to clone this repository)

### Installation

```bash
git clone https://github.com/kaushalmeena/snake-game-qr.git
cd snake-game-qr
bun install
```

## Usage

Generate `qr-code.png` from `input.html`:

```bash
bun run encode
```

Recover `output.html` from `qr-code.png`:

```bash
bun run decode
```

Type-check the sources:

```bash
bun run typecheck
```

To play, open `output.html` (or `input.html`) in a browser and steer with the **arrow keys**. Eat the food to grow; running into yourself resets the game. The board wraps around all four edges.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
