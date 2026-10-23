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

          // 2. Tailor waist/corset & outer coat flare so silhouette reads tall and slender instead of wide/stubby
          const coatFlareWeight = smoothstep(0.25, 0.45, y) * (1 - smoothstep(0.85, 1.15, y)) * smoothstep(0.14, 0.28, Math.abs(x));
          if (coatFlareWeight > 0) {
            x *= 1 - 0.14 * coatFlareWeight;
          }
          const waistWeight = smoothstep(0.92, 1.08, y) * (1 - smoothstep(1.22, 1.34, y)) * (1 - smoothstep(0.18, 0.26, Math.abs(x)));
          if (waistWeight > 0) {
            x *= 1 - 0.08 * waistWeight;
            z *= 1 - 0.06 * waistWeight;
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
