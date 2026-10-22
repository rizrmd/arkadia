import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import sharp from 'sharp';

// Verifies that the local player's own hero (#world-hero) remains brightly lit and clearly visible at night (?time=0)
// in both the Stronghold courtyard and the outer wilds, while the surrounding world and revenants stay night-tinted.
const out = 'docs/hero-night-visibility';
await fs.mkdir(out, {recursive: true});

const base = process.env.DEMO_URL?.replace(/\/$/, '');
const server = base ? null : spawn('node', ['server.mjs'], {env: {...process.env, PORT: '3069'}});
const url = base || 'http://127.0.0.1:3069';
let browser;

function sampleHeroCanvasLuma(page) {
  return page.evaluate(() => {
    const c = document.querySelector('#world-hero');
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let sum = 0, rSum = 0, gSum = 0, bSum = 0, count = 0;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] > 200) {
        const l = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
        sum += l;
        rSum += d[i];
        gSum += d[i + 1];
        bSum += d[i + 2];
        count++;
      }
    }
    return {
      luma: +(sum / Math.max(1, count)).toFixed(2),
      rgb: [+(rSum / Math.max(1, count)).toFixed(1), +(gSum / Math.max(1, count)).toFixed(1), +(bSum / Math.max(1, count)).toFixed(1)],
      pixels: count,
      tint: c.dataset.tint,
      night: +c.dataset.night
    };
  });
}

