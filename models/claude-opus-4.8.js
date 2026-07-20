// constraint-driven-regenerator.js
//
// Strategy: this is program *synthesis*, not text minification. We parse the
// tunable constants out of `input.html` (the spec), assert every structural
// assumption we rely on, then emit a from-scratch page whose emitted literals
// are all derived from those parsed constants. If the spec changes in a way
// that breaks an assumption we throw rather than emit stale output.
//
// The wins over the original source, all behaviour-preserving:
//   * Snake cells stored as a single integer  p = x + GRID*y  instead of {x,y}.
//     -> self-collision becomes `s.includes(h)` (vs a .some() scan) and
//        food-eat becomes `h==f` (vs comparing two fields).
//   * Two Math.random() calls per food spawn collapse to one over GRID*GRID:
//     picking (fx,fy) uniformly and picking f=fx+GRID*fy uniformly are the
//     same distribution, and the RNG stream is unobservable, so this is a
//     behavioural no-op.
//   * Keyboard: keyCode-37 maps ArrowLeft/Up/Right/Down to 0..3. For the
//     canonical arrow layout the four vectors are emitted as arithmetic
//     (even i -> (i-1,0), odd i -> (0,i-2)); any other DIRECTIONS falls back
//     to a derived lookup table. `!(i&-4)` is the 0..3 range guard.
//   * Swipe distance test uses d^2 < threshold^2 instead of Math.hypot()<t
//     (monotonic, identical decision) and sign via `x<0?-1:1` (the dominant
//     axis is always non-zero in the branch that uses it).
//   * `id=a` gives a named global, so we skip getElementById; undeclared
//     globals (sloppy-mode plain <script>); `on*` handler props.
//   * Two one-liner helpers: E(p) draws a grid cell, S(x) sets fillStyle;
//     both are called enough times to pay for themselves.
//   * The fixed-size canvas is centred with position:absolute;inset:0;
//     margin:auto (cheaper than a flex/grid container); the body background
//     propagates to the viewport so the page still fills with PAGE_BG.
//   * Text colour is free: fillStyle is still the snake colour after the draw
//     loop, exactly as in the source, so we never re-set it before fillText.
//   * Structural trims safe in a modern browser: no <!doctype>, no </canvas>
//     (the trailing <script> runs as canvas fallback content), bracket
//     localStorage access (throws identically on an opaque data: origin).
// Every emitted literal is derived from the parsed constants; if the spec
// breaks an assumption we throw in section 2 rather than emit stale output.

export const meta = {
  algo: "constraint-driven-regenerator",
  model: "Claude Opus 4.8",
};

// Pull the RHS of a `const NAME = <value>;` declaration.
function constDecl(src, name) {
  const m = src.match(new RegExp("const\\s+" + name + "\\s*=\\s*([^;]+);"));
  if (!m) throw new Error(`Assumption failed: missing const ${name}`);
  return m[1].trim();
}
function num(src, name) {
  const raw = constDecl(src, name);
  const n = Number(raw);
  if (!Number.isFinite(n)) throw new Error(`Assumption failed: ${name} is not a finite number (got ${raw})`);
  return n;
}
function str(src, name) {
  const raw = constDecl(src, name);
  const m = raw.match(/^"([^"]*)"$/) || raw.match(/^'([^']*)'$/);
  if (!m) throw new Error(`Assumption failed: ${name} is not a plain string literal (got ${raw})`);
  return m[1];
}

