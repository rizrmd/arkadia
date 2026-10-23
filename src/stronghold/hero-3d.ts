// Real-time 60 FPS 3D character renderer for Stronghold (ENABLED BY DEFAULT for both Rift Runner & Ember Warden;
// pass ?3d=0 to fall back to legacy 2D spritesheets).
// Renders the rigged 3D heroes (rift-runner.glb & ember-warden.glb with 7 skeletal animations including idle_cast and run_cast)
// using an orthographic 2:1 isometric camera directly into hero.ts's character canvas so dynamic sun shadows,
// wall occlusion (cutOut), and NixieFX work seamlessly.

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
  // 3D Hero Mode is now the default in Stronghold gameplay!
  enabledCache = true;
  return true;
}

export type ShaderStyle3D = 'stylized' | 'pbr' | 'wireframe' | '2d';

interface HeroModelEntry {
  id: string;
  ready: boolean;
  heroRoot: any;
  rawModel: any;
  mixer: any;
  actions: Map<string, any>;
  originalMaterials: Map<string, any>;
  activeClip: string;
  activeAction: any;
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
  }): HTMLCanvasElement | null;
}

let sharedInstance: ThreeHeroInstance | null = null;

export function get3dHeroRenderer(): ThreeHeroInstance {
  if (sharedInstance) return sharedInstance;

  // Match character 114x103 aspect ratio at 3x supersampled resolution (342x309) for crisp silhouettes
  const W = 342;
  const H = 309;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;

  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = W;
  shadowCanvas.height = H;
  const shadowCtx = shadowCanvas.getContext('2d')!;

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
  let castHoldUntil = 0;

  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', (e) => {
      const k = e.key.toLowerCase();
      if (k === ' ' || k === 'e') {
        castHoldUntil = performance.now() + 2000;
      }
    });
  }

  function applyStyleToEntry(entry: HeroModelEntry, mode: ShaderStyle3D) {
    if (!entry.rawModel || !THREE || mode === '2d') return;
    const isEmber = entry.id === 'ember-warden';
    entry.rawModel.traverse((obj: any) => {
      if (!obj.isMesh) return;
      const orig = entry.originalMaterials.get(obj.uuid);
      if (!orig) return;
      if (mode === 'wireframe') {
        obj.material = new THREE.MeshStandardMaterial({
          color: isEmber ? 0xf59e0b : 0x38bdf8,
          emissive: isEmber ? 0x78350f : 0x0c4a6e,
          roughness: 0.35,
          metalness: 0.2,
          wireframe: true
        });
      } else if (mode === 'pbr') {
        obj.material = orig.clone();
        obj.material.wireframe = false;
      } else {
        const m = orig.clone();
        m.wireframe = false;
        m.roughness = 0.56;
        m.metalness = 0.18;
        m.emissive = new THREE.Color(isEmber ? 0x261205 : 0x081926);
        m.emissiveIntensity = 0.35;
        obj.material = m;
      }
    });
  }

  if (typeof document !== 'undefined') {
    document.getElementById('arkadia-3d-hud-pill')?.remove();
  }

  function loadHeroModel(loader: any, heroId: string) {
    const entry: HeroModelEntry = {
      id: heroId,
      ready: false,
      heroRoot: null,
      rawModel: null,
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
        const scale = 1.48 / (size.y || 1);
        model.scale.setScalar(scale);
        model.updateMatrixWorld(true);
        const scaledBox = new THREE.Box3().setFromObject(model);
        model.position.set(-center.x * scale, -scaledBox.min.y, -center.z * scale);

        model.traverse((obj: any) => {
          if (obj.isMesh && obj.material) {
            entry.originalMaterials.set(obj.uuid, obj.material.clone());
          }
        });

        applyStyleToEntry(entry, style);

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
        canvas,
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance'
      });
      renderer.setSize(W, H, false);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.32;

      scene = new THREE.Scene();

      // Exact 2:1 isometric projection aligned to 114x103 cell and (57, 101) foot pivot
      const ISO_TILT = Math.atan(0.5);
      const ISO_DIST = 6.0;
      const halfH = 0.752;
      const halfW = halfH * (W / H);
      const targetY = 0.79;
      orthoCam = new THREE.OrthographicCamera(-halfW, halfW, halfH, -halfH, 0.1, 20);
      orthoCam.position.set(0, targetY + Math.sin(ISO_TILT) * ISO_DIST, Math.cos(ISO_TILT) * ISO_DIST);
      orthoCam.lookAt(0, targetY, 0);

      ambientLight = new THREE.HemisphereLight(0xe0f2fe, 0x1e293b, 1.55);
      scene.add(ambientLight);

      sunLight = new THREE.DirectionalLight(0xfff3d6, 2.8);
      sunLight.position.set(3.2, 5.4, 2.8);
      scene.add(sunLight);

      rimLight = new THREE.DirectionalLight(0x38bdf8, 1.65);
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
    canvas,
    shadowCanvas,
    style,
    isHeroReady(heroId: string) {
      return Boolean(heroEntries.get(heroId)?.ready && style !== '2d');
    },
    updateAndRender({ heroId, clip, moving, yaw, dt, tint, night }) {
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
        castHoldUntil = Math.max(castHoldUntil, now + 900);
      }

      // Map game state/pose clip + movement into 3D GLB clip ('idle', 'run', 'idle_cast', 'run_cast', 'hit', 'death')
      let targetClip = 'idle';
      if (clip.startsWith('die') || clip.startsWith('death')) {
        targetClip = 'death';
      } else if (clip.startsWith('hit') || clip.startsWith('hurt')) {
        targetClip = 'hit';
      } else if (clip.startsWith('attack') || clip.startsWith('cast') || now < castHoldUntil) {
        targetClip = moving || clip.startsWith('move') ? 'run_cast' : 'idle_cast';
      } else if (moving || clip.startsWith('move')) {
        targetClip = 'run';
      }

      if (targetClip !== entry.activeClip && entry.actions.has(targetClip)) {
        const next = entry.actions.get(targetClip)!;
        if (entry.activeAction && entry.activeAction !== next) {
          entry.activeAction.fadeOut(0.14);
        }
        next.reset().fadeIn(0.14).play();
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
        sunLight.color.setHex(night > 0.3 ? 0xffcfa3 : 0xfff3d6);
      }

      entry.mixer.update(dt);
      renderer.render(scene, orthoCam);

      // Prepare silhouettes for 60 FPS dynamic ground shadow projection
      shadowCtx.globalCompositeOperation = 'copy';
      shadowCtx.drawImage(canvas, 0, 0);
      shadowCtx.globalCompositeOperation = 'source-in';
      shadowCtx.fillStyle = '#141c2c';
      shadowCtx.fillRect(0, 0, W, H);
      shadowCtx.globalCompositeOperation = 'source-over';

      return canvas;
    }
  };

  return sharedInstance;
}
