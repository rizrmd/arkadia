// Builds the 3072x3072 (8 directions x 8 frames, 384x384 per cell) Attack sprite sheets
// for Ember Warden and Rift Runner from the 16 generated 4x2 directional source sheets.
// Uses full-sheet background removal + interior pocket cleaning + edge color decontamination,
// followed by Multi-Source Geodesic BFS from the 8 figure core boxes so extended punches and
// slashes that cross nominal 4x2 column boundaries are preserved 100% intact without clipping
// or bleeding into neighboring frames.
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import sharp from 'sharp';

sharp.concurrency(1);
sharp.cache(false);

const CELL = 384;
const COLS = 8;
const DIRS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
const ROWS = DIRS.length; // 8 stored rows (3072x3072)
const SHEET_W = CELL * COLS; // 3072
const SHEET_H = CELL * ROWS; // 3072
const PIVOT = { x: 192, y: 360 };

const BRAIN_DIR = '/home/dev/.gemini/antigravity-cli/brain/0e9dbddf-3f3d-4435-869c-ccc08a58de07';
const OUT_DIR = 'assets-src/sprite-player';
const SCRATCH_DIR = path.join(BRAIN_DIR, 'scratch');

const SOURCES = {
  'ember-warden': {
    heroKey: 'ember',
    files: {
      N: path.join(BRAIN_DIR, 'ember_warden_attack_n_png_1792733006070.jpg'),
      NE: path.join(BRAIN_DIR, 'ember_warden_attack_ne_png_1792732980525.jpg'),
      E: path.join(BRAIN_DIR, 'ember_warden_attack_e_png_1792732954520.jpg'),
      SE: path.join(BRAIN_DIR, 'ember_warden_attack_se_png_1792732756006.jpg'),
      S: path.join(BRAIN_DIR, 'ember_warden_attack_s_v2_png_1792732732845.jpg'),
      SW: path.join(BRAIN_DIR, 'ember_warden_attack_sw_v3_png_1792733189216.jpg'),
      W: path.join(BRAIN_DIR, 'ember_warden_attack_w_v2_png_1792733245914.jpg'),
      NW: path.join(BRAIN_DIR, 'ember_warden_attack_nw_png_1792733301445.jpg')
    },
    flipFrames: {
      SW: [1, 2, 3, 4, 5, 6],
      W: [1, 2, 3, 4, 5, 6],
      NW: [5]
    }
  },
  'rift-runner': {
    heroKey: 'rift',
    files: {
      N: path.join(BRAIN_DIR, 'rift_runner_attack_n_1792733266437.jpg'),
      NE: path.join(BRAIN_DIR, 'rift_runner_attack_ne_1792733108624.jpg'),
      E: path.join(BRAIN_DIR, 'rift_runner_attack_e_1792733080005.jpg'),
      SE: path.join(BRAIN_DIR, 'rift_runner_attack_se_1792733050501.jpg'),
      S: path.join(BRAIN_DIR, 'rift_runner_attack_s_v2_1792733022645.jpg'),
      SW: path.join(BRAIN_DIR, 'rift_runner_attack_sw_v3_1792733386148.jpg'),
      W: path.join(BRAIN_DIR, 'rift_runner_attack_w_1792733414709.jpg'),
      NW: path.join(BRAIN_DIR, 'rift_runner_attack_nw_1792733447785.jpg')
    },
    flipFrames: {
      SW: [1, 2, 3, 4, 5, 6],
      W: [1, 2, 3, 4, 5, 6],
      NW: [1, 2, 3, 4, 5]
    }
  }
};

