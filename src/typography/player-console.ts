import { Container, Graphics, Sprite } from 'pixi.js';
import type { FrameSet } from './frames';
import { MsdfText } from './text';
import { ROLES } from './tokens';

interface Meter {
 plate: Graphics;
 track: Sprite;
 trackMask: Graphics;
 fill: Sprite;
 fillMask: Graphics;
 trim: Graphics;
 value: MsdfText;
 label: MsdfText;
 color: number;
 y: number;
 h: number;
 left: number;
 bottomLeft: number;
 trackRightTop: number;
 trackRightBot: number;
 valueX: number;
 valueScale: number;
 ratio: number;
}
const INK = 0x050507;
const OUTLINE = { color: INK, alpha: 1, width: 1.15 };

const placeScaled = (t: MsdfText, x: number, baseline: number, ax = 0, k = 1) => {
 t.scale.set(k);
 t.position.set(x - t.advance * ax * k, baseline - t.metrics().baseline * k);
};

/** Live reference console in 560 × 170 design units (compact & taller bars in mobile portrait). Raster materials never stretch with current value. */
export class PlayerConsole extends Container {
 private art = this.addChild(new Container());
 private nameText = this.addChild(new MsdfText({ ...ROLES['hud-name'], font: 'console', size: 30.5, fill: 0xfff8e8, outline: OUTLINE }, ''));
 private levelText = this.addChild(new MsdfText({ ...ROLES['hud-level'], font: 'console', size: 31, fill: 0xfff9e9, outline: OUTLINE }, '1'));
 private badge = new Graphics();
 private rows: Meter[] = [];
 private portrait = '';
 private loadedPortrait = '';
 private isPortrait = false;
 private lastHeroName = '';
 private lastLevel = 1;
 private lastValues: [number, number][] = [[100, 100], [100, 100], [0, 100]];
 private key = '';

 constructor(private frames: FrameSet) {
  super();
  const labels = ['HP', 'GATE', 'XP'];
  [0xf71325, 0x00d5ed, 0xffc51c].forEach((color, i) => {
   const plate = this.addChild(new Graphics());
   const texture = frames.texture(['console-hp-material', 'console-gate-material', 'console-xp-material'][i]);
   const track = this.addChild(new Sprite(texture));
   track.tint = 0x645344;
   const trackMask = this.addChild(new Graphics());
   track.mask = trackMask;
   const fill = this.addChild(new Sprite(texture));
   const fillMask = this.addChild(new Graphics());
   fill.mask = fillMask;
   const trim = this.addChild(new Graphics());
   const value = this.addChild(new MsdfText({ ...ROLES['hud-value'], font: 'console', size: i === 2 ? 14.5 : 16.5, fill: 0xfff8e7, outline: OUTLINE }, ''));
   const label = this.addChild(new MsdfText({ ...ROLES['hud-name'], font: 'console', size: 13, fill: 0xfff4db, outline: OUTLINE }, labels[i]));
   this.rows.push({
    plate,
    track,
    trackMask,
    fill,
    fillMask,
    trim,
    value,
    label,
    color,
    y: 0,
    h: 0,
    left: 0,
    bottomLeft: 0,
    trackRightTop: 555,
    trackRightBot: 542,
    valueX: 536,
    valueScale: 1,
    ratio: 0,
   });
  });
  this.addChild(this.badge);
  this.setChildIndex(this.levelText, this.children.length - 1);
  this.rebuildLayout();
 }

 setPortrait(portrait: boolean) {
  if (this.isPortrait === portrait) return;
  this.isPortrait = portrait;
  this.key = '';
  this.rebuildLayout();
  if (this.lastHeroName || this.portrait) {
   this.update(this.lastHeroName, this.portrait, this.lastLevel, this.lastValues);
  }
 }

 private layoutPortraitSprite() {
  const image = this.art.children[0] as Sprite | undefined;
  if (!image) return;
  if (this.isPortrait) {
   image.position.set(6, 13);
   image.width = 154;
   image.height = 154;
  } else {
   image.position.set(7, 12);
   image.width = 140;
   image.height = 140;
  }
 }

