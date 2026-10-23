import { Container, Graphics, Rectangle } from 'pixi.js';
import type { FrameSet } from './frames';
import { MsdfText } from './text';
import { ROLES, type TextRole } from './tokens';
import {
 solveVectorTetheredPopovers,
 type Point2D,
 type ResolvedTetherPopover,
 type SkillSocketGeometry,
 type TetherPopoverInput,
} from './vector-tether';

export interface BlessingChoiceItem {
 id: string;
 optionNumber: number; // 1, 2, 3
 kind: 'passive' | 'active';
 name: string;
 rankLabel: string; // e.g. '(PASSIVE)' or 'UNLOCK Lv. 1' or 'Lv. 1 → Lv. 2'
 statSummary: string; // e.g. '+25 Max HP · +12% SPD' or 'AoE Fire Ring · 4.0s CD'
 art: string;
 targetSocketIndex?: number; // 0, 1, 2 for active skills
 isUnlock?: boolean;
}

export interface PassiveBannerTelemetry {
 id: string;
 optionNumber: number;
 text: string;
 rect: { x: number; y: number; width: number; height: number };
 glowing: boolean;
}

export interface BlessingOverlayTelemetry {
 active: boolean;
 nonModal: boolean;
 centerScreenObstructionRatio: number;
 headerCrest: {
  text: string;
  rect: { x: number; y: number; width: number; height: number };
  interactive: boolean;
 } | null;
 passiveBanners: PassiveBannerTelemetry[];
 skillPopovers: ResolvedTetherPopover[];
}

const HEADER_CREST_ROLE: TextRole = {
 ...ROLES['display-title'],
 size: 17,
 letterSpacing: 2.2,
 fill: [0xf7ebd2, 0xdec082, 0x9e7838],
 outline: { color: 0x0e0a06, alpha: 0.95, width: 1.3 },
 shadow: { color: 0x000000, alpha: 0.85, dx: 0, dy: 1.5, softness: 1.8 },
};

const BADGE_NUM_ROLE: TextRole = {
 ...ROLES['display-title'],
 size: 18,
 letterSpacing: 0,
 fill: [0xfffbeb, 0xffd86b, 0xc4821a],
 outline: { color: 0x1c0e02, alpha: 0.98, width: 1.5 },
 shadow: { color: 0x000000, alpha: 0.9, dx: 0, dy: 1.5, softness: 1.4 },
};

const PASSIVE_TEXT_ROLE: TextRole = {
 ...ROLES['body'],
 size: 17.5,
 letterSpacing: 0.15,
 fill: 0xfbf0d9,
 outline: { color: 0x140b03, alpha: 0.94, width: 1.1 },
 shadow: { color: 0x000000, alpha: 0.85, dx: 0, dy: 1.5, softness: 1.5 },
};

const POPOVER_TITLE_ROLE: TextRole = {
 ...ROLES['body-lg'],
 size: 20,
 letterSpacing: 0.2,
 fill: [0xfff8e2, 0xf5d076, 0xc99438],
 outline: { color: 0x160c03, alpha: 0.95, width: 1.2 },
 shadow: { color: 0x000000, alpha: 0.88, dx: 0, dy: 1.5, softness: 1.5 },
};

const POPOVER_RANK_ROLE: TextRole = {
 ...ROLES['panel-title'],
 size: 14,
 letterSpacing: 0.9,
 fill: 0xf7e4b5,
 outline: { color: 0x140b03, alpha: 0.92, width: 1.0 },
 shadow: { color: 0x000000, alpha: 0.85, dx: 0, dy: 1.2, softness: 1.3 },
 uppercase: false,
};

const POPOVER_STAT_ROLE: TextRole = {
 ...ROLES['body'],
 size: 15,
 letterSpacing: 0.1,
 fill: 0xefe2c6,
 outline: { color: 0x120a03, alpha: 0.92, width: 1.0 },
 shadow: { color: 0x000000, alpha: 0.85, dx: 0, dy: 1.2, softness: 1.3 },
};

