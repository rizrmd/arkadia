import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const REF_PATH = fs.existsSync('/home/dev/attachments/DAc4524f9e253a59fb918d9ade.png')
  ? '/home/dev/attachments/DAc4524f9e253a59fb918d9ade.png'
  : 'docs/terrain-height/concept-reference.png';

const OUT_WEBP = path.resolve('public/terrain-height/natural/cliff-strip.webp');

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

function smoothstep(e0, e1, x) {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
}

function sampleBilinear(buf, w, h, x, y) {
  const fx = clamp(x, 0, w - 1.001);
  const fy = clamp(y, 0, h - 1.001);
  const x0 = Math.floor(fx);
  const y0 = Math.floor(fy);
  const x1 = Math.min(w - 1, x0 + 1);
  const y1 = Math.min(h - 1, y0 + 1);
  const dx = fx - x0;
  const dy = fy - y0;
  const w00 = (1 - dx) * (1 - dy);
  const w10 = dx * (1 - dy);
  const w01 = (1 - dx) * dy;
  const w11 = dx * dy;
  const i00 = (y0 * w + x0) * 4;
  const i10 = (y0 * w + x1) * 4;
  const i01 = (y1 * w + x0) * 4;
  const i11 = (y1 * w + x1) * 4;
  return [
    buf[i00] * w00 + buf[i10] * w10 + buf[i01] * w01 + buf[i11] * w11,
    buf[i00 + 1] * w00 + buf[i10 + 1] * w10 + buf[i01 + 1] * w01 + buf[i11 + 1] * w11,
    buf[i00 + 2] * w00 + buf[i10 + 2] * w10 + buf[i01 + 2] * w01 + buf[i11 + 2] * w11,
    buf[i00 + 3] * w00 + buf[i10 + 3] * w10 + buf[i01 + 3] * w01 + buf[i11 + 3] * w11,
  ];
}

// Point-to-polygon signed distance (>0 inside, <0 outside)
function signedPolyDist(x, y, poly) {
  let inside = false;
  let minDistSq = Infinity;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (((yi > y) !== (yj > y)) && (x < ((xj - xi) * (y - yi)) / (yj - yi) + xi)) {
      inside = !inside;
    }
    const vx = xj - xi;
    const vy = yj - yi;
    const l2 = vx * vx + vy * vy || 1;
    const t = clamp(((x - xi) * vx + (y - yi) * vy) / l2, 0, 1);
    const px = xi + t * vx;
    const py = yi + t * vy;
    const d2 = (x - px) * (x - px) + (y - py) * (y - py);
    if (d2 < minDistSq) minDistSq = d2;
  }
  const d = Math.sqrt(minDistSq);
  return inside ? d : -d;
}

// Extract an alpha-masked module from the reference image into the atlas buffer
function pasteModuleCrop(out, outW, refBuf, refW, refH, dstRect, srcRect, maskPoly, featherPx, tintSnow = false) {
  const { x: dx0, y: dy0, w: dw, h: dh } = dstRect;
  const { x: sx0, y: sy0, w: sw, h: sh } = srcRect;
  for (let y = 0; y < dh; y++) {
    const v = (y + 0.5) / dh;
    const ry = sy0 + v * sh;
    // Also combine with a soft super-ellipse boundary inside dstRect so module edges never clip sharply
    const ny = (v - 0.5) * 2;
    for (let x = 0; x < dw; x++) {
      const u = (x + 0.5) / dw;
      const nx = (u - 0.5) * 2;
      const radial = Math.hypot(nx, ny);
      const boxFade = 1 - smoothstep(0.76, 0.99, radial);
      if (boxFade <= 0.002) continue;

      const sx = sx0 + u * sw;
      const sd = signedPolyDist(sx, ry, maskPoly);
      const polyFade = smoothstep(-featherPx * 0.3, featherPx * 0.7, sd);
      const alpha = polyFade * boxFade;
      if (alpha <= 0.002) continue;

      const [r, g, b] = sampleBilinear(refBuf, refW, refH, sx, ry);
      let rr = r;
      let gg = g;
      let bb = b;
      if (tintSnow) {
        const lum = (r + g + b) / 3;
        const snowWeight = smoothstep(185, 240, lum) * (1 - alpha);
        rr = r * (1 - snowWeight * 0.42) + 230 * (snowWeight * 0.42);
        gg = g * (1 - snowWeight * 0.42) + 238 * (snowWeight * 0.42);
        bb = b * (1 - snowWeight * 0.42) + 248 * (snowWeight * 0.42);
      }
      const idx = ((dy0 + y) * outW + (dx0 + x)) * 4;
      out[idx] = Math.round(clamp(rr, 0, 255));
      out[idx + 1] = Math.round(clamp(gg, 0, 255));
      out[idx + 2] = Math.round(clamp(bb, 0, 255));
      out[idx + 3] = Math.round(clamp(alpha * 255, 0, 255));
    }
  }
}

