#!/usr/bin/env bash
# Supported additive cumulative game release. No host injection or peer worktree mutation.
set -euo pipefail
cd "$(dirname "$0")/../.."
git diff --quiet -- src server scripts || { echo 'Commit source before shipping'; exit 1; }
mkdir -p "$HOME/releases"
exec 9>"$HOME/releases/arkodia-deploy.lock"
flock -w 60 9 || { echo 'Another Arkodia deployment holds the shared lock'; exit 1; }
export PATH="$HOME/.local/go/bin:$HOME/.local/bin:$PATH"
export GOFLAGS=-p=1 GOMAXPROCS=2 GOMEMLIMIT=256MiB GOTOOLCHAIN=local
export FLAME_FAN_STAGE="$(mktemp -d "$HOME/releases/flame-fan-burst-XXXXXXXX")"
release_sha="$(git rev-parse HEAD)"
npx tsc --noEmit
node scripts/test-progression.mjs
node scripts/gameplay-progress/test.mjs
node scripts/rift-dash-motion/verify-input.mjs
node --input-type=module -e 'import {build} from "vite";await build({build:{outDir:process.env.FLAME_FAN_STAGE+"/site",copyPublicDir:false}});'
(cd server && go test ./... && CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -trimpath -ldflags="-s -w -X github.com/rizrmd/arkadia/server/internal/server.BuildCommit=$release_sha" -o "$FLAME_FAN_STAGE/arkodia" ./cmd/arkodia)
mkdir -p "$FLAME_FAN_STAGE/site/flame-fan-burst-candidate/v1" "$FLAME_FAN_STAGE/site/ember-warden-review/flame-fan-gameplay/soil-v2"
mkdir -p "$FLAME_FAN_STAGE/site/flame-fan-static"
for part in crust-a crust-b perimeter fragments scorch ash straight bend fork tee cross terminal low-a low-b low-c ribbon accent lick wisp puff bank billow ash-puff ember spark coal char glow cinders; do cp "public/flame-fan-static/$part.png" "$FLAME_FAN_STAGE/site/flame-fan-static/"; done
mkdir -p "$FLAME_FAN_STAGE/site/flame-fan-supplemental/v1"
cp public/flame-fan-supplemental/v1/smoke-*.png "$FLAME_FAN_STAGE/site/flame-fan-supplemental/v1/"
mkdir -p "$FLAME_FAN_STAGE/site/flame-fan-ember-candidate/v1"
cp public/flame-fan-ember-candidate/v1/ember-v2.png "$FLAME_FAN_STAGE/site/flame-fan-ember-candidate/v1/"
cp public/flame-fan-burst-candidate/v1/flame-burst-v1.png "$FLAME_FAN_STAGE/site/flame-fan-burst-candidate/v1/"
cp docs/flame-fan-gameplay/soil-v2/README.md "$FLAME_FAN_STAGE/site/ember-warden-review/flame-fan-gameplay/soil-v2/"
node --input-type=module <<'MANIFEST'
import fs from 'node:fs';import {createHash} from 'node:crypto';import {execFileSync} from 'node:child_process';
const stage=process.env.FLAME_FAN_STAGE,commit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const files=Object.fromEntries(fs.readdirSync(stage+'/site/assets').filter(f=>/\.(js|css)$/.test(f)).map(f=>['/assets/'+f,createHash('sha256').update(fs.readFileSync(stage+'/site/assets/'+f)).digest('hex')]));
fs.writeFileSync(stage+'/site/ember-warden-review/flame-fan-gameplay/soil-v2/release.json',JSON.stringify({commit,at:new Date().toISOString(),feature:'Complete approved Flame Fan soil composition visibly adopted across gameplay ranks 1–5',asset:'/flame-fan-burst-candidate/v1/flame-burst-v1.png',files},null,2));
MANIFEST
python3 - "$FLAME_FAN_STAGE" <<'ARCHIVE'
import sys,tarfile
with tarfile.open(sys.argv[1]+'.tgz','w:gz',format=tarfile.USTAR_FORMAT) as archive:
 archive.add(sys.argv[1]+'/site',arcname='site')
 archive.add(sys.argv[1]+'/arkodia',arcname='arkodia')
ARCHIVE
node scripts/flame-fan-gameplay/publish-burst.mjs
