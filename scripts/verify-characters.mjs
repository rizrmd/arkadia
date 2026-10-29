// Browser smoke test for the character arena + regression of the existing asset-lab checks.
// Local: node scripts/verify-characters.mjs (serves dist on :3005). Live: DEMO_URL=https://… node scripts/verify-characters.mjs
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';

const url = process.env.DEMO_URL || 'http://127.0.0.1:3005/';
const server = process.env.DEMO_URL ? null : spawn(process.execPath, ['server.mjs'], { env: { ...process.env, PORT: '3005' } });
const OUT = 'public/evidence/characters', results = [];
await fs.mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ headless: true, timeout: 15000, env: { ...process.env, LD_LIBRARY_PATH: '/home/dev/.local/browser-libs/usr/lib/x86_64-linux-gnu:/opt/fural-antigravity-glibc' }, args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--no-zygote', '--single-process'] });
const check = async (name, fn) => { const t = Date.now(); await fn(); results.push({ name, passed: true, ms: Date.now() - t }); console.log('PASS', name); };
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await new Promise(r => setTimeout(r, server ? 600 : 0));
  const res = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
  assert.equal(res.status(), 200);
  await page.waitForFunction(() => window.__ARKODIA_CHARACTERS__, {}, { timeout: 20000 });
  await page.waitForTimeout(800);
  const snap = () => page.evaluate(() => window.__ARKODIA_CHARACTERS__());
  const arena = (fn, arg) => page.evaluate(fn, arg);
  const key = async (k, ms) => { await page.keyboard.down(k); await page.waitForTimeout(ms); await page.keyboard.up(k); };

  await check('existing asset-lab regression (scripts/check-browser.js)', async () => {
    const out = JSON.parse(await page.evaluate(await fs.readFile('scripts/check-browser.js', 'utf8')));
    assert.deepEqual(out.failures, [], JSON.stringify(out.failures)); console.log('  ', out.checks.length, 'checks');
    await arena(() => document.querySelector('#reset').click());
  });

  await check('atlas frames match manifest rects, shared anchor, gutters inside atlas', async () => {
    const r = await arena(async () => {
      const m = await (await fetch('/assets/characters/manifest.json')).json(), a = window.__ARKODIA_ARENA__, out = {};
      for (const id of ['hero', 'revenant']) {
        const c = m.characters[id], set = a.actors.find(x => x.kind === (id === 'hero' ? 'hero' : 'revenant')).set;
        const tex = Object.entries(set.clips).flatMap(([n, list]) => list.map((t, i) => ({ t, f: c.frames[c.clips[n].frames[i]] })));
        out[id] = { frames: c.frames.length, clips: Object.fromEntries(Object.entries(c.clips).map(([n, v]) => [n, v.frames.length])),
          rectsMatch: tex.every(({ t, f }) => t.frame.x === f.x && t.frame.y === f.y && t.frame.width === f.w && t.frame.height === f.h),
          inAtlas: c.frames.every(f => f.x >= c.gutter && f.y >= c.gutter && f.x + f.w + c.gutter <= c.atlasSize[0] && f.y + f.h + c.gutter <= c.atlasSize[1]),
          noOverlap: c.frames.every((f, i) => c.frames.every((g, j) => i === j || f.x + f.w + c.gutter <= g.x || g.x + g.w + c.gutter <= f.x || f.y + f.h + c.gutter <= g.y || g.y + g.h + c.gutter <= f.y)) };
      }
      return out;
    });
    for (const v of Object.values(r)) { assert.equal(v.frames, 36); assert.deepEqual(v.clips, { idle: 6, move: 6, idleBack: 6, moveBack: 6, attack: 6, hit: 2, die: 4 }); assert.ok(v.rectsMatch && v.inAtlas && v.noOverlap); }
  });

  // Isolate the hero: no enemies, manual control.
  await page.selectOption('#crowd', '0'); await page.uncheck('#auto');
  await arena(() => { const a = window.__ARKODIA_ARENA__; a.respawnHero(); document.activeElement?.blur(); });

  // Clip logic is checked on a deterministic 60 Hz simulation (ticker paused): headless SwiftShader renders only a few
  // fps, which would otherwise make frame coverage depend on test-machine speed. Rendering is checked separately.
  await arena(() => {
    const app = window.__ARKODIA_APP__, a = window.__ARKODIA_ARENA__; app.ticker.stop();
    window.__SIM__ = (ms, probe) => { const out = []; for (let t = 0; t < ms; t += 1000 / 60) { a.update(1000 / 60); out.push(probe(a)); } app.render(); return out; };
  });
  const sim = (ms, probe, before = '') => arena(([ms, probe, before]) => { new Function('a', before)(window.__ARKODIA_ARENA__); return window.__SIM__(ms, new Function('a', 'return ' + probe)); }, [ms, probe, before]);
  const H = '({state:a.hero.state,frame:a.hero.frame(),t:a.hero.t,x:a.hero.x,y:a.hero.y,vx:a.hero.view.x,vy:a.hero.view.y,ax:a.hero.sprite.anchor.x,ay:a.hero.sprite.anchor.y,back:a.hero.back,textureClip:a.hero.textureClip,stride:a.hero.stride,facing:a.hero.facing,sx:a.hero.sprite.scale.x,tex:a.hero.sprite.texture.frame.x+","+a.hero.sprite.texture.frame.y})';

  await check('idle playback: time-based frames, stable position and anchor (no jitter)', async () => {
    const s = await sim(2000, H);
    assert.ok(s.every(v => v.state === 'idle'));
    assert.equal(new Set(s.map(v => `${v.vx},${v.vy},${v.ax},${v.ay}`)).size, 1, 'idle position/anchor constant');
    assert.ok(s.every(v => v.frame === Math.floor(v.t * 6 / 1000) % 6), 'frame = floor(t·fps) mod n');
    const changes = s.filter((v, i) => i && v.tex !== s[i - 1].tex).length;
    assert.ok(changes >= 11 && changes <= 12, '6 fps over 2 s → 12 texture swaps, got ' + changes);
    assert.equal(new Set(s.map(v => v.tex)).size, 6);
    // real rendered frames: anchor and integer screen position hold while idle
    const real = await arena(() => new Promise(done => { const app = window.__ARKODIA_APP__, h = window.__ARKODIA_ARENA__.hero, out = []; app.ticker.start(); const s0 = performance.now();
      const tick = () => { out.push(`${h.view.x},${h.view.y},${h.sprite.anchor.x},${h.sprite.anchor.y}`); performance.now() - s0 < 1500 ? requestAnimationFrame(tick) : (app.ticker.stop(), done(out)); }; requestAnimationFrame(tick); }));
    assert.equal(new Set(real).size, 1, 'rendered idle samples ' + real.length);
  });

  await check('move: WASD drives move clip, facing mirrors only horizontally', async () => {
    await page.keyboard.down('d'); const right = await sim(500, H); await page.keyboard.up('d');
    assert.ok(right.every(v => v.state === 'move' && v.facing === 1 && v.sx > 0)); assert.ok(right.at(-1).x > right[0].x);
    assert.ok(right.every((v, i) => !i || Number.isInteger(v.vx) && Number.isInteger(v.vy)), 'integer screen positions');
    await page.keyboard.down('a'); const left = await sim(500, H); await page.keyboard.up('a');
    assert.ok(left.at(-1).state === 'move' && left.at(-1).facing === -1 && left.at(-1).sx < 0);
    assert.equal((await sim(50, H)).at(-1).state, 'idle');
  });

  await check('up shows back, down shows front, diagonal quadrants and stopped facing persist', async () => {
    for (const [keys, back, facing] of [['w',true,1],['wd',true,1],['wa',true,-1],['s',false,1],['sd',false,1],['sa',false,-1]]) {
      await sim(1,H,'a.respawnHero()');
      for (const k of keys) await page.keyboard.down(k);
      const moving = await sim(350,H);
      for (const k of keys) await page.keyboard.up(k);
      assert.ok(moving.every(v => v.back === back && v.textureClip === (back ? 'moveBack' : 'move') && v.facing === facing), keys);
      const stopped = (await sim(100,H)).at(-1);
      assert.equal(stopped.textureClip, back ? 'idleBack' : 'idle');
      assert.equal(stopped.back,back); assert.equal(stopped.facing,facing);
    }
    await page.keyboard.down('w'); await sim(200,H); await page.keyboard.up('w');
    await arena(() => { const app=window.__ARKODIA_APP__, h=window.__ARKODIA_ARENA__.hero, w=app.stage.children[0], v=document.querySelector('#viewport'); w.scale.set(3); w.position.set(v.clientWidth/2-h.view.x*3,v.clientHeight/2-(h.view.y-45)*3); app.render(); });
    await page.screenshot({path:`${OUT}/direction-back.png`});
    await page.keyboard.down('s'); await sim(200,H); await page.keyboard.up('s');
    await arena(() => window.__ARKODIA_APP__.render());
    await page.screenshot({path:`${OUT}/direction-front.png`});
    await arena(() => document.querySelector('#reset').click());
    await sim(1,H,'a.respawnHero()');
  });

  await check('step cadence follows actual distance, equal projected speed, no walking at blocked edge', async () => {
    const r=await arena(() => {
      const a=window.__ARKODIA_ARENA__, h=a.hero, out=[];
      for (const k of ['d','w']) {
        a.keys.clear();a.respawnHero();a.keys.add(k);a.update(1);
        const x=h.view.x,y=h.view.y,s=h.stride;
        for(let t=0;t<30;t++)a.update(1000/60);
        out.push({distance:Math.hypot(h.view.x-x,h.view.y-y),stride:h.stride-s, frame:h.frame()});
      }
      a.keys.clear();h.x=9.1;h.y=.9;a.keys.add('d');a.update(20);
      const blocked={state:h.state,stride:h.stride};a.update(200);
      blocked.after=h.stride;a.keys.clear();a.respawnHero();return {out,blocked};
    });
    assert.ok(Math.abs(r.out[0].distance-r.out[1].distance)<2);
    for (const o of r.out) assert.ok(Math.abs(o.distance/88-o.stride)<.025);
    assert.equal(r.blocked.state,'idle');assert.equal(r.blocked.stride,r.blocked.after);
  });

  await check('enemy chase selects back/up and front/down art independently of hero', async () => {
    const r=await arena(() => {
      const a=window.__ARKODIA_ARENA__; a.respawnHero();a.spawn(1);const e=a.enemies[0],out=[];
      for(const v of [6,4]) { e.x=v;e.y=v;e.play('idle');a.update(50);out.push({state:e.state,back:e.back,clip:e.textureClip,texture:e.sprite.texture.frame.y}); }
      a.spawn(0);return out;
    });
    assert.deepEqual(r.map(v=>v.state),['move','move']);assert.deepEqual(r.map(v=>v.back),[true,false]);
    assert.deepEqual(r.map(v=>v.clip),['moveBack','move']);assert.notEqual(r[0].texture,r[1].texture);
  });

  await check('attack: Space plays all 6 frames once (12 fps) then returns to idle', async () => {
    await page.keyboard.down(' '); const s = await sim(100, H); await page.keyboard.up(' ');
    const rest = await sim(700, H), all = [...s, ...rest].filter(v => v.state === 'attack');
    assert.deepEqual([...new Set(all.map(v => v.frame))], [0, 1, 2, 3, 4, 5]);
    assert.ok(Math.abs(all.length / 60 - 0.5) < 0.04, 'attack lasts 6/12 s'); assert.equal(rest.at(-1).state, 'idle');
  });

  await check('hit then die: hit clip on damage, die clip holds final frame, R revives', async () => {
    const hit = await sim(30, H, 'a.hero.immune=0;a.hero.damage(10)');
    assert.equal(hit[0].state, 'hit'); assert.deepEqual([...new Set(hit.map(v => v.frame))], [0]);
    assert.equal((await sim(300, H)).at(-1).state, 'idle');
    const die = await sim(1500, H, 'a.hero.immune=0;a.hero.hp=1;a.hero.damage(5)');
    assert.deepEqual([...new Set(die.map(v => v.frame))], [0, 1, 2, 3]); assert.ok(die.every(v => v.state === 'die')); assert.equal(die.at(-1).frame, 3);
    await page.keyboard.press('r'); assert.equal((await sim(20, H)).at(-1).state, 'idle');
  });

  await check('equipment UI: 12 atlas icons, potion heals', async () => {
    const r = await arena(() => {
      const slots = [...document.querySelectorAll('#equipment .slot')], h = window.__ARKODIA_ARENA__.hero; h.hp = 40;
      document.querySelector('[data-item="potion"]').click();
      return { n: slots.length, atlas: slots.every(s => s.style.backgroundImage.includes('/assets/characters/equipment.png')), ids: slots.map(s => s.dataset.item), hp: h.hp, potions: document.querySelector('[data-count="potion"]').textContent };
    });
    assert.equal(r.n, 12); assert.ok(r.atlas); assert.equal(new Set(r.ids).size, 12); assert.equal(r.hp, 75); assert.equal(r.potions, '2');
  });
  await page.screenshot({ path: `${OUT}/smoke-equipment-panel.png`, clip: { x: 0, y: 560, width: 300, height: 440 } });

  await check('crowded arena (36): all hero/enemy states occur, kills counted, depth-sorted', async () => {
    await page.selectOption('#crowd', '36'); await page.check('#auto');
    const r = await arena(() => {
      const a = window.__ARKODIA_ARENA__, app = window.__ARKODIA_APP__, enemy = new Set(), hero = new Set(); let unsorted = 0;
      for (let i = 0; i < 60 * 25; i++) {
        a.update(1000 / 60); for (const e of a.enemies) enemy.add(e.state); hero.add(a.hero.state);
        if (i % 30 === 0) { app.render(); const p = app.stage.children[0].children[2].children; for (let k = 1; k < p.length; k++) if (p[k - 1].zIndex > p[k].zIndex) unsorted++; }
      }
      app.render(); return { enemy: [...enemy], hero: [...hero], kills: a.kills, unsorted };
    });
    console.log('  ', JSON.stringify(r));
    for (const s of ['idle', 'move', 'attack', 'hit', 'die']) assert.ok(r.enemy.includes(s), 'enemy state ' + s);
    for (const s of ['idle', 'move', 'attack']) assert.ok(r.hero.includes(s), 'hero state ' + s);
    assert.ok(r.kills > 0); assert.equal(r.unsorted, 0);
    await arena(() => window.__ARKODIA_APP__.ticker.start());
  });
  await page.screenshot({ path: `${OUT}/smoke-arena-36.png` });
  await arena(() => { const w = window.__ARKODIA_APP__.stage.children[0], h = window.__ARKODIA_ARENA__.hero, v = document.querySelector('#viewport');
    w.scale.set(2.2); w.position.set(v.clientWidth / 2 - h.view.x * 2.2, v.clientHeight / 2 - (h.view.y - 50) * 2.2); });
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/smoke-arena-closeup.png` });
  await arena(() => document.querySelector('#reset').click());

  await check('stress arena (72): renders without errors (fps reported, not a hardware claim)', async () => {
    await page.selectOption('#crowd', '72');
    const fps = await arena(() => new Promise(done => { let n = 0; const s = performance.now(); const t = () => { n++; performance.now() - s < 3000 ? requestAnimationFrame(t) : done(n / 3); }; requestAnimationFrame(t); }));
    console.log('   swiftshader fps', fps.toFixed(1));
    assert.equal((await snap()).enemies, 72);
  });
  await page.screenshot({ path: `${OUT}/smoke-arena-72.png` });
  await page.selectOption('#crowd', '36');
  await arena(() => { document.querySelector('#source').click(); document.querySelector('#character-gallery').scrollIntoView(); }); await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/smoke-provenance-dialog.png` });
  await arena(() => document.querySelector('#close').click());
  await check('no page errors', async () => assert.deepEqual(errors, []));
  const report = { url, at: new Date().toISOString(), renderer: await arena(() => window.__ARKODIA_APP__.renderer.name ?? window.__ARKODIA_APP__.renderer.type), results };
  await fs.writeFile(`${OUT}/smoke-${process.env.DEMO_URL ? 'live' : 'local'}.json`, JSON.stringify(report, null, 1));
  console.log('ALL PASSED', results.length);
} finally { await browser.close(); server?.kill(); }
