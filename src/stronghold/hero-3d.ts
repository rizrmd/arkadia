// Real-time 60 FPS 3D character renderer for Stronghold (active when ?3d=1 is in the URL).
// Renders the rigged 3D Rift Runner (.glb with 7 skeletal animations) using an orthographic 2:1 isometric camera
// directly into hero.ts's character canvas so dynamic sun shadows, wall occlusion (cutOut), and NixieFX work unchanged.

const dynImport = new Function('u', 'return import(u)') as (url: string) => Promise<any>;

let enabledCache: boolean | null = null;
export function is3dHeroEnabled(): boolean {
  if (enabledCache !== null) return enabledCache;
  if (typeof location === 'undefined') return false;
  const q = new URLSearchParams(location.search).get('3d');
  if (q === '1' || q === 'true') {
    enabledCache = true;
    return true;
  }
  if (q === '0' || q === 'false') {
    enabledCache = false;
    return false;
  }
  enabledCache = false;
  return false;
}

interface ThreeHeroInstance {
  canvas: HTMLCanvasElement;
  ready: boolean;
  updateAndRender(opts: {
    clip: string;
    yaw: number;
    dt: number;
    tint: string;
    night: number;
  }): HTMLCanvasElement | null;
}

let sharedInstance: ThreeHeroInstance | null = null;

export function get3dHeroRenderer(): ThreeHeroInstance {
  if (sharedInstance) return sharedInstance;

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;

  let ready = false;
  let THREE: any = null;
  let renderer: any = null;
  let scene: any = null;
  let orthoCam: any = null;
  let heroRoot: any = null;
  let mixer: any = null;
  let sunLight: any = null;
  let ambientLight: any = null;
  const actions = new Map<string, any>();
  let activeClip = '';
  let activeAction: any = null;
  let currentYaw = 0;

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
      renderer.setSize(256, 256, false);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.25;

      scene = new THREE.Scene();

      const ISO_TILT = Math.atan(0.5);
      const ISO_DIST = 6.0;
      const h = 1.72;
      orthoCam = new THREE.OrthographicCamera(-h * 0.5, h * 0.5, h * 0.5, -h * 0.5, 0.1, 20);
      orthoCam.position.set(0, 0.76 + Math.sin(ISO_TILT) * ISO_DIST, Math.cos(ISO_TILT) * ISO_DIST);
      orthoCam.lookAt(0, 0.76, 0);

      ambientLight = new THREE.HemisphereLight(0xdbeafe, 0x1e293b, 1.45);
      scene.add(ambientLight);

      sunLight = new THREE.DirectionalLight(0xfff3d6, 2.6);
      sunLight.position.set(3.2, 5.4, 2.8);
      scene.add(sunLight);

      const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.5);
      rimLight.position.set(-3.0, 2.4, -2.8);
      scene.add(rimLight);

      const loader = new GLTFLoader();
      loader.load('/assets/characters/3d/rift-runner.glb', (gltf: any) => {
        const model = gltf.scene;
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
            obj.material.roughness = 0.62;
            obj.material.metalness = 0.15;
          }
        });

        heroRoot = new THREE.Group();
        heroRoot.add(model);
        scene.add(heroRoot);

        mixer = new THREE.AnimationMixer(model);
        for (const clip of gltf.animations) {
          const act = mixer.clipAction(clip);
          if (['attack', 'cast', 'hit', 'death'].includes(clip.name)) {
            act.setLoop(THREE.LoopOnce, 1);
            act.clampWhenFinished = true;
          }
          actions.set(clip.name, act);
        }

        const idleAct = actions.get('idle');
        if (idleAct) {
          idleAct.play();
          activeAction = idleAct;
          activeClip = 'idle';
        }
        ready = true;
        if (sharedInstance) sharedInstance.ready = true;
      });
    } catch (e) {
      console.warn('3D hero renderer load error:', e);
    }
  })();

  sharedInstance = {
    canvas,
    get ready() {
      return ready;
    },
    set ready(v: boolean) {
      ready = v;
    },
    updateAndRender({ clip, yaw, dt, tint, night }) {
      if (!ready || !renderer || !mixer || !heroRoot) return null;

      // Map game state/pose clip ('idle', 'move', 'attack', 'hit', 'die') to 3D GLB clip name
      let targetClip = 'idle';
      if (clip.startsWith('move')) targetClip = 'run';
      else if (clip.startsWith('attack')) targetClip = 'attack';
      else if (clip.startsWith('hit')) targetClip = 'hit';
      else if (clip.startsWith('die')) targetClip = 'death';

      if (targetClip !== activeClip && actions.has(targetClip)) {
        const next = actions.get(targetClip)!;
        if (activeAction && activeAction !== next) {
          activeAction.fadeOut(0.14);
        }
        next.reset().fadeIn(0.14).play();
        activeAction = next;
        activeClip = targetClip;
      }

      // Smooth 360-degree shortest-arc yaw interpolation at 60 FPS
      let diff = ((yaw - currentYaw + Math.PI) % (Math.PI * 2)) - Math.PI;
      if (diff < -Math.PI) diff += Math.PI * 2;
      currentYaw += diff * Math.min(1, dt * 16);
      heroRoot.rotation.y = currentYaw;

      if (tint && tint !== '255,255,255' && sunLight) {
        const [r, g, b] = tint.split(',').map((n) => Number(n) / 255);
        sunLight.color.setRGB(Math.min(1, r * 1.15), Math.min(1, g * 1.15), Math.min(1, b * 1.15));
      } else if (sunLight) {
        sunLight.color.setHex(night > 0.3 ? 0xffcfa3 : 0xfff3d6);
      }

      mixer.update(dt);
      renderer.render(scene, orthoCam);
      return canvas;
    }
  };

  return sharedInstance;
}
