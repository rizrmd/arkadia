import {chromium} from 'playwright';
import {spawn, execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import sharp from 'sharp';

const out = 'docs/fps-tracelog';
await fs.mkdir(out, {recursive: true});

const envGo = {
  ...process.env,
  PATH: `${process.env.HOME}/.local/go/bin:${process.env.HOME}/.local/bin:${process.env.PATH}`,
  CGO_ENABLED: '0',
  GOFLAGS: '-p=1',
  GOMAXPROCS: '2',
  GOMEMLIMIT: '256MiB',
  GOTOOLCHAIN: 'local',
};

if (!process.env.NOBUILD) {
  execFileSync('go', ['build', '-o', 'bin/arkadia', './cmd/arkadia'], {
    cwd: 'server',
    stdio: 'inherit',
    env: envGo,
  });
}

const port = process.env.PORT || '8799';
const baseUrl = process.env.DEMO_URL || `http://127.0.0.1:${port}`;
let server = null;

if (!process.env.DEMO_URL) {
  server = spawn('server/bin/arkadia', [], {
    env: {...process.env, PORT: port, SITE_DIR: 'dist'},
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  await new Promise((ok, no) => {
    server.stdout.on('data', d => {
      if (String(d).includes('listening')) ok();
    });
    server.on('exit', c => no(new Error('server exited ' + c)));
  });
}

const launch = () =>
  chromium.launch({
    headless: true,
    env: {
      ...process.env,
      LD_LIBRARY_PATH: '/home/dev/.local/browser-libs/usr/lib/x86_64-linux-gnu:/opt/fural-antigravity-glibc',
    },
    args: [
      '--no-sandbox',
      '--no-zygote',
      '--single-process',
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader',
    ],
  });

function renderDiagnosticOverlaySvg(entryA, entryB, serverSummary) {
  const frames = entryA.frames.slice(-36);
  const maxDt = Math.max(80, ...frames.map(f => f.dtMs));
  const chartW = 540;
  const chartH = 120;
  const barW = Math.max(6, Math.floor((chartW - frames.length * 2) / Math.max(1, frames.length)));

  const barsSvg = frames
    .map((f, i) => {
      const h = Math.max(4, Math.min(chartH, Math.round((f.dtMs / maxDt) * chartH)));
      const x = 30 + i * (barW + 2);
      const y = 175 - h;
      const color = f.dtMs >= 85 ? '#ff5c5c' : f.dtMs > 33.4 ? '#f5a623' : '#4cd964';
      return `<rect x="${x}" y="${y}" width="${barW}" height="${h}" rx="2" fill="${color}" opacity="0.92"/>`;
    })
    .join('');

  const thresholdY = 175 - Math.round((33.33 / maxDt) * chartH);

  const phases = [
    ['Encounters Render', entryA.metrics.phasesMax.encountersRenderMs, '#f5a623'],
    ['Pixi WebGL Render', entryA.metrics.phasesMax.pixiRenderMs, '#5ac8fa'],
    ['Encounters Step', entryA.metrics.phasesMax.encountersStepMs, '#4cd964'],
    ['World Draw / Place', entryA.metrics.phasesMax.worldDrawMs, '#9b87f5'],
    ['Shadow Cast (Spike)', entryB.metrics.phasesMax.shadowCastMs, '#ff5c5c'],
  ];
  const maxPhase = Math.max(50, ...phases.map(p => p[1]));
  const phaseRowsSvg = phases
    .map(([label, ms, color], idx) => {
      const y = 238 + idx * 28;
      const w = Math.max(6, Math.round((ms / maxPhase) * 280));
      return `
        <text x="30" y="${y + 12}" fill="#d5dce6" font-family="sans-serif" font-size="12" font-weight="600">${label}</text>
        <rect x="190" y="${y}" width="280" height="14" rx="4" fill="#1b2230"/>
        <rect x="190" y="${y}" width="${w}" height="14" rx="4" fill="${color}"/>
        <text x="482" y="${y + 12}" fill="#ffffff" font-family="monospace" font-size="12" font-weight="700">${ms.toFixed(1)} ms</text>
      `;
    })
    .join('');

  return Buffer.from(`
    <svg width="600" height="430" viewBox="0 0 600 430" xmlns="http://www.w3.org/2000/svg">
      <rect x="8" y="8" width="584" height="414" rx="14" fill="#0d1118" fill-opacity="0.92" stroke="#d4af37" stroke-opacity="0.55" stroke-width="1.5"/>
      <text x="30" y="38" fill="#f3d27a" font-family="sans-serif" font-size="15" font-weight="700" letter-spacing="1">FPS DROP TRACELOG TELEMETRY · LIVE SERVER INGESTION</text>
      <text x="30" y="58" fill="#9aa7b8" font-family="monospace" font-size="12">POST /api/tracelogs · ID: ${entryA.id} · Room: ${entryA.scene.room || 'SOLO'} · Hero: ${entryA.scene.hero}</text>

      <text x="30" y="84" fill="#d5dce6" font-family="sans-serif" font-size="12" font-weight="600">Rolling Frame Timeline (dtMs per frame · 30 FPS budget line at 33.3 ms)</text>
      <text x="455" y="84" fill="#f5a623" font-family="monospace" font-size="11" font-weight="700">--- 33.3ms (30 FPS)</text>
      ${barsSvg}
      <line x1="30" y1="${thresholdY}" x2="570" y2="${thresholdY}" stroke="#ffffff" stroke-opacity="0.8" stroke-dasharray="4,4" stroke-width="1.2"/>

      <text x="30" y="218" fill="#f3d27a" font-family="sans-serif" font-size="13" font-weight="700">Subsystem Phase Breakdown (Max ms in Drop Window)</text>
      ${phaseRowsSvg}

      <rect x="30" y="382" width="540" height="28" rx="6" fill="#151c28"/>
      <text x="40" y="400" fill="#7ee787" font-family="monospace" font-size="11" font-weight="700">
        Stored: ${serverSummary.stored} · FPS: ${entryA.metrics.fps} (min ${entryA.metrics.minFps}) · p95: ${entryA.metrics.p95FrameMs}ms · Culprit: ${entryA.metrics.bottleneck}
      </text>
    </svg>
  `);
}

let browser = null;
try {
  browser = await launch();
  const page = await (await browser.newContext({viewport: {width: 1440, height: 900}})).newPage();
  const errors = [];
  const tracelogPosts = [];

  page.on('pageerror', e => errors.push(e.message));
  page.on('response', async r => {
    const u = new URL(r.url());
    if (u.pathname === '/api/tracelogs' && r.request().method() === 'POST') {
      let body = null;
      try {
        body = await r.json();
      } catch {}
      tracelogPosts.push({status: r.status(), body});
    }
  });

  await page.goto(`${baseUrl}/?time=0.45`, {timeout: 180000, waitUntil: 'domcontentloaded'});
  await page.waitForFunction(
    () => document.querySelector('#world-canvas')?.dataset.ready === 'true' && !document.querySelector('#loading-screen'),
    null,
    {timeout: 180000},
  );

  // Walk south out of the gateway into the wilds so revenants and combat VFX are active.
  await page.keyboard.down('KeyS');
  await page.waitForTimeout(6200);
  await page.keyboard.up('KeyS');
  await page.waitForTimeout(800);
  await page.evaluate(() => {
    window.__STRONGHOLD_COMBAT__?.autoCastNow?.();
  });
  await page.waitForTimeout(300);

  // Verify live frame monitoring is running and collecting frame samples.
  const initialStats = await page.evaluate(() => ({
    hasApi: Boolean(window.__FPS_TRACELOG__),
    stats: window.__FPS_TRACELOG__?.stats(),
    recentCount: window.__FPS_TRACELOG__?.recentFrames(30)?.length ?? 0,
  }));
  assert(initialStats.hasApi, 'window.__FPS_TRACELOG__ must be registered');
  assert(initialStats.recentCount >= 5, `Expected >=5 recorded frames, got ${initialStats.recentCount}`);

  // 1. Trigger a sustained low FPS drop (encountersRender bottleneck) and verify automatic POST to /api/tracelogs.
  const dropAResult = await page.evaluate(async () => {
    return await window.__FPS_TRACELOG__.simulateDrop({
      frames: 24,
      dtMs: 52.5,
      phase: 'encountersRender',
      phaseMs: 38.4,
      reason: 'sustained_low_fps',
    });
  });

  assert(dropAResult && dropAResult.entry, 'simulateDrop must return a captured tracelog entry');
  assert.equal(dropAResult.entry.reason, 'sustained_low_fps');
  assert.equal(dropAResult.entry.metrics.bottleneck, 'encounters-render');
  assert(dropAResult.serverResponse?.ok, 'Server must acknowledge sustained_low_fps tracelog with ok=true');

  // 2. Trigger a single-frame spike (shadowCast bottleneck) and verify automatic POST to /api/tracelogs.
  const dropBResult = await page.evaluate(async () => {
    return await window.__FPS_TRACELOG__.simulateDrop({
      frames: 1,
      dtMs: 118.0,
      phase: 'shadowCast',
      phaseMs: 84.2,
      reason: 'frame_spike',
    });
  });

  assert(dropBResult && dropBResult.entry, 'simulateDrop spike must return a captured tracelog entry');
  assert.equal(dropBResult.entry.reason, 'frame_spike');
  assert.equal(dropBResult.entry.metrics.bottleneck, 'shadow-cast');
  assert(dropBResult.serverResponse?.ok, 'Server must acknowledge frame_spike tracelog with ok=true');

  // 3. Query GET /api/tracelogs from the Go server and verify stored entries & summary.
  const listRes = await fetch(`${baseUrl}/api/tracelogs?limit=10`);
  assert.equal(listRes.status, 200, 'GET /api/tracelogs must return 200 OK');
  const listJson = await listRes.json();
  assert(listJson.ok, 'GET /api/tracelogs response must have ok=true');
  assert(listJson.stored >= 2, `Expected >=2 stored tracelogs on server, got ${listJson.stored}`);

  const foundA = listJson.items.find(item => item.id === dropAResult.entry.id);
  const foundB = listJson.items.find(item => item.id === dropBResult.entry.id);
  assert(foundA, `Tracelog ${dropAResult.entry.id} must be present in GET /api/tracelogs`);
  assert(foundB, `Tracelog ${dropBResult.entry.id} must be present in GET /api/tracelogs`);

  // 4. Query GET /api/tracelogs/{id} for the individual entry.
  const singleRes = await fetch(`${baseUrl}/api/tracelogs/${encodeURIComponent(dropAResult.entry.id)}`);
  assert.equal(singleRes.status, 200, 'GET /api/tracelogs/{id} must return 200 OK');
  const singleEntry = await singleRes.json();
  assert.equal(singleEntry.id, dropAResult.entry.id);
  assert.equal(singleEntry.metrics.bottleneck, 'encounters-render');
  assert(singleEntry.frames.length >= 20, `Expected >=20 frame samples in tracelog, got ${singleEntry.frames.length}`);

  assert.equal(errors.length, 0, 'Unexpected page errors: ' + errors.join('; '));
  assert(tracelogPosts.length >= 2, `Expected >=2 POST /api/tracelogs network calls, got ${tracelogPosts.length}`);

  // 5. Composite a diagnostic verification image over the live Stronghold screenshot.
  const rawShot = await page.screenshot();
  const overlaySvg = renderDiagnosticOverlaySvg(singleEntry, foundB, listJson);
  await sharp(rawShot)
    .composite([{input: overlaySvg, top: 120, left: 24}])
    .webp({quality: 88})
    .toFile(`${out}/fps-tracelog-verification.webp`);

  const verificationReport = {
    verifiedAt: new Date().toISOString(),
    baseUrl,
    pageErrors: errors.length,
    tracelogPostsCaptured: tracelogPosts.length,
    serverStoredCount: listJson.stored,
    serverSummary: listJson.summary,
    sustainedDropSample: {
      id: singleEntry.id,
      reason: singleEntry.reason,
      fps: singleEntry.metrics.fps,
      minFps: singleEntry.metrics.minFps,
      p95FrameMs: singleEntry.metrics.p95FrameMs,
      maxFrameMs: singleEntry.metrics.maxFrameMs,
      bottleneck: singleEntry.metrics.bottleneck,
      phasesAvg: singleEntry.metrics.phasesAvg,
      phasesMax: singleEntry.metrics.phasesMax,
      scene: singleEntry.scene,
      frameSampleCount: singleEntry.frames.length,
    },
    frameSpikeSample: {
      id: foundB.id,
      reason: foundB.reason,
      fps: foundB.metrics.fps,
      minFps: foundB.metrics.minFps,
      maxFrameMs: foundB.metrics.maxFrameMs,
      bottleneck: foundB.metrics.bottleneck,
      phasesMax: foundB.metrics.phasesMax,
    },
  };

  await fs.writeFile(`${out}/verification.json`, JSON.stringify(verificationReport, null, 2) + '\n');
  console.log(JSON.stringify(verificationReport, null, 2));
} finally {
  await browser?.close();
  server?.kill();
}
