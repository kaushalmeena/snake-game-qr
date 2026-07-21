import { defineConfig } from "@playwright/test";
import { targets } from "./tests/helpers.js";

/** Escape a slug for use inside a RegExp. */
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export default defineConfig({
  testDir: "tests",
  fullyParallel: true, // every check is independent — run them across workers
  // Checks are deterministic (fake clock + seeded RNG); one retry is just
  // insurance against environment hiccups (e.g. a slow browser launch).
  retries: 1,
  reporter: [["./tests/reporter.js"]],
  // One project per model, so the suite runs and reports per model. Run a
  // single model with:  npx playwright test --project=gemini-3.5-flash
  // The project is named by slug and selects its tests by the @<slug> tag —
  // a tag the slug project-name prefix can't contain, so there's no collision.
  projects: targets.map((t) => ({ name: t.slug, grep: new RegExp(`@${escape(t.slug)}(?![\\w.-])`) })),
});
