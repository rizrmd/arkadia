import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { publishRelease } from '../arkodia/publish-layer.mjs';

const stage = await fs.mkdtemp(path.join(os.tmpdir(), 'arkadia-3d-stage-'));
const site = path.join(stage, 'site');
await fs.mkdir(site, { recursive: true });

try {
  // 1. Copy built game entry HTML and JS/CSS chunks from dist/ so /?hero=rift-runner&3d=1 is live in Stronghold
  await fs.copyFile('dist/index.html', path.join(site, 'index.html'));
  if (existsSync('dist/fx-lab.html')) {
    await fs.copyFile('dist/fx-lab.html', path.join(site, 'fx-lab.html'));
  }
  await fs.mkdir(path.join(site, 'assets'), { recursive: true });
  for (const f of await fs.readdir('dist/assets')) {
    const src = path.join('dist/assets', f);
    if ((await fs.stat(src)).isFile()) {
      await fs.copyFile(src, path.join(site, 'assets', f));
    }
  }

  // 2. Copy /3d-hero-lab/** and /assets/characters/3d/**
  await fs.cp('public/3d-hero-lab', path.join(site, '3d-hero-lab'), { recursive: true });
  await fs.cp('public/assets/characters/3d', path.join(site, 'assets/characters/3d'), { recursive: true });
  if (existsSync('docs/3d-heroes')) {
    await fs.cp('docs/3d-heroes', path.join(site, '3d-hero-lab/evidence'), { recursive: true });
  }

  const tgz = path.join(os.tmpdir(), 'arkadia-3d-release.tgz');
  execFileSync('tar', ['-C', stage, '-czf', tgz, '.']);
  await publishRelease({
    name: '3d-hero-game',
    tgz,
    check: '/3d-hero-lab/index.html'
  });
} finally {
  await fs.rm(stage, { recursive: true, force: true });
}
