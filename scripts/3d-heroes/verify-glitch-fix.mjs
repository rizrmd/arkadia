import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { launch } from '../vfx/browser.mjs';

const DOCS_DIR = path.resolve('docs/3d-heroes');
const PUBLIC_DOCS_DIR = path.resolve('public/docs/3d-heroes');
const ATTACHMENT_SRC = path.resolve(process.env.HOME || '/home/dev', 'attachments/TAd0a82a60cf118faff8fa4c55.jpg');

await fs.mkdir(DOCS_DIR, { recursive: true });
await fs.mkdir(PUBLIC_DOCS_DIR, { recursive: true });

if (existsSync(ATTACHMENT_SRC)) {
  await fs.copyFile(ATTACHMENT_SRC, path.join(DOCS_DIR, 'mobile-glitch-before.jpg'));
  await fs.copyFile(ATTACHMENT_SRC, path.join(PUBLIC_DOCS_DIR, 'mobile-glitch-before.jpg'));
}

const server = await createServer({ server: { port: 0, host: '127.0.0.1' } });
await server.listen();
const port = server.httpServer.address().port;

const browser = await launch();

try {
  const results = {
    verifiedAt: new Date().toISOString(),
    syntheticTileGlitchTest: null,
    captures: {}
  };

  // Reuse a single page throughout to keep memory usage low under --single-process
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2
  });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));

  for (const heroId of ['ember-warden', 'rift-runner']) {
    console.log(`Verifying mobile portrait 3D hero (${heroId}) at 12:00 daylight...`);
    await page.goto(`http://127.0.0.1:${port}/?hero=${heroId}&lighting=day&time=0.5&3d=1`, {
      waitUntil: 'domcontentloaded'
    });
    await page.waitForFunction(
      (expectedHero) => {
        const c = window.__WORLD_HERO__;
        if (!window.__HERO_3D_READY__ || !c || c.dataset.mode !== '3d-60fps' || c.dataset.hero !== expectedHero) {
          return false;
        }
        const ctx = c.getContext('2d');
        const data = ctx.getImageData(0, 0, c.width, c.height).data;
        let opaque = 0;
        for (let i = 3; i < data.length; i += 16) {
          if (data[i] > 40) opaque += 4;
        }
        return opaque > 3000;
      },
      heroId,
      { timeout: 60000 }
    );
    await page.waitForTimeout(350);

    const check = await page.evaluate(async () => {
      const heroCanvas = window.__WORLD_HERO__;
      const ctx = heroCanvas.getContext('2d');
      const w = heroCanvas.width;
      const h = heroCanvas.height;
      const data = ctx.getImageData(0, 0, w, h).data;

      let borderOpaquePixels = 0;
      let totalOpaquePixels = 0;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const a = data[(y * w + x) * 4 + 3];
          if (a > 20) {
            totalOpaquePixels++;
            if (x < 2 || x >= w - 2 || y < 2) {
              borderOpaquePixels++;
            }
          }
        }
      }

      const mod = await import('/src/stronghold/hero-3d.ts');
      const r3d = mod.get3dHeroRenderer();
      const spriteCan = r3d.canvas;
      const sCtx = spriteCan.getContext('2d');
      const sData = sCtx.getImageData(0, 0, spriteCan.width, spriteCan.height).data;
      let spriteOpaquePixels = 0;
      let spriteTopLeftRightBorderOpaque = 0;
      for (let y = 0; y < spriteCan.height; y++) {
        for (let x = 0; x < spriteCan.width; x++) {
          const a = sData[(y * spriteCan.width + x) * 4 + 3];
          if (a > 20) {
            spriteOpaquePixels++;
            if (x === 0 || x === spriteCan.width - 1 || y === 0) {
              spriteTopLeftRightBorderOpaque++;
            }
          }
        }
      }

      return {
        hero: heroCanvas.dataset.hero,
        mode: heroCanvas.dataset.mode,
        clip3d: heroCanvas.dataset.clip3d,
        canvasSize: [w, h],
        totalOpaquePixels,
        borderOpaquePixels,
        spriteOpaquePixels,
        spriteTopLeftRightBorderOpaque
      };
    });

    console.log(`Mobile check (${heroId}):`, check);
    assert.equal(check.mode, '3d-60fps', `Expected 3d-60fps mode for ${heroId}`);
    assert.ok(check.totalOpaquePixels > 4000, `Expected >4000 opaque hero+shadow pixels for ${heroId}, got ${check.totalOpaquePixels}`);
    assert.ok(check.spriteOpaquePixels > 4000, `Expected >4000 sprite opaque pixels for ${heroId}, got ${check.spriteOpaquePixels}`);
    assert.equal(check.borderOpaquePixels, 0, `Expected 0 border opaque pixels on #world-hero for ${heroId}`);
    assert.equal(check.spriteTopLeftRightBorderOpaque, 0, `Expected 0 outer tile border pixels on 3D sprite canvas for ${heroId}`);

    const outWebp = path.join(DOCS_DIR, `mobile-${heroId}-fixed.webp`);
    await page.screenshot({ path: outWebp, type: 'webp', quality: 92 });
    await fs.copyFile(outWebp, path.join(PUBLIC_DOCS_DIR, `mobile-${heroId}-fixed.webp`));
    results.captures[`mobile_${heroId}`] = check;
  }

  // Test synthetic TBDR tile corruption directly via sanitizeHeroWorkPixels
  results.syntheticTileGlitchTest = await page.evaluate(async () => {
    const { sanitizeHeroWorkPixels } = await import('/src/stronghold/hero-3d.ts');
    const W = 228;
    const H = 206;
    const pixels = new Uint8ClampedArray(W * H * 4);

    // 1. Fill outer tiles with opaque red/black HUD garbage (simulating 66940.jpg unresolved TBDR tiles)
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const p = (y * W + x) * 4;
        pixels[p] = 160;
        pixels[p + 1] = 35;
        pixels[p + 2] = 15;
        pixels[p + 3] = 255;
      }
    }

    // 2. Carve a 16x16 tile staircase moat (alpha = 0) around the hero center [68..160, 24..206]
    for (let y = 24; y < H; y++) {
      for (let x = 68; x < 160; x++) {
        const p = (y * W + x) * 4;
        pixels[p] = 0;
        pixels[p + 1] = 0;
        pixels[p + 2] = 0;
        pixels[p + 3] = 0;
      }
    }

    // 3. Paint the contiguous 3D hero silhouette inside [92..136, 40..205] (touching bottom boot pivot y = 204!)
    let heroOriginalCount = 0;
    for (let y = 40; y < 205; y++) {
      for (let x = 92; x < 136; x++) {
        const p = (y * W + x) * 4;
        pixels[p] = 220;
        pixels[p + 1] = 165;
        pixels[p + 2] = 95;
        pixels[p + 3] = 255;
        heroOriginalCount++;
      }
    }

    sanitizeHeroWorkPixels(pixels, W, H);

    let garbageRemaining = 0;
    let heroRemaining = 0;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const a = pixels[(y * W + x) * 4 + 3];
        if (a > 0) {
          if (x >= 92 && x < 136 && y >= 40 && y < 205) heroRemaining++;
          else garbageRemaining++;
        }
      }
    }
    return { heroOriginalCount, heroRemaining, garbageRemaining };
  });

  console.log('Synthetic TBDR tile glitch test:', results.syntheticTileGlitchTest);
  assert.equal(results.syntheticTileGlitchTest.garbageRemaining, 0, 'All TBDR outer tile garbage must be erased');
  assert.equal(
    results.syntheticTileGlitchTest.heroRemaining,
    results.syntheticTileGlitchTest.heroOriginalCount,
    '100% of hero pixels (including boots at y=204) must be preserved'
  );

  // Desktop verification (1440x900) reusing the same page
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`http://127.0.0.1:${port}/?hero=ember-warden&lighting=day&time=0.5&3d=1`, {
    waitUntil: 'domcontentloaded'
  });
  await page.waitForFunction(
    () => {
      const c = window.__WORLD_HERO__;
      if (!window.__HERO_3D_READY__ || !c || c.dataset.mode !== '3d-60fps') return false;
      const ctx = c.getContext('2d');
      const data = ctx.getImageData(0, 0, c.width, c.height).data;
      let opaque = 0;
      for (let i = 3; i < data.length; i += 16) if (data[i] > 40) opaque += 4;
      return opaque > 3000;
    },
    null,
    { timeout: 60000 }
  );
  await page.waitForTimeout(350);
  const desktopWebp = path.join(DOCS_DIR, 'desktop-ember-warden-fixed.webp');
  await page.screenshot({ path: desktopWebp, type: 'webp', quality: 92 });
  await fs.copyFile(desktopWebp, path.join(PUBLIC_DOCS_DIR, 'desktop-ember-warden-fixed.webp'));

  // Build Before / After comparison composite reusing the same page
  await page.setViewportSize({ width: 920, height: 880 });
  const beforeB64 = existsSync(path.join(DOCS_DIR, 'mobile-glitch-before.jpg'))
    ? (await fs.readFile(path.join(DOCS_DIR, 'mobile-glitch-before.jpg'))).toString('base64')
    : '';
  const afterB64 = (await fs.readFile(path.join(DOCS_DIR, 'mobile-ember-warden-fixed.webp'))).toString('base64');

  await page.setContent(`
    <!doctype html>
    <html>
    <head>
      <style>
        body {
          margin: 0;
          background: #0d111a;
          color: #e8ecf4;
          font-family: Inter, system-ui, sans-serif;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 880px;
        }
        h2 {
          margin: 0 0 14px 0;
          font-size: 18px;
          letter-spacing: -0.01em;
        }
        .grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          padding: 0 24px;
        }
        .card {
          background: #141b29;
          border: 1px solid #26324b;
          border-radius: 12px;
          padding: 12px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .label {
          font-size: 13px;
          font-weight: 700;
          margin-bottom: 8px;
          padding: 4px 10px;
          border-radius: 999px;
        }
        .label.before {
          background: rgba(239, 68, 68, 0.18);
          color: #f87171;
          border: 1px solid rgba(239, 68, 68, 0.4);
        }
        .label.after {
          background: rgba(52, 211, 153, 0.18);
          color: #34d399;
          border: 1px solid rgba(52, 211, 153, 0.4);
        }
        img {
          height: 740px;
          width: auto;
          border-radius: 8px;
          border: 1px solid #1f293d;
        }
      </style>
    </head>
    <body>
      <h2>3D Hero Mobile WebGL Tile Glitch — Before vs. After Fix (Ember Warden)</h2>
      <div class="grid">
        <div class="card">
          <div class="label before">BEFORE — Unresolved TBDR Outer GPU Tiles (66940.jpg)</div>
          <img src="data:image/jpeg;base64,${beforeB64}" />
        </div>
        <div class="card">
          <div class="label after">AFTER — Full-Viewport Clear Quad + gl.readPixels + Tile Sanitizer</div>
          <img src="data:image/webp;base64,${afterB64}" />
        </div>
      </div>
    </body>
    </html>
  `);
  await page.waitForTimeout(200);
  const compWebp = path.join(DOCS_DIR, 'before-after-3d-hero-glitch.webp');
  await page.screenshot({ path: compWebp, type: 'webp', quality: 92 });
  await fs.copyFile(compWebp, path.join(PUBLIC_DOCS_DIR, 'before-after-3d-hero-glitch.webp'));

  assert.deepEqual(errors, [], `Unexpected page errors: ${errors.join('; ')}`);

  await fs.writeFile(path.join(DOCS_DIR, 'glitch-fix-verification.json'), JSON.stringify(results, null, 2) + '\n');
  await fs.writeFile(path.join(PUBLIC_DOCS_DIR, 'glitch-fix-verification.json'), JSON.stringify(results, null, 2) + '\n');
  console.log('Successfully verified 3D hero glitch fix and generated comparison artifacts!');
} finally {
  await browser.close();
  await server.close();
}