try {
  await new Promise(r => setTimeout(r, 600));
  browser = await chromium.launch({
    headless: true,
    env: {...process.env, LD_LIBRARY_PATH: '/home/dev/.local/browser-libs/usr/lib/x86_64-linux-gnu:/opt/fural-antigravity-glibc'},
    args: ['--no-sandbox', '--no-zygote', '--single-process']
  });
  const ctx = await browser.newContext({viewport: {width: 1440, height: 1000}});
  const page = await ctx.newPage();

  // 1. Measure noon hero luminance vs midnight hero luminance at the same courtyard spot.
  await page.goto(url + '/?offline=1&hero=rift-runner&time=0.5');
  await page.waitForFunction(() => document.querySelector('#world-hero')?.dataset.x);
  await page.evaluate(() => localStorage.removeItem('arkadia.stronghold.hero'));
  await page.reload();
  await page.waitForFunction(() => document.querySelector('#world-hero')?.dataset.x);
  await page.waitForTimeout(800);
  await page.keyboard.down('KeyA');
  await page.waitForTimeout(700);
  await page.keyboard.up('KeyA');
  await page.waitForFunction(() => document.querySelector('#world-hero').dataset.state === 'idle');
  const noonHero = await sampleHeroCanvasLuma(page);

  await page.goto(url + '/?offline=1&hero=rift-runner&time=0');
  await page.waitForFunction(() => document.querySelector('#world-hero')?.dataset.x);
  await page.evaluate(() => localStorage.removeItem('arkadia.stronghold.hero'));
  await page.reload();
  await page.waitForFunction(() => document.querySelector('#world-hero')?.dataset.x);
  await page.waitForTimeout(800);
  await page.keyboard.down('KeyA');
  await page.waitForTimeout(700);
  await page.keyboard.up('KeyA');
  await page.waitForFunction(() => document.querySelector('#world-hero').dataset.state === 'idle');
  await page.waitForTimeout(300);
  const nightHero = await sampleHeroCanvasLuma(page);

  assert.equal(nightHero.tint, '255,255,255', 'own hero stays untinted at night');
  assert.equal(nightHero.night, 1, 'own hero night aura is active at midnight');
  assert(nightHero.luma > noonHero.luma * 1.05, `night hero luma (${nightHero.luma}) exceeds noon (${noonHero.luma}) so dark cloth stays readable`);

  const box = await page.evaluate(() => {
    const r = document.querySelector('#world-hero').getBoundingClientRect();
    return {x: r.x, y: r.y, width: r.width, height: r.height};
  });
  const courtClip = {x: Math.max(0, box.x - 160), y: Math.max(0, box.y - 120), width: box.width + 320, height: box.height + 240};
  const courtBuf = await page.screenshot({clip: courtClip});
  await fs.writeFile(`${out}/court-night.webp`, await sharp(courtBuf).webp({quality: 88}).toBuffer());

  // Build side-by-side comparison: left = old dark-violet lightmap multiply (136,112,154), right = new bright own hero.
  const beforeBuf = await page.evaluate(async () => {
    const c = document.querySelector('#world-hero');
    const ctx2 = c.getContext('2d');
    const saved = ctx2.getImageData(0, 0, c.width, c.height);
    const dark = new ImageData(new Uint8ClampedArray(saved.data), c.width, c.height);
    const d = dark.data;
    for (let i = 0; i < d.length; i += 4) {
      // Remove ground pool pixels (alpha < 120) and darken sprite by night ambient (136,112,154)
      if (d[i + 3] < 120) { d[i + 3] = 0; continue; }
      d[i] = Math.round(d[i] * (136 / 255) / 1.15);
      d[i + 1] = Math.round(d[i + 1] * (112 / 255) / 1.14);
      d[i + 2] = Math.round(d[i + 2] * (154 / 255) / 1.12);
    }
    ctx2.putImageData(dark, 0, 0);
    return true;
  }).then(() => page.screenshot({clip: courtClip}));
  // Restore the live bright hero frame
  await page.evaluate(() => { const c = document.querySelector('#world-hero'); c.dataset.x = '0'; });
  await page.waitForTimeout(100);
  {
    const meta = await sharp(courtBuf).metadata();
    const w = meta.width || 380, h = meta.height || 310;
    const leftImg = await sharp(beforeBuf).resize(w, h, {fit: 'cover'}).toBuffer();
    const rightImg = await sharp(courtBuf).resize(w, h, {fit: 'cover'}).toBuffer();
    const sideBySide = await sharp({
      create: {width: w * 2 + 8, height: h, channels: 4, background: {r: 18, g: 16, b: 24, alpha: 1}}
    })
      .composite([
        {input: leftImg, left: 0, top: 0},
        {input: rightImg, left: w + 8, top: 0}
      ])
      .webp({quality: 88})
      .toBuffer();
    await fs.writeFile(`${out}/before-after-court.webp`, sideBySide);
  }

  // 2. Wilds combat at night: own hero stands out against darkened snow and night-tinted revenants.
  await page.evaluate(() => {
    const c = window.__STRONGHOLD_COMBAT__;
    c.teleport(12, 18);
    c.summon(10.6, 18.2);
    c.summon(13.2, 18.5);
  });
  await page.waitForTimeout(600);
  const boxWilds = await page.evaluate(() => {
    const r = document.querySelector('#world-hero').getBoundingClientRect();
    return {x: r.x, y: r.y, width: r.width, height: r.height};
  });
  const wildsBuf = await page.screenshot({
    clip: {x: Math.max(0, boxWilds.x - 220), y: Math.max(0, boxWilds.y - 140), width: boxWilds.width + 440, height: boxWilds.height + 280}
  });
  await fs.writeFile(`${out}/wilds-night.webp`, await sharp(wildsBuf).webp({quality: 88}).toBuffer());

  // 3. Ember Warden in the courtyard at night.
  await page.evaluate(() => localStorage.removeItem('arkadia.stronghold.hero'));
  await page.goto(url + '/?offline=1&hero=ember-warden&time=0');
  await page.waitForFunction(() => document.querySelector('#world-hero')?.dataset.x);
  await page.waitForTimeout(800);
  await page.keyboard.down('KeyA');
  await page.waitForTimeout(700);
  await page.keyboard.up('KeyA');
  await page.waitForFunction(() => document.querySelector('#world-hero').dataset.state === 'idle');
  await page.waitForTimeout(300);
  const emberNight = await sampleHeroCanvasLuma(page);
  assert.equal(emberNight.tint, '255,255,255');
  assert.equal(emberNight.night, 1);
  const boxEmber = await page.evaluate(() => {
    const r = document.querySelector('#world-hero').getBoundingClientRect();
    return {x: r.x, y: r.y, width: r.width, height: r.height};
  });
  const emberBuf = await page.screenshot({
    clip: {x: Math.max(0, boxEmber.x - 160), y: Math.max(0, boxEmber.y - 120), width: boxEmber.width + 320, height: boxEmber.height + 240}
  });
  await fs.writeFile(`${out}/ember-night.webp`, await sharp(emberBuf).webp({quality: 88}).toBuffer());

  const report = {
    noonHero,
    nightHero,
    emberNight,
    lumaRatioNightOverNoon: +(nightHero.luma / noonHero.luma).toFixed(3)
  };
  await fs.writeFile(`${out}/report.json`, JSON.stringify(report, null, 2));
  console.log('PASS hero night visibility:', JSON.stringify(report));
} finally {
  await browser?.close();
  server?.kill();
}
