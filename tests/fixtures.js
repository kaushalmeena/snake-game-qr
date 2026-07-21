import { test as base, expect } from "@playwright/test";
import { openGame } from "./helpers.js";

/**
 * Test fixtures. `open(html, opts)` starts a game in a fresh browser context
 * and tracks it; every context opened during a test is closed automatically at
 * teardown, so tests never need their own try/finally cleanup.
 */
export const test = base.extend({
  open: async ({ browser }, use) => {
    const contexts = [];
    await use(async (html, opts) => {
      const game = await openGame(browser, html, opts);
      contexts.push(game.context);
      return game;
    });
    await Promise.all(contexts.map((c) => c.close()));
  },
});

export { expect };
