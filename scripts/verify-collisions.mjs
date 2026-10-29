import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const url = process.env.DEMO_URL || 'http://127.0.0.1:3021/';
const server = process.env.DEMO_URL ? null : spawn(process.execPath, ['server.mjs'], { env: { ...process.env, PORT: '3021' } });
let browser;
try {
  if (server) await new Promise(r => setTimeout(r, 600));
  browser = await chromium.launch({ headless: true, env: { ...process.env, LD_LIBRARY_PATH: '/home/dev/.local/browser-libs/usr/lib/x86_64-linux-gnu:/opt/fural-antigravity-glibc' }, args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--no-zygote', '--single-process'] });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(url);
  await page.waitForFunction(() => window.__ARKODIA_ARENA__);
  const results = await page.evaluate(() => {
    window.__ARKODIA_APP__.ticker.stop();
    const a = window.__ARKODIA_ARENA__, out = [];
    const check = (name, ok, details) => out.push({ name, passed: !!ok, details });
    a.auto = false; a.spawn(2); a.hero.x = 1; a.hero.y = 1;
    const [left, right] = a.enemies;
    // Opposing screen-horizontal movement, initially touching. Collision correction
    // cancels all forward travel; neither sprite should keep cycling its walk frames.
    Object.assign(left, { x: 4, y: 5, stride: 0 });
    const offset = .72 / Math.SQRT2;
    Object.assign(right, { x: 4 + offset, y: 5 - offset, stride: 0 });
    const samples = [];
    for (let i = 0; i < 180; i++) {
      a.moves.clear();
      a.move(left, { x: 1, y: -1 }, 1000 / 60);
      a.move(right, { x: -1, y: 1 }, 1000 / 60);
      a.separate(); a.finishMoves(1000 / 60); a.sync();
      samples.push([left.state, right.state, left.stride, right.stride, left.facing, right.facing]);
    }
    check('opposing collisions stop gait and preserve opposing facing for 180 frames', samples.every(s => s[0] === 'idle' && s[1] === 'idle' && s[2] < 1e-8 && s[3] < 1e-8 && s[4] === 1 && s[5] === -1), samples.at(-1));
    // Once the obstacle leaves, gait resumes immediately.
    a.moves.clear(); a.move(left, { x: 1, y: -1 }, 1000 / 60); a.finishMoves(1000 / 60);
    check('unblocked actor immediately resumes walking', left.state === 'move' && left.stride > 0, left.stride);
    left.back = false;
    const quadrants = [];
    for (let i = 0; i < 180; i++) { a.face(left, { x: 1, y: -1 + (i % 2 ? .02 : -.02) }); quadrants.push(left.back); }
    a.face(left, { x: -1, y: -1 });
    check('near-axis collision jitter holds art; deliberate north turn uses back art', quadrants.every(v => !v) && left.back);
    left.facing = 1;
    for (let i = 0; i < 180; i++) a.face(left, { x: -1, y: -1 + (i % 2 ? .02 : -.02) });
    check('near-vertical jitter holds horizontal mirror', left.facing === 1);
    // Exercise the real ring decision while collision-sized displacements cross 2.4.
    a.engaged.clear(); a.hero.x = 3; a.hero.y = 3;
    left.retreating = false; left.wander = { x: 3, y: 3 };
    const directions = [];
    for (let i = 0; i < 120; i++) {
      left.x = 3 + (i % 2 ? 2.41 : 2.39); left.y = 3; left.play('idle');
      a.moves.clear(); a.enemyStep(left, 1000 / 60);
      directions.push(left.facing);
    }
    check('ring AI does not reverse across collision jitter at retreat boundary', directions.every(v => v === 1));
    left.x = 5.7; left.y = 3; a.enemyStep(left, 1000 / 60);
    check('ring AI exits retreat after clearing outer boundary', !left.retreating);
    // Full update: the ninth candidate should not displace an incumbent for tiny
    // distance differences caused by crowd separation.
    a.spawn(9); a.hero.x = 5; a.hero.y = 5;
    a.enemies.forEach((e, i) => { e.x = 5 + Math.cos(i * Math.PI / 4) * 2; e.y = 5 + Math.sin(i * Math.PI / 4) * 2; });
    const excluded = a.enemies[8]; a.engaged = new Set(a.enemies.slice(0, 8));
    excluded.x = 6.99; excluded.y = 5; a.update(1);
    check('engagement selection retains incumbents under small crowd displacement', !a.engaged.has(excluded) && a.engaged.size === 8);
    window.__ARKODIA_APP__.render();
    return out;
  });
  for (const r of results) console.log(r.passed ? 'PASS' : 'FAIL', r.name, r.details ?? '');
  assert.ok(results.every(r => r.passed), JSON.stringify(results));
  assert.deepEqual(errors, []);
  await fs.mkdir('docs/collisions', { recursive: true });
  await fs.writeFile(`docs/collisions/${process.env.DEMO_URL ? 'live' : 'local'}.json`, JSON.stringify({ url, results, errors }, null, 2));
} finally { await browser?.close(); server?.kill(); }
