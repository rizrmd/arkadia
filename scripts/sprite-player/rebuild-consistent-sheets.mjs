// Rebuilds all 8 Rift Runner and Ember Warden sprite sheets (idle, hurt, death, run)
// in assets-src/sprite-player/ storing ONLY 1 side (the 5 canonical rows: N, NE, E, SE, S = 3072x1920, 40 cells).
// Left-facing directions (SW, W, NW) are mirrored at runtime from (SE, E, NE) in both the Sprite Player and the game,
// saving 37.5% storage space and guaranteeing 100% identical size between E<->W, NE<->NW, and SE<->SW.
import path from 'node:path';
import { createHash } from 'node:crypto';
import sharp from 'sharp';

sharp.concurrency(1);
sharp.cache(false);

const CELL = 384;
const COLS = 8;
const CANON_DIRS = ['N', 'NE', 'E', 'SE', 'S'];
const ROWS = CANON_DIRS.length; // 5 stored rows (1 side only!)
const SHEET_W = CELL * COLS; // 3072
const SHEET_H = CELL * ROWS; // 1920
const PIVOT = { x: 192, y: 360 };

const IDLE_SRC_ROOT = '/home/dev/projects/arkadia-idle-preview/public/elegant-idle/sources';
const ACT_V2_ROOT = '/home/dev/projects/arkadia/worktrees/elegant-actions/public/elegant-actions/v2/sources';
const OUT_DIR = 'assets-src/sprite-player';

function smoothstep(edge0, edge1, x) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

// Mirror a raw panel horizontally before placement (used when sourcing Hurt SE from clean 2x4 Hurt SW)
function mirrorPanelHorizontal(panel) {
  const { data, width: w, height: h } = panel;
  const out = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const sx = w - 1 - x;
      const si = (y * w + sx) * 4;
      const di = (y * w + x) * 4;
      out[di] = data[si];
      out[di + 1] = data[si + 1];
      out[di + 2] = data[si + 2];
      out[di + 3] = data[si + 3];
    }
  }
  return finalizeFigurePanel(out, w, h);
}

// Bilinear sampling from an RGBA buffer (width x height) with premultiplied alpha
function sampleBilinear(buf, w, h, fx, fy) {
  if (fx < 0 || fy < 0 || fx >= w - 1 || fy >= h - 1) {
    const ix = Math.round(fx), iy = Math.round(fy);
    if (ix < 0 || iy < 0 || ix >= w || iy >= h) return [0, 0, 0, 0];
    const idx = (iy * w + ix) * 4;
    return [buf[idx], buf[idx + 1], buf[idx + 2], buf[idx + 3]];
  }
  const x0 = Math.floor(fx), y0 = Math.floor(fy);
  const x1 = x0 + 1, y1 = y0 + 1;
  const dx = fx - x0, dy = fy - y0;
  const w00 = (1 - dx) * (1 - dy);
  const w10 = dx * (1 - dy);
  const w01 = (1 - dx) * dy;
  const w11 = dx * dy;

  const i00 = (y0 * w + x0) * 4;
  const i10 = (y0 * w + x1) * 4;
  const i01 = (y1 * w + x0) * 4;
  const i11 = (y1 * w + x1) * 4;

  const a00 = buf[i00 + 3], a10 = buf[i10 + 3], a01 = buf[i01 + 3], a11 = buf[i11 + 3];
  const a = w00 * a00 + w10 * a10 + w01 * a01 + w11 * a11;
  if (a < 8) return [0, 0, 0, 0];

  const aw00 = w00 * a00, aw10 = w10 * a10, aw01 = w01 * a01, aw11 = w11 * a11;
  const invA = 1 / a;
  const r = (aw00 * buf[i00] + aw10 * buf[i10] + aw01 * buf[i01] + aw11 * buf[i11]) * invA;
  const g = (aw00 * buf[i00 + 1] + aw10 * buf[i10 + 1] + aw01 * buf[i01 + 1] + aw11 * buf[i11 + 1]) * invA;
  const b = (aw00 * buf[i00 + 2] + aw10 * buf[i10 + 2] + aw01 * buf[i01 + 2] + aw11 * buf[i11 + 2]) * invA;
  return [Math.round(r), Math.round(g), Math.round(b), Math.round(a)];
}

