export const meta = {
  model: "Gemini 1.5 Pro"
};

/**
 * Derives game parameters from the source and emits the smallest equivalent HTML.
 * @param {string} inputHtml - The original game source code.
 * @returns {string} - The heavily minified, externally equivalent HTML.
 */
export function minify(inputHtml) {
  // 1. Helper to strictly extract values based on regex assumptions
  const extract = (regex, assumptionName) => {
    const match = inputHtml.match(regex);
    if (!match) {
      throw new Error(`Assumption failed: Cannot extract ${assumptionName} from source.`);
    }
    return match[1];
  };

  // 2. Validate assumptions and extract parameters
  const cellSize = extract(/CELL_SIZE\s*=\s*(\d+)/, "CELL_SIZE");
  const gridCells = extract(/GRID_CELLS\s*=\s*(\d+)/, "GRID_CELLS");
  const canvasW = extract(/width="(\d+)"/, "Canvas width");
  const canvasH = extract(/height="(\d+)"/, "Canvas height");
  const bodyBg = extract(/background:\s*(#[a-fA-F0-9]+)/, "Body background");
  const canvasBorder = extract(/style="border:\s*([^"]+)"/, "Canvas border");
  const boardColor = extract(/BOARD_COLOR\s*=\s*"([^"]+)"/, "BOARD_COLOR");
  const foodColor = extract(/FOOD_COLOR\s*=\s*"([^"]+)"/, "FOOD_COLOR");
  const snakeColor = extract(/SNAKE_COLOR\s*=\s*"([^"]+)"/, "SNAKE_COLOR");
  const baseTick = extract(/BASE_TICK_MS\s*=\s*(\d+)/, "BASE_TICK_MS");
  const minTick = extract(/MIN_TICK_MS\s*=\s*(\d+)/, "MIN_TICK_MS");
  const speedup = extract(/SPEEDUP_PER_CELL_MS\s*=\s*(\d+)/, "SPEEDUP_PER_CELL_MS");
  const startLength = extract(/START_LENGTH\s*=\s*(\d+)/, "START_LENGTH");
  const minSwipe = extract(/MIN_SWIPE_DISTANCE\s*=\s*(\d+)/, "MIN_SWIPE_DISTANCE");
  const storageKey = extract(/BEST_LENGTH_KEY\s*=\s*"([^"]+)"/, "BEST_LENGTH_KEY");
  const font = extract(/font\s*=\s*"([^"]+)"/, "Canvas font");

  // 3. Generate the smallest possible HTML/JS payload
  // - Replaces `Math.` with `M.` to save bytes.
  // - Compresses `turn()` logic into `x != -X && y != -Y`.
  // - Handles opaque origin `localStorage` throw gracefully.
  // - Score text inherits the snake fillStyle (as input.html does), so no color reset is needed.
  // - Single flat namespace without explicit declarations for state vars to save `let ` bytes.
  
  return `<body style="margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:${bodyBg};touch-action:none"><canvas id=C width=${canvasW} height=${canvasH} style="border:${canvasBorder}"></canvas><script>
let c=C.getContext("2d"),
G=${gridCells},
S=${cellSize},
L="${storageKey}",
b,s,X,Y,F,l,tx,ty,
M=Math,
R=_=>(M.random()*G)|0,
T=(x,y)=>{if(x!=-X&&y!=-Y)X=x,Y=y};
try{b=+localStorage.getItem(L)||0}catch(e){b=0}
(W=_=>{s=[{x:G/2|0,y:G/2|0}],X=1,Y=0,F={x:R(),y:R()},l=${startLength}})();
onkeydown=e=>{
  let k=e.key,x=k=="ArrowLeft"?-1:k=="ArrowRight"?1:0,y=k=="ArrowUp"?-1:k=="ArrowDown"?1:0;
  if(x||y)T(x,y)
};
ontouchstart=e=>{tx=e.touches[0].clientX,ty=e.touches[0].clientY};
ontouchend=e=>{
  let x=e.changedTouches[0].clientX-tx,y=e.changedTouches[0].clientY-ty;
  if(M.hypot(x,y)>${minSwipe})M.abs(x)>M.abs(y)?T(M.sign(x),0):T(0,M.sign(y))
};
(K=_=>{
  setTimeout(K,M.max(${minTick},${baseTick}-${speedup}*l));
  let h={x:(s[0].x+X+G)%G,y:(s[0].y+Y+G)%G};
  if(s.some(v=>v.x==h.x&&v.y==h.y))return W();
  s.unshift(h);
  if(h.x==F.x&&h.y==F.y)l++,F={x:R(),y:R()};
  while(s.length>l)s.pop();
  c.fillStyle="${boardColor}";c.fillRect(0,0,${canvasW},${canvasH});
  c.fillStyle="${foodColor}";c.fillRect(F.x*S,F.y*S,S-1,S-1);
  c.fillStyle="${snakeColor}";s.map(v=>c.fillRect(v.x*S,v.y*S,S-1,S-1));
  if(l>b){b=l;try{localStorage.setItem(L,b)}catch(e){}}
  c.font="${font}";c.fillText(l+" | best "+b,8,20)
})();
</script>`.replace(/\n\s*/g, '');
}