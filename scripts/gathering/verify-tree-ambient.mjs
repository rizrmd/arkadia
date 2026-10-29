import {chromium} from 'playwright';
import {createServer} from 'vite';
import {launchOptions} from '../typography/browser.mjs';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';

const outDir = 'docs/tree-ambient-lighting';
await fs.mkdir(outDir, {recursive: true});

// Copy original reported chat attachments into docs/tree-ambient-lighting
await fs.copyFile('/home/dev/attachments/DAea81d9a9541e592492dfa145.png', `${outDir}/DAea81d9a9541e592492dfa145.png`);
await fs.copyFile('/home/dev/attachments/DA51f6add5dd65bd860907acec.png', `${outDir}/DA51f6add5dd65bd860907acec.png`);

let publishedMap = {schema: 1, revision: 0, name: 'Legacy fixture', objects: []};
try {
  const res = await fetch('https://arkodia.online/api/environment/published');
  if (res.ok) publishedMap = await res.json();
} catch {}

const report = {
  taskId: 'ovqaasjeexjisrzjxvlhxjie',
  checkedAt: new Date().toISOString(),
  publishedMapRevision: publishedMap.revision,
  errors: [],
  checks: [],
};

const vite = await createServer({
  server: {host: '127.0.0.1', port: 5628, strictPort: true, hmr: false, watch: null},
  logLevel: 'error',
});
await vite.listen();

const browser = await chromium.launch({
  ...launchOptions(),
  args: launchOptions().args.filter(a => a !== '--single-process'),
});

