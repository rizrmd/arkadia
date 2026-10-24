import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import * as THREE from '../../public/3d-hero-lab/vendor/three.module.min.js';

const RAW_DIR = path.resolve('assets-src/3d-heroes/raw');
const OUT_DIR = path.resolve('public/assets/characters/3d');

const CLIPS = [
  { slug: 'idle', label: 'Idle', loop: true },
  { slug: 'run', label: 'Run', loop: true },
  { slug: 'idle_cast', label: 'Idle Cast', loop: true },
  { slug: 'run_cast', label: 'Run While Casting', loop: true },
  { slug: 'hit', label: 'Hit Reaction', loop: false },
  { slug: 'death', label: 'Death', loop: false }
];

const HERO_LIST = [
  { id: 'rift-runner', name: 'Rift Runner' },
  { id: 'ember-warden', name: 'Ember Warden' }
];

const LOWER_BODY_BONES = new Set([
  'Hips',
  'LeftUpLeg',
  'LeftLeg',
  'LeftFoot',
  'LeftToeBase',
  'RightUpLeg',
  'RightLeg',
  'RightFoot',
  'RightToeBase'
]);

function parseGlb(buf) {
  const magic = buf.readUInt32LE(0);
  if (magic !== 0x46546C67) throw new Error('Invalid GLB magic');
  const jsonLen = buf.readUInt32LE(12);
  const json = JSON.parse(buf.subarray(20, 20 + jsonLen).toString('utf8'));
  const binHeaderOffset = 20 + jsonLen;
  const binLen = buf.readUInt32LE(binHeaderOffset);
  const bin = buf.subarray(binHeaderOffset + 8, binHeaderOffset + 8 + binLen);
  return { json, bin };
}

function pad4(buf, padByte = 0x00) {
  const rem = buf.length % 4;
  if (rem === 0) return buf;
  return Buffer.concat([buf, Buffer.alloc(4 - rem, padByte)]);
}

function buildGlb(json, bin) {
  const jsonBuf = pad4(Buffer.from(JSON.stringify(json), 'utf8'), 0x20);
  const binBuf = pad4(bin, 0x00);
  const totalLen = 12 + 8 + jsonBuf.length + 8 + binBuf.length;
  const header = Buffer.alloc(12);
  header.writeUInt32LE(0x46546C67, 0);
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(totalLen, 8);

  const jsonHeader = Buffer.alloc(8);
  jsonHeader.writeUInt32LE(jsonBuf.length, 0);
  jsonHeader.writeUInt32LE(0x4E4F534A, 4);

  const binHeader = Buffer.alloc(8);
  binHeader.writeUInt32LE(binBuf.length, 0);
  binHeader.writeUInt32LE(0x004E4942, 4);

  return Buffer.concat([header, jsonHeader, jsonBuf, binHeader, binBuf]);
}

function readFloat32Accessor(glb, accIdx) {
  const acc = glb.json.accessors[accIdx];
  const bv = glb.json.bufferViews[acc.bufferView];
  const start = (bv.byteOffset || 0) + (acc.byteOffset || 0);
  const numComponents = acc.type === 'SCALAR' ? 1 : acc.type === 'VEC3' ? 3 : acc.type === 'VEC4' ? 4 : 1;
  const totalFloats = acc.count * numComponents;
  const out = new Float32Array(totalFloats);
  for (let i = 0; i < totalFloats; i++) {
    out[i] = glb.bin.readFloatLE(start + i * 4);
  }
  return { floats: out, count: acc.count, numComponents, type: acc.type };
}

function slerpQuat(a, b, t) {
  let dot = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
  const b2 = [b[0], b[1], b[2], b[3]];
  if (dot < 0) {
    dot = -dot;
    b2[0] = -b2[0];
    b2[1] = -b2[1];
    b2[2] = -b2[2];
    b2[3] = -b2[3];
  }
  if (dot > 0.9995) {
    const rx = a[0] + t * (b2[0] - a[0]);
    const ry = a[1] + t * (b2[1] - a[1]);
    const rz = a[2] + t * (b2[2] - a[2]);
    const rw = a[3] + t * (b2[3] - a[3]);
    const len = Math.hypot(rx, ry, rz, rw) || 1;
    return [rx / len, ry / len, rz / len, rw / len];
  }
  const theta0 = Math.acos(Math.min(1, Math.max(-1, dot)));
  const theta = theta0 * t;
  const sinTheta = Math.sin(theta);
  const sinTheta0 = Math.sin(theta0);
  const s0 = Math.cos(theta) - (dot * sinTheta) / sinTheta0;
  const s1 = sinTheta / sinTheta0;
  return [
    s0 * a[0] + s1 * b2[0],
    s0 * a[1] + s1 * b2[1],
    s0 * a[2] + s1 * b2[2],
    s0 * a[3] + s1 * b2[3]
  ];
}

