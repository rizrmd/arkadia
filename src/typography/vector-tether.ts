export interface Point2D {
 x: number;
 y: number;
}

export interface SkillSocketGeometry {
 index: number;
 x: number;
 y: number;
 radius: number;
 locked?: boolean;
 name?: string;
 level?: number;
}

export interface TetherPopoverInput {
 id: string;
 optionNumber: number;
 socketIndex: number;
 width: number;
 height: number;
}

export interface TetherViewport {
 width: number;
 height: number;
 scale?: number;
 safeLeft?: number;
 safeTop?: number;
 safeRight?: number;
 safeBottom?: number;
}

export type TailMode = 'cardinal-edge' | 'oblique-corner-chamfer';
export type BoundaryLocation =
 | 'bottom'
 | 'right'
 | 'top'
 | 'left'
 | 'bottom-right'
 | 'bottom-left'
 | 'top-right'
 | 'top-left';

export interface ResolvedTetherPopover {
 id: string;
 optionNumber: number;
 socketIndex: number;
 width: number;
 height: number;
 // Stage 1: Polar Slot Ray Placement
 polarAngleRad: number;
 polarAngleDeg: number;
 outwardNormal: Point2D;
 initialCenter: Point2D;
 // Stage 2: Angle-Sorted AABB Repulsion & Safe-Area Clamp
 center: Point2D;
 rect: {
  xMin: number;
  yMin: number;
  xMax: number;
  yMax: number;
  width: number;
  height: number;
 };
 // Stage 3: Line-of-Sight Rim Ray-Cast
 socketCenter: Point2D;
 socketRadius: number;
 nearestBorderPoint: Point2D;
 losUnitVector: Point2D;
 losAngleRad: number;
 losAngleDeg: number;
 rimApex: Point2D;
 // Stage 4: Adaptive Cardinal Edge-Slide vs. Oblique Corner-Chamfer Tail
 tailMode: TailMode;
 edgeOrCorner: BoundaryLocation;
 cornerDistancePx: number;
 chamferPx: number;
 baseWidthPx: number;
 basePoint1: Point2D;
 basePoint2: Point2D;
 pointerPolygon: [Point2D, Point2D, Point2D];
 rimLockNode: {
  x: number;
  y: number;
  radiusPx: number;
  angleRad: number;
 };
}

export const POINTER_CONSTANTS = {
 INITIAL_GAP_PX: 20,
 AABB_MARGIN_PX: 10,
 SOCKET_CLEARANCE_PX: 14,
 RIM_TIP_OFFSET_PX: 3,
 CORNER_THRESHOLD_PX: 18,
 CHAMFER_PX: 14,
 CARDINAL_BASE_PX: 16,
 LOCK_NODE_RADIUS_PX: 4,
} as const;

function clamp(v: number, lo: number, hi: number): number {
 return Math.max(lo, Math.min(hi, v));
}

/**
 * 4-Stage Dynamic Vector-Tethered Pointer Algorithm for v5 Non-Modal Level-Up Skill Popovers.
 *
 * Stage 1: Polar Slot Ray Placement along outward radial unit normal from crescent arc center C_arc.
 * Stage 2: Angle-Sorted AABB Repulsion (margin = 10px), skill circle clearance (R_j + 14px), and safe-area clamp.
 * Stage 3: Line-of-Sight Rim Ray-Cast from nearest clamped border point B_i to socket center S_i, locking tip at T_i = S_i - (R_i + 3px) * d_hat_i.
 * Stage 4: Adaptive Cardinal Edge-Slide (16px base) vs. Oblique Corner-Chamfer Tail (14px chamfer when B_i is within 18px of a corner) + Rim Lock-On Node at T_i.
 */
