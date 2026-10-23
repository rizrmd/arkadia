import { Container, Graphics, Rectangle, Sprite, type Texture } from 'pixi.js';
import type { FrameSet } from './frames';
import { PlayerConsole } from './player-console';
import { MsdfText } from './text';
import { ROLES, type TextRole } from './tokens';
import type { Point2D, SkillSocketGeometry } from './vector-tether';

const BAR_OUTLINE = { color: 0x160a04, alpha: 0.9, width: 1.1 };
const HP_TEXT_ROLE: TextRole = { ...ROLES['hud-value'], outline: BAR_OUTLINE };
const XP_VAL_ROLE: TextRole = { ...ROLES['hud-xp'], outline: BAR_OUTLINE };
const XP_REST_ROLE: TextRole = { ...ROLES['hud-xp-accent'], outline: BAR_OUTLINE };
const TL_XP_VAL_ROLE: TextRole = { ...ROLES['hud-xp'], size: 20, outline: BAR_OUTLINE };
const TL_XP_REST_ROLE: TextRole = { ...ROLES['hud-xp-accent'], size: 20, outline: BAR_OUTLINE };
const COOLDOWN_NUM_ROLE: TextRole = {
 ...ROLES['display-title'],
 size: 22,
 letterSpacing: 0.2,
 fill: 0xfff5d6,
 outline: { color: 0x06080e, alpha: 0.96, width: 1.6 },
};
const HOTKEY_ROLE: TextRole = {
 ...ROLES['hud-key'],
 size: 13.5,
 fill: 0xf5deb0,
 outline: { color: 0x0c0804, alpha: 0.92, width: 1.0 },
};
const PLAQUE_STAT_ROLE: TextRole = {
 ...ROLES['hud-stat'],
 size: 24.5,
 fill: 0xf6ebd2,
 outline: { color: 0x120a04, alpha: 0.92, width: 1.1 },
};
const LEDGER_TEXT_ROLE: TextRole = {
 ...ROLES['hud-stat'],
 size: 22.5,
 fill: 0xf5ead2,
 outline: { color: 0x120a04, alpha: 0.94, width: 1.2 },
 shadow: { color: 0x000000, alpha: 0.9, dx: 0, dy: 1.8, softness: 2.1 },
};
// High-contrast Cinzel small-caps telemetry role (24 MS ♦ 60 FPS):
// In Cinzel-SemiBold, digits 0-9 are full-height caps while lowercase 'ms'/'fps' render as true small-caps (MS / FPS).
const TELEMETRY_ROLE: TextRole = {
 font: 'display',
 size: 19.5,
 letterSpacing: 0.55,
 fill: [0xfff6dc, 0xf2dca2, 0xcf9e46],
 outline: { color: 0x120903, alpha: 0.96, width: 1.45 },
 shadow: { color: 0x000000, alpha: 0.92, dx: 0, dy: 2.0, softness: 2.3 },
 glow: { color: 0x000000, alpha: 0.55, width: 4.5 },
};

const formatGoldLabel = (labelOrAmount: number | string): string => {
 if (typeof labelOrAmount === 'number') {
  return `${Math.max(0, Math.floor(labelOrAmount)).toLocaleString('en-US')} Gold`;
 }
 const m = /^(\d+)\s+Gold$/i.exec(labelOrAmount.trim());
 if (m) {
  const n = Number(m[1]);
  if (Number.isFinite(n) && n >= 1000) {
   return `${Math.floor(n).toLocaleString('en-US')} Gold`;
  }
 }
 return labelOrAmount;
};

const drawCompassStar = (
 g: Graphics,
 cx: number,
 cy: number,
 rx: number,
 ry: number,
 gem = false,
) => {
 const k = Math.min(rx, ry) * 0.34;
 const pts = [
  cx, cy - ry,
  cx + k, cy - k,
  cx + rx, cy,
  cx + k, cy + k,
  cx, cy + ry,
  cx - k, cy + k,
  cx - rx, cy,
  cx - k, cy - k,
 ];
 g.poly(pts, true)
  .fill({ color: 0xe6bc66, alpha: 0.98 })
  .stroke({ color: 0x1c1006, width: 1.1, alpha: 0.95 });
 g.poly([cx, cy - ry * 0.72, cx + k * 0.65, cy - k * 0.65, cx + rx * 0.72, cy, cx, cy], true)
  .fill({ color: 0xfff4cf, alpha: 0.85 });
 if (gem) {
  g.circle(cx, cy, Math.min(rx, ry) * 0.24)
   .fill({ color: 0x7d1408, alpha: 0.96 })
   .stroke({ color: 0xfbe7b5, width: 0.45, alpha: 0.88 });
 }
};

const drawChamferedPlaque = (
 g: Graphics,
 medCx: number,
 rightX: number,
 cy: number,
 h: number,
 chamfer: number,
 medR: number,
) => {
 const top = cy - h / 2;
 const bot = cy + h / 2;
 const xChamfer = rightX - chamfer;

 // Soft drop shadow under the plaque
 g.poly(
  [medCx, top + 2.2, xChamfer, top + 2.2, rightX + 1.5, cy + 2.2, xChamfer, bot + 2.2, medCx, bot + 2.2],
  true,
 ).fill({ color: 0x000000, alpha: 0.52 });

 // Outer dark ink contour (#1c1006)
 g.poly(
  [medCx, top - 1.4, xChamfer + 0.5, top - 1.4, rightX + 1.6, cy, xChamfer + 0.5, bot + 1.4, medCx, bot + 1.4],
  true,
 ).fill({ color: 0x1c1006, alpha: 0.96 });

 // Dark obsidian body fill with subtle warm upper-half sheen
 g.poly([medCx, top, xChamfer, top, rightX, cy, xChamfer, bot, medCx, bot], true)
  .fill({ color: 0x090706, alpha: 0.95 });
 g.poly([medCx, top, xChamfer, top, rightX, cy, medCx, cy], true)
  .fill({ color: 0x18120e, alpha: 0.58 });

 // Antique-gold outer rails
 g.moveTo(medCx, top)
  .lineTo(xChamfer, top)
  .lineTo(rightX, cy)
  .lineTo(xChamfer, bot)
  .lineTo(medCx, bot)
  .stroke({ color: 0xb88236, width: 2.1, alpha: 0.98 });
 g.moveTo(medCx, top)
  .lineTo(xChamfer, top)
  .lineTo(rightX, cy)
  .stroke({ color: 0xe6be6c, width: 1.3, alpha: 0.96 });
 g.moveTo(medCx + medR * 0.65, top - 0.3)
  .lineTo(xChamfer - 1, top - 0.3)
  .stroke({ color: 0xfbe7b5, width: 0.65, alpha: 0.72 });

 // Inner inset pale-gold hairline; keep the icon-label join free of cuff separators.
 const inset = 3.2;
 const cuffR = medR + 3.2;
 const dy = h / 2 - inset;
 const ang = Math.asin(Math.min(0.98, dy / cuffR));
 const arcStartX = medCx + Math.cos(ang) * cuffR;
 g.moveTo(arcStartX, top + inset)
  .lineTo(xChamfer - 1.8, top + inset)
  .lineTo(rightX - 4.2, cy)
  .lineTo(xChamfer - 1.8, bot - inset)
  .lineTo(arcStartX, bot - inset)
  .stroke({ color: 0xfbe7b5, width: 0.65, alpha: 0.34 });

 // Right 4-point compass star finial
 drawCompassStar(g, rightX + 1, cy, 6.2, 4.3, false);
};

// Gameplay HUD built on the 1672 × 941 design space.
// Supports both the confirmed Battle HUD Alternative B (Bottom-Right Crescent Action Arc & Split Peripheral HUD, default)
// and the legacy reference specimen layout when `images.reference` is provided for `scripts/typography/capture.mjs`.
export const HUD_DESIGN = { width: 1672, height: 941 };

export interface HudSkillState {
 name: string;
 level: number;
 art: string;
 stateLabel?: string;
 locked?: boolean;
 cooldownRatio?: number;
 cooldownSec?: number;
 hotkey?: string;
}

export interface HudState {
 name: string;
 portrait?: string;
 level: number;
 hp: number;
 hpMax: number;
 gateHp?: number;
 gateHpMax?: number;
 gold: number;
 time: string;
 zone: string;
 xp: number;
 xpMax: number;
 coopLabel?: string;
 pingMs?: number;
 fps?: number;
 skills: HudSkillState[];
}

export interface HudCallbacks {
 onHeroClick?: () => void;
 onClockClick?: () => void;
 onCoopClick?: () => void;
 onSkillClick?: (index: number) => void;
 onMenuClick?: () => void;
}

export const DEFAULT_HUD: HudState = {
 name: 'Ember Warden',
 portrait: 'portrait-ember-warden',
 level: 9,
 hp: 96,
 hpMax: 100,
 gateHp: 100,
 gateHpMax: 100,
 gold: 250,
 time: '06:27',
 zone: 'Wilds',
 xp: 60,
 xpMax: 100,
 pingMs: 24,
 fps: 60,
 skills: [
  { name: 'Flame Fan', level: 1, art: 'skill-flame-fan' },
  { name: 'Rift Trap', level: 2, art: 'skill-rift-trap' },
  { name: 'Seismic Slam', level: 3, art: 'skill-seismic-slam' },
 ],
};