// Compute tight alpha bounds and horizontal core median of a figure panel
function finalizeFigurePanel(rawBuf, fw, fh) {
  let minx = fw, miny = fh, maxx = 0, maxy = 0;
  for (let y = 0; y < fh; y++) {
    for (let x = 0; x < fw; x++) {
      const a = rawBuf[(y * fw + x) * 4 + 3];
      if (a > 20) {
        if (x < minx) minx = x;
        if (x > maxx) maxx = x;
        if (y < miny) miny = y;
        if (y > maxy) maxy = y;
      }
    }
  }
  const width = Math.max(1, maxx - minx + 1);
  const height = Math.max(1, maxy - miny + 1);
  const crop = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const si = ((miny + y) * fw + (minx + x)) * 4;
      const di = (y * width + x) * 4;
      const a = rawBuf[si + 3];
      if (a >= 8) {
        crop[di] = rawBuf[si];
        crop[di + 1] = rawBuf[si + 1];
        crop[di + 2] = rawBuf[si + 2];
        crop[di + 3] = a;
      }
    }
  }

  // Alpha-weighted horizontal median X across the torso+pelvis band (18%..72% height)
  const yStart = Math.floor(height * 0.18);
  const yEnd = Math.max(yStart + 1, Math.floor(height * 0.72));
  const colWeights = new Float64Array(width);
  let totalWeight = 0;
  for (let y = yStart; y < yEnd; y++) {
    for (let x = 0; x < width; x++) {
      const a = crop[(y * width + x) * 4 + 3];
      if (a > 64) {
        colWeights[x] += a;
        totalWeight += a;
      }
    }
  }
  let coreX = width / 2;
  if (totalWeight > 0) {
    let acc = 0;
    for (let x = 0; x < width; x++) {
      acc += colWeights[x];
      if (acc >= totalWeight * 0.5) {
        coreX = x;
        break;
      }
    }
  }

  return {
    data: crop,
    width,
    height,
    coreX
  };
}

