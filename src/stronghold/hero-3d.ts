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
import {renderQuality} from '../app/render-quality';
import {measureRenderDetail} from '../app/render-diagnostics';

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
  /** Raised casting arm: shoulder → upper arm → forearm → hand, with each bone's bind-pose local rotation. */
  castArm: { bone: any; bind: any }[];
  /** 0..1 blend of the raised casting arm over the authored clip (eases in/out instead of popping). */
  castRaise: number;
  mixer: any;
  actions: Map<string, any>;
  originalMaterials: Map<string, any>;
  activeClip: string;
  activeAction: any;
}

/** Shadow drawn from `canvas` at (sx, sy, sw, sh), placed `ox`/`oy` cell px up-left of the foot pivot. */
export interface ShadowDrawResult {
  canvas: HTMLCanvasElement;
  sx: number;
  sy: number;
  ox: number;
  oy: number;
  sw: number;
  sh: number;
}

interface ThreeHeroInstance {
  canvas: HTMLCanvasElement;
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
  }): {
    sprite: HTMLCanvasElement;
    spriteW: number;
    spriteH: number;
    /** Headroom rows (sprite px) above the cell; the cell itself starts at this row. */
    spriteTop: number;
    revision: number;
    shadow: ShadowDrawResult | null;
    activeClip: string;
  } | null;
}

let sharedInstance: ThreeHeroInstance | null = null;

/** Cell px of headroom the 3D sprite carries above its 114x103 cell (room for the raised casting hand). */
export const HERO_3D_HEADROOM = 22;