const centred = (s: Sprite | Container, cx: number, cy: number, w?: number, h?: number) => {
 if (w) s.width = w;
 if (h) s.height = h;
 s.position.set(cx - s.width / 2, cy - s.height / 2);
 return s;
};

interface SkillSlotView {
 root: Container;
 socketBg: Graphics;
 artHolder: Container;
 currentArt: string;
 cooldownArc: Graphics;
 cooldownText: MsdfText;
 lastCooldownStep?: number;
 ringSprite: Container;
 levelBadge: Container;
 levelText: MsdfText;
 stateBadge: Container;
 stateText: MsdfText;
 nameBg: Graphics;
 nameText: MsdfText;
 hotkeyBadge: Container;
 hotkeyBg: Graphics;
 hotkeyText: MsdfText;
 plusBadge: Graphics;
 cx: number;
 cy: number;
 radius: number;
}

// Crescent Action Arc design-space coordinates inside `groups.br` (pivot at W=1672, H=941)
const ALT_B_ARC_CENTER = { x: 1656, y: 926 };
const ALT_B_SLOTS_DESKTOP = [
 // Slot 0: Primary active skill nested at the inner curve
 { cx: 1468, cy: 758, ringSize: 128, artSize: 94, radius: 62, hotkey: 'SPACE' },
 // Slot 1: Upper-Right secondary socket on 115-deg arc
 { cx: 1592, cy: 682, ringSize: 104, artSize: 76, radius: 50, hotkey: 'Q' },
 // Slot 2: Lower-Left secondary socket on 115-deg arc
 { cx: 1380, cy: 872, ringSize: 104, artSize: 76, radius: 50, hotkey: 'E' },
] as const;

const ALT_B_SLOTS_PORTRAIT = [
 // Slot 0: Primary active skill nested in the bottom-right thumb corner
 { cx: 1546, cy: 824, ringSize: 140, artSize: 102, radius: 68, hotkey: '1' },
 // Slot 1: Upper-Right secondary socket on 115-deg arc
 { cx: 1564, cy: 646, ringSize: 112, artSize: 82, radius: 54, hotkey: '2' },
 // Slot 2: Lower-Left secondary socket on 115-deg arc
 { cx: 1358, cy: 858, ringSize: 112, artSize: 82, radius: 54, hotkey: '3' },
] as const;

export class Hud extends Container {
 private groups: Record<'tl' | 'tr' | 'bc' | 'bl' | 'br', Container> = {
  tl: new Container(),
  tr: new Container(),
  bc: new Container(),
  bl: new Container(),
  br: new Container(),
 };
 private readonly isAltB: boolean;
 private backdrop?: Sprite;
 private overlay?: Sprite;
 private playerConsole?: PlayerConsole;
 private heroPlate!: Container;
 private hpFrame!: Container;
 private hpFill!: Container;
 private hpText!: MsdfText;
 private gateBarG!: Graphics;
 private portraitXpRing!: Graphics;
 private tlXpGroup!: Container;
 private tlXpFrame!: Container;
 private tlXpFill!: Container;
 private tlXpValue!: MsdfText;
 private tlXpRest!: MsdfText;
 private bcXpGroup!: Container;
 private xpFill!: Container;
 private xpValue!: MsdfText;
 private xpRest!: MsdfText;
 private heroNameText!: MsdfText;
 private levelMedallion!: Container;
 private levelText!: MsdfText;
 private portraitHolder!: Container;
 private portraitRing!: Container;
 private currentPortrait = '';
 private isPortrait = false;
 // Desktop (landscape, >= 1024 CSS px wide) draws the `24 MS ♦ 60 FPS` telemetry row smaller than mobile.
 private isDesktopTelemetry = false;

 // Top-right telemetry: Concept 3 Twin Medallion Plaques + Filigree Status Ledger + Iconless Ping/FPS (Alt B)
 // + legacy stacked pills (Reference specimen mode)
 private trStackGroup!: Container;
 private trRibbonGroup!: Container;
 private trRibbonBg!: Graphics;
 private trRibbonGoldMedallion!: Container;
 private trRibbonGoldIcon!: Container;
 private trRibbonGoldText!: MsdfText;
 private trRibbonClockHit!: Container;
 private trRibbonClockMedallion!: Container;
 private trRibbonClockIcon!: Container;
 private trRibbonClockText!: MsdfText;
 private trRibbonZoneIcon!: Container;
 private trRibbonZoneText!: MsdfText;
 private trRibbonCoopHit!: Container;
 private trRibbonCoopIcon!: Container;
 private trRibbonCoopText!: MsdfText;
 private trTelemetryPingText!: MsdfText;
 private trTelemetryFpsText!: MsdfText;
 private telemetryPinned = false;
 private timePinned = false;
 private trDesignBounds = {
  goldPlaque: { medX: 1281, rightX: 1447, cy: 42, h: 38, medR: 27 },
  clockPlaque: { medX: 1498, rightX: 1626, cy: 42, h: 38, medR: 27 },
  ledger: { leftX: 1326, sepX: 1460, rightX: 1624, cy: 84 },
  filigreeRule: { leftX: 1320, midX: 1472, rightX: 1624, y: 103 },
  telemetry: { leftX: 1474, sepX: 1545, rightX: 1622, cy: 122.5 },
 };

 private goldPillBg!: Container;
 private goldCoinIcon!: Container;
 private goldText!: MsdfText;
 private clockText!: MsdfText;
 private zonePillBg!: Container;
 private zonePinIcon!: Container;
 private zoneText!: MsdfText;
 private coopPill?: Container;
 private coopPillBg?: Container;
 private coopIcon?: Container;
 private coopText?: MsdfText;

 // Bottom-right crescent action arc
 private crescentArcG!: Graphics;
 private crescentSkillsContainer!: Container;
 private brEscGroup!: Container;
 private skillViews: SkillSlotView[] = [];
 private lastScale = 1;
 private lastWidth = HUD_DESIGN.width;
 private lastHeight = HUD_DESIGN.height;

 constructor(
  private frames: FrameSet,
  private state: HudState = { ...DEFAULT_HUD, skills: DEFAULT_HUD.skills.map((s) => ({ ...s })) },
  images: { backdrop?: Texture; reference?: Texture; variant?: 'alt-b' | 'reference' } = {},
  private callbacks: HudCallbacks = {},
 ) {
  super();
  this.isAltB = images.variant ? images.variant === 'alt-b' : !images.reference;
  if (images.backdrop) this.addChild((this.backdrop = new Sprite(images.backdrop)));
  for (const g of Object.values(this.groups)) this.addChild(g);
  if (images.reference) {
   this.overlay = new Sprite(images.reference);
   this.overlay.alpha = 0;
   this.addChild(this.overlay);
  }
  this.buildHero();
  this.buildStats();
  this.buildSkills();
  this.buildKeys();
  this.setHp(state.hp, state.hpMax);
  this.setGateHp(state.gateHp ?? 100, state.gateHpMax ?? 100);
  this.setXp(state.xp, state.xpMax);
 }

 set referenceAlpha(a: number) {
  if (this.overlay) this.overlay.alpha = a;
 }

 private buildHero() {
  const g = this.groups.tl;
  const f = this.frames;
  const s = this.state;
  const hit = new Container();
  hit.eventMode = 'static';
  hit.cursor = this.callbacks.onHeroClick ? 'pointer' : 'default';
  hit.hitArea = new Rectangle(0, 0, this.isAltB ? 560 : 545, 195);
  hit.on('pointertap', () => this.callbacks.onHeroClick?.());
  g.addChild(hit);

  hit.addChild(f.frame('corner'));
  this.heroPlate = hit.addChild(f.frame('hero-plate', 388, this.isAltB ? 136 : 104));
  this.heroPlate.position.set(150, 24);
  this.hpFrame = hit.addChild(f.frame('hp-frame', 362, 40));
  this.hpFrame.position.set(178, 68);
  this.hpFill = hit.addChild(new Container());
  this.hpFill.position.set(186, 77);
  this.hpFill.addChild(f.frame('hp-fill', 320, 22));
  this.hpText = hit.addChild(new MsdfText(HP_TEXT_ROLE, ''));

  // Fortified cyan-gold Gate HP bar accent strip inside the top-left console (Alt B)
  this.gateBarG = hit.addChild(new Graphics());
  this.gateBarG.visible = this.isAltB;

  this.heroNameText = hit.addChild(new MsdfText('hud-name', s.name));
  this.heroNameText.place(195, 52.5);

  // Integrated Top-Left XP bar directly below HP bar inside hero-plate
  // Visible on BOTH Desktop and Mobile Portrait in Alternative B (clearing bottom-center gate 100%)
  this.tlXpGroup = hit.addChild(new Container());
  this.tlXpGroup.visible = this.isAltB;
  this.tlXpFrame = this.tlXpGroup.addChild(f.frame('hp-frame', 366, 36));
  this.tlXpFrame.position.set(140, 108);
  this.tlXpFill = this.tlXpGroup.addChild(new Container());
  this.tlXpFill.position.set(148, 116);
  this.tlXpFill.addChild(f.frame('xp-fill', 324, 20));
  this.tlXpValue = this.tlXpGroup.addChild(new MsdfText(TL_XP_VAL_ROLE, ''));
  this.tlXpRest = this.tlXpGroup.addChild(new MsdfText(TL_XP_REST_ROLE, ''));

  this.portraitHolder = hit.addChild(new Container());
  this.currentPortrait = s.portrait ?? 'portrait-ember-warden';
  this.portraitHolder.addChild(centred(f.frame(this.currentPortrait), 95, 88));
  this.portraitRing = hit.addChild(centred(f.frame('portrait-ring'), 95, 88));

  // Golden-amber radial XP ring wrapped around the portrait bezel in Alternative B
  this.portraitXpRing = hit.addChild(new Graphics());
  this.portraitXpRing.visible = this.isAltB;

  this.levelMedallion = hit.addChild(centred(f.frame('level-medallion'), 57, 149));
  this.levelText = hit.addChild(new MsdfText('hud-level', String(s.level)));
  this.levelText.place(57, 154.5, 0.5);
  if (this.isAltB) {
   for (const child of hit.children) child.visible = false;
   this.playerConsole = hit.addChild(new PlayerConsole(f));
   this.syncPlayerConsole();
  }
 }

