// Real-time 60 FPS 3D character renderer for Stronghold (ENABLED BY DEFAULT for both Rift Runner & Ember Warden;
// pass ?3d=0 to fall back to legacy 2D spritesheets).
// Features:
// 1. Hand-Painted 2D Sprite Shader: 3-band stepped painterly cel shading + internal crease ink + crisp dark-fantasy
//    outer silhouette ink outline (#140d0a) so the 3D model blends seamlessly with hand-painted 2D sprites.
// 2. Automatic idle_cast & run_cast: triggers automatically on any auto-cast, skill cast, or attack, choosing
//    run_cast when moving and idle_cast when standing still.
// 3. Foot-Anchored Realistic Ground Shadow: dynamically grounds the 3D foot bones to the foot pivot and projects
//    directional sun shadows starting at ht=0 directly from each boot's contact pixels (zero foot-shadow gap).

import type { Sun } from './daylight';

const dynImport = new Function('u', 'return import(u)') as (url: string) => Promise<any>;

const STORAGE_KEY = 'arkadia.3d.enabled';
let enabledCache: boolean | null = null;

// Capture URL query immediately on module evaluation before any room/hero history.replaceState runs.
if (typeof location !== 'undefined') {
  const q = new URLSearchParams(location.search).get('3d');
  if (q === '0' || q === 'false') {
    enabledCache = false;
    try {
      sessionStorage.setItem(STORAGE_KEY, '0');
    } catch {}
  } else if (q === '1' || q === 'true') {
    enabledCache = true;
    try {
      sessionStorage.setItem(STORAGE_KEY, '1');
    } catch {}
  }
}

export function is3dHeroEnabled(): boolean {
  if (enabledCache !== null) return enabledCache;
  if (typeof location !== 'undefined') {
    const q = new URLSearchParams(location.search).get('3d');
    if (q === '0' || q === 'false') {
      enabledCache = false;
      return false;
    }
    if (q === '1' || q === 'true') {
      enabledCache = true;
      return true;
    }
  }
  try {
    if (sessionStorage.getItem(STORAGE_KEY) === '0') {
      enabledCache = false;
      return false;
    }
  } catch {}
  enabledCache = true;
  return true;
}

let globalCastHoldUntil = 0;

/**
 * Notify the 3D hero renderer that the hero just cast a spell / auto-cast / attack.
 * Automatically triggers `run_cast` if moving, or `idle_cast` if standing still.
 */
export function notifyHeroCast(durationMs = 950): void {
  const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
  globalCastHoldUntil = Math.max(globalCastHoldUntil, now + durationMs);
  if (typeof window !== 'undefined') {
    (window as any).__HERO_CAST_UNTIL__ = globalCastHoldUntil;
  }
}

if (typeof window !== 'undefined') {
  (window as any).__notifyHeroCast = notifyHeroCast;
}

export type ShaderStyle3D = 'stylized' | 'pbr' | 'wireframe' | '2d';

interface HeroModelEntry {
  id: string;
  ready: boolean;
  heroRoot: any;
  rawModel: any;
  baseOffsetX: number;
  baseOffsetY: number;
  baseOffsetZ: number;
  footBones: any[];
  mixer: any;
  actions: Map<string, any>;
  originalMaterials: Map<string, any>;
  activeClip: string;
  activeAction: any;
}

export interface ShadowDrawResult {
  canvas: HTMLCanvasElement;
  ox: number;
  oy: number;
  sw: number;
  sh: number;
}

/**
 * Sanitizes raw 3D hero readback pixels (`w x h x 4` RGBA) against mobile TBDR GPU tile artifacts:
 * 1. Flood-erases any opaque background garbage connected to the outer 2px canvas perimeter
 *    (e.g. when a mobile tile renderer skips resolving empty outer tiles, leaving recycled VRAM
 *    around a transparent moat of resolved hero tiles).
 * 2. Retains only the contiguous 8-connected hero silhouette seeded from the central spine box.
 */
