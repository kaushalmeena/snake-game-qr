/**
 * Hand-golfed rewrite: looks and behaves identically to input.html but far
 * smaller than a general-purpose minifier can go (`bun run compare`).
 *
 * A minifier must preserve the structure of the code it is given; it can
 * shorten names but never change the algorithm. This algorithm instead treats
 * input.html as the *specification*: it extracts the game's tunable constants
 * (grid size, colors, speed, …) and re-emits the same game from a
 * hand-optimized template. Change a color or the tick rate in input.html and
 * the golfed output follows; change the game's logic and the extraction fails
 * loudly rather than emitting a stale game.
 *
 * The template's key idea (and this file's name): a snake cell is a single
 * integer `p = y * N + x` instead of an `{x, y}` object, so self-collision is
 * `S.includes(h)`, eating is `h == f`, and spawning food is one random number.
 */

export const meta = {
  algo: "integer-cell-golf",
  model: "Claude Fable 5",
};

/** Pull one capture group out of the input, failing loudly on drift. */
function extract(html, re, what, group = 1) {
  const match = html.match(re);
  if (!match) {
    throw new Error(`integer-cell-golf: could not find ${what} in input.html (pattern ${re})`);
  }
  return match[group];
}

/** Assert a logic pattern this algorithm relies on is still in the input. */
function assertShape(html, re, what) {
  if (!re.test(html)) {
    throw new Error(`integer-cell-golf: ${what} changed in input.html — this template no longer applies (pattern ${re})`);
  }
}

const int = (s) => parseInt(s, 10);