 private syncPlayerConsole() {
  const s = this.state;
  this.playerConsole?.update(s.name, this.currentPortrait, s.level, [[s.hp,s.hpMax],[s.gateHp ?? 100,s.gateHpMax ?? 100],[s.xp,s.xpMax]]);
 }

 private buildStats() {
  const g = this.groups.tr;
  const f = this.frames;
  const s = this.state;

  // 1. Stacked Pills (used on Mobile Portrait and in legacy reference mode)
  this.trStackGroup = g.addChild(new Container());

  const goldRow = this.trStackGroup.addChild(new Container());
  this.goldPillBg = goldRow.addChild(f.frame('pill', 1665 - 1450, 48));
  this.goldCoinIcon = goldRow.addChild(centred(f.frame('icon-coins'), 1495, 44));
  this.goldText = goldRow.addChild(new MsdfText('hud-stat', `${s.gold} Gold`));
  this.layoutGoldPill();

  const clockRow = this.trStackGroup.addChild(new Container());
  clockRow.eventMode = 'static';
  clockRow.cursor = 'pointer';
  clockRow.hitArea = new Rectangle(1508, 70, 162, 52);
  clockRow.on('pointertap', () => this.callbacks.onClockClick?.());
  clockRow.addChild(f.frame('pill', 1665 - 1512, 48)).position.set(1512, 72);
  clockRow.addChild(centred(f.frame('icon-clock'), 1557, 96));
  this.clockText = clockRow.addChild(new MsdfText('hud-stat', s.time));
  this.clockText.place(1611, 100.5, 0.5);

  const zoneRow = this.trStackGroup.addChild(new Container());
  this.zonePillBg = zoneRow.addChild(f.frame('pill', 1665 - 1505, 48));
  this.zonePinIcon = zoneRow.addChild(centred(f.frame('icon-pin'), 1551, 149));
  this.zoneText = zoneRow.addChild(new MsdfText('hud-stat', s.zone));
  this.layoutZonePill(s.zone);

  if (s.coopLabel !== undefined) {
   this.ensureCoopPill(s.coopLabel);
  }

  // 2. Top-Right HUD Concept 3: Twin Circular-Medallion Chamfered Plaques, Filigree Status Ledger & Iconless Ping/FPS Telemetry
  this.trRibbonGroup = g.addChild(new Container());
  this.trRibbonGroup.visible = this.isAltB;
  this.trStackGroup.visible = !this.isAltB;
  this.trRibbonBg = this.trRibbonGroup.addChild(new Graphics());

  // Top Row — Left Plaque: Gold (`0 Gold` / `9,999 Gold`) capped by circular gold medallion + `icon-coins`
  this.trRibbonGoldMedallion = this.trRibbonGroup.addChild(f.frame('level-medallion', 54, 54));
  this.trRibbonGoldIcon = this.trRibbonGroup.addChild(f.frame('icon-coins', 30, 22));
  this.trRibbonGoldText = this.trRibbonGroup.addChild(
   new MsdfText(PLAQUE_STAT_ROLE, formatGoldLabel(s.gold)),
  );

  // Top Row — Right Plaque: Run/Day-Night Timer (`09:00` / `99:59`) capped by circular gold medallion + `icon-clock`
  this.trRibbonClockHit = this.trRibbonGroup.addChild(new Container());
  this.trRibbonClockHit.eventMode = 'static';
  this.trRibbonClockHit.cursor = 'pointer';
  this.trRibbonClockHit.on('pointertap', () => this.callbacks.onClockClick?.());
  this.trRibbonClockMedallion = this.trRibbonClockHit.addChild(f.frame('level-medallion', 54, 54));
  this.trRibbonClockIcon = this.trRibbonClockHit.addChild(f.frame('icon-clock', 24, 24));
  this.trRibbonClockText = this.trRibbonClockHit.addChild(new MsdfText(PLAQUE_STAT_ROLE, s.time));

  // Middle Row — Frameless Status Ledger (`Safe Zone ♦ Co-op · Solo`) above antique-gold filigree rule
  this.trRibbonZoneIcon = this.trRibbonGroup.addChild(f.frame('icon-pin', 18, 23));
  this.trRibbonZoneText = this.trRibbonGroup.addChild(new MsdfText(LEDGER_TEXT_ROLE, s.zone));

  this.trRibbonCoopHit = this.trRibbonGroup.addChild(new Container());
  this.trRibbonCoopHit.eventMode = 'static';
  this.trRibbonCoopHit.cursor = 'pointer';
  this.trRibbonCoopHit.on('pointertap', () => this.callbacks.onCoopClick?.());
  this.trRibbonCoopIcon = this.trRibbonCoopHit.addChild(f.frame('icon-users', 24, 20));
  this.trRibbonCoopText = this.trRibbonCoopHit.addChild(
   new MsdfText(LEDGER_TEXT_ROLE, s.coopLabel || 'Co-op · Solo'),
  );

  // Bottom Row — Iconless High-Contrast Telemetry (`24 MS ♦ 60 FPS`) in Cinzel small-caps
  const initPing = Math.max(1, Math.round(s.pingMs ?? 24));
  const initFps = Math.max(1, Math.round(s.fps ?? 60));
  this.trTelemetryPingText = this.trRibbonGroup.addChild(
   new MsdfText(TELEMETRY_ROLE, `${initPing} ms`),
  );
  this.trTelemetryFpsText = this.trRibbonGroup.addChild(
   new MsdfText(TELEMETRY_ROLE, `${initFps} fps`),
  );

  this.layoutTopRightRibbon();
 }

