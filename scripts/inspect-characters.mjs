// Visual + numeric evidence for the sliced character atlases: checker-backed atlas with pivots, per-clip onion skins,
// and per-frame drift of the torso centroid around the shared pivot (a loop that jitters shows large drift).
import sharp from 'sharp';
import fs from 'node:fs/promises';

const DIR = 'public/assets/characters', OUT = 'public/evidence/characters';
const manifest = JSON.parse(await fs.readFile(`${DIR}/manifest.json`, 'utf8'));
await fs.mkdir(OUT, { recursive: true });
const checker = (w, h, s = 12) => {
  const b = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const v = ((x / s | 0) + (y / s | 0)) % 2 ? 58 : 38, i = (y * w + x) * 4; b[i] = v; b[i + 1] = v + 2; b[i + 2] = v + 6; b[i + 3] = 255; }
  return sharp(b, { raw: { width: w, height: h, channels: 4 } });
};
const svg = (w, h, body) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">${body}</svg>`);
const report = {};

for (const c of Object.values(manifest.characters)) {
  const atlas = await sharp(`${DIR}/${c.image}`).raw().toBuffer();
  const [W, H] = c.atlasSize, { w, h, pivot } = c.cell;
  // 1. atlas on checker with cell outlines and the shared pivot cross
  const marks = c.frames.map(f => `<rect x="${f.x - .5}" y="${f.y - .5}" width="${w + 1}" height="${h + 1}" fill="none" stroke="#d6a257" stroke-opacity=".35"/>` +
    `<path d="M${f.x + pivot.x - 6} ${f.y + pivot.y}h12M${f.x + pivot.x} ${f.y + pivot.y - 6}v12" stroke="#ff4f7a" stroke-width="1.5"/>`).join('');
  await (await checker(W, H)).composite([{ input: `${DIR}/${c.image}` }, { input: svg(W, H, marks) }]).png().toFile(`${OUT}/${c.id}-atlas-pivots.png`);
  // 2. onion skin per clip (frames drawn at the same pivot; ghosts at 35% except the first)
  const clips = Object.entries(c.clips), sheetW = clips.length * (w + 20) + 20, sheetH = h + 60;
  const layers = [];
  for (const [k, [name, clip]] of clips.entries()) {
    for (const [i, idx] of clip.frames.entries()) {
      const f = c.frames[idx], cell = Buffer.alloc(w * h * 4);
      for (let y = 0; y < h; y++) atlas.copy(cell, y * w * 4, ((f.y + y) * W + f.x) * 4, ((f.y + y) * W + f.x + w) * 4);
      if (i) for (let p = 3; p < cell.length; p += 4) cell[p] = Math.round(cell[p] * .35);
      layers.push({ input: cell, raw: { width: w, height: h, channels: 4 }, left: 20 + k * (w + 20), top: 40 });
    }
  }
  const labels = clips.map(([n, cl], k) => `<text x="${20 + k * (w + 20)}" y="26" fill="#e8dcc3" font-family="monospace" font-size="13">${n} · ${cl.frames.length}f · ${cl.fps}fps${cl.loop ? ' loop' : ''}</text>` +
    `<path d="M${20 + k * (w + 20)} ${40 + pivot.y}h${w}" stroke="#ff4f7a" stroke-dasharray="3 3"/><path d="M${20 + k * (w + 20) + pivot.x} 40v${h}" stroke="#ff4f7a" stroke-dasharray="3 3"/>`).join('');
  await (await checker(sheetW, sheetH)).composite([...layers, { input: svg(sheetW, sheetH, labels) }]).png().toFile(`${OUT}/${c.id}-onion.png`);
  // 3. drift: torso centroid = centroid of opaque pixels in the band 45–80% of cell height above the pivot
  report[c.id] = {};
  for (const [name, clip] of clips) {
    const pts = clip.frames.map(idx => {
      const f = c.frames[idx]; let sx = 0, sy = 0, n = 0, top = h;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (atlas[((f.y + y) * W + f.x + x) * 4 + 3] >= 16) { top = Math.min(top, y); }
      const band0 = Math.round(pivot.y - (pivot.y - top) * .8), band1 = Math.round(pivot.y - (pivot.y - top) * .45);
      for (let y = band0; y <= band1; y++) for (let x = 0; x < w; x++) if (atlas[((f.y + y) * W + f.x + x) * 4 + 3] >= 16) { sx += x; sy += y; n++; }
      return { x: sx / n - pivot.x, y: sy / n - pivot.y, top: pivot.y - top };
    });
    const step = pts.slice(1).map((p, i) => Math.hypot(p.x - pts[i].x, p.y - pts[i].y));
    if (clip.loop) step.push(Math.hypot(pts[0].x - pts.at(-1).x, pts[0].y - pts.at(-1).y));
    report[c.id][name] = { torsoX: pts.map(p => +p.x.toFixed(1)), heightPx: pts.map(p => p.top), maxStepPx: +Math.max(...step).toFixed(1) };
  }
}
// equipment atlas on checker
const e = manifest.equipment, [EW, EH] = e.atlasSize;
await (await checker(EW, EH)).composite([{ input: `${DIR}/${e.image}` }, { input: svg(EW, EH, e.items.map(i => `<text x="${i.x + 4}" y="${i.y + i.h - 4}" fill="#e8dcc3" font-family="monospace" font-size="11">${i.id}</text>`).join('')) }]).png().toFile(`${OUT}/equipment-atlas.png`);
await fs.writeFile(`${OUT}/drift.json`, JSON.stringify(report, null, 1));
console.log(JSON.stringify(report, null, 1));
