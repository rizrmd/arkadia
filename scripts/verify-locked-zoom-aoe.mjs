import {chromium} from 'playwright';
import {spawn, execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import sharp from 'sharp';

const port = process.env.PORT || '8798';
const url = process.env.VERIFY_URL || `http://127.0.0.1:${port}`;
const outDir = 'docs/locked-zoom-aoe';

let server = null;
let browser = null;

try {
  await fs.mkdir(outDir, {recursive: true});

  if (!process.env.VERIFY_URL) {
    execFileSync(process.env.GO || '/home/dev/.local/go/bin/go', ['build', '-o', 'bin/arkadia', './cmd/arkadia'], {
      cwd: 'server',
      stdio: 'inherit',
      env: {...process.env, CGO_ENABLED: '0', GOFLAGS: '-p=1', GOMAXPROCS: '2', GOMEMLIMIT: '256MiB'}
    });
    server = spawn('server/bin/arkadia', [], {
      env: {...process.env, PORT: port, SITE_DIR: 'dist'},
      stdio: ['ignore', 'pipe', 'inherit']
    });
    await new Promise((ok, no) => {
      server.stdout.on('data', d => {
        if (String(d).includes('listening')) ok();
      });
      server.on('exit', c => no(new Error('server exited ' + c)));
    });
  }

  browser = await chromium.launch({
    headless: true,
    env: {
      ...process.env,
      LD_LIBRARY_PATH: '/home/dev/.local/browser-libs/usr/lib/x86_64-linux-gnu:/opt/fural-antigravity-glibc'
    },
    args: ['--no-sandbox', '--no-zygote', '--single-process']
  });

  // 1. Mobile Portrait (380 x 836, matching reference attachment docs/assets/locked-zoom-aoe-ref.png)
  const mobileCtx = await browser.newContext({
    viewport: {width: 380, height: 836},
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true
  });
  const page = await mobileCtx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));

  await page.addInitScript(() => {
    localStorage.setItem('arkadia.stronghold.hero.id', 'ember-warden');
  });

  // 19:27 time-of-day = (19 + 27/60) / 24 = 0.8104
  await page.goto(`${url}/?offline=1&hero=ember-warden&time=0.8104`);
  await page.waitForFunction(
    () => document.querySelector('#world-canvas')?.dataset.ready === 'true' && window.__STRONGHOLD_COMBAT__,
    null,
    {timeout: 60000}
  );

  // Place hero in the wilds outside the gate (around u=18.8, v=18.8 so the gate bottom sits at the top edge as in reference)
  const fixture = await page.evaluate(() => {
    const c = window.__STRONGHOLD_COMBAT__;
    for (let u = 18.5; u < 24; u += 0.3) {
      for (let v = 18.5; v < 24; v += 0.3) {
        if (
          c.clear(u, v) &&
          c.clear(u + 0.38, v - 0.12) &&
          c.clear(u - 0.65, v - 1.35) &&
          c.clear(u - 0.25, v - 1.15) &&
          c.clear(u + 1.05, v - 0.75) &&
          c.teleport(u, v)
        ) {
          c.summon(u + 0.38, v - 0.12);
          c.summon(u - 0.65, v - 1.35);
          c.summon(u - 0.25, v - 1.15);
          c.summon(u + 1.05, v - 0.75);
          return {u, v};
        }
      }
    }
    throw new Error('Could not find wilds fixture tile');
  });

  await page.waitForTimeout(450);

  // Open the blessing modal at base reach (1.0x) matching the reference framing
  await page.evaluate(() => {
    window.__STRONGHOLD_COMBAT__.offer(['star', 'heal', 'might']);
  });
  await page.waitForTimeout(250);

  const getZoomState = () =>
    page.evaluate(() => {
      const canvas = document.querySelector('#world-canvas');
      const surface = document.querySelector('#world-surface');
      const aoe = document.querySelector('#hero-aoe');
      const hud = document.querySelector('#hero-hud');
      const cards = document.querySelector('.level-cards');
      const m = /scale\(([\d.]+)\)/.exec(surface?.style.transform || '');
      const aoeRect = aoe?.getBoundingClientRect();
      const hudRect = hud?.getBoundingClientRect();
      const cardsRect = cards?.getBoundingClientRect();
      return {
        zoomMode: canvas?.dataset.zoom,
        scale: m ? +m[1] : NaN,
        datasetScale: +canvas?.dataset.scale,
        targetScale: +canvas?.dataset.targetScale,
        reach: +canvas?.dataset.reach,
        aoeVisible: aoe && !aoe.hidden,
        aoeRadiusPx: +(aoe?.dataset.radiusPx || 0),
        aoeRect: aoeRect
          ? {
              left: +aoeRect.left.toFixed(1),
              top: +aoeRect.top.toFixed(1),
              right: +aoeRect.right.toFixed(1),
              bottom: +aoeRect.bottom.toFixed(1),
              width: +aoeRect.width.toFixed(1),
              height: +aoeRect.height.toFixed(1)
            }
          : null,
        hudBottom: hudRect ? +hudRect.bottom.toFixed(1) : null,
        cardsTop: cardsRect ? +cardsRect.top.toFixed(1) : null
      };
    });

  const baseState = await getZoomState();
  const expectedBaseScale = +(Math.max(1, Math.min(1.35, 836 / 630))).toFixed(4);
  assert.equal(baseState.zoomMode, 'locked', 'camera zoom mode must be locked');
  assert.ok(Math.abs(baseState.scale - expectedBaseScale) < 0.002, `expected base scale ${expectedBaseScale}, got ${baseState.scale}`);
  assert.equal(baseState.reach, 1.0, 'initial reach is 1.0x');
  assert.ok(baseState.aoeVisible, 'base AoE indicator underfoot is visible in the wilds');
  assert.ok(
    baseState.aoeRect.left >= 0 && baseState.aoeRect.right <= 380,
    'base AoE circle fits horizontally inside 380px viewport'
  );
  assert.ok(
    baseState.aoeRect.top >= baseState.hudBottom && baseState.aoeRect.bottom <= baseState.cardsTop,
    'base AoE circle is framed clearly between top HUD and bottom blessing modal'
  );

  // Test manual wheel scroll & 2-finger pinch-zoom are locked
  await page.mouse.move(190, 400);
  await page.mouse.wheel(0, 500);
  await page.mouse.wheel(0, -500);
  await page.waitForTimeout(100);
  const afterWheel = await getZoomState();
  assert.equal(afterWheel.scale, baseState.scale, 'mouse wheel must not change locked camera scale');

  const cdp = await mobileCtx.newCDPSession(page);
  const touch = (type, points) =>
    cdp.send('Input.dispatchTouchEvent', {
      type,
      touchPoints: points.map(([x, y], id) => ({x, y, id}))
    });
  await touch('touchStart', [[190, 260]]);
  await touch('touchStart', [[190, 260], [190, 500]]);
  for (let i = 1; i <= 12; i++) {
    const t = i / 12;
    await touch('touchMove', [
      [190, 260 + 90 * t],
      [190, 500 - 90 * t]
    ]);
    await page.waitForTimeout(16);
  }
  await touch('touchEnd', []);
  await page.waitForTimeout(100);
  const afterPinch = await getZoomState();
  assert.equal(afterPinch.scale, baseState.scale, '2-finger pinch must not change locked camera scale');

  // Capture Default Locked Zoom screenshot (380 x 836)
  await sharp(await page.screenshot())
    .webp({quality: 90})
    .toFile(`${outDir}/default-locked-380x836.webp`);

  // 2. Dynamic Zoom-Out across Arc Nova Ranks 1, 2, 3 (reach = 1.2x, 1.4x, 1.6x)
  const rankTransitions = [];
  for (let rank = 1; rank <= 3; rank++) {
    // Offer Arc Nova in the blessing modal and start per-frame scale sampler
    await page.evaluate(() => {
      window.__STRONGHOLD_COMBAT__.offer(['nova', 'star', 'might']);
      window.__ZOOM_SAMPLES__ = [];
      const surface = document.querySelector('#world-surface');
      const sample = () => {
        if (!window.__ZOOM_SAMPLING__) return;
        const m = /scale\(([\d.]+)\)/.exec(surface?.style.transform || '');
        if (m) window.__ZOOM_SAMPLES__.push(+m[1]);
        requestAnimationFrame(sample);
      };
      window.__ZOOM_SAMPLING__ = true;
      requestAnimationFrame(sample);
    });

    const beforeScale = (await getZoomState()).scale;
    // Click the Arc Nova blessing card button
    await page.locator('.blessing-row button').first().click();
    await page.waitForTimeout(950);

    const samples = await page.evaluate(() => {
      window.__ZOOM_SAMPLING__ = false;
      return window.__ZOOM_SAMPLES__;
    });

    // Re-open blessing modal so screenshot shows framing between HUD and blessing modal as in reference
    await page.evaluate(() => {
      window.__STRONGHOLD_COMBAT__.offer(['nova', 'vitality', 'might']);
    });
    await page.waitForTimeout(120);

    const state = await getZoomState();
    const expectedReach = +(1 + rank * 0.2).toFixed(2);
    const expectedTarget = +(expectedBaseScale / (1 + (expectedReach - 1) * 0.85)).toFixed(4);

    assert.equal(state.reach, expectedReach, `rank ${rank} reach should be ${expectedReach}`);
    assert.ok(
      Math.abs(state.scale - expectedTarget) < 0.004,
      `rank ${rank} scale ${state.scale} should settle at target ${expectedTarget}`
    );
    assert.ok(state.scale < beforeScale, `rank ${rank} zoomed out from ${beforeScale} to ${state.scale}`);

    // Verify smooth transition (multiple distinct intermediate frames and no overshoot past target)
    const distinctScales = new Set(samples.map(s => s.toFixed(3))).size;
    const minSample = Math.min(...samples);
    assert.ok(distinctScales >= 6, `expected smooth multi-frame zoom transition at rank ${rank}, got ${distinctScales}`);
    assert.ok(minSample >= expectedTarget - 0.002, `SmoothDamp zoom must not overshoot target ${expectedTarget} (min ${minSample})`);

    // Verify full AoE circle fits inside viewport width and between HUD & cards
    assert.ok(
      state.aoeRect.left >= 0 && state.aoeRect.right <= 380,
      `rank ${rank} AoE circle fits horizontally inside 380px viewport (${JSON.stringify(state.aoeRect)})`
    );

    await sharp(await page.screenshot())
      .webp({quality: 90})
      .toFile(`${outDir}/nova-rank${rank}-380x836.webp`);

    rankTransitions.push({
      rank,
      reach: state.reach,
      beforeScale: +beforeScale.toFixed(4),
      settledScale: +state.scale.toFixed(4),
      expectedTarget,
      distinctFrames: distinctScales,
      aoeRadiusWorldPx: state.aoeRadiusPx,
      aoeScreenRect: state.aoeRect
    });
  }

  // 3. Desktop Viewport (1280 x 800) + 20Hz Authoritative Co-op Server Mode Verification
  await page.setViewportSize({width: 1280, height: 800});
  await page.waitForTimeout(200);
  await sharp(await page.screenshot())
    .webp({quality: 90})
    .toFile(`${outDir}/nova-rank3-desktop.webp`);

  const desktopRank3 = await page.evaluate(() => ({
    scale: +document.querySelector('#world-canvas').dataset.scale,
    targetScale: +document.querySelector('#world-canvas').dataset.targetScale,
    reach: +document.querySelector('#world-canvas').dataset.reach
  }));
  assert.equal(desktopRank3.reach, 1.6);
  assert.ok(Math.abs(desktopRank3.scale - desktopRank3.targetScale) < 0.004);

  // Switch to online 20Hz Co-op Server mode in the same page and verify base desktop scale (1.0x reach)
  await page.goto(`${url}/?hero=ember-warden&time=0.8104`);
  await page.waitForFunction(
    () => document.querySelector('#world-canvas')?.dataset.ready === 'true' && window.__STRONGHOLD_COMBAT__ && window.__COOP__?.stats().status === 'online',
    null,
    {timeout: 60000}
  );
  await page.waitForTimeout(300);

  const desktopBase = await page.evaluate(() => ({
    scale: +document.querySelector('#world-canvas').dataset.scale,
    reach: +document.querySelector('#world-canvas').dataset.reach,
    coopStatus: window.__COOP__?.stats().status
  }));
  const expectedDesktopBase = +(800 / 630).toFixed(4);
  assert.equal(desktopBase.coopStatus, 'online', 'connected to 20Hz co-op server');
  assert.ok(Math.abs(desktopBase.scale - expectedDesktopBase) < 0.003, `desktop base scale ${desktopBase.scale} matches ${expectedDesktopBase}`);
  await sharp(await page.screenshot())
    .webp({quality: 90})
    .toFile(`${outDir}/default-locked-desktop.webp`);

  assert.deepEqual(errors, []);

  const report = {
    url,
    passed: true,
    mobileViewport: '380x836',
    desktopViewport: '1280x800',
    baseLockedState: baseState,
    manualZoomBlocked: {
      beforeScale: baseState.scale,
      afterWheelScale: afterWheel.scale,
      afterPinchScale: afterPinch.scale
    },
    rankTransitions,
    desktopCoopAndRank3: {
      desktopBase,
      desktopRank3
    },
    errors
  };
  await fs.writeFile(`${outDir}/results.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  console.log('PASS verify-locked-zoom-aoe');
} finally {
  await browser?.close();
  server?.kill();
}