 private layoutTopRightRibbon() {
  if (!this.trRibbonGroup) return;
  const g = this.trRibbonBg;
  g.clear();

  // Leave a 46px right margin (`1626..1672`) on desktop so the plaques and filigree rule never collide
  // with the top-right stone bracket & blue banner ornament (`corner-court-right-mobile.webp`).
  // On mobile portrait, anchor closer to the right edge (`1654`) to maximize top-right HUD proportion.
  const rightAnchor = this.isPortrait ? 1654 : 1626;

  // ---------------------------------------------------------------------------
  // 1. TOP ROW: Twin Circular-Medallion Chamfered Plaques (`0 Gold` & `09:00`)
  // ---------------------------------------------------------------------------
  const plaqueCy = this.isPortrait ? 46 : 42;
  const plaqueH = this.isPortrait ? 42 : 38;
  const medSize = this.isPortrait ? 58 : 54;
  const medR = medSize / 2;
  const chamfer = 14;

  // Keep a compact timer slot; the medallion, label padding and chamfer define its width.
  const clockAdv = Math.ceil(this.trRibbonClockText.advance);
  const clockSpan = this.isPortrait
   ? Math.max(108, clockAdv + 48)
   : Math.max(110, clockAdv + 46);
  const clockRightX = rightAnchor;
  const clockMedX = clockRightX - clockSpan;
  drawChamferedPlaque(g, clockMedX, clockRightX, plaqueCy, plaqueH, chamfer, medR);
  centred(this.trRibbonClockMedallion, clockMedX, plaqueCy, medSize, medSize);
  centred(this.trRibbonClockIcon, clockMedX, plaqueCy, this.isPortrait ? 26 : 24, this.isPortrait ? 26 : 24);
  const clockTextCx = (clockMedX + medR + 4 + (clockRightX - chamfer + 2)) / 2;
  this.trRibbonClockText.place(clockTextCx, plaqueCy + 5.5, 0.5);
  this.trRibbonClockHit.hitArea = new Rectangle(
   clockMedX - medR - 4,
   plaqueCy - medR - 2,
   clockSpan + medR + 12,
   medSize + 4,
  );

  // Size Gold to its label instead of leaving the former separator slot empty.
  // Larger balances expand leftward, preserving the timer anchor and inter-plaque gap.
  const goldAdv = Math.ceil(this.trRibbonGoldText.advance);
  const goldSpan = this.isPortrait
   ? Math.max(120, goldAdv + 48)
   : Math.max(120, goldAdv + 46);
  const goldRightX = clockMedX - (medR + 12);
  const goldMedX = goldRightX - goldSpan;
  drawChamferedPlaque(g, goldMedX, goldRightX, plaqueCy, plaqueH, chamfer, medR);
  centred(this.trRibbonGoldMedallion, goldMedX, plaqueCy, medSize, medSize);
  centred(this.trRibbonGoldIcon, goldMedX, plaqueCy, this.isPortrait ? 32 : 30, this.isPortrait ? 24 : 22);
  const goldTextCx = (goldMedX + medR + 4 + (goldRightX - chamfer + 2)) / 2;
  this.trRibbonGoldText.place(goldTextCx, plaqueCy + 5.5, 0.5);

  // ---------------------------------------------------------------------------
  // 2. MIDDLE ROW: Frameless Status Ledger (`Safe Zone ♦ Co-op · Solo`) + Filigree Rule
  // ---------------------------------------------------------------------------
  const ledgerCy = this.isPortrait ? 96 : 84;
  const ledgerTextY = ledgerCy + 5.5;
  const ledgerRightX = rightAnchor - 2;

  this.trRibbonCoopHit.visible = true;
  if (!this.trRibbonCoopText.text) {
   this.trRibbonCoopText.text = this.state.coopLabel || 'Co-op · Solo';
  }
  const coopAdv = Math.ceil(this.trRibbonCoopText.advance);
  const coopTextX = ledgerRightX - coopAdv;
  this.trRibbonCoopText.place(coopTextX, ledgerTextY);
  const coopIconCx = coopTextX - 18;
  centred(this.trRibbonCoopIcon, coopIconCx, ledgerCy - 0.5, this.isPortrait ? 26 : 24, this.isPortrait ? 22 : 20);
  this.trRibbonCoopHit.hitArea = new Rectangle(
   coopIconCx - 16,
   ledgerCy - 16,
   ledgerRightX - (coopIconCx - 16) + 6,
   32,
  );

  // Gold 4-point diamond separator (`♦`) between Zone and Co-op
  const ledgerSepX = coopIconCx - (this.isPortrait ? 22 : 25);
  drawCompassStar(g, ledgerSepX, ledgerCy, this.isPortrait ? 5.8 : 5.2, this.isPortrait ? 5.8 : 5.2, false);

  const zoneAdv = Math.ceil(this.trRibbonZoneText.advance);
  const zoneTextX = ledgerSepX - (this.isPortrait ? 12 : 13) - zoneAdv;
  this.trRibbonZoneText.place(zoneTextX, ledgerTextY);
  const zoneIconCx = zoneTextX - 15;
  centred(this.trRibbonZoneIcon, zoneIconCx, ledgerCy - 0.5, this.isPortrait ? 20 : 18, this.isPortrait ? 25 : 23);

  // Delicate antique-gold filigree divider rule with central 4-point star node
  const ruleY = this.isPortrait ? 118 : 103;
  const ruleRightX = rightAnchor - 2;
  const ruleLeftX = this.isPortrait
   ? Math.min(goldMedX - medR + 10, zoneIconCx - 14)
   : Math.min(1322, zoneIconCx - 16);
  const ruleMidX = Math.round((ruleLeftX + ruleRightX) / 2);

  // Dark ink drop-shadow under rule
  g.moveTo(ruleLeftX - 12, ruleY + 1.5)
   .lineTo(ruleRightX + 6, ruleY + 1.5)
   .stroke({ color: 0x000000, width: 2.3, alpha: 0.72 });

  // Outer tapered whisker tips
  g.moveTo(ruleLeftX - 16, ruleY)
   .lineTo(ruleLeftX, ruleY)
   .stroke({ color: 0xb88638, width: 0.9, alpha: 0.55 });
  g.moveTo(ruleRightX, ruleY)
   .lineTo(ruleRightX + 8, ruleY)
   .stroke({ color: 0xb88638, width: 0.9, alpha: 0.55 });

  // Primary antique-gold rule segments flanking the central star node
  g.moveTo(ruleLeftX, ruleY)
   .lineTo(ruleMidX - 14, ruleY)
   .stroke({ color: 0xd9ad58, width: 1.55, alpha: 0.96 });
  g.moveTo(ruleMidX + 14, ruleY)
   .lineTo(ruleRightX, ruleY)
   .stroke({ color: 0xd9ad58, width: 1.55, alpha: 0.96 });

  // Pale-ivory specular highlight along the inner halves of the rule
  g.moveTo(ruleLeftX + 26, ruleY - 0.35)
   .lineTo(ruleMidX - 16, ruleY - 0.35)
   .stroke({ color: 0xfff0c2, width: 0.65, alpha: 0.8 });
  g.moveTo(ruleMidX + 16, ruleY - 0.35)
   .lineTo(ruleRightX - 26, ruleY - 0.35)
   .stroke({ color: 0xfff0c2, width: 0.65, alpha: 0.8 });

  // Left & right star finials + flanking mini-pips + central 4-point star node
  drawCompassStar(g, ruleLeftX, ruleY, 4.8, 3.6, false);
  drawCompassStar(g, ruleRightX, ruleY, 4.8, 3.6, false);
  drawCompassStar(g, ruleMidX - 11, ruleY, 2.8, 2.8, false);
  drawCompassStar(g, ruleMidX + 11, ruleY, 2.8, 2.8, false);
  drawCompassStar(g, ruleMidX, ruleY, 8.2, 6.6, true);

  // ---------------------------------------------------------------------------
  // 3. BOTTOM ROW: Iconless High-Contrast Telemetry (`24 MS ♦ 60 FPS`)
  // ---------------------------------------------------------------------------
  const telK = this.isDesktopTelemetry ? 0.7 : 1;
  const telCy = this.isPortrait ? 140 : this.isDesktopTelemetry ? 119 : 122.5;
  const telTextY = telCy + 5.5 * telK;
  const telRightX = rightAnchor - 4;
  const placeTel = (t: MsdfText, x: number) => {
   t.scale.set(telK);
   t.position.set(x, telTextY - t.metrics().baseline * telK);
  };
  const fpsAdv = Math.ceil(this.trTelemetryFpsText.advance * telK);
  const fpsSlotW = Math.max(66 * telK, fpsAdv);
  const fpsX = telRightX - fpsAdv;
  placeTel(this.trTelemetryFpsText, fpsX);

  const telSepX = telRightX - fpsSlotW - 11 * telK;
  drawCompassStar(g, telSepX, telCy, 4.5 * telK, 4.5 * telK, false);

  const pingAdv = Math.ceil(this.trTelemetryPingText.advance * telK);
  const pingX = telSepX - 11 * telK - pingAdv;
  placeTel(this.trTelemetryPingText, pingX);

  this.trDesignBounds = {
   goldPlaque: { medX: goldMedX, rightX: goldRightX, cy: plaqueCy, h: plaqueH, medR },
   clockPlaque: { medX: clockMedX, rightX: clockRightX, cy: plaqueCy, h: plaqueH, medR },
   ledger: { leftX: zoneIconCx - 9, sepX: ledgerSepX, rightX: ledgerRightX, cy: ledgerCy },
   filigreeRule: { leftX: ruleLeftX, midX: ruleMidX, rightX: ruleRightX, y: ruleY },
   telemetry: { leftX: pingX, sepX: telSepX, rightX: telRightX, cy: telCy },
  };
 }

 private layoutGoldPill() {
  const pillX =
   this.goldText.text === '250 Gold' ? 1450 : Math.round(1665 - (this.goldText.advance + 119));
  const pillW = 1665 - pillX;
  this.goldPillBg.position.set(pillX, 20);
  this.goldPillBg.width = pillW;
  centred(this.goldCoinIcon, pillX + 45, 44);
  this.goldText.place((pillX + 82 + 1632) / 2, 48, 0.5);
 }

 private layoutZonePill(zone: string) {
  const pillX =
   zone === 'Wilds' ? 1505 : Math.min(1505, Math.round(1665 - (this.zoneText.advance + 106)));
  const pillW = 1665 - pillX;
  this.zonePillBg.position.set(pillX, 125);
  this.zonePillBg.width = pillW;
  centred(this.zonePinIcon, pillX + 46, 149);
  this.zoneText.place((pillX + 77 + 1630) / 2, 153.5, 0.5);
 }

 private ensureCoopPill(label: string) {
  if (!this.coopPill) {
   const f = this.frames;
   const row = this.trStackGroup.addChild(new Container());
   row.eventMode = 'static';
   row.cursor = 'pointer';
   row.on('pointertap', () => this.callbacks.onCoopClick?.());
   this.coopPillBg = row.addChild(f.frame('pill', 1665 - 1470, 48));
   this.coopIcon = row.addChild(centred(f.frame('icon-users'), 1514, 202));
   this.coopText = row.addChild(new MsdfText('hud-stat', label));
   this.coopPill = row;
  }
  if (this.coopText && this.coopPillBg && this.coopIcon && this.coopPill) {
   this.coopText.text = label;
   const pillX = Math.min(1480, Math.round(1665 - (this.coopText.advance + 110)));
   const pillW = 1665 - pillX;
   this.coopPillBg.position.set(pillX, 178);
   this.coopPillBg.width = pillW;
   centred(this.coopIcon, pillX + 45, 202);
   this.coopText.place((pillX + 70 + 1629) / 2, 205.5, 0.5);
   this.coopPill.hitArea = new Rectangle(pillX - 4, 176, pillW + 8, 52);
  }
  if (this.trRibbonCoopText) {
   this.trRibbonCoopText.text = label;
   this.layoutTopRightRibbon();
  }
 }

