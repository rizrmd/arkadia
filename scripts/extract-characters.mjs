// Slices the imagegen character sheets and equipment atlas by connected alpha components (not by a fixed grid),
// registers every frame to one ground pivot per character, and writes padded atlases + animation metadata.
// Usage: node scripts/extract-characters.mjs  (sources: assets-src/characters/*.png, unmodified imagegen output)
import sharp from 'sharp';
import fs from 'node:fs/promises';

const SRC = 'assets-src/characters', OUT = 'public/assets/characters';
const ALPHA = 16;          // alpha below this is treated as empty and zeroed (fringe + background colour bleed)
const SCALE = 0.5;         // atlas resolution vs source; frames are mip-mapped in the game
const GUTTER = 4;          // empty pixels between atlas cells; every cell border is asserted transparent
const MIN_PART = 200;      // components smaller than this are specks; merged into a figure only if inside its bbox

// Clip layout was verified by viewing every frame (see Knowledge page); rows are detected, not assumed.
const CHARACTERS = {
  hero: { file: 'hero-v2.png', rows: 6, cols: 6, clips: {
    idle:   { row: 0, frames: [0, 1, 2, 3, 4, 5], fps: 6,  loop: true },
    move:   { row: 1, frames: [0, 1, 2, 3, 4, 5], fps: 10, loop: true },
    idleBack: { row: 4, frames: [0, 1, 2, 3, 4, 5], fps: 6, loop: true },
    moveBack: { row: 5, frames: [0, 1, 2, 3, 4, 5], fps: 10, loop: true },
    attack: { row: 2, frames: [0, 1, 2, 3, 4, 5], fps: 12, loop: false, impact: 3 },
    hit:    { row: 3, frames: [0, 1],             fps: 10, loop: false },
    die:    { row: 3, frames: [2, 3, 4, 5],       fps: 8,  loop: false },
  } },
  revenant: { file: 'enemy-v2.png', rows: 6, cols: 6, clips: {
    idle:   { row: 0, frames: [0, 1, 2, 3, 4, 5], fps: 6,  loop: true },
    move:   { row: 1, frames: [0, 1, 2, 3, 4, 5], fps: 7,  loop: true },
    idleBack: { row: 4, frames: [0, 1, 2, 3, 4, 5], fps: 6, loop: true },
    moveBack: { row: 5, frames: [0, 1, 2, 3, 4, 5], fps: 10, loop: true },
    attack: { row: 2, frames: [0, 1, 2, 3, 4, 5], fps: 10, loop: false, impact: 3 },
    hit:    { row: 3, frames: [0, 1],             fps: 10, loop: false },
    die:    { row: 3, frames: [2, 3, 4, 5],       fps: 8,  loop: false },
  } },
};
const EQUIPMENT = ['sword', 'axe', 'spear', 'staff', 'helm', 'armor', 'cloak', 'shield', 'potion', 'backpack', 'map', 'soul-shard'];

async function load(file) {
  const { data, info } = await sharp(`${SRC}/${file}`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, W: info.width, H: info.height };
}

// 8-connected components over alpha >= ALPHA. Returns label map + component stats.
function components({ data, W, H }) {
  const label = new Int32Array(W * H).fill(-1), parts = [];
  for (let i = 0; i < W * H; i++) {
    if (data[i * 4 + 3] < ALPHA || label[i] >= 0) continue;
    const c = { id: parts.length, n: 0, x0: W, y0: H, x1: -1, y1: -1, sx: 0, sy: 0 }, stack = [i];
    label[i] = c.id;
    while (stack.length) {
      const p = stack.pop(), x = p % W, y = (p - x) / W;
      c.n++; c.sx += x; c.sy += y;
      c.x0 = Math.min(c.x0, x); c.x1 = Math.max(c.x1, x); c.y0 = Math.min(c.y0, y); c.y1 = Math.max(c.y1, y);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy, q = ny * W + nx;
        if (nx >= 0 && ny >= 0 && nx < W && ny < H && label[q] < 0 && data[q * 4 + 3] >= ALPHA) { label[q] = c.id; stack.push(q); }
      }
    }
    c.cx = c.sx / c.n; c.cy = c.sy / c.n; parts.push(c);
  }
  return { label, parts };
}