function drawEmbossedNumberBadge(
 g: Graphics,
 cx: number,
 cy: number,
 size: number,
 scale: number,
) {
 const half = size / 2;
 const r = Math.max(4, Math.round(5 * scale));
 // Warm golden-amber outer bloom
 g.roundRect(cx - half - 4 * scale, cy - half - 4 * scale, size + 8 * scale, size + 8 * scale, r + 3 * scale)
  .fill({ color: 0xffb830, alpha: 0.28 });
 g.roundRect(cx - half - 2 * scale, cy - half - 2 * scale, size + 4 * scale, size + 4 * scale, r + 1.5 * scale)
  .fill({ color: 0xffd460, alpha: 0.42 });

 // Dark bronze/obsidian recessed keycap interior
 g.roundRect(cx - half, cy - half, size, size, r)
  .fill({ color: 0x1b1309, alpha: 0.98 })
  .stroke({ color: 0xffe082, width: Math.max(1.5, 2 * scale), alpha: 0.98 });

 // Inner bevel highlight
 const inset = Math.max(2, 2.5 * scale);
 g.roundRect(cx - half + inset, cy - half + inset, size - inset * 2, size - inset * 2, Math.max(2, r - 2))
  .fill({ color: 0x2b1e0d, alpha: 0.92 })
  .stroke({ color: 0xc89232, width: Math.max(1, 1 * scale), alpha: 0.85 });

 // Corner rivets
 const rv = Math.max(1.2, 1.5 * scale);
 const ro = half - 3.5 * scale;
 for (const [dx, dy] of [
  [-ro, -ro],
  [ro, -ro],
  [-ro, ro],
  [ro, ro],
 ]) {
  g.circle(cx + dx, cy + dy, rv).fill({ color: 0xffe89e, alpha: 0.95 });
 }
}

function drawPassiveEmblem(g: Graphics, cx: number, cy: number, size: number, id: string, scale: number) {
 const half = size / 2;
 const r = Math.max(3, 4 * scale);
 // Square bronze & gold icon frame
 g.roundRect(cx - half, cy - half, size, size, r)
  .fill({ color: 0x1c120b, alpha: 0.96 })
  .stroke({ color: 0xe6b85c, width: Math.max(1.3, 1.6 * scale), alpha: 0.95 });
 g.roundRect(cx - half + 2 * scale, cy - half + 2 * scale, size - 4 * scale, size - 4 * scale, Math.max(2, r - 1))
  .fill({ color: 0x33190e, alpha: 0.85 })
  .stroke({ color: 0x8c5e24, width: 1 * scale, alpha: 0.7 });

 // Inner warm glow
 g.circle(cx, cy, size * 0.36).fill({ color: 0xff6b2b, alpha: 0.32 });
 g.circle(cx, cy, size * 0.24).fill({ color: 0xffb84d, alpha: 0.38 });

 // Stylized RPG heart / furnace core emblem (matching v5 reference)
 const s = size * 0.26;
 if (id === 'vitality' || id === 'furnace-heart' || id === 'heal' || id === 'leech') {
  // Glowing Furnace Heart
  g.moveTo(cx, cy + s * 0.85)
   .bezierCurveTo(cx - s * 1.25, cy + s * 0.1, cx - s * 1.15, cy - s * 0.85, cx - s * 0.48, cy - s * 0.85)
   .bezierCurveTo(cx - s * 0.12, cy - s * 0.85, cx, cy - s * 0.45, cx, cy - s * 0.35)
   .bezierCurveTo(cx, cy - s * 0.45, cx + s * 0.12, cy - s * 0.85, cx + s * 0.48, cy - s * 0.85)
   .bezierCurveTo(cx + s * 1.15, cy - s * 0.85, cx + s * 1.25, cy + s * 0.1, cx, cy + s * 0.85)
   .closePath()
   .fill({ color: 0xff5232, alpha: 0.95 })
   .stroke({ color: 0xffdf80, width: Math.max(1.1, 1.4 * scale), alpha: 0.95 });
  g.circle(cx - s * 0.25, cy - s * 0.25, s * 0.22).fill({ color: 0xffeb99, alpha: 0.85 });
 } else {
  // Radiant golden-crimson crest star/diamond for offensive/utility passives
  g.moveTo(cx, cy - s)
   .lineTo(cx + s * 0.75, cy)
   .lineTo(cx, cy + s)
   .lineTo(cx - s * 0.75, cy)
   .closePath()
   .fill({ color: 0xff7830, alpha: 0.95 })
   .stroke({ color: 0xffe48a, width: Math.max(1.1, 1.4 * scale), alpha: 0.95 });
  g.circle(cx, cy, s * 0.32).fill({ color: 0xfff0b8, alpha: 0.92 });
 }
}

