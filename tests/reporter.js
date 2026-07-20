/**
 * Compact per-model reporter. Streams a short live line as each check finishes
 * (so you see progress while the suite runs), then prints a ✓/✗ checklist
 * grouped by model with a legend and any failure details. Keeps the DRY,
 * auto-discovering spec while giving leaderboard-style output.
 */

// Color only when writing to a real terminal (respect NO_COLOR); otherwise
// emit plain text so piped/CI logs stay clean.
const color = process.stdout.isTTY && !process.env.NO_COLOR;
const c = (code) => (color ? code : "");
const GREEN = c("\x1b[32m");
const RED = c("\x1b[31m");
const DIM = c("\x1b[2m");
const BOLD = c("\x1b[1m");
const RESET = c("\x1b[0m");

/** First ancestor suite of the given type ('project' | 'describe' | 'file'). */
function ancestor(test, type) {
  for (let s = test.parent; s; s = s.parent) if (s.type === type) return s;
  return null;
}

export default class ChecklistReporter {
  onBegin(_config, suite) {
    this.suite = suite;
    this.total = suite.allTests().length;
    this.done = 0;
    console.log(`\n${BOLD}Running ${this.total} checks…${RESET}`);
  }

  // Live progress: one short line per check as it completes. Retries are
  // announced but not counted, so the [done/total] tally stays accurate.
  onTestEnd(test, result) {
    const slug = ancestor(test, "project")?.title ?? "default";
    const pass = result.status === "passed";
    if (!pass && result.retry < test.retries) {
      console.log(`  ${DIM}↻ ${slug} › ${test.title} failed, retrying…${RESET}`);
      return;
    }
    this.done += 1;
    const glyph = pass ? `${GREEN}✓${RESET}` : `${RED}✗${RESET}`;
    const count = `${DIM}[${String(this.done).padStart(String(this.total).length)}/${this.total}]${RESET}`;
    console.log(`  ${count} ${glyph} ${DIM}${slug}${RESET} › ${test.title}`);
  }

  onEnd(result) {
    const tests = this.suite.allTests();
    if (tests.length === 0) {
      console.log("no tests found");
      return;
    }

    // Group by project (model), preserving check definition order.
    const groups = new Map(); // slug -> { name, checks: [{title, ok, errors}] }
    const order = []; // check titles in first-seen order
    for (const test of tests) {
      const slug = ancestor(test, "project")?.title ?? "default";
      const name = ancestor(test, "describe")?.title ?? slug;
      if (!groups.has(slug)) groups.set(slug, { name, checks: [] });
      const ok = test.outcome() === "expected" || test.outcome() === "flaky";
      const errors = test.results.flatMap((r) => (r.error ? [r.error.message?.split("\n")[0] ?? ""] : []));
      groups.get(slug).checks.push({ title: test.title, ok, errors });
      if (!order.includes(test.title)) order.push(test.title);
    }

    // Legend: number each check once.
    console.log(`\n${BOLD}Behavioral checklist${RESET}`);
    order.forEach((title, i) => console.log(`  ${DIM}${i + 1}${RESET} ${title}`));
    console.log("");

    // One row per model: the ✓/✗ sequence follows the legend order.
    const width = Math.max(...[...groups.values()].map((g) => g.name.length));
    const failures = [];
    for (const [slug, g] of groups) {
      const byTitle = new Map(g.checks.map((c) => [c.title, c]));
      const marks = order.map((t) => {
        const c = byTitle.get(t);
        if (!c) return `${DIM}·${RESET}`;
        if (!c.ok) failures.push({ slug, title: t, errors: c.errors });
        return c.ok ? `${GREEN}✓${RESET}` : `${RED}✗${RESET}`;
      });
      const passed = g.checks.filter((c) => c.ok).length;
      const tally = passed === g.checks.length ? `${GREEN}${passed}/${g.checks.length}${RESET}` : `${RED}${passed}/${g.checks.length}${RESET}`;
      console.log(`  ${g.name.padEnd(width)}  ${marks.join(" ")}  ${tally}  ${DIM}${slug}${RESET}`);
    }

    // Failure details.
    if (failures.length) {
      console.log(`\n${RED}${BOLD}Failures${RESET}`);
      for (const f of failures) {
        console.log(`  ${RED}✗${RESET} ${f.slug} › ${f.title}`);
        for (const e of f.errors) console.log(`      ${DIM}${e}${RESET}`);
      }
    }

    const total = tests.length;
    const ok = [...groups.values()].reduce((n, g) => n + g.checks.filter((c) => c.ok).length, 0);
    const line = ok === total ? `${GREEN}all ${total} checks passed${RESET}` : `${RED}${total - ok} of ${total} checks failed${RESET}`;
    console.log(`\n${line} across ${groups.size} models${result.status !== "passed" ? ` ${DIM}(${result.status})${RESET}` : ""}\n`);
  }
}