 private buildSkills() {
  const f = this.frames;
  this.skillViews = [];

  if (!this.isAltB) {
   // Legacy bottom-center specimen mode for `scripts/typography/capture.mjs`
   const g = this.groups.bc;
   this.state.skills.forEach((sk, i) => {
    const cx = 680 + i * 157;
    const cy = 700;
    const slot = g.addChild(new Container());
    slot.eventMode = 'static';
    slot.cursor = 'pointer';
    slot.hitArea = new Rectangle(cx - 68, cy - 62, 136, 192);
    slot.on('pointertap', () => this.callbacks.onSkillClick?.(i));

    const socketBg = slot.addChild(new Graphics());
    const artHolder = slot.addChild(new Container());
    artHolder.addChild(centred(f.frame(sk.art), cx, cy));

    const cooldownArc = slot.addChild(new Graphics());
    const ringSprite = slot.addChild(centred(f.frame('skill-ring'), cx, cy));
    const cooldownText = slot.addChild(new MsdfText(COOLDOWN_NUM_ROLE, ''));
    cooldownText.visible = false;

    const levelBadge = slot.addChild(f.frame('badge-level', 58, 24));
    levelBadge.position.set(cx - 29, 736);
    const levelText = slot.addChild(new MsdfText('hud-badge', sk.locked ? '—' : `Lv. ${sk.level}`));
    levelText.place(cx, 751.5, 0.5);
    const stateBadge = slot.addChild(f.frame('badge-auto', 84, 28));
    const stateText = slot.addChild(
     new MsdfText('hud-state', sk.stateLabel ?? (sk.locked ? 'Locked' : 'Auto')),
    );
    const bw = Math.max(84, Math.round(stateText.advance + 36));
    stateBadge.width = bw;
    stateBadge.position.set(cx - bw / 2, 761);
    stateText.place(cx, 779, 0.5);
    const nameBg = slot.addChild(new Graphics());
    const nameText = slot.addChild(new MsdfText('hud-skill', sk.name));
    nameText.place(cx, 811, 0.5);

    const hotkeyBadge = slot.addChild(new Container());
    hotkeyBadge.visible = false;
    const hotkeyBg = hotkeyBadge.addChild(new Graphics());
    const hotkeyText = hotkeyBadge.addChild(new MsdfText(HOTKEY_ROLE, ''));
    const plusBadge = slot.addChild(new Graphics());

    this.skillViews.push({
     root: slot,
     socketBg,
     artHolder,
     currentArt: sk.art,
     cooldownArc,
     cooldownText,
     ringSprite,
     levelBadge,
     levelText,
     stateBadge,
     stateText,
     nameBg,
     nameText,
     hotkeyBadge,
     hotkeyBg,
     hotkeyText,
     plusBadge,
     cx,
     cy,
     radius: 64,
    });
   });
   this.bcXpGroup = g.addChild(new Container());
   this.bcXpGroup.addChild(f.frame('xp-frame', 716, 50)).position.set(483, 829);
   this.xpFill = this.bcXpGroup.addChild(new Container());
   this.xpFill.position.set(527, 842);
   this.xpFill.addChild(f.frame('xp-fill', 628, 24));
   this.xpValue = this.bcXpGroup.addChild(new MsdfText(XP_VAL_ROLE, ''));
   this.xpRest = this.bcXpGroup.addChild(new MsdfText(XP_REST_ROLE, ''));
   return;
  }

  // Battle HUD Alternative B: Bottom-Right Crescent Action Arc inside `groups.br`
  const br = this.groups.br;
  this.crescentArcG = br.addChild(new Graphics());
  this.crescentSkillsContainer = br.addChild(new Container());

  this.state.skills.forEach((sk, i) => {
   const cfg = ALT_B_SLOTS_DESKTOP[i] ?? ALT_B_SLOTS_DESKTOP[0];
   const slot = this.crescentSkillsContainer.addChild(new Container());
   slot.eventMode = 'static';
   slot.cursor = 'pointer';

   const socketBg = slot.addChild(new Graphics());
   const artHolder = slot.addChild(new Container());
   artHolder.addChild(centred(f.frame(sk.art), cfg.cx, cfg.cy, cfg.artSize, cfg.artSize));

   const cooldownArc = slot.addChild(new Graphics());
   const ringSprite = slot.addChild(
    centred(f.frame('skill-ring'), cfg.cx, cfg.cy, cfg.ringSize, cfg.ringSize),
   );
   const cooldownText = slot.addChild(new MsdfText(COOLDOWN_NUM_ROLE, ''));
   cooldownText.visible = false;

   const levelBadge = slot.addChild(f.frame('badge-level', 56, 22));
   const levelText = slot.addChild(
    new MsdfText({ ...ROLES['hud-badge'], size: 15.5 }, sk.locked ? '—' : `Lv. ${sk.level}`),
   );

   const stateBadge = slot.addChild(f.frame('badge-auto', 78, 24));
   const stateText = slot.addChild(
    new MsdfText({ ...ROLES['hud-state'], size: 14.5 }, sk.locked ? 'LOCKED' : (sk.stateLabel ?? 'AUTO')),
   );

   const nameBg = slot.addChild(new Graphics());
   const nameText = slot.addChild(new MsdfText({ ...ROLES['hud-skill'], size: 18 }, sk.name));

   const hotkeyBadge = slot.addChild(new Container());
   const hotkeyBg = hotkeyBadge.addChild(new Graphics());
   const hotkeyText = hotkeyBadge.addChild(new MsdfText(HOTKEY_ROLE, cfg.hotkey));

   const plusBadge = slot.addChild(new Graphics());

   const view: SkillSlotView = {
    root: slot,
    socketBg,
    artHolder,
    currentArt: sk.art,
    cooldownArc,
    cooldownText,
    ringSprite,
    levelBadge,
    levelText,
    stateBadge,
    stateText,
    nameBg,
    nameText,
    hotkeyBadge,
    hotkeyBg,
    hotkeyText,
    plusBadge,
    cx: cfg.cx,
    cy: cfg.cy,
    radius: cfg.radius,
   };
   slot.on('pointertap', () => this.callbacks.onSkillClick?.(i));
   this.skillViews.push(view);
  });

  // Hidden dummy bcXpGroup so setXp works uniformly
  this.bcXpGroup = this.groups.bc.addChild(new Container());
  this.bcXpGroup.visible = false;
  this.xpFill = this.bcXpGroup.addChild(new Container());
  this.xpFill.addChild(f.frame('xp-fill', 628, 24));
  this.xpValue = this.bcXpGroup.addChild(new MsdfText(XP_VAL_ROLE, ''));
  this.xpRest = this.bcXpGroup.addChild(new MsdfText(XP_REST_ROLE, ''));

  this.layoutCrescentArc();
 }

