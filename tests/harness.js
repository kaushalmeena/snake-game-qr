import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

/**
 * Shared black-box test helpers for the model behavioral suite. Everything
 * here reads only the <canvas> pixels and localStorage — never a model's
 * internal variables — so the same checks hold for any faithful
 * implementation. The Playwright spec in models.spec.js drives these.
 */

const ROOT = resolve(import.meta.dirname, "..");
const MODELS_DIR = resolve(ROOT, "models");

// ── Spec constants, extracted from input.html so the tests track the spec ──
const input = await readFile(resolve(ROOT, "input/input.html"), "utf8");
const num = (re, name) => {
  const m = input.match(re);
  if (!m) throw new Error(`test setup: could not find ${name} in input.html`);
  return m[1];
};
export const GRID = +num(/GRID_CELLS = (\d+)/, "grid size");
export const CELL = +num(/CELL_SIZE = (\d+)/, "cell size");
export const START_LEN = +num(/START_LENGTH = (\d+)/, "start length");
export const SWIPE_MIN = +num(/MIN_SWIPE_DISTANCE = (\d+)/, "swipe threshold");
const TICK_FLOOR = +num(/MIN_TICK_MS = (\d+)/, "minimum tick delay");
export const KEY = num(/BEST_LENGTH_KEY = "([^"]+)"/, "best-length key");
export const CENTER = { x: +num(/x: (\d+), y: \d+ \}\]/, "start x"), y: +num(/x: \d+, y: (\d+) \}\]/, "start y") };
const SNAKE = num(/SNAKE_COLOR = "#([0-9a-f]+)"/, "snake color");
const FOOD = num(/FOOD_COLOR = "#([0-9a-f]+)"/, "food color");
const BOARD = num(/BOARD_COLOR = "#([0-9a-f]+)"/, "board color");

const ARROW = { "1,0": "ArrowRight", "-1,0": "ArrowLeft", "0,1": "ArrowDown", "0,-1": "ArrowUp" };
export const xy = (c) => ({ x: c % GRID, y: Math.floor(c / GRID) });
/** Signed unit step from a to b around a wrapping ring of size GRID. */
const ringDir = (a, b) => {
  const d = (b - a + GRID) % GRID;
  return d === 0 ? 0 : d <= GRID / 2 ? 1 : -1;
};

// ── Targets: every model submission + the baseline control ───────────────────
async function buildTargets() {
  const files = (await readdir(MODELS_DIR)).filter((f) => f.endsWith(".js")).sort();
  const targets = [];
  for (const file of files) {
    const mod = await import(pathToFileURL(resolve(MODELS_DIR, file)).href);
    // slug (the filename) names the Playwright project; name (meta.model) titles
    // the tests. Keeping them distinct lets the per-project grep match the test
    // title without also matching the project-name prefix Playwright prepends.
    targets.push({ slug: file.replace(/\.js$/, ""), name: mod.meta?.model ?? file, html: await mod.minify(input) });
  }
  const base = await import(pathToFileURL(resolve(ROOT, "lib/baseline.js")).href);
  targets.push({ slug: "baseline", name: `${base.label} (baseline)`, html: await base.minify(input) });
  return targets;
}
export const targets = await buildTargets();

// ── In-page canvas reader ────────────────────────────────────────────────────
function scanPage({ grid, cell, snakeHex, foodHex, boardHex }) {
  const g = document.querySelector("canvas").getContext("2d");
  const d = g.getImageData(0, 0, grid * cell, grid * cell).data;
  const hex = (x, y) => {
    const i = (y * grid * cell + x) * 4;
    return ((1 << 24) + (d[i] << 16) + (d[i + 1] << 8) + d[i + 2]).toString(16).slice(1);
  };
  const snake = [];
  const food = [];
  let scoreSig = 0;
  for (let cy = 0; cy < grid; cy++) {
    for (let cx = 0; cx < grid; cx++) {
      const px = cx * cell + (cell >> 1);
      const py = cy * cell + (cell >> 1);
      const c = hex(px, py);
      const masked = px < 160 && py < 28; // score-text region
      if (c === snakeHex && !masked) snake.push(cy * grid + cx);
      else if (c === foodHex) food.push(cy * grid + cx);
    }
  }
  // Any non-background ink in the score region, to detect score redraws
  // regardless of the text color a model happens to use.
  for (let y = 0; y < 28; y++) for (let x = 0; x < 160; x++) if (hex(x, y) !== boardHex) scoreSig += x * 31 + y;
  return { snake: snake.sort((a, b) => a - b), food, scoreSig };
}

export const scan = (page) =>
  page.evaluate(scanPage, { grid: GRID, cell: CELL, snakeHex: SNAKE, foodHex: FOOD, boardHex: BOARD });

/**
 * Advance the game by exactly one tick and return the new scan. Time is faked
 * (page.clock), so this never waits real wall-clock. We step the clock by just
 * under MIN_TICK_MS: the game keeps a single pending setTimeout whose delay is
 * always >= MIN_TICK_MS, so each step fires at most one tick — we stop the
 * moment the board changes, giving precise one-tick granularity.
 */
export async function nextTick(page, prev, maxFakeMs = 6000) {
  if (!prev) return scan(page);
  const key = (s) => s.snake.join(",");
  const step = TICK_FLOOR - 1;
  for (let elapsed = 0; elapsed < maxFakeMs; elapsed += step) {
    await page.clock.runFor(step);
    const s = await scan(page);
    if (key(s) !== key(prev)) return s;
  }
  return scan(page);
}