async function buildHeroGlb(hero) {
  const idleRawPath = path.join(RAW_DIR, `${hero.id}-idle.glb`);
  if (!existsSync(idleRawPath)) {
    console.log(`Skipping ${hero.id} (missing ${idleRawPath})`);
    return null;
  }

  const base = parseGlb(await fs.readFile(idleRawPath));
  const outJson = structuredClone(base.json);
  const nodeNameToIndex = new Map();
  outJson.nodes.forEach((n, idx) => {
    if (n.name) nodeNameToIndex.set(n.name, idx);
  });

  const bvBuffers = outJson.bufferViews.map((bv) => {
    const start = bv.byteOffset || 0;
    return Buffer.from(base.bin.subarray(start, start + bv.byteLength));
  });

  // Refine Ember Warden bind-pose vertex proportions (sleeker 8-heads-tall head/neck ratio & tailored coat silhouette)
  if (hero.id === 'ember-warden') {
    for (const mesh of outJson.meshes || []) {
      for (const prim of mesh.primitives || []) {
        if (prim.attributes?.POSITION === undefined) continue;
        const posAcc = outJson.accessors[prim.attributes.POSITION];
        const posBv = outJson.bufferViews[posAcc.bufferView];
        const buf = bvBuffers[posAcc.bufferView];
        const baseOff = posAcc.byteOffset || 0;
        const stride = posBv.byteStride || 12;
        const min = [Infinity, Infinity, Infinity];
        const max = [-Infinity, -Infinity, -Infinity];
        const smoothstep = (e0, e1, v) => {
          const t = Math.max(0, Math.min(1, (v - e0) / (e1 - e0)));
          return t * t * (3 - 2 * t);
        };

        // Classify lower-body vertices below y = 0.88m by exact triangle-mesh connected components:
        //   part = 1 -> Left Leg & Boot (2,408 verts, minY < 0.05, avgX > -0.015)
        //   part = 2 -> Right Leg & Boot (2,343 verts, minY < 0.05, avgX <= -0.015)
        //   part = 3 -> Outer Coat Skirt (minY >= 0.05)
        const part = new Uint8Array(posAcc.count);
        if (prim.indices !== undefined) {
          const idxAcc = outJson.accessors[prim.indices];
          const idxBuf = bvBuffers[idxAcc.bufferView];
          const idxBase = idxAcc.byteOffset || 0;
          const isU16 = idxAcc.componentType === 5123;

          const posKeyToRep = new Map();
          const vertToRep = new Int32Array(posAcc.count);
          const rawCoords = new Float32Array(posAcc.count * 3);
          for (let i = 0; i < posAcc.count; i++) {
            const off = baseOff + i * stride;
            const x = buf.readFloatLE(off);
            const y = buf.readFloatLE(off + 4);
            const z = buf.readFloatLE(off + 8);
            rawCoords[i * 3] = x;
            rawCoords[i * 3 + 1] = y;
            rawCoords[i * 3 + 2] = z;
            const key = `${Math.round(x * 1000)},${Math.round(y * 1000)},${Math.round(z * 1000)}`;
            let rep = posKeyToRep.get(key);
            if (rep === undefined) {
              rep = i;
              posKeyToRep.set(key, rep);
            }
            vertToRep[i] = rep;
          }

          const cutY = 0.88;
          const parent = new Int32Array(posAcc.count).fill(-1);
          for (let i = 0; i < posAcc.count; i++) {
            if (rawCoords[i * 3 + 1] < cutY) {
              parent[vertToRep[i]] = vertToRep[i];
            }
          }
          const find = (a) => {
            while (parent[a] !== a) {
              parent[a] = parent[parent[a]];
              a = parent[a];
            }
            return a;
          };
          const union = (a, b) => {
            const ra = find(a);
            const rb = find(b);
            if (ra !== rb) parent[ra] = rb;
          };

          for (let t = 0; t < idxAcc.count; t += 3) {
            const r0 = isU16 ? idxBuf.readUInt16LE(idxBase + t * 2) : idxBuf.readUInt32LE(idxBase + t * 4);
            const r1 = isU16 ? idxBuf.readUInt16LE(idxBase + (t + 1) * 2) : idxBuf.readUInt32LE(idxBase + (t + 1) * 4);
            const r2 = isU16 ? idxBuf.readUInt16LE(idxBase + (t + 2) * 2) : idxBuf.readUInt32LE(idxBase + (t + 2) * 4);
            const i0 = vertToRep[r0];
            const i1 = vertToRep[r1];
            const i2 = vertToRep[r2];
            if (parent[i0] >= 0 && parent[i1] >= 0) union(i0, i1);
            if (parent[i1] >= 0 && parent[i2] >= 0) union(i1, i2);
            if (parent[i0] >= 0 && parent[i2] >= 0) union(i0, i2);
          }

          const compStats = new Map();
          for (let i = 0; i < posAcc.count; i++) {
            if (rawCoords[i * 3 + 1] < cutY) {
              const r = find(vertToRep[i]);
              let s = compStats.get(r);
              if (!s) {
                s = { minY: Infinity, sumX: 0, n: 0 };
                compStats.set(r, s);
              }
              const x = rawCoords[i * 3];
              const y = rawCoords[i * 3 + 1];
              if (y < s.minY) s.minY = y;
              s.sumX += x;
              s.n++;
            }
          }

          for (let i = 0; i < posAcc.count; i++) {
            if (rawCoords[i * 3 + 1] < cutY) {
              const s = compStats.get(find(vertToRep[i]));
              if (s && s.minY < 0.05) {
                part[i] = s.sumX / s.n > -0.015 ? 1 : 2;
              } else {
                part[i] = 3;
              }
            }
          }
        }

        for (let i = 0; i < posAcc.count; i++) {
          const off = baseOff + i * stride;
          let x = buf.readFloatLE(off);
          let y = buf.readFloatLE(off + 4);
          let z = buf.readFloatLE(off + 8);

          // 1. Scale head & crown curls around neck pivot (y = 1.455m) for true 8-heads-tall heroic proportions
          //    (masked to central column |x| < 0.24 so T-pose arms/hands are untouched)
          const headWeight = smoothstep(1.39, 1.48, y) * (1 - smoothstep(0.18, 0.25, Math.abs(x)));
          if (headWeight > 0) {
            const pivotY = 1.455;
            const sXZ = 1 - 0.20 * headWeight;
            const sY = 1 - 0.20 * headWeight;
            x *= sXZ;
            y = pivotY + (y - pivotY) * sY;
            z *= sXZ;
          }

          // 2. Tailor waist/corset & give the topological Coat Skirt (part === 3) outward/backward clearance
          //    around the legs so full-stride knee flexion never clips through the skirt.
          const waistWeight = smoothstep(0.92, 1.08, y) * (1 - smoothstep(1.22, 1.34, y)) * (1 - smoothstep(0.18, 0.26, Math.abs(x)));
          if (waistWeight > 0) {
            x *= 1 - 0.08 * waistWeight;
            z *= 1 - 0.06 * waistWeight;
          }
          const skirtBand = smoothstep(0.15, 0.28, y) * (1 - smoothstep(0.74, 0.90, y));
          if (skirtBand > 0 && part[i] === 3) {
            const cx = -0.0165;
            const cz = 0.068;
            const rx = x - cx;
            const rz = z - cz;
            const rLen = Math.hypot(rx, rz) || 1;
            const push = 0.058 * skirtBand;
            x += (rx / rLen) * push;
            z += (rz / rLen) * push;
            if (z < cz) {
              z -= 0.068 * skirtBand;
              y += 0.022 * skirtBand;
            }
          }

          buf.writeFloatLE(x, off);
          buf.writeFloatLE(y, off + 4);
          buf.writeFloatLE(z, off + 8);
          if (x < min[0]) min[0] = x;
          if (y < min[1]) min[1] = y;
          if (z < min[2]) min[2] = z;
          if (x > max[0]) max[0] = x;
          if (y > max[1]) max[1] = y;
          if (z > max[2]) max[2] = z;
        }
        posAcc.min = min;
        posAcc.max = max;
        console.log(`[${hero.id}] Refined bind-pose proportions (${posAcc.count} vertices, maxY=${max[1].toFixed(3)}m)`);

        // 3. Harmonize lower-body skinning weights (JOINTS_0 / WEIGHTS_0) using topological component isolation:
        //    - Left Leg/Boot (part === 1) gets 100% Left leg bones (0% Right leg bleed -> zero inner-boot spike!)
        //    - Right Leg/Boot (part === 2) gets 100% Right leg bones (0% Left leg bleed)
        //    - Coat Skirt (part === 3) gets 0% Foot/Toe weights (hem never twists with ankles) and smooth lateral blend
        if (prim.attributes?.JOINTS_0 !== undefined && prim.attributes?.WEIGHTS_0 !== undefined && outJson.skins?.[0]?.joints) {
          const skinJoints = outJson.skins[0].joints;
          const jointIdxByName = new Map();
          skinJoints.forEach((nodeIdx, sIdx) => {
            const name = outJson.nodes[nodeIdx]?.name;
            if (name) jointIdxByName.set(name, sIdx);
          });

          const jHips = jointIdxByName.get('Hips') ?? 0;
          const jLUp = jointIdxByName.get('LeftUpLeg') ?? 16;
          const jLLeg = jointIdxByName.get('LeftLeg') ?? 17;
          const jLFoot = jointIdxByName.get('LeftFoot') ?? 18;
          const jLToe = jointIdxByName.get('LeftToeBase') ?? 19;
          const jRUp = jointIdxByName.get('RightUpLeg') ?? 20;
          const jRLeg = jointIdxByName.get('RightLeg') ?? 21;
          const jRFoot = jointIdxByName.get('RightFoot') ?? 22;
          const jRToe = jointIdxByName.get('RightToeBase') ?? 23;
          const lowerSet = new Set([jHips, jLUp, jLLeg, jLFoot, jLToe, jRUp, jRLeg, jRFoot, jRToe]);

          const jAcc = outJson.accessors[prim.attributes.JOINTS_0];
          const wAcc = outJson.accessors[prim.attributes.WEIGHTS_0];
          const jBv = outJson.bufferViews[jAcc.bufferView];
          const wBv = outJson.bufferViews[wAcc.bufferView];
          const jBuf = bvBuffers[jAcc.bufferView];
          const wBuf = bvBuffers[wAcc.bufferView];
          const jBase = jAcc.byteOffset || 0;
          const wBase = wAcc.byteOffset || 0;
          const jStride = jBv.byteStride || 4;
          const wStride = wBv.byteStride || 16;

          let harmonizedVerts = 0;
          for (let i = 0; i < posAcc.count; i++) {
            const pOff = baseOff + i * stride;
            const x = buf.readFloatLE(pOff);
            const y = buf.readFloatLE(pOff + 4);
            if (y > 0.96) continue;

            const jOff = jBase + i * jStride;
            const wOff = wBase + i * wStride;
            let lowerWeightSum = 0;
            const upperInfluences = [];
            for (let k = 0; k < 4; k++) {
              const j = jBuf.readUInt8(jOff + k);
              const w = wBuf.readFloatLE(wOff + k * 4);
              if (w <= 0) continue;
              if (lowerSet.has(j)) {
                lowerWeightSum += w;
              } else {
                upperInfluences.push([j, w]);
              }
            }
            if (lowerWeightSum < 0.05) continue;

            const vPart = part[i];
            let wToe = 0;
            let wFoot = 0;
            let wLeg = 0;
            let wUp = 0;
            let wHip = 0;
            let tLeft = 0.5;

            if (vPart === 1 || vPart === 2) {
              // Pure topological leg/boot component: 100% single-side leg chain
              const s0 = smoothstep(0.03, 0.08, y);
              const s1 = smoothstep(0.12, 0.20, y);
              const s2 = smoothstep(0.48, 0.64, y);
              const s3 = smoothstep(0.86, 0.95, y);
              wToe = 1 - s0;
              wFoot = s0 - s1;
              wLeg = s1 - s2;
              wUp = s2 - s3;
              wHip = s3;
              tLeft = vPart === 1 ? 1.0 : 0.0;
            } else {
              // Coat Skirt & upper hip transition: 0% Foot/Toe/Leg weight so the back seam never shears or pinches between scissoring legs!
              const s3 = smoothstep(0.76, 0.94, y);
              wToe = 0;
              wFoot = 0;
              wLeg = 0;
              wUp = 0.26 * (1 - s3);
              wHip = 1 - wUp;
              tLeft = 0.35 + 0.30 * smoothstep(-0.18, 0.18, x);
            }
            const tRight = 1 - tLeft;

            const candidates = [...upperInfluences];
            const addCand = (j, w) => {
              if (w > 1e-4) candidates.push([j, w * lowerWeightSum]);
            };
            addCand(jHips, wHip);
            addCand(jLUp, wUp * tLeft);
            addCand(jRUp, wUp * tRight);
            addCand(jLLeg, wLeg * tLeft);
            addCand(jRLeg, wLeg * tRight);
            addCand(jLFoot, wFoot * tLeft);
            addCand(jRFoot, wFoot * tRight);
            addCand(jLToe, wToe * tLeft);
            addCand(jRToe, wToe * tRight);

            candidates.sort((a, b) => b[1] - a[1]);
            const top4 = candidates.slice(0, 4);
            while (top4.length < 4) top4.push([0, 0]);
            const sum4 = top4.reduce((acc, item) => acc + item[1], 0) || 1;
            for (let k = 0; k < 4; k++) {
              jBuf.writeUInt8(top4[k][0], jOff + k);
              wBuf.writeFloatLE(top4[k][1] / sum4, wOff + k * 4);
            }
            harmonizedVerts++;
          }
          console.log(`[${hero.id}] Harmonized lower-body skirt/leg skin weights on ${harmonizedVerts} vertices`);
        }
      }
    }
  }

  // Compress embedded images (2048x2048 quality 90 for baseColor texture 0; 1024x1024 quality 86 for secondary PBR maps)
  for (let imgIdx = 0; imgIdx < (outJson.images || []).length; imgIdx++) {
    const img = outJson.images[imgIdx];
    if (typeof img.bufferView === 'number') {
      const orig = bvBuffers[img.bufferView];
      const maxDim = imgIdx === 0 ? 2048 : 1024;
      const qual = imgIdx === 0 ? 90 : 86;
      const compressed = await sharp(orig)
        .resize(maxDim, maxDim, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: qual, mozjpeg: true })
        .toBuffer();
      console.log(`[${hero.id}] Compressed image[${imgIdx}] bufferView ${img.bufferView} (${maxDim}px q${qual}): ${(orig.length / 1024).toFixed(0)} KB -> ${(compressed.length / 1024).toFixed(0)} KB`);
      bvBuffers[img.bufferView] = compressed;
      img.mimeType = 'image/jpeg';
    }
  }

  function addFloatAccessor(floatArray, count, type) {
    const buf = Buffer.from(floatArray.buffer, floatArray.byteOffset, floatArray.byteLength);
    const bvIdx = bvBuffers.length;
    bvBuffers.push(buf);
    outJson.bufferViews.push({
      buffer: 0,
      byteOffset: 0,
      byteLength: buf.length
    });
    const numComp = type === 'SCALAR' ? 1 : type === 'VEC3' ? 3 : 4;
    const min = new Array(numComp).fill(Infinity);
    const max = new Array(numComp).fill(-Infinity);
    for (let i = 0; i < count; i++) {
      for (let c = 0; c < numComp; c++) {
        const v = floatArray[i * numComp + c];
        if (v < min[c]) min[c] = v;
        if (v > max[c]) max[c] = v;
      }
    }
    const accIdx = outJson.accessors.length;
    outJson.accessors.push({
      bufferView: bvIdx,
      componentType: 5126,
      count,
      type,
      min,
      max
    });
    return accIdx;
  }

  function appendAnimationFromGlb(otherGlb, targetName) {
    const srcAnim = otherGlb.json.animations?.[0];
    if (!srcAnim) throw new Error(`Missing animation for ${targetName}`);

    const accessorMap = new Map();
    const copyAccessor = (srcAccIdx) => {
      if (accessorMap.has(srcAccIdx)) return accessorMap.get(srcAccIdx);
      const srcAcc = structuredClone(otherGlb.json.accessors[srcAccIdx]);
      const srcBv = otherGlb.json.bufferViews[srcAcc.bufferView];
      const start = srcBv.byteOffset || 0;
      const slice = Buffer.from(otherGlb.bin.subarray(start, start + srcBv.byteLength));
      const newBvIdx = bvBuffers.length;
      bvBuffers.push(slice);
      outJson.bufferViews.push({
        buffer: 0,
        byteOffset: 0,
        byteLength: slice.length,
        ...(srcBv.byteStride ? { byteStride: srcBv.byteStride } : {}),
        ...(srcBv.target ? { target: srcBv.target } : {})
      });
      srcAcc.bufferView = newBvIdx;
      const newAccIdx = outJson.accessors.length;
      outJson.accessors.push(srcAcc);
      accessorMap.set(srcAccIdx, newAccIdx);
      return newAccIdx;
    };

    const samplers = srcAnim.samplers.map((s) => ({
      input: copyAccessor(s.input),
      output: copyAccessor(s.output),
      interpolation: s.interpolation || 'LINEAR'
    }));

    const channels = [];
    for (const ch of srcAnim.channels) {
      const srcNodeName = otherGlb.json.nodes[ch.target.node]?.name;
      const dstNodeIdx = srcNodeName !== undefined ? nodeNameToIndex.get(srcNodeName) : ch.target.node;
      if (dstNodeIdx === undefined) continue;
      channels.push({
        sampler: ch.sampler,
        target: {
          node: dstNodeIdx,
          path: ch.target.path
        }
      });
    }

    outJson.animations.push({
      name: targetName,
      samplers,
      channels
    });
    console.log(`[${hero.id}] Merged animation '${targetName}' (${channels.length} channels)`);
  }

  // Helper to build Ember Warden's mocap-driven 'run' (20 frames = 19 intervals, 0.63s),
  // 'run_cast' (39 frames = 38 intervals = 2 full run cycles, 1.27s), and 'idle_cast' (49 frames = 48 intervals, 1.60s):
  // - Lower body & pelvis in 'run'/'run_cast' use the true motion-captured running cycle from ember-warden-run.glb
  //   (high-knee drive, ~90-deg recovery heel kick-up in mid-air, and 6.5cm flight bounce -> true 'lari', not 'jalan cepat').
  // - Arms in 'run' use fluid, close-to-torso whip/follow-through kinematics ('luwes', 'ada animasi nya').
  // - Casting arm in 'run_cast' & 'idle_cast' performs a 4-phase horizontal crescent / underhand arcane spell-weave
  //   (Gather Across Chest -> Wide Side-Sweep Whip -> Low Hip Follow-Through -> Underhand Scoop) with a low elbow (never a straight-arm salute!).
  function buildEmberActionClip(srcGlb, clipName, intervals, mode) {
    const isIdleCast = mode === 'idle_cast';
    const isCastingMode = mode === 'run_cast' || mode === 'idle_cast';
    const frameCount = intervals + 1; // Frame 0 and Frame N are identical for 0-gap looping
    const dt = 1 / 30;
    const times = new Float32Array(frameCount);
    for (let k = 0; k < frameCount; k++) {
      times[k] = k * dt;
    }
    const timeAccIdx = addFloatAccessor(times, frameCount, 'SCALAR');

    const bindQuats = new Map();
    const bindTrans = new Map();
    const threeNodes = outJson.nodes.map((n) => {
      const o = new THREE.Object3D();
      o.name = n.name || '';
      if (n.translation) {
        o.position.set(...n.translation);
        if (n.name) bindTrans.set(n.name, [...n.translation]);
      }
      if (n.rotation) {
        o.quaternion.set(...n.rotation);
        if (n.name) bindQuats.set(n.name, new THREE.Quaternion(...n.rotation));
      }
      if (n.scale) o.scale.set(...n.scale);
      return o;
    });
    outJson.nodes.forEach((n, idx) => {
      for (const c of n.children || []) threeNodes[idx].add(threeNodes[c]);
    });
    const byName = new Map(threeNodes.map((o) => [o.name, o]));

    const srcAnim = srcGlb.json.animations[0];
    const mocapTracks = new Map();
    for (const ch of srcAnim.channels) {
      const bName = srcGlb.json.nodes[ch.target.node]?.name;
      if (bName) {
        mocapTracks.set(`${bName}:${ch.target.path}`, readFloat32Accessor(srcGlb, srcAnim.samplers[ch.sampler].output));
      }
    }
    const getMocapQuat = (bName, fIdx) => {
      const tr = mocapTracks.get(`${bName}:rotation`);
      if (!tr) return bindQuats.get(bName).clone();
      const idx = Math.min(tr.count - 1, fIdx) * 4;
      return new THREE.Quaternion(tr.floats[idx], tr.floats[idx + 1], tr.floats[idx + 2], tr.floats[idx + 3]);
    };
    const getMocapTrans = (bName, fIdx) => {
      const tr = mocapTracks.get(`${bName}:translation`);
      if (!tr) return bindTrans.get(bName) || [0, 100, 0];
      const idx = Math.min(tr.count - 1, fIdx) * 3;
      return [tr.floats[idx], tr.floats[idx + 1], tr.floats[idx + 2]];
    };

    const deg = (d) => (d * Math.PI) / 180;
    const setRelEuler = (name, rx, ry, rz, baseOverrideQ = null) => {
      const obj = byName.get(name);
      const bq = (baseOverrideQ || bindQuats.get(name)).clone();
      const dq = new THREE.Quaternion().setFromEuler(new THREE.Euler(deg(rx), deg(ry), deg(rz), 'XYZ'));
      obj.quaternion.copy(bq.multiply(dq));
    };

    const orientBoneWorldY = (name, targetDirWorld, rollDeg = 0) => {
      const boneObj = byName.get(name);
      threeNodes[0].updateMatrixWorld(true);
      const parentWorldQ = new THREE.Quaternion();
      boneObj.parent.getWorldQuaternion(parentWorldQ);
      const bindLocalQ = bindQuats.get(name).clone();
      const bindWorldQ = parentWorldQ.clone().multiply(bindLocalQ);
      const curY = new THREE.Vector3(0, 1, 0).applyQuaternion(bindWorldQ).normalize();
      const tgtY = targetDirWorld.clone().normalize();
      const rotWorld = new THREE.Quaternion().setFromUnitVectors(curY, tgtY);
      let newWorldQ = rotWorld.multiply(bindWorldQ);
      if (rollDeg !== 0) {
        const rollQ = new THREE.Quaternion().setFromAxisAngle(tgtY, deg(rollDeg));
        newWorldQ = rollQ.multiply(newWorldQ);
      }
      boneObj.quaternion.copy(parentWorldQ.clone().invert().multiply(newWorldQ));
      threeNodes[0].updateMatrixWorld(true);
    };

    const trackedBones = [
      'Hips',
      'Spine02',
      'Spine01',
      'Spine',
      'neck',
      'Head',
      'LeftShoulder',
      'LeftArm',
      'LeftForeArm',
      'LeftHand',
      'RightShoulder',
      'RightArm',
      'RightForeArm',
      'RightHand',
      'LeftUpLeg',
      'LeftLeg',
      'LeftFoot',
      'LeftToeBase',
      'RightUpLeg',
      'RightLeg',
      'RightFoot',
      'RightToeBase'
    ];

    const rotTracks = new Map(trackedBones.map((b) => [b, new Float32Array(frameCount * 4)]));
    const hipsTransTrack = new Float32Array(frameCount * 3);
    const baseHipsT = bindTrans.get('Hips') || [-1.51, 106.23, 7.12];
    const mocapHips0 = getMocapTrans('Hips', 0);

    for (let k = 0; k < frameCount; k++) {
      const mFrame = isIdleCast ? k % intervals : k % 19;
      const th = isIdleCast ? (2 * Math.PI * (k % intervals)) / intervals : (2 * Math.PI * mFrame) / 19;
      const castTh = (2 * Math.PI * (k % intervals)) / intervals;

      // Reset all nodes to bind pose before solving frame k
      for (const [bName, bq] of bindQuats.entries()) {
        byName.get(bName).quaternion.copy(bq);
      }

      if (isIdleCast) {
        // 1A. Idle Cast Lower Body & Pelvis: grounded combat-casting stance with subtle breathing/weight shift
        const hipsX = baseHipsT[0] + 0.8 * Math.sin(castTh);
        const hipsY = baseHipsT[1] - 1.2 + 1.1 * Math.cos(castTh);
        const hipsZ = baseHipsT[2] + 0.9 * Math.sin(castTh - 0.4);
        byName.get('Hips').position.set(hipsX, hipsY, hipsZ);
        hipsTransTrack[k * 3] = hipsX;
        hipsTransTrack[k * 3 + 1] = hipsY;
        hipsTransTrack[k * 3 + 2] = hipsZ;

        setRelEuler('Hips', 2.0 * Math.sin(castTh), -6.0 * Math.cos(castTh), 1.5 * Math.sin(castTh));
        const castYaw = -10.0 * Math.cos(castTh - 0.3);
        setRelEuler('Spine02', 3.0 * Math.sin(castTh - 0.2), castYaw * 0.35, -1.5 * Math.sin(castTh));
        setRelEuler('Spine01', 2.5 * Math.sin(castTh - 0.2), castYaw * 0.35, -1.2 * Math.sin(castTh));
        setRelEuler('Spine', 2.0 * Math.sin(castTh - 0.2), castYaw * 0.30, 0);
        setRelEuler('neck', -2.0 * Math.sin(castTh - 0.2), -castYaw * 0.45, 0);
        setRelEuler('Head', -3.0 * Math.sin(castTh - 0.2), -castYaw * 0.55, 1.5 * Math.cos(castTh));

        for (const side of ['Left', 'Right']) {
          for (const limb of ['UpLeg', 'Leg', 'Foot', 'ToeBase']) {
            const bName = `${side}${limb}`;
            byName.get(bName).quaternion.copy(getMocapQuat(bName, mFrame));
          }
        }
      } else {
        // 1B. Run & Run_Cast Pelvis (Hips), Spine & Lower Body from ember-warden-run.glb:
        //     True running ('lari') with 6.5cm flight bounce, wide high-knee drive, and mid-air recovery heel kick-up
        const mHipsT = getMocapTrans('Hips', mFrame);
        const hipsX = baseHipsT[0] + (mHipsT[0] - mocapHips0[0]) * 0.35;
        const hipsY = mHipsT[1] - 1.8;
        const hipsZ = baseHipsT[2] + (mHipsT[2] - mocapHips0[2]) * 0.35;
        byName.get('Hips').position.set(hipsX, hipsY, hipsZ);
        hipsTransTrack[k * 3] = hipsX;
        hipsTransTrack[k * 3 + 1] = hipsY;
        hipsTransTrack[k * 3 + 2] = hipsZ;

        byName.get('Hips').quaternion.copy(getMocapQuat('Hips', mFrame));

        const castYaw = isCastingMode ? deg(-8 * Math.cos(castTh - 0.3)) : 0;
        for (const spBone of ['Spine02', 'Spine01', 'Spine']) {
          const mq = getMocapQuat(spBone, mFrame);
          const leanQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(deg(1.8), castYaw * 0.35, 0, 'XYZ'));
          byName.get(spBone).quaternion.copy(mq.multiply(leanQ));
        }
        for (const hdBone of ['neck', 'Head']) {
          const mq = getMocapQuat(hdBone, mFrame);
          const compQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(deg(-2.2), -castYaw * 0.45, 0, 'XYZ'));
          byName.get(hdBone).quaternion.copy(mq.multiply(compQ));
        }

        for (const side of ['Left', 'Right']) {
          const bqUp = bindQuats.get(`${side}UpLeg`);
          const mqUp = getMocapQuat(`${side}UpLeg`, mFrame);
          byName.get(`${side}UpLeg`).quaternion.copy(bqUp.clone().slerp(mqUp, 1.08));

          const bqLeg = bindQuats.get(`${side}Leg`);
          const mqLeg = getMocapQuat(`${side}Leg`, mFrame);
          byName.get(`${side}Leg`).quaternion.copy(bqLeg.clone().slerp(mqLeg, 0.65));

          const bqFoot = bindQuats.get(`${side}Foot`);
          const mqFoot = getMocapQuat(`${side}Foot`, mFrame);
          byName.get(`${side}Foot`).quaternion.copy(bqFoot.clone().slerp(mqFoot, 0.85));

          const bqToe = bindQuats.get(`${side}ToeBase`);
          const mqToe = getMocapQuat(`${side}ToeBase`, mFrame);
          byName.get(`${side}ToeBase`).quaternion.copy(bqToe.clone().slerp(mqToe, 0.85));
        }
      }

      // 2. Fluid, Graceful ('luwes'), Visibly Animated ('ada animasi nya') Arms:
      const phi = th - (3.5 / 19) * 2 * Math.PI;
      const lPhase = phi + Math.PI;
      const rPhase = phi;

      const solveFluidRunArm = (side, p) => {
        const sideSign = side === 'Left' ? 1 : -1;
        const swing = Math.cos(p);          // +1 at front of swing, -1 at back of swing
        const whip = Math.cos(p - 0.50);    // phase-lagged forearm flexion/extension wave (overlapping action)
        const u = Math.max(0, Math.min(1, 0.5 + 0.5 * whip));

        setRelEuler(`${side}Shoulder`, -3 - 2 * swing, sideSign * (5 * swing), -sideSign * 3);

        // Upper arm stays anchored low along ribcage (y = -0.80..-0.95), swinging from behind hip to waist
        const upperX = sideSign * (0.24 * (1 - u) + 0.20 * u);
        const upperY = -0.78 * (1 - u) - 0.95 * u;
        const upperZ = -0.54 * (1 - (0.5 + 0.5 * swing)) + 0.14 * (0.5 + 0.5 * swing);
        orientBoneWorldY(`${side}Arm`, new THREE.Vector3(upperX, upperY, upperZ));

        // Forearm sweeps from open behind the hip (u=0) to curved inward across the waist (u=1) — never pointing straight out!
        const foreX = sideSign * (0.20 * (1 - u) - 0.34 * u);
        const foreY = -0.88 * (1 - u) - 0.58 * u;
        const foreZ = -0.42 * (1 - u) + 0.74 * u;
        orientBoneWorldY(`${side}ForeArm`, new THREE.Vector3(foreX, foreY, foreZ));

        const wristWave = Math.cos(p - 1.0);
        setRelEuler(`${side}Hand`, -10 * wristWave, sideSign * 8 * wristWave, sideSign * 10 * Math.sin(p - 0.8));
      };

      if (isIdleCast) {
        // Left arm in idle_cast: graceful arcane counterbalance wave at waist/rib level
        const lw = 0.5 + 0.5 * Math.sin(castTh);
        setRelEuler('LeftShoulder', -2, -4 * Math.cos(castTh), -2);
        orientBoneWorldY('LeftArm', new THREE.Vector3(0.24 + 0.08 * lw, -0.92, -0.10 + 0.18 * (1 - lw)));
        orientBoneWorldY('LeftForeArm', new THREE.Vector3(0.28 * lw - 0.12 * (1 - lw), -0.68 - 0.18 * lw, 0.68));
        setRelEuler('LeftHand', 12 * Math.sin(castTh), 10 * Math.cos(castTh), 0);
      } else {
        solveFluidRunArm('Left', lPhase);
      }

      if (!isCastingMode) {
        solveFluidRunArm('Right', rPhase);
      } else {
        // 4-Pose Curved-Elbow Arcane Conjuration & Throw Cycle on Right Arm (Ember Gauntlet):
        // Pose 0 (castTh = 0):       Wind-up charge at chest (elbow drawn back-low, forearm bent 85 deg inward to heart)
        // Pose 1 (castTh = PI/2):    Curved sidearm whip forward (elbow angled down-outward, forearm curved 60 deg inward)
        // Pose 2 (castTh = PI):      Cross-body downward follow-through slash
        // Pose 3 (castTh = 3*PI/2):  Low underhand ember scoop back toward chest
        // Crucially: Elbow is ALWAYS bent (55..85 deg) and upper arm always points down-outward -> NEVER a straight-arm salute!
        const c = Math.cos(castTh);
        const s = Math.sin(castTh);
        const c2 = Math.cos(2 * castTh);
        setRelEuler('RightShoulder', -3 - 4 * c + 3 * s, -8 * s + 5 * c, 3 * c);

        const rUpperDir = new THREE.Vector3(
          -0.39 + 0.12 * c - 0.10 * s - 0.03 * c2,
          -0.845 - 0.02 * c + 0.07 * s + 0.005 * c2,
          -0.02 - 0.29 * c + 0.35 * s - 0.09 * c2
        );
        const rForeDir = new THREE.Vector3(
          0.02 + 0.68 * c - 0.16 * s - 0.02 * c2,
          -0.03 + 0.30 * c + 0.50 * s + 0.05 * c2,
          0.7575 - 0.01 * c + 0.055 * s - 0.0875 * c2
        );
        orientBoneWorldY('RightArm', rUpperDir);
        orientBoneWorldY('RightForeArm', rForeDir);
        setRelEuler('RightHand', 20 * s - 10 * c, -16 * c, 24 * Math.sin(castTh - 0.4));
      }

      for (const bName of trackedBones) {
        const q = byName.get(bName).quaternion;
        const dst = rotTracks.get(bName);
        dst[k * 4] = q.x;
        dst[k * 4 + 1] = q.y;
        dst[k * 4 + 2] = q.z;
        dst[k * 4 + 3] = q.w;
      }
    }

    const samplers = [];
    const channels = [];

    const hipsIdx = nodeNameToIndex.get('Hips');
    if (hipsIdx !== undefined) {
      const transAccIdx = addFloatAccessor(hipsTransTrack, frameCount, 'VEC3');
      const sIdx = samplers.length;
      samplers.push({ input: timeAccIdx, output: transAccIdx, interpolation: 'LINEAR' });
      channels.push({ sampler: sIdx, target: { node: hipsIdx, path: 'translation' } });
    }

    for (const bName of trackedBones) {
      const nodeIdx = nodeNameToIndex.get(bName);
      if (nodeIdx === undefined) continue;
      const rotAccIdx = addFloatAccessor(rotTracks.get(bName), frameCount, 'VEC4');
      const sIdx = samplers.length;
      samplers.push({ input: timeAccIdx, output: rotAccIdx, interpolation: 'LINEAR' });
      channels.push({ sampler: sIdx, target: { node: nodeIdx, path: 'rotation' } });
    }

    outJson.animations.push({
      name: clipName,
      samplers,
      channels
    });
    console.log(`[${hero.id}] Built mocap-stride + fluid-arm '${clipName}' (${channels.length} channels, ${frameCount} frames / ${(intervals * dt).toFixed(2)}s)`);
  }

  // 1. Base animation is 'idle'
  outJson.animations[0].name = 'idle';

  // 2. Append or synthesize 'run'
  const runGlb = parseGlb(await fs.readFile(path.join(RAW_DIR, `${hero.id}-run.glb`)));
  if (hero.id === 'ember-warden') {
    buildEmberActionClip(runGlb, 'run', 19, 'run');
  } else {
    appendAnimationFromGlb(runGlb, 'run');
  }

  // 3. Append or synthesize 'idle_cast'
  const castGlb = parseGlb(await fs.readFile(path.join(RAW_DIR, `${hero.id}-cast.glb`)));
  if (hero.id === 'ember-warden') {
    buildEmberActionClip(base, 'idle_cast', 48, 'idle_cast');
  } else {
    appendAnimationFromGlb(castGlb, 'idle_cast');
  }

  // 4. Synthesize 'run_cast' (Run While Casting)
  if (hero.id === 'ember-warden') {
    buildEmberActionClip(runGlb, 'run_cast', 38, 'run_cast');
  } else {
    const FRAMES = 60;
    const DT = 1 / 30;
    const times = new Float32Array(FRAMES);
    for (let i = 0; i < FRAMES; i++) {
      times[i] = i * DT;
    }
    const timeAccIdx = addFloatAccessor(times, FRAMES, 'SCALAR');

    const runAnim = runGlb.json.animations[0];
    const castAnim = castGlb.json.animations[0];

    const runChannelMap = new Map();
    for (const ch of runAnim.channels) {
      const bone = runGlb.json.nodes[ch.target.node]?.name;
      if (bone) runChannelMap.set(`${bone}:${ch.target.path}`, ch);
    }

    const castChannelMap = new Map();
    for (const ch of castAnim.channels) {
      const bone = castGlb.json.nodes[ch.target.node]?.name;
      if (bone) castChannelMap.set(`${bone}:${ch.target.path}`, ch);
    }

    const samplers = [];
    const channels = [];

    for (const [key, runCh] of runChannelMap.entries()) {
      const [bone, propPath] = key.split(':');
      const dstNodeIdx = nodeNameToIndex.get(bone);
      if (dstNodeIdx === undefined) continue;

      const isLowerBody = LOWER_BODY_BONES.has(bone);
      const castCh = castChannelMap.get(key);

      if (isLowerBody || !castCh) {
        const src = readFloat32Accessor(runGlb, runAnim.samplers[runCh.sampler].output);
        const nComp = src.numComponents;
        const cycleLen = Math.max(1, src.count - 1);
        const outFloats = new Float32Array(FRAMES * nComp);
        for (let f = 0; f < FRAMES; f++) {
          const srcFrame = f % cycleLen;
          for (let c = 0; c < nComp; c++) {
            outFloats[f * nComp + c] = src.floats[srcFrame * nComp + c];
          }
        }
        const outAccIdx = addFloatAccessor(outFloats, FRAMES, src.type);
        const samplerIdx = samplers.length;
        samplers.push({ input: timeAccIdx, output: outAccIdx, interpolation: 'LINEAR' });
        channels.push({ sampler: samplerIdx, target: { node: dstNodeIdx, path: propPath } });
      } else {
        const src = readFloat32Accessor(castGlb, castAnim.samplers[castCh.sampler].output);
        const nComp = src.numComponents;
        const outFloats = new Float32Array(FRAMES * nComp);
        const startOffset = Math.min(4, Math.max(0, src.count - FRAMES));
        for (let f = 0; f < FRAMES; f++) {
          const srcFrame = Math.min(src.count - 1, startOffset + f);
          for (let c = 0; c < nComp; c++) {
            outFloats[f * nComp + c] = src.floats[srcFrame * nComp + c];
          }
        }
        const BLEND_LEN = 8;
        const firstVec = Array.from(outFloats.subarray(0, nComp));
        for (let b = 0; b < BLEND_LEN; b++) {
          const f = FRAMES - BLEND_LEN + b;
          const t = (b + 1) / (BLEND_LEN + 1);
          const curVec = Array.from(outFloats.subarray(f * nComp, (f + 1) * nComp));
          const blended =
            propPath === 'rotation' && nComp === 4
              ? slerpQuat(curVec, firstVec, t)
              : curVec.map((v, idx) => v + (firstVec[idx] - v) * t);
          for (let c = 0; c < nComp; c++) {
            outFloats[f * nComp + c] = blended[c];
          }
        }
        const outAccIdx = addFloatAccessor(outFloats, FRAMES, src.type);
        const samplerIdx = samplers.length;
        samplers.push({ input: timeAccIdx, output: outAccIdx, interpolation: 'LINEAR' });
        channels.push({ sampler: samplerIdx, target: { node: dstNodeIdx, path: propPath } });
      }
    }

    outJson.animations.push({
      name: 'run_cast',
      samplers,
      channels
    });
    console.log(`[${hero.id}] Synthesized 'run_cast' (${channels.length} channels, 60 frames / 2.00s)`);
  }

  // 5. Append 'hit' and 'death'
  const hitGlb = parseGlb(await fs.readFile(path.join(RAW_DIR, `${hero.id}-hit.glb`)));
  appendAnimationFromGlb(hitGlb, 'hit');

  const deathGlb = parseGlb(await fs.readFile(path.join(RAW_DIR, `${hero.id}-death.glb`)));
  appendAnimationFromGlb(deathGlb, 'death');

  // 6. Post-process animation channels in outJson.animations:
  //    - Normalize all sampler input timestamps to start at t = 0.000s (eliminates 33ms loop clamp dead-zone).
  //    - For 'idle_cast' (and Rift Runner 'run_cast'): temper overhead arm spike toward forward-aimed cast pose.
  //    - For 'idle_cast', 'hit', and 'death': anchor horizontal Hips X/Z root-motion drift so the hero stays centered.
  {
    const smoothArch = (t, t0, t1, t2, t3) => {
      if (t <= t0 || t >= t3) return 0;
      if (t < t1) {
        const u = (t - t0) / (t1 - t0);
        return u * u * (3 - 2 * u);
      }
      if (t <= t2) return 1;
      const u = 1 - (t - t2) / (t3 - t2);
      return u * u * (3 - 2 * u);
    };

    const readOutAcc = (accIdx) => {
      const acc = outJson.accessors[accIdx];
      const buf = bvBuffers[acc.bufferView];
      const start = acc.byteOffset || 0;
      const nComp = acc.type === 'SCALAR' ? 1 : acc.type === 'VEC3' ? 3 : 4;
      const arr = new Float32Array(acc.count * nComp);
      for (let i = 0; i < arr.length; i++) {
        arr[i] = buf.readFloatLE(start + i * 4);
      }
      return { acc, buf, start, nComp, count: acc.count, arr };
    };

    const writeOutAcc = ({ acc, buf, start, nComp, count, arr }) => {
      const min = new Array(nComp).fill(Infinity);
      const max = new Array(nComp).fill(-Infinity);
      for (let i = 0; i < count; i++) {
        for (let c = 0; c < nComp; c++) {
          const v = arr[i * nComp + c];
          buf.writeFloatLE(v, start + (i * nComp + c) * 4);
          if (v < min[c]) min[c] = v;
          if (v > max[c]) max[c] = v;
        }
      }
      acc.min = min;
      acc.max = max;
    };

    // Normalize all animation input time accessors so t[0] === 0.000s
    const shiftedTimeAccessors = new Set();
    for (const anim of outJson.animations) {
      for (const s of anim.samplers) {
        if (shiftedTimeAccessors.has(s.input)) continue;
        shiftedTimeAccessors.add(s.input);
        const inData = readOutAcc(s.input);
        if (inData.count > 0 && inData.arr[0] > 1e-4) {
          const t0 = inData.arr[0];
          for (let i = 0; i < inData.count; i++) {
            inData.arr[i] = Math.max(0, inData.arr[i] - t0);
          }
          writeOutAcc(inData);
        }
      }
    }

    const idleAnim = outJson.animations[0];
    let idleHipsPos = [0, 99, 8];
    for (const ch of idleAnim.channels) {
      const bone = outJson.nodes[ch.target.node]?.name;
      if (bone === 'Hips' && ch.target.path === 'translation') {
        const outData = readOutAcc(idleAnim.samplers[ch.sampler].output);
        if (outData.nComp === 3) {
          idleHipsPos = Array.from(outData.arr.subarray(0, 3));
        }
      }
    }

    for (const anim of outJson.animations) {
      if (hero.id === 'ember-warden' && (anim.name === 'run' || anim.name === 'run_cast' || anim.name === 'idle_cast')) {
        // Already synthesized with exact biomechanical gait, fluid casting arm & centered Hips
        continue;
      }
      const isCast = anim.name === 'idle_cast' || anim.name === 'run_cast';

      for (const ch of anim.channels) {
        const bone = outJson.nodes[ch.target.node]?.name;
        if (!bone) continue;
        const sampler = anim.samplers[ch.sampler];
        const inData = readOutAcc(sampler.input);
        const outData = readOutAcc(sampler.output);
        const { arr, count, nComp } = outData;
        let modified = false;

        // Cast overhead arm tailoring ('idle_cast' & Rift Runner 'run_cast'):
        // Temper overhead reach while preserving continuous fluid ('luwes') arm & forearm motion (never freezing to a static straight-arm pose)
        if (
          isCast &&
          ch.target.path === 'rotation' &&
          nComp === 4 &&
          (bone === 'RightShoulder' ||
            bone === 'RightArm' ||
            bone === 'RightForeArm' ||
            bone === 'RightHand' ||
            bone === 'Spine' ||
            bone === 'Spine01' ||
            bone === 'Spine02')
        ) {
          // Reference two distinct curved-elbow keyframes (f=4 wind-up and f=42 release) so the arm keeps moving through an arc
          const fA = Math.min(count - 1, 4);
          const fB = Math.min(count - 1, 42);
          const qA = [arr[fA * 4], arr[fA * 4 + 1], arr[fA * 4 + 2], arr[fA * 4 + 3]];
          const qB = [arr[fB * 4], arr[fB * 4 + 1], arr[fB * 4 + 2], arr[fB * 4 + 3]];

          const tStart = anim.name === 'run_cast' ? 0.17 : 0.26;
          const tPeak0 = anim.name === 'run_cast' ? 0.39 : 0.48;
          const tPeak1 = anim.name === 'run_cast' ? 1.17 : 1.18;
          const tEnd = anim.name === 'run_cast' ? 1.49 : 1.52;
          const maxW = bone.startsWith('Spine') ? 0.50 : bone === 'RightForeArm' ? 0.78 : 0.68;

          for (let f = 0; f < count; f++) {
            const t = inData.arr[f];
            const w = maxW * smoothArch(t, tStart, tPeak0, tPeak1, tEnd);
            if (w > 1e-4) {
              const sweep = 0.5 + 0.5 * Math.sin(((t - tStart) / Math.max(0.1, tEnd - tStart)) * Math.PI * 1.5 - 0.4);
              const dynTargetQ = slerpQuat(qA, qB, Math.max(0, Math.min(1, sweep)));
              const curQ = [arr[f * 4], arr[f * 4 + 1], arr[f * 4 + 2], arr[f * 4 + 3]];
              const q = slerpQuat(curQ, dynTargetQ, w);
              arr[f * 4] = q[0];
              arr[f * 4 + 1] = q[1];
              arr[f * 4 + 2] = q[2];
              arr[f * 4 + 3] = q[3];
              modified = true;
            }
          }
        }

        // Anchor Hips translation horizontal drift so cast / hit / death / run stay inside the sprite frame
        if (bone === 'Hips' && ch.target.path === 'translation' && nComp === 3 && anim.name !== 'idle') {
          const [bx, by, bz] = idleHipsPos;
          const maxHoriz = anim.name === 'hit' || anim.name === 'death' ? 5.0 : 2.5;
          for (let f = 0; f < count; f++) {
            const dx = Math.max(-maxHoriz, Math.min(maxHoriz, (arr[f * 3] - bx) * 0.35));
            const dz = Math.max(-maxHoriz, Math.min(maxHoriz, (arr[f * 3 + 2] - bz) * 0.35));
            arr[f * 3] = bx + dx;
            arr[f * 3 + 2] = bz + dz;
            if (anim.name === 'idle_cast') {
              arr[f * 3 + 1] = by + (arr[f * 3 + 1] - by) * 0.50;
            }
          }
          modified = true;
        }

        // Seamless end-of-clip loop blend on 'idle_cast' so the end of the cast animation never pops
        if (anim.name === 'idle_cast' && count >= 16) {
          const blendLen = 10;
          const firstVec = Array.from(arr.subarray(0, nComp));
          for (let b = 0; b < blendLen; b++) {
            const f = count - blendLen + b;
            const t = (b + 1) / (blendLen + 1);
            const curVec = Array.from(arr.subarray(f * nComp, (f + 1) * nComp));
            const blended =
              ch.target.path === 'rotation' && nComp === 4
                ? slerpQuat(curVec, firstVec, t)
                : curVec.map((v, idx) => v + (firstVec[idx] - v) * t);
            for (let c = 0; c < nComp; c++) {
              arr[f * nComp + c] = blended[c];
            }
          }
          modified = true;
        }

        if (modified) {
          writeOutAcc(outData);
        }
      }
    }
  }

  // Repack all bufferViews with 4-byte alignment
  const chunks = [];
  let offset = 0;
  for (let i = 0; i < bvBuffers.length; i++) {
    const raw = bvBuffers[i];
    outJson.bufferViews[i].buffer = 0;
    outJson.bufferViews[i].byteOffset = offset;
    outJson.bufferViews[i].byteLength = raw.length;
    const padded = pad4(raw, 0x00);
    chunks.push(padded);
    offset += padded.length;
  }
  const mergedBin = Buffer.concat(chunks);
  outJson.buffers = [{ byteLength: mergedBin.length }];

  const outGlbPath = path.join(OUT_DIR, `${hero.id}.glb`);
  const outGlbBuf = buildGlb(outJson, mergedBin);
  await fs.writeFile(outGlbPath, outGlbBuf);
  console.log(`Wrote unified ${outGlbPath}: ${(outGlbBuf.length / 1024).toFixed(1)} KB with ${outJson.animations.length} animations!`);

  return {
    hero: hero.id,
    name: hero.name,
    ai_model: 'meshy-t2.5',
    model_type: 'smart-topology',
    glb: `/assets/characters/3d/${hero.id}.glb`,
    thumbnail: `/assets/characters/3d/${hero.id}-3d-thumb.png`,
    fileSizeKB: +(outGlbBuf.length / 1024).toFixed(1),
    animations: CLIPS
  };
}

async function main() {
  await fs.mkdir(RAW_DIR, { recursive: true });
  await fs.mkdir(OUT_DIR, { recursive: true });

  const heroesOut = {};
  for (const h of HERO_LIST) {
    const res = await buildHeroGlb(h);
    if (res) heroesOut[h.id] = res;
  }

  const manifest = {
    ai_model: 'meshy-t2.5',
    model_type: 'smart-topology',
    heroes: heroesOut,
    animations: CLIPS
  };
  await fs.writeFile(path.join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
