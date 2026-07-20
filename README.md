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

`models/` is a competition: one file per model, each turning the text of `input.html` into a page that must look and behave identically — byte count is the score. [`input/PROMPT.md`](./input/PROMPT.md) is the challenge prompt: it is self-contained, so to get a new contender just hand a model that file plus `input.html`, and drop the returned module into `models/` named after the model. The contract (plain-JS ES module, model-named kebab-case file, `meta` + `minify` exports) and the rules (derive the output from the input, deterministic, self-contained, ASCII, verified in a real browser) live in the prompt. Every submission is held to that last rule by `npm test` ([`tests/models.spec.js`](./tests/models.spec.js)), a Playwright suite that plays each output through the full behavioral checklist in a headless browser.

Current standings (`npm run compare` regenerates this table):

<!-- leaderboard:start -->

| # | model | html | gzip | vs baseline | data URL | QR code |
|---|-------|-----:|-----:|:-----------:|---------:|---------|
| 1 | [Claude Fable 5](./models/claude-fable-5.js) | 999 B | 689 B | −39% | 1354 ch | v30 (137×137) |
| 2 | [Claude Opus 4.8](./models/claude-opus-4.8.js) | 1003 B | 697 B | −38% | 1362 ch | v30 (137×137) |
| 3 | [Gemini 1.5 Pro](./models/gemini-1.5-pro.js) | 1290 B | 803 B | −21% | 1742 ch | v35 (157×157) |
|  | html-minifier-terser *(baseline tool)* | 1627 B | 958 B | — | 2194 ch | v39 (173×173) |
|  | `input.html` (raw) | 6885 B | 2241 B | +323% | 9202 ch | does not fit |

<!-- leaderboard:end -->

The runnable entrypoints (`encode`, `decode`, `compare`) live in [`scripts/`](./scripts); their shared helpers — file paths, the data-URL codec, and the submission loader — live in [`lib/`](./lib).

> [!NOTE]
> Whether a scan opens the game depends on the browser. **iOS Safari** renders `data:text/html` URLs directly. **Chrome and Firefox** (desktop and Android) block top-level navigation to `data:` URLs as an anti-phishing measure, so they may show the URL as text instead of opening it. In those cases, save `output.html` and open it locally.

## Getting Started

### Requirements

- [Node.js](https://nodejs.org/ "Node.js") ≥ 20.11 — runs the JavaScript directly, no build step
- [git](https://git-scm.com/downloads "git") (only to clone this repository)

### Installation

```bash
git clone https://github.com/kaushalmeena/snake-golf.git
cd snake-golf
npm install
```

## Usage

Generate `qr-code.png` from `input.html`:

```bash
npm run encode
```

Recover `output.html` from `qr-code.png`:

```bash
npm run decode
```

Rank every model's submission in `models/` (HTML bytes, gzipped bytes, savings vs the baseline, data-URL length, and the QR version each would need). This regenerates the leaderboard table above:

```bash
npm run compare
```

Run the behavioral test suite — a headless-browser ([Playwright](https://playwright.dev/)) harness that plays each model's output and the baseline through the whole checklist (keyboard + swipe steering, swipe threshold, wrap-around, eating, growth, self-collision, reset, score updates, best-score persistence, and graceful degradation when `localStorage` throws) plus a pixel-fidelity check that the rendered canvas matches `input.html`:

```bash
npm test           # first run only: npx playwright install chromium
```

Each model (and the baseline) is its own Playwright project, so the run is grouped per model — and you can test a single one by its slug:

```bash
npx playwright test --project=claude-fable-5
```

To play, open `output.html` (or `input.html`) in a browser and steer with the **arrow keys**, or **swipe** on a touch screen. Eat the food to grow — the game speeds up as you do; running into yourself resets the run. The board wraps around all four edges. Your best length is kept on the scoreboard and saved to `localStorage` where the browser allows it (a page opened from the QR code has an opaque origin, so there the best lasts until the tab closes).

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
