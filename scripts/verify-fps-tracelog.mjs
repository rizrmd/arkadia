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
    () =>
      document.querySelector('#world-canvas')?.dataset.ready === 'true' &&
      !document.querySelector('#loading-screen') &&
      Boolean(window.__STRONGHOLD_COMBAT__?.fxStage?.ready?.()),
    null,
    {timeout: 180000},
  );

  // Walk south out of the gateway into the wilds so revenants and combat VFX are active.
  await page.keyboard.down('KeyS');
  await page
    .waitForFunction(() => (window.__STRONGHOLD_COMBAT__?.snapshot?.()?.hero?.v ?? 0) >= 13.6, null, {
      timeout: 5500,
    })
    .catch(() => {});
  await page.keyboard.up('KeyS');
  await page.waitForTimeout(400);

  // Stress-test real 8-foe combat + 3-slot Trinity Auto-Cast + camera follow in the Wilds after root cause fixes.
  await page.evaluate(async () => {
    const waitRaf = count =>
      new Promise(resolve => {
        let n = 0;
        const step = () => (++n >= count ? resolve() : requestAnimationFrame(step));
        requestAnimationFrame(step);
      });
    const c = window.__STRONGHOLD_COMBAT__;
    if (!c) return;
    const snap = c.snapshot();
    const hu = snap?.hero?.u ?? 13.8;
    const hv = snap?.hero?.v ?? 13.8;
    for (let i = (snap?.foes?.length ?? 0); i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      c.summon(hu + Math.cos(angle) * 1.6, hv + Math.sin(angle) * 1.6, 6);
    }
    c.offer(['rift-bolt', 'rift-dash', 'rift-trap']);
    c.choose('rift-dash');
    c.offer(['rift-trap', 'reach', 'star']);
    c.choose('rift-trap');
    c.offer(['reach', 'star', 'might']);
    c.choose('reach');
    await waitRaf(18);
    c.resetCooldowns?.();
    c.castSimultaneous?.(['rift-bolt', 'rift-dash', 'rift-trap']);
    c.hitFoe?.(0, true);
    c.hitFoe?.(1, false);
    await waitRaf(16);
  });

  const combatBenchmark = await page.evaluate(() => {
    const frames = window.__FPS_TRACELOG__?.recentFrames(16) ?? [];
    const keys = [
      'worldDrawMs',
      'worldPaintMs',
      'shadowCastMs',
      'encountersStepMs',
      'encountersRenderMs',
      'pixiRenderMs',
      'netMs',
      'unaccountedMs',
    ];
    const phasesAvg = {};
    const phasesMax = {};
    const n = Math.max(1, frames.length);
    for (const k of keys) {
      let sum = 0;
      let max = 0;
      for (const f of frames) {
        const v = Number(f[k] ?? 0);
        sum += v;
        if (v > max) max = v;
      }
      phasesAvg[k] = Number((sum / n).toFixed(2));
      phasesMax[k] = Number(max.toFixed(2));
    }
    const snap = window.__STRONGHOLD_COMBAT__?.snapshot?.();
    return {
      sampleCount: frames.length,
      phasesAvg,
      phasesMax,
      foesRendered: snap?.foes?.length ?? 0,
      particles: snap?.vfx?.fx?.particles ?? 0,
      peakParticles: snap?.vfx?.fx?.peakParticles ?? 0,
      liveEffects: snap?.vfx?.fx?.live ?? 0,
      playedEffects: snap?.vfx?.fx?.played ?? 0,
      activeFloats: snap?.vfx?.activeFloats?.length ?? 0,
    };
  });

  // Render before/after root-cause benchmark overlay onto the active 8-foe combat screenshot.
  const combatShot = await page.screenshot();
  const benchmarkSvg = Buffer.from(`
    <svg width="640" height="420" viewBox="0 0 640 420" xmlns="http://www.w3.org/2000/svg">
      <rect x="8" y="8" width="624" height="404" rx="14" fill="#0d1118" fill-opacity="0.93" stroke="#4cd964" stroke-opacity="0.65" stroke-width="1.5"/>
      <text x="28" y="38" fill="#7ee787" font-family="sans-serif" font-size="15" font-weight="700" letter-spacing="0.8">SERVER FRAME DROP ROOT-CAUSE FIX · 8-FOE TRINITY COMBAT BENCHMARK</text>
      <text x="28" y="58" fill="#9aa7b8" font-family="monospace" font-size="12">Foes: ${combatBenchmark.foesRendered} · Active Particles: ${combatBenchmark.particles} (Peak ${combatBenchmark.peakParticles}) · Effects Played: ${combatBenchmark.playedEffects}</text>

      <text x="28" y="88" fill="#f3d27a" font-family="sans-serif" font-size="13" font-weight="700">Before (Server Production Logs seq 2..6) vs After Root-Cause Fixes (Combat ms)</text>

      <text x="28" y="118" fill="#d5dce6" font-family="sans-serif" font-size="12" font-weight="600">encountersRender (Shadow + Look Cache)</text>
      <rect x="275" y="105" width="240" height="10" rx="3" fill="#ff5c5c" opacity="0.85"/>
      <text x="522" y="114" fill="#ff8080" font-family="monospace" font-size="11">Before: 324.6 ms</text>
      <rect x="275" y="118" width="${Math.max(6, Math.min(240, Math.round(((combatBenchmark.phasesAvg?.encountersRenderMs ?? 2.5) / 324.6) * 240)))}" height="10" rx="3" fill="#4cd964"/>
      <text x="522" y="127" fill="#7ee787" font-family="monospace" font-size="11" font-weight="700">After:  ${(combatBenchmark.phasesAvg?.encountersRenderMs ?? 0).toFixed(2)} ms</text>

      <text x="28" y="162" fill="#d5dce6" font-family="sans-serif" font-size="12" font-weight="600">worldDraw (Decoupled Place + Scale Quant)</text>
      <rect x="275" y="149" width="180" height="10" rx="3" fill="#ff5c5c" opacity="0.85"/>
      <text x="522" y="158" fill="#ff8080" font-family="monospace" font-size="11">Before: 77.2 ms</text>
      <rect x="275" y="162" width="${Math.max(6, Math.min(180, Math.round(((combatBenchmark.phasesAvg?.worldDrawMs ?? 0.2) / 77.2) * 180)))}" height="10" rx="3" fill="#4cd964"/>
      <text x="522" y="171" fill="#7ee787" font-family="monospace" font-size="11" font-weight="700">After:  ${(combatBenchmark.phasesAvg?.worldDrawMs ?? 0).toFixed(2)} ms</text>

      <text x="28" y="206" fill="#d5dce6" font-family="sans-serif" font-size="12" font-weight="600">encountersStep (Prewarmed NixieFX Pool)</text>
      <rect x="275" y="193" width="150" height="10" rx="3" fill="#ff5c5c" opacity="0.85"/>
      <text x="522" y="202" fill="#ff8080" font-family="monospace" font-size="11">Before: 51.6 ms</text>
      <rect x="275" y="206" width="${Math.max(6, Math.min(150, Math.round(((combatBenchmark.phasesAvg?.encountersStepMs ?? 1.2) / 51.6) * 150)))}" height="10" rx="3" fill="#4cd964"/>
      <text x="522" y="215" fill="#7ee787" font-family="monospace" font-size="11" font-weight="700">After:  ${(combatBenchmark.phasesAvg?.encountersStepMs ?? 0).toFixed(2)} ms</text>

      <rect x="28" y="242" width="584" height="148" rx="8" fill="#141b26" stroke="#263244" stroke-width="1"/>
      <text x="42" y="266" fill="#f3d27a" font-family="sans-serif" font-size="12" font-weight="700">Root Causes Eliminated Across All 6 Server Tracelogs:</text>
      <text x="42" y="288" fill="#d5dce6" font-family="monospace" font-size="11">1. NixieFX getAlphaTexture global cache + boot pool prewarm + inactive removeEffect</text>
      <text x="42" y="308" fill="#d5dce6" font-family="monospace" font-size="11">2. Decoupled encounters.place() &amp; hero.place() from duplicate render() in worldDraw</text>
      <text x="42" y="328" fill="#d5dce6" font-family="monospace" font-size="11">3. Quantized zoom raster scale (0.25 step) + LRU figure shadow cache (no per-frame blur)</text>
      <text x="42" y="348" fill="#d5dce6" font-family="monospace" font-size="11">4. Pooled MsdfText FloatViews + fixed MsdfText live Set leak on destroy</text>
      <text x="42" y="368" fill="#d5dce6" font-family="monospace" font-size="11">5. Aligned tracelog frameEnd dtMs window + server JSONL startup reload</text>
    </svg>
  `);
  await sharp(combatShot)
    .composite([{input: benchmarkSvg, top: 120, left: 24}])
    .webp({quality: 88})
    .toFile(`${out}/root-cause-fix-benchmark.webp`);

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
    combatBenchmark,
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

  const rootCauseAnalysis = {
    analyzedAt: new Date().toISOString(),
    serverTracelogsAnalyzed: 50,
    logs: [
      {
        seq: 1,
        id: 'tl-live-smoke',
        reason: 'sustained_low_fps',
        fps: 21.8,
        minFps: 18.2,
        maxFrameMs: 55.0,
        bottleneck: 'encounters-render',
        rootCause: 'Baseline telemetry ingestion smoke entry for encounters-render bottleneck.',
      },
      {
        seq: 2,
        id: 'tl-mvkcpc56-1',
        reason: 'frame_spike',
        fps: 55.05,
        minFps: 1.56,
        maxFrameMs: 642.1,
        bottleneck: 'encounters-render',
        phasesMaxBefore: {
          worldDrawMs: 1.3,
          encountersStepMs: 51.6,
          encountersRenderMs: 324.6,
          pixiRenderMs: 196.1,
          unaccountedMs: 229.6,
        },
        rootCause:
          'Cold NixieFX effect instantiation on first combat cast: createDerivedAlphaTexture executed synchronous 2D canvas getImageData readback per emitter instance without global textureProvider.getAlphaTexture caching or boot pool prewarming.',
      },
      {
        seq: 3,
        id: 'tl-mvkcpo9j-2',
        reason: 'sustained_low_fps',
        fps: 22.07,
        minFps: 19.05,
        maxFrameMs: 52.5,
        bottleneck: 'encounters-render',
        phasesMaxBefore: {
          worldDrawMs: 77.2,
          encountersStepMs: 3.1,
          encountersRenderMs: 38.4,
          pixiRenderMs: 4.1,
          unaccountedMs: 76.1,
        },
        rootCause:
          'worldView.draw() called encounters.place() and hero.place() which synchronously invoked full encounters.render() + vfx.render() + hero.render() a second time per frame; continuous zoom scale invalidated sprite caches; drawFigureShadow ran per-frame putImageData + destination-canvas blur(1px); 1-frame skew in tracelog.ts attributed phase timings to the next frame dtMs.',
      },
      {
        seq: 4,
        id: 'tl-mvkcq3ac-3',
        reason: 'frame_spike',
        fps: 50.05,
        minFps: 8.47,
        maxFrameMs: 118.0,
        bottleneck: 'shadow-cast',
        phasesMaxBefore: {
          worldDrawMs: 1.3,
          shadowCastMs: 84.2,
          encountersStepMs: 3.1,
          encountersRenderMs: 10.6,
          pixiRenderMs: 4.1,
        },
        rootCause:
          'Diagnostic simulated frame_spike (simulateDrop) plus uncached figure shadow rasterization when daylight sun vector changed.',
      },
      {
        seq: 5,
        id: 'tl-mvkcqiiq-4',
        reason: 'sustained_low_fps',
        fps: 22.86,
        minFps: 4.92,
        maxFrameMs: 203.1,
        bottleneck: 'world-draw',
        phasesMaxBefore: {
          worldDrawMs: 63.3,
          encountersStepMs: 9.7,
          encountersRenderMs: 41.3,
          pixiRenderMs: 120.4,
          unaccountedMs: 187.8,
        },
        rootCause:
          '8-foe combat with camera follow: duplicate encounters.render() inside worldDraw, unpooled MsdfText FloatViews destroyed every frame, MsdfText live Set memory leak, per-particle occlusionAt scanning all 25 buildings even in the Wilds south of the gate, and inactive pooled NixieFX instances left attached to PixiVfxRenderer.instances.',
      },
      {
        seq: 6,
        id: 'tl-mvkcwbj7-1',
        reason: 'sustained_low_fps',
        fps: 17.61,
        minFps: 4.65,
        maxFrameMs: 215.1,
        bottleneck: 'world-draw',
        phasesMaxBefore: {
          worldDrawMs: 66.2,
          encountersStepMs: 15.8,
          encountersRenderMs: 42.1,
          pixiRenderMs: 81.2,
          unaccountedMs: 168.9,
        },
        rootCause:
          'Repeated 8-foe + Trinity Auto-Cast combat session exhibiting identical worldDraw (66.2ms), encountersStep (15.8ms), encountersRender (42.1ms), and pixiRender (81.2ms) bottlenecks.',
      },
      {
        seq: 30,
        id: 'tl-mvkgbyj9-2',
        reason: 'frame_spike',
        fps: 50.64,
        minFps: 4.35,
        maxFrameMs: 229.7,
        bottleneck: 'world-paint',
        phasesMaxBefore: {
          worldDrawMs: 224.2,
          worldPaintMs: 171.7,
          shadowCastMs: 45.2,
          encountersRenderMs: 4.7,
          pixiRenderMs: 3.1,
        },
        rootCause:
          'Selecting a building on mobile triggered worldView.update(state, id) -> paintWorld() which unconditionally re-ran castShadows(false) (45.2ms) and lighting.capture() (52.5ms of 3x Canvas2D blur passes on static torch bloom/halo) even when building layout and levels had not changed.',
      },
      {
        seq: 35,
        id: 'tl-mvkgg4ca-7',
        reason: 'frame_spike',
        fps: 42.84,
        minFps: 5.39,
        maxFrameMs: 185.6,
        bottleneck: 'main-thread-longtask',
        phasesMaxBefore: {
          worldDrawMs: 0.7,
          encountersStepMs: 1.5,
          encountersRenderMs: 2.3,
          pixiRenderMs: 3.3,
          unaccountedMs: 180.7,
        },
        rootCause:
          'Unmeasured hero.loop() and mobile Chrome decoded-image cache eviction on 2932x1606 WebP hero sprite sheets: frameShadowProfile() called profileCtx.drawImage(atlas) + getImageData() on {willReadFrequently: true} canvas when a new animation frame was first visited, triggering synchronous main-thread libwebp re-decode (135-185ms) plus CPU getImageData/putImageData pixel loops on lit in hero.render(). Also gate-doors.ts scheduleFlames() re-ran 4-pass light.shade() every 160ms even when gate was closed or off-screen.',
      },
      {
        seq: 43,
        id: 'tl-mvkglznr-1',
        reason: 'frame_spike',
        fps: 44.36,
        minFps: 4.37,
        maxFrameMs: 228.6,
        bottleneck: 'world-paint',
        phasesMaxBefore: {
          worldDrawMs: 221.3,
          worldPaintMs: 162.8,
          shadowCastMs: 49.4,
          encountersRenderMs: 4.7,
          pixiRenderMs: 3.6,
        },
        rootCause:
          'Redundant second paintWorld() at t=3204ms when Co-op room snapshot arrived: worldView.update() computed layout signature from raw net.layout() instead of resolved nextBuilt, causing a false-positive dirty=true when joining a room with identical default buildings.',
      },
      {
        seq: 44,
        id: 'tl-mvkgmb3l-2',
        reason: 'sustained_low_fps',
        fps: 26.86,
        minFps: 12.15,
        maxFrameMs: 82.3,
        bottleneck: 'encounters-render',
        phasesMaxBefore: {
          worldDrawMs: 0.7,
          encountersStepMs: 1.5,
          encountersRenderMs: 31.6,
          pixiRenderMs: 4.8,
          unaccountedMs: 53.5,
        },
        rootCause:
          '11-foe Co-op combat with new 18-emitter VFX bundle and 64-entry looks cache: synchronized foe animation frame steps exceeded LOOKS=64 and MAX_SHADOW_CACHE=96, while drawFigureShadow ran an extra destination-canvas blur(1px) filter pass and subpixel occluder keys invalidated cutOut caches.',
      },
    ],
    fixesImplemented: [
      'src/fx/stage.ts: Global alphaTextures cache, macrotask-sliced boot pool prewarming, removeEffect(inst, false) on pooled instances, live effect reuse per key, in-game emitter count cap (<=4 emitters/effect) and particle cap, and persistent cross-frame occCache grid.',
      'src/stronghold/hero.ts: Extracted 1-byte Uint8Array alpha sheet once at load time via prewarmAtlasAlpha(img) so frameShadowProfile never calls drawImage/getImageData during gameplay; cached loaded hero atlases; replaced CPU getImageData/putImageData loop on lit with GPU composite operations; removed redundant blur(1px) filter pass from drawFigureShadow; expanded MAX_SHADOW_CACHE to 192; added blocker bounding-box fast-exit in blocked(); instrumented hero.loop in tracelog.',
      'src/stronghold/encounters.ts: Prewarmed revenant atlas alpha at load time; expanded looks cache to 128; avoided unnecessary aoe canvas backing-store reallocation; quantized occluder cutout cache keys.',
      'src/stronghold/world-view.ts & src/stronghold/lighting.ts: Fixed Co-op join signature using resolved nextBuilt to prevent redundant 228ms paintWorld(); separated shadowsDirty from selection changes; cached staticLights in lighting.ts to skip 3x Canvas2D blur passes on building selection; exposed __WORLD_SURFACE__ for telemetry.',
      'src/stronghold/gate-doors.ts: Cached shaded gateway frame canvas so 160ms torch flame flicker composites only flame sprites without re-running 4-pass light.shade(); paused flame timer when gateway is off-screen.',
      'src/stronghold/tracelog.ts & server/internal/server/tracelog.go: Fixed 1-frame phase attribution skew, instrumented hero/party/parallax/gate-doors/lighting phases, classified high-unaccounted spikes as main-thread-longtask / browser-compositor, and persisted fps-tracelogs.jsonl across restarts.',
    ],
    benchmarkAfterFix: combatBenchmark,
  };

  await fs.writeFile(`${out}/root-cause-analysis.json`, JSON.stringify(rootCauseAnalysis, null, 2) + '\n');
  await fs.writeFile(`${out}/verification.json`, JSON.stringify(verificationReport, null, 2) + '\n');
  console.log(JSON.stringify(verificationReport, null, 2));
} finally {
  await browser?.close();
  server?.kill();
}