 private rebuildLayout() {
  const p = this.isPortrait;
  const rightTop = p ? 392 : 558;
  const rightBot = p ? 378 : 544;
  const trackRightTop = p ? 389 : 555;
  const trackRightBot = p ? 376 : 542;
  const valueX = p ? 370 : 536;
  const valueScale = p ? 1.18 : 1;
  const labelScale = p ? 1.06 : 1;

  this.rows.forEach((row, i) => {
   const y = p ? [56, 97, 138][i] : [66, 99, 133][i];
   const h = p ? (i === 2 ? 27 : 35) : (i === 2 ? 17 : 24);
   const left = p
    ? (i === 2 ? 242 : i === 1 ? 249 : 246)
    : (i === 2 ? 240 : i === 1 ? 247 : 244);
   const bottomLeft = i === 1 ? 234 : 230;
   const path = [left, y + 1.5, trackRightTop, y + 1.5, trackRightBot, y + h - 1.5, bottomLeft, y + h - 1.5];

   row.y = y;
   row.h = h;
   row.left = left;
   row.bottomLeft = bottomLeft;
   row.trackRightTop = trackRightTop;
   row.trackRightBot = trackRightBot;
   row.valueX = valueX;
   row.valueScale = valueScale;

   // Dark metal label plate, recessed track and thin bevel
   row.plate.clear();
   row.plate.poly([169, y + 1, rightTop, y + 1, rightBot, y + h + 2, 154, y + h + 2]).fill({ color: 0x000000, alpha: 0.55 });
   row.plate.poly([169, y, rightTop, y, rightBot, y + h, 155, y + h]).fill(0x0b0c0d).stroke({ color: INK, width: 2.1 });
   row.plate.poly([170, y + 1, rightTop - 2, y + 1, rightBot - 1, y + h - 1, 157, y + h - 1]).stroke({ color: i === 2 ? 0x987526 : 0x99968b, width: 0.65 });

   row.track.position.set(bottomLeft, y);
   row.track.width = 326;
   row.track.height = h;
   row.trackMask.clear().poly(path).fill(0xffffff);

   row.fill.position.copyFrom(row.track.position);
   row.fill.width = row.track.width;
   row.fill.height = h;

   row.trim.clear();
   row.trim.poly(path).stroke({ color: row.color, width: 1 });
   row.trim.moveTo(left + 1, y + 2).lineTo(trackRightTop - 2, y + 2).stroke({ color: 0xfff9e4, width: 0.6, alpha: 0.65 });
   if (i === 2) {
    const tickEnd = p ? trackRightBot - 48 : 515;
    const tickStep = p ? 26 : 33;
    for (let x = 256; x < tickEnd; x += tickStep) {
     row.trim.moveTo(x + 0.5, y + 6).lineTo(x + 0.5, y + h - 4).stroke({ color: 0x170f02, width: 1.2 });
     row.trim.moveTo(x, y + 6).lineTo(x, y + h - 4).stroke({ color: 0xffe3a0, width: 0.65 });
    }
   }

   placeScaled(row.label, p ? 174 : 176, y + h * (p ? 0.69 : 0.73), 0, labelScale);
  });

  const bx = p ? 30 : 29;
  const by = p ? 152 : 137;
  const br = p ? 1.06 : 1;
  this.badge.clear();
  this.badge.circle(bx, by + 0.8, 20.5 * br).fill(0x030303).stroke({ color: 0x120b02, width: 1.4 });
  this.badge.circle(bx, by, 19.2 * br).fill(0x100e0a).stroke({ color: 0xc58d2b, width: 1.6 });
  this.badge.circle(bx, by - 0.5, 18.4 * br).stroke({ color: 0xffe6a2, width: 0.6 });
  this.badge.circle(bx, by, 17.6 * br).fill(0x07090b);
  this.layoutPortraitSprite();
 }

 update(name: string, portrait: string, level: number, values: [number, number][]) {
  this.lastHeroName = name;
  this.portrait = portrait;
  this.lastLevel = level;
  this.lastValues = values;
  const key = JSON.stringify([this.isPortrait, name, portrait, level, values]);
  if (key === this.key) return;
  this.key = key;

  const p = this.isPortrait;
  const maxNameW = p ? 224 : 390;
  this.nameText.text = name;
  placeScaled(this.nameText, 165, p ? 47 : 54, 0, p ? 0.92 : 1);
  if (this.nameText.width > maxNameW) {
   this.nameText.scale.x *= maxNameW / this.nameText.width;
  }

  const bx = p ? 30 : 29;
  const bTextY = p ? 162 : 147;
  this.levelText.scale.set(1);
  this.levelText.text = String(level);
  this.levelText.place(bx, bTextY, 0.5);
  if (this.levelText.width > 30) this.levelText.scale.set(30 / this.levelText.width);

  if (this.loadedPortrait !== portrait) {
   this.loadedPortrait = portrait;
   for (const child of this.art.removeChildren()) child.destroy();
   // A single transparent portrait+bezel asset: no opaque sibling can cover it.
   this.art.addChild(new Sprite(this.frames.texture(`console-${portrait}`)));
   this.layoutPortraitSprite();
  }

  this.rows.forEach((row, i) => {
   const [raw, rawMax] = values[i];
   const current = Number.isFinite(raw) ? Math.max(0, raw) : 0;
   const max = Number.isFinite(rawMax) ? Math.max(1, rawMax) : 1;
   const ratio = Math.min(1, current / max);
   const { fillMask: g, y, h, left, bottomLeft, trackRightTop, trackRightBot, valueX, valueScale } = row;
   row.ratio = ratio;
   row.fill.visible = ratio > 0;
   g.clear();
   // A vertical reveal, rather than scaling/shortening the painted material or using a slanted moving tip.
   const end = bottomLeft + (trackRightTop - bottomLeft) * ratio;
   if (ratio > 0) {
    if (end < left) {
     const upperY = y + 1.5 + ((left - end) / (left - bottomLeft)) * (h - 3);
     g.poly([end, upperY, end, y + h - 1.5, bottomLeft, y + h - 1.5]).fill(0xffffff);
    } else {
     g.poly([left, y + 1.5, end, y + 1.5, Math.min(end, trackRightBot), y + h - 1.5, bottomLeft, y + h - 1.5]).fill(0xffffff);
    }
   }
   row.value.text = `${Math.floor(current)} / ${Math.floor(max)}`;
   placeScaled(row.value, valueX, y + h * (p ? 0.70 : 0.77), 1, valueScale);
  });
 }
}
