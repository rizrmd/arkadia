import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const RAW_DIR = path.resolve('assets-src/3d-heroes/raw');
const OUT_DIR = path.resolve('public/assets/characters/3d');

const CLIPS = [
  { slug: 'idle', label: 'Idle', loop: true },
  { slug: 'walk', label: 'Walk', loop: true },
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

          // 2. Tailor waist/corset & give outer skirt subtle outward clearance around legs so legs never clip skirt
          const waistWeight = smoothstep(0.92, 1.08, y) * (1 - smoothstep(1.22, 1.34, y)) * (1 - smoothstep(0.18, 0.26, Math.abs(x)));
          if (waistWeight > 0) {
            x *= 1 - 0.08 * waistWeight;
            z *= 1 - 0.06 * waistWeight;
          }
          const skirtBand = smoothstep(0.15, 0.26, y) * (1 - smoothstep(0.76, 0.90, y));
          if (skirtBand > 0) {
            const dLeft = Math.hypot(x - 0.045, z - 0.068);
            const dRight = Math.hypot(x + 0.078, z - 0.068);
            const dLeg = Math.min(dLeft, dRight);
            const isOuterSkirt = smoothstep(0.085, 0.14, dLeg);
            if (isOuterSkirt > 0) {
              const cx = -0.0165;
              const cz = 0.068;
              const rx = x - cx;
              const rz = z - cz;
              const rLen = Math.hypot(rx, rz) || 1;
              const push = 0.016 * skirtBand * isOuterSkirt;
              x += (rx / rLen) * push;
              z += (rz / rLen) * push;
              if (z < cz) {
                z -= 0.012 * skirtBand * isOuterSkirt;
              }
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

        // 3. Harmonize lower-body skinning weights (JOINTS_0 / WEIGHTS_0) so outer skirt and inner leg at any (x, y)
        //    share an identical partition-of-unity bone blend and can never cross or clip through each other during run.
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

            // Partition of unity in Y across non-overlapping smoothstep bands:
            // [0.03..0.09] Toe->Foot, [0.13..0.22] Foot->Leg, [0.48..0.64] Leg->UpLeg (at knee y=0.59m), [0.88..0.96] UpLeg->Hips
            const s0 = smoothstep(0.03, 0.09, y);
            const s1 = smoothstep(0.13, 0.22, y);
            const s2 = smoothstep(0.48, 0.64, y);
            const s3 = smoothstep(0.88, 0.96, y);

            const wToe = 1 - s0;
            const wFoot = s0 - s1;
            const wLeg = s1 - s2;
            const wUp = s2 - s3;
            const wHip = s3;

            // Clean sagittal split centered at x = -0.0165 (midpoint between LeftUpLeg +0.033 and RightUpLeg -0.066)
            const tLeft = smoothstep(-0.032, 0.000, x);
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

  // 1. Base animation is 'idle'
  outJson.animations[0].name = 'idle';

  // 2. Append 'walk' and 'run'
  const walkGlb = parseGlb(await fs.readFile(path.join(RAW_DIR, `${hero.id}-walk.glb`)));
  appendAnimationFromGlb(walkGlb, 'walk');

  const runGlb = parseGlb(await fs.readFile(path.join(RAW_DIR, `${hero.id}-run.glb`)));
  appendAnimationFromGlb(runGlb, 'run');

  // 3. Append 'idle_cast'
  const castGlb = parseGlb(await fs.readFile(path.join(RAW_DIR, `${hero.id}-cast.glb`)));
  appendAnimationFromGlb(castGlb, 'idle_cast');

  // 4. Synthesize 'run_cast' (Run While Casting)
  {
    const FRAMES = 60;
    const DT = 1 / 30;
    const times = new Float32Array(FRAMES);
    for (let i = 0; i < FRAMES; i++) {
      times[i] = (i + 1) * DT;
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
        const outFloats = new Float32Array(FRAMES * nComp);
        for (let f = 0; f < FRAMES; f++) {
          const srcFrame = f % src.count;
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
  //    - For Ember Warden 'run', 'run_cast', and 'walk': temper extreme marathon back-kick on LeftLeg/RightLeg
  //      and LeftUpLeg/RightUpLeg so her boots/shins stride cleanly inside her floor-length skirt without folding
  //      or poking through the coat.
  //    - For 'idle_cast' and 'run_cast': temper overhead arm spike (t = 0.50s..1.35s) toward the forward-aimed
  //      cast pose so RightForeArm/RightHand stay inside the 228x206 isometric camera frame and loop seamlessly.
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

    // Extract true symmetric bind-pose rotations from outJson.nodes (where skin deformation is identity)
    // and baseline Hips height from 'idle'
    const idleAnim = outJson.animations[0];
    const bindRot = new Map();
    for (const n of outJson.nodes) {
      if (n.name && Array.isArray(n.rotation) && n.rotation.length === 4) {
        bindRot.set(n.name, [...n.rotation]);
      }
    }
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
      const isRunLike = anim.name === 'run' || anim.name === 'run_cast';
      const isWalk = anim.name === 'walk';
      const isCast = anim.name === 'idle_cast' || anim.name === 'run_cast';

      for (const ch of anim.channels) {
        const bone = outJson.nodes[ch.target.node]?.name;
        if (!bone) continue;
        const sampler = anim.samplers[ch.sampler];
        const inData = readOutAcc(sampler.input);
        const outData = readOutAcc(sampler.output);
        const { arr, count, nComp } = outData;
        let modified = false;

        // A. Ember Warden lower-body stride tailoring (slerp from symmetric bind-pose rotation so legs/boots
        //    stride cleanly forward/back inside her floor-length skirt with zero sideways twist or clipping)
        if (hero.id === 'ember-warden' && (isRunLike || isWalk) && ch.target.path === 'rotation' && nComp === 4) {
          const baseQ = bindRot.get(bone);
          if (baseQ) {
            let keepFactor = null;
            if (bone === 'LeftLeg' || bone === 'RightLeg') {
              keepFactor = isRunLike ? 0.24 : 0.45;
            } else if (bone === 'LeftUpLeg' || bone === 'RightUpLeg') {
              keepFactor = isRunLike ? 0.62 : 0.78;
            } else if (bone === 'LeftFoot' || bone === 'RightFoot') {
              keepFactor = isRunLike ? 0.50 : 0.70;
            }
            if (keepFactor !== null) {
              for (let f = 0; f < count; f++) {
                const curQ = [arr[f * 4], arr[f * 4 + 1], arr[f * 4 + 2], arr[f * 4 + 3]];
                const q = slerpQuat(baseQ, curQ, keepFactor);
                arr[f * 4] = q[0];
                arr[f * 4 + 1] = q[1];
                arr[f * 4 + 2] = q[2];
                arr[f * 4 + 3] = q[3];
              }
              modified = true;
            }
          }
        }

        // B. Cast overhead arm tailoring ('idle_cast' & 'run_cast'): keep casting arm aimed forward inside canvas frame
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
          // Find frame closest to t = 0.36s (compact forward-aimed cast pose before overhead/wide swing)
          const targetT = anim.name === 'run_cast' ? 0.23 : 0.36;
          let anchorF = 0;
          let bestDist = Infinity;
          for (let f = 0; f < count; f++) {
            const d = Math.abs(inData.arr[f] - targetT);
            if (d < bestDist) {
              bestDist = d;
              anchorF = f;
            }
          }
          const anchorQ = [
            arr[anchorF * 4],
            arr[anchorF * 4 + 1],
            arr[anchorF * 4 + 2],
            arr[anchorF * 4 + 3]
          ];
          const tStart = anim.name === 'run_cast' ? 0.20 : 0.33;
          const tPeak0 = anim.name === 'run_cast' ? 0.42 : 0.55;
          const tPeak1 = anim.name === 'run_cast' ? 1.20 : 1.32;
          const tEnd = anim.name === 'run_cast' ? 1.52 : 1.65;
          const maxW = bone.startsWith('Spine') ? 0.55 : 0.88;

          for (let f = 0; f < count; f++) {
            const t = inData.arr[f];
            const w = maxW * smoothArch(t, tStart, tPeak0, tPeak1, tEnd);
            if (w > 1e-4) {
              const curQ = [arr[f * 4], arr[f * 4 + 1], arr[f * 4 + 2], arr[f * 4 + 3]];
              const q = slerpQuat(curQ, anchorQ, w);
              arr[f * 4] = q[0];
              arr[f * 4 + 1] = q[1];
              arr[f * 4 + 2] = q[2];
              arr[f * 4 + 3] = q[3];
              modified = true;
            }
          }
        }

        // C. Anchor Hips translation horizontal drift so cast / hit / death / run stay inside the sprite frame
        if (bone === 'Hips' && ch.target.path === 'translation' && nComp === 3 && anim.name !== 'idle') {
          const [bx, by, bz] = idleHipsPos;
          const maxHoriz = anim.name === 'hit' || anim.name === 'death' ? 5.0 : 2.5;
          for (let f = 0; f < count; f++) {
            const dx = Math.max(-maxHoriz, Math.min(maxHoriz, (arr[f * 3] - bx) * 0.35));
            const dz = Math.max(-maxHoriz, Math.min(maxHoriz, (arr[f * 3 + 2] - bz) * 0.35));
            arr[f * 3] = bx + dx;
            arr[f * 3 + 2] = bz + dz;
            if (isRunLike && hero.id === 'ember-warden') {
              arr[f * 3 + 1] = by + (arr[f * 3 + 1] - by) * 0.55;
            } else if (anim.name === 'idle_cast') {
              arr[f * 3 + 1] = by + (arr[f * 3 + 1] - by) * 0.50;
            }
          }
          modified = true;
        }

        // D. Seamless end-of-clip loop blend on 'idle_cast' so the end of the cast animation never pops
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
