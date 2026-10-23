import { chromium } from 'playwright';
import { spawn, execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { launchOptions } from './typography/browser.mjs';

const PORT = '8799';
const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, 'artifacts');

function assert(cond, msg) {
  if (!cond) throw new Error(`Assertion failed: ${msg}`);
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  execFileSync(process.env.GO || 'go', ['build', '-o', 'bin/arkadia', './cmd/arkadia'], {
    cwd: 'server',
    stdio: 'inherit',
    env: { ...process.env, CGO_ENABLED: '0' },
  });

  const server = spawn('server/bin/arkadia', [], {
    env: { ...process.env, PORT, SITE_DIR: 'dist' },
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  await new Promise((ok, no) => {
    server.stdout.on('data', d => {
      if (String(d).includes('listening')) ok();
    });
    server.on('exit', c => no(new Error('server exited ' + c)));
  });

  const url = `http://127.0.0.1:${PORT}/?offline=1&time=0.35`;
  const consoleErrors = [];

  try {
    const browser = await chromium.launch(launchOptions());
    try {
      const ctx = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        deviceScaleFactor: 1,
        isMobile: false,
        hasTouch: false,
      });
      const page = await ctx.newPage();
      page.on('pageerror', err => consoleErrors.push(`pageerror: ${String(err)}`));
      page.on('console', msg => {
        if (msg.type() === 'error') consoleErrors.push(`console.error: ${msg.text()}`);
      });

      await page.goto(url, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(
        () => Boolean(window.__STRONGHOLD_COMBAT__ && document.querySelector('#world-canvas')?.dataset.ready === 'true'),
        null,
        { timeout: 90000 },
      );

      // Dismiss hero picker if open and set canonical Concept 3 telemetry state (0 Gold, 09:00, Safe Zone ♦ Co-op · Solo, 24 MS ♦ 60 FPS)
      const desktop1440 = await page.evaluate(() => {
        if (window.__PIXI_UI__?.picker?.isOpen()) {
          window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter' }));
        }
        window.__COOP__?.net?.leave();
        const hud = window.__STRONGHOLD_COMBAT__.hud;
        hud.setGold(0);
        hud.setTime('09:00');
        hud.setZone('Safe Zone');
        hud.setCoop('Co-op · Solo');
        hud.setTelemetry(24, 60);
        return hud.getTopRightTelemetry();
      });
      await page.waitForTimeout(250);

      // 1. Standard 1440x900 Desktop viewport screenshot
      const desktopShot = path.join(OUT_DIR, 'hud-topright-v3-desktop.png');
      await page.screenshot({ path: desktopShot });

      // 2. Design-space 1672x941 Close-Up & Stress-Test (9,999 Gold & 99:59)
      await page.setViewportSize({ width: 1672, height: 941 });
      await page.waitForTimeout(250);
      const baseTelemetry = await page.evaluate(() => {
        const hud = window.__STRONGHOLD_COMBAT__.hud;
        hud.setGold(0);
        hud.setTime('09:00');
        hud.setZone('Safe Zone');
        hud.setCoop('Co-op · Solo');
        hud.setTelemetry(24, 60);
        return hud.getTopRightTelemetry();
      });
      await page.waitForTimeout(150);
      const closeUpShot = path.join(OUT_DIR, 'hud-topright-v3-closeup.png');
      await page.screenshot({
        path: closeUpShot,
        clip: { x: 1210, y: 0, width: 462, height: 180 },
      });

      const stressTelemetry = await page.evaluate(() => {
        const hud = window.__STRONGHOLD_COMBAT__.hud;
        hud.setGold(9999);
        hud.setTime('99:59');
        hud.setTelemetry(24, 60);
        return hud.getTopRightTelemetry();
      });
      await page.waitForTimeout(150);
      const stressShot = path.join(OUT_DIR, 'hud-topright-v3-stress-9999.png');
      await page.screenshot({
        path: stressShot,
        clip: { x: 1210, y: 0, width: 462, height: 180 },
      });

      assert(baseTelemetry.variant === 'concept-3-medallion-plaques-ledger', 'Must use Concept 3 top-right HUD');
      assert(baseTelemetry.goldLabel === '0 Gold', `Expected '0 Gold', got '${baseTelemetry.goldLabel}'`);
      assert(baseTelemetry.timeLabel === '09:00', `Expected '09:00', got '${baseTelemetry.timeLabel}'`);
      assert(baseTelemetry.zoneLabel === 'Safe Zone', `Expected 'Safe Zone', got '${baseTelemetry.zoneLabel}'`);
      assert(baseTelemetry.coopLabel === 'Co-op · Solo', `Expected 'Co-op · Solo', got '${baseTelemetry.coopLabel}'`);
      assert(baseTelemetry.pingLabel === '24 ms', `Expected '24 ms', got '${baseTelemetry.pingLabel}'`);
      assert(baseTelemetry.fpsLabel === '60 fps', `Expected '60 fps', got '${baseTelemetry.fpsLabel}'`);
      assert(stressTelemetry.goldLabel === '9,999 Gold', `Expected '9,999 Gold', got '${stressTelemetry.goldLabel}'`);
      assert(stressTelemetry.timeLabel === '99:59', `Expected '99:59', got '${stressTelemetry.timeLabel}'`);

      // Verify zero layout shift between 0 Gold / 09:00 and 9,999 Gold / 99:59
      assert(
        baseTelemetry.designBounds.goldPlaque.medX === stressTelemetry.designBounds.goldPlaque.medX &&
          baseTelemetry.designBounds.goldPlaque.rightX === stressTelemetry.designBounds.goldPlaque.rightX,
        `Gold plaque shifted between '0 Gold' and '9,999 Gold': base=${JSON.stringify(baseTelemetry.designBounds.goldPlaque)} stress=${JSON.stringify(stressTelemetry.designBounds.goldPlaque)}`,
      );
      assert(
        baseTelemetry.designBounds.clockPlaque.medX === stressTelemetry.designBounds.clockPlaque.medX &&
          baseTelemetry.designBounds.clockPlaque.rightX === stressTelemetry.designBounds.clockPlaque.rightX,
        `Clock plaque shifted between '09:00' and '99:59': base=${JSON.stringify(baseTelemetry.designBounds.clockPlaque)} stress=${JSON.stringify(stressTelemetry.designBounds.clockPlaque)}`,
      );
      assert(
        desktop1440.rightBannerClearancePx > 0,
        `Top-right HUD must not overlap right-side banner (clearance=${desktop1440.rightBannerClearancePx}px)`,
      );

      // 3. Mobile Portrait (390x844)
      await page.setViewportSize({ width: 390, height: 844 });
      await page.waitForTimeout(250);
      const mobilePortrait = await page.evaluate(() => {
        const hud = window.__STRONGHOLD_COMBAT__.hud;
        hud.setGold(0);
        hud.setTime('09:00');
        hud.setZone('Safe Zone');
        hud.setCoop('Co-op · Solo');
        hud.setTelemetry(24, 60);
        const s = window.innerWidth / 848;
        const tlRightPx = 536 * s;
        return {
          telemetry: hud.getTopRightTelemetry(),
          tlRightPx: +tlRightPx.toFixed(2),
        };
      });
      await page.waitForTimeout(150);
      const mobilePortraitShot = path.join(OUT_DIR, 'hud-topright-v3-mobile-portrait.png');
      await page.screenshot({ path: mobilePortraitShot });

      assert(
        mobilePortrait.telemetry.screenBounds.left > mobilePortrait.tlRightPx + 4,
        `Mobile portrait top-right HUD (${mobilePortrait.telemetry.screenBounds.left}px) must not overlap top-left hero plate (${mobilePortrait.tlRightPx}px)`,
      );

      // 4. Mobile Landscape (844x390)
      await page.setViewportSize({ width: 844, height: 390 });
      await page.waitForTimeout(250);
      const mobileLandscape = await page.evaluate(() => {
        const hud = window.__STRONGHOLD_COMBAT__.hud;
        hud.setGold(0);
        hud.setTime('09:00');
        hud.setZone('Safe Zone');
        hud.setCoop('Co-op · Solo');
        hud.setTelemetry(24, 60);
        return hud.getTopRightTelemetry();
      });
      await page.waitForTimeout(150);
      const mobileLandscapeShot = path.join(OUT_DIR, 'hud-topright-v3-mobile-landscape.png');
      await page.screenshot({ path: mobileLandscapeShot });

      assert(consoleErrors.length === 0, `Console/page errors detected: ${consoleErrors.join('; ')}`);

      const report = {
        verifiedAt: new Date().toISOString(),
        consoleErrorCount: consoleErrors.length,
        baseTelemetry,
        desktop1440,
        stressTelemetry,
        mobilePortrait,
        mobileLandscape,
        screenshots: {
          closeUpShot,
          desktopShot,
          stressShot,
          mobilePortraitShot,
          mobileLandscapeShot,
        },
      };
      await writeFile(path.join(OUT_DIR, 'hud-topright-v3-report.json'), JSON.stringify(report, null, 2));
      console.log('VERIFICATION_SUCCESS:', JSON.stringify(report, null, 2));
    } finally {
      await browser.close();
    }
  } finally {
    server.kill('SIGTERM');
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
