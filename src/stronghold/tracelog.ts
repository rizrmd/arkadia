import type {SharedPixiRuntime} from '../app/loader';
import type {Net} from './net/client';

export type TracelogPhaseName =
 | 'worldDraw'
 | 'worldPaint'
 | 'shadowCast'
 | 'encountersStep'
 | 'encountersRender'
 | 'pixiRender'
 | 'net';

export type TracelogReason = 'sustained_low_fps' | 'frame_spike' | 'manual';

export interface TracelogPhaseBreakdown {
 worldDrawMs: number;
 worldPaintMs: number;
 shadowCastMs: number;
 encountersStepMs: number;
 encountersRenderMs: number;
 pixiRenderMs: number;
 netMs: number;
 unaccountedMs: number;
}

export interface TracelogFrameSample {
 t: number;
 dtMs: number;
 fps: number;
 worldDrawMs?: number;
 worldPaintMs?: number;
 shadowCastMs?: number;
 encountersStepMs?: number;
 encountersRenderMs?: number;
 pixiRenderMs?: number;
 netMs?: number;
 foesRendered?: number;
 particles?: number;
 surfaceRepainted?: boolean;
}

export interface TracelogLongTask {
 startTime: number;
 duration: number;
 name?: string;
}

export interface TracelogEntry {
 id: string;
 clientTime: string;
 reason: TracelogReason;
 client: {
  url: string;
  userAgent: string;
  viewportWidth: number;
  viewportHeight: number;
  dpr: number;
  hardwareConcurrency?: number;
  deviceMemoryGb?: number;
 };
 metrics: {
  fps: number;
  minFps: number;
  targetFps: number;
  thresholdFps: number;
  windowMs: number;
  sampleCount: number;
  slowFrames: number;
  droppedFrames: number;
  avgFrameMs: number;
  p50FrameMs: number;
  p95FrameMs: number;
  p99FrameMs: number;
  maxFrameMs: number;
  phasesAvg: TracelogPhaseBreakdown;
  phasesMax: TracelogPhaseBreakdown;
  bottleneck: string;
 };
 scene: {
  mode: 'coop' | 'solo';
  room?: string;
  playerId?: string;
  rttMs?: number;
  hero: string;
  heroState: string;
  heroU: number;
  heroV: number;
  safeZone: boolean;
  level: number;
  heroesCount: number;
  foesTotal: number;
  foesRendered: number;
  particles: number;
  liveEffects: number;
  activeFloats: number;
  projectiles: number;
  aoes: number;
  scale: number;
  camera: string;
  gate: string;
  lighting: string;
  torches: string;
  sun: string;
  surfacePaints: number;
  lightPaints: number;
  shadowPaints: number;
 };
 frames: TracelogFrameSample[];
 longTasks?: TracelogLongTask[];
}

export interface TracelogSendResult {
 entry: TracelogEntry;
 serverResponse?: {
  ok: boolean;
  id: string;
  seq?: number;
  stored?: number;
  bottleneck?: string;
 };
}

const currentFramePhases: Record<TracelogPhaseName, number> = {
 worldDraw: 0,
 worldPaint: 0,
 shadowCast: 0,
 encountersStep: 0,
 encountersRender: 0,
 pixiRender: 0,
 net: 0,
};

export function recordTracelogPhase(phase: TracelogPhaseName, durationMs: number): void {
 if (durationMs > 0 && Number.isFinite(durationMs)) {
  currentFramePhases[phase] += durationMs;
 }
}

export function measureTracelogPhase<T>(phase: TracelogPhaseName, fn: () => T): T {
 const t0 = performance.now();
 try {
  return fn();
 } finally {
  recordTracelogPhase(phase, performance.now() - t0);
 }
}

const round2 = (n: number) => Math.round((Number.isFinite(n) ? n : 0) * 100) / 100;

function resetFramePhases(): Record<TracelogPhaseName, number> {
 const snap = {...currentFramePhases};
 currentFramePhases.worldDraw = 0;
 currentFramePhases.worldPaint = 0;
 currentFramePhases.shadowCast = 0;
 currentFramePhases.encountersStep = 0;
 currentFramePhases.encountersRender = 0;
 currentFramePhases.pixiRender = 0;
 currentFramePhases.net = 0;
 return snap;
}

