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
  { slug: 'attack', label: 'Attack', loop: false },
  { slug: 'cast', label: 'Rift Bolt Cast', loop: false },
  { slug: 'hit', label: 'Hit Reaction', loop: false },
  { slug: 'death', label: 'Death', loop: false }
];

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

async function main() {
  await fs.mkdir(RAW_DIR, { recursive: true });
  await fs.mkdir(OUT_DIR, { recursive: true });

  for (const name of ['tpose', 'rigged', ...CLIPS.map((c) => c.slug)]) {
    const pubFile = path.join(OUT_DIR, `rift-runner-${name}.glb`);
    const rawFile = path.join(RAW_DIR, `rift-runner-${name}.glb`);
    if (existsSync(pubFile) && !existsSync(rawFile)) {
      await fs.rename(pubFile, rawFile);
    } else if (existsSync(pubFile) && existsSync(rawFile)) {
      await fs.unlink(pubFile);
    }
  }

  const base = parseGlb(await fs.readFile(path.join(RAW_DIR, 'rift-runner-idle.glb')));
  const outJson = structuredClone(base.json);
  const nodeNameToIndex = new Map();
  outJson.nodes.forEach((n, idx) => {
    if (n.name) nodeNameToIndex.set(n.name, idx);
  });

  // Extract existing bufferViews into individual slices so we can replace image bufferViews and append new ones
  const bvBuffers = outJson.bufferViews.map((bv) => {
    const start = bv.byteOffset || 0;
    return Buffer.from(base.bin.subarray(start, start + bv.byteLength));
  });

  // Compress embedded images (1024x1024 JPEG quality 86) for fast web loading
  for (const img of outJson.images || []) {
    if (typeof img.bufferView === 'number') {
      const orig = bvBuffers[img.bufferView];
      const compressed = await sharp(orig)
        .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 86, mozjpeg: true })
        .toBuffer();
      console.log(`Compressed image bufferView ${img.bufferView}: ${(orig.length / 1024).toFixed(0)} KB -> ${(compressed.length / 1024).toFixed(0)} KB`);
      bvBuffers[img.bufferView] = compressed;
      img.mimeType = 'image/jpeg';
    }
  }

  // Name the base animation 'idle'
  outJson.animations[0].name = 'idle';

  // Append animations from the other 6 GLBs
  for (const clip of CLIPS.slice(1)) {
    const other = parseGlb(await fs.readFile(path.join(RAW_DIR, `rift-runner-${clip.slug}.glb`)));
    const srcAnim = other.json.animations?.[0];
    if (!srcAnim) throw new Error(`Missing animation in ${clip.slug}`);

    const accessorMap = new Map();
    const copyAccessor = (srcAccIdx) => {
      if (accessorMap.has(srcAccIdx)) return accessorMap.get(srcAccIdx);
      const srcAcc = structuredClone(other.json.accessors[srcAccIdx]);
      const srcBv = other.json.bufferViews[srcAcc.bufferView];
      const start = srcBv.byteOffset || 0;
      const slice = Buffer.from(other.bin.subarray(start, start + srcBv.byteLength));
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
      const srcNodeName = other.json.nodes[ch.target.node]?.name;
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
      name: clip.slug,
      samplers,
      channels
    });
    console.log(`Merged animation '${clip.slug}' (${channels.length} channels)`);
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

  const outGlbPath = path.join(OUT_DIR, 'rift-runner.glb');
  const outGlbBuf = buildGlb(outJson, mergedBin);
  await fs.writeFile(outGlbPath, outGlbBuf);
  console.log(`Wrote unified ${outGlbPath}: ${(outGlbBuf.length / 1024).toFixed(1)} KB with ${outJson.animations.length} animations!`);

  const manifest = {
    hero: 'rift-runner',
    name: 'Rift Runner',
    ai_model: 'meshy-t2.5',
    model_type: 'smart-topology',
    glb: '/assets/characters/3d/rift-runner.glb',
    thumbnail: '/assets/characters/3d/rift-runner-3d-thumb.png',
    fileSizeKB: +(outGlbBuf.length / 1024).toFixed(1),
    animations: CLIPS
  };
  await fs.writeFile(path.join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
