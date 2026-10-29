import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { launchOptions } from './typography/browser.mjs';

const out = 'docs/gate-hud-spacing';
const base = process.env.BASE || 'http://127.0.0.1:8817';
const server = process.env.BASE ? null : spawn('node', ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', '8817'], { stdio: 'pipe' });
let browser;
try {
 await mkdir(out, { recursive: true });
 if (server) await new Promise((resolve, reject) => {
  server.stdout.on('data', d => { if (String(d).includes('8817')) resolve(); });
  server.on('exit', code => reject(new Error(`Preview exited: ${code}`)));
 });
 browser = await chromium.launch(launchOptions());
 const page = await browser.newPage();
 const errors = [], reports = [];
 page.on('pageerror', e => errors.push(e.message));
 await page.goto(`${base}/?offline=1&time=0.5`);
 await page.waitForFunction(() => window.__STRONGHOLD_COMBAT__?.hud && window.__PIXI_UI__?.app && document.querySelector('#world-canvas')?.dataset.ready === 'true', null, { timeout: 90000 });
 await page.evaluate(() => {
  if (window.__PIXI_UI__?.picker?.isOpen()) window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter' }));
  window.__COOP__?.net?.leave();
 });
 for (const [name, width, height] of [['portrait',390,844],['narrow',320,640],['landscape',844,390],['desktop',1440,900]]) {
  await page.setViewportSize({ width, height });
  await page.waitForTimeout(400);
  for (const gold of [160, 999999999]) {
   const report = await page.evaluate(({ width, height, gold }) => {
    const hud = window.__STRONGHOLD_COMBAT__.hud;
    hud.setGold(gold); hud.setTime('123:59'); hud.setXp(99999, 100000);
    hud.layout(width, height);
    window.__PIXI_UI__.app.ticker.stop();
    window.__PIXI_UI__.app.render();
    const bounds = t => { const b = t.getBounds(); return { top:b.minY, bottom:b.maxY }; };
    const xp = bounds(hud.playerConsole.rows[2].plate);
    const clock = hud.trRibbonClockHit.hitArea;
    return { mobile:hud.isMobile, xp, panelTop:clock.y, gap:clock.y-xp.bottom, gold:bounds(hud.trRibbonGoldText), time:bounds(hud.trRibbonClockText), gateAlpha:hud.worldGateBar.alpha, script:document.querySelector('script[type=module][src*="/assets/"]')?.getAttribute('src') };
   }, { width, height, gold });
   if (report.gateAlpha !== 0.6) throw Error(`${name}: gate opacity ${report.gateAlpha}`);
   if (report.mobile && (report.gap < 3.99 || report.gold.top < report.xp.bottom || report.time.top < report.xp.bottom)) throw Error(`${name}: overlap ${JSON.stringify(report)}`);
   reports.push({ name, width, height, amount:gold, ...report });
  }
  await page.screenshot({ path:`${out}/${process.env.BASE ? 'live-' : ''}${name}.png` });
 }
 if (errors.length) throw Error(errors.join('\n'));
 await writeFile(`${out}/${process.env.BASE ? 'live-' : ''}verification.json`, JSON.stringify({ base, reports, errors }, null, 2));
 console.log(JSON.stringify(reports));
} finally { await browser?.close(); server?.kill(); }