// Groups big components into rows (by centroid y gaps) and columns (by x order). Fails loudly on a mismatch.
function figures(img, rows, cols, name) {
  const { label, parts } = components(img);
  // Reviewed hero-v2 attack 4 sword touches attack 5 cape. Separate that single
  // joined component by geodesic distance to the two torso seeds, preserving pixels.
  if (name === 'hero' && parts.filter(c => c.n >= MIN_PART).length === 35) {
    const joined = parts.find(c => c.x1 - c.x0 > 400 && c.y0 > 400 && c.y0 < 500);
    if (!joined) throw Error('hero-v2: unrecognized joined figures');
    const ids = [joined.id, parts.length], queue = [], owner = new Int8Array(label.length).fill(-1);
    for (const [k, [sx, sy]] of [[720, 500], [950, 500]].entries()) {
      let seed = -1, best = Infinity;
      for (let y = joined.y0; y <= joined.y1; y++) for (let x = joined.x0; x <= joined.x1; x++) {
        const p = y * img.W + x, d = (x - sx)**2 + (y - sy)**2;
        if (label[p] === joined.id && d < best) { seed = p; best = d; }
      }
      owner[seed] = k; queue.push(seed);
    }
    for (let i = 0; i < queue.length; i++) {
      const p = queue[i], x = p % img.W, y = (p - x) / img.W;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const q = (y + dy) * img.W + x + dx;
        if (x + dx >= 0 && x + dx < img.W && label[q] === joined.id && owner[q] < 0) { owner[q] = owner[p]; queue.push(q); }
      }
    }
    const split = ids.map(id => ({id,n:0,x0:img.W,y0:img.H,x1:-1,y1:-1,sx:0,sy:0}));
    for (const p of queue) {
      const c = split[owner[p]], x = p % img.W, y = (p - x) / img.W;
      label[p] = c.id; c.n++; c.sx += x; c.sy += y;
      c.x0 = Math.min(c.x0,x); c.x1 = Math.max(c.x1,x); c.y0 = Math.min(c.y0,y); c.y1 = Math.max(c.y1,y);
    }
    for (const c of split) { c.cx = c.sx/c.n; c.cy = c.sy/c.n; }
    parts[joined.id] = split[0]; parts.push(split[1]);
  }
  const big = parts.filter(c => c.n >= MIN_PART), specks = parts.filter(c => c.n < MIN_PART);
  if (big.length !== rows * cols) throw Error(`${name}: expected ${rows * cols} figures, found ${big.length}`);
  big.sort((a, b) => a.cy - b.cy);
  const grid = [];
  for (let r = 0; r < rows; r++) grid.push(big.slice(r * cols, (r + 1) * cols).sort((a, b) => a.cx - b.cx));
  for (let r = 1; r < rows; r++) {
    const prevMax = Math.max(...grid[r - 1].map(c => c.cy)), min = Math.min(...grid[r].map(c => c.cy));
    if (min - prevMax < 40) throw Error(`${name}: rows ${r - 1}/${r} not separable by centroid`);
  }
  const owned = new Map(big.map(c => [c.id, [c.id]]));
  let dropped = 0;
  for (const s of specks) {
    const host = big.find(c => s.x0 >= c.x0 - 3 && s.x1 <= c.x1 + 3 && s.y0 >= c.y0 - 3 && s.y1 <= c.y1 + 3);
    if (host) owned.get(host.id).push(s.id); else dropped += s.n;
  }
  return { label, grid, owned, specks: specks.length, droppedPx: dropped };
}

