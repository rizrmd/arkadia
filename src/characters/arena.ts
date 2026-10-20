import { Container, Graphics, Sprite } from 'pixi.js';
import type { ClipName, SpriteSet, TextureClipName } from './sprites';
import {ISO} from '../isometric';

// Gameplay for the character preview: one hero vs a crowd of ash revenants on the 10 × 10 arena grid.
// Dedicated straight up/down gait supplements mirrored diagonal front/back locomotion.
type Point = { x: number; y: number };
const MAX_STEP = 50, MIN = 0.9, MAX = 9.1, ENGAGED = 8, SPACING = .72, CLEAVE = 3;
const DISPLAY = 1.1; // atlas px → world px (atlas is 0.5 × source); idle hero ≈ 116 world px on a 128 × 64 tile
const STATS = {
  hero: { hp: 100, speed: 2.2, reach: 1.15, damage: 1 },
  revenant: { hp: 2, speed: 0.8, reach: 0.85, damage: 4 },
};

export class Actor {
  view = new Container(); sprite: Sprite; shadow: Graphics; pivotMark: Graphics;
  state: ClipName = 'idle'; t = 0; facing = 1; back = false; vertical = false; stride = 0; hp: number; cooldown = 0; impactDone = false; flash = 0; deadFor = 0; wander: Point | null = null; immune = 0; retreating = false;
  constructor(public kind: 'hero' | 'revenant', public set: SpriteSet, public x: number, public y: number) {
    this.hp = STATS[kind].hp;
    this.shadow = new Graphics().ellipse(0, 0, 26, 26*ISO.slope).fill({ color: 0x050608, alpha: .38 });
    this.sprite = new Sprite(set.clips.idle[0]);
    this.sprite.anchor.set(set.anchor.x, set.anchor.y); this.sprite.roundPixels = true;
    this.pivotMark = new Graphics().circle(0, 0, 2.6).fill(kind === 'hero' ? 0x7fe0ff : 0xff6f8a); this.pivotMark.visible = false;
    this.view.addChild(this.shadow, this.sprite, this.pivotMark); this.view.label = kind;
  }
  get textureClip(): TextureClipName {
    if (this.vertical && (this.state === 'idle' || this.state === 'move')) return `${this.state}${this.back ? 'Up' : 'Down'}`;
    return this.back && (this.state === 'idle' || this.state === 'move') ? `${this.state}Back` : this.state;
  }
  get clip() { return this.set.meta.clips[this.textureClip]; }
  get alive() { return this.state !== 'die'; }
  frame() { const n = this.clip.frames.length, i = this.state === 'move' ? Math.floor(this.stride * n) : Math.floor(this.t * this.clip.fps / 1000); return this.clip.loop ? i % n : Math.min(i, n - 1); }
  finished() { return !this.clip.loop && this.t >= this.clip.frames.length * 1000 / this.clip.fps; }
  play(state: ClipName) { if (this.state === state && this.clip.loop) return; this.state = state; this.t = 0; this.impactDone = false; }
  damage(n: number) {
    if (!this.alive || this.immune > 0) return false;
    this.hp -= n; this.flash = 120;
    if (this.hp <= 0) { this.hp = 0; this.play('die'); this.deadFor = 0; return true; }
    if (this.kind === 'revenant' || this.state !== 'attack') { this.play('hit'); this.immune = this.kind === 'hero' ? 600 : 0; }
    return false;
  }
}

export class Arena {
  respawnEnemies = true;
  hero: Actor; enemies: Actor[] = []; kills = 0; auto = true; mirror = true; pivots = false; manualUntil = 0; clock = 0;
  keys = new Set<string>(); private engaged = new Set<Actor>(); private moves = new Map<Actor, { before: Point; direction: Point; wasMoving: boolean }>(); private rand: () => number; frameChanges = 0;
  constructor(private sets: Record<string, SpriteSet>, private toScreen: (x: number, y: number) => Point, seed: () => number) {
    this.rand = seed; this.hero = new Actor('hero', sets.hero, 5, 5);
  }
  get actors() { return [this.hero, ...this.enemies]; }
  spawn(count: number) {
    this.enemies.forEach(e => e.view.destroy({ children: true }));
    this.enemies = [];
    for (let i = 0; i < count; i++) { const p = this.edgePoint(); this.enemies.push(new Actor('revenant', this.sets.revenant, p.x, p.y)); }
  }
  private edgePoint(): Point {
    for (;;) { const p = { x: MIN + this.rand() * (MAX - MIN), y: MIN + this.rand() * (MAX - MIN) }; if (Math.hypot(p.x - this.hero.x, p.y - this.hero.y) > 2.5) return p; }
  }
  attach(layer: Container) { for (const a of this.actors) layer.addChild(a.view); this.sync(); }
  detach() { for (const a of this.actors) a.view.parent?.removeChild(a.view); }
  respawnHero() { const h = this.hero; h.hp = STATS.hero.hp; h.x = 5; h.y = 5; h.back = false; h.vertical = false; h.facing = 1; h.play('idle'); h.view.alpha = 1; }

