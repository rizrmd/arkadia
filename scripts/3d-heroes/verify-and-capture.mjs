import http from 'node:http';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { launch } from '../vfx/browser.mjs';

const PUBLIC_DIR = path.resolve('public');
const DOCS_DIR = path.resolve('docs/3d-heroes');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.glb': 'model/gltf-binary'
};

function startServer() {
  return new Promise((resolve) => {
    const srv = http.createServer(async (req, res) => {
      try {
        const u = new URL(req.url, 'http://127.0.0.1');
        let rel = decodeURIComponent(u.pathname);
        if (rel.endsWith('/')) rel += 'index.html';
        const fp = path.join(PUBLIC_DIR, rel);
        if (!fp.startsWith(PUBLIC_DIR) || !existsSync(fp)) {
          res.writeHead(404);
          res.end('Not found');
          return;
        }
        const buf = await fs.readFile(fp);
        const ext = path.extname(fp).toLowerCase();
        res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
        res.end(buf);
      } catch (e) {
        res.writeHead(500);
        res.end(String(e));
      }
    });
    srv.listen(0, '127.0.0.1', () => {
      resolve({ srv, port: srv.address().port });
    });
  });
}

const { srv, port } = await startServer();
const browser = await launch();

try {
  await fs.mkdir(DOCS_DIR, { recursive: true });
  const page = await browser.newPage({ viewport: { width: 1360, height: 820 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });

  await page.goto(`http://127.0.0.1:${port}/3d-hero-lab/index.html`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__LAB_READY__ === true, null, { timeout: 60000 });

  // Capture 1: Overview in Stylized Dark-Fantasy Isometric mode (Run animation, SE facing)
  await page.evaluate(() => window.__setLabState({ clip: 'run', dir: 'SE', cameraMode: 'iso', shaderMode: 'stylized', time: 0.22 }));
  await page.waitForTimeout(150);
  await page.screenshot({ path: path.join(DOCS_DIR, 'lab-overview-run-se.png') });

  // Capture 2: Attack animation in N (North) facing + 8-direction simultaneous strip
  await page.evaluate(() => window.__setLabState({ clip: 'attack', dir: 'N', cameraMode: 'iso', shaderMode: 'stylized', time: 0.45 }));
  await page.waitForTimeout(150);
  await page.screenshot({ path: path.join(DOCS_DIR, 'lab-attack-north.png') });

  // Capture 3: Rift Bolt Cast animation in SW facing
  await page.evaluate(() => window.__setLabState({ clip: 'cast', dir: 'SW', cameraMode: 'iso', shaderMode: 'stylized', time: 0.65 }));
  await page.waitForTimeout(150);
  await page.screenshot({ path: path.join(DOCS_DIR, 'lab-cast-sw.png') });

  // Capture 4: Smart Topology Wireframe mode (15,000 triangles)
  await page.evaluate(() => window.__setLabState({ clip: 'idle', dir: 'S', cameraMode: 'iso', shaderMode: 'wireframe', time: 0.1 }));
  await page.waitForTimeout(150);
  await page.screenshot({ path: path.join(DOCS_DIR, 'lab-topology-wireframe.png') });

  // Capture 5: Close-up of the 8-direction simultaneous inspection strip during Run
  await page.evaluate(() => window.__setLabState({ clip: 'run', dir: 'S', cameraMode: 'iso', shaderMode: 'stylized', time: 0.18 }));
  await page.waitForTimeout(150);
  const octEl = await page.$('.grid-card');
  await octEl.screenshot({ path: path.join(DOCS_DIR, 'octant-strip-run.png') });

  assert.deepEqual(errors, [], `Page errors detected: ${errors.join('; ')}`);
  console.log('Verified /3d-hero-lab/ with 0 errors and captured 5 evidence screenshots in docs/3d-heroes/!');
} finally {
  await browser.close();
  srv.close();
}
