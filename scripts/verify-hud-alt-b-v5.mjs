import { chromium } from 'playwright';
import { spawn, execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { launchOptions } from './typography/browser.mjs';

const PORT = '8798';
const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, 'artifacts');

function assert(cond, msg) {
  if (!cond) throw new Error(`Assertion failed: ${msg}`);
}

function aabbsOverlapWithGap(a, b, gap = -0.5) {
  return !(
    a.xMax + gap <= b.xMin ||
    b.xMax + gap <= a.xMin ||
    a.yMax + gap <= b.yMin ||
    b.yMax + gap <= a.yMin
  );
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const siteDir = '/tmp/arkadia-dist-alt-b-v5';
  execFileSync('npx', ['vite', 'build', '--outDir', siteDir, '--emptyOutDir'], {
    stdio: 'inherit',
  });
  execFileSync(process.env.GO || 'go', ['build', '-o', 'bin/arkadia-verify', './cmd/arkadia'], {
    cwd: 'server',
    stdio: 'inherit',
    env: { ...process.env, CGO_ENABLED: '0' },
  });

  const server = spawn('server/bin/arkadia-verify', [], {
    env: { ...process.env, PORT, SITE_DIR: siteDir },
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
    // -------------------------------------------------------------------------
    // 1. DESKTOP (16:9 - 1440x900)
    // -------------------------------------------------------------------------
    let browser = await chromium.launch(launchOptions());
    let desktopReport;
    try {
      const desktopCtx = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        deviceScaleFactor: 1,
        isMobile: false,
        hasTouch: false,
      });
      const desktopPage = await desktopCtx.newPage();
      desktopPage.on('pageerror', err => consoleErrors.push(`desktop: ${String(err)}`));

      await desktopPage.goto(url, { waitUntil: 'domcontentloaded' });
      await desktopPage.waitForFunction(
        () => Boolean(window.__PIXI_UI__ && window.__STRONGHOLD_COMBAT__ && document.querySelector('#world-canvas')?.dataset.ready === 'true'),
        null,
        { timeout: 90000 },
      );

      // Dismiss hero picker if open so `hold` resolves and hero.start() + encounters.start() run
      if (await desktopPage.evaluate(() => Boolean(window.__PIXI_UI__?.picker?.isOpen()))) {
        await desktopPage.keyboard.press('Enter');
        await desktopPage.waitForFunction(() => !window.__PIXI_UI__?.picker?.isOpen(), null, { timeout: 10000 });
      }
      await desktopPage.evaluate(() => window.__COOP__?.net?.leave());
      await desktopPage.waitForTimeout(250);

      // Move hero outside gate into combat with revenants
      await desktopPage.evaluate(() => {
        const api = window.__STRONGHOLD_COMBAT__;
        api.teleport(17.5, 8.2);
        api.summon(18.1, 8.5, 2);
        api.summon(17.2, 8.9, 2);
        api.castSkill('rift-bolt', { targetU: 18.1, targetV: 8.5, forceCrit: true });
      });
      await desktopPage.waitForTimeout(300);

      // Screenshot 1: Desktop HUD Alternative B (clean combat state)
      const desktopHudShot = path.join(OUT_DIR, 'hud-alt-b-desktop-verify.png');
      await desktopPage.screenshot({ path: desktopHudShot, timeout: 60000, animations: 'allow' });

      // Trigger v5 Level-Up Blessing UI with 1 Passive + 1 Skill Unlock (Slot 2) + 1 Skill Upgrade (Slot 1)
      const desktopSnap = await desktopPage.evaluate(() => {
        const api = window.__STRONGHOLD_COMBAT__;
        api.offer(['vitality', 'cinder-step', 'flame-fan']);
        return {
          isModalOpen: api.isModalOpen(),
          snapshot: api.snapshot(),
        };
      });
      await desktopPage.waitForTimeout(250);

      // Screenshot 2: Desktop v5 Non-Modal Level-Up Blessing UI with Vector-Tethered Popovers
      const desktopV5Shot = path.join(OUT_DIR, 'level-up-v5-desktop-verify.png');
      await desktopPage.screenshot({ path: desktopV5Shot, timeout: 60000, animations: 'allow' });

      const dUi = desktopSnap.snapshot.blessingUi;
      const dGeo = desktopSnap.snapshot.hudGeometry;
      assert(desktopSnap.isModalOpen === false, 'v5 Level-Up UI must be non-modal (isModalOpen() === false)');
      assert(dGeo.sockets.length === 3, 'Alternative B Crescent Action Arc must expose 3 skill sockets');
      assert(dUi.active === true, 'v5 Level-Up Blessing overlay must be active when run.pending > 0');
      assert(dUi.nonModal === true, 'v5 Level-Up Blessing telemetry must report nonModal: true');
      assert(dUi.centerScreenObstructionRatio === 0, 'v5 Level-Up Blessing must have 0% center-screen obstruction');
      assert(dUi.headerCrest && dUi.headerCrest.rect.width > 200 && dUi.headerCrest.interactive === false, 'Top-center filigree header crest must be present and non-interactive');
      assert(dUi.passiveBanners.length === 1 && dUi.passiveBanners[0].optionNumber === 1, 'Option 1 passive banner must be placed under header crest');
      assert(dUi.skillPopovers.length === 2, 'Options 2 and 3 must render as vector-tethered skill popovers');

      // Verify 4-Stage Dynamic Vector-Tethered Pointer Algorithm on Desktop
      const [pop2, pop3] = dUi.skillPopovers;
      assert(pop2.optionNumber === 2 && pop3.optionNumber === 3, 'Active popovers must be numbered 2 and 3');
      assert(
        !aabbsOverlapWithGap(pop2.rect, pop3.rect, 8),
        `Stage 2 AABB Repulsion failed on Desktop: pop2=${JSON.stringify(pop2.rect)} pop3=${JSON.stringify(pop3.rect)}`,
      );
      assert(
        pop2.polarAngleDeg > pop3.polarAngleDeg,
        `Stage 2 Angle-Sorted Order failed on Desktop: alpha2=${pop2.polarAngleDeg} <= alpha3=${pop3.polarAngleDeg}`,
      );
      for (const pop of dUi.skillPopovers) {
        const sock = dGeo.sockets.find(s => s.index === pop.socketIndex);
        assert(sock, `Target socket ${pop.socketIndex} must exist`);
        const distApexToCenter = Math.hypot(pop.rimApex.x - sock.x, pop.rimApex.y - sock.y);
        const expectedRimDist = sock.radius + 3 * dGeo.scale;
        assert(
          Math.abs(distApexToCenter - expectedRimDist) <= 2.5,
          `Stage 3 Rim Lock-On apex distance mismatch: got ${distApexToCenter.toFixed(2)}, expected ${expectedRimDist.toFixed(2)}`,
        );
        assert(
          pop.tailMode === 'cardinal-edge' || pop.tailMode === 'oblique-corner-chamfer',
          `Stage 4 tailMode must be cardinal-edge or oblique-corner-chamfer, got ${pop.tailMode}`,
        );
        assert(
          pop.rimLockNode && Math.hypot(pop.rimLockNode.x - pop.rimApex.x, pop.rimLockNode.y - pop.rimApex.y) < 0.01,
          'Stage 4 Rim Lock-On Node must be anchored at apex T_i',
        );
      }

      // Verify real-time non-modal movement while Level-Up choices are active
      const heroBeforeMove = await desktopPage.evaluate(() => {
        const api = window.__STRONGHOLD_COMBAT__;
        api.teleport(18.0, 9.0);
        return api.snapshot().hero;
      });
      await desktopPage.keyboard.down('KeyS');
      await desktopPage.evaluate(async () => {
        for (let i = 0; i < 8; i++) {
          await new Promise(resolve => requestAnimationFrame(resolve));
        }
      });
      await desktopPage.keyboard.up('KeyS');
      const heroAfterMove = await desktopPage.evaluate(() => window.__STRONGHOLD_COMBAT__.snapshot().hero);
      const movedDist = Math.hypot(heroAfterMove.u - heroBeforeMove.u, heroAfterMove.v - heroBeforeMove.v);
      assert(movedDist > 0.05, `Hero must be able to move while v5 Level-Up UI is active (movedDist=${movedDist})`);

      // Test keyboard selection [2] (active skill popover)
      const pendingBeforeChoose = await desktopPage.evaluate(() => window.__STRONGHOLD_COMBAT__.snapshot().run.pending);
      await desktopPage.keyboard.press('2');
      await desktopPage.waitForTimeout(200);
      const afterChooseDesktop = await desktopPage.evaluate(() => window.__STRONGHOLD_COMBAT__.snapshot());
      assert(
        afterChooseDesktop.run.pending === pendingBeforeChoose - 1,
        `Selecting option [2] must decrement pending blessing count (before=${pendingBeforeChoose}, after=${afterChooseDesktop.run.pending})`,
      );
      assert(
        afterChooseDesktop.loadout.equippedCount >= 2,
        `Selecting active skill option [2] must equip skill into Crescent Arc socket (equippedCount=${afterChooseDesktop.loadout.equippedCount})`,
      );

      desktopReport = {
        hudGeometry: dGeo,
        blessingUi: dUi,
        movedDistDuringLevelUp: +movedDist.toFixed(3),
        screenshots: [desktopHudShot, desktopV5Shot],
      };
    } finally {
      await browser.close();
    }

    // -------------------------------------------------------------------------
    // 2. MOBILE PORTRAIT (9:16 - 430x932)
    // -------------------------------------------------------------------------
    browser = await chromium.launch(launchOptions());
    let mobileReport;
    try {
      const mobileCtx = await browser.newContext({
        viewport: { width: 430, height: 932 },
        deviceScaleFactor: 1,
        isMobile: true,
        hasTouch: true,
      });
      const mobilePage = await mobileCtx.newPage();
      mobilePage.on('pageerror', err => consoleErrors.push(`mobile: ${String(err)}`));

      await mobilePage.goto(url, { waitUntil: 'domcontentloaded' });
      await mobilePage.waitForFunction(
        () => Boolean(window.__PIXI_UI__ && window.__STRONGHOLD_COMBAT__ && document.querySelector('#world-canvas')?.dataset.ready === 'true'),
        null,
        { timeout: 90000 },
      );

      if (await mobilePage.evaluate(() => Boolean(window.__PIXI_UI__?.picker?.isOpen()))) {
        await mobilePage.keyboard.press('Enter');
        await mobilePage.waitForFunction(() => !window.__PIXI_UI__?.picker?.isOpen(), null, { timeout: 10000 });
      }
      await mobilePage.evaluate(() => window.__COOP__?.net?.leave());
      await mobilePage.waitForTimeout(250);

      await mobilePage.evaluate(() => {
        const api = window.__STRONGHOLD_COMBAT__;
        api.teleport(17.5, 8.2);
        api.summon(18.1, 8.5, 2);
        api.summon(17.2, 8.9, 2);
        api.castSkill('rift-bolt', { targetU: 18.1, targetV: 8.5, forceCrit: true });
      });
      await mobilePage.waitForTimeout(300);

      // Screenshot 3: Mobile Portrait HUD Alternative B (clean combat state)
      const mobileHudShot = path.join(OUT_DIR, 'hud-alt-b-mobile-verify.png');
      await mobilePage.screenshot({ path: mobileHudShot, timeout: 60000, animations: 'allow' });

      // Trigger v5 Level-Up Blessing UI on Mobile Portrait
      const mobileSnap = await mobilePage.evaluate(() => {
        const api = window.__STRONGHOLD_COMBAT__;
        api.offer(['vitality', 'cinder-step', 'flame-fan']);
        return api.snapshot();
      });
      await mobilePage.waitForTimeout(250);

      // Screenshot 4: Mobile Portrait v5 Non-Modal Level-Up Blessing UI
      const mobileV5Shot = path.join(OUT_DIR, 'level-up-v5-mobile-verify.png');
      await mobilePage.screenshot({ path: mobileV5Shot, timeout: 60000, animations: 'allow' });

      const mUi = mobileSnap.blessingUi;
      const mGeo = mobileSnap.hudGeometry;
      assert(mGeo.sockets.length === 3, 'Mobile Alternative B Crescent Action Arc must expose 3 skill sockets');
      assert(mUi.active === true, 'Mobile v5 Level-Up Blessing overlay must be active');
      assert(mUi.passiveBanners.length === 1 && mUi.passiveBanners[0].optionNumber === 1, 'Mobile Option 1 passive banner must be present');
      assert(mUi.skillPopovers.length === 2, 'Mobile Options 2 and 3 must render as vector-tethered popovers');

      const [mPop2, mPop3] = mUi.skillPopovers;
      assert(
        !aabbsOverlapWithGap(mPop2.rect, mPop3.rect, 6),
        `Stage 2 AABB Repulsion failed on Mobile Portrait: pop2=${JSON.stringify(mPop2.rect)} pop3=${JSON.stringify(mPop3.rect)}`,
      );
      assert(
        mPop2.polarAngleDeg > mPop3.polarAngleDeg,
        `Stage 2 Angle-Sorted Order failed on Mobile Portrait: alpha2=${mPop2.polarAngleDeg} <= alpha3=${mPop3.polarAngleDeg}`,
      );

      mobileReport = {
        hudGeometry: mGeo,
        blessingUi: mUi,
        screenshots: [mobileHudShot, mobileV5Shot],
      };
    } finally {
      await browser.close();
    }

    assert(consoleErrors.length === 0, `Page runtime errors detected: ${consoleErrors.join('; ')}`);

    const report = {
      ok: true,
      desktop: desktopReport,
      mobilePortrait: mobileReport,
    };
    const reportPath = path.join(OUT_DIR, 'verify-hud-alt-b-v5.json');
    await writeFile(reportPath, JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
  } finally {
    server.kill('SIGTERM');
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
