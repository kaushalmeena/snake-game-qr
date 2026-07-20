# Snake Golf

A complete, playable HTML Snake game squeezed into a single QR code — with a leaderboard for the models that squeeze it smallest.

Scan the code below with your phone and the Snake game opens right in your browser — no install, no server, no network. The entire game (HTML + CSS + JavaScript) lives inside the QR code, encoded as a `text/html` data URL so a scanner treats it as a link and offers to open it.

![QR-Code](./output/qr-code.png)

## How it works

The game is written in a single, readable, commented [`input.html`](./input/input.html). Since a QR code can only hold a couple of kilobytes of data, competing models shrink the game, and the smallest result is wrapped as a data URL before drawing it:

```
input.html ──(smallest model + base64 data URL)──▶ qr-code.png ──(scan/decode)──▶ output.html
                        encode                                       decode
```

- **encode** ([`scripts/encode.js`](./scripts/encode.js)) — runs every model's submission in [`models/`](./models), takes the smallest output, wraps it in a `data:text/html;base64,…` URL, and renders that into `output/qr-code.png` with `qrcode`.
- **decode** ([`scripts/decode.js`](./scripts/decode.js)) — reads `output/qr-code.png` with `jimp`, extracts the data URL with `jsqr`, and unwraps it back to `output/output.html` (byte-identical to the winning output).

## The leaderboard

`models/` is a competition: one file per model, each turning the text of `input.html` into a page that must look and behave identically — byte count is the score. [`input/PROMPT.md`](./input/PROMPT.md) is the challenge prompt: it is self-contained, so to get a new contender just hand a model that file plus `input.html`, and drop the returned module into `models/` named after the model. The contract (plain-JS ES module, model-named kebab-case file, `meta` + `minify` exports) and the rules (derive the output from the input, deterministic, self-contained, ASCII, verified in a real browser) live in the prompt.

Current standings (`bun run compare` regenerates this table):

<!-- leaderboard:start -->

| # | model | html | data URL | QR code |
|---|-------|-----:|---------:|---------|
| 1 | [Claude Fable 5](./models/claude-fable-5.js) | 999 B | 1354 ch | v30 (137×137) |
| 2 | [Gemini 1.5 Pro](./models/gemini-1.5-pro.js) | 1309 B | 1770 ch | v35 (157×157) |
|  | html-minifier-terser *(baseline tool)* | 1627 B | 2194 ch | v39 (173×173) |
|  | `input.html` (raw) | 6885 B | 9202 ch | does not fit |

<!-- leaderboard:end -->

The runnable entrypoints (`encode`, `decode`, `compare`) live in [`scripts/`](./scripts); their shared helpers — file paths, the data-URL codec, and the submission loader — live in [`lib/`](./lib).

> [!NOTE]
> Whether a scan opens the game depends on the browser. **iOS Safari** renders `data:text/html` URLs directly. **Chrome and Firefox** (desktop and Android) block top-level navigation to `data:` URLs as an anti-phishing measure, so they may show the URL as text instead of opening it. In those cases, save `output.html` and open it locally.

## Getting Started

### Requirements

- [Bun](https://bun.sh/ "Bun") — runs the JavaScript directly, no build step
- [git](https://git-scm.com/downloads "git") (only to clone this repository)

### Installation

```bash
git clone https://github.com/kaushalmeena/snake-golf.git
cd snake-golf
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

Rank every model's submission in `models/` by output size (HTML bytes, data-URL length, and the QR version each would need):

```bash
bun run compare
```

To play, open `output.html` (or `input.html`) in a browser and steer with the **arrow keys**, or **swipe** on a touch screen. Eat the food to grow — the game speeds up as you do; running into yourself resets the run. The board wraps around all four edges. Your best length is kept on the scoreboard and saved to `localStorage` where the browser allows it (a page opened from the QR code has an opaque origin, so there the best lasts until the tab closes).

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
