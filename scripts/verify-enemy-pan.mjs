import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';

const port = process.env.PORT || '3187';
const url = process.env.VERIFY_URL || `http://127.0.0.1:${port}`;
const server = process.env.VERIFY_URL
 ? null
 : spawn('npx', ['vite', '--host', '127.0.0.1', '--port', port], {stdio: ['ignore', 'pipe', 'inherit']});
let browser;

try {
 if (server) {
  await new Promise((ok, no) => {
   server.stdout.on('data', d => {
    if (String(d).includes(port)) ok();
   });
   server.on('exit', c => no(new Error('vite exited ' + c)));
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
 const page = await browser.newPage({viewport: {width: 1280, height: 800}});
 const errors = [];
 page.on('pageerror', e => errors.push(e.message));
 await page.addInitScript(() => {
  localStorage.setItem('arkodia.stronghold.hero.id', 'rift-runner');
 });
 await page.goto(url + '/?offline=1&time=0.5');
 await page.waitForFunction(() => document.querySelector('#world-canvas')?.dataset.ready === 'true' && window.__STRONGHOLD_COMBAT__, null, {timeout: 60000});

 // Place the hero near the gate and summon a revenant just outside the safe zone so both are clearly on screen.
 await page.evaluate(() => {
  const c = window.__STRONGHOLD_COMBAT__;
  for (let u = 16; u < 24; u += 0.5) {
   for (let v = 16; v < 24; v += 0.5) {
    if (c.clear(u, v) && c.clear(u + 1.5, v + 1) && c.teleport(u, v)) {
     const idx = c.summon(u + 1.5, v + 1);
     if (idx >= 0) return {hero: {u, v}, foeIndex: idx};
    }
   }
  }
  throw new Error('Could not place hero and foe fixture');
 });
 await page.waitForTimeout(300);

 // Start per-frame sampler after the game's rAF loops.
 await page.evaluate(() => {
  const xy = el => {
   const m = /translate3d\(([-\d.e]+)px,\s*([-\d.e]+)px/.exec(el?.style.transform || '');
   return m ? [+m[1], +m[2]] : [NaN, NaN];
  };
  const scaleOf = el => {
   const m = /scale\(([-\d.e]+)\)/.exec(el?.style.transform || '');
   return m ? +m[1] : 1;
  };
  const surface = document.querySelector('#world-surface');
  const hero = document.querySelector('#world-hero');
  const bar = document.querySelector('#hero-health');
  window.__PAN_TRACE__ = {samples: [], on: true};
  const tick = now => {
   if (!window.__PAN_TRACE__.on) return;
   const foeEls = [...document.querySelectorAll('#world-foes-back canvas:not([hidden]), #world-foes-front canvas:not([hidden])')];
   window.__PAN_TRACE__.samples.push({
    t: now,
    surface: xy(surface),
    scale: scaleOf(surface),
    hero: xy(hero),
    heroWorld: [+hero.dataset.x, +hero.dataset.y],
    bar: xy(bar),
    foes: foeEls.map(el => ({screen: xy(el), world: [+el.dataset.x, +el.dataset.y]}))
   });
   requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
 });

 // Perform a brisk multi-step camera pan drag across the screen and back.
 await page.mouse.move(640, 400);
 await page.mouse.down();
 await page.mouse.move(480, 310, {steps: 14});
 await page.mouse.move(760, 470, {steps: 14});
 await page.mouse.move(600, 380, {steps: 10});
 await page.mouse.up();
 await page.waitForTimeout(200);

 const samples = await page.evaluate(() => {
  window.__PAN_TRACE__.on = false;
  return window.__PAN_TRACE__.samples;
 });

 const baseline = samples[0];
 assert.ok(baseline && baseline.foes.length > 0, 'at least one foe canvas visible during pan');

 const baseHeroRel = [
  baseline.hero[0] - baseline.surface[0] - baseline.heroWorld[0] * baseline.scale,
  baseline.hero[1] - baseline.surface[1] - baseline.heroWorld[1] * baseline.scale
 ];
 const baseBarRel = [
  baseline.bar[0] - baseline.surface[0] - baseline.heroWorld[0] * baseline.scale,
  baseline.bar[1] - baseline.surface[1] - baseline.heroWorld[1] * baseline.scale
 ];
 const baseFoeRel = [
  baseline.foes[0].screen[0] - baseline.surface[0] - baseline.foes[0].world[0] * baseline.scale,
  baseline.foes[0].screen[1] - baseline.surface[1] - baseline.foes[0].world[1] * baseline.scale
 ];

 const heroDrifts = [];
 const barDrifts = [];
 const foeDrifts = [];
 let panFrames = 0;

 for (let i = 1; i < samples.length; i++) {
  const prev = samples[i - 1];
  const s = samples[i];
  const camStep = Math.hypot(s.surface[0] - prev.surface[0], s.surface[1] - prev.surface[1]);
  if (camStep > 0.5) panFrames++;

  const hRel = [
   s.hero[0] - s.surface[0] - s.heroWorld[0] * s.scale,
   s.hero[1] - s.surface[1] - s.heroWorld[1] * s.scale
  ];
  heroDrifts.push(Math.hypot(hRel[0] - baseHeroRel[0], hRel[1] - baseHeroRel[1]));

  const bRel = [
   s.bar[0] - s.surface[0] - s.heroWorld[0] * s.scale,
   s.bar[1] - s.surface[1] - s.heroWorld[1] * s.scale
  ];
  barDrifts.push(Math.hypot(bRel[0] - baseBarRel[0], bRel[1] - baseBarRel[1]));

  for (const f of s.foes) {
   const fRel = [
    f.screen[0] - s.surface[0] - f.world[0] * s.scale,
    f.screen[1] - s.surface[1] - f.world[1] * s.scale
   ];
   foeDrifts.push(Math.hypot(fRel[0] - baseFoeRel[0], fRel[1] - baseFoeRel[1]));
  }
 }

 const maxHeroDrift = Math.max(...heroDrifts);
 const maxBarDrift = Math.max(...barDrifts);
 const maxFoeDrift = Math.max(...foeDrifts);

 await fs.mkdir('docs/enemy-pan', {recursive: true});
 await page.screenshot({path: 'docs/enemy-pan/pan-synced.webp', type: 'webp', quality: 88});
 await fs.copyFile('docs/enemy-pan/pan-synced.webp', 'docs/coop/enemy-pan-synced.webp');
 const report = {
  url,
  samples: samples.length,
  panFrames,
  maxHeroDriftPx: +maxHeroDrift.toFixed(4),
  maxBarDriftPx: +maxBarDrift.toFixed(4),
  maxFoeDriftPx: +maxFoeDrift.toFixed(4),
  errors
 };
 await fs.writeFile('docs/enemy-pan/results.json', JSON.stringify(report, null, 2));
 await fs.writeFile('docs/coop/enemy-pan-results.json', JSON.stringify(report, null, 2));
 console.log(JSON.stringify(report, null, 2));

 assert.ok(panFrames >= 5, `expected at least 5 pan frames, got ${panFrames}`);
 assert.ok(maxHeroDrift < 0.15, `hero drifted ${maxHeroDrift}px during pan`);
 assert.ok(maxBarDrift < 0.15, `hero health bar drifted ${maxBarDrift}px during pan`);
 assert.ok(maxFoeDrift < 0.15, `enemy drifted ${maxFoeDrift}px during pan`);
 assert.deepEqual(errors, []);
} finally {
 await browser?.close();
 server?.kill();
}