  // Variable step (sub-stepped to ≤ 50 ms) so animation time tracks real time exactly; a fixed-step accumulator
  // at a matching 60 Hz display alternates 0/2 steps per frame, which reads as stutter.
  update(ms: number) {
    for (let left = Math.min(ms, 250); left > 0; left -= MAX_STEP) this.step(Math.min(left, MAX_STEP));
    this.sync();
  }
  private step(dt: number) {
    this.moves.clear();
    this.clock += dt;
    for (const a of this.actors) { a.t += dt; a.cooldown -= dt; a.flash -= dt; a.immune -= dt; }
    this.heroStep(dt);
    const h = this.hero; this.engaged = new Set(this.enemies.filter(e => e.alive).sort((a, b) => (Math.hypot(a.x - h.x, a.y - h.y) - (this.engaged.has(a) ? .3 : 0)) - (Math.hypot(b.x - h.x, b.y - h.y) - (this.engaged.has(b) ? .3 : 0))).slice(0, ENGAGED));
    for (const e of this.enemies) this.enemyStep(e, dt);
    this.separate();
    this.finishMoves(dt);
  }
  private move(a: Actor, d: Point, dt: number) {
    const len = Math.hypot(d.x, d.y); if (len < 1e-6) return;
    const before = this.toScreen(a.x, a.y);
    // Screen-space speed stays equal for up/down and left/right on the 2:1 isometric map.
    const projected = this.toScreen(d.x / len, d.y / len), zero = this.toScreen(0, 0);
    const pxPerUnit = Math.hypot(projected.x - zero.x, projected.y - zero.y);
    const v = STATS[a.kind].speed * 64 * dt / 1000 / pxPerUnit;
    a.x = Math.min(MAX, Math.max(MIN, a.x + d.x / len * v)); a.y = Math.min(MAX, Math.max(MIN, a.y + d.y / len * v));
    this.moves.set(a, { before, direction: { x: (projected.x - zero.x) / pxPerUnit, y: (projected.y - zero.y) / pxPerUnit }, wasMoving: a.state === 'move' });
    this.face(a, d);
  }
  private finishMoves(dt: number) {
    for (const [a, { before, direction, wasMoving }] of this.moves) {
      const after = this.toScreen(a.x, a.y);
      // Only forward progress after collision resolution advances the gait. Being pushed
      // backwards or sideways must not make a blocked actor walk in place.
      const progress = Math.max(0, (after.x - before.x) * direction.x + (after.y - before.y) * direction.y);
      const moving = progress / (dt / 1000) > (wasMoving ? 2 : 5);
      a.play(moving ? 'move' : 'idle');
      if (moving) a.stride += progress / (a.kind === 'hero' ? 88 : 76);
    }
  }
  private face(a: Actor, d: Point) {
    const origin = this.toScreen(0, 0), p = this.toScreen(d.x, d.y), sx = p.x - origin.x, sy = p.y - origin.y;
    const length = Math.hypot(sx, sy);
    if (length < 1e-6) return;
    // Reserve frontal/rear artwork for paths within 10° of straight up/down.
    // A small 15° exit band absorbs AI jitter without retaining vertical art
    // once the path visibly turns diagonal.
    a.vertical = Math.abs(sx) / length < Math.sin((a.vertical ? 15 : 10) * Math.PI / 180);
    // Angular dead bands retain the previous quadrant near an axis, independent of
    // target distance. Small collision corrections no longer flip front/back art.
    if (Math.abs(sy) / length > .15) a.back = sy < 0;
    if (Math.abs(sx) / length > .15) a.facing = sx > 0 ? 1 : -1;
  }
  private recover(a: Actor) { if ((a.state === 'hit' || a.state === 'attack') && a.finished()) a.play('idle'); }
  private heroStep(dt: number) {
    const h = this.hero;
    if (!h.alive) { h.deadFor += dt; if (this.auto && h.deadFor > 3500) this.respawnHero(); return; }
    this.recover(h);
    if (h.state === 'attack') {
      if (!h.impactDone && h.frame() >= h.clip.impact!) {
        h.impactDone = true;
        const hits = this.enemies.filter(e => e.alive && this.inReach(h, e, STATS.hero.reach)).sort((a, b) => Math.hypot(a.x - h.x, a.y - h.y) - Math.hypot(b.x - h.x, b.y - h.y)).slice(0, CLEAVE);
        for (const e of hits) if (e.damage(STATS.hero.damage)) this.kills++;
      }
      return;
    }
    if (h.state === 'hit') return;
    const k = this.keys, d = { x: 0, y: 0 };
    if (k.has('w')) { d.x--; d.y--; } if (k.has('s')) { d.x++; d.y++; } if (k.has('a')) { d.x--; d.y++; } if (k.has('d')) { d.x++; d.y--; }
    const manual = d.x || d.y || k.has(' ');
    if (manual) this.manualUntil = this.clock + 3000;
    if (k.has(' ')) { h.play('attack'); return; }
    if (d.x || d.y) { this.move(h, d, dt); return; }
    if (this.auto && this.clock > this.manualUntil) {
      const target = this.nearest(h);
      if (target) {
        const to = { x: target.x - h.x, y: target.y - h.y };
        if (Math.hypot(to.x, to.y) > STATS.hero.reach * .8) { this.move(h, to, dt); return; }
        this.face(h, to); h.play('attack'); return;
      }
    }
    h.play('idle');
  }
  private enemyStep(e: Actor, dt: number) {
    if (!e.alive) {
      e.deadFor += dt;
      if (e.deadFor > 3500) e.view.alpha = Math.max(0, 1 - (e.deadFor - 3500) / 900);
      if (this.respawnEnemies && e.deadFor > 4400) { const p = this.edgePoint(); Object.assign(e, { x: p.x, y: p.y, hp: STATS.revenant.hp, deadFor: 0 }); e.view.alpha = 1; e.play('idle'); }
      return;
    }
    this.recover(e);
    if (e.state === 'hit') return;
    const h = this.hero, to = { x: h.x - e.x, y: h.y - e.y }, dist = Math.hypot(to.x, to.y);
    if (e.state === 'attack') {
      if (!e.impactDone && e.frame() >= e.clip.impact!) { e.impactDone = true; if (h.alive && this.inReach(e, h, STATS.revenant.reach + .25)) h.damage(STATS.revenant.damage); }
      return;
    }
    // Only the nearest ENGAGED revenants press the attack; the rest keep a loose ring so the hero stays readable.
    if (h.alive && dist < 5.5 && this.engaged.has(e)) {
      if (dist > STATS.revenant.reach) { this.move(e, to, dt); return; }
      this.face(e, to);
      if (e.cooldown <= 0) { e.cooldown = 1500 + this.rand() * 1200; e.play('attack'); return; }
      e.play('idle'); return;
    }
    // Separate enter/leave radii prevent collision pushes from reversing a ring
    // actor's decision every frame at the old single 2.4-tile boundary.
    e.retreating = h.alive && dist < (e.retreating ? 2.6 : 2.4);
    if (e.retreating) { this.move(e, { x: -to.x, y: -to.y }, dt); return; }
    if (!e.wander || this.rand() < .002) e.wander = this.rand() < .5 ? this.edgePoint() : { x: e.x, y: e.y };
    const w = { x: e.wander.x - e.x, y: e.wander.y - e.y };
    if (Math.hypot(w.x, w.y) > .15) { this.move(e, w, dt); } else e.play('idle');
  }
  private inReach(a: Actor, b: Actor, reach: number) {
    const dx = b.x - a.x, dy = b.y - a.y, sx = dx - dy;
    return Math.hypot(dx, dy) <= reach && (Math.abs(sx) < .35 || Math.sign(sx) === a.facing);
  }
  private nearest(a: Actor) { let best: Actor | null = null, d = Infinity; for (const e of this.enemies) { const v = Math.hypot(e.x - a.x, e.y - a.y); if (e.alive && v < d) { d = v; best = e; } } return best; }
  private separate() {
    const list = this.actors.filter(a => a.alive);
    for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
      const a = list[i], b = list[j], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
      if (d >= SPACING || d < 1e-6) continue;
      const push = (SPACING - d) / 2, ux = dx / d * push, uy = dy / d * push;
      a.x = Math.min(MAX, Math.max(MIN, a.x - ux)); a.y = Math.min(MAX, Math.max(MIN, a.y - uy));
      b.x = Math.min(MAX, Math.max(MIN, b.x + ux)); b.y = Math.min(MAX, Math.max(MIN, b.y + uy));
    }
  }
  sync() {
    for (const a of this.actors) {
      const p = this.toScreen(a.x - 4.5, a.y - 4.5), tex = a.set.clips[a.textureClip][a.frame()];
      if (a.sprite.texture !== tex) { a.sprite.texture = tex; this.frameChanges++; }
      a.view.position.set(Math.round(p.x), Math.round(p.y)); a.view.zIndex = a.view.y;
      a.sprite.scale.set((this.mirror && !a.vertical ? a.facing : 1) * DISPLAY, DISPLAY);
      a.sprite.tint = a.flash > 0 ? 0xffb4a0 : 0xffffff;
      a.shadow.visible = a.state !== 'die' || a.frame() < 2; a.pivotMark.visible = this.pivots;
    }
  }
  snapshot() {
    const h = this.hero, counts: Record<string, number> = {};
    for (const e of this.enemies) counts[e.state] = (counts[e.state] ?? 0) + 1;
    return { hero: { state: h.state, frame: h.frame(), hp: h.hp, x: +h.x.toFixed(2), y: +h.y.toFixed(2), facing: h.facing, back: h.back, vertical: h.vertical, textureClip: h.textureClip, stride: h.stride, texture: h.sprite.texture.frame.x + ',' + h.sprite.texture.frame.y, anchor: [h.sprite.anchor.x, h.sprite.anchor.y] },
      enemies: this.enemies.length, alive: this.enemies.filter(e => e.alive).length, enemyStates: counts, kills: this.kills, auto: this.auto, mirror: this.mirror, frameChanges: this.frameChanges };
  }
}