export function get3dHeroRenderer(): ThreeHeroInstance {
  if (sharedInstance) return sharedInstance;

  // Use 1x cell resolution on low-spec devices and 2x on stronger devices. The same
  // hand-painted shader, headroom and foot pivot apply at either resolution.
  const CELL_W = 114;
  const CELL_H = 103;
  let SCALE = renderQuality.get().heroScale;
  (window as any).__HERO_3D_SCALE__=SCALE;
  let W = CELL_W * SCALE; // 228
  let H = CELL_H * SCALE; // 206
  // Transparent rows above the cell so a hand raised over the head while casting is not cut off. The cell maths
  // (pivot, foot shadow) still use the 114x103 cell below it.
  let TOP = HERO_3D_HEADROOM * SCALE;
  let HS = H + TOP;

  // One WebGL canvas holds both outputs that hero.ts composites: the hand-painted sprite (top W x HS) and the
  // foot-anchored ground shadow (below it, at 1x cell scale). Every pass runs on the GPU and nothing is read back,
  // so the main thread never waits for the GPU (the former readPixels + per-pixel JS passes cost ~10ms a frame
  // on mid-range phones).
  let SHADOW_W = renderQuality.get().simpleShadow?0:320; // |sun.dx| <= 1.7 and |sun.dy| <= .85 keep the projected shadow inside 304 x 208
  let SHADOW_H = renderQuality.get().simpleShadow?0:224;
  let CANVAS_W = Math.max(W, SHADOW_W);
  let CANVAS_H = HS + SHADOW_H;

  const glCanvas = document.createElement('canvas');
  glCanvas.width = CANVAS_W;
  glCanvas.height = CANVAS_H;

  let srcTex: any = null;
  let postScene: any = null;
  let postTint: any = null;
  let botRT: any = null;
  let botScene: any = null;
  let paramRT: any = null;
  let paramScene: any = null;
  let densRT: any = null;
  let scatterScene: any = null;
  let featherScene: any = null;
  let shadowU: Record<string, { value: any }> = {};
  let copyAt: any = null;

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
   * GPU port of the Hand-Painted 2D Sprite pass (same thresholds as the former per-pixel CPU loop, in 0-255 units):
   * 1. Warm dark-ink silhouette outline (#140d0a) around the outer boundary
   * 2. Subtle internal dark-ink crease lines on armor/cloak edges below the collar
   * 3. Tint / night grading and the foot-to-head vertical gradient
   * `y` below is top-down like the old ImageData loop; GL rows are bottom-up.
   */
  function createSpritePipeline() {
  const POST_FRAG = `
    uniform sampler2D tSrc;
    uniform vec2 uSize;
    uniform vec2 uOrigin;
    uniform vec3 uTint;
    const vec3 INK = vec3(20.0, 13.0, 10.0);
    const vec3 LUM = vec3(0.3, 0.59, 0.11);
    vec4 px(vec2 p) { return texelFetch(tSrc, ivec2(p), 0) * 255.0; }
    void main() {
      vec2 p = floor(gl_FragCoord.xy) - uOrigin;
      float y = uSize.y - 1.0 - p.y;
      if (p.x < 1.0 || p.x > uSize.x - 2.0 || y < 1.0 || y > uSize.y - 2.0) { gl_FragColor = vec4(0.0); return; }
      vec4 c = px(p);
      vec4 l = px(p + vec2(-1.0, 0.0));
      vec4 r = px(p + vec2(1.0, 0.0));
      vec4 u = px(p + vec2(0.0, 1.0));
      vec4 d = px(p + vec2(0.0, -1.0));
      if (c.a > 28.0) {
        vec3 rgb = c.rgb;
        float minN = min(min(l.a, r.a), min(u.a, d.a));
        if (minN < 80.0) {
          rgb = mix(rgb, INK, min(0.82, (80.0 - minN) / 80.0 * 0.78));
        } else if (y > ${34*SCALE + TOP}.0) {
          float lumC = dot(c.rgb, LUM);
          float diff = max(abs(lumC - dot(r.rgb, LUM)), abs(lumC - dot(d.rgb, LUM)));
          if (diff > 56.0) rgb = mix(rgb, INK, min(0.22, (diff - 56.0) * 0.0045));
        }
        float vGrad = y > ${77.5*SCALE + TOP} ? max(0.76, 1.0 - (y - ${77.5*SCALE + TOP}) * ${.011/SCALE}) : 1.03;
        gl_FragColor = vec4(min(vec3(255.0), rgb * uTint * vGrad), min(255.0, c.a * 1.15)) / 255.0;
        return;
      }
      float max4 = max(max(l.a, r.a), max(u.a, d.a));
      if (max4 > 42.0) { gl_FragColor = vec4(INK, min(235.0, floor(max4 * 0.92 + 0.5))) / 255.0; return; }
      float maxDiag = max(
        max(px(p + vec2(-1.0, 1.0)).a, px(p + vec2(1.0, 1.0)).a),
        max(px(p + vec2(-1.0, -1.0)).a, px(p + vec2(1.0, -1.0)).a)
      );
      gl_FragColor = maxDiag > 90.0 ? vec4(INK, min(150.0, floor(maxDiag * 0.52 + 0.5))) / 255.0 : vec4(0.0);
    }`;

  /*
   * Foot-anchored ground shadow, a GPU port of the former CPU projection (cell px, top-down y):
   *  - cellA(x, y): 2x2 max alpha of the raw 3D pass (the 114x103 cell mask)
   *  - BOT pass   (114x1): lowest opaque row per column (botCol)
   *  - PARAM pass (114x2): row 0 = per-column ground line baseCol / botCol / sole flag,
   *                        row 1 = foot centre x and lowest opaque row (maxAllB) in every texel
   *  - SCATTER    : one point per opaque cell pixel, projected from its column's ground line along the sun and
   *                 tapered toward the feet, plus a contact ellipse under every grounded sole (MAX blend density)
   *  - FEATHER    : 3x3 soften into the warm dark ground shadow colour, written below the sprite in glCanvas
   * Fractions travel through RGBA8 as (floor / 255, fract).
   */
  const SHADOW_COMMON = `
    uniform sampler2D tSrc;
    const int CELL_W = ${CELL_W};
    const int CELL_H = ${CELL_H};
    const int SRC_H = ${H};
    float cellA(int x, int y) {
      int sx = 2 * x;
      int sy = SRC_H - 1 - 2 * y;
      return max(
        max(texelFetch(tSrc, ivec2(sx, sy), 0).a, texelFetch(tSrc, ivec2(sx + 1, sy), 0).a),
        max(texelFetch(tSrc, ivec2(sx, sy - 1), 0).a, texelFetch(tSrc, ivec2(sx + 1, sy - 1), 0).a)
      ) * 255.0;
    }
    float byteAt(float v) { return floor(v * 255.0 + 0.5); }
  `;

  const BOT_FRAG = `${SHADOW_COMMON}
    void main() {
      int x = int(gl_FragCoord.x);
      float bot = -1.0;
      for (int y = CELL_H - 1; y >= 0; y--) {
        if (cellA(x, y) > 42.0) { bot = float(y); break; }
      }
      gl_FragColor = vec4((bot + 1.0) / 255.0, 0.0, 0.0, 1.0);
    }`;

  const PARAM_FRAG = `${SHADOW_COMMON}
    uniform sampler2D tBot;
    uniform float uPivotX;
    float bot(int x) { return byteAt(texelFetch(tBot, ivec2(x, 0), 0).r) - 1.0; }
    void main() {
      int x = int(gl_FragCoord.x);
      float maxAllB = -1.0;
      for (int i = 0; i < CELL_W; i++) maxAllB = max(maxAllB, bot(i));
      // Grounded boot soles: within 4px of the lowest point and inside the central 18px foot stance
      float thr = maxAllB - 4.0;
      bool stance = false;
      for (int i = 0; i < CELL_W; i++) if (abs(float(i) - uPivotX) <= 18.0 && bot(i) >= thr) stance = true;
      float cnt = 0.0, sumX = 0.0, sumY = 0.0, firstX = 0.0, firstY = 0.0, lastX = 0.0, lastY = 0.0;
      float prevX = -1.0, prevY = 0.0, nextX = -1.0, nextY = 0.0;
      bool sole = false;
      for (int i = 0; i < CELL_W; i++) {
        float b = bot(i);
        float fi = float(i);
        if (b < thr || (stance && abs(fi - uPivotX) > 18.0)) continue;
        if (cnt == 0.0) { firstX = fi; firstY = b; }
        lastX = fi; lastY = b;
        cnt += 1.0; sumX += fi; sumY += b;
        if (i <= x) { prevX = fi; prevY = b; }
        if (i > x && nextX < 0.0) { nextX = fi; nextY = b; }
        if (i == x) sole = true;
      }
      float fx = float(x);
      float footCenterX = cnt > 0.0 ? sumX / cnt : uPivotX;
      float groundY = cnt > 0.0 ? sumY / cnt : maxAllB;
      // Ground contact line: interpolated between neighbouring soles, clamped to the outer soles
      float base = groundY;
      if (cnt >= 2.0) {
        if (fx <= firstX) base = firstY;
        else if (fx >= lastX) base = lastY;
        else if (prevX == fx || nextX < 0.0) base = prevY;
        else base = prevY + (nextY - prevY) * (fx - prevX) / (nextX - prevX);
      }
      base = max(base, 0.0);
      bool valid = maxAllB >= 0.0;
      if (int(gl_FragCoord.y) == 0) {
        gl_FragColor = vec4(floor(base) / 255.0, fract(base), (bot(x) + 1.0) / 255.0, valid && sole ? 1.0 : 0.0);
      } else {
        gl_FragColor = vec4(floor(footCenterX) / 255.0, fract(footCenterX), (maxAllB + 1.0) / 255.0, 1.0);
      }
    }`;

  const SCATTER_VERT = `${SHADOW_COMMON}
    uniform sampler2D tParam;
    uniform vec2 uSun;
    uniform vec2 uPivot;
    uniform vec2 uOff;
    uniform vec2 uRegion;
    uniform vec2 uDens;
    varying float vDens;
    varying float vAo;
    void hide() { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); gl_PointSize = 1.0; vDens = 0.0; vAo = 0.0; }
    void main() {
      vAo = 0.0;
      vec4 g = texelFetch(tParam, ivec2(0, 1), 0);
      float maxAllB = byteAt(g.b) - 1.0;
      if (gl_VertexID >= CELL_W * CELL_H) {
        // Tight contact ambient-occlusion ellipse (9x5) under a grounded boot sole
        int x = gl_VertexID - CELL_W * CELL_H;
        vec4 c = texelFetch(tParam, ivec2(x, 0), 0);
        if (c.a < 0.5) { hide(); return; }
        vec2 at = vec2(float(x) - uPivot.x + uOff.x, byteAt(c.b) - 1.0 - uPivot.y + uOff.y);
        gl_PointSize = 9.0;
        gl_Position = vec4((at.x + 0.5) / uDens.x * 2.0 - 1.0, (uDens.y - at.y - 0.5) / uDens.y * 2.0 - 1.0, 0.0, 1.0);
        vDens = 0.0;
        vAo = 1.0;
        return;
      }
      int x = gl_VertexID % CELL_W;
      int y = gl_VertexID / CELL_W;
      if (maxAllB < 0.0 || cellA(x, y) <= 42.0) { hide(); return; }
      vec4 c = texelFetch(tParam, ivec2(x, 0), 0);
      float gY = byteAt(c.r) + c.g;
      float botX = byteAt(c.b) - 1.0;
      float footCenterX = byteAt(g.r) + g.g;
      float fx = float(x);
      float ht = max(0.0, gY - float(y));
      bool boot = abs(fx - uPivot.x) <= 18.0 && botX >= maxAllB - 4.0 && ht <= 6.0;
      float spread = boot ? 1.0 : min(0.82, 0.35 + (ht / 52.0) * 0.47);
      float relX = boot ? fx - uPivot.x : footCenterX - uPivot.x + (fx - footCenterX) * spread;
      float sx = floor(relX + ht * uSun.x + 0.5) + uOff.x;
      float sy = floor(gY - uPivot.y + ht * uSun.y + 0.5) + uOff.y;
      if (sx < 0.0 || sx + 1.0 >= uRegion.x || sy < 0.0 || sy + 1.0 >= uRegion.y) { hide(); return; }
      // Darkest right at the boot contact (ht=0), softly attenuating toward the head/cape tip; 2x2 splat
      vDens = min(240.0, floor(240.0 * max(0.28, 1.0 - (ht / 85.0) * 0.68) + 0.5)) / 255.0;
      gl_PointSize = 2.0;
      gl_Position = vec4((sx + 1.0) / uDens.x * 2.0 - 1.0, (uDens.y - sy - 1.0) / uDens.y * 2.0 - 1.0, 0.0, 1.0);
    }`;

  const SCATTER_FRAG = `
    uniform vec2 uRegion;
    uniform vec2 uDens;
    varying float vDens;
    varying float vAo;
    void main() {
      if (floor(gl_FragCoord.x) >= uRegion.x || uDens.y - 1.0 - floor(gl_FragCoord.y) >= uRegion.y) discard;
      if (vAo > 0.5) {
        float dx = floor(gl_PointCoord.x * 9.0) - 4.0;
        float dy = floor(gl_PointCoord.y * 9.0) - 4.0;
        float d2 = (dx * dx) / 16.0 + (dy * dy) / 4.0;
        if (abs(dy) > 2.0 || d2 > 1.0) discard;
        gl_FragColor = vec4(floor(255.0 * (1.0 - d2 * 0.45) + 0.5) / 255.0, 0.0, 0.0, 1.0);
        return;
      }
      gl_FragColor = vec4(vDens, 0.0, 0.0, 1.0);
    }`;

  const FEATHER_FRAG = `
    uniform sampler2D tDens;
    uniform vec2 uRegion;
    uniform float uTop;
    float dens(int x, int y) { return floor(texelFetch(tDens, ivec2(x, ${SHADOW_H} - 1 - y), 0).r * 255.0 + 0.5); }
    void main() {
      int x = int(gl_FragCoord.x);
      int y = int(uTop - 1.0 - floor(gl_FragCoord.y));
      if (x < 1 || float(x) > uRegion.x - 2.0 || y < 1 || float(y) > uRegion.y - 2.0) { gl_FragColor = vec4(0.0); return; }
      float blurred = floor((dens(x, y) * 4.0 + dens(x - 1, y) + dens(x + 1, y) + dens(x, y - 1) + dens(x, y + 1)) / 8.0);
      gl_FragColor = blurred > 14.0 ? vec4(20.0, 28.0, 36.0, min(255.0, blurred)) / 255.0 : vec4(0.0);
    }`;

    srcTex = new THREE.FramebufferTexture(W, HS);
    const material = (fragmentShader: string, uniforms: Record<string, { value: any }>, vertexShader?: string) =>
      new THREE.ShaderMaterial({
        uniforms,
        vertexShader: vertexShader ?? `void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }`,
        fragmentShader,
        depthTest: false,
        depthWrite: false,
        blending: THREE.NoBlending,
        toneMapped: false
      });
    const sceneOf = (obj: any) => {
      obj.frustumCulled = false;
      const sc = new THREE.Scene();
      sc.add(obj);
      return sc;
    };
    const quad = (fragmentShader: string, uniforms: Record<string, { value: any }>) =>
      sceneOf(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material(fragmentShader, uniforms)));
    const target = (w: number, h: number) =>
      new THREE.WebGLRenderTarget(w, h, {
        depthBuffer: false,
        minFilter: THREE.NearestFilter,
        magFilter: THREE.NearestFilter
      });

    postTint = new THREE.Vector3(1, 1, 1);
    postScene = quad(POST_FRAG, {
      tSrc: { value: srcTex },
      uSize: { value: new THREE.Vector2(W, HS) },
      uOrigin: { value: new THREE.Vector2(0, SHADOW_H) },
      uTint: { value: postTint }
    });

    // Low/balanced use a cached contact shadow: do not allocate or compile four projection passes.
    if(renderQuality.get().simpleShadow)return;
    botRT = target(CELL_W, 1);
    paramRT = target(CELL_W, 2);
    densRT = target(SHADOW_W, SHADOW_H);
    shadowU = {
      tSrc: { value: srcTex },
      tBot: { value: botRT.texture },
      tParam: { value: paramRT.texture },
      tDens: { value: densRT.texture },
      uPivotX: { value: 57 },
      uPivot: { value: new THREE.Vector2(57, 101) },
      uSun: { value: new THREE.Vector2() },
      uOff: { value: new THREE.Vector2() },
      uRegion: { value: new THREE.Vector2() },
      uDens: { value: new THREE.Vector2(SHADOW_W, SHADOW_H) },
      uTop: { value: SHADOW_H }
    };
    botScene = quad(BOT_FRAG, shadowU);
    paramScene = quad(PARAM_FRAG, shadowU);
    featherScene = quad(FEATHER_FRAG, shadowU);
    const points = new THREE.BufferGeometry();
    points.setAttribute('position', new THREE.BufferAttribute(new Float32Array((CELL_W * CELL_H + CELL_W) * 3), 3));
    const scatterMat = material(SCATTER_FRAG, shadowU, SCATTER_VERT);
    scatterMat.blending = THREE.CustomBlending;
    scatterMat.blendEquation = THREE.MaxEquation;
    scatterMat.blendEquationAlpha = THREE.MaxEquation;
    scatterScene = sceneOf(new THREE.Points(points, scatterMat));
  }

  function applyHandPaintedSpritePass(tint: string, night: number): void {
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
    postTint.set(tintR, tintG, tintB);
    renderer.setViewport(0, SHADOW_H, W, HS);
    renderer.render(postScene, orthoCam);
  }

  /**
   * Renders a realistic ground shadow whose root is mathematically anchored at the exact
   * bottom pixels of BOTH of the character's boots (`ht = 0` at `y = footY[x]`), eliminating
   * any gap between either boot and its shadow while projecting smoothly along the sun vector.
   */
  const contactCanvas=document.createElement('canvas');contactCanvas.width=64;contactCanvas.height=20;
  const contactCtx=contactCanvas.getContext('2d')!;
  contactCtx.setTransform(1,0,0,.3,32,8);
  const contactGradient=contactCtx.createRadialGradient(0,0,3,0,0,26);
  contactGradient.addColorStop(0,'rgba(20,28,36,.85)');contactGradient.addColorStop(1,'rgba(20,28,36,0)');
  contactCtx.fillStyle=contactGradient;contactCtx.fillRect(-32,-27,64,67);
  const contactShadow:ShadowDrawResult={canvas:contactCanvas,sx:0,sy:0,ox:32,oy:8,sw:64,sh:20};
  function renderFootAnchoredShadow(
    s: Sun,
    cell: { w: number; h: number; pivot: { x: number; y: number } }
  ): ShadowDrawResult {
    if(renderQuality.get().simpleShadow)return contactShadow;
    const cw = CELL_W;
    // Even at night (s.alpha === 0), cast a subtle moonlight/torch ground shadow so the hero is grounded
    const hasSun = Boolean(s && s.alpha > 0.02);
    const sdx = hasSun ? s.dx * 0.58 : 0.28;
    const sdy = hasSun ? s.dy * 0.58 : 0.22;
    const pad = 16;
    const reachH = CELL_H + 16;
    const ox = Math.ceil(cw * 0.65 + (sdx < 0 ? reachH * -sdx : 0) + pad);
    const oy = Math.ceil(cw * 0.5 + (sdy < 0 ? reachH * -sdy : 0) + pad);
    const sw = Math.min(SHADOW_W, Math.ceil(ox + cw * 0.65 + (sdx > 0 ? reachH * sdx : 0) + pad));
    const sh = Math.min(SHADOW_H, Math.ceil(oy + cw * 0.5 + (sdy > 0 ? reachH * sdy : 0) + pad));

    shadowU.uPivotX.value = cell.pivot.x;
    shadowU.uPivot.value.set(cell.pivot.x, cell.pivot.y);
    shadowU.uSun.value.set(sdx, sdy);
    shadowU.uOff.value.set(ox, oy);
    shadowU.uRegion.value.set(sw, sh);

    renderer.setRenderTarget(botRT);
    renderer.render(botScene, orthoCam);
    renderer.setRenderTarget(paramRT);
    renderer.render(paramScene, orthoCam);
    renderer.setRenderTarget(densRT);
    renderer.clear(true, false, false);
    renderer.render(scatterScene, orthoCam);
    renderer.setRenderTarget(null);
    renderer.setViewport(0, SHADOW_H - sh, sw, sh);
    renderer.render(featherScene, orthoCam);
    return { canvas: glCanvas, sx: 0, sy: HS, ox, oy, sw, sh };
  }

  /*
   * Raised casting arm. Each bone is aimed at a model-space direction (glTF model space: +Y up, +Z the way the
   * hero faces, -X the hero's right) starting from its bind rotation under the current parent, so the arm keeps
   * a stable twist whatever the clip was doing, then blended over the clip by `castRaise`. Mixamo-style bones
   * point along their local +Y. The hand rises above the head, into the sprite's HEADROOM.
   */
  const CAST_ARM_CHAIN = ['Shoulder', 'Arm', 'ForeArm', 'Hand'];
  let castTmp: { inv: any; m: any; p: any; s: any; qParent: any; q: any; qd: any; v: any; dir: any } | null = null;

  function raiseCastingArm(entry: HeroModelEntry, t: number) {
    if (entry.castArm.length !== CAST_ARM_CHAIN.length) return;
    castTmp ??= {
      inv: new THREE.Matrix4(),
      m: new THREE.Matrix4(),
      p: new THREE.Vector3(),
      s: new THREE.Vector3(),
      qParent: new THREE.Quaternion(),
      q: new THREE.Quaternion(),
      qd: new THREE.Quaternion(),
      v: new THREE.Vector3(),
      dir: new THREE.Vector3()
    };
    const k = castTmp;
    const w = entry.castRaise * entry.castRaise * (3 - 2 * entry.castRaise);
    // Slow channelling sway so the raised hand is alive rather than a frozen pose.
    const ph = t * Math.PI * 2 * 0.85;
    const sw = Math.sin(ph);
    const cw = Math.cos(ph);
    const targets = [
      [-0.62, 0.56, 0.06], // shoulder: clavicle shrugs up with the arm
      [-0.5 - 0.04 * cw, 0.86, 0.12 + 0.08 * sw], // upper arm: up and out, clear of the head and hair
      [-0.14 - 0.06 * sw, 0.96, 0.26 + 0.1 * cw], // forearm: elbow slightly bent, hand above the shoulder
      [-0.02, 0.84, 0.5 + 0.12 * sw] // hand: fingers tipped forward, palm to the sky
    ];
    entry.rawModel.updateMatrixWorld(true);
    k.inv.copy(entry.rawModel.matrixWorld).invert();
    for (let i = 0; i < entry.castArm.length; i++) {
      const { bone, bind } = entry.castArm[i];
      k.m.multiplyMatrices(k.inv, bone.parent.matrixWorld).decompose(k.p, k.qParent, k.s);
      k.q.multiplyQuaternions(k.qParent, bind);
      k.v.set(0, 1, 0).applyQuaternion(k.q);
      k.dir.fromArray(targets[i]).normalize();
      k.qd.setFromUnitVectors(k.v, k.dir);
      k.q.premultiply(k.qd);
      k.q.premultiply(k.qParent.invert());
      bone.quaternion.slerp(k.q, i === 0 ? w * 0.7 : w);
      bone.updateMatrixWorld(true);
    }
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
      castArm: [],
      castRaise: 0,
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

        // Both heroes cast with the right arm (Ember's gauntlet, Rift's rift hand); it is the one raised overhead.
        for (const part of CAST_ARM_CHAIN) {
          const bone = model.getObjectByName(`Right${part}`);
          if (!bone?.isBone) {
            entry.castArm = [];
            break;
          }
          entry.castArm.push({ bone, bind: bone.quaternion.clone() });
        }

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

  let gltfLoader: any = null;
  function ensureHeroModel(heroId: string) {
    if (gltfLoader && !heroEntries.has(heroId)) {
      loadHeroModel(gltfLoader, heroId);
    }
  }
  const initialHeroId = (() => {
    try {
      const q = new URLSearchParams(location.search).get('hero');
      if (q === 'ember-warden' || q === 'rift-runner') return q;
      const s = localStorage.getItem('arkodia.hero');
      if (s === 'ember-warden' || s === 'rift-runner') return s;
    } catch {}
    return 'rift-runner';
  })();

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
      renderer.setSize(CANVAS_W, CANVAS_H, false);
      renderer.setClearColor(0x000000, 0);
      renderer.autoClear = false;
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.28;

      createSpritePipeline();
      copyAt = new THREE.Vector2(0, SHADOW_H);

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
      // The frustum grows upward by the headroom rows at the same world-per-pixel scale, so the cell is unchanged.
      orthoCam = new THREE.OrthographicCamera(-halfW, halfW, halfH + (2 * halfH * TOP) / H, -halfH, 0.1, 20);
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

      gltfLoader = new GLTFLoader();
      ensureHeroModel(initialHeroId);
    } catch (e) {
      console.warn('3D hero renderer load error:', e);
    }
  })();

  let pipelineSimple=renderQuality.get().simpleShadow;
  function syncPipelineQuality(){
    const quality=renderQuality.get();
    if(SCALE===quality.heroScale&&pipelineSimple===quality.simpleShadow)return;
    // A downgrade is one-way for this page load. Release the old targets instead of retaining both quality sets.
    for(const pass of [postScene,botScene,paramScene,scatterScene,featherScene])pass?.traverse((obj:any)=>{obj.geometry?.dispose();obj.material?.dispose();});
    for(const target of [srcTex,botRT,paramRT,densRT])target?.dispose();
    postScene=botScene=paramScene=scatterScene=featherScene=null;botRT=paramRT=densRT=null;
    SCALE=quality.heroScale;pipelineSimple=quality.simpleShadow;
    W=CELL_W*SCALE;H=CELL_H*SCALE;TOP=HERO_3D_HEADROOM*SCALE;HS=H+TOP;
    SHADOW_W=pipelineSimple?0:320;SHADOW_H=pipelineSimple?0:224;
    CANVAS_W=Math.max(W,SHADOW_W);CANVAS_H=HS+SHADOW_H;
    renderer.setSize(CANVAS_W,CANVAS_H,false);createSpritePipeline();copyAt.set(0,SHADOW_H);
    (window as any).__HERO_3D_SCALE__=SCALE;cachedResult=null;
  }
  let revision=0,lastRenderedAt=-Infinity,lastRenderKey='',pendingDt=0;
  let cachedResult:ReturnType<ThreeHeroInstance['updateAndRender']>=null;
  sharedInstance = {
    canvas: glCanvas,
    style,
    isHeroReady(heroId: string) {
      ensureHeroModel(heroId);
      return Boolean(heroEntries.get(heroId)?.ready && style !== '2d');
    },
    updateAndRender({ heroId, clip, moving, yaw, dt, tint, night, sun, cell }) {
      ensureHeroModel(heroId);
      const entry = heroEntries.get(heroId);
      if (!entry || !entry.ready || !renderer || style === '2d') return null;
      measureRenderDetail('heroQualityChange',syncPipelineQuality);

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
        const prevClip = entry.activeClip;
        const prevTime = entry.activeAction ? Number(entry.activeAction.time || 0) : 0;
        if (entry.activeAction && entry.activeAction !== next) {
          entry.activeAction.fadeOut(0.14);
        }
        next.reset();
        // Phase-lock stride time when switching between 'run' and 'run_cast' so legs & left arm never skip a beat
        if ((prevClip === 'run' && targetClip === 'run_cast') || (prevClip === 'run_cast' && targetClip === 'run')) {
          const dur = next.getClip?.()?.duration || 0;
          if (dur > 0) next.time = prevTime % dur;
        }
        next.fadeIn(0.14).play();
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

      pendingDt+=dt;
      const cacheKey=[heroId,targetClip,currentYaw.toFixed(3),tint,Math.round(night*50),sun?.alpha.toFixed(2),sun?.dx.toFixed(2),sun?.dy.toFixed(2),renderQuality.get().tier].join('|');
      if(cachedResult&&targetClip==='idle'&&!moving&&cacheKey===lastRenderKey&&now-lastRenderedAt<1000/renderQuality.get().idleFps)return cachedResult;
      const renderDt=pendingDt;pendingDt=0;lastRenderedAt=now;lastRenderKey=cacheKey;
      measureRenderDetail('heroAnimation',()=>entry.mixer.update(renderDt));

      // Casting raises one hand overhead instead of the clips' forward reach. It is laid over the evaluated clip
      // (every cast clip keys these bones each frame), so the legs, torso and other arm keep their authored motion.
      const raiseTo = entry.activeClip === 'idle_cast' || entry.activeClip === 'run_cast' ? 1 : 0;
      entry.castRaise += (raiseTo - entry.castRaise) * Math.min(1, renderDt * (raiseTo ? 10 : 7));
      if (entry.castRaise > 0.003) raiseCastingArm(entry, now / 1000);

      // Dynamically ground the lowest foot/toe bone to y = 0 so the boots never sink below the ground pivot
      // while preserving natural upward flight bounce during 'run' and 'run_cast'
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
          const isRunningClip = entry.activeClip === 'run' || entry.activeClip === 'run_cast';
          const deltaY = minFootY - 0.032;
          // Prevent any downward ground penetration (deltaY < 0), while allowing 70% of natural upward flight lift during run
          const offset = isRunningClip && deltaY > 0 ? deltaY * 0.30 : deltaY;
          entry.rawModel.position.y = entry.baseOffsetY - offset;
        }
      }

      renderer.setClearColor(0x000000, 0);
      renderer.setRenderTarget(null);
      renderer.clear(true, true, true);
      renderer.setViewport(0, SHADOW_H, W, HS);
      measureRenderDetail('heroDraw',()=>renderer.render(scene, orthoCam));
      measureRenderDetail('heroCopy',()=>renderer.copyFramebufferToTexture(srcTex, copyAt));

      // Project realistic ground shadow anchored directly at the boots (ht = 0 at y = botCol[x])
      const shadow = sun && cell ? measureRenderDetail('heroShadow',()=>renderFootAnchoredShadow(sun, cell)) : null;

      // Apply 2D Hand-Painted Sprite Pass (dark ink outline + internal creases) over the raw 3D pass
      measureRenderDetail('heroPost',()=>applyHandPaintedSpritePass(tint, night));

      cachedResult={ sprite: glCanvas, spriteW: W, spriteH: HS, spriteTop: TOP, revision:++revision, shadow, activeClip: entry.activeClip };
      glCanvas.dataset.heroScale=String(SCALE);glCanvas.dataset.shadow=renderQuality.get().simpleShadow?'contact':'projected';
      return cachedResult;
    }
  };

  return sharedInstance;
}

if (typeof window !== 'undefined' && is3dHeroEnabled()) {
  setTimeout(() => {
    get3dHeroRenderer();
  }, 0);
}

