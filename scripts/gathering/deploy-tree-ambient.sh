#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
source scripts/arkodia/deploy-lock.sh
acquire_arkodia_deploy_lock
trap release_arkodia_deploy_lock_metadata EXIT

live_sha="$(curl -fsS --max-time 20 https://arkodia.online/healthz | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s).build))')"
git merge-base --is-ancestor "$live_sha" HEAD || { echo "Merge current production ($live_sha) before release"; exit 1; }
git diff --quiet -- src scripts server || { echo 'Commit source before release'; exit 1; }

export PATH="$HOME/.local/go/bin:$HOME/.local/bin:$PATH" GOFLAGS=-p=1 GOMAXPROCS=2 GOMEMLIMIT=256MiB GOTOOLCHAIN=local
mkdir -p "$HOME/releases"
stage="$(mktemp -d "$HOME/releases/tree-ambient-XXXXXXXX")"
export TREE_AMBIENT_STAGE="$stage"
sha="$(git rev-parse HEAD)"

./node_modules/.bin/tsc --noEmit
node scripts/gathering/test.mjs
(cd server && go test ./... && CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -trimpath -ldflags="-s -w -X github.com/rizrmd/arkadia/server/internal/server.BuildCommit=$sha" -o "$stage/arkodia" ./cmd/arkodia)

node --input-type=module <<'BUILD'
import {build} from 'vite';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';

const stage = process.env.TREE_AMBIENT_STAGE;
const site = stage + '/site';
await build({logLevel: 'error', build: {outDir: site, copyPublicDir: false}});

for (const file of [
  'inventory/axe.svg',
  'wildlife/imagegen-atlas.png',
  'typography/v2/fonts/garamond-medium-infinite-v1.fnt',
  'typography/v2/fonts/garamond-medium-infinite-v1.png',
]) {
  await fs.mkdir(site + '/' + file.split('/').slice(0, -1).join('/'), {recursive: true});
  await fs.copyFile('public/' + file, site + '/' + file);
}

await fs.mkdir(site + '/tree-ambient-lighting', {recursive: true});
await fs.cp('docs/tree-ambient-lighting', site + '/tree-ambient-lighting', {recursive: true});

const files = {};
for (const rel of [
  'index.html',
  'inventory/axe.svg',
  'wildlife/imagegen-atlas.png',
  ...(await fs.readdir(site + '/assets')).filter(f => /\.(js|css)$/.test(f)).map(f => 'assets/' + f),
  ...(await fs.readdir(site + '/tree-ambient-lighting')).map(f => 'tree-ambient-lighting/' + f),
]) {
  files['/' + rel] = createHash('sha256').update(await fs.readFile(site + '/' + rel)).digest('hex');
}

const commit = execFileSync('git', ['rev-parse', 'HEAD'], {encoding: 'utf8'}).trim();
const manifest = {
  commit,
  at: new Date().toISOString(),
  feature: 'Synchronize ambient lighting modulation on harvestable trees, wildlife and authored environment layers at night',
  files,
};
await fs.writeFile(site + '/tree-ambient-lighting/release.json', JSON.stringify(manifest, null, 2));
await fs.writeFile('docs/tree-ambient-lighting/release.json', JSON.stringify(manifest, null, 2));
BUILD

tar -czf "$stage.tgz" -C "$stage" site arkodia
node scripts/arkodia/publish-layer.mjs --tgz "$stage.tgz" --name "game-$(git rev-parse --short HEAD)"