/** Movement between two consecutive scans: {dir:[dx,dy], head, grew}. */
export function diff(a, b) {
  const setA = new Set(a.snake);
  const added = b.snake.filter((c) => !setA.has(c));
  const removed = a.snake.filter((c) => !new Set(b.snake).has(c));
  if (added.length !== 1) return null;
  const head = added[0];
  const h = xy(head);
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const nx = (h.x - dx + GRID) % GRID;
    const ny = (h.y - dy + GRID) % GRID;
    if (setA.has(ny * GRID + nx)) return { dir: [dx, dy], head, grew: removed.length === 0 };
  }
  return { dir: null, head, grew: removed.length === 0 };
}

/** Observe the current movement direction over one tick. */
export async function observe(page) {
  const a = await scan(page);
  const b = await nextTick(page, a);
  return { ...diff(a, b), scan: b };
}

export const press = (page, dir) => page.keyboard.press(ARROW[dir.join(",")]);

export async function swipe(page, dx, dy) {
  await page.evaluate(
    ({ dx, dy }) => {
      const t = (x, y) => new Touch({ identifier: 0, target: document.body, clientX: x, clientY: y });
      dispatchEvent(new TouchEvent("touchstart", { touches: [t(200, 200)], bubbles: true }));
      dispatchEvent(new TouchEvent("touchend", { changedTouches: [t(200 + dx, 200 + dy)], bubbles: true }));
    },
    { dx, dy }
  );
}

/** Poll until the observed movement direction equals target (or time out). */
export async function waitDir(page, target, timeout = 1500) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const d = (await observe(page)).dir;
    if (d && d[0] === target[0] && d[1] === target[1]) return true;
  }
  return false;
}

/** Wait until the snake stops its startup growth (a tick that pops the tail). */
export async function waitFullLength(page, timeout = 5000) {
  let prev = await scan(page);
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const cur = await nextTick(page, prev);
    const d = diff(prev, cur);
    prev = cur;
    if (d && !d.grew) return cur;
  }
  return prev;
}

/** Steer greedily toward the food until the snake grows; returns true on growth. */
export async function steerToEat(page, maxTicks = 140) {
  await waitFullLength(page); // ignore startup growth (length 1 → START_LENGTH)
  let prev = await scan(page);
  for (let i = 0; i < maxTicks; i++) {
    const cur = await nextTick(page, prev);
    const step = diff(prev, cur);
    prev = cur;
    if (step?.grew) return true;
    if (!step?.dir || !cur.food.length) continue;
    const h = xy(step.head);
    const f = xy(cur.food[0]);
    const [dx, dy] = step.dir;
    let want = null;
    if (dx !== 0) {
      if (h.y !== f.y) want = [0, ringDir(h.y, f.y)];
    } else if (h.y === f.y) {
      want = [ringDir(h.x, f.x) || 1, 0];
    }
    if (want && want[0] !== -dx && want[1] !== -dy) await press(page, want);
  }
  return false;
}

/** Let the snake run straight and watch for the head to jump across any edge. */
export async function detectWrap(page, maxTicks = 80) {
  let prev = await scan(page);
  let prevHead = diff(prev, await nextTick(page, prev))?.head ?? prev.snake[0];
  for (let i = 0; i < maxTicks; i++) {
    const cur = await nextTick(page, prev);
    const step = diff(prev, cur);
    prev = cur;
    if (step?.head != null && prevHead != null) {
      const a = xy(prevHead);
      const b = xy(step.head);
      if (Math.abs(a.x - b.x) === GRID - 1 || Math.abs(a.y - b.y) === GRID - 1) return true;
      prevHead = step.head;
    }
  }
  return false;
}

/** Curl the snake clockwise until it hits itself; detect the reset to center. */
export async function forceCollision(page, maxTicks = 60) {
  const turns = [[1, 0], [0, 1], [-1, 0], [0, -1]]; // R, D, L, U (clockwise)
  let prev = await scan(page);
  const maxLen = prev.snake.length;
  for (let i = 0; i < maxTicks; i++) {
    await press(page, turns[i % 4]);
    const cur = await nextTick(page, prev);
    const center = cur.snake.some((c) => Math.abs(xy(c).y - CENTER.y) <= 1);
    if (cur.snake.length <= START_LEN + 1 && maxLen >= START_LEN + 2 && center && cur.snake.length < prev.snake.length - 1) {
      return true;
    }
    prev = cur;
  }
  return false;
}

/**
 * Open one isolated game: a fresh context (so storage is isolated), the given
 * HTML served for every request via routing, deterministic food, and optional
 * storage tampering. Returns { context, page, errors } — close the context.
 */
export async function openGame(browser, html, { breakStorage = false, presetBest = null } = {}) {
  // hasTouch so dispatched TouchEvents carry a populated (iterable) touch list.
  const context = await browser.newContext({ hasTouch: true });
  const errors = [];
  await context.addInitScript(() => {
    let s = 12345;
    Math.random = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff), s / 0x7fffffff);
  });
  if (breakStorage) {
    await context.addInitScript(() => {
      Object.defineProperty(window, "localStorage", {
        configurable: true,
        get() {
          throw new Error("localStorage blocked");
        },
      });
    });
  }
  if (presetBest !== null) {
    await context.addInitScript(({ key, val }) => {
      try {
        localStorage.setItem(key, val);
      } catch {}
    }, { key: KEY, val: presetBest });
  }
  const page = await context.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  // Fake the clock before navigating so the game's timers are controllable.
  // The page draws its first frame synchronously on load; every later tick is
  // driven by advancing this clock in nextTick().
  await page.clock.install();
  await page.route("**/*", (route) => route.fulfill({ contentType: "text/html; charset=utf-8", body: html }));
  await page.goto("http://localhost/");
  await scan(page); // first (synchronous) paint is present
  return { context, page, errors };
}
