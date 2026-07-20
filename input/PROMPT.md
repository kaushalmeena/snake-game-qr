# Challenge: shrink `input.html`

You are an AI model competing on a minification leaderboard. Alongside this document
you are given the full text of `input.html`: a readable, commented HTML Snake game.
Write an algorithm that turns it into the **smallest possible page**. Your score is
the output's byte count; lower wins. The output is base64-encoded into a
`data:text/html;base64,…` URL and drawn as a QR code, so every byte counts.

## What the output must preserve

Opened in a browser next to `input.html`, your output must be indistinguishable:

- Same board: canvas size, grid, border, page background, all colors.
- Same gameplay: arrow-key **and** swipe steering, the no-reversing-onto-your-neck
  guard, taps ignored (swipe threshold), wrap-around on all four edges, eat-to-grow,
  self-collision resets the run.
- Same pacing: the tick speeds up as the snake grows, down to the same floor.
- Same score line: current length and best length. The best is persisted to
  `localStorage` (same key as the input) where storage is available, and degrades
  gracefully — surviving resets but not reloads — where it is not.

## Deliverable

A single file containing your algorithm:

- Plain JavaScript (no TypeScript syntax), as an ES module.
- Filename: your algorithm's name in **kebab-case**, e.g. `integer-cell-golf.js`.
- Export `meta`: `{ algo: "<the same kebab-case name>", model: "<the AI model that wrote this, e.g. 'Claude Fable 5'>" }`.
- Export `minify(inputHtml)`: takes the full text of `input.html`, returns the
  minified HTML string (returning a `Promise<string>` is fine).

## Rules

1. **`input.html` is the specification, not a string to hardcode.** Derive the output
   from the input: any constant you golf (colors, grid size, speeds, labels, start
   position, storage key) must be *extracted* from the input so that tuning
   `input.html` retunes your output. If the input no longer matches your assumptions,
   **throw** a clear error — never emit a stale or subtly different game.
2. **Deterministic**: same input → same output, byte for byte.
3. **Self-contained**: no network access, no file reads/writes, no shelling out. The
   module must run on Bun or Node. The only importable dependency is
   `html-minifier-terser`; beyond that, use nothing but the JavaScript standard
   library.
4. **Output must be pure ASCII** and a single self-contained HTML string with no
   external resources. It runs as a `data:` URL: quirks mode and an **opaque origin,
   where merely touching `localStorage` throws** — wrap every storage access in
   try/catch like the input does, or the scanned game crashes.
5. **Fast**: `minify` must finish in a few seconds.
6. **Verify before you submit.** Load your output in a real browser and actually play
   it: steer with keys and swipes, eat, die, watch the score. Byte counts from code
   you have not run do not count.

## Scoring

Your file is dropped into a harness that imports `meta` and `minify`, runs the
algorithm against `input.html`, and ranks everyone by output size and the QR code
version that output would need. An algorithm that throws, returns a non-string, or
produces a page that does not faithfully play is disqualified.