// Connected-component figure extractor across the full source sheet
async function extractFiguresFullSheet(filePath, columns = 2, rows = 4) {
  const { data, info } = await sharp(filePath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const seen = new Uint8Array(w * h);
  const components = [];

  for (let seed = 0; seed < w * h; seed++) {
    if (seen[seed] || data[seed * 4 + 3] <= 16) continue;
    const queue = [seed];
    seen[seed] = 1;
    let l = w, t = h, r = 0, b = 0;
    for (let q = 0; q < queue.length; q++) {
      const n = queue[q], x = n % w, y = Math.floor(n / w);
      if (x < l) l = x;
      if (x > r) r = x;
      if (y < t) t = y;
      if (y > b) b = y;
      const neighbors = [
        x > 0 ? n - 1 : -1,
        x < w - 1 ? n + 1 : -1,
        y > 0 ? n - w : -1,
        y < h - 1 ? n + w : -1
      ];
      for (const nn of neighbors) {
        if (nn >= 0 && !seen[nn] && data[nn * 4 + 3] > 16) {
          seen[nn] = 1;
          queue.push(nn);
        }
      }
    }
    if (queue.length > 500) {
      components.push({ pixels: queue, l, t, r, b, area: queue.length });
    }
  }

  const selected = components.sort((a, b) => b.area - a.area).slice(0, columns * rows);
  if (selected.length !== columns * rows) {
    throw new Error(`Expected ${columns * rows} figures in ${filePath}, got ${selected.length}`);
  }
  selected.sort((a, b) => (a.t + a.b) - (b.t + b.b));
  const sorted = [];
  for (let row = 0; row < rows; row++) {
    sorted.push(...selected.slice(row * columns, (row + 1) * columns).sort((a, b) => (a.l + a.r) - (b.l + b.r)));
  }

  const panels = [];
  for (const c of sorted) {
    const l = Math.max(0, c.l - 3);
    const t = Math.max(0, c.t - 3);
    const r = Math.min(w - 1, c.r + 3);
    const b = Math.min(h - 1, c.b + 3);
    const fw = r - l + 1, fh = b - t + 1;
    const keep = new Uint8Array(fw * fh);
    const frame = Buffer.alloc(fw * fh * 4);

    for (const n of c.pixels) {
      const x = (n % w) - l, y = Math.floor(n / w) - t;
      for (let yy = Math.max(0, y - 2); yy <= Math.min(fh - 1, y + 2); yy++) {
        for (let xx = Math.max(0, x - 2); xx <= Math.min(fw - 1, x + 2); xx++) {
          keep[yy * fw + xx] = 1;
        }
      }
    }
    for (let y = 0; y < fh; y++) {
      for (let x = 0; x < fw; x++) {
        if (keep[y * fw + x]) {
          const si = ((y + t) * w + (x + l)) * 4;
          const di = (y * fw + x) * 4;
          frame[di] = data[si];
          frame[di + 1] = data[si + 1];
          frame[di + 2] = data[si + 2];
          frame[di + 3] = data[si + 3];
        }
      }
    }
    panels.push(finalizeFigurePanel(frame, fw, fh));
  }
  return panels;
}

// Extract grid panels for Idle (4x2 grid)
async function extractIdlePanels(filePath) {
  const { data, info } = await sharp(filePath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const panels = [];
  for (let f = 0; f < 8; f++) {
    const col = f % 4, row = Math.floor(f / 4);
    const left = Math.round((col * info.width) / 4);
    const top = Math.round((row * info.height) / 2);
    const right = Math.round(((col + 1) * info.width) / 4);
    const bottom = Math.round(((row + 1) * info.height) / 2);
    const cw = right - left, ch = bottom - top;
    const crop = await sharp(data, { raw: info }).extract({ left, top, width: cw, height: ch }).raw().toBuffer();

    const seen = new Uint8Array(cw * ch);
    let largest = [];
    for (let seed = 0; seed < cw * ch; seed++) {
      if (seen[seed] || crop[seed * 4 + 3] <= 16) continue;
      const queue = [seed];
      seen[seed] = 1;
      for (let q = 0; q < queue.length; q++) {
        const n = queue[q], x = n % cw, y = Math.floor(n / cw);
        for (const nn of [x > 0 ? n - 1 : -1, x < cw - 1 ? n + 1 : -1, y > 0 ? n - cw : -1, y < ch - 1 ? n + cw : -1]) {
          if (nn >= 0 && !seen[nn] && crop[nn * 4 + 3] > 16) {
            seen[nn] = 1;
            queue.push(nn);
          }
        }
      }
      if (queue.length > largest.length) largest = queue;
    }
    const keep = new Uint8Array(cw * ch);
    for (const n of largest) {
      const x = n % cw, y = Math.floor(n / cw);
      for (let yy = Math.max(0, y - 2); yy <= Math.min(ch - 1, y + 2); yy++) {
        for (let xx = Math.max(0, x - 2); xx <= Math.min(cw - 1, x + 2); xx++) {
          keep[yy * cw + xx] = 1;
        }
      }
    }
    for (let n = 0; n < keep.length; n++) {
      if (!keep[n]) crop[n * 4 + 3] = 0;
    }
    panels.push(finalizeFigurePanel(crop, cw, ch));
  }
  return panels;
}

// Compute uniform aspect-ratio-preserving dimensions at the exact target height
function uniformDims(panel, targetH, maxW = 336) {
  const h = Math.round(targetH);
  const w = Math.min(maxW, Math.max(1, Math.round(panel.width * (h / panel.height))));
  return { targetW: w, targetH: h };
}

// Render a normalized figure into a 384x384 cell with given targetW, targetH, targetCoreX, and vertical anchor
async function placeInCell(panel, targetW, targetH, targetCoreX, { bottomY = 359, topY = null, anchorMode = 'core' } = {}) {
  const w = Math.max(1, Math.round(targetW));
  const h = Math.max(1, Math.round(targetH));
  const scaled = await sharp(panel.data, { raw: { width: panel.width, height: panel.height, channels: 4 } })
    .resize(w, h, { fit: 'fill', kernel: 'lanczos3' })
    .raw()
    .toBuffer();

  const scaledCoreX = (panel.coreX / panel.width) * w;
  const bboxCenterX = w / 2;
  const refX = anchorMode === 'bbox' ? bboxCenterX : anchorMode === 'blend' ? 0.5 * scaledCoreX + 0.5 * bboxCenterX : scaledCoreX;

  let left = Math.round(targetCoreX - refX);
  let top = topY !== null ? Math.round(topY) : Math.round(bottomY - h + 1);

  const MARGIN = 12;
  if (left < MARGIN) left = MARGIN;
  if (left + w > CELL - MARGIN) left = CELL - MARGIN - w;
  if (top < MARGIN) top = MARGIN;
  if (top + h > CELL - 8) top = CELL - 8 - h;

  const cell = Buffer.alloc(CELL * CELL * 4);
  for (let y = 0; y < h; y++) {
    const cy = top + y;
    if (cy < 0 || cy >= CELL) continue;
    for (let x = 0; x < w; x++) {
      const cx = left + x;
      if (cx < 0 || cx >= CELL) continue;
      const si = (y * w + x) * 4;
      const a = scaled[si + 3];
      if (a < 8) continue;
      const di = (cy * CELL + cx) * 4;
      cell[di] = scaled[si];
      cell[di + 1] = scaled[si + 1];
      cell[di + 2] = scaled[si + 2];
      cell[di + 3] = a;
    }
  }
  return { cell, left, top, width: w, height: h };
}

function measureCell(cell) {
  let minx = CELL, miny = CELL, maxx = 0, maxy = 0, area = 0;
  const colWeights = new Float64Array(CELL);
  let totalWeight = 0;
  for (let y = 0; y < CELL; y++) {
    for (let x = 0; x < CELL; x++) {
      const a = cell[(y * CELL + x) * 4 + 3];
      if (a > 20) {
        if (x < minx) minx = x;
        if (x > maxx) maxx = x;
        if (y < miny) miny = y;
        if (y > maxy) maxy = y;
      }
      if (a > 64) area++;
    }
  }
  const h = Math.max(1, maxy - miny + 1);
  const y0 = miny + Math.floor(h * 0.18);
  const y1 = miny + Math.floor(h * 0.72);
  for (let y = y0; y <= y1; y++) {
    for (let x = minx; x <= maxx; x++) {
      const a = cell[(y * CELL + x) * 4 + 3];
      if (a > 64) {
        colWeights[x] += a;
        totalWeight += a;
      }
    }
  }
  let coreX = (minx + maxx) / 2;
  if (totalWeight > 0) {
    let acc = 0;
    for (let x = 0; x < CELL; x++) {
      acc += colWeights[x];
      if (acc >= totalWeight * 0.5) { coreX = x; break; }
    }
  }
  return { minx, miny, maxx, maxy, width: maxx - minx + 1, height: h, coreX, area };
}

function warpCellToEnvelope(srcCell, srcMeta, dstMeta) {
  const out = Buffer.alloc(CELL * CELL * 4);
  for (let y = dstMeta.miny; y <= dstMeta.maxy; y++) {
    const v = (y - dstMeta.miny) / Math.max(1, dstMeta.height - 1);
    const sy = srcMeta.miny + v * (srcMeta.height - 1);
    const scaleX = dstMeta.width / Math.max(1, srcMeta.width);
    for (let x = 10; x < CELL - 10; x++) {
      const sx = srcMeta.coreX + (x - dstMeta.coreX) / scaleX;
      const [r, g, b, a] = sampleBilinear(srcCell, CELL, CELL, sx, sy);
      if (a >= 8) {
        const idx = (y * CELL + x) * 4;
        out[idx] = r;
        out[idx + 1] = g;
        out[idx + 2] = b;
        out[idx + 3] = a;
      }
    }
  }
  return out;
}

// Ghost-free interior shading smoother
function harmonizeInteriorShading(cells, { loop = false, blendWeight = 0.14 } = {}) {
  const metas = cells.map(measureCell);
  const n = cells.length;
  return cells.map((cell, f) => {
    const prevIdx = loop ? (f + n - 1) % n : Math.max(0, f - 1);
    const nextIdx = loop ? (f + 1) % n : Math.min(n - 1, f + 1);
    const prevWarped = prevIdx !== f ? warpCellToEnvelope(cells[prevIdx], metas[prevIdx], metas[f]) : null;
    const nextWarped = nextIdx !== f ? warpCellToEnvelope(cells[nextIdx], metas[nextIdx], metas[f]) : null;

    const out = Buffer.from(cell);
    for (let i = 0; i < CELL * CELL * 4; i += 4) {
      const a0 = cell[i + 3];
      if (a0 < 96) continue;

      const aP = prevWarped ? prevWarped[i + 3] : 0;
      const aN = nextWarped ? nextWarped[i + 3] : 0;
      const wP = aP > 140 ? blendWeight : 0;
      const wN = aN > 140 ? blendWeight : 0;
      if (wP === 0 && wN === 0) continue;

      const w0 = 1 - wP - wN;
      out[i] = Math.round(w0 * cell[i] + (prevWarped ? wP * prevWarped[i] : 0) + (nextWarped ? wN * nextWarped[i] : 0));
      out[i + 1] = Math.round(w0 * cell[i + 1] + (prevWarped ? wP * prevWarped[i + 1] : 0) + (nextWarped ? wN * nextWarped[i + 1] : 0));
      out[i + 2] = Math.round(w0 * cell[i + 2] + (prevWarped ? wP * prevWarped[i + 2] : 0) + (nextWarped ? wN * nextWarped[i + 2] : 0));
      out[i + 3] = a0;
    }
    return out;
  });
}

// 1. IDLE: Build the 5 canonical rows [N, NE, E, SE, S] at uniform standing height 328px
async function buildAllIdleRows(heroKey) {
  const canonRows = [];
  for (let d = 0; d < ROWS; d++) {
    const dir = CANON_DIRS[d];
    const srcPath = path.join(IDLE_SRC_ROOT, `${heroKey}-${dir}-clean.png`);
    const panels = await extractIdlePanels(srcPath);
    const aspects = panels.map(p => p.width / p.height).sort((a, b) => a - b);
    const medAspect = aspects[4];
    let bestIdx = 0, bestDiff = Infinity;
    for (let i = 0; i < panels.length; i++) {
      const diff = Math.abs(panels[i].width / panels[i].height - medAspect);
      if (diff < bestDiff) { bestDiff = diff; bestIdx = i; }
    }
    const panel = panels[bestIdx];
    const { targetW, targetH } = uniformDims(panel, 328, 260);
    const { cell: baseCell } = await placeInCell(panel, targetW, targetH, PIVOT.x, { bottomY: 359, anchorMode: 'core' });
    const dirSign = ['E', 'NE', 'SE'].includes(dir) ? 1 : 0;
    const cells = [];

    for (let f = 0; f < 8; f++) {
      const theta = (2 * Math.PI * f) / 8;
      const sinT = Math.sin(theta);
      const cosT = Math.cos(theta);
      const out = Buffer.alloc(CELL * CELL * 4);

      for (let y = 12; y < CELL - 8; y++) {
        const u = Math.max(0, Math.min(1.1, (359 - y) / targetH));
        const bodyLiftMask = smoothstep(0.16, 0.72, u);
        const swayMask = smoothstep(0.20, 0.85, u);
        const chestBell = Math.exp(-Math.pow((u - 0.60) / 0.18, 2));

        for (let x = 12; x < CELL - 12; x++) {
          const dxCenter = x - PIVOT.x;
          const absDx = Math.abs(dxCenter);

          const dyBreath = -2.0 * bodyLiftMask * sinT;
          const dxBreath = dxCenter * 0.014 * chestBell * sinT;
          const dxSway = 1.4 * swayMask * cosT;

          const clothMask = smoothstep(14, 52, absDx) * smoothstep(0.14, 0.34, u) * (1 - 0.65 * smoothstep(0.84, 0.98, u));
          const phaseLag = 0.035 * absDx + 0.020 * Math.max(0, y - 110);
          const dxWave = clothMask * (4.6 * Math.sin(theta - phaseLag) + 1.2 * dirSign * cosT);
          const dyWave = clothMask * (3.0 * Math.cos(theta - phaseLag));

          const sx = x - (dxBreath + dxSway + dxWave);
          const sy = y - (dyBreath + dyWave);

          const [r0, g0, b0, a0] = sampleBilinear(baseCell, CELL, CELL, sx, sy);
          if (a0 < 8) continue;

          const glowMod = 1 + 0.02 * Math.sin(theta + u * 2.0);
          const idx = (y * CELL + x) * 4;
          out[idx] = Math.min(255, Math.round(r0 * glowMod));
          out[idx + 1] = Math.min(255, Math.round(g0 * glowMod));
          out[idx + 2] = Math.min(255, Math.round(b0 * glowMod));
          out[idx + 3] = a0;
        }
      }
      cells.push(out);
    }
    canonRows.push(cells);
  }
  return canonRows;
}

// 2. HURT: Build the 5 canonical rows [N, NE, E, SE (from mirrored SW clean 2x4), S]
async function buildAllHurtRows(heroKey) {
  const H_HURT = [328, 314, 297, 280, 284, 300, 316, 328];
  const canonRows = [];

  for (let d = 0; d < ROWS; d++) {
    const dir = CANON_DIRS[d];
    let panels;
    if (dir === 'SE') {
      const swPath = path.join(ACT_V2_ROOT, `${heroKey}-hurt-SW.png`);
      const swPanels = await extractFiguresFullSheet(swPath, 2, 4);
      panels = swPanels.map(mirrorPanelHorizontal);
    } else {
      const srcPath = path.join(ACT_V2_ROOT, `${heroKey}-hurt-${dir}.png`);
      panels = await extractFiguresFullSheet(srcPath, 2, 4);
    }

    const recoilSign = ['E', 'NE', 'SE'].includes(dir) ? -1 : 0;
    const rawCells = [];
    for (let f = 0; f < 8; f++) {
      const recoilX = PIVOT.x + [0, 3, 5, 6, 5, 3, 1, 0][f] * recoilSign;
      const { targetW, targetH } = uniformDims(panels[f], H_HURT[f], 310);
      const { cell } = await placeInCell(panels[f], targetW, targetH, recoilX, { bottomY: 359, anchorMode: 'core' });
      rawCells.push(cell);
    }
    canonRows.push(harmonizeInteriorShading(rawCells, { loop: false, blendWeight: 0.14 }));
  }
  return canonRows;
}

// 3. DEATH: Build the 5 canonical rows [N, NE, E, SE, S] with monotonic collapse curve
async function buildAllDeathRows(heroKey) {
  const H_DEATH_LAT = [328, 278, 232, 192, 158, 132, 126, 122];
  const H_DEATH_FORE = [328, 280, 238, 202, 174, 152, 146, 142];
  const canonRows = [];

  for (let d = 0; d < ROWS; d++) {
    const dir = CANON_DIRS[d];
    const srcPath = path.join(ACT_V2_ROOT, `${heroKey}-death-${dir}.png`);
    const panels = await extractFiguresFullSheet(srcPath, 2, 4);
    const hCurve = ['N', 'S'].includes(dir) ? H_DEATH_FORE : H_DEATH_LAT;
    const rawCells = [];

    for (let f = 0; f < 8; f++) {
      const { targetW, targetH } = uniformDims(panels[f], hCurve[f], f < 3 ? 260 : 336);
      const anchorMode = f <= 2 ? 'core' : f <= 4 ? 'blend' : 'bbox';
      const { cell } = await placeInCell(panels[f], targetW, targetH, PIVOT.x, { bottomY: 359, anchorMode });
      rawCells.push(cell);
    }
    canonRows.push(harmonizeInteriorShading(rawCells, { loop: false, blendWeight: 0.12 }));
  }
  return canonRows;
}

// 4. RUN: Build the 5 canonical rows [N, NE, E, SE, S] at uniform running height 318px
async function buildAllRunRows(heroKey) {
  const canonRows = [];
  for (let d = 0; d < ROWS; d++) {
    const dir = CANON_DIRS[d];
    const panels = [];
    for (let pair = 0; pair < 4; pair++) {
      const srcPath = path.join(ACT_V2_ROOT, `${heroKey}-run-${dir}-pair-${pair}.png`);
      const pairPanels = await extractFiguresFullSheet(srcPath, 2, 1);
      panels.push(pairPanels[0], pairPanels[1]);
    }
    const aspects = panels.map(p => p.width / p.height).sort((a, b) => a - b);
    const medAspect = aspects[4];
    let bestIdx = 0, bestDiff = Infinity;
    for (let i = 0; i < panels.length; i++) {
      const diff = Math.abs(panels[i].width / panels[i].height - medAspect);
      if (diff < bestDiff) { bestDiff = diff; bestIdx = i; }
    }
    const panel = panels[bestIdx];
    const { targetW, targetH } = uniformDims(panel, 318, 336);
    const { cell: baseCell } = await placeInCell(panel, targetW, targetH, PIVOT.x, { bottomY: 355, anchorMode: 'core' });

    const isLateral = ['NE', 'E', 'SE'].includes(dir);
    const dirSign = isLateral ? 1 : 0;
    const cells = [];

    for (let f = 0; f < 8; f++) {
      const theta = (2 * Math.PI * f) / 8;
      const sin1 = Math.sin(theta);
      const cos1 = Math.cos(theta);
      const sin2 = Math.sin(2 * theta);
      const cos2 = Math.cos(2 * theta);

      const dyBob = 3.5 * cos2;
      const out = Buffer.alloc(CELL * CELL * 4);

      for (let y = 10; y < CELL - 6; y++) {
        const u = Math.max(0, Math.min(1.1, (355 - y) / targetH));
        const lowerMask = 1 - smoothstep(0.15, 0.52, u);
        const upperMask = smoothstep(0.45, 0.82, u);

        for (let x = 10; x < CELL - 10; x++) {
          const dxCenter = x - PIVOT.x;
          const absDx = Math.abs(dxCenter);
          const sideSign = Math.tanh(dxCenter / 18);

          let dxStride = 0, dyStride = 0;
          if (isLateral) {
            dxStride = lowerMask * (1 - u * 1.4) * 9.5 * sin1 * sideSign + lowerMask * 3.2 * cos1;
            dyStride = lowerMask * sideSign * 7.5 * sin1;
          } else {
            dxStride = lowerMask * 3.0 * sin1;
            dyStride = lowerMask * sideSign * 8.5 * sin1;
          }

          const dxUpper = upperMask * (-2.6 * sin1 + 1.8 * dirSign * sin2);
          const dyUpper = upperMask * (-1.5 * cos2);

          const clothMask = smoothstep(16, 56, absDx) * smoothstep(0.16, 0.45, u) * (1 - 0.65 * smoothstep(0.84, 0.98, u));
          const phaseLag = 0.038 * absDx + 0.022 * Math.max(0, y - 110);
          const dxCloth = clothMask * (6.2 * Math.sin(theta - phaseLag) + 2.0 * cos2);
          const dyCloth = clothMask * (4.4 * Math.cos(theta - phaseLag));

          const sx = x - (dxStride + dxUpper + dxCloth);
          const sy = y - (dyBob + dyStride + dyUpper + dyCloth);

          const [r0, g0, b0, a0] = sampleBilinear(baseCell, CELL, CELL, sx, sy);
          if (a0 < 8) continue;

          const glowMod = 1 + 0.02 * Math.sin(theta + u * 2.0);
          const idx = (y * CELL + x) * 4;
          out[idx] = Math.min(255, Math.round(r0 * glowMod));
          out[idx + 1] = Math.min(255, Math.round(g0 * glowMod));
          out[idx + 2] = Math.min(255, Math.round(b0 * glowMod));
          out[idx + 3] = a0;
        }
      }
      cells.push(out);
    }
    canonRows.push(cells);
  }
  return canonRows;
}

async function packSheet(heroSlug, heroKey, pose, allRowsBuilder) {
  const composite = [];
  const hashes = new Set();
  const rowStats = [];
  const allRows = await allRowsBuilder(heroKey);

  for (let row = 0; row < ROWS; row++) {
    const dir = CANON_DIRS[row];
    const cells = allRows[row];
    const heights = [];
    const widths = [];
    const areas = [];

    for (let f = 0; f < 8; f++) {
      const cell = cells[f];
      for (let i = 0; i < cell.length; i += 4) {
        if (cell[i + 3] < 8) cell[i] = cell[i + 1] = cell[i + 2] = cell[i + 3] = 0;
      }
      const meta = measureCell(cell);
      heights.push(meta.height);
      widths.push(meta.width);
      areas.push(meta.area);

      const png = await sharp(cell, { raw: { width: CELL, height: CELL, channels: 4 } }).png().toBuffer();
      const sha = createHash('sha256').update(png).digest('hex');
      hashes.add(sha);
      composite.push({ input: png, left: f * CELL, top: row * CELL });
    }
    rowStats.push({ dir, h0: heights[0], w0: widths[0], area0: areas[0], area3: areas[3] });
  }

  const outFile = path.join(OUT_DIR, `${heroSlug}-${pose}.png`);
  await sharp({
    create: { width: SHEET_W, height: SHEET_H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
  })
    .composite(composite)
    .png()
    .toFile(outFile);

  console.log(`Packed 1-side sheet ${outFile} (${SHEET_W}x${SHEET_H}, ${hashes.size}/40 unique cells; SW/W/NW mirrored at runtime)`);
  for (const s of rowStats) {
    console.log(`  ${s.dir.padEnd(2)} f1:[W=${s.w0}, H=${s.h0}, area=${s.area0}] f4:[area=${s.area3}]`);
  }
}

async function main() {
  for (const [heroSlug, heroKey] of [['rift-runner', 'rift'], ['ember-warden', 'ember']]) {
    await packSheet(heroSlug, heroKey, 'idle', buildAllIdleRows);
    await packSheet(heroSlug, heroKey, 'hurt', buildAllHurtRows);
    await packSheet(heroSlug, heroKey, 'death', buildAllDeathRows);
    await packSheet(heroSlug, heroKey, 'run', buildAllRunRows);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
