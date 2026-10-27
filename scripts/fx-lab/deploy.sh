#!/usr/bin/env bash
# Bounded cumulative release: production assets already on disk remain available.
# Uses the same validated release publisher and human git identity as full shipping.
set -euo pipefail
cd "$(dirname "$0")/../.."
if [[ "${FX_RELEASE_TREE:-}" != 1 ]]; then
  release_tree="$(mktemp -d "$HOME/.tmp/fx-release-tree-XXXXXXXX")"
  git worktree add --detach "$release_tree" HEAD
  trap 'git worktree remove --force "$release_tree"' EXIT
  ln -s "$PWD/node_modules" "$release_tree/node_modules"
  FX_RELEASE_TREE=1 bash "$release_tree/scripts/fx-lab/deploy.sh"
  exit $?
fi
mkdir -p "$HOME/releases"
exec 9>"$HOME/releases/arkodia-deploy.lock"
flock -n 9 || { echo 'Another Arkodia deployment holds the lock'; exit 1; }
export PATH="$HOME/.local/go/bin:$HOME/.local/bin:$PATH" GOFLAGS=-p=1 GOMAXPROCS=2 GOMEMLIMIT=256MiB GOTOOLCHAIN=local
stage="$(mktemp -d "$HOME/releases/fx-lab-XXXXXXXX")"
export FX_LAB_STAGE="$stage"
sha="$(git rev-parse HEAD)"
npx tsc --noEmit
(cd server && go test ./... && CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -trimpath -ldflags="-s -w -X github.com/rizrmd/arkadia/server/internal/server.BuildCommit=$sha" -o "$stage/arkodia" ./cmd/arkodia)
node --input-type=module <<'BUILD'
import {build} from 'vite';import {stageEditor} from './scripts/environment-editor/build.mjs';import fs from 'node:fs/promises';
const stage=process.env.FX_LAB_STAGE;
await build({logLevel:'error',build:{outDir:stage+'/site',copyPublicDir:false}});
await stageEditor(stage+'/site');
for(const rel of ['3d-hero-lab/vendor','assets/characters/3d','vfx','flame-fan-static','flame-fan-supplemental','flame-fan-burst-candidate','rift-dash/v2','skill-tree']){await fs.mkdir(stage+'/site/'+rel,{recursive:true});await fs.cp('public/'+rel,stage+'/site/'+rel,{recursive:true});}
await fs.mkdir(stage+'/site/fx-lab/evidence',{recursive:true});await fs.cp('docs/fx-lab',stage+'/site/fx-lab/evidence',{recursive:true});
BUILD
tar -czf "$stage.tgz" -C "$stage" .
node --input-type=module <<'PUBLISH'
import {publishRelease} from './scripts/arkodia/publish-layer.mjs';import {execFileSync} from 'node:child_process';
const sha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
await publishRelease({name:'game-'+sha.slice(0,8),tgz:process.env.FX_LAB_STAGE+'.tgz'});
console.log(JSON.stringify({commit:sha,url:'https://arkodia.online/fx-lab/',archive:process.env.FX_LAB_STAGE+'.tgz'}));
PUBLISH