// Cleanly remove white background (exterior + interior pockets) and decontaminate edge colors across the full 4x2 sheet
function removeWhiteBgAndDecontaminateFullSheet(rawRgba, w, h, heroKey) {
  const buf = Buffer.from(rawRgba);
  const n = w * h;

  function isBgCandidate(idx, strict = false) {
    const r = buf[idx], g = buf[idx + 1], b = buf[idx + 2];
    const maxC = Math.max(r, g, b);
    const minC = Math.min(r, g, b);
    const chroma = maxC - minC;
    const warmDiff = r - b;
    const coolDiff = Math.max(b - r, g - r);

    if (strict) {
      return minC >= 242 && chroma <= 10 && warmDiff <= 10 && coolDiff <= 10;
    }
    return minC >= 230 && chroma <= 20 && warmDiff <= 16 && coolDiff <= 16;
  }

  // 1. Exterior flood-fill from sheet borders and nominal grid gutters
  const bgMask = new Uint8Array(n);
  const queue = new Int32Array(n);
  let qHead = 0, qTail = 0;

  function tryEnqueue(p, strict = false) {
    if (bgMask[p]) return;
    if (isBgCandidate(p * 4, strict)) {
      bgMask[p] = 1;
      queue[qTail++] = p;
    }
  }

  for (let x = 0; x < w; x++) {
    tryEnqueue(x, false);
    tryEnqueue((h - 1) * w + x, false);
    tryEnqueue(Math.floor(h / 2) * w + x, false);
  }
  for (let y = 0; y < h; y++) {
    tryEnqueue(y * w, false);
    tryEnqueue(y * w + (w - 1), false);
    for (let c = 1; c < 4; c++) {
      tryEnqueue(y * w + Math.floor((c * w) / 4), false);
    }
  }

  while (qHead < qTail) {
    const p = queue[qHead++];
    const x = p % w, y = (p - x) / w;
    if (x > 0) tryEnqueue(p - 1, false);
    if (x < w - 1) tryEnqueue(p + 1, false);
    if (y > 0) tryEnqueue(p - w, false);
    if (y < h - 1) tryEnqueue(p + w, false);
  }

  // 2. Interior neutral-white pocket removal (between hair strands, between arm & torso, between legs/coat tails)
  const seenPocket = new Uint8Array(n);
  const cellW = w / 4, cellH = h / 2;
  for (let seed = 0; seed < n; seed++) {
    if (bgMask[seed] || seenPocket[seed]) continue;
    if (!isBgCandidate(seed * 4, true)) continue;

    const comp = [seed];
    seenPocket[seed] = 1;
    let cMinX = w, cMaxX = 0, cMinY = h, cMaxY = 0;
    for (let i = 0; i < comp.length; i++) {
      const p = comp[i];
      const x = p % w, y = (p - x) / w;
      if (x < cMinX) cMinX = x;
      if (x > cMaxX) cMaxX = x;
      if (y < cMinY) cMinY = y;
      if (y > cMaxY) cMaxY = y;
      const nbrs = [
        x > 0 ? p - 1 : -1,
        x < w - 1 ? p + 1 : -1,
        y > 0 ? p - w : -1,
        y < h - 1 ? p + w : -1
      ];
      for (const nb of nbrs) {
        if (nb >= 0 && !bgMask[nb] && !seenPocket[nb] && isBgCandidate(nb * 4, true)) {
          seenPocket[nb] = 1;
          comp.push(nb);
        }
      }
    }

    const area = comp.length;
    const midY = (cMinY + cMaxY) * 0.5;
    const relY = (midY % cellH) / cellH;
    // Protect tiny eye highlights in the head zone (top 25% of cell)
    if (relY < 0.25 && area < 35) continue;
    if (area >= 12) {
      for (const p of comp) bgMask[p] = 1;
    }
  }

  // 3. Distance-to-background and soft alpha / edge color decontamination
  const distToBg = new Uint8Array(n);
  distToBg.fill(255);
  qHead = 0;
  qTail = 0;
  for (let i = 0; i < n; i++) {
    if (bgMask[i]) {
      distToBg[i] = 0;
      queue[qTail++] = i;
    }
  }
  while (qHead < qTail) {
    const p = queue[qHead++];
    const d = distToBg[p];
    if (d >= 4) continue;
    const x = p % w, y = (p - x) / w;
    const nbrs = [
      x > 0 ? p - 1 : -1,
      x < w - 1 ? p + 1 : -1,
      y > 0 ? p - w : -1,
      y < h - 1 ? p + w : -1
    ];
    for (const nb of nbrs) {
      if (nb >= 0 && distToBg[nb] > d + 1) {
        distToBg[nb] = d + 1;
        queue[qTail++] = nb;
      }
    }
  }

  for (let i = 0; i < n; i++) {
    const idx = i * 4;
    const d = distToBg[i];
    if (d === 0) {
      buf[idx] = buf[idx + 1] = buf[idx + 2] = buf[idx + 3] = 0;
      continue;
    }
    if (d <= 3) {
      const r = buf[idx], g = buf[idx + 1], b = buf[idx + 2];
      const maxC = Math.max(r, g, b);
      const minC = Math.min(r, g, b);
      const chroma = maxC - minC;
      const warmGlow = r - b;
      const coolGlow = Math.max(b - r, g - r);

      const isColoredGlow = (heroKey === 'ember' && warmGlow > 32) || (heroKey === 'rift' && coolGlow > 24);
      if (!isColoredGlow && minC > 155 && chroma < 38) {
        const darkness = (255 - minC) / 100;
        const chromaBoost = chroma / 45;
        let alphaFrac = Math.min(1, Math.max(0, darkness * 0.85 + chromaBoost * 0.45));
        if (d === 1 && minC > 215 && chroma < 22) {
          alphaFrac *= 0.25;
        } else if (d === 2 && minC > 225 && chroma < 18) {
          alphaFrac *= 0.45;
        }
        const a = Math.round(alphaFrac * 255);
        if (a < 18) {
          buf[idx] = buf[idx + 1] = buf[idx + 2] = buf[idx + 3] = 0;
        } else {
          const invA = 1 / Math.max(0.2, alphaFrac);
          buf[idx] = Math.max(0, Math.min(255, Math.round((r - (1 - alphaFrac) * 255) * invA)));
          buf[idx + 1] = Math.max(0, Math.min(255, Math.round((g - (1 - alphaFrac) * 255) * invA)));
          buf[idx + 2] = Math.max(0, Math.min(255, Math.round((b - (1 - alphaFrac) * 255) * invA)));
          buf[idx + 3] = a;
        }
      } else if (isColoredGlow && minC > 205) {
        const glowAlpha = Math.max(0.25, Math.min(1, (255 - minC) / 65 + Math.max(warmGlow, coolGlow) / 110));
        const invA = 1 / Math.max(0.25, glowAlpha);
        buf[idx] = Math.max(0, Math.min(255, Math.round((r - (1 - glowAlpha) * 255) * invA)));
        buf[idx + 1] = Math.max(0, Math.min(255, Math.round((g - (1 - glowAlpha) * 255) * invA)));
        buf[idx + 2] = Math.max(0, Math.min(255, Math.round((b - (1 - glowAlpha) * 255) * invA)));
        buf[idx + 3] = Math.round(glowAlpha * 255);
      } else {
        buf[idx + 3] = 255;
      }
    } else {
      buf[idx + 3] = 255;
    }
  }

  // 4. Propagate clean interior RGB into semi-transparent edge pixels
  const cleanRgb = Buffer.from(buf);
  for (let pass = 0; pass < 3; pass++) {
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = y * w + x;
        const idx = i * 4;
        const a = buf[idx + 3];
        if (a === 0 || a >= 230) continue;
        let sr = 0, sg = 0, sb = 0, cnt = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const ni = ((y + dy) * w + (x + dx)) * 4;
            if (buf[ni + 3] >= 220) {
              sr += cleanRgb[ni];
              sg += cleanRgb[ni + 1];
              sb += cleanRgb[ni + 2];
              cnt++;
            }
          }
        }
        if (cnt > 0) {
          cleanRgb[idx] = Math.round(0.35 * cleanRgb[idx] + 0.65 * (sr / cnt));
          cleanRgb[idx + 1] = Math.round(0.35 * cleanRgb[idx + 1] + 0.65 * (sg / cnt));
          cleanRgb[idx + 2] = Math.round(0.35 * cleanRgb[idx + 2] + 0.65 * (sb / cnt));
        }
      }
    }
  }

  return cleanRgb;
}

