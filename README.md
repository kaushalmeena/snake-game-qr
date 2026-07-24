<div align="center">

# Snake QR

**A complete, playable HTML Snake game squeezed into a single QR code.**

A full Snake game (HTML + CSS + JavaScript) encoded inside a QR code as a
`data:text/html` data URL — scan it and play instantly in your browser, no
install, no server, no network. Includes a leaderboard comparing AI models'
ability to compress it.

[![License: MIT](https://img.shields.io/badge/License-MIT-3DA639?logo=opensourceinitiative&logoColor=white)](LICENSE) [![Node.js](https://img.shields.io/badge/Node.js-20+-5FA04E?logo=node.js&logoColor=white)](https://nodejs.org/) [![Playwright](https://img.shields.io/badge/Playwright-latest-2EAD33?logo=playwright&logoColor=white)](https://playwright.dev/) [![HTML5](https://img.shields.io/badge/HTML5-5-E34F26?logo=html5&logoColor=white)](https://developer.mozilla.org/docs/Web/HTML)

</div>

---

## How It Works

The game is written in a single, readable, commented
[`input.html`](./input/input.html). Since a QR code can only hold a couple of
kilobytes of data, competing models hand-craft the smallest HTML page that plays
the same game; the smallest submission is wrapped as a data URL and drawn as a
QR:

```
output/<model>/output.html --(smallest + base64 data URL)--> assets/qrcode.png --(scan/decode)--> assets/output.html
                       encode                                                     decode
```

- **encode** ([`scripts/encode.js`](./scripts/encode.js)) — ranks the
  submissions in [`output/`](./output), takes the smallest `output.html`, wraps
  it in a `data:text/html;base64,...` URL, renders `assets/qrcode.png` with
  `qrcode`, and records the winner in `assets/winner.txt`.
- **decode** ([`scripts/decode.js`](./scripts/decode.js)) — reads
  `assets/qrcode.png` with `jimp`, extracts the data URL with `jsqr`, and writes
  `assets/output.html`, verifying it is byte-identical to the winning submission.

## The Leaderboard

Each model's submission is a folder under [`output/`](./output) named for the
model, holding a hand-golfed `output.html` (the scored page) and a `WRITEUP.md`
(its approach).
[`input/PROMPT.md`](./input/PROMPT.md) is the self-contained challenge prompt:
hand it to a model along with `input.html`, and drop the two files it returns
into `output/<model-name>/`. Every submission is held to behavioral equivalence
by `npm test`
([`tests/snake.spec.js`](./tests/snake.spec.js)) — a Playwright suite that
plays each `output.html` through the full checklist, plus a pixel-fidelity check
against `input.html`, in a headless browser.

<!-- leaderboard:start -->

| # | model | html | gzip | vs baseline | QR code | output | writeup |
|---|-------|-----:|-----:|:-----------:|---------|:------:|:-------:|
| 1 | claude-fable-5 | 911 B | 671 B | -44% | v29 (133x133) | [output](./output/claude-fable-5/output.html) | [writeup](./output/claude-fable-5/WRITEUP.md) |
| 2 | gemini-3.5-flash | 1049 B | 689 B | -36% | v31 (141x141) | [output](./output/gemini-3.5-flash/output.html) | [writeup](./output/gemini-3.5-flash/WRITEUP.md) |
| 3 | gemini-1.5-pro | 1061 B | 723 B | -35% | v31 (141x141) | [output](./output/gemini-1.5-pro/output.html) | [writeup](./output/gemini-1.5-pro/WRITEUP.md) |
| 4 | claude-opus-4.8 | 1101 B | 698 B | -33% | v32 (145x145) | [output](./output/claude-opus-4.8/output.html) | [writeup](./output/claude-opus-4.8/WRITEUP.md) |
|  | html-minifier *(baseline tool)* | 1640 B | 965 B | -- | v39 (173x173) | -- | -- |
|  | `input.html` (raw) | 8717 B | 2997 B | +432% | does not fit | -- | -- |

<!-- leaderboard:end -->

> **Note:** Whether a scan opens the game depends on the browser. **iOS Safari**
> renders `data:text/html` URLs directly. **Chrome and Firefox** (desktop and
> Android) block top-level navigation to `data:` URLs as an anti-phishing
> measure, so they may show the URL as text instead of opening it. In those
> cases, save the decoded `output.html` and open it locally.

## Features

- **QR-encoded game** — a complete Snake game that fits inside a single QR code.
- **Model leaderboard** — compares AI models' ability to compress the game.
- **Behavioral testing** — Playwright suite verifies every submission plays
  identically to the original.
- **Pixel-fidelity check** — frame-for-frame canvas diff against `input.html`.
- **Encode and decode pipeline** — round-trip verification from QR to HTML and
  back.

## Tech Stack

| Area          | Tools                                                                 |
| ------------- | --------------------------------------------------------------------- |
| **Language**  | [JavaScript](https://developer.mozilla.org/docs/Web/JavaScript) (Node.js) |
| **Testing**   | [Playwright](https://playwright.dev/)                                  |
| **Libraries** | [qrcode](https://www.npmjs.com/package/qrcode) · [jimp](https://www.npmjs.com/package/jimp) · [jsqr](https://www.npmjs.com/package/jsqr) |
| **Tooling**   | [Node.js](https://nodejs.org/) · [npm](https://www.npmjs.com/)       |

## Getting Started

These instructions will get you a copy of the project up and running on your
local machine for development purposes.

### Requirements

To install and run this project you need:

- [Node.js](https://nodejs.org/) 20.11+
- [git](https://git-scm.com/downloads) (only to clone this repository)

### Installation

To set up everything on your local machine, follow these steps:

1. Clone this repo and then change directory to the `snake-qr` folder:

```bash
git clone https://github.com/kaushalmeena/snake-qr.git
cd snake-qr
```

2. Install project dependencies using npm:

```bash
npm install
```

### Running

Render the smallest submission into a QR code at `assets/qrcode.png`:

```bash
npm run encode
```

Recover that page from the QR into `assets/output.html`:

```bash
npm run decode
```

Rank every submission and regenerate the leaderboard table:

```bash
npm run compare
```

### Testing

To run the behavioral test suite:

```bash
npm test           # first run only: npx playwright install chromium
```

Each model (and the baseline) is its own Playwright project, so you can test a
single one by its slug:

```bash
npx playwright test --project=gemini-3.5-flash
```

## Contributing

Contributions are welcome! If you find a bug or have a feature request, please
[open an issue](https://github.com/kaushalmeena/snake-qr/issues/new/choose)
first to discuss it. For code changes, fork the repository, create a branch,
and open a pull request.

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE)
file for details.