 private layoutCrescentArc() {
  if (!this.isAltB || !this.crescentArcG) return;
  const slotsCfg = this.isPortrait ? ALT_B_SLOTS_PORTRAIT : ALT_B_SLOTS_DESKTOP;
  const g = this.crescentArcG;
  g.clear();

  // Draw the 115-degree Crescent Action Arc tracks around ALT_B_ARC_CENTER = (1656, 926)
  const ac = ALT_B_ARC_CENTER;
  const arcR = this.isPortrait ? 288 : 268;
  const startAng = (-172 * Math.PI) / 180;
  const endAng = (-57 * Math.PI) / 180; // 115-degree crescent sweep!

  // Outer obsidian-bronze track band connecting the secondary skill sockets
  const drawOpenArc = (r: number, a0: number, a1: number, style: { color: number; width: number; alpha: number }) => {
   g.moveTo(ac.x + Math.cos(a0) * r, ac.y + Math.sin(a0) * r)
    .arc(ac.x, ac.y, r, a0, a1)
    .stroke(style);
  };
  drawOpenArc(arcR + 7, startAng, endAng, { color: 0x0b0d13, width: 14, alpha: 0.78 });
  drawOpenArc(arcR + 12, startAng, endAng, { color: 0xd4a448, width: 2.2, alpha: 0.85 });
  drawOpenArc(arcR + 2, startAng, endAng, { color: 0x8f6b2e, width: 1.4, alpha: 0.75 });

  // Inner corner golden filigree frame around primary skill / Esc corner
  const innerR = this.isPortrait ? 196 : 162;
  drawOpenArc(innerR, (-180 * Math.PI) / 180, (-86 * Math.PI) / 180, {
   color: 0xc9983e,
   width: 1.8,
   alpha: 0.72,
  });

  this.skillViews.forEach((view, i) => {
   const cfg = slotsCfg[i] ?? slotsCfg[0];
   const sk = this.state.skills[i] ?? { name: 'Empty Slot', level: 0, art: 'skill-empty', locked: true };
   view.cx = cfg.cx;
   view.cy = cfg.cy;
   view.radius = cfg.radius;
   view.root.hitArea = new Rectangle(
    cfg.cx - cfg.radius - 10,
    cfg.cy - cfg.radius - 10,
    (cfg.radius + 10) * 2,
    (cfg.radius + 24) * 2,
   );

   // Dark obsidian circular socket backing + golden outer rim accent
   view.socketBg.clear();
   view.socketBg
    .circle(cfg.cx, cfg.cy, cfg.radius - 2)
    .fill({ color: 0x090b10, alpha: 0.92 })
    .stroke({ color: sk.locked ? 0x705830 : 0xf2c45a, width: sk.locked ? 1.5 : 2.2, alpha: 0.9 });

   if (view.artHolder.children[0]) {
    centred(view.artHolder.children[0] as Container, cfg.cx, cfg.cy, cfg.artSize, cfg.artSize);
   }
   view.artHolder.alpha = sk.locked ? 0.52 : 1;
   centred(view.ringSprite, cfg.cx, cfg.cy, cfg.ringSize, cfg.ringSize);

   // Level / Locked badge at bottom of socket ring
   const badgeY = cfg.cy + cfg.radius - 16;
   if (sk.locked) {
    view.levelBadge.visible = false;
    view.levelText.visible = false;
    view.stateBadge.visible = true;
    view.stateText.visible = true;
    view.stateText.text = 'LOCKED';
    const bw = Math.max(76, Math.round(view.stateText.advance + 28));
    view.stateBadge.width = bw;
    view.stateBadge.height = 24;
    view.stateBadge.position.set(cfg.cx - bw / 2, badgeY + 2);
    view.stateText.place(cfg.cx, badgeY + 17.5, 0.5);
    view.nameBg.clear();
    view.nameText.visible = false;
   } else {
    view.levelBadge.visible = true;
    view.levelText.visible = true;
    view.levelBadge.width = 56;
    view.levelBadge.height = 22;
    view.levelBadge.position.set(cfg.cx - 28, badgeY - 4);
    view.levelText.text = `Lv. ${sk.level}`;
    view.levelText.place(cfg.cx, badgeY + 10.5, 0.5);

    // Skill nameplate pill directly below Lv. X badge
    view.stateBadge.visible = false;
    view.stateText.visible = false;
    view.nameText.visible = true;
    view.nameText.text = sk.name;
    const nw = Math.max(82, Math.round(view.nameText.advance + 24));
    const nh = 22;
    const ny = badgeY + 19;
    view.nameBg.clear();
    view.nameBg
     .roundRect(cfg.cx - nw / 2, ny, nw, nh, 11)
     .fill({ color: 0x0c0e14, alpha: 0.92 })
     .stroke({ color: 0xb88b3a, width: 1.2, alpha: 0.85 });
    view.nameText.place(cfg.cx, ny + 15.5, 0.5);
   }

   // Desktop Hotkey Badge (`[1]` / `[2]` / `[3]`) on upper-left of socket bezel
   view.hotkeyBadge.visible = !this.isPortrait;
   if (!this.isPortrait) {
    const hkLabel = sk.hotkey ?? `${i + 1}`;
    view.hotkeyText.text = hkLabel;
    const hkw = Math.max(22, Math.round(view.hotkeyText.advance + 12));
    const hkh = 20;
    const hkx = cfg.cx - cfg.radius * 0.72;
    const hky = cfg.cy - cfg.radius * 0.72;
    view.hotkeyBg.clear();
    view.hotkeyBg
     .roundRect(hkx - hkw / 2, hky - hkh / 2, hkw, hkh, 4)
     .fill({ color: 0x120e09, alpha: 0.94 })
     .stroke({ color: 0xd4a448, width: 1.2, alpha: 0.9 });
    view.hotkeyText.place(hkx, hky + 4.5, 0.5);
   }

   // Mobile Portrait golden `+` rank medallion on primary socket upper-right bezel
   view.plusBadge.clear();
   if (this.isPortrait && i === 0 && !sk.locked) {
    const px = cfg.cx + cfg.radius * 0.72;
    const py = cfg.cy - cfg.radius * 0.72;
    view.plusBadge
     .circle(px, py, 16)
     .fill({ color: 0x1a1309, alpha: 0.96 })
     .stroke({ color: 0xffe07d, width: 2, alpha: 0.96 });
    view.plusBadge.roundRect(px - 7, py - 1.8, 14, 3.6, 1).fill({ color: 0xffe484, alpha: 0.98 });
    view.plusBadge.roundRect(px - 1.8, py - 7, 3.6, 14, 1).fill({ color: 0xffe484, alpha: 0.98 });
   }

   this.drawCooldown(view, sk.cooldownRatio ?? 0, sk.stateLabel, sk.cooldownSec);
  });
 }

 private buildKeys() {
  const f = this.frames;
  const br = this.groups.br;
  this.brEscGroup = br.addChild(new Container());
  this.brEscGroup.eventMode = 'static';
  this.brEscGroup.cursor = this.callbacks.onMenuClick ? 'pointer' : 'default';
  const escX = this.isAltB ? 1488 : 1478;
  const escY = this.isAltB ? 862 : 853;
  const escW = this.isAltB ? 176 : 190;
  const escH = this.isAltB ? 54 : 60;
  this.brEscGroup.hitArea = new Rectangle(escX, escY, escW, escH);
  this.brEscGroup.on('pointertap', () => this.callbacks.onMenuClick?.());
  this.brEscGroup.addChild(f.frame('pill-wide', escW, escH)).position.set(escX, escY);
  this.brEscGroup.addChild(f.frame('keycap', 46, 30)).position.set(escX + 26, escY + (escH - 30) / 2);
  this.brEscGroup.addChild(new MsdfText('hud-key', 'Esc')).place(escX + 49, escY + escH / 2 + 6.5, 0.5);
  const label = !this.callbacks.onMenuClick && !this.isAltB ? '· Menu' : '· Hero';
  this.brEscGroup.addChild(new MsdfText('hud-hint', label)).place(escX + 82, escY + escH / 2 + 5);
 }

 setHero(name: string, portrait?: string) {
  this.state.name = name;
  this.heroNameText.text = name;
  this.heroNameText.place(this.isPortrait ? 184 : 195, 52.5);
  const nextPortrait =
   portrait ?? (name.toLowerCase().includes('rift') ? 'portrait-rift-runner' : 'portrait-ember-warden');
  if (nextPortrait !== this.currentPortrait) {
   this.currentPortrait = nextPortrait;
   this.portraitHolder.removeChildren();
   this.portraitHolder.addChild(
    centred(this.frames.frame(nextPortrait), 95, this.isPortrait ? 92 : 88),
   );
  }
  this.syncPlayerConsole();
 }

 setLevel(level: number) {
  const text = String(level);
  if (this.state.level === level && this.levelText.text === text) return;
  this.state.level = level;
  this.syncPlayerConsole();
  this.levelText.text = text;
  this.levelText.place(57, this.isPortrait ? 157.5 : 154.5, 0.5);
 }

 setHp(hp: number, hpMax = this.state.hpMax) {
  if (this.state.hp === hp && this.state.hpMax === hpMax && this.hpText.text) return;
  this.state.hp = hp;
  this.state.hpMax = hpMax;
  this.syncPlayerConsole();
  const maxW = this.isPortrait ? 266 : 320;
  const max = Math.max(1, hpMax);
  const w = Math.max(0, Math.min(maxW, (maxW * Math.max(0, hp)) / max));
  const bar = this.hpFill.children[0] as Container;
  bar.visible = w > 2;
  if (w > 2) bar.width = Math.max(12, w);
  const nextText = `${Math.round(hp)} / ${Math.round(max)} HP`;
  if (this.hpText.text !== nextText) {
   this.hpText.text = nextText;
   this.hpText.place(this.isPortrait ? 295 : 352, this.isPortrait ? 90.5 : 92.5, 0.5);
  }
 }

 private gateBarReady = false;

 setGateHp(gateHp: number, gateHpMax = 100) {
  if (this.state.gateHp === gateHp && this.state.gateHpMax === gateHpMax && this.gateBarReady) return;
  this.gateBarReady = true;
  this.state.gateHp = gateHp;
  this.state.gateHpMax = gateHpMax;
  this.syncPlayerConsole();
  if (!this.isAltB || !this.gateBarG) return;
  const ratio = Math.max(0, Math.min(1, gateHp / Math.max(1, gateHpMax)));
  const gx = this.isPortrait ? 162 : 186;
  const gy = this.isPortrait ? 101 : 103;
  const maxW = this.isPortrait ? 266 : 320;
  this.gateBarG.clear();
  this.gateBarG
   .roundRect(gx, gy, maxW, 4, 2)
   .fill({ color: 0x0b141a, alpha: 0.85 });
  if (ratio > 0.01) {
   this.gateBarG
    .roundRect(gx, gy, Math.max(6, Math.round(maxW * ratio)), 4, 2)
    .fill({ color: 0x52e0eb, alpha: 0.88 })
    .stroke({ color: 0xf2c968, width: 0.8, alpha: 0.75 });
  }
 }

 private lastXpArcKey = '';

