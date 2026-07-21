import { test, expect } from "./fixtures.js";
import { qrVersion } from "../lib/ranking.js";
import { toDataUrl } from "../lib/config.js";
import {
  targets,
  inputHtml,
  START_LEN,
  SWIPE_MIN,
  KEY,
  scan,
  nextTick,
  observe,
  waitDir,
  waitFullLength,
  press,
  swipe,
  steerToEat,
  detectWrap,
  forceCollision,
  canvasDataUrl,
  pixelDiff,
} from "./helpers.js";

/**
 * Behavioral suite: plays every submission's page (and the baseline control)
 * through the whole checklist as a black box — reading only canvas pixels and
 * localStorage. The baseline passing everything is what proves the checks are
 * real rather than lenient. The `open` fixture closes every context for us.
 */

for (const target of targets) {
  // Tag with @<slug> so each per-model project can select its own tests by tag.
  // (Grepping the title instead would also match the project-name prefix.)
  test.describe(target.name, { tag: `@${target.slug}` }, () => {
    test("renders the board, snake and food", async ({ open }) => {
      const { page } = await open(target.html);
      const s = await scan(page);
      expect(s.snake.length, "snake drawn").toBeGreaterThan(0);
      expect(s.food.length, "exactly one food").toBe(1);
    });

    test("renders frame-for-frame identically to input.html", async ({ open }) => {
      // Both pages share the same seeded Math.random stream (see openGame), so a
      // faithful page tracks input.html tick-for-tick — including the grow-from-1
      // startup and food placement (which only matches if the RNG is consumed in
      // the same order and count). Diff the canvas at every tick over a fixed run.
      const FRAMES = 40;
      const ref = await open(inputHtml);
      const act = await open(target.html);
      let rp = await scan(ref.page);
      let ap = await scan(act.page);
      for (let frame = 0; frame < FRAMES; frame++) {
        const [a, b] = await Promise.all([canvasDataUrl(ref.page), canvasDataUrl(act.page)]);
        if (a !== b) {
          // Identical pixels ⇒ identical PNG; only decode to count on mismatch.
          const { count, total } = await pixelDiff(a, b);
          expect(count, `frame ${frame}: ${count} of ${total} pixels differ from input.html`).toBe(0);
        }
        [rp, ap] = await Promise.all([nextTick(ref.page, rp), nextTick(act.page, ap)]);
      }
    });

    test("keyboard steers the snake", async ({ open }) => {
      const { page } = await open(target.html);
      const cur = await observe(page);
      const dir = cur.dir?.[0] !== 0 ? [0, -1] : [-1, 0]; // perpendicular, not a reversal
      await press(page, dir);
      expect(await waitDir(page, dir)).toBe(true);
    });

    test("ignores reversing onto its own neck", async ({ open }) => {
      const { page } = await open(target.html);
      const before = (await observe(page)).dir;
      expect(before, "had a direction").toBeTruthy();
      await press(page, [-before[0], -before[1]]); // straight reverse
      const after = (await observe(page)).dir;
      expect(after?.join(), "reversal ignored").toBe(before.join());
    });

    test("swipe steers the snake", async ({ open }) => {
      const { page } = await open(target.html);
      const cur = await observe(page);
      const dir = cur.dir?.[0] !== 0 ? [0, 1] : [1, 0];
      const mag = SWIPE_MIN + 40;
      let ok = false;
      for (let i = 0; i < 3 && !ok; i++) {
        await swipe(page, dir[0] * mag, dir[1] * mag);
        ok = await waitDir(page, dir);
      }
      expect(ok).toBe(true);
    });

    test("ignores a sub-threshold swipe (tap)", async ({ open }) => {
      const { page } = await open(target.html);
      const before = (await observe(page)).dir;
      expect(before, "had a direction").toBeTruthy();
      const tiny = Math.max(1, SWIPE_MIN - 6);
      await swipe(page, before[0] !== 0 ? 0 : tiny, before[0] !== 0 ? tiny : 0);
      const after = (await observe(page)).dir;
      expect(after?.join(), "direction unchanged").toBe(before.join());
    });

    test("wraps around the edges", async ({ open }) => {
      const { page } = await open(target.html);
      expect(await detectWrap(page)).toBe(true);
    });

    test("eating food grows the snake and redraws the score", async ({ open }) => {
      const { page } = await open(target.html);
      const sigBefore = (await waitFullLength(page)).scoreSig;
      const grew = await steerToEat(page);
      const after = await scan(page);
      expect(grew, "snake grew on eating").toBe(true);
      expect(after.food.length, "food respawned").toBe(1);
      expect(after.scoreSig, "score redrawn").not.toBe(sigBefore);
    });

    test("self-collision resets the run to the start", async ({ open }) => {
      const { page } = await open(target.html);
      await steerToEat(page); // START_LEN + 1
      await steerToEat(page); // START_LEN + 2, long enough to trap itself
      expect(await forceCollision(page)).toBe(true);
    });

    test("persists the best score to localStorage", async ({ open }) => {
      // save: empty storage → grow → the new length is stored
      const save = await open(target.html);
      await steerToEat(save.page);
      const saved = await save.page.evaluate((k) => localStorage.getItem(k), KEY);
      expect(Number(saved), "stored best after growing").toBeGreaterThanOrEqual(START_LEN + 1);

      // load: a preset high best must survive a shorter run (proves it loaded)
      const load = await open(target.html, { presetBest: "50" });
      await steerToEat(load.page);
      const kept = await load.page.evaluate((k) => localStorage.getItem(k), KEY);
      expect(kept, "loaded best not lowered by a shorter run").toBe("50");
    });

    test("keeps running when localStorage throws", async ({ open }) => {
      const { page, errors } = await open(target.html, { breakStorage: true });
      const a = await scan(page);
      const b = await nextTick(page, a);
      expect(b.snake.join(), "still advancing").not.toBe(a.snake.join());
      expect(errors, "no uncaught error").toEqual([]);
    });

    // ── Static checks (no browser): the page string must satisfy the rules ──
    test("output is pure ASCII", () => {
      const nonAscii = [...target.html].filter((ch) => ch.charCodeAt(0) > 127);
      expect(nonAscii, `non-ASCII chars: ${JSON.stringify(nonAscii.slice(0, 5))}`).toEqual([]);
    });

    test("output is self-contained (no external resources)", () => {
      expect(target.html, "no absolute/protocol-relative URLs").not.toMatch(/\b(?:https?:)?\/\//);
      expect(target.html, "no src/href attributes").not.toMatch(/\b(?:src|href)\s*=/i);
    });

    test("output fits in a QR code", () => {
      expect(qrVersion(toDataUrl(target.html)), "data URL must fit a v40 QR").not.toBe("does not fit");
    });
  });
}