/**
 * Draw the continuous outer contour of the popover card + its dynamically tethered vector pointer tail (B_i1, T_i, B_i2)
 * so there is no internal seam line between the card rectangle and the pointer triangle.
 */
function buildUnifiedCardAndTailPolygon(pop: ResolvedTetherPopover): Point2D[] {
 const { xMin, yMin, xMax, yMax } = pop.rect;
 const B1 = pop.basePoint1;
 const B2 = pop.basePoint2;
 const T = pop.rimApex;

 const TL: Point2D = { x: xMin, y: yMin };
 const TR: Point2D = { x: xMax, y: yMin };
 const BR: Point2D = { x: xMax, y: yMax };
 const BL: Point2D = { x: xMin, y: yMax };

 switch (pop.edgeOrCorner) {
  case 'bottom-right':
   // B1 is on bottom edge (xMax - c, yMax), B2 is on right edge (xMax, yMax - c)
   return [TL, TR, B2, T, B1, BL];
  case 'bottom-left':
   // B1 is on bottom edge (xMin + c, yMax), B2 is on left edge (xMin, yMax - c)
   return [TL, TR, BR, B1, T, B2];
  case 'top-right':
   // B1 is on top edge (xMax - c, yMin), B2 is on right edge (xMax, yMin + c)
   return [TL, B1, T, B2, BR, BL];
  case 'top-left':
   // B1 is on top edge (xMin + c, yMin), B2 is on left edge (xMin, yMin + c)
   return [B1, TR, BR, BL, B2, T];
  case 'bottom': {
   const leftFirst = B1.x <= B2.x ? B1 : B2;
   const rightSecond = B1.x <= B2.x ? B2 : B1;
   return [TL, TR, BR, rightSecond, T, leftFirst, BL];
  }
  case 'top': {
   const leftFirst = B1.x <= B2.x ? B1 : B2;
   const rightSecond = B1.x <= B2.x ? B2 : B1;
   return [TL, leftFirst, T, rightSecond, TR, BR, BL];
  }
  case 'right': {
   const topFirst = B1.y <= B2.y ? B1 : B2;
   const bottomSecond = B1.y <= B2.y ? B2 : B1;
   return [TL, TR, topFirst, T, bottomSecond, BR, BL];
  }
  case 'left': {
   const topFirst = B1.y <= B2.y ? B1 : B2;
   const bottomSecond = B1.y <= B2.y ? B2 : B1;
   return [TL, TR, BR, BL, bottomSecond, T, topFirst];
  }
 }
}

export class LevelUpBlessingOverlay extends Container {
 private lastTelemetry: BlessingOverlayTelemetry = {
  active: false,
  nonModal: true,
  centerScreenObstructionRatio: 0,
  headerCrest: null,
  passiveBanners: [],
  skillPopovers: [],
 };

 constructor(
  private frames: FrameSet,
  private onSelect: (id: string) => void,
 ) {
  super();
  this.eventMode = 'passive';
  this.zIndex = 55;
 }

 telemetry(): BlessingOverlayTelemetry {
  return this.lastTelemetry;
 }