function classifyBottleneck(maxPhases: TracelogPhaseBreakdown, longTasks: TracelogLongTask[]): string {
 const candidates: [string, number][] = [
  ['world-paint', maxPhases.worldPaintMs],
  ['shadow-cast', maxPhases.shadowCastMs],
  ['world-draw', Math.max(0, maxPhases.worldDrawMs - maxPhases.worldPaintMs - maxPhases.shadowCastMs)],
  ['encounters-render', maxPhases.encountersRenderMs],
  ['encounters-step', maxPhases.encountersStepMs],
  ['pixi-render', maxPhases.pixiRenderMs],
  ['net-reconcile', maxPhases.netMs],
 ];
 let bestName = 'unclassified';
 let bestMs = 0;
 for (const [name, ms] of candidates) {
  if (ms > bestMs) {
   bestName = name;
   bestMs = ms;
  }
 }
 if (bestMs >= 2.0) return bestName;
 if (longTasks.length > 0) return 'main-thread-longtask';
 return 'browser-compositor';
}

export interface FpsTracelogOptions {
 rt: SharedPixiRuntime;
 getCombatSnapshot: () => any;
 net?: Net;
 getHeroId: () => string;
 endpoint?: string;
}

export function startFpsTracelog(opts: FpsTracelogOptions) {
 const params = new URLSearchParams(location.search);
 const config = {
  thresholdFps: Math.max(5, Math.min(58, Number(params.get('fpsThreshold')) || 30)),
  spikeMs: Math.max(34, Math.min(1000, Number(params.get('fpsSpikeMs')) || 85)),
  cooldownMs: Math.max(500, Number(params.get('fpsCooldownMs')) || 10000),
  windowFrames: 30,
  maxRingFrames: 120,
  endpoint: opts.endpoint || '/api/tracelogs',
 };

 const {rt} = opts;
 const canvas = rt.app.canvas;

 // Instrument PixiJS renderer.render pass duration per frame.
 const renderer = rt.app.renderer as any;
 if (renderer && typeof renderer.render === 'function' && !renderer.__tracelogWrapped) {
  const origRender = renderer.render.bind(renderer);
  renderer.__tracelogWrapped = true;
  renderer.render = (...args: any[]) => {
   const t0 = performance.now();
   try {
    return origRender(...args);
   } finally {
    recordTracelogPhase('pixiRender', performance.now() - t0);
   }
  };
 }

 // Collect browser LongTask entries (>50 ms main-thread blocks) when supported.
 const longTasks: TracelogLongTask[] = [];
 if (typeof PerformanceObserver !== 'undefined') {
  try {
   const obs = new PerformanceObserver(list => {
    for (const entry of list.getEntries()) {
     longTasks.push({
      startTime: round2(entry.startTime),
      duration: round2(entry.duration),
      name: entry.name || 'longtask',
     });
     if (longTasks.length > 24) longTasks.shift();
    }
   });
   obs.observe({entryTypes: ['longtask']});
  } catch {
   // LongTask observer not supported in all browsers.
  }
 }

 const ring: TracelogFrameSample[] = [];
 const history: TracelogSendResult[] = [];
 let inFlight: Promise<TracelogSendResult | null> | null = null;
 let lastNow = 0;
 let lastSentAt = -1e9;
 let hiddenUntil = 0;
 let warmupFrames = 0;
 let lastSurfacePaints = 0;
 let seqCounter = 0;

 document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
   lastNow = 0;
  } else {
   hiddenUntil = performance.now() + 1500;
   lastNow = 0;
  }
 });

 function readSurfaceDataset() {
  const surface = document.querySelector<HTMLElement>('#world-surface');
  return {
   lighting: surface?.dataset.lighting || 'on',
   torches: surface?.dataset.torches || 'off',
   sun: surface?.dataset.sun || 'none',
   surfacePaints: Number(surface?.dataset.paints || 0),
   lightPaints: Number(surface?.dataset.lightPaints || 0),
   shadowPaints: Number(surface?.dataset.shadowPaints || 0),
  };
 }

 function readLiveCounts() {
  let foesRendered = 0;
  let particles = 0;
  try {
   const snap = opts.getCombatSnapshot?.();
   if (snap) {
    foesRendered = Array.isArray(snap.foes) ? snap.foes.length : 0;
    particles = Number(snap.vfx?.fx?.particles || 0);
   }
  } catch {}
  return {foesRendered, particles};
 }

 function computeWindowMetrics(samples: TracelogFrameSample[]) {
  if (!samples.length) {
   const zeroPhases: TracelogPhaseBreakdown = {
    worldDrawMs: 0,
    worldPaintMs: 0,
    shadowCastMs: 0,
    encountersStepMs: 0,
    encountersRenderMs: 0,
    pixiRenderMs: 0,
    netMs: 0,
    unaccountedMs: 0,
   };
   return {
    fps: 60,
    minFps: 60,
    targetFps: 60,
    thresholdFps: config.thresholdFps,
    windowMs: 0,
    sampleCount: 0,
    slowFrames: 0,
    droppedFrames: 0,
    avgFrameMs: 16.67,
    p50FrameMs: 16.67,
    p95FrameMs: 16.67,
    p99FrameMs: 16.67,
    maxFrameMs: 16.67,
    phasesAvg: zeroPhases,
    phasesMax: {...zeroPhases},
    bottleneck: 'none',
   };
  }

  const dts = samples.map(s => s.dtMs).sort((a, b) => a - b);
  const quantile = (q: number) => round2(dts[Math.min(dts.length - 1, Math.floor((dts.length - 1) * q))]);
  const windowMs = samples.reduce((sum, s) => sum + s.dtMs, 0);
  const n = samples.length;
  const avgFrameMs = round2(windowMs / n);
  const maxFrameMs = round2(dts[dts.length - 1]);
  const fps = round2(windowMs > 0 ? (1000 * n) / windowMs : 60);
  const minFps = round2(maxFrameMs > 0 ? 1000 / maxFrameMs : 60);
  const slowFrames = samples.filter(s => s.dtMs > 33.4).length;
  const droppedFrames = samples.reduce((acc, s) => acc + Math.max(0, Math.floor(s.dtMs / 16.67) - 1), 0);

  const sumPhases: TracelogPhaseBreakdown = {
   worldDrawMs: 0,
   worldPaintMs: 0,
   shadowCastMs: 0,
   encountersStepMs: 0,
   encountersRenderMs: 0,
   pixiRenderMs: 0,
   netMs: 0,
   unaccountedMs: 0,
  };
  const maxPhases: TracelogPhaseBreakdown = {...sumPhases};

  for (const s of samples) {
   const wd = s.worldDrawMs || 0;
   const wp = s.worldPaintMs || 0;
   const sc = s.shadowCastMs || 0;
   const es = s.encountersStepMs || 0;
   const er = s.encountersRenderMs || 0;
   const pr = s.pixiRenderMs || 0;
   const nt = s.netMs || 0;
   const accounted = wd + es + er + pr + nt;
   const unacc = Math.max(0, s.dtMs - accounted);

   sumPhases.worldDrawMs += wd;
   sumPhases.worldPaintMs += wp;
   sumPhases.shadowCastMs += sc;
   sumPhases.encountersStepMs += es;
   sumPhases.encountersRenderMs += er;
   sumPhases.pixiRenderMs += pr;
   sumPhases.netMs += nt;
   sumPhases.unaccountedMs += unacc;

   if (wd > maxPhases.worldDrawMs) maxPhases.worldDrawMs = wd;
   if (wp > maxPhases.worldPaintMs) maxPhases.worldPaintMs = wp;
   if (sc > maxPhases.shadowCastMs) maxPhases.shadowCastMs = sc;
   if (es > maxPhases.encountersStepMs) maxPhases.encountersStepMs = es;
   if (er > maxPhases.encountersRenderMs) maxPhases.encountersRenderMs = er;
   if (pr > maxPhases.pixiRenderMs) maxPhases.pixiRenderMs = pr;
   if (nt > maxPhases.netMs) maxPhases.netMs = nt;
   if (unacc > maxPhases.unaccountedMs) maxPhases.unaccountedMs = unacc;
  }

  const phasesAvg: TracelogPhaseBreakdown = {
   worldDrawMs: round2(sumPhases.worldDrawMs / n),
   worldPaintMs: round2(sumPhases.worldPaintMs / n),
   shadowCastMs: round2(sumPhases.shadowCastMs / n),
   encountersStepMs: round2(sumPhases.encountersStepMs / n),
   encountersRenderMs: round2(sumPhases.encountersRenderMs / n),
   pixiRenderMs: round2(sumPhases.pixiRenderMs / n),
   netMs: round2(sumPhases.netMs / n),
   unaccountedMs: round2(sumPhases.unaccountedMs / n),
  };
  const phasesMaxRounded: TracelogPhaseBreakdown = {
   worldDrawMs: round2(maxPhases.worldDrawMs),
   worldPaintMs: round2(maxPhases.worldPaintMs),
   shadowCastMs: round2(maxPhases.shadowCastMs),
   encountersStepMs: round2(maxPhases.encountersStepMs),
   encountersRenderMs: round2(maxPhases.encountersRenderMs),
   pixiRenderMs: round2(maxPhases.pixiRenderMs),
   netMs: round2(maxPhases.netMs),
   unaccountedMs: round2(maxPhases.unaccountedMs),
  };

  const recentStart = samples[0]?.t ?? 0;
  const recentLongTasks = longTasks.filter(lt => lt.startTime + lt.duration >= recentStart - 250);
  const bottleneck = classifyBottleneck(phasesMaxRounded, recentLongTasks);

  return {
   fps,
   minFps,
   targetFps: 60,
   thresholdFps: config.thresholdFps,
   windowMs: round2(windowMs),
   sampleCount: n,
   slowFrames,
   droppedFrames,
   avgFrameMs,
   p50FrameMs: quantile(0.5),
   p95FrameMs: quantile(0.95),
   p99FrameMs: quantile(0.99),
   maxFrameMs,
   phasesAvg,
   phasesMax: phasesMaxRounded,
   bottleneck,
  };
 }

 function buildSceneSnapshot(): TracelogEntry['scene'] {
  const surf = readSurfaceDataset();
  const net = opts.net;
  const coopActive = Boolean(net?.active());
  const latest = net?.latest();
  let snap: any = null;
  try {
   snap = opts.getCombatSnapshot?.();
  } catch {}
  const heroSnap = snap?.hero;
  const vfxSnap = snap?.vfx;
  const foesList = Array.isArray(snap?.foes) ? snap.foes : [];
  const sw = innerWidth || 1280;
  const sh = innerHeight || 800;
  const foesOnScreen = foesList.length;

  return {
   mode: coopActive ? 'coop' : 'solo',
   room: coopActive ? net?.room() || '' : undefined,
   playerId: coopActive ? net?.you() || '' : undefined,
   rttMs: coopActive ? round2(net?.rtt() || 0) : undefined,
   hero: opts.getHeroId() || 'rift-runner',
   heroState: heroSnap?.state || 'idle',
   heroU: round2(heroSnap?.u ?? 0),
   heroV: round2(heroSnap?.v ?? 0),
   safeZone: Boolean(heroSnap?.safe ?? true),
   level: Number(snap?.expBar?.level || 1),
   heroesCount: coopActive ? Math.max(1, latest?.players?.length || 1) : 1,
   foesTotal: coopActive ? latest?.enemies?.length ?? foesList.length : foesList.length,
   foesRendered: foesOnScreen,
   particles: Number(vfxSnap?.fx?.particles || 0),
   liveEffects: Number(vfxSnap?.fx?.live || 0),
   activeFloats: Array.isArray(vfxSnap?.activeFloats) ? vfxSnap.activeFloats.length : 0,
   projectiles: Array.isArray(vfxSnap?.activeProjectiles) ? vfxSnap.activeProjectiles.length : 0,
   aoes: Array.isArray(vfxSnap?.activeAoEs) ? vfxSnap.activeAoEs.length : 0,
   scale: round2(Number(canvas.dataset.scale || snap?.scale || 1)),
   camera: canvas.dataset.camera || 'idle',
   gate: canvas.dataset.gate || 'closed',
   lighting: surf.lighting,
   torches: surf.torches,
   sun: surf.sun,
   surfacePaints: surf.surfacePaints,
   lightPaints: surf.lightPaints,
   shadowPaints: surf.shadowPaints,
  };
 }

 function buildTracelogEntry(reason: TracelogReason): TracelogEntry {
  const windowSamples = ring.slice(-config.windowFrames);
  const metrics = computeWindowMetrics(windowSamples);
  const recentFrames = ring.slice(-60);
  const recentStart = recentFrames[0]?.t ?? 0;
  const relevantLongTasks = longTasks.filter(lt => lt.startTime + lt.duration >= recentStart - 250);
  const id = `tl-${Date.now().toString(36)}-${(++seqCounter).toString(36)}`;

  return {
   id,
   clientTime: new Date().toISOString(),
   reason,
   client: {
    url: location.pathname + location.search,
    userAgent: navigator.userAgent,
    viewportWidth: innerWidth || canvas.clientWidth || 1280,
    viewportHeight: innerHeight || canvas.clientHeight || 800,
    dpr: round2(window.devicePixelRatio || 1),
    hardwareConcurrency: navigator.hardwareConcurrency || undefined,
    deviceMemoryGb: (navigator as any).deviceMemory || undefined,
   },
   metrics,
   scene: buildSceneSnapshot(),
   frames: recentFrames,
   longTasks: relevantLongTasks.length ? relevantLongTasks : undefined,
  };
 }

 function triggerTracelog(reason: TracelogReason, force = false): Promise<TracelogSendResult> | null {
  const now = performance.now();
  if (!force && now - lastSentAt < config.cooldownMs) {
   return null;
  }
  lastSentAt = now;
  const entry = buildTracelogEntry(reason);
  const result: TracelogSendResult = {entry};
  history.push(result);
  if (history.length > 20) history.shift();

  canvas.dataset.tracelogCount = String(history.length);
  canvas.dataset.lastTracelogId = entry.id;
  canvas.dataset.lastTracelogReason = entry.reason;
  canvas.dataset.lastTracelogBottleneck = entry.metrics.bottleneck;

  const p = (async () => {
   try {
    const res = await fetch(config.endpoint, {
     method: 'POST',
     headers: {'Content-Type': 'application/json'},
     body: JSON.stringify(entry),
     keepalive: true,
    });
    if (res.ok) {
     result.serverResponse = await res.json();
     if (result.serverResponse?.id) {
      canvas.dataset.lastTracelogId = result.serverResponse.id;
     }
    }
   } catch {
    // Network failures are ignored so telemetry never disrupts gameplay.
   }
   return result;
  })();

  inFlight = p;
  return p;
 }

 function pushSample(now: number, dtMs: number, phases: Record<TracelogPhaseName, number>, checkTrigger = true): Promise<TracelogSendResult> | null {
  const surf = readSurfaceDataset();
  const repainted = surf.surfacePaints > lastSurfacePaints;
  lastSurfacePaints = surf.surfacePaints;
  const {foesRendered, particles} = readLiveCounts();

  const sample: TracelogFrameSample = {
   t: round2(now),
   dtMs: round2(dtMs),
   fps: round2(dtMs > 0 ? 1000 / dtMs : 60),
   worldDrawMs: phases.worldDraw > 0.05 ? round2(phases.worldDraw) : undefined,
   worldPaintMs: phases.worldPaint > 0.05 ? round2(phases.worldPaint) : undefined,
   shadowCastMs: phases.shadowCast > 0.05 ? round2(phases.shadowCast) : undefined,
   encountersStepMs: phases.encountersStep > 0.05 ? round2(phases.encountersStep) : undefined,
   encountersRenderMs: phases.encountersRender > 0.05 ? round2(phases.encountersRender) : undefined,
   pixiRenderMs: phases.pixiRender > 0.05 ? round2(phases.pixiRender) : undefined,
   netMs: phases.net > 0.05 ? round2(phases.net) : undefined,
   foesRendered: foesRendered || undefined,
   particles: particles || undefined,
   surfaceRepainted: repainted || undefined,
  };

  ring.push(sample);
  if (ring.length > config.maxRingFrames) ring.shift();
  warmupFrames++;

  const windowSamples = ring.slice(-config.windowFrames);
  const windowSumMs = windowSamples.reduce((a, b) => a + b.dtMs, 0);
  const rollingFps = windowSumMs > 0 ? (1000 * windowSamples.length) / windowSumMs : 60;
  canvas.dataset.fps = String(Math.round(rollingFps));

  if (!checkTrigger || warmupFrames < 15) return null;

  // 1. Severe single-frame stall / spike
  if (dtMs >= config.spikeMs && dtMs < 2500) {
   return triggerTracelog('frame_spike');
  }

  // 2. Sustained low FPS over the active window
  if (windowSamples.length >= 20 && windowSumMs >= 500) {
   const slowCount = windowSamples.filter(s => s.dtMs > 33.4).length;
   if (rollingFps < config.thresholdFps || slowCount >= 8) {
    return triggerTracelog('sustained_low_fps');
   }
  }
  return null;
 }

 function onFrame(now: number) {
  requestAnimationFrame(onFrame);
  const frameEnd = performance.now();
  const phases = resetFramePhases();
  if (document.hidden || now < hiddenUntil || frameEnd < hiddenUntil) {
   lastNow = 0;
   return;
  }
  if (canvas.dataset.ready !== 'true' || document.querySelector('#loading-screen')) {
   lastNow = 0;
   return;
  }
  if (!lastNow) {
   lastNow = frameEnd;
   lastSurfacePaints = readSurfaceDataset().surfacePaints;
   return;
  }
  const dtMs = frameEnd - lastNow;
  lastNow = frameEnd;
  // Ignore multi-second browser tab suspension gaps.
  if (dtMs <= 0 || dtMs >= 2500) {
   return;
  }
  void pushSample(frameEnd, dtMs, phases, true);
 }

 requestAnimationFrame(onFrame);

 const api = {
  stats() {
   const m = computeWindowMetrics(ring.slice(-config.windowFrames));
   const last = history[history.length - 1];
   return {
    ...m,
    sentCount: history.length,
    lastTracelogId: last?.serverResponse?.id ?? last?.entry.id ?? null,
    lastReason: last?.entry.reason ?? null,
    lastBottleneck: last?.entry.metrics.bottleneck ?? null,
    config: {...config},
   };
  },
  recentFrames(count = 60) {
   return ring.slice(-Math.max(1, count));
  },
  history() {
   return history.map(h => ({
    entry: h.entry,
    serverResponse: h.serverResponse ?? null,
   }));
  },
  configure(next: Partial<typeof config>) {
   if (typeof next.thresholdFps === 'number') config.thresholdFps = next.thresholdFps;
   if (typeof next.spikeMs === 'number') config.spikeMs = next.spikeMs;
   if (typeof next.cooldownMs === 'number') config.cooldownMs = next.cooldownMs;
   return {...config};
  },
  async captureNow(reason: TracelogReason = 'manual') {
   return triggerTracelog(reason, true);
  },
  async simulateDrop(simOpts?: {
   frames?: number;
   dtMs?: number;
   phase?: TracelogPhaseName;
   phaseMs?: number;
   reason?: 'sustained_low_fps' | 'frame_spike';
  }) {
   const count = Math.max(1, simOpts?.frames ?? 24);
   const dtMs = simOpts?.dtMs ?? (simOpts?.reason === 'frame_spike' ? 120 : 52);
   const dominantPhase = simOpts?.phase ?? 'encountersRender';
   const dominantMs = simOpts?.phaseMs ?? Math.round(dtMs * 0.72);
   // Ensure warmup threshold is met and seed a clean baseline window before the simulated drop.
   warmupFrames = Math.max(warmupFrames, 20);
   let tCursor = (ring[ring.length - 1]?.t ?? performance.now()) + 16;
   for (let k = 0; k < config.windowFrames; k++) {
    tCursor += 16.6;
    pushSample(
     tCursor,
     16.6,
     {worldDraw: 1.2, worldPaint: 0, shadowCast: 0, encountersStep: 1.5, encountersRender: 2.1, pixiRender: 3.1, net: 0.3},
     false,
    );
   }
   lastSentAt = -1e9;
   let triggered: Promise<TracelogSendResult> | null = null;
   for (let i = 0; i < count; i++) {
    tCursor += dtMs;
    const phases: Record<TracelogPhaseName, number> = {
     worldDraw: 1.4,
     worldPaint: 0,
     shadowCast: 0,
     encountersStep: 2.1,
     encountersRender: 3.2,
     pixiRender: 4.1,
     net: 0.4,
    };
    phases[dominantPhase] = dominantMs;
    const isLast = i === count - 1;
    const p = pushSample(tCursor, dtMs, phases, isLast);
    if (p) triggered = p;
   }
   if (triggered) {
    return await triggered;
   }
   return await triggerTracelog(simOpts?.reason ?? 'sustained_low_fps', true);
  },
 };

 (window as any).__FPS_TRACELOG__ = api;
 return api;
}
export type FpsTracelogController = ReturnType<typeof startFpsTracelog>;
