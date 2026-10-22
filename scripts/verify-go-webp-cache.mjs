import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import sharp from 'sharp';

const out = 'docs/go-webp-cache';
await fs.mkdir(out, {recursive: true});

const port = '8798';
const server = spawn('server/bin/arkadia', [], {
  env: {...process.env, PORT: port, SITE_DIR: 'dist'},
  stdio: ['ignore', 'pipe', 'inherit']
});

await new Promise((ok, no) => {
  server.stdout.on('data', d => {
    if (String(d).includes('listening')) ok();
  });
  server.on('exit', c => no(new Error('server exited ' + c)));
});

const launch = () => chromium.launch({
  headless: true,
  env: {...process.env, LD_LIBRARY_PATH: '/home/dev/.local/browser-libs/usr/lib/x86_64-linux-gnu:/opt/fural-antigravity-glibc'},
  args: ['--no-sandbox', '--no-zygote', '--single-process']
});

let browser = null;
try {
  browser = await launch();
  const page = await (await browser.newContext({viewport: {width: 1440, height: 900}})).newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));

  const pngResponses = [];
  const loadingLabels = [];
  await page.addInitScript(() => {
    window.__loadingLabels = [];
    addEventListener('DOMContentLoaded', () => {
      const s = document.querySelector('#loading-screen');
      if (!s) return;
      const rec = () => {
        const txt = s.querySelector('.loading-label')?.textContent || '';
        if (txt && !window.__loadingLabels.includes(txt)) window.__loadingLabels.push(txt);
      };
      rec();
      new MutationObserver(rec).observe(s, {subtree: true, childList: true, characterData: true, attributes: true});
    });
  });

  page.on('response', r => {
    const u = new URL(r.url());
    if (u.pathname.endsWith('.png') && r.status() === 200) {
      pngResponses.push({
        path: u.pathname,
        contentType: r.headers()['content-type'],
        format: r.headers()['x-asset-format'],
        cache: r.headers()['x-asset-cache'],
        originalBytes: Number(r.headers()['x-asset-original-bytes'] || 0),
        webpBytes: Number(r.headers()['content-length'] || 0)
      });
    }
  });

  await page.goto(`http://127.0.0.1:${port}/?time=0.5`);
  await page.waitForFunction(
    () => document.querySelector('#world-canvas')?.dataset.ready === 'true' && !document.querySelector('#loading-screen'),
    null,
    {timeout: 120000}
  );
  await page.waitForTimeout(600);

  const labels = await page.evaluate(() => window.__loadingLabels || []);
  await sharp(await page.screenshot()).webp({quality: 86}).toFile(`${out}/stronghold-loaded-desktop.webp`);

  assert.equal(errors.length, 0, 'Page errors: ' + errors.join('; '));
  assert(pngResponses.length >= 20, `Expected >=20 PNG requests served as WebP, got ${pngResponses.length}`);

  let totalOriginalBytes = 0;
  let totalWebpBytes = 0;
  for (const r of pngResponses) {
    assert.equal(r.contentType, 'image/webp', `${r.path} must be served as image/webp`);
    assert.equal(r.format, 'webp-lossless', `${r.path} must have x-asset-format: webp-lossless`);
    assert(r.webpBytes > 0 && r.webpBytes < r.originalBytes, `${r.path} WebP (${r.webpBytes}) must be smaller than PNG (${r.originalBytes})`);
    totalOriginalBytes += r.originalBytes;
    totalWebpBytes += r.webpBytes;
  }

  const m = labels.map(l => l.match(/of ([\d.]+) MB/)).find(Boolean);
  const initialLoadingMB = m ? Number(m[1]) : 0;
  assert(initialLoadingMB > 0 && initialLoadingMB <= 8.0, `Expected initial loading <= 8.0 MB, got ${initialLoadingMB} MB (${labels.join(', ')})`);

  const report = {
    verifiedAt: new Date().toISOString(),
    initialLoadingMB,
    pngFilesConverted: pngResponses.length,
    totalOriginalMB: +(totalOriginalBytes / 1e6).toFixed(2),
    totalWebpMB: +(totalWebpBytes / 1e6).toFixed(2),
    savedMB: +((totalOriginalBytes - totalWebpBytes) / 1e6).toFixed(2),
    savedPercent: +(((totalOriginalBytes - totalWebpBytes) * 100) / totalOriginalBytes).toFixed(1),
    sampleLoadingLabels: labels.slice(0, 10),
    assets: pngResponses.sort((a, b) => b.originalBytes - a.originalBytes)
  };

  await fs.writeFile(`${out}/verification.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({
    initialLoadingMB: report.initialLoadingMB,
    pngFilesConverted: report.pngFilesConverted,
    totalOriginalMB: report.totalOriginalMB,
    totalWebpMB: report.totalWebpMB,
    savedMB: report.savedMB,
    savedPercent: report.savedPercent,
    sampleLoadingLabels: report.sampleLoadingLabels
  }, null, 2));
} finally {
  await browser?.close();
  server.kill();
}
