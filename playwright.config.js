import { defineConfig } from "@playwright/test";
import { targets } from "./tests/harness.js";

/** Escape a model name for use inside a RegExp. */
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export default defineConfig({
  testDir: "tests",
  fullyParallel: true, // every check is independent — run them across workers
  // Checks are deterministic (fake clock + seeded RNG); one retry is just
  // insurance against environment hiccups (e.g. a slow browser launch).
  retries: 1,
  reporter: [["./tests/reporter.js"]],
  // One project per model, so the suite runs and reports per model. Run a
  // single model with:  npx playwright test --project=claude-fable-5
  // The project is named by slug; its grep matches the model's describe title
  // (the pretty name), which the slug project-prefix can't collide with.
  projects: targets.map((t) => ({ name: t.slug, grep: new RegExp(escape(t.name)) })),
});