// Compute tight alpha bounds and horizontal core median of a figure panel
function finalizeFigurePanel(rawBuf, fw, fh) {
  let minx = fw, miny = fh, maxx = 0, maxy = 0;
  for (let y = 0; y < fh; y++) {
    for (let x = 0; x < fw; x++) {
      const a = rawBuf[(y * fw + x) * 4 + 3];
      if (a > 24) {
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
      if (a >= 12) {
        crop[di] = rawBuf[si];
        crop[di + 1] = rawBuf[si + 1];
        crop[di + 2] = rawBuf[si + 2];
        crop[di + 3] = a;
      }
    }
  }

  // Alpha-weighted horizontal median X across the lower torso + pelvis + legs band (35%..85% height)
  // so extended upper-body horizontal weapon slashes don't shift the standing legs/pelvis off-pivot
  const yStart = Math.floor(height * 0.35);
  const yEnd = Math.max(yStart + 1, Math.floor(height * 0.85));
  const colWeights = new Float64Array(width);
  let totalWeight = 0;
  for (let y = yStart; y < yEnd; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const a = crop[idx + 3];
      if (a > 96) {
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

// Extract 8 complete figures from a 4x2 sheet using Multi-Source Geodesic BFS from the 8 figure torso/leg cores
async function extractAttackPanelsFullSheet(filePath, heroKey, flipIndices = []) {
  const { data, info } = await sharp(filePath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width, h = info.height;
  const cleaned = removeWhiteBgAndDecontaminateFullSheet(data, w, h, heroKey);

  const n = w * h;
  const label = new Int8Array(n);
  label.fill(-1);

  const queue = new Int32Array(n);
  let qHead = 0, qTail = 0;

  const cw = w / 4, ch = h / 2;

  // Seed each of the 8 figures along its narrow vertical spine (centerX ± 7% of cell width,
  // y = 18%..86% of row height), where centerX is the lower-body (legs/pelvis) horizontal median.
  // Because the seed is narrow (±7% cw around the spine), an outstretched fist from a neighboring
  // column never enters the seed, while seeding up to y=18% means each figure's shoulder starts at distance 0!
  const centerXs = new Int32Array(8);
  for (let f = 0; f < 8; f++) {
    const col = f % 4, row = Math.floor(f / 4);
    const searchX0 = Math.round(col * cw + cw * 0.20);
    const searchX1 = Math.round(col * cw + cw * 0.80);
    const legY0 = Math.round(row * ch + ch * 0.50);
    const legY1 = Math.round(row * ch + ch * 0.86);

    let sumX = 0, sumW = 0;
    for (let y = legY0; y <= legY1; y++) {
      for (let x = searchX0; x <= searchX1; x++) {
        const a = cleaned[(y * w + x) * 4 + 3];
        if (a > 64) {
          sumX += x * a;
          sumW += a;
        }
      }
    }
    const centerX = sumW > 0 ? Math.round(sumX / sumW) : Math.round(col * cw + cw * 0.5);
    centerXs[f] = centerX;
    const seedHalfW = Math.round(cw * 0.07);
    const sx0 = Math.max(searchX0, centerX - seedHalfW);
    const sx1 = Math.min(searchX1, centerX + seedHalfW);
    const spineY0 = Math.round(row * ch + ch * 0.18);
    const spineY1 = Math.round(row * ch + ch * 0.86);

    for (let y = spineY0; y <= spineY1; y++) {
      for (let x = sx0; x <= sx1; x++) {
        const idx = y * w + x;
        if (cleaned[idx * 4 + 3] > 20) {
          label[idx] = f;
          queue[qTail++] = idx;
        }
      }
    }
  }

  // Find the exact lower-body valley column (minimum foreground density in y = 52%..92% of cell height)
  // between each adjacent pair of figures (col and col+1) in the same row.
  // If two adjacent figures' flaring coat hem tips touch, the minimum-density column is the exact kiss point!
  const lowerSplitX = Array.from({ length: 2 }, () => new Int32Array(3));
  for (let row = 0; row < 2; row++) {
    const vy0 = Math.round(row * ch + ch * 0.52);
    const vy1 = Math.round(row * ch + ch * 0.92);
    for (let col = 0; col < 3; col++) {
      const fL = row * 4 + col;
      const fR = fL + 1;
      const xStart = Math.round(centerXs[fL] + cw * 0.12);
      const xEnd = Math.round(centerXs[fR] - cw * 0.12);
      const mid = Math.round((centerXs[fL] + centerXs[fR]) * 0.5);
      let bestX = mid, bestCount = 1e9;
      for (let x = xStart; x <= xEnd; x++) {
        let count = 0;
        for (let y = vy0; y <= vy1; y++) {
          if (cleaned[(y * w + x) * 4 + 3] > 20) count++;
        }
        // Tie-break toward the midpoint
        const score = count * 1000 + Math.abs(x - mid);
        if (score < bestCount) {
          bestCount = score;
          bestX = x;
        }
      }
      lowerSplitX[row][col] = bestX;
    }
  }

  // Step 1: Strict 8-connected Geodesic BFS through foreground pixels (alpha > 14) within the same row band.
  const midY = Math.round(h / 2);
  while (qHead < qTail) {
    const p = queue[qHead++];
    const f = label[p];
    const col = f % 4, row = Math.floor(f / 4);
    const x = p % w, y = (p - x) / w;

    for (let dy = -1; dy <= 1; dy++) {
      const ny = y + dy;
      if (ny < 4 || ny >= h - 4) continue;
      if (row === 0 && ny > midY + 12) continue;
      if (row === 1 && ny < midY - 12) continue;
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx;
        if (nx < 4 || nx >= w - 4) continue;
        const np = ny * w + nx;
        if (label[np] !== -1 || cleaned[np * 4 + 3] <= 14) continue;

        if (heroKey === 'rift' && col > 0 && nx < centerXs[f] - 18) {
          const r = cleaned[np * 4], g = cleaned[np * 4 + 1], b = cleaned[np * 4 + 2];
          if (b - r > 22 && g > 135) continue;
        }
        // Below the waist (y > 52% of cell height), split at the exact minimum-density valley column between adjacent figures
        if (ny > row * ch + ch * 0.52) {
          if (col > 0 && nx < lowerSplitX[row][col - 1]) continue;
          if (col < 3 && nx > lowerSplitX[row][col]) continue;
        }
        label[np] = f;
        queue[qTail++] = np;
      }
    }
  }

  // Step 2: Assign any small detached weapon FX / spark components (area >= 18)
  // to the strictly nearest already-labeled pixel in the same row (within 24 px)
  const seenUnlabeled = new Uint8Array(n);
  for (let seed = 0; seed < n; seed++) {
    if (label[seed] !== -1 || seenUnlabeled[seed] || cleaned[seed * 4 + 3] <= 20) continue;
    const comp = [seed];
    seenUnlabeled[seed] = 1;
    for (let i = 0; i < comp.length; i++) {
      const p = comp[i];
      const x = p % w, y = (p - x) / w;
      for (const np of [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, y > 0 ? p - w : -1, y < h - 1 ? p + w : -1]) {
        if (np >= 0 && label[np] === -1 && !seenUnlabeled[np] && cleaned[np * 4 + 3] > 20) {
          seenUnlabeled[np] = 1;
          comp.push(np);
        }
      }
    }
    if (comp.length < 18) continue;

    let bestLabel = -1, bestDist2 = 24 * 24 + 1;
    const stride = Math.max(1, Math.floor(comp.length / 40));
    for (let i = 0; i < comp.length; i += stride) {
      const p = comp[i];
      const cx = p % w, cy = (p - cx) / w;
      if ((cy % ch) > ch * 0.55) continue; // only attach upper-body weapon sparks/arcs, never lower coat-hem tips
      const row = cy < midY ? 0 : 1;
      for (let dy = -24; dy <= 24; dy++) {
        const ny = cy + dy;
        if (ny < 0 || ny >= h) continue;
        for (let dx = -24; dx <= 24; dx++) {
          const nx = cx + dx;
          if (nx < 0 || nx >= w) continue;
          const d2 = dx * dx + dy * dy;
          if (d2 >= bestDist2) continue;
          const lbl = label[ny * w + nx];
          if (lbl !== -1 && Math.floor(lbl / 4) === row) {
            bestDist2 = d2;
            bestLabel = lbl;
          }
        }
      }
    }
    if (bestLabel !== -1) {
      for (const p of comp) label[p] = bestLabel;
    }
  }

  // Extract each labeled figure (0..7) with a 1px soft halo dilation
  const flipSet = new Set(flipIndices);
  const panels = [];
  for (let f = 0; f < 8; f++) {
    let minX = w, maxX = 0, minY = h, maxY = 0;
    for (let i = 0; i < n; i++) {
      if (label[i] === f) {
        const x = i % w, y = (i - x) / w;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
    const l = Math.max(0, minX - 2);
    const t = Math.max(0, minY - 2);
    const r = Math.min(w - 1, maxX + 2);
    const b = Math.min(h - 1, maxY + 2);
    const fw = r - l + 1, fh = b - t + 1;
    const frameBuf = Buffer.alloc(fw * fh * 4);

    for (let y = t; y <= b; y++) {
      for (let x = l; x <= r; x++) {
        const idx = y * w + x;
        let match = label[idx] === f;
        if (!match && label[idx] === -1 && cleaned[idx * 4 + 3] > 0) {
          // Include 1px anti-aliased border if adjacent to label f and not adjacent to another label
          for (const np of [x > 0 ? idx - 1 : -1, x < w - 1 ? idx + 1 : -1, y > 0 ? idx - w : -1, y < h - 1 ? idx + w : -1]) {
            if (np >= 0 && label[np] === f) {
              match = true;
              break;
            }
          }
        }
        if (match) {
          const si = idx * 4;
          const di = ((y - t) * fw + (x - l)) * 4;
          frameBuf[di] = cleaned[si];
          frameBuf[di + 1] = cleaned[si + 1];
          frameBuf[di + 2] = cleaned[si + 2];
          frameBuf[di + 3] = cleaned[si + 3];
        }
      }
    }

    let panel = finalizeFigurePanel(frameBuf, fw, fh);
    if (flipSet.has(f)) {
      panel = mirrorPanelHorizontal(panel);
    }
    panels.push(panel);
  }

  return panels;
}

function uniformDims(panel, targetH = 328, maxW = 348) {
  let scale = targetH / panel.height;
  if (panel.width * scale > maxW) {
    scale = maxW / panel.width;
  }
  const w = Math.max(1, Math.round(panel.width * scale));
  const h = Math.max(1, Math.round(panel.height * scale));
  return { targetW: w, targetH: h };
}

async function placeInCell(panel, targetW, targetH, targetCoreX, { bottomY = 359 } = {}) {
  const w = Math.max(1, Math.round(targetW));
  const h = Math.max(1, Math.round(targetH));
  const scaled = await sharp(panel.data, { raw: { width: panel.width, height: panel.height, channels: 4 } })
    .resize(w, h, { fit: 'fill', kernel: 'lanczos3' })
    .raw()
    .toBuffer();

  const scaledCoreX = (panel.coreX / panel.width) * w;
  let left = Math.round(targetCoreX - scaledCoreX);
  let top = Math.round(bottomY - h + 1);

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
      if (a < 10) continue;
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
  return { minx, miny, maxx, maxy, width: maxx - minx + 1, height: maxy - miny + 1, area };
}

async function buildHeroAttackSheet(heroSlug) {
  const cfg = SOURCES[heroSlug];
  const composite = [];
  const hashes = new Set();

  const H_ATTACK = [328, 324, 320, 320, 322, 322, 325, 328];

  for (let r = 0; r < ROWS; r++) {
    const dir = DIRS[r];
    const srcFile = cfg.files[dir];
    const flipIndices = cfg.flipFrames[dir] || [];
    const panels = await extractAttackPanelsFullSheet(srcFile, cfg.heroKey, flipIndices);

    const rowHeights = [];
    const rowWidths = [];
    for (let f = 0; f < COLS; f++) {
      const { targetW, targetH } = uniformDims(panels[f], H_ATTACK[f], 348);
      const { cell } = await placeInCell(panels[f], targetW, targetH, PIVOT.x, { bottomY: 359 });
      for (let i = 0; i < cell.length; i += 4) {
        if (cell[i + 3] < 10) cell[i] = cell[i + 1] = cell[i + 2] = cell[i + 3] = 0;
      }
      const meta = measureCell(cell);
      rowHeights.push(meta.height);
      rowWidths.push(meta.width);

      const png = await sharp(cell, { raw: { width: CELL, height: CELL, channels: 4 } }).png().toBuffer();
      const sha = createHash('sha256').update(png).digest('hex');
      hashes.add(sha);
      composite.push({ input: png, left: f * CELL, top: r * CELL });
    }
    console.log(`  [${heroSlug}] ${dir.padEnd(2)}: heights=[${rowHeights.join(',')}] widths=[${rowWidths.join(',')}]`);
  }

  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.mkdir(SCRATCH_DIR, { recursive: true });
  const outFile = path.join(OUT_DIR, `${heroSlug}-attack.png`);

  await sharp({
    create: { width: SHEET_W, height: SHEET_H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
  })
    .composite(composite)
    .png()
    .toFile(outFile);

  console.log(`Packed ${outFile} (${SHEET_W}x${SHEET_H}, ${hashes.size}/64 unique cells)`);

  const halfSheet = await sharp(outFile).resize(1536, 1536, { kernel: 'lanczos3' }).png().toBuffer();
  await sharp({
    create: { width: 1536, height: 1536, channels: 4, background: '#161d22' }
  })
    .composite([{ input: halfSheet, left: 0, top: 0 }])
    .jpeg({ quality: 92 })
    .toFile(path.join(SCRATCH_DIR, `${heroSlug}-attack-dark-check.jpg`));

  await sharp({
    create: { width: 1536, height: 1536, channels: 4, background: '#f3f0e8' }
  })
    .composite([{ input: halfSheet, left: 0, top: 0 }])
    .jpeg({ quality: 92 })
    .toFile(path.join(SCRATCH_DIR, `${heroSlug}-attack-light-check.jpg`));
}

async function main() {
  await buildHeroAttackSheet('ember-warden');
  await buildHeroAttackSheet('rift-runner');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