// Copies only the pixels of the given components (never a rectangle of the sheet), so neighbours cannot leak.
function isolate(img, label, ids, c) {
  const set = new Set(ids), w = c.x1 - c.x0 + 1, h = c.y1 - c.y0 + 1, out = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const s = (y + c.y0) * img.W + x + c.x0;
    if (!set.has(label[s])) continue;
    img.data.copy(out, (y * w + x) * 4, s * 4, s * 4 + 4);
  }
  return { data: out, w, h, x0: c.x0, y0: c.y0 };
}

const maskOf = f => { const m = new Uint8Array(f.w * f.h); for (let i = 0; i < m.length; i++) m[i] = f.data[i * 4 + 3] >= ALPHA ? 1 : 0; return m; };

// Ground contact: lowest row whose opaque run is wider than a blade tip (ignores swords/axes poking below feet).
function groundY(f, m) {
  for (let y = f.h - 1; y >= 0; y--) { let n = 0; for (let x = 0; x < f.w; x++) n += m[y * f.w + x]; if (n >= 10) return y; }
  return f.h - 1;
}
// Horizontal centre of the feet band (bottom 14% of the figure, width-weighted).
function feetX(f, m, gy) {
  let s = 0, n = 0; const top = Math.max(0, gy - Math.round(f.h * 0.14));
  for (let y = top; y <= gy; y++) for (let x = 0; x < f.w; x++) if (m[y * f.w + x]) { s += x; n++; }
  return s / n;
}
// Horizontal anchor for `f` (frame-local px) that best overlays it on `base` when both sit on their ground rows:
// searches around the feet centre and keeps the shift with maximum alpha-mask IoU.
function registerX(base, f) {
  let best = { ax: f.fx, iou: -1 };
  const u0 = -Math.max(base.ax, f.w), u1 = Math.max(base.w - base.ax, f.w), v0 = -Math.max(base.gy, f.gy);
  for (let dx = -60; dx <= 60; dx++) {
    const ax = Math.round(f.fx) + dx; let inter = 0, uni = 0;
    for (let v = v0; v <= 0; v += 2) for (let u = u0; u < u1; u += 2) {
      const bx = Math.round(base.ax) + u, by = base.gy + v, fx = ax + u, fy = f.gy + v;
      const a = by >= 0 && bx >= 0 && bx < base.w && base.m[by * base.w + bx], b = fy >= 0 && fx >= 0 && fx < f.w && f.m[fy * f.w + fx];
      if (a && b) inter++; if (a || b) uni++;
    }
    if (inter / uni > best.iou) best = { ax, iou: inter / uni };
  }
  return best;
}