 renderChoices(
  choices: BlessingChoiceItem[],
  arcCenter: Point2D,
  sockets: SkillSocketGeometry[],
  viewportWidth: number,
  viewportHeight: number,
  hudScale: number,
 ) {
  this.removeChildren().forEach((c) => c.destroy({ children: true }));
  if (!choices.length) {
   this.visible = false;
   this.lastTelemetry = {
    active: false,
    nonModal: true,
    centerScreenObstructionRatio: 0,
    headerCrest: null,
    passiveBanners: [],
    skillPopovers: [],
   };
   return;
  }

  this.visible = true;
  const portrait = viewportWidth < viewportHeight;
  const uiScale = portrait
   ? Math.min(1.05, Math.max(0.46, viewportWidth / 760))
   : Math.min(1.05, Math.max(0.68, Math.min(viewportWidth / 1520, viewportHeight / 880)));

  // 1. Top-Center Static Matte Header Crest (`LEVEL UP · CHOOSE BLESSING`)
  const headerW = Math.round((portrait ? 520 : 540) * uiScale);
  const headerH = Math.round((portrait ? 40 : 40) * uiScale);
  const headerX = Math.round((viewportWidth - headerW) / 2);
  // On mobile portrait, place below the top-left hero console & top-right pill stack so nothing overlaps
  const headerY = portrait
   ? Math.max(Math.round(142 * hudScale), Math.round(viewportHeight * 0.175))
   : Math.round(24 * uiScale);

  const headerContainer = this.addChild(new Container());
  headerContainer.eventMode = 'none';
  const headerG = headerContainer.addChild(new Graphics());

  // Matte dark-obsidian pointed gothic banner with subtle antique bronze filigree (non-glowing so choices pop)
  const tipW = Math.round(22 * uiScale);
  const hx0 = headerX;
  const hx1 = headerX + headerW;
  const hy0 = headerY;
  const hy1 = headerY + headerH;
  const hcy = (hy0 + hy1) / 2;

  // Decorative side filigree wings
  for (const dir of [-1, 1]) {
   const wx = dir < 0 ? hx0 - 6 * uiScale : hx1 + 6 * uiScale;
   headerG
    .moveTo(wx, hcy)
    .lineTo(wx + dir * 22 * uiScale, hcy - 7 * uiScale)
    .lineTo(wx + dir * 14 * uiScale, hcy)
    .lineTo(wx + dir * 22 * uiScale, hcy + 7 * uiScale)
    .closePath()
    .fill({ color: 0x6e552f, alpha: 0.78 });
   headerG.circle(wx + dir * 4 * uiScale, hcy, 3 * uiScale).fill({ color: 0xb89352, alpha: 0.85 });
  }

  // Main matte obsidian hexagonal crest body
  headerG
   .poly([
    hx0,
    hcy,
    hx0 + tipW,
    hy0,
    hx1 - tipW,
    hy0,
    hx1,
    hcy,
    hx1 - tipW,
    hy1,
    hx0 + tipW,
    hy1,
   ])
   .fill({ color: 0x0b0d13, alpha: 0.93 })
   .stroke({ color: 0x9c7c44, width: Math.max(1.2, 1.6 * uiScale), alpha: 0.86 });

  const inset = Math.max(2.5, 3.5 * uiScale);
  headerG
   .poly([
    hx0 + inset * 1.4,
    hcy,
    hx0 + tipW + inset * 0.5,
    hy0 + inset,
    hx1 - tipW - inset * 0.5,
    hy0 + inset,
    hx1 - inset * 1.4,
    hcy,
    hx1 - tipW - inset * 0.5,
    hy1 - inset,
    hx0 + tipW + inset * 0.5,
    hy1 - inset,
   ])
   .stroke({ color: 0x594525, width: 1, alpha: 0.72 });

  const headerText = headerContainer.addChild(
   new MsdfText(
    {
     ...HEADER_CREST_ROLE,
     size: Math.max(11, Math.round(18 * uiScale)),
     letterSpacing: Math.max(1.2, 2.4 * uiScale),
    },
    'LEVEL UP · CHOOSE BLESSING',
   ),
  );
  headerText.place(viewportWidth / 2, hcy + 5 * uiScale, 0.5);

  // 2. Separate Passive Choices (Top-Center Glowing Horizontal Banners) vs. Active Skill Choices (Bottom-Right Vector-Tethered Popovers)
  const passiveChoices = choices.filter((c) => c.kind === 'passive');
  const activeChoices = choices.filter((c) => c.kind === 'active');

  const passiveTelemetry: PassiveBannerTelemetry[] = [];
  let currentPassiveY = hy1 + Math.round(12 * uiScale);

  for (const pas of passiveChoices) {
   const fullText = `${pas.name} ${pas.rankLabel} · ${pas.statSummary}`;
   const textFontSize = Math.max(11, Math.round((portrait ? 17.5 : 18.5) * uiScale));
   const labelNode = new MsdfText({ ...PASSIVE_TEXT_ROLE, size: textFontSize }, fullText);

   const badgeSize = Math.round((portrait ? 34 : 36) * uiScale);
   const iconSize = Math.round((portrait ? 38 : 40) * uiScale);
   const padLeft = Math.round(26 * uiScale) + iconSize + Math.round(14 * uiScale);
   const padRight = Math.round(26 * uiScale);
   const minBannerW = Math.round((portrait ? 590 : 560) * uiScale);
   const maxBannerW = Math.round(viewportWidth - (portrait ? 28 : 120) * uiScale);
   const bannerW = Math.max(
    Math.min(minBannerW, maxBannerW),
    Math.min(maxBannerW, Math.round(labelNode.advance + padLeft + padRight)),
   );
   const bannerH = Math.round((portrait ? 54 : 56) * uiScale);
   const bx = Math.round((viewportWidth - bannerW) / 2);
   const by = currentPassiveY;

   const item = this.addChild(new Container());
   item.eventMode = 'static';
   item.cursor = 'pointer';
   item.hitArea = new Rectangle(bx - badgeSize / 2, by - 4, bannerW + badgeSize, bannerH + 8);
   item.on('pointertap', () => this.onSelect(pas.id));

   const bg = item.addChild(new Graphics());
   const r = Math.max(5, Math.round(6 * uiScale));

   // High-contrast golden-amber outer bloom (`drop-shadow(0 0 12px rgba(255, 196, 64, 0.65))`)
   for (const [spread, alpha] of [
    [13 * uiScale, 0.11],
    [8.5 * uiScale, 0.2],
    [4.5 * uiScale, 0.34],
    [2 * uiScale, 0.52],
   ] as const) {
    bg
     .roundRect(bx - spread, by - spread, bannerW + spread * 2, bannerH + spread * 2, r + spread)
     .fill({ color: 0xffc440, alpha });
   }

   // Dark-obsidian & warm golden sheen interior + double-gold interactive borders
   bg
    .roundRect(bx, by, bannerW, bannerH, r)
    .fill({ color: 0x16120c, alpha: 0.95 })
    .stroke({ color: 0xffe27a, width: Math.max(1.8, 2.2 * uiScale), alpha: 0.98 });

   const inPad = Math.max(2.5, 3.5 * uiScale);
   bg
    .roundRect(bx + inPad, by + inPad, bannerW - inPad * 2, bannerH - inPad * 2, Math.max(3, r - 2))
    .fill({ color: 0x241b10, alpha: 0.55 })
    .stroke({ color: 0xd49b35, width: Math.max(1, 1.2 * uiScale), alpha: 0.88 });

   // Ornamental right filigree flourish
   const rfx = bx + bannerW + 8 * uiScale;
   const rfy = by + bannerH / 2;
   bg
    .moveTo(bx + bannerW, rfy - 10 * uiScale)
    .lineTo(rfx + 8 * uiScale, rfy)
    .lineTo(bx + bannerW, rfy + 10 * uiScale)
    .closePath()
    .fill({ color: 0xdba844, alpha: 0.85 });

   // Square passive icon emblem on left inside banner
   const iconCx = bx + Math.round(22 * uiScale) + iconSize / 2;
   const iconCy = by + bannerH / 2;
   drawPassiveEmblem(bg, iconCx, iconCy, iconSize, pas.id, uiScale);

   // Embossed golden option badge (`1`) anchored on the left border
   const badgeCx = bx - Math.round(4 * uiScale);
   const badgeCy = by + bannerH / 2;
   drawEmbossedNumberBadge(bg, badgeCx, badgeCy, badgeSize, uiScale);

   const badgeTxt = item.addChild(
    new MsdfText(
     {
      ...BADGE_NUM_ROLE,
      size: Math.max(12, Math.round(19 * uiScale)),
     },
     String(pas.optionNumber),
    ),
   );
   badgeTxt.place(badgeCx, badgeCy + 6 * uiScale, 0.5);

   // Passive blessing text centered in remaining horizontal span
   item.addChild(labelNode);
   const textLeft = iconCx + iconSize / 2 + Math.round(14 * uiScale);
   const textRight = bx + bannerW - Math.round(16 * uiScale);
   const textCenterX = (textLeft + textRight) / 2;
   labelNode.place(textCenterX, by + bannerH / 2 + 5.5 * uiScale, 0.5);

   passiveTelemetry.push({
    id: pas.id,
    optionNumber: pas.optionNumber,
    text: fullText,
    rect: { x: bx, y: by, width: bannerW, height: bannerH },
    glowing: true,
   });
   currentPassiveY += bannerH + Math.round(10 * uiScale);
  }

  // 3. Bottom-Right Dynamic Vector-Tethered Skill Popovers (4-Stage Geometric Algorithm)
  const cardW = Math.round((portrait ? 276 : 254) * uiScale);
  const cardH = Math.round((portrait ? 110 : 108) * uiScale);

  const tetherInputs: TetherPopoverInput[] = activeChoices.map((act) => ({
   id: act.id,
   optionNumber: act.optionNumber,
   socketIndex: act.targetSocketIndex ?? 1,
   width: cardW,
   height: cardH,
  }));

  const resolvedPopovers = solveVectorTetheredPopovers(arcCenter, sockets, tetherInputs, {
   width: viewportWidth,
   height: viewportHeight,
   scale: uiScale,
   safeLeft: Math.round(12 * uiScale),
   safeRight: Math.round(12 * uiScale),
   safeTop: Math.max(currentPassiveY + Math.round(16 * uiScale), Math.round(110 * uiScale)),
   safeBottom: Math.round(16 * uiScale),
  });

  // Render target socket rim highlights and tethered popover cards
  const rimLayer = this.addChild(new Graphics());
  rimLayer.eventMode = 'none';

  for (const pop of resolvedPopovers) {
   const choice = activeChoices.find((c) => c.optionNumber === pop.optionNumber) ?? activeChoices[0];
   if (!choice) continue;

   const item = this.addChild(new Container());
   item.eventMode = 'static';
   item.cursor = 'pointer';
   item.hitArea = new Rectangle(
    pop.rect.xMin - 16 * uiScale,
    pop.rect.yMin - 16 * uiScale,
    pop.rect.width + 32 * uiScale,
    pop.rect.height + 32 * uiScale,
   );
   item.on('pointertap', () => this.onSelect(choice.id));

   const g = item.addChild(new Graphics());
   const poly = buildUnifiedCardAndTailPolygon(pop);
   const flatPts = poly.flatMap((pt) => [pt.x, pt.y]);

   // Outer golden-amber bloom around card + vector pointer tail
   for (const [spread, alpha] of [
    [12 * uiScale, 0.12],
    [7.5 * uiScale, 0.22],
    [3.5 * uiScale, 0.36],
   ] as const) {
    g
     .roundRect(
      pop.rect.xMin - spread,
      pop.rect.yMin - spread,
      pop.rect.width + spread * 2,
      pop.rect.height + spread * 2,
      Math.round(6 * uiScale + spread),
     )
     .fill({ color: 0xffc440, alpha });
   }
   // Pointer wedge outer glow
   g
    .poly([
     pop.basePoint1.x,
     pop.basePoint1.y,
     pop.rimApex.x,
     pop.rimApex.y,
     pop.basePoint2.x,
     pop.basePoint2.y,
    ])
    .stroke({ color: 0xffc440, width: Math.max(4, 7 * uiScale), alpha: 0.34 });

   // Unified dark-obsidian interior fill (card + pointer wedge seamlessly joined)
   g
    .poly(flatPts)
    .fill({ color: 0x120f0b, alpha: 0.95 })
    .stroke({ color: 0xffe27a, width: Math.max(1.8, 2.2 * uiScale), alpha: 0.98 });

   // Inner double-gold filigree border inside the popover card
   const inPad = Math.max(2.5, 3.5 * uiScale);
   g
    .roundRect(
     pop.rect.xMin + inPad,
     pop.rect.yMin + inPad,
     pop.rect.width - inPad * 2,
     pop.rect.height - inPad * 2,
     Math.max(2, Math.round(3 * uiScale)),
    )
    .fill({ color: 0x21180e, alpha: 0.48 })
    .stroke({ color: 0xc99230, width: Math.max(1, 1.1 * uiScale), alpha: 0.85 });

   // Subtle golden line-of-sight vector core inside the pointer wedge
   const midBaseX = (pop.basePoint1.x + pop.basePoint2.x) / 2;
   const midBaseY = (pop.basePoint1.y + pop.basePoint2.y) / 2;
   g
    .moveTo(midBaseX, midBaseY)
    .lineTo(pop.rimApex.x, pop.rimApex.y)
    .stroke({ color: 0xffdf80, width: Math.max(1, 1.3 * uiScale), alpha: 0.55 });

   // Stage 4: Glowing Golden Rim Lock-On Node at T_i on the target skill socket's outer rim
   const tx = pop.rimLockNode.x;
   const ty = pop.rimLockNode.y;
   const nr = pop.rimLockNode.radiusPx;
   // Subtle golden arc highlight on target socket bezel around T_i
   const rimAng = Math.atan2(ty - pop.socketCenter.y, tx - pop.socketCenter.x);
   const rimR = pop.socketRadius + 1.5 * uiScale;
   const rimStart = rimAng - 0.38;
   const rimEnd = rimAng + 0.38;
   rimLayer
    .moveTo(
     pop.socketCenter.x + Math.cos(rimStart) * rimR,
     pop.socketCenter.y + Math.sin(rimStart) * rimR,
    )
    .arc(pop.socketCenter.x, pop.socketCenter.y, rimR, rimStart, rimEnd)
    .stroke({ color: 0xffe484, width: Math.max(2, 2.6 * uiScale), alpha: 0.88 });
   // Radial bloom + diamond/circle lock-on pip at T_i
   rimLayer.circle(tx, ty, nr * 2.4).fill({ color: 0xffb830, alpha: 0.32 });
   rimLayer.circle(tx, ty, nr * 1.5).fill({ color: 0xffdf70, alpha: 0.62 });
   rimLayer
    .poly([tx, ty - nr * 1.15, tx + nr * 1.15, ty, tx, ty + nr * 1.15, tx - nr * 1.15, ty])
    .fill({ color: 0xfff9e6, alpha: 0.98 })
    .stroke({ color: 0xffc440, width: Math.max(1, 1.2 * uiScale), alpha: 0.95 });

   // Embossed golden option badge (`2`, `3`) at top-left corner of popover card
   const badgeSize = Math.round((portrait ? 32 : 32) * uiScale);
   const badgeCx = pop.rect.xMin + Math.round(14 * uiScale);
   const badgeCy = pop.rect.yMin + Math.round(14 * uiScale);
   drawEmbossedNumberBadge(g, badgeCx, badgeCy, badgeSize, uiScale);

   const badgeTxt = item.addChild(
    new MsdfText(
     {
      ...BADGE_NUM_ROLE,
      size: Math.max(11, Math.round(17.5 * uiScale)),
     },
     String(pop.optionNumber),
    ),
   );
   badgeTxt.place(badgeCx, badgeCy + 5.5 * uiScale, 0.5);

   // 3-Line Crisp English Copy inside Popover:
   // Line 1: Skill Title (e.g. `Ember Nova` / `Flame Fan`)
   const titleX = pop.rect.xMin + pop.rect.width * 0.53;
   const titleTxt = item.addChild(
    new MsdfText(
     {
      ...POPOVER_TITLE_ROLE,
      size: Math.max(12, Math.round(20.5 * uiScale)),
     },
     choice.name,
    ),
   );
   titleTxt.place(titleX, pop.rect.yMin + Math.round(28 * uiScale), 0.5);

   // Line 2: Unlock / Rank Progression (`UNLOCK Lv. 1` or `Lv. 1 → Lv. 2`)
   const hasRankArrow = choice.rankLabel.includes('→');
   const displayRankLabel = hasRankArrow ? choice.rankLabel.replace('→', '   ') : choice.rankLabel;
   const rankCenterX = pop.rect.xMin + pop.rect.width * 0.5;
   const rankBaselineY = pop.rect.yMin + Math.round(56 * uiScale);
   const rankTxt = item.addChild(
    new MsdfText(
     {
      ...POPOVER_RANK_ROLE,
      size: Math.max(10, Math.round(14.5 * uiScale)),
     },
     displayRankLabel,
    ),
   );
   rankTxt.place(rankCenterX, rankBaselineY, 0.5);
   if (hasRankArrow) {
    const ay = rankBaselineY - Math.round(4.5 * uiScale);
    const ax = rankCenterX;
    g
     .moveTo(ax - 5.5 * uiScale, ay)
     .lineTo(ax + 3.5 * uiScale, ay)
     .stroke({ color: 0xf7e4b5, width: Math.max(1.2, 1.5 * uiScale), alpha: 0.96 });
    g
     .poly([
      ax + 1 * uiScale,
      ay - 3.2 * uiScale,
      ax + 6 * uiScale,
      ay,
      ax + 1 * uiScale,
      ay + 3.2 * uiScale,
     ])
     .fill({ color: 0xf7e4b5, alpha: 0.98 });
   }

   // Decorative thin gold divider between rank and stat delta
   const divY = pop.rect.yMin + Math.round(67 * uiScale);
   g
    .moveTo(pop.rect.xMin + 22 * uiScale, divY)
    .lineTo(pop.rect.xMax - 22 * uiScale, divY)
    .stroke({ color: 0x9e7632, width: 1, alpha: 0.45 });

   // Line 3: Compact Stat Delta Summary (`AoE Fire Ring · 4.0s CD` / `+25% Cone DMG · -0.4s CD`)
   const statTxt = item.addChild(
    new MsdfText(
     {
      ...POPOVER_STAT_ROLE,
      size: Math.max(10, Math.round(15 * uiScale)),
     },
     choice.statSummary,
    ),
   );
   statTxt.place(pop.rect.xMin + pop.rect.width * 0.5, pop.rect.yMin + Math.round(88 * uiScale), 0.5);
  }

  this.lastTelemetry = {
   active: true,
   nonModal: true,
   centerScreenObstructionRatio: 0,
   headerCrest: {
    text: 'LEVEL UP · CHOOSE BLESSING',
    rect: { x: headerX, y: headerY, width: headerW, height: headerH },
    interactive: false,
   },
   passiveBanners: passiveTelemetry,
   skillPopovers: resolvedPopovers,
  };
 }
}
