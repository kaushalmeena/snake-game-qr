# Challenge: Golf the Snake page

A friendly, cross-model code-golf challenge. You are given `input.html`: a
readable, commented HTML Snake game. Your job is to produce the **smallest
possible HTML page** that plays **exactly the same game**.

Your score is the raw ASCII byte length of the page you produce — lower is
better. The page is base64-encoded into a `data:text/html;base64,...` URL and
rendered as a QR code, so a smaller page makes a simpler QR. Every byte counts.

This is not a "write a minifier" task. You are hand-crafting **one** final page
for **this one** game. Hardcoding the answer is the whole point — that is what
golf is. Rewrite it from scratch however you like.

---

# Goal

Read `input.html`, understand exactly how the game behaves, and emit the
smallest single HTML document that is **externally indistinguishable** from it in
a modern Chromium browser. The output need not resemble the original in any way —
different DOM, rendering, control flow, and state representation are all fair
game. Only the observable behavior must match.

---

# What you're given

`input.html` is the specification. It is commented throughout — read the comments
carefully, because several behaviors are subtle (see below). If any behavior is
unclear, the running page is the source of truth.

---

# Behavioral Equivalence

Opened next to `input.html`, your page must be indistinguishable in every
externally observable way.

## Visuals

Same canvas size, grid, border, page background, colors, rendered snake, food,
and score display.

> **Re-encoding is allowed.** Emit any value in a shorter form that renders
> identically (e.g. `#000000` → `#000` → `black`, `rgb(0,0,0)` → `#000`).
> Equivalence is judged on pixels, not on literal bytes.

## Gameplay

Preserve every gameplay behavior in the source: arrow-key steering, swipe
steering, the swipe threshold (taps ignored), no reversing onto the neck,
wrap-around on all four edges, food spawning, eat-to-grow, self-collision reset,
starting position, starting direction, tick scheduling, the speed-up curve, and
the minimum-speed floor.

Watch the subtle ones (all commented in the source):

* The snake **grows from a single cell** up to the start length over the first
  few ticks — it does not begin at full length.
* Food is placed with **two independent full-grid draws** and does **not** avoid
  the snake or the previous food; it can land on the snake. Do not add
  "empty-cell" logic.
* The next tick is scheduled **before** the self-collision check, so a reset
  does not stop the loop — the game **auto-restarts**.
* Cells are drawn 1px smaller than the cell size; those 1px gaps **are** the
  grid. There are no separately drawn gridlines.
* Self-collision is checked **before** the tail is removed that tick.

> **Randomness — match the mechanism, not a sequence.** Food uses `Math.random`,
> which is unseedable, so the verifier stubs it with a fixed stream in both pages
> (see [Verification](#verification)). Your code must therefore consume random
> values in the **same order and count** as the source: two draws per placement,
> x before y, at reset and after each food eaten. Consuming them differently
> desyncs the stream and fails the pixel diff even if the distribution matches.

## Score

Preserve current length, best length, the exact labels, and the exact formatting.

Best score must:

* Persist under the same `localStorage` key when storage is available.
* Degrade gracefully when storage is unavailable.
* Survive game resets.
* Not survive reloads when storage is unavailable.

The page runs from a `data:` URL with an opaque origin, where merely **accessing**
`localStorage` throws. Guard every storage access so behavior is observably
equivalent to the original (the source wraps each access in `try/catch`).

---

# Rules

1. **Self-contained.** One HTML document, no external resources, no network. It
   must run correctly as `data:text/html;base64,...`.
2. **Pure ASCII.** If the source renders a non-ASCII glyph (e.g. an emoji), keep
   the rendered glyph but escape it (`\uXXXX` or an HTML entity). Never drop or
   substitute it.
3. **Guard storage.** Every `localStorage` access in `try/catch`, as above.
4. **Behavior first.** When a trick would change observable behavior, don't use
   it — correctness beats bytes.

---

# Deliverable

Two files, in this order:

### 1. `output.html` (scored)

Exactly one fenced code block, tagged `html`, containing the **entire** page and
nothing else — this is saved as `output.html`. Its raw ASCII byte length is your
score.

```html
<!doctype html>...your golfed page...
```

### 2. `WRITEUP.md` (displayed, not scored)

Right after the code block, a short write-up in this exact skeleton so entries
are comparable across models. Keep the headings verbatim.

```md
**Model:** your-model-name        <!-- kebab-case identifier for this entry -->

**Approach:** 2-3 sentences on your overall strategy.

**Reductions:** ordered list, biggest wins first. For each: what you did, bytes
saved, and any assumption it relies on.

**Proudest trick:** the one you'd show off.

**Known risks / couldn't crack:** anything you're unsure preserves behavior, or
savings you spotted but couldn't land.
```

---

# Verification

Entries are checked for behavioral equivalence (correctness gates the
leaderboard; it is not itself scored):

1. **Load from a real `data:` URL** in headless Chromium, so the opaque-origin
   `localStorage` path is exercised.
2. **Stub `Math.random`** with a fixed stream in both pages so food placement is
   reproducible. Note the first painted frame is already *after* one move
   (schedule → move → draw), and `reset()` draws food before the first paint, so
   there is no resting start frame.
3. **Pixel-diff** the canvas against the original frame-by-frame over a fixed
   number of ticks with a fixed input script.
4. **Drive gameplay** with synthetic keyboard and touch events: steering, swipe
   threshold, neck-reversal, wrap-around, eat-to-grow, self-collision reset.
5. **Check score/storage**: persistence, reset survival, graceful degradation,
   and reload behavior, with storage both available and throwing.

---

# Scoring

* **Primary:** raw ASCII byte length of the page (lower is better).
* **Tiebreak:** QR code version of the resulting `data:text/html;base64,...` URL
  (base64 length ≈ 1.34× raw; smaller version wins).

An entry is out if it emits invalid or non-ASCII HTML, depends on external
resources, or fails behavioral equivalence.

---

# Optimization Checklist

Keep hunting for semantics-preserving reductions until none remain. Common wins:

* Drop the doctype/optional tags/optional quotes/optional attributes the parser
  fills in anyway.
* Collapse whitespace; put everything on one line.
* Shorten colors and numbers to equivalent shorter forms.
* Minify identifiers; reuse variables; fold repeated expressions.
* Prefer a bare inline `<script>` and a single `<canvas>` over extra scaffolding.
* Exploit default values and implicit coercions the source relies on.
* Escape non-ASCII compactly rather than restructuring to avoid it.