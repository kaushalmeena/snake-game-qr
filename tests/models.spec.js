import { test, expect } from "@playwright/test";
import {
  targets,
  inputHtml,
  START_LEN,
  SWIPE_MIN,
  KEY,
  openGame,
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
} from "./harness.js";

/**
 * Behavioral suite: plays every model's generated page (and the baseline
 * control) through the whole checklist as a black box — reading only canvas
 * pixels and localStorage. The baseline passing everything is what proves the
 * checks are real rather than lenient.
 */

for (const target of targets) {
  test.describe(target.name, () => {
    /** Open a fresh game for this target; auto-closed after the test. */
    const game = async (browser, opts) => {
      const g = await openGame(browser, target.html, opts);
      return g;
    };

    test("renders the board, snake and food", async ({ browser }) => {
      const { context, page } = await game(browser);
      try {
        const s = await scan(page);
        expect(s.snake.length, "snake drawn").toBeGreaterThan(0);
        expect(s.food.length, "exactly one food").toBe(1);
      } finally {
        await context.close();
      }
    });

    test("paints the same canvas as input.html", async ({ browser }) => {
      // Force food to a fixed cell (Math.random → 0) so both pages render the
      // same frame, advance both to the same tick, then diff the canvases.
      const shot = async (html) => {
        const { context, page } = await openGame(browser, html, { fixedRandom: 0 });
        try {
          await waitFullLength(page);
          return await canvasDataUrl(page);
        } finally {
          await context.close();
        }
      };
      const [reference, actual] = await Promise.all([shot(inputHtml), shot(target.html)]);
      const { count, total } = await pixelDiff(reference, actual);
      expect(count, `${count} of ${total} pixels differ from input.html`).toBe(0);
    });

    test("keyboard steers the snake", async ({ browser }) => {
      const { context, page } = await game(browser);
      try {
        const cur = await observe(page);
        const target = cur.dir?.[0] !== 0 ? [0, -1] : [-1, 0]; // perpendicular, not a reversal
        await press(page, target);
        expect(await waitDir(page, target)).toBe(true);
      } finally {
        await context.close();
      }
    });

    test("swipe steers the snake", async ({ browser }) => {
      const { context, page } = await game(browser);
      try {
        const cur = await observe(page);
        const dir = cur.dir?.[0] !== 0 ? [0, 1] : [1, 0];
        const mag = SWIPE_MIN + 40;
        let ok = false;
        for (let i = 0; i < 3 && !ok; i++) {
          await swipe(page, dir[0] * mag, dir[1] * mag);
          ok = await waitDir(page, dir);
        }
        expect(ok).toBe(true);
      } finally {
        await context.close();
      }
    });

    test("ignores a sub-threshold swipe (tap)", async ({ browser }) => {
      const { context, page } = await game(browser);
      try {
        const cur = await observe(page);
        const before = cur.dir;
        const tiny = Math.max(1, SWIPE_MIN - 6);
        await swipe(page, cur.dir?.[0] !== 0 ? 0 : tiny, cur.dir?.[0] !== 0 ? tiny : 0);
        const after = (await observe(page)).dir;
        expect(before, "had a direction").toBeTruthy();
        expect(after?.join(), "direction unchanged").toBe(before?.join());
      } finally {
        await context.close();
      }
    });

    test("wraps around the edges", async ({ browser }) => {
      const { context, page } = await game(browser);
      try {
        expect(await detectWrap(page)).toBe(true);
      } finally {
        await context.close();
      }
    });

    test("eating food grows the snake and redraws the score", async ({ browser }) => {
      const { context, page } = await game(browser);
      try {
        const sigBefore = (await waitFullLength(page)).scoreSig;
        const grew = await steerToEat(page);
        const after = await scan(page);
        expect(grew, "snake grew on eating").toBe(true);
        expect(after.food.length, "food respawned").toBe(1);
        expect(after.scoreSig, "score redrawn").not.toBe(sigBefore);
      } finally {
        await context.close();
      }
    });

    test("self-collision resets the run to the start", async ({ browser }) => {
      const { context, page } = await game(browser);
      try {
        await steerToEat(page); // START_LEN + 1
        await steerToEat(page); // START_LEN + 2, long enough to trap itself
        expect(await forceCollision(page)).toBe(true);
      } finally {
        await context.close();
      }
    });

    test("persists the best score to localStorage", async ({ browser }) => {
      // save: empty storage → grow → the new length is stored
      const s = await game(browser);
      let saved;
      try {
        await steerToEat(s.page);
        saved = await s.page.evaluate((k) => localStorage.getItem(k), KEY);
      } finally {
        await s.context.close();
      }
      expect(Number(saved), "stored best after growing").toBeGreaterThanOrEqual(START_LEN + 1);

      // load: a preset high best must survive a shorter run (proves it loaded)
      const l = await game(browser, { presetBest: "50" });
      let kept;
      try {
        await steerToEat(l.page);
        kept = await l.page.evaluate((k) => localStorage.getItem(k), KEY);
      } finally {
        await l.context.close();
      }
      expect(kept, "loaded best not lowered by a shorter run").toBe("50");
    });

    test("keeps running when localStorage throws", async ({ browser }) => {
      const { context, page, errors } = await game(browser, { breakStorage: true });
      try {
        const a = await scan(page);
        const b = await nextTick(page, a);
        expect(b.snake.join(), "still advancing").not.toBe(a.snake.join());
        expect(errors, "no uncaught error").toEqual([]);
      } finally {
        await context.close();
      }
    });
  });
}