export function minify(inputHtml) {
  const src = String(inputHtml);

  // ---- 1. Extract constants -------------------------------------------------
  const CELL = num(src, "CELL_SIZE");
  const GRID = num(src, "GRID_CELLS");
  const BOARD_COLOR = str(src, "BOARD_COLOR");
  const FOOD_COLOR = str(src, "FOOD_COLOR");
  const SNAKE_COLOR = str(src, "SNAKE_COLOR");
  const BASE = num(src, "BASE_TICK_MS");
  const MIN = num(src, "MIN_TICK_MS");
  const SPEEDUP = num(src, "SPEEDUP_PER_CELL_MS");
  const START_LENGTH = num(src, "START_LENGTH");
  const MIN_SWIPE = num(src, "MIN_SWIPE_DISTANCE");
  const KEY = str(src, "BEST_LENGTH_KEY");

  // Canvas dimensions from the <canvas> tag.
  const canvasM = src.match(/<canvas[^>]*\bwidth="(\d+)"[^>]*\bheight="(\d+)"/);
  if (!canvasM) throw new Error("Assumption failed: cannot find <canvas> width/height");
  const CW = Number(canvasM[1]);
  const CH = Number(canvasM[2]);

  // Border "<w>px solid <color>" from the canvas style attribute.
  const borderM = src.match(/border:\s*(\d+)px\s+solid\s+(#[0-9a-fA-F]{3,8})/);
  if (!borderM) throw new Error("Assumption failed: cannot find canvas border 'Npx solid #color'");
  const BORDER_W = Number(borderM[1]);
  const BORDER_C = borderM[2];

  // Page background from the body style.
  const bgM = src.match(/background:\s*(#[0-9a-fA-F]{3,8})/);
  if (!bgM) throw new Error("Assumption failed: cannot find body background colour");
  const PAGE_BG = bgM[1];

  // Score font string.
  const fontM = src.match(/context\.font\s*=\s*"([^"]+)"/);
  if (!fontM) throw new Error("Assumption failed: cannot find context.font");
  const FONT = fontM[1];

  // Starting snake cell: snake = [{ x: N, y: M }]
  const startM = src.match(/snake\s*=\s*\[\{\s*x:\s*(\d+),\s*y:\s*(\d+)\s*\}\]/);
  if (!startM) throw new Error("Assumption failed: cannot find start position 'snake = [{x,y}]'");
  const SX = Number(startM[1]);
  const SY = Number(startM[2]);

  // Starting direction from reset(): stepX = A; stepY = B;
  const sxM = src.match(/stepX\s*=\s*(-?\d+);/);
  const syM = src.match(/stepY\s*=\s*(-?\d+);/);
  if (!sxM || !syM) throw new Error("Assumption failed: cannot find start direction stepX/stepY");
  const DX0 = Number(sxM[1]);
  const DY0 = Number(syM[1]);

  // Score line: fillText(`${snakeLength}<SEP>${bestLength}`, TX, TY)
  const scoreM = src.match(/fillText\(\s*`\$\{snakeLength\}([^`$]*)\$\{bestLength\}`\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/);
  if (!scoreM) throw new Error("Assumption failed: cannot parse the fillText score line");
  const SEP = scoreM[1];          // the literal between the two interpolations, e.g. " | best "
  const TX = Number(scoreM[2]);
  const TY = Number(scoreM[3]);

  // Cell rectangle size: fillRect(..., CELL_SIZE - K, CELL_SIZE - K)
  const gapM = src.match(/CELL_SIZE\s*-\s*(\d+)/);
  if (!gapM) throw new Error("Assumption failed: cannot find 'CELL_SIZE - K' rect size");
  const GAP = Number(gapM[1]);

  // Direction vectors for the four arrow keys, from the DIRECTIONS object.
  function dir(name) {
    const m = src.match(new RegExp(name + ":\\s*\\{\\s*x:\\s*(-?\\d+),\\s*y:\\s*(-?\\d+)\\s*\\}"));
    if (!m) throw new Error(`Assumption failed: DIRECTIONS is missing ${name}`);
    return [Number(m[1]), Number(m[2])];
  }
  // keyCode order: ArrowLeft=37, ArrowUp=38, ArrowRight=39, ArrowDown=40.
  const DIRS = [dir("ArrowLeft"), dir("ArrowUp"), dir("ArrowRight"), dir("ArrowDown")];

  // ---- 2. Validate assumptions ---------------------------------------------
  if (CW !== CH) throw new Error(`Assumption failed: canvas is not square (${CW}x${CH})`);
  if (CW !== CELL * GRID)
    throw new Error(`Assumption failed: canvas ${CW} != CELL_SIZE*GRID_CELLS (${CELL}*${GRID})`);
  if (SX < 0 || SX >= GRID || SY < 0 || SY >= GRID)
    throw new Error("Assumption failed: start cell outside the grid");
  const nonzero = (v) => (v[0] !== 0) + (v[1] !== 0);
  if (nonzero([DX0, DY0]) !== 1)
    throw new Error("Assumption failed: start direction is not a unit axis vector");
  for (const v of DIRS)
    if (nonzero(v) !== 1 || Math.abs(v[0]) > 1 || Math.abs(v[1]) > 1)
      throw new Error("Assumption failed: a DIRECTIONS vector is not a unit axis step");
  // Wrap-around modulo GRID must be present (encoding relies on it).
  if (!/%\s*GRID_CELLS/.test(src))
    throw new Error("Assumption failed: expected wrap-around '% GRID_CELLS'");

  // ---- 3. Derive emitted parameters ----------------------------------------
  const N2 = GRID * GRID;         // random cell range
  const RECT = CELL - GAP;        // drawn square side
  const START = SX + GRID * SY;   // encoded start cell
  const SWIPE2 = MIN_SWIPE * MIN_SWIPE;

  // ---- 4. Generate compact JavaScript --------------------------------------
  const q = (s) => "'" + s + "'";                 // input strings are ASCII w/o quotes
  const startPos = SX === SY ? `x=y=${SX}` : `x=${SX};y=${SY}`;
  const dirsLit = "[" + DIRS.map((v) => `[${v[0]},${v[1]}]`).join(",") + "]";

  // Keyboard handler. keyCode-37 indexes ArrowLeft/Up/Right/Down as 0..3.
  // For the canonical arrow layout ([-1,0],[0,-1],[1,0],[0,1]) the vectors follow
  // an arithmetic pattern (even i -> (i-1,0), odd i -> (0,i-2)), which is shorter
  // than shipping the table. If the parsed DIRECTIONS differ we emit the general
  // table-driven form so any other mapping still works.
  const canonicalDirs = [[-1, 0], [0, -1], [1, 0], [0, 1]];
  const isCanonical =
    DIRS.length === 4 && DIRS.every((v, i) => v[0] === canonicalDirs[i][0] && v[1] === canonicalDirs[i][1]);
  const keyHandler = isCanonical
    ? `onkeydown=e=>{i=e.keyCode-37;!(i&-4)&&(i%2?t(0,i-2):t(i-1,0))};`
    : `D=${dirsLit};onkeydown=e=>{d=D[e.keyCode-37];d&&t(...d)};`;

  const js =
`g=${GRID};k=${q(KEY)};c=a.getContext('2d');c.font=${q(FONT)};` +
`try{b=+localStorage[k]||0}catch{b=0}` +
`r=()=>Math.random()*${N2}|0;` +
`E=p=>c.fillRect(p%g*${CELL},(p/g|0)*${CELL},${RECT},${RECT});S=x=>c.fillStyle=x;` +
`R=()=>{s=[${START}];${startPos};u=${DX0};v=${DY0};f=r();n=${START_LENGTH}};R();` +
`t=(X,Y)=>{X!=-u&&Y!=-v&&(u=X,v=Y)};` +
`${keyHandler}` +
`ontouchstart=e=>{[{clientX:p,clientY:q}]=e.touches};` +
`ontouchend=e=>{[{clientX:i,clientY:j}]=e.changedTouches;i-=p;j-=q;i*i+j*j<${SWIPE2}||(i*i>j*j?t(i<0?-1:1,0):t(0,j<0?-1:1))};` +
`T=()=>{setTimeout(T,Math.max(${MIN},${BASE}-${SPEEDUP}*n));` +
`x=(x+u+g)%g;y=(y+v+g)%g;h=x+g*y;` +
`if(s.includes(h))return R();s.unshift(h);h==f&&(n++,f=r());s.length>n&&s.pop();` +
`S(${q(BOARD_COLOR)});c.fillRect(0,0,${CW},${CH});` +
`S(${q(FOOD_COLOR)});E(f);` +
`S(${q(SNAKE_COLOR)});for(z of s)E(z);` +
`if(n>b){b=n;try{localStorage[k]=n}catch{}}` +
`c.fillText(n+${q(SEP)}+b,${TX},${TY})};T()`;

  // ---- 5. Emit HTML ---------------------------------------------------------
  // Center the fixed-size canvas in the viewport with position:absolute;inset:0;margin:auto
  // (cheaper than a grid/flex container on <body>). With the canvas out of flow the body box
  // collapses, but its background propagates to the viewport per CSS, so the page still fills
  // with PAGE_BG exactly as the original's min-height:100vh body did.
  const html =
`<body style="margin:0;background:${PAGE_BG};touch-action:none">` +
`<canvas id=a width=${CW} height=${CH} style="border:${BORDER_W}px solid ${BORDER_C};position:absolute;inset:0;margin:auto">` +
`<script>${js}</script>`;

  // ASCII guard.
  if (!/^[\x00-\x7F]*$/.test(html)) throw new Error("Generated HTML is not pure ASCII");
  return html;
}