export function sanitizeHeroWorkPixels(
  pixels: Uint8ClampedArray | Uint8Array,
  w: number,
  h: number,
  bfsQueue?: Int32Array,
  visited?: Uint8Array
): void {
  const total = w * h;
  const q = bfsQueue && bfsQueue.length >= total ? bfsQueue : new Int32Array(total);
  const seen = visited && visited.length >= total ? visited : new Uint8Array(total);

  const coreX0 = Math.floor(w * 0.36);
  const coreX1 = Math.ceil(w * 0.64);
  const coreY0 = Math.floor(h * 0.24);
  const coreY1 = Math.ceil(h * 0.95);

  // Step 1: Check left, right, and top 1px borders (never bottom center where boots touch y = h-1).
  // Only flood-erase when outer GPU tiles contain unresolved VRAM garbage (opaque corners or widespread
  // perimeter tile fill), and never flood-erase into the central hero spine box so a raised casting hand
  // or staff brushing the top border can never erase the hero!
  let qHead = 0;
  let qTail = 0;
  seen.fill(0);

  for (let x = 0; x < w; x++) {
    if (pixels[x * 4 + 3] > 12) {
      seen[x] = 1;
      q[qTail++] = x;
    }
  }
  for (let y = 1; y < h; y++) {
    const leftIdx = y * w;
    const rightIdx = y * w + (w - 1);
    if (pixels[leftIdx * 4 + 3] > 12) {
      seen[leftIdx] = 1;
      q[qTail++] = leftIdx;
    }
    if (pixels[rightIdx * 4 + 3] > 12) {
      seen[rightIdx] = 1;
      q[qTail++] = rightIdx;
    }
  }

  const cornerOpaque = pixels[3] > 12 || pixels[(w - 1) * 4 + 3] > 12;
  if (cornerOpaque || qTail > 96) {
    while (qHead < qTail) {
      const idx = q[qHead++];
      const p = idx * 4;
      pixels[p] = 0;
      pixels[p + 1] = 0;
      pixels[p + 2] = 0;
      pixels[p + 3] = 0;

      const x = idx % w;
      const y = (idx - x) / w;
      const y0 = y > 0 ? y - 1 : 0;
      const y1 = y + 1 < h ? y + 1 : h - 1;
      const x0 = x > 0 ? x - 1 : 0;
      const x1 = x + 1 < w ? x + 1 : w - 1;

      for (let ny = y0; ny <= y1; ny++) {
        const nRow = ny * w;
        for (let nx = x0; nx <= x1; nx++) {
          if (nx >= coreX0 && nx <= coreX1 && ny >= coreY0 && ny <= coreY1) continue;
          const nIdx = nRow + nx;
          if (seen[nIdx] === 0 && pixels[nIdx * 4 + 3] > 12) {
            seen[nIdx] = 1;
            q[qTail++] = nIdx;
          }
        }
      }
    }
  } else {
    // Clear only the 1px outer top/left/right border pixels without flood-erasing the connected hero
    for (let i = 0; i < qTail; i++) {
      const p = q[i] * 4;
      pixels[p] = 0;
      pixels[p + 1] = 0;
      pixels[p + 2] = 0;
      pixels[p + 3] = 0;
    }
  }

  // Step 2: Retain only the hero's connected component seeded from the central hero spine
  qHead = 0;
  qTail = 0;
  seen.fill(0);

  for (let y = coreY0; y <= coreY1; y++) {
    const row = y * w;
    for (let x = coreX0; x <= coreX1; x++) {
      const idx = row + x;
      if (pixels[idx * 4 + 3] > 16) {
        seen[idx] = 1;
        q[qTail++] = idx;
      }
    }
  }

  if (qTail > 0) {
    while (qHead < qTail) {
      const idx = q[qHead++];
      const x = idx % w;
      const y = (idx - x) / w;
      const y0 = y > 1 ? y - 2 : 0;
      const y1 = y + 2 < h ? y + 2 : h - 1;
      const x0 = x > 1 ? x - 2 : 0;
      const x1 = x + 2 < w ? x + 2 : w - 1;

      for (let ny = y0; ny <= y1; ny++) {
        const nRow = ny * w;
        for (let nx = x0; nx <= x1; nx++) {
          const nIdx = nRow + nx;
          if (seen[nIdx] === 0 && pixels[nIdx * 4 + 3] > 16) {
            seen[nIdx] = 1;
            q[qTail++] = nIdx;
          }
        }
      }
    }

    for (let idx = 0; idx < total; idx++) {
      if (seen[idx] === 0 && pixels[idx * 4 + 3] > 0) {
        const p = idx * 4;
        pixels[p] = 0;
        pixels[p + 1] = 0;
        pixels[p + 2] = 0;
        pixels[p + 3] = 0;
      }
    }
  }
}

interface ThreeHeroInstance {
  canvas: HTMLCanvasElement;
  shadowCanvas: HTMLCanvasElement;
  style: ShaderStyle3D;
  isHeroReady(heroId: string): boolean;
  updateAndRender(opts: {
    heroId: string;
    clip: string;
    moving: boolean;
    yaw: number;
    dt: number;
    tint: string;
    night: number;
    sun?: Sun;
    cell?: { w: number; h: number; pivot: { x: number; y: number } };
  }): { sprite: HTMLCanvasElement; shadow: ShadowDrawResult | null; activeClip: string } | null;
}

let sharedInstance: ThreeHeroInstance | null = null;

