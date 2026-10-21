import type { Clip, ClipName, TextureClipName } from './sprites';

// Combat rules shared by the arena, Frostpass and the Stronghold: hit points, reach, damage, hit stun and the
// clip state machine. Renderer-free, so the Stronghold's 2D canvas and the arena's Pixi views drive the same
// fighters. Distances are ground tiles; facing is the sign of the screen x direction (+1 right, -1 left).
export type Kind = 'hero' | 'revenant';
export const STATS = {
  hero: { hp: 100, speed: 2.2, reach: 1.15, damage: 1 },
  revenant: { hp: 2, speed: 0.8, reach: 0.85, damage: 4 },
};
export const CLEAVE = 3; // most enemies one swing can hit

export class Fighter {
  state: ClipName = 'idle'; t = 0; facing = 1; back = false; vertical = false; stride = 0; hp: number; cooldown = 0; impactDone = false; flash = 0; deadFor = 0; immune = 0;
  constructor(public kind: Kind, public clips: Record<TextureClipName, Clip>, public x: number, public y: number) { this.hp = STATS[kind].hp; }
  get textureClip(): TextureClipName {
    if (this.vertical && (this.state === 'idle' || this.state === 'move')) return `${this.state}${this.back ? 'Up' : 'Down'}`;
    return this.back && (this.state === 'idle' || this.state === 'move') ? `${this.state}Back` : this.state;
  }
  get clip() { return this.clips[this.textureClip]; }
  get alive() { return this.state !== 'die'; }
  frame() { const n = this.clip.frames.length, i = this.state === 'move' ? Math.floor(this.stride * n) : Math.floor(this.t * this.clip.fps / 1000); return this.clip.loop ? i % n : Math.min(i, n - 1); }
  finished() { return !this.clip.loop && this.t >= this.clip.frames.length * 1000 / this.clip.fps; }
  play(state: ClipName) { if (this.state === state && this.clip.loop) return; this.state = state; this.t = 0; this.impactDone = false; }
  tick(dt: number) { this.t += dt; this.cooldown -= dt; this.flash -= dt; this.immune -= dt; }
  // A finished swing or hit stun returns to idle.
  recover() { if ((this.state === 'hit' || this.state === 'attack') && this.finished()) this.play('idle'); }
  // True when this blow is the killing one.
  damage(n: number) {
    if (!this.alive || this.immune > 0) return false;
    this.hp -= n; this.flash = 120;
    if (this.hp <= 0) { this.hp = 0; this.play('die'); this.deadFor = 0; return true; }
    if (this.kind === 'revenant' || this.state !== 'attack') { this.play('hit'); this.immune = this.kind === 'hero' ? 600 : 0; }
    return false;
  }
  // The swing's impact frame, once per swing.
  impact() { if (this.state !== 'attack' || this.impactDone || this.frame() < this.clip.impact!) return false; this.impactDone = true; return true; }
}

// Turn toward a screen direction. Front/rear art only within 10 degrees of straight up/down (a 15 degree band to
// leave absorbs AI jitter); angular dead bands near each axis keep the previous quadrant, so small collision
// corrections never flip front/back or left/right art.
export function turn(a: Fighter, sx: number, sy: number) {
  const length = Math.hypot(sx, sy); if (length < 1e-6) return;
  a.vertical = Math.abs(sx) / length < Math.sin((a.vertical ? 15 : 10) * Math.PI / 180);
  if (Math.abs(sy) / length > .15) a.back = sy < 0;
  if (Math.abs(sx) / length > .15) a.facing = sx > 0 ? 1 : -1;
}
// In reach: close enough, and in front of the attacker or within `side` tiles of straight above or below it on screen.
export function inReach(a: Fighter, b: Fighter, reach: number, side = .35) {
  const dx = b.x - a.x, dy = b.y - a.y, sx = dx - dy;
  return Math.hypot(dx, dy) <= reach && (Math.abs(sx) < side || Math.sign(sx) === a.facing);
}
// The swing lands on the nearest CLEAVE living targets in reach.
export function swingTargets(a: Fighter, targets: Fighter[], reach: number, side = .35) {
  return targets.filter(e => e.alive && inReach(a, e, reach, side)).sort((p, q) => Math.hypot(p.x - a.x, p.y - a.y) - Math.hypot(q.x - a.x, q.y - a.y)).slice(0, CLEAVE);
}
