import sharp from 'sharp';
import fs from 'node:fs/promises';

const out = 'public/modular-stronghold/v2';
const grand = await sharp(`${out}/gateway-grand.png`).ensureAlpha().raw().toBuffer({resolveWithObject: true});
const open = await sharp(`${out}/gateway-open.png`).resize(1200, 749).ensureAlpha().raw().toBuffer();
const piers = await sharp('assets-src/full-gateway/piers-clean.jpg').resize(720, 480, {fit: 'fill'}).ensureAlpha().raw().toBuffer();
const {data: sData, info: sInfo} = await sharp('assets-src/gate-animation/generated-sheet.png').ensureAlpha().raw().toBuffer({resolveWithObject: true});

const W = 1200, H = 749;
// 1. Clean the baked-in static torches and daytime orange stain off both stone piers using the clean masonry reference.
const cleanStone = Buffer.from(grand.data);
for (const [x0, x1] of [[254, 422], [778, 946]]) {
 const y0 = 260, y1 = 568;
 for (let y = y0; y <= y1; y++) {
  for (let x = x0; x <= x1; x++) {
   const gi = (y * W + x) * 4;
   if (grand.data[gi + 3] < 128) continue;
   const wx = Math.min(1, (x - x0) / 16, (x1 - x) / 16);
   const wy = Math.min(1, (y - y0) / 16, (y1 - y) / 16);
   const a = Math.max(0, Math.min(1, Math.min(wx, wy)));
   const pi = ((y - 240) * 720 + (x - 240)) * 4;
   for (let c = 0; c < 3; c++) cleanStone[gi + c] = Math.round(grand.data[gi + c] * (1 - a) + piers[pi + c] * a);
  }
 }
}

// 2. Prepare realistic torch overlays (unlit for daytime/closed reference, lit for sheet/open emissive mask).
const TW = 112, TH = 180;
const torchUnlitL = await sharp('public/realistic-torch/frame-3.webp').resize(TW, TH).png().toBuffer();
const torchUnlitR = await sharp('public/realistic-torch/frame-3.webp').flop().resize(TW, TH).png().toBuffer();
const torchLitL = await sharp('public/realistic-torch/frame-0.webp').resize(TW, TH).png().toBuffer();
const torchLitR = await sharp('public/realistic-torch/frame-2.webp').flop().resize(TW, TH).png().toBuffer();

const unlitBase = await sharp(cleanStone, {raw: {width: W, height: H, channels: 4}})
 .composite([
  {input: torchUnlitL, left: 298, top: 369},
  {input: torchUnlitR, left: 790, top: 369}
 ])
 .ensureAlpha().raw().toBuffer();

const litBase = await sharp(cleanStone, {raw: {width: W, height: H, channels: 4}})
 .composite([
  {input: torchLitL, left: 298, top: 369},
  {input: torchLitR, left: 790, top: 369}
 ])
 .ensureAlpha().raw().toBuffer();

// 3. Exact stone arch ceiling per column x in [433..767] (preserving keystone and stone voussoirs).
const archTop = new Int32Array(W).fill(9999);
for (let x = 433; x <= 767; x++) {
 if (x >= 485 && x <= 715) {
  for (let y = 260; y < 400; y++) {
   if (open[(y * W + x) * 4 + 3] < 128) { archTop[x] = y; break; }
  }
 } else {
  const dx = x < 485 ? (485 - x) / (485 - 433) : (x - 715) / (767 - 715);
  archTop[x] = Math.round(304 + 54 * Math.pow(dx, 1.55));
 }
}

// 4. Build 16 high-resolution (768x512) registered gateway frames with pixel-locked stonework.
const frame = {w: 768, h: 512}, parts = [], registration = [];
const cw = sInfo.width / 4, ch = sInfo.height / 4;
const DW = 767 - 433 + 1, DH = 378, DY = 268;

async function toRegisteredFrame(raw1200) {
 return sharp(raw1200, {raw: {width: W, height: H, channels: 4}})
  .resize(746, 468, {fit: 'fill', kernel: 'lanczos3'})
  .extend({top: 22, bottom: 22, left: 11, right: 11, background: '#00000000'})
  .ensureAlpha().raw().toBuffer();
}

const unlitClosed768 = await toRegisteredFrame(unlitBase);
const litReference768 = await toRegisteredFrame(litBase);

// Aperture bounds in 768x512 frame coordinates corresponding to doorway x=[433..767], y=[270..646] in 1200x749.
const aperture = {left: 280, right: 488, top: 190, bottom: 426, springY: 268, rise: 46};