 setXp(xp: number, xpMax = this.state.xpMax, overrideRestText?: string) {
  if (this.state.xp === xp && this.state.xpMax === xpMax && overrideRestText === undefined && this.xpValue.text) return;
  this.state.xp = xp;
  this.state.xpMax = xpMax;
  this.syncPlayerConsole();
  const max = Math.max(1, xpMax);
  const ratio = Math.max(0, Math.min(1, xp / max));
  const rawW = 628 * ratio;
  const bar = this.xpFill.children[0] as Container;
  bar.visible = rawW > 1;
  if (rawW > 1) bar.width = Math.max(12, Math.min(628, rawW));
  const valStr = String(Math.floor(xp));
  const restStr = overrideRestText ?? ` / ${max} XP`;
  const tlMaxW = this.isPortrait ? 280 : 324;
  const tlRawW = tlMaxW * ratio;
  const tlBar = this.tlXpFill.children[0] as Container;
  tlBar.visible = tlRawW > 1;
  if (tlRawW > 1) tlBar.width = Math.max(12, Math.min(tlMaxW, tlRawW));

  // Radial portrait XP ring around the hero portrait bezel (Alt B)
  if (this.isAltB && this.portraitXpRing) {
   const py = this.isPortrait ? 92 : 88;
   const xpStep = Math.round(ratio * 100);
   const arcKey = `${py}:${xpStep}`;
   if (arcKey !== this.lastXpArcKey) {
    this.lastXpArcKey = arcKey;
    this.portraitXpRing.clear();
    // Subtle golden-amber outer glow around portrait ring
    this.portraitXpRing
     .circle(95, py, 74)
     .stroke({ color: 0xffc84a, width: 4, alpha: 0.18 });
    if (ratio > 0.01) {
     const startAng = -Math.PI / 2;
     const endAng = startAng + Math.PI * 2 * (xpStep / 100);
     this.portraitXpRing
      .moveTo(95 + Math.cos(startAng) * 72, py + Math.sin(startAng) * 72)
      .arc(95, py, 72, startAng, endAng)
      .stroke({ color: 0xffd866, width: 3.5, alpha: 0.92 });
    }
   }
  }

  if (this.xpValue.text !== valStr || this.xpRest.text !== restStr) {
   this.xpValue.text = valStr;
   this.xpRest.text = restStr;
   const w = this.xpValue.advance + this.xpRest.advance;
   const x = Math.round(852 - w / 2);
   this.xpValue.place(x, 855.5);
   this.xpRest.place(x + this.xpValue.advance, 855.5);
   this.tlXpValue.text = valStr;
   this.tlXpRest.text = restStr;
   const tlW = this.tlXpValue.advance + this.tlXpRest.advance;
   const tlX = this.isAltB ? 162 : Math.round(318 - tlW / 2);
   const tlY = this.isAltB ? 131.5 : 132.5;
   this.tlXpValue.place(tlX, tlY);
   this.tlXpRest.place(tlX + this.tlXpValue.advance, tlY);
  }
 }

 setGold(labelOrAmount: number | string) {
  if (typeof labelOrAmount === 'number') {
   this.state.gold = labelOrAmount;
  }
  const legacyText = typeof labelOrAmount === 'number' ? `${labelOrAmount} Gold` : labelOrAmount;
  const formattedText = formatGoldLabel(labelOrAmount);
  if (this.goldText.text !== legacyText) {
   this.goldText.text = legacyText;
   this.layoutGoldPill();
  }
  if (this.trRibbonGoldText && this.trRibbonGoldText.text !== formattedText) {
   this.trRibbonGoldText.text = formattedText;
   this.layoutTopRightRibbon();
  }
 }

 setTime(time: string, fromClock = false) {
  if (fromClock && this.timePinned) return;
  if (!fromClock) this.timePinned = true;
  if (this.state.time === time && this.trRibbonClockText?.text === time) return;
  this.state.time = time;
  this.clockText.text = time;
  this.clockText.place(1611, 100.5, 0.5);
  if (this.trRibbonClockText) {
   this.trRibbonClockText.text = time;
   this.layoutTopRightRibbon();
  }
 }

 setZone(zone: string) {
  if (this.state.zone === zone) return;
  this.state.zone = zone;
  this.zoneText.text = zone;
  this.layoutZonePill(zone);
  if (this.trRibbonZoneText) {
   this.trRibbonZoneText.text = zone;
   this.layoutTopRightRibbon();
  }
 }

 setCoop(label: string) {
  if (this.state.coopLabel === label && this.coopText?.text === label) return;
  this.state.coopLabel = label;
  this.ensureCoopPill(label);
 }

 setTelemetry(pingMs: number, fps: number, fromLoop = false) {
  if (fromLoop && this.telemetryPinned) return;
  if (!fromLoop) this.telemetryPinned = true;
  const nextPing = Math.max(1, Math.round(pingMs));
  const nextFps = Math.max(1, Math.round(fps));
  if (this.state.pingMs === nextPing && this.state.fps === nextFps) return;
  this.state.pingMs = nextPing;
  this.state.fps = nextFps;
  if (this.trTelemetryPingText && this.trTelemetryFpsText) {
   this.trTelemetryPingText.text = `${nextPing} ms`;
   this.trTelemetryFpsText.text = `${nextFps} fps`;
   this.layoutTopRightRibbon();
  }
 }

 setPing(pingMs: number) {
  this.setTelemetry(pingMs, this.state.fps ?? 60);
 }

 setFps(fps: number) {
  this.setTelemetry(this.state.pingMs ?? 24, fps);
 }

 getTopRightTelemetry() {
  const s = this.lastScale;
  const { width: W } = HUD_DESIGN;
  const trScale = this.isPortrait ? 1.06 : 1;
  const trOffsetY = 0;
  const toScreenX = (dx: number) => this.lastWidth + (dx - W) * trScale * s;
  const toScreenY = (dy: number) => (trOffsetY + dy * trScale) * s;
  const b = this.trDesignBounds;
  const designLeft = Math.min(
   b.goldPlaque.medX - b.goldPlaque.medR,
   b.ledger.leftX,
   b.filigreeRule.leftX - 16,
  );
  const designRight = Math.max(b.clockPlaque.rightX + 7, b.filigreeRule.rightX + 8);
  const designTop = b.goldPlaque.cy - b.goldPlaque.medR;
  const designBottom = b.telemetry.cy + 14;
  return {
   variant: this.isAltB ? 'concept-3-medallion-plaques-ledger' : 'legacy-4-pill-stack',
   isPortrait: this.isPortrait,
   ribbonScale: trScale,
   telemetryTextScale: this.trTelemetryPingText?.scale.x ?? 1,
   goldLabel: this.trRibbonGoldText?.text ?? this.goldText.text,
   timeLabel: this.trRibbonClockText?.text ?? this.clockText.text,
   zoneLabel: this.trRibbonZoneText?.text ?? this.zoneText.text,
   coopLabel: this.trRibbonCoopText?.text ?? (this.state.coopLabel ?? 'Co-op · Solo'),
   pingLabel: this.trTelemetryPingText?.text ?? '24 ms',
   fpsLabel: this.trTelemetryFpsText?.text ?? '60 fps',
   pingMs: this.state.pingMs ?? 24,
   fps: this.state.fps ?? 60,
   designBounds: b,
   screenBounds: {
    left: +toScreenX(designLeft).toFixed(2),
    top: +toScreenY(designTop).toFixed(2),
    right: +toScreenX(designRight).toFixed(2),
    bottom: +toScreenY(designBottom).toFixed(2),
    width: +((designRight - designLeft) * trScale * s).toFixed(2),
    height: +((designBottom - designTop) * trScale * s).toFixed(2),
   },
   rightBannerClearancePx: +((W - 38 - designRight) * trScale * s).toFixed(2),
  };
 }

 private lastArcStructureKey = '';

 setSkills(skills: HudSkillState[]) {
  const prev = this.state.skills;
  this.state.skills = skills;
  if (this.isAltB) {
   const structKey = `${this.isPortrait ? 1 : 0}|` + skills.map((sk) => `${sk.name}:${sk.level}:${sk.art}:${sk.locked ? 1 : 0}:${sk.hotkey ?? ''}`).join('|');
   skills.forEach((sk, i) => {
    const view = this.skillViews[i];
    if (!view) return;
    if (view.currentArt !== sk.art) {
     view.currentArt = sk.art;
     const slotsCfg = this.isPortrait ? ALT_B_SLOTS_PORTRAIT : ALT_B_SLOTS_DESKTOP;
     const cfg = slotsCfg[i] ?? slotsCfg[0];
     view.artHolder.removeChildren();
     view.artHolder.addChild(
      centred(this.frames.frame(sk.art), view.cx, view.cy, cfg.artSize, cfg.artSize),
     );
    }
   });
   if (structKey !== this.lastArcStructureKey || prev.length !== skills.length) {
    this.lastArcStructureKey = structKey;
    this.layoutCrescentArc();
   } else {
    skills.forEach((sk, i) => {
     const view = this.skillViews[i];
     if (!view) return;
     this.drawCooldown(view, sk.cooldownRatio ?? 0, sk.stateLabel, sk.cooldownSec);
    });
   }
   return;
  }

  skills.forEach((sk, i) => {
   const view = this.skillViews[i];
   if (!view) return;
   if (view.currentArt !== sk.art) {
    view.currentArt = sk.art;
    view.artHolder.removeChildren();
    view.artHolder.addChild(centred(this.frames.frame(sk.art), view.cx, view.cy));
   }
   view.artHolder.alpha = sk.locked ? 0.45 : 1;
   const nextLv = sk.locked ? '—' : `Lv. ${sk.level}`;
   if (view.levelText.text !== nextLv) {
    view.levelText.text = nextLv;
    view.levelText.place(view.cx, 751.5, 0.5);
   }
   const nextState = sk.stateLabel ?? (sk.locked ? 'Locked' : 'Auto');
   if (view.stateText.text !== nextState) {
    view.stateText.text = nextState;
    const bw = Math.max(84, Math.round(view.stateText.advance + 36));
    view.stateBadge.width = bw;
    view.stateBadge.position.set(view.cx - bw / 2, 761);
    view.stateText.place(view.cx, 779, 0.5);
   }
   if (view.nameText.text !== sk.name) {
    view.nameText.text = sk.name;
    view.nameText.place(view.cx, 811, 0.5);
   }
   this.drawCooldown(view, sk.cooldownRatio ?? 0);
  });
 }