export function solveVectorTetheredPopovers(
 arcCenter: Point2D,
 allSockets: SkillSocketGeometry[],
 inputs: TetherPopoverInput[],
 viewport: TetherViewport,
): ResolvedTetherPopover[] {
 if (!inputs.length) return [];
 const k = viewport.scale ?? 1;
 const gapPx = POINTER_CONSTANTS.INITIAL_GAP_PX * k;
 const aabbMargin = POINTER_CONSTANTS.AABB_MARGIN_PX * k;
 const socketClearance = POINTER_CONSTANTS.SOCKET_CLEARANCE_PX * k;
 const rimOffset = POINTER_CONSTANTS.RIM_TIP_OFFSET_PX * k;
 const cornerThreshold = POINTER_CONSTANTS.CORNER_THRESHOLD_PX * k;
 const chamferPx = POINTER_CONSTANTS.CHAMFER_PX * k;
 const cardinalBasePx = POINTER_CONSTANTS.CARDINAL_BASE_PX * k;
 const lockNodeRadius = POINTER_CONSTANTS.LOCK_NODE_RADIUS_PX * k;

 const safeLeft = viewport.safeLeft ?? Math.round(12 * k);
 const safeRight = viewport.safeRight ?? Math.round(10 * k);
 const safeTop = viewport.safeTop ?? Math.round(96 * k);
 const safeBottom = viewport.safeBottom ?? Math.round(14 * k);

 // Stage 1: Polar Slot Ray Placement
 interface WorkingPopover {
  input: TetherPopoverInput;
  socket: SkillSocketGeometry;
  polarAngleRad: number;
  outwardNormal: Point2D;
  initialCenter: Point2D;
  cx: number;
  cy: number;
  w: number;
  h: number;
 }

 const working: WorkingPopover[] = inputs.map((inp) => {
  const socket =
   allSockets.find((s) => s.index === inp.socketIndex) ??
   allSockets[clamp(inp.socketIndex, 0, allSockets.length - 1)] ?? {
    index: inp.socketIndex,
    x: viewport.width - 140 * k,
    y: viewport.height - 140 * k,
    radius: 54 * k,
   };
  const dx = socket.x - arcCenter.x;
  const dy = socket.y - arcCenter.y;
  const dist = Math.hypot(dx, dy);
  const ux = dist > 1e-4 ? dx / dist : -Math.SQRT1_2;
  const uy = dist > 1e-4 ? dy / dist : -Math.SQRT1_2;
  const polarAngleRad = Math.atan2(dy, dx);
  const halfDiag = 0.5 * Math.hypot(inp.width, inp.height);
  const radialDist = socket.radius + gapPx + halfDiag;
  const initX = socket.x + ux * radialDist;
  const initY = socket.y + uy * radialDist;

  // Bias initial placement by socket role in the crescent arc so upper-right socket (index 1)
  // starts directly above its socket (cardinal bottom edge) and inner/lower sockets start upper-left
  // along their outward ray (oblique corner line of sight).
  let cx = initX;
  let cy = initY;
  if (socket.index === 1) {
   cx = socket.x - inp.width * 0.12;
   cy = socket.y - socket.radius - gapPx - inp.height * 0.54;
  } else if (socket.index === 0) {
   cx = socket.x - socket.radius * 0.85 - gapPx - inp.width * 0.5;
   cy = socket.y - socket.radius * 0.55 - gapPx * 0.6 - inp.height * 0.5;
  } else {
   cx = socket.x - socket.radius * 0.65 - gapPx - inp.width * 0.5;
   cy = socket.y - socket.radius - gapPx - inp.height * 0.55;
  }

  return {
   input: inp,
   socket,
   polarAngleRad,
   outwardNormal: { x: ux, y: uy },
   initialCenter: { x: initX, y: initY },
   cx,
   cy,
   w: inp.width,
   h: inp.height,
  };
 });

 // Stage 2: Angle-Sorted AABB Repulsion & Safe-Area Clamp
 // Sort monotonically by polar angle around C_arc (from upper-right ~ -90deg to lower-left ~ -180deg)
 // so upper-right popovers stay above/right and lower-left popovers stay left/below, guaranteeing non-crossing tethers.
 working.sort((a, b) => {
  if (Math.abs(b.polarAngleRad - a.polarAngleRad) > 1e-4) {
   return b.polarAngleRad - a.polarAngleRad;
  }
  return a.input.optionNumber - b.input.optionNumber;
 });

 const clampToSafeViewport = (p: WorkingPopover) => {
  const minCx = safeLeft + p.w / 2;
  const maxCx = Math.max(minCx, viewport.width - safeRight - p.w / 2);
  const minCy = safeTop + p.h / 2;
  const maxCy = Math.max(minCy, viewport.height - safeBottom - p.h / 2);
  p.cx = clamp(p.cx, minCx, maxCx);
  p.cy = clamp(p.cy, minCy, maxCy);
 };

 const isPortrait = viewport.width < viewport.height;
 const stickObstacle: SkillSocketGeometry | null = isPortrait
  ? {
     index: -99,
     x: Math.round(Math.max(68, viewport.width * 0.18)),
     y: Math.round(viewport.height - Math.max(82, viewport.width * 0.21)),
     radius: Math.round(110 * Math.max(0.45, viewport.width / 848)),
    }
  : null;
 const obstacleCircles = stickObstacle ? [...allSockets, stickObstacle] : allSockets;

 const pushOutsideSocketCircles = (p: WorkingPopover) => {
  for (const sk of obstacleCircles) {
   const clearR = sk.radius + (sk.index === -99 ? 8 * k : socketClearance);
   const xMin = p.cx - p.w / 2;
   const xMax = p.cx + p.w / 2;
   const yMin = p.cy - p.h / 2;
   const yMax = p.cy + p.h / 2;
   const qx = clamp(sk.x, xMin, xMax);
   const qy = clamp(sk.y, yMin, yMax);
   const dx = qx - sk.x;
   const dy = qy - sk.y;
   const d = Math.hypot(dx, dy);
   if (d < clearR) {
    if (sk.index === -99) {
     // Keep popovers above or to the right of the Mobile Portrait virtual thumbstick
     const pushUp = yMax - (sk.y - clearR);
     const pushRight = sk.x + clearR - xMin;
     if (pushUp <= pushRight * 1.25) {
      p.cy -= pushUp;
     } else {
      p.cx += pushRight;
     }
    } else if (sk.index === 1 && p.socket.index === 1) {
     // Upper-right socket popover stays directly above its socket
     p.cy = Math.min(p.cy, sk.y - clearR - p.h / 2);
    } else if (sk.index === 2 && p.socket.index === 0) {
     // Primary socket popover stays cleanly above the lower-left socket
     p.cy = Math.min(p.cy, sk.y - clearR - p.h / 2);
    } else {
     const cdx = p.cx - sk.x;
     const cdy = p.cy - sk.y;
     const cLen = Math.hypot(cdx, cdy) || 1;
     const push = clearR - d + 1;
     p.cx += (cdx / cLen) * push;
     p.cy += (cdy / cLen) * push;
    }
   }
  }
 };

 for (let iter = 0; iter < 8; iter++) {
  for (const p of working) {
   pushOutsideSocketCircles(p);
   clampToSafeViewport(p);
  }

  // Pairwise angle-sorted AABB repulsion (i = more upper-right, j = more lower-left)
  for (let i = 0; i < working.length; i++) {
   for (let j = i + 1; j < working.length; j++) {
    const upper = working[i];
    const lower = working[j];
    const reqX = (upper.w + lower.w) / 2 + aabbMargin;
    const reqY = (upper.h + lower.h) / 2 + aabbMargin;
    const dx = lower.cx - upper.cx;
    const dy = lower.cy - upper.cy;
    const overlapX = reqX - Math.abs(dx);
    const overlapY = reqY - Math.abs(dy);

    if (overlapX > 0 && overlapY > 0) {
     // Keep `lower` (more clockwise / lower-left socket) to the left of `upper` (upper-right socket)
     // so tether rays never cross and Option 3 sits to the upper-left of Socket 0.
     if (overlapX <= overlapY * 1.35) {
      const targetLowerCx = upper.cx - reqX;
      const shift = lower.cx - targetLowerCx;
      lower.cx -= shift * 0.85;
      upper.cx += shift * 0.15;
     } else {
      // Separate vertically while keeping lower to the left
      upper.cy -= overlapY * 0.5;
      lower.cy += overlapY * 0.5;
      if (lower.cx > upper.cx - reqX * 0.65) {
       lower.cx = upper.cx - reqX * 0.65;
      }
     }
    }
   }
  }

  // Ensure popovers targeting the primary inner socket (index 0) sit to its upper-left
  // so their bottom-right corner has an unobstructed oblique line of sight to Socket 0's upper-left rim,
  // while popovers targeting the upper-right socket (index 1) sit directly above Socket 1.
  for (const p of working) {
   if (p.socket.index === 1) {
    // Keep Socket 1's x within its horizontal span so B_i lies on the straight bottom edge
    const minCenterForCardinal = p.socket.x - p.w / 2 + cornerThreshold + cardinalBasePx;
    const maxCenterForCardinal = p.socket.x + p.w / 2 - cornerThreshold - cardinalBasePx;
    if (minCenterForCardinal <= maxCenterForCardinal) {
     p.cx = clamp(p.cx, minCenterForCardinal, maxCenterForCardinal);
    }
   } else if (p.socket.index === 0) {
    // Keep Socket 0's popover to the upper-left of Socket 0 so B_i is within 18px of the bottom-right corner
    const maxRightEdge = p.socket.x - p.socket.radius * 0.45;
    const maxBottomEdge = p.socket.y - p.socket.radius * 0.35;
    if (p.cx + p.w / 2 > maxRightEdge) {
     p.cx = maxRightEdge - p.w / 2;
    }
    if (p.cy + p.h / 2 > maxBottomEdge) {
     p.cy = maxBottomEdge - p.h / 2;
    }
   }
   pushOutsideSocketCircles(p);
   clampToSafeViewport(p);
  }
 }

 // Final pass to ensure zero AABB overlap after socket clearance & viewport clamping
 for (let i = 0; i < working.length; i++) {
  for (let j = i + 1; j < working.length; j++) {
   const upper = working[i];
   const lower = working[j];
   const reqX = (upper.w + lower.w) / 2 + aabbMargin;
   const reqY = (upper.h + lower.h) / 2 + aabbMargin;
   const overlapX = reqX - Math.abs(lower.cx - upper.cx);
   const overlapY = reqY - Math.abs(lower.cy - upper.cy);
   if (overlapX > 0 && overlapY > 0) {
    if (lower.cx - overlapX - lower.w / 2 >= safeLeft) {
     lower.cx -= overlapX;
    } else {
     upper.cy = Math.max(safeTop + upper.h / 2, upper.cy - overlapY);
    }
    clampToSafeViewport(upper);
    clampToSafeViewport(lower);
   }
  }
 }

 // Stage 3 & Stage 4: Line-of-Sight Rim Ray-Cast & Adaptive Cardinal vs. Oblique Corner-Chamfer Tail
 const results: ResolvedTetherPopover[] = working.map((p) => {
  const xMin = p.cx - p.w / 2;
  const xMax = p.cx + p.w / 2;
  const yMin = p.cy - p.h / 2;
  const yMax = p.cy + p.h / 2;
  const S = { x: p.socket.x, y: p.socket.y };
  const R = p.socket.radius;

  // Stage 3: Nearest point B_i = clamp(S_i, AABB_i) on the displaced popover border
  const bx = clamp(S.x, xMin, xMax);
  const by = clamp(S.y, yMin, yMax);
  const B: Point2D = { x: bx, y: by };

  // Unit direction vector d_hat_i = (S_i - B_i) / ||S_i - B_i||
  const vx = S.x - B.x;
  const vy = S.y - B.y;
  const vLen = Math.hypot(vx, vy);
  const dxHat = vLen > 1e-4 ? vx / vLen : (S.x - p.cx) / (Math.hypot(S.x - p.cx, S.y - p.cy) || 1);
  const dyHat = vLen > 1e-4 ? vy / vLen : (S.y - p.cy) / (Math.hypot(S.x - p.cx, S.y - p.cy) || 1);
  const losAngleRad = Math.atan2(dyHat, dxHat);
  const losAngleDeg = (losAngleRad * 180) / Math.PI;

  // Lock pointer apex onto the target skill's outer golden rim at T_i = S_i - (R_i + 3px) * d_hat_i
  const T: Point2D = {
   x: S.x - (R + rimOffset) * dxHat,
   y: S.y - (R + rimOffset) * dyHat,
  };

  // Stage 4: Distance from B_i to the four corners of AABB_i
  const corners: Array<{ name: BoundaryLocation; x: number; y: number; sx: number; sy: number }> = [
   { name: 'bottom-right', x: xMax, y: yMax, sx: -1, sy: -1 },
   { name: 'bottom-left', x: xMin, y: yMax, sx: 1, sy: -1 },
   { name: 'top-right', x: xMax, y: yMin, sx: -1, sy: 1 },
   { name: 'top-left', x: xMin, y: yMin, sx: 1, sy: 1 },
  ];
  let nearestCorner = corners[0];
  let minCornerDist = Infinity;
  for (const c of corners) {
   const d = Math.hypot(B.x - c.x, B.y - c.y);
   if (d < minCornerDist) {
    minCornerDist = d;
    nearestCorner = c;
   }
  }

  let tailMode: TailMode;
  let edgeOrCorner: BoundaryLocation;
  let basePoint1: Point2D;
  let basePoint2: Point2D;

  if (minCornerDist <= cornerThreshold) {
   // Oblique Corner-Chamfer Mode (14px chamfer along both adjacent edges meeting at the corner)
   tailMode = 'oblique-corner-chamfer';
   edgeOrCorner = nearestCorner.name;
   basePoint1 = {
    x: nearestCorner.x + nearestCorner.sx * chamferPx,
    y: nearestCorner.y,
   };
   basePoint2 = {
    x: nearestCorner.x,
    y: nearestCorner.y + nearestCorner.sy * chamferPx,
   };
  } else {
   // Cardinal Edge-Slide Mode (16px wide triangle base sliding along the straight edge)
   tailMode = 'cardinal-edge';
   const distBottom = Math.abs(B.y - yMax);
   const distTop = Math.abs(B.y - yMin);
   const distRight = Math.abs(B.x - xMax);
   const distLeft = Math.abs(B.x - xMin);
   const minEdgeDist = Math.min(distBottom, distTop, distRight, distLeft);
   const halfBase = cardinalBasePx / 2;
   const edgePad = cornerThreshold + halfBase;

   if (minEdgeDist === distBottom) {
    edgeOrCorner = 'bottom';
    const cxSlide = clamp(B.x, xMin + edgePad, xMax - edgePad);
    basePoint1 = { x: cxSlide - halfBase, y: yMax };
    basePoint2 = { x: cxSlide + halfBase, y: yMax };
   } else if (minEdgeDist === distTop) {
    edgeOrCorner = 'top';
    const cxSlide = clamp(B.x, xMin + edgePad, xMax - edgePad);
    basePoint1 = { x: cxSlide - halfBase, y: yMin };
    basePoint2 = { x: cxSlide + halfBase, y: yMin };
   } else if (minEdgeDist === distRight) {
    edgeOrCorner = 'right';
    const cySlide = clamp(B.y, yMin + edgePad, yMax - edgePad);
    basePoint1 = { x: xMax, y: cySlide - halfBase };
    basePoint2 = { x: xMax, y: cySlide + halfBase };
   } else {
    edgeOrCorner = 'left';
    const cySlide = clamp(B.y, yMin + edgePad, yMax - edgePad);
    basePoint1 = { x: xMin, y: cySlide - halfBase };
    basePoint2 = { x: xMin, y: cySlide + halfBase };
   }
  }

  return {
   id: p.input.id,
   optionNumber: p.input.optionNumber,
   socketIndex: p.socket.index,
   width: p.w,
   height: p.h,
   polarAngleRad: p.polarAngleRad,
   polarAngleDeg: (p.polarAngleRad * 180) / Math.PI,
   outwardNormal: p.outwardNormal,
   initialCenter: p.initialCenter,
   center: { x: p.cx, y: p.cy },
   rect: {
    xMin,
    yMin,
    xMax,
    yMax,
    width: p.w,
    height: p.h,
   },
   socketCenter: S,
   socketRadius: R,
   nearestBorderPoint: B,
   losUnitVector: { x: dxHat, y: dyHat },
   losAngleRad,
   losAngleDeg,
   rimApex: T,
   tailMode,
   edgeOrCorner,
   cornerDistancePx: minCornerDist,
   chamferPx,
   baseWidthPx: cardinalBasePx,
   basePoint1,
   basePoint2,
   pointerPolygon: [basePoint1, T, basePoint2],
   rimLockNode: {
    x: T.x,
    y: T.y,
    radiusPx: lockNodeRadius,
    angleRad: losAngleRad,
   },
  };
 });

 // Return in optionNumber order (e.g. 2, 3) for deterministic rendering
 return results.sort((a, b) => a.optionNumber - b.optionNumber);
}