for (let i = 0; i < 16; i++) {
 const ox = Math.round((i % 4) * cw), oy = Math.round(Math.floor(i / 4) * ch);
 let l = cw, t = ch, r = 0, b = 0;
 for (let y = 0; y < Math.floor(ch); y++) {
  for (let x = 0; x < Math.floor(cw); x++) {
   if (sData[((oy + y) * sInfo.width + (ox + x)) * 4 + 3] > 64) {
    if (x < l) l = x; if (x > r) r = x;
    if (y < t) t = y; if (y > b) b = y;
   }
  }
 }
 registration.push({frame: i, sourceBounds: {l: ox + l, t: oy + t, r: ox + r, b: oy + b}});
 const composed = Buffer.from(litBase);
 if (i > 0) {
  const doorBuf = await sharp('assets-src/gate-animation/generated-sheet.png')
   .extract({left: ox + l, top: oy + t, width: r - l + 1, height: b - t + 1})
   .resize(DW, DH, {fit: 'fill', kernel: 'lanczos3'})
   .ensureAlpha().raw().toBuffer();
  for (let y = DY; y < 650; y++) {
   for (let x = 433; x <= 767; x++) {
    if (y < archTop[x]) continue;
    const fi = (y * W + x) * 4;
    if (y >= DY + DH) {
     composed[fi] = composed[fi + 1] = composed[fi + 2] = composed[fi + 3] = 0;
     continue;
    }
    const di = ((y - DY) * DW + (x - 433)) * 4;
    composed[fi] = doorBuf[di];
    composed[fi + 1] = doorBuf[di + 1];
    composed[fi + 2] = doorBuf[di + 2];
    composed[fi + 3] = doorBuf[di + 3];
   }
  }
 }
 const pixels = await toRegisteredFrame(composed);
 // Lock every pixel outside the doorway aperture to frame 0 so stonework/towers/banners have 0 pixel drift.
 for (let y = 0; y < frame.h; y++) {
  for (let x = 0; x < frame.w; x++) {
   const inside = x >= aperture.left && x <= aperture.right && y >= aperture.top && y <= aperture.bottom;
   if (!inside) {
    const p = (y * frame.w + x) * 4;
    litReference768.copy(pixels, p, p, p + 4);
   }
  }
 }
 const png = await sharp(pixels, {raw: {width: frame.w, height: frame.h, channels: 4}}).png().toBuffer();
 parts.push({input: png, left: (i % 4) * frame.w, top: Math.floor(i / 4) * frame.h});
 if (i === 15) {
  await sharp(png).webp({lossless: true}).toFile(`${out}/full-gateway-v4-open.webp`);
  await sharp(png).webp({lossless: true}).toFile(`${out}/full-gateway-v3-open.webp`);
 }
}

// Closed reference holds the clean unlit stone piers + unlit forged-iron sconces for daytime rendering.
for (const name of ['full-gateway-v4-closed.webp', 'full-gateway-v3-closed.webp']) {
 await sharp(unlitClosed768, {raw: {width: frame.w, height: frame.h, channels: 4}})
  .webp({lossless: true})
  .toFile(`${out}/${name}`);
}

const sheetBuf = await sharp({create: {width: frame.w * 4, height: frame.h * 4, channels: 4, background: '#00000000'}})
 .composite(parts)
 .webp({lossless: true})
 .toBuffer();
await fs.writeFile(`${out}/full-gateway-v4-sheet.webp`, sheetBuf);
await fs.writeFile(`${out}/full-gateway-v3-sheet.webp`, sheetBuf);

const torches = {
 left: {x: 196, y: 253, w: 70, h: 112},
 right: {x: 502, y: 253, w: 70, h: 112}
};
const meta = {
 image: 'full-gateway-v4-sheet.webp',
 columns: 4,
 frames: 16,
 frame,
 fps: 20,
 region: {x: 0, y: 0, w: 270, h: 180},
 pivot: {x: 0.5, y: 0.97},
 threshold: {x: 577, y: 770},
 torches,
 stabilization: {referenceFrame: 0, aperture},
 registration
};
await fs.writeFile(`${out}/full-gateway-v4-sheet.json`, JSON.stringify(meta, null, 2));
await fs.writeFile(`${out}/full-gateway-v3-sheet.json`, JSON.stringify({...meta, image: 'full-gateway-v3-sheet.webp'}, null, 2));
console.log('Packed 16 high-resolution 768x512 full-gateway-v4 frames with realistic torches');
