import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const STATE_FILE = path.resolve('assets-src/3d-heroes/rift-runner-state.json');
const OUT_DIR = path.resolve('public/assets/characters/3d');

async function loadState() {
  if (existsSync(STATE_FILE)) {
    return JSON.parse(await fs.readFile(STATE_FILE, 'utf8'));
  }
  return {
    hero: 'rift-runner',
    ai_model: 'meshy-t2.5',
    image_to_3d_task_id: '01a1699d-cc20-744a-8765-180778c4f182'
  };
}

async function saveState(state) {
  await fs.mkdir(path.dirname(STATE_FILE), { recursive: true });
  await fs.writeFile(STATE_FILE, JSON.stringify(state, null, 2));
}

async function callMcpTool(name, args) {
  return new Promise((resolve, reject) => {
    const proc = spawn('/home/dev/.local/bin/meshy-mcp-wrapper', [], {
      stdio: ['pipe', 'pipe', 'pipe']
    });
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (d) => { stdout += d.toString(); });
    proc.stderr.on('data', (d) => { stderr += d.toString(); });
    proc.on('error', reject);
    proc.on('close', (code) => {
      const lines = stdout.trim().split('\n').filter((l) => l.startsWith('{'));
      for (const line of lines) {
        try {
          const msg = JSON.parse(line);
          if (msg.id === 2) {
            if (msg.error) return reject(new Error(JSON.stringify(msg.error)));
            if (msg.result?.isError) {
              return reject(new Error(msg.result?.content?.[0]?.text || 'MCP tool error'));
            }
            const sc = msg.result?.structuredContent;
            if (sc) return resolve(sc);
            const txt = msg.result?.content?.[0]?.text;
            try {
              return resolve(JSON.parse(txt));
            } catch {
              return resolve({ raw: txt });
            }
          }
        } catch {}
      }
      reject(new Error(`No RPC id=2 response (exit=${code}): stdout=${stdout.slice(-400)} stderr=${stderr.slice(-400)}`));
    });

    const reqs = [
      JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'arkodia-3d-pipeline', version: '1.0.0' }
        }
      }),
      JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }),
      JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: { name, arguments: { ...args, response_format: 'json' } }
      })
    ];
    proc.stdin.write(reqs.join('\n') + '\n');
    proc.stdin.end();
  });
}

async function waitForTask(taskId, taskType) {
  for (let attempt = 1; attempt <= 20; attempt++) {
    console.log(`[poll #${attempt}] Waiting on ${taskType} task ${taskId}...`);
    const status = await callMcpTool('meshy_get_task_status', {
      task_id: taskId,
      task_type: taskType,
      wait: true,
      timeout_seconds: 180
    });
    console.log(`[poll #${attempt}] outcome=${status.outcome} status=${status.status} progress=${status.progress}%`);
    if (status.outcome === 'SUCCEEDED' || status.status === 'SUCCEEDED') {
      return status;
    }
    if (status.outcome === 'FAILED' || status.outcome === 'CANCELED') {
      throw new Error(`Task ${taskId} (${taskType}) failed: ${JSON.stringify(status)}`);
    }
  }
  throw new Error(`Task ${taskId} (${taskType}) timed out after 20 polls`);
}