export function minify(html) {
  // ── Step 1: extract the game's constants from input.html ────────────────
  const cell = int(extract(html, /const CELL_SIZE = (\d+)/, "cell size"));
  const grid = int(extract(html, /const GRID_CELLS = (\d+)/, "grid size"));
  const px = int(extract(html, /width="(\d+)"/, "canvas width"));
  const pageBg = extract(html, /background: (#[0-9a-f]+)/, "page background");
  const borderW = extract(html, /border: (\d+)px solid/, "border width");
  const borderC = extract(html, /border: \d+px solid (#[0-9a-f]+)/, "border color");
  const touch = /touch-action: none/.test(html); // swipe steering enabled?
  const font = extract(html, /context\.font = "([^"]+)"/, "score font");
  const boardC = extract(html, /const BOARD_COLOR = "(#[0-9a-f]+)"/, "board color");
  const foodC = extract(html, /const FOOD_COLOR = "(#[0-9a-f]+)"/, "food color");
  const snakeC = extract(html, /const SNAKE_COLOR = "(#[0-9a-f]+)"/, "snake color");
  const startX = int(extract(html, /snake = \[\{ x: (\d+), y: (\d+) \}\]/, "start x"));
  const startY = int(extract(html, /snake = \[\{ x: (\d+), y: (\d+) \}\]/, "start y", 2));
  const startDx = extract(html, /stepX = (-?\d+)/, "initial x step");
  const startDy = extract(html, /stepY = (-?\d+)/, "initial y step");
  const startLen = int(extract(html, /const START_LENGTH = (\d+)/, "start length"));
  const tickBase = int(extract(html, /const BASE_TICK_MS = (\d+)/, "base tick"));
  const tickFloor = int(extract(html, /const MIN_TICK_MS = (\d+)/, "tick floor"));
  const tickStep = int(extract(html, /const SPEEDUP_PER_CELL_MS = (\d+)/, "tick speedup"));
  const swipeMin = int(extract(html, /const MIN_SWIPE_DISTANCE = (\d+)/, "swipe threshold"));
  const bestKey = extract(html, /const BEST_LENGTH_KEY = "([^"]+)"/, "high-score storage key");

  // Score line: fillText(`${snakeLength} <label> ${bestLength}`, x, y)
  const scoreRe = /fillText\(`\$\{snakeLength\} (.+?) \$\{bestLength\}`, (\d+), (\d+)\)/;
  const scoreLabel = extract(html, scoreRe, "score label");
  const scoreX = int(extract(html, scoreRe, "score x", 2));
  const scoreY = int(extract(html, scoreRe, "score y", 3));

  // The template re-implements these input.html behaviors with different
  // code, so it must refuse to run when their logic drifts.
  assertShape(
    html,
    /Math\.max\(MIN_TICK_MS, BASE_TICK_MS - SPEEDUP_PER_CELL_MS \* snakeLength\)/,
    "the speed-ramp formula"
  );
  assertShape(html, /Math\.hypot\(deltaX, deltaY\) < MIN_SWIPE_DISTANCE/, "the swipe/tap threshold check");
  assertShape(html, /Math\.floor\(Math\.random\(\) \* GRID_CELLS\)/, "the food spawner's range");
  for (const [key, [vx, vy]] of Object.entries({
    ArrowLeft: [-1, 0],
    ArrowUp: [0, -1],
    ArrowRight: [1, 0],
    ArrowDown: [0, 1],
  })) {
    // The 'LURD' trick below hardcodes the standard arrow-key mapping.
    assertShape(html, new RegExp(`${key}: \\{ x: ${vx}, y: ${vy} \\}`), `the ${key} direction`);
  }

  if (px !== cell * grid || px !== int(extract(html, /height="(\d+)"/, "canvas height"))) {
    throw new Error(`integer-cell-golf: canvas size ${px} does not match CELL_SIZE*GRID_CELLS = ${cell * grid}`);
  }

  // ── Step 2: derived values ───────────────────────────────────────────────
  const start = startY * grid + startX; // start cell as a single integer
  const cells = grid * grid; // one random number spans the whole board
  const size = cell - 1; // rect size, leaving the 1px grid gap

  // When grid and cell are powers of two, bit ops beat division/multiplication
  // by a couple of bytes: `p>>5<<4` vs `(p/32|0)*16`.
  const lgGrid = Math.log2(grid);
  const lgCell = Math.log2(cell);
  const pow2 = Number.isInteger(lgGrid) && Number.isInteger(lgCell);
  const yPx = pow2 ? `p>>${lgGrid}<<${lgCell}` : `(p/${grid}|0)*${cell}`; // cell → pixel y
  const headY = pow2 ? `S[0]>>${lgGrid}` : `S[0]/${grid}|0`; // head's grid row

  // localStorage[key], as dot access when the key allows it (1 byte shorter).
  const store = /^[A-Za-z_$][\w$]*$/.test(bestKey)
    ? `localStorage.${bestKey}`
    : `localStorage[${JSON.stringify(bestKey)}]`;

  // ── Step 3: the script ───────────────────────────────────────────────────
  // Globals throughout (sloppy mode needs no let/const): S snake, d/e
  // direction, f food, l length, b best, h next head, q context, g tick,
  // W turn, Y save-best, a key scratch, T/u/v/x/y touch scratch.
  const js =
    // Tagged template: `getContext\`2d\`` saves the ("…") around the argument.
    "q=c.getContext`2d`," +
    `q.font="${font}",` +
    // Draw one cell. `S.map(R)` later relies on R ignoring map's extra args.
    `R=p=>q.fillRect(p%${grid}*${cell},${yPx},${size},${size}),` +
    // Food spawner: one random cell index instead of separate x and y.
    `r=_=>Math.random()*${cells}|0,` +
    // Reset, as a comma-expression arrow — no braces, no return.
    `z=_=>(S=[${start}],d=${startDx},e=${startDy},f=r(),l=${startLen}),z(),b=0;` +
    // High score. Touching localStorage THROWS on opaque origins (this page
    // ships as a data: URL), so reads and writes are wrapped in try/catch —
    // exactly what input.html's loadBestLength/saveBestLength do.
    // `+x||0` matches Number(getItem(...))||0 for null and garbage alike.
    `try{b=+${store}||0}catch{}` +
    `Y=v=>{try{${store}=v}catch{}},` +
    // Turn with the no-reversing-onto-your-neck guard, shared by both inputs.
    "W=(x,y)=>x!=-d&&y!=-e&&(d=x,e=y)," +
    // Character 5 of "ArrowLeft/ArrowUp/ArrowRight/ArrowDown" is a unique
    // letter, so 'LURD'.indexOf gives 0-3 (-1 for other keys, rejected by
    // `~a&&`), and dx/dy fall out arithmetically from that index — the
    // assertions above pinned input.html to this exact mapping.
    // (`e.keyCode` would be shorter but synthetic key events carry keyCode 0.)
    // Assigning window.onkeydown is observably equivalent to the input's
    // window.addEventListener("keydown", …) for a page with no other code.
    "onkeydown=k=>(a='LURD'.indexOf(k.key[5]),~a&&W(a%2?0:a-1,a%2?a-2:0))," +
    // Swipe steering: remember where the touch started, then turn along the
    // dominant axis of the finger's travel. hypot<min becomes dx²+dy²<min²,
    // and abs(dx)>abs(dy) becomes dx²>dy². Signs are decided inline (the
    // winning axis is provably nonzero once past the tap threshold).
    (touch
      ? "ontouchstart=t=>(T=t.touches[0],u=T.clientX,v=T.clientY)," +
        "ontouchend=t=>(T=t.changedTouches[0],x=T.clientX-u,y=T.clientY-v," +
        `x*x+y*y>=${swipeMin * swipeMin}&&(x*x>y*y?W(x<0?-1:1,0):W(0,y<0?-1:1))),`
      : "") +
    // Self-rescheduling tick (setInterval can't change speed). Scheduling
    // first keeps the game alive through the early `return z()` on death.
    `(g=_=>{setTimeout(g,Math.max(${tickFloor},${tickBase}-${tickStep}*l));` +
    // Next head cell, wrapping x and y independently (matches input.html).
    `h=((${headY})+e+${grid})%${grid}*${grid}+(S[0]%${grid}+d+${grid})%${grid};` +
    `if(S.includes(h))return z();` +
    // Grow on food, then trim the tail; the for-header absorbs a semicolon.
    `for(S.unshift(h),h==f&&(l++,f=r());S.length>l;)S.pop();` +
    `q.fillStyle="${boardC}";q.fillRect(0,0,${px},${px});` +
    `q.fillStyle="${foodC}";R(f);` +
    `q.fillStyle="${snakeC}";S.map(R);` +
    // Score in the snake's color; persist the best only when it improves.
    `l>b&&Y(b=l);q.fillText(l+" ${scoreLabel} "+b,${scoreX},${scoreY})})()`;

  // ── Step 4: the page shell ───────────────────────────────────────────────
  return (
    // Doctype, <html>, <head>, <meta charset>, <title> are all omitted: the
    // parser infers the structure, the file is pure ASCII, and quirks mode
    // does not affect anything this page uses (verified in-browser).
    // `bgcolor` is a legacy attribute every browser still honors — shorter
    // than a style="background:…" and valid unquoted.
    `<body bgcolor=${pageBg}>` +
    // The canvas id shrinks to `c` (ids are not observable behavior), and the
    // template leans on the id-to-global shortcut instead of getElementById.
    // Attribute quotes dropped where the value has no spaces. The style stays
    // quoted for the space in "2px solid" (the one before the hex color is
    // optional — the CSS tokenizer splits `solid#123456` fine).
    // `position:fixed;inset:0;margin:auto` centers a fixed-size element in
    // the viewport, replacing input.html's 96-char flexbox recipe and its
    // body margin reset. touch-action:none goes on the canvas (the golfed
    // body has zero height, so it would be dead CSS there) and stops the
    // browser from turning swipes into scrolling or pull-to-refresh.
    `<canvas id=c width=${px} height=${px} ` +
    `style="border:${borderW}px solid${borderC};position:fixed;inset:0;margin:auto` +
    `${touch ? ";touch-action:none" : ""}">` +
    // No </canvas>: the script parses as canvas fallback content, which still
    // executes. </script> is NOT optional — an unterminated script at EOF is
    // discarded by the parser, so it stays.
    `<script>${js}</script>`
  );
}