try {
  // 1. Component-level check: setAmbient modulates layer & animalsLayer and multiplies with child hover/flash tints
  const compPage = await browser.newPage({viewport: {width: 900, height: 600}});
  compPage.on('pageerror', e => report.errors.push(`component: ${e.message}`));
  const html = `<!doctype html><html><body style="margin:0;background:#1d192b"><script type="module" src="/scripts/gathering/component-entry.js"></script></body></html>`;
  await compPage.route('**/gathering-component', r => r.fulfill({contentType: 'text/html', body: html}));
  await compPage.route('**/api/environment/published*', r => r.fulfill({json: {schema: 1, revision: 0, name: 'fixture', objects: []}}));
  await compPage.goto('http://127.0.0.1:5628/gathering-component');
  await compPage.waitForFunction(() => window.test, null, {timeout: 30000, polling: 100});

  const compCheck = await compPage.evaluate(() => {
    const g = window.test.g;
    const daySnap = g.snapshot();
    g.setAmbient(0x5c4f78);
    window.test.steps(1);
    const nightSnap = g.snapshot();
    return {
      dayAmbient: daySnap.ambient,
      dayAnimalsAmbient: daySnap.animalsAmbient,
      nightAmbient: nightSnap.ambient,
      nightAnimalsAmbient: nightSnap.animalsAmbient,
      sampleTreeDay: daySnap.trees[0],
      sampleTreeNight: nightSnap.trees[0],
    };
  });

  assert.equal(compCheck.dayAmbient, 0xffffff, 'Default gathering layer ambient tint should be 0xffffff');
  assert.equal(compCheck.dayAnimalsAmbient, 0xffffff, 'Default animals layer ambient tint should be 0xffffff');
  assert.equal(compCheck.nightAmbient, 0x5c4f78, 'Night gathering layer ambient tint should be 0x5c4f78');
  assert.equal(compCheck.nightAnimalsAmbient, 0x5c4f78, 'Night animals layer ambient tint should be 0x5c4f78');
  assert.equal(compCheck.sampleTreeNight.tint, 0xffffff, 'Child tree sprite local tint remains 0xffffff');
  report.component = compCheck;
  report.checks.push('Component harness: gathering.setAmbient(0x5c4f78) updates both harvestable trees layer and wildlife layer while preserving child sprite local tint.');
  await compPage.close();

  // 2. Full game scene at Night (?time=0.02) and Day (?time=0.50)
  const page = await browser.newPage({viewport: {width: 1280, height: 800}});
  page.on('pageerror', e => report.errors.push(`game: ${e.message}`));
  page.setDefaultTimeout(120000);
  await page.route('**/api/environment/published*', r => r.fulfill({json: publishedMap}));
  await page.addInitScript(() => localStorage.setItem('arkodia.hero', 'ember-warden'));

  const waitReady = () =>
    page.waitForFunction(
      () => {
        if (document.body.innerText.includes('could not load')) throw Error(document.body.innerText);
        return (
          window.__GATHERING__ &&
          window.__STRONGHOLD_COMBAT__ &&
          document.querySelector('#world-canvas')?.dataset.ready === 'true' &&
          !document.querySelector('#loading-screen')
        );
      },
      null,
      {timeout: 180000, polling: 500},
    );

  await page.goto('http://127.0.0.1:5628/?time=0.02&3d=0&shadowField=0', {waitUntil: 'domcontentloaded'});
  await waitReady();

  // Teleport near a dead-tree cluster in the Frozen Frontier so multiple dead-trees & ruins are visible in frame
  const nightState = await page.evaluate(() => {
    const c = window.__STRONGHOLD_COMBAT__;
    const g = window.__GATHERING__;
    c.clearFoes();
    const snap = g.snapshot();
    const deadTrees = snap.trees.filter(t => t.kind === 'dead-tree' && !t.down);
    let chosen = null;
    for (const t of deadTrees) {
      for (let i = 0; i < 32; i++) {
        const a = (i * Math.PI) / 16;
        // Stand ~2.2 tiles away so hero does not auto-chop the tree before screenshot
        if (c.teleport(t.u + Math.cos(a) * 2.2, t.v + Math.sin(a) * 2.2)) {
          chosen = {id: t.id, u: t.u, v: t.v, heroU: t.u + Math.cos(a) * 2.2, heroV: t.v + Math.sin(a) * 2.2};
          break;
        }
      }
      if (chosen) break;
    }
    c.clearFoes();
    const afterSnap = g.snapshot();
    return {
      ambientHex: '0x' + afterSnap.ambient.toString(16).padStart(6, '0'),
      ambient: afterSnap.ambient,
      animalsAmbientHex: '0x' + afterSnap.animalsAmbient.toString(16).padStart(6, '0'),
      animalsAmbient: afterSnap.animalsAmbient,
      treeCount: afterSnap.trees.length,
      deadTreeCount: deadTrees.length,
      chosenTree: chosen,
      sampleTrees: afterSnap.trees.slice(0, 5).map(t => ({
        id: t.id,
        kind: t.kind,
        tint: '0x' + t.tint.toString(16).padStart(6, '0'),
        groupColor: '0x' + (t.groupColor >>> 0).toString(16).padStart(6, '0'),
      })),
    };
  });

  await page.waitForTimeout(600);
  await page.screenshot({path: `${outDir}/night-after-desktop.png`});
  await page.setViewportSize({width: 844, height: 390});
  await page.waitForTimeout(400);
  await page.screenshot({path: `${outDir}/night-after-landscape.png`});

  assert(nightState.ambient < 0xffffff, `Expected night ambient < 0xffffff, got ${nightState.ambientHex}`);
  assert.equal(nightState.ambient, nightState.animalsAmbient, 'Trees and wildlife layers must share night ambient tint');
  report.night = nightState;
  report.checks.push(`Full game night (?time=0.02): gathering layer and wildlife layer ambient tint synchronized to ${nightState.ambientHex} across ${nightState.treeCount} trees.`);

  // Now check noon day (?time=0.5) at the exact same tree coordinates
  await page.setViewportSize({width: 1280, height: 800});
  await page.goto('http://127.0.0.1:5628/?time=0.5&3d=0&shadowField=0', {waitUntil: 'domcontentloaded'});
  await waitReady();

  const dayState = await page.evaluate(chosen => {
    const c = window.__STRONGHOLD_COMBAT__;
    const g = window.__GATHERING__;
    c.clearFoes();
    if (chosen) c.teleport(chosen.heroU, chosen.heroV);
    c.clearFoes();
    const afterSnap = g.snapshot();
    return {
      ambientHex: '0x' + afterSnap.ambient.toString(16).padStart(6, '0'),
      ambient: afterSnap.ambient,
      animalsAmbientHex: '0x' + afterSnap.animalsAmbient.toString(16).padStart(6, '0'),
      animalsAmbient: afterSnap.animalsAmbient,
      sampleTrees: afterSnap.trees.slice(0, 5).map(t => ({
        id: t.id,
        kind: t.kind,
        tint: '0x' + t.tint.toString(16).padStart(6, '0'),
        groupColor: '0x' + (t.groupColor >>> 0).toString(16).padStart(6, '0'),
      })),
    };
  }, nightState.chosenTree);

  await page.waitForTimeout(600);
  await page.screenshot({path: `${outDir}/day-after-desktop.png`});

  assert.equal(dayState.ambient, 0xffffff, `Expected noon ambient 0xffffff, got ${dayState.ambientHex}`);
  assert.equal(dayState.animalsAmbient, 0xffffff, `Expected noon animalsAmbient 0xffffff, got ${dayState.animalsAmbientHex}`);
  report.day = dayState;
  report.checks.push(`Full game day (?time=0.5): gathering layer and wildlife layer ambient tint restored to ${dayState.ambientHex}.`);

  assert.deepEqual(report.errors, []);
  report.passed = true;
  console.log(JSON.stringify(report, null, 2));
} finally {
  await fs.writeFile(`${outDir}/verification.json`, JSON.stringify(report, null, 2));
  await browser.close();
  await vite.close();
}