async function main() {
  const W = 1536;
  const H = 2048;
  const out = Buffer.alloc(W * H * 4, 0);

  // Load reference image (1774x887)
  const { data: refBuf, info: refInfo } = await sharp(REF_PATH)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const refW = refInfo.width;
  const refH = refInfo.height;

  // Load existing stronghold cliff texture for subtle granite detail blending
  const existingCliff = await sharp('public/modular-stronghold/v2/cliff-snow.png')
    .resize(W, 512, { fit: 'fill' })
    .ensureAlpha()
    .raw()
    .toBuffer();

  // ============================================================================
  // ROW 0 (y: 0..512): Seamless Fissured Cliff & Snow Lip Strip (1536x512)
  // ============================================================================
  const spanX = 560;
  for (let y = 0; y < 512; y++) {
    const v = y / 511;
    const topMask = smoothstep(0.02, 0.14, v);
    const botMask = 1 - smoothstep(0.84, 0.99, v);
    const stripAlpha = topMask * botMask;
    const ry = 235 + v * 395;
    for (let x = 0; x < W; x++) {
      // Seamless unidirectional tile with 25% crossfade window (no mirror symmetry)
      const t = ((x / W) * 2.0) % 1.0;
      const rxA = 1020 + t * spanX;
      const rxB = 1020 + ((t + 0.5) % 1.0) * spanX;
      const wA = Math.sin(t * Math.PI);
      const wB = Math.sin(((t + 0.5) % 1.0) * Math.PI);
      const wSum = wA + wB || 1;
      const [rA, gA, bA] = sampleBilinear(refBuf, refW, refH, rxA, ry);
      const [rB, gB, bB] = sampleBilinear(refBuf, refW, refH, rxB, ry);
      const rr = (rA * wA + rB * wB) / wSum;
      const rg = (gA * wA + gB * wB) / wSum;
      const rb = (bA * wA + bB * wB) / wSum;

      const ci = (y * W + x) * 4;
      const er = existingCliff[ci];
      const eg = existingCliff[ci + 1];
      const eb = existingCliff[ci + 2];

      const lip = smoothstep(0.02, 0.10, v) * (1 - smoothstep(0.14, 0.27, v));
      const underShadow = smoothstep(0.18, 0.24, v) * (1 - smoothstep(0.26, 0.36, v));
      let r = rr * 0.80 + er * 0.20;
      let g = rg * 0.80 + eg * 0.20;
      let b = rb * 0.80 + eb * 0.20;
      r = r * (1 - lip * 0.52) + 244 * (lip * 0.52);
      g = g * (1 - lip * 0.52) + 249 * (lip * 0.52);
      b = b * (1 - lip * 0.52) + 255 * (lip * 0.52);
      r *= 1 - underShadow * 0.20;
      g *= 1 - underShadow * 0.16;
      b *= 1 - underShadow * 0.08;
      out[ci] = Math.round(clamp(r, 0, 255));
      out[ci + 1] = Math.round(clamp(g, 0, 255));
      out[ci + 2] = Math.round(clamp(b, 0, 255));
      out[ci + 3] = Math.round(clamp(stripAlpha * 255, 0, 255));
    }
  }

  // ============================================================================
  // ROW 1 (y: 512..832): 4 Discrete 3D-Angled Stepped Rock Buttress Modules
  // Each module is 384x320 (B0, B1, B2, B3)
  // ============================================================================
  // B0 (x: 0..384, y: 512..832): Upper-left plateau-neck 3D stepped rock buttress
  pasteModuleCrop(
    out, W, refBuf, refW, refH,
    { x: 0, y: 512, w: 384, h: 320 },
    { x: 560, y: 90, w: 330, h: 265 },
    [
      [620, 105], [750, 98], [860, 145], [880, 240],
      [815, 330], [670, 345], [575, 295], [580, 185],
    ],
    34, true
  );

  // B1 (x: 384..768, y: 512..832): Mid/lower-left stepped ramp shoulder rock buttress
  pasteModuleCrop(
    out, W, refBuf, refW, refH,
    { x: 384, y: 512, w: 384, h: 320 },
    { x: 340, y: 270, w: 365, h: 275 },
    [
      [480, 285], [645, 285], [690, 365], [625, 455],
      [495, 530], [360, 520], [355, 415], [420, 330],
    ],
    34, true
  );

  // B2 (x: 768..1152, y: 512..832): Main high cliff 3D granite buttress
  pasteModuleCrop(
    out, W, refBuf, refW, refH,
    { x: 768, y: 512, w: 384, h: 320 },
    { x: 1090, y: 230, w: 500, h: 410 },
    [
      [1160, 265], [1465, 245], [1575, 360], [1560, 525],
      [1425, 620], [1185, 625], [1105, 515], [1110, 355],
    ],
    38, true
  );

  // B3 (x: 1152..1536, y: 512..832): Right-shoulder stepped ramp rock buttress
  pasteModuleCrop(
    out, W, refBuf, refW, refH,
    { x: 1152, y: 512, w: 384, h: 320 },
    { x: 640, y: 425, w: 515, h: 360 },
    [
      [860, 440], [1110, 445], [1140, 585], [1005, 695],
      [810, 770], [655, 750], [665, 620], [765, 505],
    ],
    36, true
  );

  // ============================================================================
  // ROW 2 (y: 832..1024): 4 Thick Rounded Snow Lip Overhang Modules (384x192 each)
  // ============================================================================
  const overhangSpecs = [
    {
      dst: { x: 0, y: 832, w: 384, h: 192 },
      src: { x: 630, y: 80, w: 280, h: 145 },
      poly: [[655, 95], [885, 92], [895, 175], [780, 210], [645, 185]],
    },
    {
      dst: { x: 384, y: 832, w: 384, h: 192 },
      src: { x: 1150, y: 255, w: 340, h: 155 },
      poly: [[1175, 270], [1465, 268], [1475, 365], [1320, 395], [1165, 360]],
    },
    {
      dst: { x: 768, y: 832, w: 384, h: 192 },
      src: { x: 865, y: 380, w: 300, h: 155 },
      poly: [[890, 395], [1145, 395], [1150, 495], [1015, 520], [880, 490]],
    },
    {
      dst: { x: 1152, y: 832, w: 384, h: 192 },
      src: { x: 1280, y: 110, w: 245, h: 155 },
      poly: [[1300, 125], [1505, 128], [1510, 235], [1400, 252], [1295, 225]],
    },
  ];
  for (const spec of overhangSpecs) {
    pasteModuleCrop(out, W, refBuf, refW, refH, spec.dst, spec.src, spec.poly, 26, true);
  }

  // ============================================================================
  // ROW 3 (y: 1024..1280):
  // - x: 0..768 (768x256): Walkable Splat Trail Spine Decal
  // - x: 768..1536 (4 modules of 192x256): Skirt & Talus Props (T0, T1, S0, S1)
  // ============================================================================
  const pFoot = [230, 745];
  const pCrest = [1160, 145];
  const tx = pCrest[0] - pFoot[0];
  const ty = pCrest[1] - pFoot[1];
  const tLen = Math.hypot(tx, ty);
  const ux = tx / tLen;
  const uy = ty / tLen;
  const nx = -uy;
  const ny = ux;
  const halfWidthRef = 140;

  for (let y = 0; y < 256; y++) {
    const v = (y + 0.5) / 256;
    const lat = (v - 0.5) * 2;
    const latMask = 1 - smoothstep(0.38, 0.96, Math.abs(lat));
    for (let x = 0; x < 768; x++) {
      const u = (x + 0.5) / 768;
      const endMask = smoothstep(0.03, 0.22, u) * (1 - smoothstep(0.76, 0.97, u));
      const alpha = latMask * endMask;
      if (alpha <= 0.002) continue;
      const sx = pFoot[0] + u * tx + lat * halfWidthRef * nx;
      const sy = pFoot[1] + u * ty + lat * halfWidthRef * ny;
      const [r, g, b] = sampleBilinear(refBuf, refW, refH, sx, sy);
      const idx = ((1024 + y) * W + x) * 4;
      out[idx] = Math.round(clamp(r, 0, 255));
      out[idx + 1] = Math.round(clamp(g, 0, 255));
      out[idx + 2] = Math.round(clamp(b, 0, 255));
      out[idx + 3] = Math.round(clamp(alpha * 255, 0, 255));
    }
  }

  // T0 (x: 768..960, y: 1024..1280): Left ramp foot talus boulder & shrub cluster
  pasteModuleCrop(
    out, W, refBuf, refW, refH,
    { x: 768, y: 1024, w: 192, h: 256 },
    { x: 175, y: 495, w: 245, h: 190 },
    [[210, 510], [395, 510], [410, 650], [305, 675], [190, 645], [185, 555]],
    24, true
  );

  // T1 (x: 960..1152, y: 1024..1280): Right ramp foot talus boulder & gravel cluster
  pasteModuleCrop(
    out, W, refBuf, refW, refH,
    { x: 960, y: 1024, w: 192, h: 256 },
    { x: 455, y: 660, w: 335, h: 175 },
    [[485, 675], [765, 675], [775, 805], [620, 825], [470, 805], [465, 725]],
    24, true
  );

  // S0 (x: 1152..1344, y: 1024..1280): Winter shrubs & dry alpine brush cluster
  pasteModuleCrop(
    out, W, refBuf, refW, refH,
    { x: 1152, y: 1024, w: 192, h: 256 },
    { x: 760, y: 40, w: 230, h: 145 },
    [[780, 52], [970, 52], [980, 165], [875, 178], [770, 162]],
    20, true
  );

  // S1 (x: 1344..1536, y: 1024..1280): Right-cliff winter pine shrub & snowdrift skirt
  pasteModuleCrop(
    out, W, refBuf, refW, refH,
    { x: 1344, y: 1024, w: 192, h: 256 },
    { x: 1235, y: 170, w: 225, h: 135 },
    [[1255, 182], [1445, 182], [1450, 290], [1345, 300], [1245, 285]],
    20, true
  );

  // ============================================================================
  // ROW 4 (y: 1280..2048, 1536x768):
  // Distortion-Free Organic Hill Base Stamp (rx: 135..1645, ry: 18..848)
  // With sculpted organic alpha mask excluding background pine trees & rocks
  // ============================================================================
  const hillMaskPolyRef = [
    [695, 92],
    [875, 42],
    [1125, 22],
    [1345, 72],
    [1490, 165],
    [1585, 265],
    [1635, 415],
    [1580, 575],
    [1425, 655],
    [1220, 705],
    [1005, 755],
    [775, 830],
    [525, 845],
    [285, 825],
    [155, 745],
    [165, 595],
    [230, 495],
    [360, 405],
    [475, 295],
    [580, 175],
  ];

  const RX0 = 135;
  const RW = 1510;
  const RY0 = 18;
  const RH = 832;

  for (let y = 0; y < 768; y++) {
    const ry = RY0 + ((y + 0.5) / 768) * RH;
    for (let x = 0; x < W; x++) {
      const rx = RX0 + ((x + 0.5) / W) * RW;
      const sd = signedPolyDist(rx, ry, hillMaskPolyRef);
      const feather = 68;
      const alpha = smoothstep(-feather * 0.2, feather * 0.8, sd);
      if (alpha <= 0.002) continue;

      const [r, g, b] = sampleBilinear(refBuf, refW, refH, rx, ry);

      // Gently harmonize outer snow skirt with Arkadia courtyard snow (#e5edf8)
      const lum = (r + g + b) / 3;
      const skirtZone = 1 - smoothstep(12, 105, sd);
      const isSnow = smoothstep(172, 232, lum);
      const blend = skirtZone * isSnow * 0.52;
      const rr = r * (1 - blend) + 230 * blend;
      const gg = g * (1 - blend) + 238 * blend;
      const bb = b * (1 - blend) + 248 * blend;

      const idx = ((1280 + y) * W + x) * 4;
      out[idx] = Math.round(clamp(rr, 0, 255));
      out[idx + 1] = Math.round(clamp(gg, 0, 255));
      out[idx + 2] = Math.round(clamp(bb, 0, 255));
      out[idx + 3] = Math.round(clamp(alpha * 255, 0, 255));
    }
  }

  await fs.promises.mkdir(path.dirname(OUT_WEBP), { recursive: true });
  await sharp(out, { raw: { width: W, height: H, channels: 4 } })
    .webp({ quality: 94, alphaQuality: 96, effort: 4 })
    .toFile(OUT_WEBP);

  const stat = await fs.promises.stat(OUT_WEBP);
  console.log(`Built ${OUT_WEBP} (${W}x${H}, ${(stat.size / 1024).toFixed(1)} KB)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