async function character(id, spec) {
  const img = await load(spec.file);
  const { label, grid, owned, specks, droppedPx } = figures(img, spec.rows, spec.cols, id);
  const frames = grid.map((row, r) => row.map((c, col) => {
    const f = isolate(img, label, owned.get(c.id), c); f.m = maskOf(f); f.gy = groundY(f, f.m); f.fx = feetX(f, f.m, f.gy);
    f.r = r; f.c = col; return f;
  }));
  // Use the reviewed upright locomotion sheet instead of the original repeated lunge poses.
  const locomotion = await load('locomotion-v2.png');
  const gait = figures(locomotion, 4, 6, 'locomotion');
  const gaitRows = id === 'hero' ? [0, 1] : [2, 3];
  const referenceHeight = frames[0][0].h;
  const sourceHeight = gait.grid[gaitRows[0]].reduce((sum, c) => sum + c.y1 - c.y0 + 1, 0) / 6;
  const ratio = referenceHeight / sourceHeight;
  for (const [dir, row] of gaitRows.entries()) {
    const targetRow = dir === 0 ? 1 : 5;
    frames[targetRow] = await Promise.all(gait.grid[row].map(async (c, col) => {
      const raw = isolate(locomotion, gait.label, gait.owned.get(c.id), c);
      const { data, info } = await sharp(raw.data, {raw:{width:raw.w,height:raw.h,channels:4}})
        .resize(Math.round(raw.w * ratio), Math.round(raw.h * ratio)).raw().toBuffer({resolveWithObject:true});
      const f = {...raw, data, w:info.width, h:info.height, r:targetRow, c:col, source:'locomotion-v2.png', sourceW:raw.w, sourceH:raw.h, sourceRatio:ratio};
      f.m = maskOf(f); f.gy = groundY(f, f.m); f.fx = feetX(f, f.m, f.gy);
      return f;
    }));
    // Keep the head at a steady height; never re-seat each lifted boot onto the ground.
    const headToGround = frames[targetRow].reduce((n, f) => n + f.gy, 0) / 6;
    for (const f of frames[targetRow]) f.gy = Math.round(headToGround);
  }
  // Anchor = point in frame-local px that sits on the world ground pivot.
  // Reference: idle frame 0 at its feet centre. Loops register to their clip's first frame; one-shots chain
  // frame-to-frame; every clip's first frame registers to the previous clip head so all states share one pivot.
  const ref = frames[0][0]; ref.ax = ref.fx; ref.ay = ref.gy;
  const anchorFrom = (base, f) => { const { ax, iou } = registerX(base, f); f.ax = ax; f.ay = f.gy; f.iou = iou; };
  const clips = {};
  for (const [name, clip] of Object.entries(spec.clips)) {
    const list = clip.frames.map(i => frames[clip.row][i]);
    if (list[0].ax === undefined) anchorFrom(name === 'die' ? frames[3][1] : ref, list[0]);
    for (let i = 1; i < list.length; i++) if (list[i].ax === undefined) anchorFrom(clip.loop ? list[0] : list[i - 1], list[i]);
    clips[name] = { ...clip, list };
  }
  // Shared canvas so the pivot is the same pixel in every cell.
  const all = frames.flat();
  const left = Math.ceil(Math.max(...all.map(f => f.ax))) + 8, right = Math.ceil(Math.max(...all.map(f => f.w - f.ax))) + 8;
  const up = Math.ceil(Math.max(...all.map(f => f.ay))) + 8, down = Math.ceil(Math.max(...all.map(f => f.h - f.ay))) + 8;
  const cw = Math.ceil((left + right) * SCALE), ch = Math.ceil((up + down) * SCALE);
  const cell = { w: cw, h: ch, pivot: { x: Math.round(left * SCALE), y: Math.round(up * SCALE) } };
  const cols = spec.cols, atlasW = cols * (cw + GUTTER) + GUTTER, atlasH = spec.rows * (ch + GUTTER) + GUTTER;
  const composites = [], meta = [];
  for (const f of all) {
    // Sub-pixel anchor is honoured by placing the source at a fractional offset before the downscale.
    const canvasW = left + right, canvasH = up + down, ox = left - f.ax, oy = up - f.ay;
    const ix = Math.round(ox), iy = Math.round(oy);
    const big = await sharp({ create: { width: canvasW, height: canvasH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite([{ input: f.data, raw: { width: f.w, height: f.h, channels: 4 }, left: ix, top: iy }]).png().toBuffer();
    const small = await sharp(big).resize(cw, ch, { kernel: 'lanczos3' }).raw().toBuffer();
    for (let i = 0; i < small.length; i += 4) if (small[i + 3] < ALPHA) small.fill(0, i, i + 4); // no coloured fringe
    const x = GUTTER + f.c * (cw + GUTTER), y = GUTTER + f.r * (ch + GUTTER);
    composites.push({ input: small, raw: { width: cw, height: ch, channels: 4 }, left: x, top: y });
    let border = 0; for (let k = 0; k < cw; k++) border += small[k * 4 + 3] + small[((ch - 1) * cw + k) * 4 + 3];
    for (let k = 0; k < ch; k++) border += small[(k * cw) * 4 + 3] + small[(k * cw + cw - 1) * 4 + 3];
    if (border) throw Error(`${id} r${f.r}c${f.c}: opaque pixels touch the cell border`);
    meta.push({ row: f.r, col: f.c, x, y, w: cw, h: ch, source: { file: f.source || spec.file, x: f.x0, y: f.y0, w: f.sourceW || f.w, h: f.sourceH || f.h },
      anchorSourcePx: [+(f.x0 + f.ax / (f.sourceRatio || 1)).toFixed(1), +(f.y0 + f.ay / (f.sourceRatio || 1)).toFixed(1)], roundingPx: +(ix - ox).toFixed(2), registrationIoU: f.iou === undefined ? 1 : +f.iou.toFixed(3) });
  }
  await sharp({ create: { width: atlasW, height: atlasH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(composites).png({ compressionLevel: 9 }).toFile(`${OUT}/${id}.png`);
  return {
    id, image: `${id}.png`, source: spec.file, sourceSize: [img.W, img.H], atlasSize: [atlasW, atlasH], scale: SCALE, gutter: GUTTER, cell,
    direction: 'front/back idle and locomotion; horizontal mirror for left/right; attacks/hit/death currently front-facing',
    idleHeightSourcePx: ref.gy + 1, specks, droppedSpeckPx: droppedPx,
    clips: Object.fromEntries(Object.entries(clips).map(([n, c]) => [n, { fps: c.fps, loop: c.loop, impact: c.impact,
      frames: c.list.map(f => meta.findIndex(m => m.row === f.r && m.col === f.c)) }])),
    frames: meta,
  };
}

async function equipment() {
  const img = await load('equipment-v1.png');
  const { label, grid, owned, specks, droppedPx } = figures(img, 3, 4, 'equipment');
  const items = [], composites = [], SIZE = 128, PAD = 8;
  const w = 4 * (SIZE + GUTTER) + GUTTER, h = 3 * (SIZE + GUTTER) + GUTTER;
  for (const [r, row] of grid.entries()) for (const [c, comp] of row.entries()) {
    const f = isolate(img, label, owned.get(comp.id), comp);
    const fit = await sharp(f.data, { raw: { width: f.w, height: f.h, channels: 4 } })
      .resize(SIZE - PAD * 2, SIZE - PAD * 2, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 }, kernel: 'lanczos3' })
      .extend({ top: PAD, bottom: PAD, left: PAD, right: PAD, background: { r: 0, g: 0, b: 0, alpha: 0 } }).raw().toBuffer();
    for (let i = 0; i < fit.length; i += 4) if (fit[i + 3] < ALPHA) fit.fill(0, i, i + 4);
    const x = GUTTER + c * (SIZE + GUTTER), y = GUTTER + r * (SIZE + GUTTER);
    composites.push({ input: fit, raw: { width: SIZE, height: SIZE, channels: 4 }, left: x, top: y });
    items.push({ id: EQUIPMENT[r * 4 + c], x, y, w: SIZE, h: SIZE, source: { x: f.x0, y: f.y0, w: f.w, h: f.h } });
  }
  await sharp({ create: { width: w, height: h, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(composites).png({ compressionLevel: 9 }).toFile(`${OUT}/equipment.png`);
  return { image: 'equipment.png', source: 'equipment-v1.png', sourceSize: [img.W, img.H], atlasSize: [w, h], icon: SIZE, gutter: GUTTER, specks, droppedSpeckPx: droppedPx, items };
}

await fs.mkdir(OUT, { recursive: true });
const manifest = { generatedBy: 'scripts/extract-characters.mjs', alphaThreshold: ALPHA, characters: {}, equipment: await equipment() };
for (const [id, spec] of Object.entries(CHARACTERS)) manifest.characters[id] = await character(id, spec);
await fs.writeFile(`${OUT}/manifest.json`, JSON.stringify(manifest, null, 1));
for (const c of Object.values(manifest.characters)) console.log(c.id, 'cell', c.cell, 'atlas', c.atlasSize, 'min IoU', Math.min(...c.frames.map(f => f.registrationIoU)));
console.log('equipment', manifest.equipment.items.map(i => i.id).join(','));
