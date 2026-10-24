import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { launchOptions } from './typography/browser.mjs';

const PORT = '8809';
const OUT_DIR = 'docs/player-console';

function assert(cond, msg) {
  if (!cond) throw new Error(`Assertion failed: ${msg}`);
}

const server = spawn('node', ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', PORT], {
  stdio: 'pipe',
});

let browser;
try {
  await mkdir(OUT_DIR, { recursive: true });
  await new Promise((resolve, reject) => {
    server.stdout.on('data', d => {
      if (String(d).includes(PORT)) resolve();
    });
    server.on('exit', reject);
  });

  browser = await chromium.launch(launchOptions());
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));

  await page.goto(`http://127.0.0.1:${PORT}/?offline=1&time=0.5`);
  await page.waitForFunction(
    () => window.__STRONGHOLD_COMBAT__?.hud && window.__PIXI_UI__?.app && document.querySelector('#world-canvas')?.dataset.ready === 'true',
    null,
    { timeout: 90000 },
  );

  await page.evaluate(() => {
    if (window.__PIXI_UI__?.picker?.isOpen()) {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter' }));
    }
    window.__COOP__?.net?.leave();
  });

  const reports = [];
  for (const [name, width, height, cropH] of [
    ['mobile', 390, 844, 92],
    ['desktop', 1440, 900, 150],
  ]) {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(300);
    const data = await page.evaluate(() => {
      const c = window.__STRONGHOLD_COMBAT__;
      if (c?.player) {
        c.player.level = 2;
        c.player.xp = 224;
        c.player.xpToNext = 280;
        c.player.gold = 130;
        c.player.hp = 100;
        c.player.maxHp = 100;
      }
      const hud = c.hud;
      hud.layout(window.innerWidth, window.innerHeight);
      hud.setHero('Ember Warden');
      hud.setLevel(2);
      hud.setHp(100, 100);
      hud.setGateHp(100, 100);
      hud.setXp(224, 280);
      hud.setGold(130);
      hud.setTime('12:00');
      hud.setZone('Safe Zone');
      hud.setTelemetry(24, 53);
      window.__PIXI_UI__?.app?.ticker?.stop();
      window.__PIXI_UI__.app.render();

      const pc = hud.playerConsole;
      const tr = hud.getTopRightTelemetry();
      const portraitBounds = pc.art.getBounds();
      const xpPlateBounds = pc.rows[2].plate.getBounds();
      const goldMedBounds = hud.trRibbonGoldMedallion.getBounds();
      const clockMedBounds = hud.trRibbonClockMedallion.getBounds();

      return {
        isPortrait: pc.isPortrait,
        tlScale: +hud.groups.tl.scale.x.toFixed(4),
        trScale: +(hud.groups.tr.scale.x * hud.trRibbonGroup.scale.x).toFixed(4),
        portraitTopPx: +portraitBounds.y.toFixed(2),
        portraitBottomPx: +(portraitBounds.y + portraitBounds.height).toFixed(2),
        xpBottomPx: +(xpPlateBounds.y + xpPlateBounds.height).toFixed(2),
        goldMedTopPx: +goldMedBounds.y.toFixed(2),
        clockMedTopPx: +clockMedBounds.y.toFixed(2),
        rowsDesign: pc.rows.map(r => ({
          y: r.y,
          h: r.h,
          left: r.left,
          bottomLeft: r.bottomLeft,
          trackRightTop: r.trackRightTop,
          trackRightBot: r.trackRightBot,
          valueX: r.valueX,
        })),
        trDesignBounds: tr.designBounds,
        trScreenBounds: tr.screenBounds,
      };
    });

    // Verify top-left and top-right scales match
    assert(Math.abs(data.tlScale - data.trScale) < 1e-4, `${name}: tlScale (${data.tlScale}) != trScale (${data.trScale})`);

    // Verify top edge alignment between portrait frame and gold/clock medallions
    assert(
      Math.abs(data.portraitTopPx - data.goldMedTopPx) <= 0.5 && Math.abs(data.goldMedTopPx - data.clockMedTopPx) <= 0.5,
      `${name}: top edges not aligned (portrait=${data.portraitTopPx}, goldMed=${data.goldMedTopPx}, clockMed=${data.clockMedTopPx})`,
    );

    // Verify all 3 status bars share identical inner track left/bottomLeft/right edges
    const r0 = data.rowsDesign[0];
    for (const [idx, r] of data.rowsDesign.entries()) {
      assert(
        r.left === r0.left &&
          r.bottomLeft === r0.bottomLeft &&
          r.trackRightTop === r0.trackRightTop &&
          r.trackRightBot === r0.trackRightBot &&
          r.valueX === r0.valueX,
        `${name}: row ${idx} horizontal edges do not match row 0 (${JSON.stringify(r)} vs ${JSON.stringify(r0)})`,
      );
    }

    // Verify filigree divider rule is equidistant between Safe Zone ledger and FPS telemetry
    const d = data.trDesignBounds;
    const upperGap = d.filigreeRule.y - d.ledger.cy;
    const lowerGap = d.telemetry.cy - d.filigreeRule.y;
    assert(upperGap === lowerGap, `${name}: filigree rule not centered between ledger and telemetry (${upperGap} vs ${lowerGap})`);

    await page.screenshot({ path: `${OUT_DIR}/hud-aligned-${name}.png` });
    await page.screenshot({
      path: `${OUT_DIR}/hud-aligned-${name}-crop.png`,
      clip: { x: 0, y: 0, width, height: cropH },
    });

    await page.evaluate(() => window.__PIXI_UI__?.app?.ticker?.start());
    reports.push({ viewport: `${width}x${height}`, name, ...data });
  }

  assert(errors.length === 0, `Page errors: ${errors.join('; ')}`);
  await writeFile(`${OUT_DIR}/hud-alignment-verification.json`, JSON.stringify({ verifiedAt: new Date().toISOString(), reports, errors }, null, 2));
  console.log('HUD_ALIGNMENT_VERIFIED:', JSON.stringify(reports, null, 2));
} finally {
  await browser?.close();
  server.kill();
}
