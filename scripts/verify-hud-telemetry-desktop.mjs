// Desktop draws the `24 MS ♦ 60 FPS` telemetry row smaller; mobile portrait and phone landscape keep full size.
// Usage: SITE_DIR=dist node scripts/verify-hud-telemetry-desktop.mjs [outDir]
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { launchOptions } from './typography/browser.mjs';

const PORT = process.env.PORT || '8797';
const OUT = process.argv[2] || 'artifacts/hud-telemetry-desktop';
const assert = (c, m) => { if (!c) throw new Error(`Assertion failed: ${m}`); };
const CASES = [
  { name: 'desktop-1470', viewport: { width: 1470, height: 583 }, dpr: 2, mobile: false, expect: 0.7 },
  { name: 'desktop-1920', viewport: { width: 1920, height: 1080 }, dpr: 1, mobile: false, expect: 0.7 },
  { name: 'landscape-844', viewport: { width: 844, height: 390 }, dpr: 3, mobile: true, expect: 1 },
  { name: 'portrait-390', viewport: { width: 390, height: 844 }, dpr: 3, mobile: true, expect: 1 },
];

await mkdir(OUT, { recursive: true });
const server = spawn('server/bin/arkadia', [], {
  env: { ...process.env, PORT, SITE_DIR: process.env.SITE_DIR || 'dist' },
  stdio: ['ignore', 'pipe', 'inherit'],
});
await new Promise((ok, no) => {
  server.stdout.on('data', d => { if (String(d).includes('listening')) ok(); });
  server.on('exit', c => no(new Error('server exited ' + c)));
});
try {
  for (const c of CASES) {
    // Single-process Chromium cannot outlive a closed context, so each viewport gets its own browser.
    const browser = await chromium.launch(launchOptions());
    const ctx = await browser.newContext({ viewport: c.viewport, deviceScaleFactor: c.dpr, isMobile: c.mobile, hasTouch: c.mobile });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(String(e)));
    await page.goto(`http://127.0.0.1:${PORT}/?offline=1&time=0.35`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => Boolean(window.__STRONGHOLD_COMBAT__ && document.querySelector('#world-canvas')?.dataset.ready === 'true'), null, { timeout: 90000 });
    const t = await page.evaluate(() => {
      const hud = window.__PIXI_UI__.hud;
      hud.setTelemetry(33, 60);
      return hud.getTopRightTelemetry();
    });
    await page.waitForTimeout(400);
    const b = t.screenBounds;
    const clip = { x: Math.max(0, b.left - 10), y: 0, width: Math.min(c.viewport.width - Math.max(0, b.left - 10), b.width + 60), height: b.bottom + 16 };
    await page.screenshot({ path: path.join(OUT, `${c.name}.png`), clip });
    console.log(c.name, JSON.stringify({ telemetryTextScale: t.telemetryTextScale, pingLabel: t.pingLabel, fpsLabel: t.fpsLabel, telemetry: t.designBounds.telemetry, errors }));
    assert(Math.abs(t.telemetryTextScale - c.expect) < 1e-6, `${c.name}: telemetry text scale ${t.telemetryTextScale} != ${c.expect}`);
    assert(t.pingLabel === '33 ms' && t.fpsLabel === '60 fps', `${c.name}: labels`);
    assert(t.designBounds.telemetry.leftX > t.designBounds.filigreeRule.leftX, `${c.name}: telemetry row stays inside the filigree rule`);
    assert(errors.length === 0, `${c.name}: page errors ${errors.join('; ')}`);
    await browser.close();
  }
  console.log('PASS');
} finally {
  server.kill();
}