export function get3dHeroRenderer(): ThreeHeroInstance {
  if (sharedInstance) return sharedInstance;

  // Render at 2x cell resolution (228x206 for 114x103 cell) so the hand-painted ink outline and tonal
  // stepping match the crisp pixel density of the 2D isometric sprites while staying <0.3ms per frame.
  const CELL_W = 114;
  const CELL_H = 103;
  const SCALE = 2;
  const W = CELL_W * SCALE; // 228
  const H = CELL_H * SCALE; // 206

  const glCanvas = document.createElement('canvas');
  glCanvas.width = W;
  glCanvas.height = H;

  const outCanvas = document.createElement('canvas');
  outCanvas.width = W;
  outCanvas.height = H;
  const outCtx = outCanvas.getContext('2d', { willReadFrequently: true })!;
  const outImgData = outCtx.createImageData(W, H);
  const outPixels = outImgData.data;
  const outU32 = new Uint32Array(outImgData.data.buffer);

  const workImgData = outCtx.createImageData(W, H);
  const workPixels = workImgData.data;
  const rawGlPixels = new Uint8Array(W * H * 4);
  const bfsQueue = new Int32Array(W * H);
  const visitedMask = new Uint8Array(W * H);

  // Buffers for 114x103 foot-anchored ground shadow projection
  const cellAlpha = new Uint8Array(CELL_W * CELL_H);
  const botCol = new Int16Array(CELL_W);
  const baseCol = new Float32Array(CELL_W);

  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = 260;
  shadowCanvas.height = 220;
  const shadowCtx = shadowCanvas.getContext('2d')!;
  let shadowImgData = shadowCtx.createImageData(shadowCanvas.width, shadowCanvas.height);
  let shadowU32 = new Uint32Array(shadowImgData.data.buffer);
  let shadowDensity = new Uint8Array(shadowCanvas.width * shadowCanvas.height);

  const style = 'stylized' as ShaderStyle3D;
  let THREE: any = null;
  let renderer: any = null;
  let scene: any = null;
  let orthoCam: any = null;
  let sunLight: any = null;
  let ambientLight: any = null;
  let rimLight: any = null;

  const heroEntries = new Map<string, HeroModelEntry>();
  let currentYaw = Math.PI * 0.25;

    if (typeof window !== 'undefined') {
      window.addEventListener(
        'keydown',
        (e) => {
          const k = (e.key || '').toLowerCase();
          const c = e.code || '';
          if (k === ' ' || c === 'Space' || k === 'e' || k === '1' || k === '2' || k === '3') {
            notifyHeroCast(1400);
          }
        },
        { capture: true }
      );
    }

  if (typeof document !== 'undefined') {
    document.getElementById('arkadia-3d-hud-pill')?.remove();
  }

  /**
   * Customizes MeshStandardMaterial with a GLSL Hand-Painted 2D Sprite shader:
   * - Boosts pigment saturation & contrast to match 2D turnaround art
   * - Replaces smooth PBR falloff with a 3-band painterly cel ramp (warm umber shadow, rich midtone, golden highlight)
   * - Adds vertical ground-bounce gradient and subtle hero-colored rim highlight
   */
  function applyHandPaintedShaderToEntry(entry: HeroModelEntry) {
    if (!entry.rawModel || !THREE) return;
    const isEmber = entry.id === 'ember-warden';
    entry.rawModel.traverse((obj: any) => {
      if (!obj.isMesh) return;
      const orig = entry.originalMaterials.get(obj.uuid);
      if (!orig) return;
      const m = orig.clone();
      m.wireframe = false;
      m.roughness = 0.88;
      m.metalness = 0.05;
      m.emissive = new THREE.Color(isEmber ? 0x1c0b04 : 0x09131e);
      m.emissiveIntensity = 0.22;

      m.onBeforeCompile = (shader: any) => {
        shader.uniforms.uRimColor = {
          value: new THREE.Color(isEmber ? 0xffb347 : 0x7dd3fc)
        };
        shader.fragmentShader =
          `uniform vec3 uRimColor;\n` +
          shader.fragmentShader.replace(
            '#include <dithering_fragment>',
            `
            // Hand-painted 2D sprite color grading & stepped cel ramp
            vec3 baseCol = gl_FragColor.rgb;
            float luma = dot(baseCol, vec3(0.299, 0.587, 0.114));
            // Boost pigment saturation so 3D bake matches rich 2D sprite palette
            vec3 satCol = mix(vec3(luma), baseCol, 1.32);

            // Compute view-space painterly normal lighting
            vec3 nView = normalize(vNormal);
            vec3 lightDir = normalize(vec3(0.45, 0.78, 0.42));
            float ndl = dot(nView, lightDir) * 0.5 + 0.5;

            // 3-band stepped hand-painted ramp with soft brush transitions
            float shadowBand = smoothstep(0.30, 0.40, ndl);
            float highBand   = smoothstep(0.68, 0.77, ndl);

            vec3 shadowTint = vec3(0.50, 0.40, 0.46); // Deep warm dark-fantasy umber-violet shadow
            vec3 midTint    = vec3(1.02, 0.98, 0.93); // Rich warm midtone
            vec3 highTint   = vec3(1.26, 1.18, 1.03); // Warm parchment highlight

            vec3 rampTint = mix(shadowTint, midTint, shadowBand);
            rampTint = mix(rampTint, highTint, highBand);

            vec3 painted = satCol * rampTint;

            // Subtle upper-edge rim highlight
            float rim = pow(clamp(1.0 - abs(nView.z), 0.0, 1.0), 3.2) * smoothstep(-0.1, 0.45, nView.y);
            painted += uRimColor * (rim * 0.16);

            // Smooth 24-step brush-painted tonal grading (avoids low-poly posterization on face & coat)
            float pLuma = max(0.001, dot(painted, vec3(0.299, 0.587, 0.114)));
            float qLuma = floor(pLuma * 24.0 + 0.5) / 24.0;
            painted *= mix(1.0, qLuma / pLuma, 0.12);

            gl_FragColor.rgb = clamp(painted, 0.0, 1.0);
            #include <dithering_fragment>
            `
          );
      };
      m.needsUpdate = true;
      obj.material = m;
    });
  }

  /**
   * Post-processes the rendered 228x206 3D image into a crisp Hand-Painted 2D Sprite:
   * 1. Adds a warm dark-ink silhouette outline (#140d0a, 1.5px) around the outer boundary
   * 2. Adds subtle internal dark-ink crease lines on armor/cloak edges
   * 3. Downsamples alpha to 114x103 `cellAlpha` for exact foot-anchored shadow generation
   */
  function applyHandPaintedSpritePass(
    srcCanvas: HTMLCanvasElement,
    tint: string,
    night: number
  ): void {
    const gl = renderer?.getContext?.() as WebGLRenderingContext | null;
    let readDirect = false;
    if (gl) {
      try {
        gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, rawGlPixels);
        const rowBytes = W * 4;
        for (let y = 0; y < H; y++) {
          const srcOff = (H - 1 - y) * rowBytes;
          const dstOff = y * rowBytes;
          workPixels.set(rawGlPixels.subarray(srcOff, srcOff + rowBytes), dstOff);
        }
        readDirect = true;
      } catch {}
    }
    if (!readDirect) {
      outCtx.globalCompositeOperation = 'copy';
      outCtx.drawImage(srcCanvas, 0, 0);
      const srcData = outCtx.getImageData(0, 0, W, H).data;
      workPixels.set(srcData);
    }

    // Sanitize against mobile TBDR empty-tile VRAM artifacts & stray background islands
    sanitizeHeroWorkPixels(workPixels, W, H, bfsQueue, visitedMask);

    let tintR = 1;
    let tintG = 1;
    let tintB = 1;
    if (tint && tint !== '255,255,255') {
      const parts = tint.split(',').map(Number);
      if (parts.length === 3) {
        tintR = Math.min(1, (parts[0] / 255) * 1.08);
        tintG = Math.min(1, (parts[1] / 255) * 1.08);
        tintB = Math.min(1, (parts[2] / 255) * 1.08);
      }
    } else if (night > 0.05) {
      tintR = 1 - night * 0.12;
      tintG = 1 - night * 0.10;
      tintB = 1 - night * 0.04;
    }

    // Warm dark-fantasy ink color (#140d0a)
    const INK_R = 20;
    const INK_G = 13;
    const INK_B = 10;

    outU32.fill(0);

    for (let y = 1; y < H - 1; y++) {
      const row = y * W;
      // Vertical foot-to-head gradient (slightly darker near boots y > 165, brighter at chest/head)
      const vGrad = y > 155 ? Math.max(0.76, 1 - (y - 155) * 0.0055) : 1.03;
      const mulR = tintR * vGrad;
      const mulG = tintG * vGrad;
      const mulB = tintB * vGrad;

      for (let x = 1; x < W - 1; x++) {
        const idx = row + x;
        const p = idx * 4;
        const a = workPixels[p + 3];

        if (a > 28) {
          let r = workPixels[p];
          let g = workPixels[p + 1];
          let b = workPixels[p + 2];

          // Check 4-connected neighbors for silhouette boundary or internal crease
          const aL = workPixels[p - 4 + 3];
          const aR = workPixels[p + 4 + 3];
          const aU = workPixels[p - W * 4 + 3];
          const aD = workPixels[p + W * 4 + 3];
          const minNeighborA = Math.min(aL, aR, aU, aD);

          if (minNeighborA < 80) {
            // Inner edge of silhouette: blend strongly toward dark ink for crisp 2D linework
            const inkMix = Math.min(0.82, ((80 - minNeighborA) / 80) * 0.78);
            r = r * (1 - inkMix) + INK_R * inkMix;
            g = g * (1 - inkMix) + INK_G * inkMix;
            b = b * (1 - inkMix) + INK_B * inkMix;
          } else if (y > 68) {
            // Subtle internal crease line detection below face/collar (avoids dark ink speckles on face/eyes)
            const lumC = r * 0.3 + g * 0.59 + b * 0.11;
            const lumR = workPixels[p + 4] * 0.3 + workPixels[p + 5] * 0.59 + workPixels[p + 6] * 0.11;
            const lumD =
              workPixels[p + W * 4] * 0.3 +
              workPixels[p + W * 4 + 1] * 0.59 +
              workPixels[p + W * 4 + 2] * 0.11;
            const diff = Math.max(Math.abs(lumC - lumR), Math.abs(lumC - lumD));
            if (diff > 56) {
              const crease = Math.min(0.22, (diff - 56) * 0.0045);
              r = r * (1 - crease) + INK_R * crease;
              g = g * (1 - crease) + INK_G * crease;
              b = b * (1 - crease) + INK_B * crease;
            }
          }

          outPixels[p] = Math.min(255, Math.round(r * mulR));
          outPixels[p + 1] = Math.min(255, Math.round(g * mulG));
          outPixels[p + 2] = Math.min(255, Math.round(b * mulB));
          outPixels[p + 3] = Math.min(255, Math.round(a * 1.15));
        } else {
          // Transparent pixel: check 8-neighborhood for outer dark-ink silhouette outline
          const aL = workPixels[p - 4 + 3];
          const aR = workPixels[p + 4 + 3];
          const aU = workPixels[p - W * 4 + 3];
          const aD = workPixels[p + W * 4 + 3];
          const max4 = Math.max(aL, aR, aU, aD);
          if (max4 > 42) {
            const outlineAlpha = Math.min(235, Math.round(max4 * 0.92));
            outPixels[p] = INK_R;
            outPixels[p + 1] = INK_G;
            outPixels[p + 2] = INK_B;
            outPixels[p + 3] = outlineAlpha;
          } else {
            const aUL = workPixels[p - W * 4 - 4 + 3];
            const aUR = workPixels[p - W * 4 + 4 + 3];
            const aDL = workPixels[p + W * 4 - 4 + 3];
            const aDR = workPixels[p + W * 4 + 4 + 3];
            const maxDiag = Math.max(aUL, aUR, aDL, aDR);
            if (maxDiag > 90) {
              outPixels[p] = INK_R;
              outPixels[p + 1] = INK_G;
              outPixels[p + 2] = INK_B;
              outPixels[p + 3] = Math.min(150, Math.round(maxDiag * 0.52));
            }
          }
        }
      }
    }

    outCtx.putImageData(outImgData, 0, 0);

    // Downsample alpha to 114x103 `cellAlpha` for exact foot-contact shadow projection
    for (let cy = 0; cy < CELL_H; cy++) {
      const sy0 = cy * SCALE * W;
      const sy1 = (cy * SCALE + 1) * W;
      const cRow = cy * CELL_W;
      for (let cx = 0; cx < CELL_W; cx++) {
        const sx = cx * SCALE;
        const a0 = workPixels[(sy0 + sx) * 4 + 3];
        const a1 = workPixels[(sy0 + sx + 1) * 4 + 3];
        const a2 = workPixels[(sy1 + sx) * 4 + 3];
        const a3 = workPixels[(sy1 + sx + 1) * 4 + 3];
        cellAlpha[cRow + cx] = Math.max(a0, a1, a2, a3);
      }
    }
  }

  /**
   * Renders a realistic ground shadow whose root is mathematically anchored at the exact
   * bottom pixels of BOTH of the character's boots (`ht = 0` at `y = footY[x]`), eliminating
   * any gap between either boot and its shadow while projecting smoothly along the sun vector.
   */
  function renderFootAnchoredShadow(
    s: Sun,
    cell: { w: number; h: number; pivot: { x: number; y: number } }
  ): ShadowDrawResult | null {
    const cw = CELL_W;
    const ch = CELL_H;
    const pivot = cell.pivot;

    // Even at night (s.alpha === 0), cast a subtle moonlight/torch ground shadow so the hero is grounded
    const hasSun = Boolean(s && s.alpha > 0.02);
    const sdx = hasSun ? s.dx * 0.58 : 0.28;
    const sdy = hasSun ? s.dy * 0.58 : 0.22;

    botCol.fill(-1);
    let maxAllB = -1;

    for (let x = 0; x < cw; x++) {
      for (let y = ch - 1; y >= 0; y--) {
        if (cellAlpha[y * cw + x] > 42) {
          botCol[x] = y;
          if (y > maxAllB) maxAllB = y;
          break;
        }
      }
    }

    if (maxAllB < 0) return null;

    // Identify ONLY the grounded boot soles (within 4px of the lowest point and within the central foot stance)
    // so flying capes, coat tails, and lifted legs project onto the ground plane rather than anchoring in mid-air!
    const footSoleThreshold = maxAllB - 4;
    const stanceHalfWidth = 18;
    const soleCols: [number, number][] = [];
    let sumSoleX = 0;
    let sumSoleY = 0;

    for (let x = 0; x < cw; x++) {
      if (Math.abs(x - pivot.x) <= stanceHalfWidth && botCol[x] >= footSoleThreshold) {
        soleCols.push([x, botCol[x]]);
        sumSoleX += x;
        sumSoleY += botCol[x];
      }
    }

    if (soleCols.length === 0) {
      for (let x = 0; x < cw; x++) {
        if (botCol[x] >= footSoleThreshold) {
          soleCols.push([x, botCol[x]]);
          sumSoleX += x;
          sumSoleY += botCol[x];
        }
      }
    }

    const footCenterX = soleCols.length > 0 ? sumSoleX / soleCols.length : pivot.x;
    const groundY = soleCols.length > 0 ? sumSoleY / soleCols.length : maxAllB;

    // Smooth ground contact height across the stance between left and right boots, clamped to groundY outside boots
    baseCol.fill(groundY);
    if (soleCols.length >= 2) {
      const firstX = soleCols[0][0];
      const firstY = soleCols[0][1];
      const lastX = soleCols[soleCols.length - 1][0];
      const lastY = soleCols[soleCols.length - 1][1];
      for (let x = 0; x <= firstX; x++) baseCol[x] = firstY;
      for (let i = 0; i < soleCols.length - 1; i++) {
        const [x0, y0] = soleCols[i];
        const [x1, y1] = soleCols[i + 1];
        for (let x = x0; x <= x1; x++) {
          baseCol[x] = y0 + ((y1 - y0) * (x - x0)) / (x1 - x0 || 1);
        }
      }
      for (let x = lastX; x < cw; x++) baseCol[x] = lastY;
    }

    const pad = 16;
    const reachH = ch + 16;
    const ox = Math.ceil(cw * 0.65 + (sdx < 0 ? reachH * -sdx : 0) + pad);
    const oy = Math.ceil(cw * 0.5 + (sdy < 0 ? reachH * -sdy : 0) + pad);
    const sw = Math.ceil(ox + cw * 0.65 + (sdx > 0 ? reachH * sdx : 0) + pad);
    const sh = Math.ceil(oy + cw * 0.5 + (sdy > 0 ? reachH * sdy : 0) + pad);

    if (shadowCanvas.width < sw || shadowCanvas.height < sh) {
      shadowCanvas.width = Math.max(shadowCanvas.width, sw);
      shadowCanvas.height = Math.max(shadowCanvas.height, sh);
      shadowImgData = shadowCtx.createImageData(shadowCanvas.width, shadowCanvas.height);
      shadowU32 = new Uint32Array(shadowImgData.data.buffer);
      shadowDensity = new Uint8Array(shadowCanvas.width * shadowCanvas.height);
    }

    const stride = shadowCanvas.width;
    for (let y = 0; y < sh; y++) {
      const rowOff = y * stride;
      shadowU32.fill(0, rowOff, rowOff + sw);
      shadowDensity.fill(0, rowOff, rowOff + sw);
    }

    // 1. Project every opaque character pixel onto the ground plane starting from the grounded boot soles:
    //    - On a grounded boot (y === baseCol[x]), ht === 0 -> shadow pixel is at (x - pivot.x, baseCol[x] - pivot.y),
    //      touching the exact boot pixels with 0px gap!
    //    - For upper body / cape / coat tails (ht > 0), horizontal spread (x - footCenterX) is softly tapered
    //      near the legs and fans out on the ground along (ht * sdx, ht * sdy).
    for (let y = 0; y < ch; y++) {
      const row = y * cw;
      for (let x = 0; x < cw; x++) {
        if (cellAlpha[row + x] <= 42) continue;

        const gY = baseCol[x];
        const ht = Math.max(0, gY - y);

        const isGroundedBoot =
          Math.abs(x - pivot.x) <= stanceHalfWidth && botCol[x] >= footSoleThreshold && ht <= 6;
        const spreadScale = isGroundedBoot
          ? 1.0
          : Math.min(0.82, 0.35 + (ht / 52) * 0.47);
        const relX = isGroundedBoot
          ? x - pivot.x
          : footCenterX - pivot.x + (x - footCenterX) * spreadScale;

        const sx = Math.round(relX + ht * sdx) + ox;
        const sy = Math.round(gY - pivot.y + ht * sdy) + oy;

        // Darkest right at the boot contact (ht=0), softly attenuating toward the head/cape tip
        const atten = Math.max(0.28, 1 - (ht / 85) * 0.68);
        const dens = Math.min(240, Math.round(240 * atten));

        if (sx >= 0 && sx + 1 < sw && sy >= 0 && sy + 1 < sh) {
          const idx = sy * stride + sx;
          if (dens > shadowDensity[idx]) shadowDensity[idx] = dens;
          if (dens > shadowDensity[idx + 1]) shadowDensity[idx + 1] = dens;
          if (dens > shadowDensity[idx + stride]) shadowDensity[idx + stride] = dens;
          if (dens > shadowDensity[idx + stride + 1]) shadowDensity[idx + stride + 1] = dens;
        }
      }
    }

    // 2. Tight contact ambient-occlusion ellipse directly under ONLY the grounded boot soles
    for (const [fx, fy] of soleCols) {
      const cx = fx - pivot.x + ox;
      const cy = fy - pivot.y + oy;
      for (let dy = -2; dy <= 2; dy++) {
        const py = cy + dy;
        if (py < 0 || py >= sh) continue;
        for (let dx = -4; dx <= 4; dx++) {
          const px = cx + dx;
          if (px < 0 || px >= sw) continue;
          const d2 = (dx * dx) / 16 + (dy * dy) / 4;
          if (d2 <= 1) {
            const ao = Math.round(255 * (1 - d2 * 0.45));
            const idx = py * stride + px;
            if (ao > shadowDensity[idx]) shadowDensity[idx] = ao;
          }
        }
      }
    }

    // 3. Soft 3x3 feathering into warm dark-fantasy ground shadow (#141c24)
    for (let y = 1; y < sh - 1; y++) {
      const row = y * stride;
      for (let x = 1; x < sw - 1; x++) {
        const idx = row + x;
        const c0 = shadowDensity[idx];
        const sum =
          c0 * 4 +
          shadowDensity[idx - 1] +
          shadowDensity[idx + 1] +
          shadowDensity[idx - stride] +
          shadowDensity[idx + stride];
        const blurred = sum >> 3;
        if (blurred > 14) {
          const a = Math.min(255, blurred);
          shadowU32[idx] = (a << 24) | 0x00241c14;
        }
      }
    }

    shadowCtx.putImageData(shadowImgData, 0, 0, 0, 0, sw, sh);
    return { canvas: shadowCanvas, ox, oy, sw, sh };
  }

  function loadHeroModel(loader: any, heroId: string) {
    const entry: HeroModelEntry = {
      id: heroId,
      ready: false,
      heroRoot: null,
      rawModel: null,
      baseOffsetX: 0,
      baseOffsetY: 0,
      baseOffsetZ: 0,
      footBones: [],
      mixer: null,
      actions: new Map(),
      originalMaterials: new Map(),
      activeClip: '',
      activeAction: null
    };
    heroEntries.set(heroId, entry);

    loader.load(
      `/assets/characters/3d/${heroId}.glb`,
      (gltf: any) => {
        const model = gltf.scene;
        entry.rawModel = model;
        model.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(model);
        const size = new THREE.Vector3();
        const center = new THREE.Vector3();
        box.getSize(size);
        box.getCenter(center);
        const targetHeight = heroId === 'ember-warden' ? 1.50 : 1.48;
        const scaleY = targetHeight / (size.y || 1);
        const scaleXZ = heroId === 'ember-warden' ? scaleY * 0.89 : scaleY * 0.94;
        model.scale.set(scaleXZ, scaleY, scaleXZ);
        model.updateMatrixWorld(true);
        const scaledBox = new THREE.Box3().setFromObject(model);
        entry.baseOffsetX = -center.x * scaleXZ;
        entry.baseOffsetY = -scaledBox.min.y;
        entry.baseOffsetZ = -center.z * scaleXZ;
        model.position.set(entry.baseOffsetX, entry.baseOffsetY, entry.baseOffsetZ);

        model.traverse((obj: any) => {
          if (obj.isBone && /foot|toe/i.test(obj.name)) {
            entry.footBones.push(obj);
          }
          if (obj.isMesh && obj.material) {
            entry.originalMaterials.set(obj.uuid, obj.material.clone());
          }
        });

        applyHandPaintedShaderToEntry(entry);

        const root = new THREE.Group();
        root.add(model);
        root.visible = false;
        scene.add(root);
        entry.heroRoot = root;

        const mixer = new THREE.AnimationMixer(model);
        entry.mixer = mixer;
        for (const clip of gltf.animations) {
          const act = mixer.clipAction(clip);
          if (['hit', 'death'].includes(clip.name)) {
            act.setLoop(THREE.LoopOnce, 1);
            act.clampWhenFinished = true;
          } else {
            act.setLoop(THREE.LoopRepeat, Infinity);
          }
          entry.actions.set(clip.name, act);
        }

        const idleAct = entry.actions.get('idle');
        if (idleAct) {
          idleAct.play();
          entry.activeAction = idleAct;
          entry.activeClip = 'idle';
        }
        entry.ready = true;
        (window as any).__HERO_3D_READY__ = true;
      },
      undefined,
      () => {
        // Model not available yet
      }
    );
  }

  (async () => {
    try {
      const [threeMod, gltfMod] = await Promise.all([
        dynImport('/3d-hero-lab/vendor/three.module.min.js'),
        dynImport('/3d-hero-lab/vendor/GLTFLoader.js')
      ]);
      THREE = threeMod;
      const { GLTFLoader } = gltfMod;

      renderer = new THREE.WebGLRenderer({
        canvas: glCanvas,
        antialias: false,
        alpha: true,
        premultipliedAlpha: false,
        preserveDrawingBuffer: true,
        powerPreference: 'high-performance'
      });
      renderer.setSize(W, H, false);
      renderer.setClearColor(0x000000, 0);
      renderer.autoClear = false;
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.28;

      scene = new THREE.Scene();

      // Full-viewport NDC clear quad (renderOrder = -1000, NoBlending, RGBA = 0,0,0,0):
      // Forces 100% of GPU tiles on mobile Tile-Based Deferred Renderers (Adreno/Mali) to rasterize
      // and flush transparent (0,0,0,0) instead of skipping empty outer tiles with recycled VRAM data.
      const clearQuadGeo = new THREE.PlaneGeometry(2, 2);
      const clearQuadMat = new THREE.ShaderMaterial({
        vertexShader: `void main() { gl_Position = vec4(position.xy, 0.999, 1.0); }`,
        fragmentShader: `void main() { gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0); }`,
        depthTest: false,
        depthWrite: false,
        transparent: false,
        blending: THREE.NoBlending,
        side: THREE.DoubleSide
      });
      const clearQuad = new THREE.Mesh(clearQuadGeo, clearQuadMat);
      clearQuad.frustumCulled = false;
      clearQuad.renderOrder = -1000;
      scene.add(clearQuad);

      // Exact 2:1 isometric projection aligned so y=0 (feet) lands directly on pivot (57, 101)
      const ISO_TILT = Math.atan(0.5);
      const ISO_DIST = 6.0;
      const halfH = 0.752;
      const halfW = halfH * (W / H);
      const targetY = 0.74;
      orthoCam = new THREE.OrthographicCamera(-halfW, halfW, halfH, -halfH, 0.1, 20);
      orthoCam.position.set(0, targetY + Math.sin(ISO_TILT) * ISO_DIST, Math.cos(ISO_TILT) * ISO_DIST);
      orthoCam.lookAt(0, targetY, 0);

      ambientLight = new THREE.HemisphereLight(0xfff4e0, 0x261c24, 1.65);
      scene.add(ambientLight);

      sunLight = new THREE.DirectionalLight(0xfff0cc, 2.75);
      sunLight.position.set(3.2, 5.4, 2.8);
      scene.add(sunLight);

      rimLight = new THREE.DirectionalLight(0x38bdf8, 1.45);
      rimLight.position.set(-3.0, 2.4, -2.8);
      scene.add(rimLight);

      const loader = new GLTFLoader();
      loadHeroModel(loader, 'rift-runner');
      loadHeroModel(loader, 'ember-warden');
    } catch (e) {
      console.warn('3D hero renderer load error:', e);
    }
  })();

  sharedInstance = {
    canvas: outCanvas,
    shadowCanvas,
    style,
    isHeroReady(heroId: string) {
      return Boolean(heroEntries.get(heroId)?.ready && style !== '2d');
    },
    updateAndRender({ heroId, clip, moving, yaw, dt, tint, night, sun, cell }) {
      const entry = heroEntries.get(heroId);
      if (!entry || !entry.ready || !renderer || style === '2d') return null;

      for (const [id, other] of heroEntries.entries()) {
        if (other.heroRoot) other.heroRoot.visible = id === heroId;
      }

      if (rimLight) {
        rimLight.color.setHex(heroId === 'ember-warden' ? 0xf59e0b : 0x38bdf8);
      }

      const now = performance.now();

      if (clip.startsWith('attack') || clip.startsWith('cast')) {
        notifyHeroCast(950);
      }

      const winCastUntil =
        typeof window !== 'undefined' ? Number((window as any).__HERO_CAST_UNTIL__ || 0) : 0;
      const isCasting =
        clip.startsWith('attack') ||
        clip.startsWith('cast') ||
        now < Math.max(globalCastHoldUntil, winCastUntil);

      // Map game state/pose clip + movement into 3D GLB clip ('idle', 'run', 'idle_cast', 'run_cast', 'hit', 'death')
      // Automatically selects `run_cast` whenever casting while moving, and `idle_cast` when casting while standing!
      let targetClip = 'idle';
      if (clip.startsWith('die') || clip.startsWith('death')) {
        targetClip = 'death';
      } else if (clip.startsWith('hit') || clip.startsWith('hurt')) {
        targetClip = 'hit';
      } else if (isCasting) {
        targetClip = moving || clip.startsWith('move') ? 'run_cast' : 'idle_cast';
      } else if (moving || clip.startsWith('move')) {
        targetClip = 'run';
      }

      if (targetClip !== entry.activeClip && entry.actions.has(targetClip)) {
        const next = entry.actions.get(targetClip)!;
        if (entry.activeAction && entry.activeAction !== next) {
          entry.activeAction.fadeOut(0.12);
        }
        next.reset().fadeIn(0.12).play();
        entry.activeAction = next;
        entry.activeClip = targetClip;
      }

      // Smooth 360-degree shortest-arc yaw interpolation at 60 FPS
      let diff = ((yaw - currentYaw + Math.PI) % (Math.PI * 2)) - Math.PI;
      if (diff < -Math.PI) diff += Math.PI * 2;
      currentYaw += diff * Math.min(1, dt * 16);
      entry.heroRoot.rotation.y = currentYaw;

      if (tint && tint !== '255,255,255' && sunLight) {
        const [r, g, b] = tint.split(',').map((n) => Number(n) / 255);
        sunLight.color.setRGB(Math.min(1, r * 1.15), Math.min(1, g * 1.15), Math.min(1, b * 1.15));
      } else if (sunLight) {
        sunLight.color.setHex(night > 0.3 ? 0xffcfa3 : 0xfff0cc);
      }

      entry.mixer.update(dt);

      // Dynamically ground the lowest foot/toe bone to y = 0 so the boots always touch the ground pivot
      if (entry.footBones.length > 0 && THREE) {
        entry.rawModel.position.y = entry.baseOffsetY;
        entry.heroRoot.updateMatrixWorld(true);
        const tmpPos = new THREE.Vector3();
        let minFootY = Infinity;
        for (const fb of entry.footBones) {
          fb.getWorldPosition(tmpPos);
          if (tmpPos.y < minFootY) minFootY = tmpPos.y;
        }
        if (Number.isFinite(minFootY)) {
          // Offset so the sole of the boot (slightly below ankle/toe bone center) sits right at y = 0
          entry.rawModel.position.y = entry.baseOffsetY - (minFootY - 0.035);
        }
      }

      renderer.setClearColor(0x000000, 0);
      renderer.clear(true, true, true);
      renderer.render(scene, orthoCam);

      // Apply 2D Hand-Painted Sprite Pass (dark ink outline + internal creases + cellAlpha extraction)
      applyHandPaintedSpritePass(glCanvas, tint, night);

      // Project realistic ground shadow anchored directly at the boots (ht = 0 at y = botCol[x])
      const shadow =
        sun && cell ? renderFootAnchoredShadow(sun, cell) : null;

      return { sprite: outCanvas, shadow, activeClip: entry.activeClip };
    }
  };

  return sharedInstance;
}

if (typeof window !== 'undefined' && is3dHeroEnabled()) {
  setTimeout(() => {
    get3dHeroRenderer();
  }, 0);
}