async function downloadUrl(url, destPath) {
  if (!url) return null;
  console.log(`Downloading ${path.basename(destPath)}...`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await fs.mkdir(path.dirname(destPath), { recursive: true });
  await fs.writeFile(destPath, buf);
  console.log(`Saved ${destPath} (${(buf.length / 1024).toFixed(1)} KB)`);
  return destPath;
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  const state = await loadState();
  await saveState(state);

  // Step 1: Wait for Image-to-3D task
  if (!state.image_to_3d_result) {
    const res = await waitForTask(state.image_to_3d_task_id, 'image-to-3d');
    state.image_to_3d_result = res;
    await saveState(state);
  }

  const tposeGlbPath = path.join(OUT_DIR, 'rift-runner-tpose.glb');
  if (!existsSync(tposeGlbPath)) {
    const glbUrl = state.image_to_3d_result?.model_urls?.glb;
    if (glbUrl) {
      await downloadUrl(glbUrl, tposeGlbPath);
    } else {
      await callMcpTool('meshy_download_model', {
        task_id: state.image_to_3d_task_id,
        task_type: 'image-to-3d',
        format: 'glb',
        save_to: tposeGlbPath
      });
    }
  }

  const thumbPath = path.join(OUT_DIR, 'rift-runner-3d-thumb.png');
  if (!existsSync(thumbPath) && state.image_to_3d_result?.thumbnail_url) {
    await downloadUrl(state.image_to_3d_result.thumbnail_url, thumbPath);
  }

  // Step 2: Auto-Rigging (includes free walk & run animations)
  if (!state.rig_task_id) {
    console.log('Starting meshy_rig for Rift Runner...');
    const rigTask = await callMcpTool('meshy_rig', {
      input_task_id: state.image_to_3d_task_id,
      height_meters: 1.75
    });
    state.rig_task_id = rigTask.task_id;
    await saveState(state);
    console.log('Created rig task:', state.rig_task_id);
  }

  if (!state.rig_result) {
    const rigRes = await waitForTask(state.rig_task_id, 'rigging');
    state.rig_result = rigRes;
    await saveState(state);
  }

  console.log('Rigging result keys:', Object.keys(state.rig_result?.result || {}));
  const rigOut = state.rig_result?.result || {};
  if (rigOut.rigged_character_glb_url && !existsSync(path.join(OUT_DIR, 'rift-runner-rigged.glb'))) {
    await downloadUrl(rigOut.rigged_character_glb_url, path.join(OUT_DIR, 'rift-runner-rigged.glb'));
  }
  if (rigOut.basic_animations?.walking_glb_url && !existsSync(path.join(OUT_DIR, 'rift-runner-walk.glb'))) {
    await downloadUrl(rigOut.basic_animations.walking_glb_url, path.join(OUT_DIR, 'rift-runner-walk.glb'));
  }
  if (rigOut.basic_animations?.running_glb_url && !existsSync(path.join(OUT_DIR, 'rift-runner-run.glb'))) {
    await downloadUrl(rigOut.basic_animations.running_glb_url, path.join(OUT_DIR, 'rift-runner-run.glb'));
  }

  // Step 3: Generate additional preset animations (Idle, Combat Idle, Attack, Spell Cast, Hit, Death)
  // Using action_ids to bundle them into a multi-clip GLB, AND individual tasks if needed
  const ACTION_SPECS = [
    { id: 0, slug: 'idle', label: 'Idle' },
    { id: 4, slug: 'attack', label: 'Attack' },
    { id: 129, slug: 'cast', label: 'Rift Bolt Cast' },
    { id: 178, slug: 'hit', label: 'Hit Reaction' },
    { id: 8, slug: 'death', label: 'Death' }
  ];

  state.animations = state.animations || {};
  for (const act of ACTION_SPECS) {
    if (!state.animations[act.slug]?.task_id) {
      console.log(`Starting meshy_animate for ${act.slug} (action_id=${act.id})...`);
      const animTask = await callMcpTool('meshy_animate', {
        rig_task_id: state.rig_task_id,
        action_id: act.id
      });
      state.animations[act.slug] = { ...act, task_id: animTask.task_id };
      await saveState(state);
    }
  }

  for (const act of ACTION_SPECS) {
    const entry = state.animations[act.slug];
    if (!entry.result) {
      const animRes = await waitForTask(entry.task_id, 'animation');
      entry.result = animRes;
      await saveState(state);
    }
    const animGlbUrl =
      entry.result?.result?.animation_glb_url ||
      entry.result?.model_urls?.glb ||
      Object.values(entry.result?.result || {}).find((v) => typeof v === 'string' && v.includes('.glb'));
    const dest = path.join(OUT_DIR, `rift-runner-${act.slug}.glb`);
    if (animGlbUrl && !existsSync(dest)) {
      await downloadUrl(animGlbUrl, dest);
    }
  }

  console.log('All Rift Runner 3D meshes, rigs, and animations completed!');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
