# Challenge: Shrink `input.html`

You are an AI model competing on a code-golf/minification leaderboard.

Alongside this document you are given the full text of `input.html`: a readable, commented HTML Snake game.

Your task is **not to minify the existing source**. Your task is to generate the **smallest possible HTML page** that is **externally equivalent** to the supplied game.

Your score is the **raw ASCII byte length** of the generated HTML string. Lower is better. The output is base64-encoded into a `data:text/html;base64,...` URL and rendered as a QR code, so **every byte matters**.

---

# Goal

Implement an algorithm that reads `input.html`, derives its behavior and tunable parameters, and emits the smallest possible equivalent HTML page.

The generated page does **not** need to resemble the original implementation.

Any semantics-preserving transformation is allowed, including:

* Complete rewrites
* Different algorithms
* Different rendering logic
* Different DOM structure
* Different event handling
* Different state representation
* Different control flow

The only requirement is that the externally observable behavior remains equivalent.

---

# Behavioral Equivalence

When opened in a modern Chromium-compatible browser next to `input.html`, the generated page must be indistinguishable from the original in every externally observable way.

This includes:

## Visuals

* Same canvas size
* Same grid
* Same border
* Same page background
* Same colors
* Same rendered snake
* Same food rendering
* Same score display

Implementation details are irrelevant.

---

## Gameplay

Must preserve all gameplay behavior, including:

* Arrow-key steering
* Swipe steering
* Swipe threshold (taps ignored)
* No reversing onto the snake's neck
* Wrap-around on all four edges
* Food spawning behavior
* Eat-to-grow
* Self-collision resets
* Starting position
* Starting direction
* Tick scheduling
* Tick speed progression
* Minimum speed floor
* Any other gameplay behavior present in the source

---

## Score

Must preserve:

* Current length
* Best length
* Same labels
* Same formatting

Best score must:

* Persist using the same `localStorage` key whenever storage is available.
* Gracefully degrade when storage is unavailable.
* Survive game resets.
* Not survive page reloads if storage is unavailable.

The generated page must behave correctly when executed from a `data:` URL with an opaque origin, where merely accessing `localStorage` throws. Every storage access must therefore be protected exactly as the original does.

---

# Deliverable

Produce a single JavaScript ES module.

Requirements:

* Plain JavaScript (no TypeScript syntax)
* Runs on Node or Bun
* Filename is the algorithm name in **kebab-case**

Example:

`constraint-driven-regenerator.js`

Export:

```js
export const meta = {
  algo: "constraint-driven-regenerator",
  model: "Model Name"
};

export function minify(inputHtml) {
  ...
}
```

`minify()`:

* accepts the full contents of `input.html`
* returns the generated HTML string
* returning `Promise<string>` is also acceptable

---

# Rules

## 1. `input.html` is the specification

Treat the supplied source as the specification—not as text to hardcode.

Every gameplay-relevant value emitted by your algorithm must ultimately be derived from the supplied input.

This includes (but is not limited to):

* Colors
* Canvas dimensions
* Border width
* Grid size
* Starting position
* Starting direction
* Tick timing
* Speed curve
* Minimum delay
* Score labels
* Storage key
* Swipe threshold
* Any future tunable constants

Do **not** duplicate these values inside your algorithm.

If the supplied source changes, the generated page should automatically change with it.

---

## 2. Detect assumptions

You may infer higher-level structure from the source—for example recognizing repeated logic or identifying the game model—but every emitted value must still originate from the supplied input.

If the source violates one of your assumptions:

* throw an `Error`
* explain exactly which assumption failed

Never silently emit stale output.

---

## 3. Optimize globally

Your objective is the **smallest generated HTML**, not the smallest algorithm.

Prefer transformations that reduce the emitted page even if they make the algorithm larger.

A complete regeneration is often smaller than preserving source structure.

---

## 4. Freedom of implementation

You are encouraged to regenerate the page from first principles.

Possible optimizations include:

* rewriting rendering
* rewriting state representation
* replacing algorithms
* merging logic
* changing DOM structure
* changing event handling
* changing control flow
* eliminating variables
* algebraic simplification
* arithmetic rewriting
* expression rewriting
* constant folding
* dead-code elimination
* state compression
* event consolidation
* string elimination
* duplicate logic merging
* replacing verbose constructs with shorter equivalents

Any transformation is acceptable if externally observable behavior is preserved.

---

## 5. Deterministic

Given identical input:

* identical output
* byte-for-byte

---

## 6. Self-contained

No:

* network access
* file I/O
* subprocesses
* shelling out
* external libraries at runtime

---

## 7. Output requirements

Generated HTML must be:

* pure ASCII
* a single HTML document
* self-contained
* no external resources

It must execute correctly as:

```
data:text/html;base64,...
```

---

## 8. Performance

`minify()` should normally finish within a few seconds.

---

## 9. Explain the algorithm

Document the algorithm with concise comments.

The comments exist only inside your algorithm file—they must never appear in the generated HTML.

Comments should explain only non-obvious transformations, including:

* what the transformation does
* why it reduces bytes
* which assumption it relies on
* why that assumption preserves behavior

Structure the algorithm so it is easy to audit.

Suggested pipeline:

1. Extract constants
2. Validate assumptions
3. Derive game parameters
4. Generate compact JavaScript
5. Emit HTML

---

## 10. Verify before returning

Before returning the generated page, verify that it behaves correctly in a real browser.

At minimum, test:

* keyboard controls
* swipe controls
* swipe threshold
* wrap-around
* eating food
* snake growth
* self-collision
* reset behavior
* score updates
* best-score persistence
* behavior when `localStorage` throws

Do not submit code that has not been exercised.

---

# Optimization Guidance

Think of this as **program synthesis**, not source minification.

Do not preserve source layout or implementation unless doing so produces a smaller final page.

Optimize the generated HTML globally rather than performing local edits to the original source.

---

# Optimization Checklist

Before finishing, revisit the generated HTML and continue searching for additional semantics-preserving reductions until no further savings can be found.

Consider at least:

* HTML minimization
* CSS minimization
* JavaScript regeneration
* Variable renaming
* Scope collapsing
* Function merging
* Event consolidation
* State encoding
* Expression rewriting
* Arithmetic simplification
* Constant folding
* String elimination
* Duplicate logic merging
* Dead-code elimination
* DOM reduction
* Canvas rendering simplification
* Data representation optimization
* Control-flow simplification

---

# Priority Order

When trade-offs exist, prioritize in this order:

1. Correct behavioral equivalence
2. Smallest generated HTML
3. Robust extraction from `input.html`
4. Deterministic output
5. Algorithm simplicity
6. Runtime performance

---

# Scoring

Your module will be imported into a harness.

The harness will:

1. Import `meta`.
2. Import `minify`.
3. Execute `minify(inputHtml)`.
4. Measure the raw ASCII byte length of the returned HTML.
5. Verify correctness.
6. Rank submissions by output size and resulting QR code version.

A submission is disqualified if it:

* throws unexpectedly
* returns a non-string
* emits invalid HTML
* produces non-ASCII output
* fails behavioral equivalence
* depends on external resources
* emits stale output because assumptions changed