 setSkillCooldown(index: number, ratio: number, stateLabel?: string, cooldownSec?: number) {
  const view = this.skillViews[index];
  if (!view) return;
  this.drawCooldown(view, ratio, stateLabel, cooldownSec);
 }

 private drawCooldown(
  view: SkillSlotView,
  ratio: number,
  stateLabel?: string,
  cooldownSec?: number,
 ) {
  const step = ratio > 0.01 ? Math.max(1, Math.round(Math.min(1, ratio) * 40)) : 0;
  if (view.lastCooldownStep !== step) {
   view.lastCooldownStep = step;
   view.cooldownArc.clear();
   if (step > 0) {
    const r = this.isAltB ? view.radius - 6 : 43;
    const start = -Math.PI / 2;
    const end = start + Math.PI * 2 * (step / 40);
    view.cooldownArc.moveTo(view.cx, view.cy);
    view.cooldownArc.arc(view.cx, view.cy, r, start, end);
    view.cooldownArc.closePath();
    // Radial clockwise cooldown sweep overlay `rgba(8, 10, 16, 0.76)`
    view.cooldownArc.fill({ color: 0x080a10, alpha: 0.76 });
   }
  }
  if (this.isAltB) {
   const sec =
    cooldownSec ??
    (stateLabel && stateLabel.endsWith('s') ? Number.parseFloat(stateLabel) : 0);
   if (step > 0 && sec > 0.05) {
    view.cooldownText.visible = true;
    const txt = `${sec.toFixed(1)}s`;
    if (view.cooldownText.text !== txt) {
     view.cooldownText.text = txt;
     view.cooldownText.place(view.cx, view.cy + 7, 0.5);
    }
   } else {
    view.cooldownText.visible = false;
   }
   return;
  }
  if (stateLabel !== undefined && view.stateText.text !== stateLabel) {
   view.stateText.text = stateLabel;
   const bw = Math.max(84, Math.round(view.stateText.advance + 36));
   view.stateBadge.width = bw;
   view.stateBadge.position.set(view.cx - bw / 2, 761);
   view.stateText.place(view.cx, 779, 0.5);
  }
 }

 // Returns screen-space anchor below the top-right ribbon/pills for positioning popovers (Clock / Co-op).
 topRightPopoverAnchor(row: 1 | 3): { x: number; y: number; scale: number } {
  const s = this.lastScale;
  if (this.isAltB) {
   const designY = this.isPortrait ? 168 : 140;
   return { x: this.lastWidth - 18 * s, y: designY * s, scale: s };
  }
  const designY = row === 1 ? 126 : 232;
  return { x: this.lastWidth - 12 * s, y: designY * s, scale: s };
 }

 // Returns exact screen-space geometry (in CSS px) of the Bottom-Right Crescent Action Arc and its 3 skill sockets.
 getSkillSocketScreenGeometry(): {
  arcCenter: Point2D;
  sockets: SkillSocketGeometry[];
  scale: number;
 } {
  const s = this.lastScale;
  const { width: W, height: H } = HUD_DESIGN;
  const toScreen = (dx: number, dy: number): Point2D => ({
   x: this.lastWidth + (dx - W) * s,
   y: this.lastHeight + (dy - H) * s,
  });
  const arcCenter = toScreen(ALT_B_ARC_CENTER.x, ALT_B_ARC_CENTER.y);
  const sockets: SkillSocketGeometry[] = this.skillViews.map((v, index) => {
   const pt = toScreen(v.cx, v.cy);
   const sk = this.state.skills[index];
   return {
    index,
    x: pt.x,
    y: pt.y,
    radius: v.radius * s,
    locked: Boolean(sk?.locked),
    name: sk?.name ?? 'Empty Slot',
    level: sk?.level ?? 0,
   };
  });
  return { arcCenter, sockets, scale: s };
 }

 // Desktop and landscape keep the reference arrangement at one uniform scale; portrait adapts to mobile ergonomics.
 layout(width: number, height: number) {
  this.lastWidth = width;
  this.lastHeight = height;
  const { width: W, height: H } = HUD_DESIGN;
  const portrait = width < height;
  const s = portrait ? width / 848 : Math.min(width / W, height / H);
  this.lastScale = s;
  const desktopTelemetry = !portrait && width >= 1024;
  if (portrait === this.isPortrait && desktopTelemetry !== this.isDesktopTelemetry) {
   this.isDesktopTelemetry = desktopTelemetry;
   this.layoutTopRightRibbon();
  }
  if (portrait !== this.isPortrait) {
   this.isPortrait = portrait;
   this.isDesktopTelemetry = desktopTelemetry;
   this.heroPlate.width = portrait ? 308 : 388;
   this.heroPlate.height = portrait || this.isAltB ? 138 : 104;
   this.heroPlate.position.set(portrait ? 144 : 150, portrait ? 22 : 24);
   this.hpFrame.width = portrait ? 308 : 362;
   this.hpFrame.position.set(portrait ? 154 : 178, portrait ? 66 : 68);
   this.hpFill.position.set(portrait ? 162 : 186, portrait ? 75 : 77);
   this.tlXpFrame.width = portrait ? 322 : 366;
   if (this.portraitHolder.children[0]) {
    centred(this.portraitHolder.children[0] as Container, 95, portrait ? 92 : 88);
   }
   centred(this.portraitRing, 95, portrait ? 92 : 88);
   centred(this.levelMedallion, 57, portrait ? 152 : 149);
   this.levelText.place(57, portrait ? 157.5 : 154.5, 0.5);
   this.heroNameText.place(portrait ? 184 : 195, 52.5);
   this.hpText.place(portrait ? 295 : 352, portrait ? 90.5 : 92.5, 0.5);
   this.setHp(this.state.hp, this.state.hpMax);
   this.setGateHp(this.state.gateHp ?? 100, this.state.gateHpMax ?? 100);
   this.setXp(this.state.xp, this.state.xpMax);
   this.playerConsole?.setPortrait(portrait);
   this.layoutTopRightRibbon();
   this.layoutCrescentArc();
  }
  this.tlXpGroup.visible = this.isAltB ? false : portrait;
  this.bcXpGroup.visible = this.isAltB ? false : !portrait;
  this.groups.bl.visible = !portrait;

  if (this.isAltB) {
   this.groups.br.visible = true;
   // No menu wired (the game: the hero is chosen once, hero-picker.ts): no Esc pill.
   this.brEscGroup.visible = !portrait && !!this.callbacks.onMenuClick;
   this.trRibbonGroup.visible = true;
   this.trStackGroup.visible = false;
   const trScale = portrait ? 1.06 : 1;
   this.trRibbonGroup.pivot.set(W, 0);
   this.trRibbonGroup.position.set(W, 0);
   this.trRibbonGroup.scale.set(trScale);
  } else {
   this.groups.br.visible = !portrait;
   this.trRibbonGroup.visible = false;
   this.trStackGroup.visible = true;
  }

  const place = (g: Container, px: number, py: number, x: number, y: number, k = 1) => {
   g.scale.set(s * k);
   g.pivot.set(px, py);
   g.position.set(x, y);
  };
  place(this.groups.tl, 0, 0, 0, 0, portrait ? (this.isAltB ? 1.08 : 0.9) : 1);
  place(this.groups.tr, W, 0, width, 0);
  place(this.groups.bc, W / 2, portrait ? 842 : H, width / 2, height);
  place(this.groups.bl, 0, H, 0, height);
  place(this.groups.br, W, H, width, height);
  for (const img of [this.backdrop, this.overlay]) {
   if (!img) continue;
   const c = Math.max(width / W, height / H);
   img.scale.set((c * W) / img.texture.width);
   img.position.set((width - W * c) / 2, (height - H * c) / 2);
  }
  return s;
 }

 static sceneScale(width: number, height: number) {
  return width < height
   ? width / 848
   : Math.min(width / HUD_DESIGN.width, height / HUD_DESIGN.height);
 }
}
