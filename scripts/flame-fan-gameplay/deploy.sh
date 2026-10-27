#!/usr/bin/env bash
# Supported additive cumulative game release. No host injection or peer worktree mutation.
set -euo pipefail
cd "$(dirname "$0")/../.."
git diff --quiet -- src server scripts || { echo 'Commit source before shipping'; exit 1; }
mkdir -p "$HOME/releases"
exec 9>"$HOME/releases/arkodia-deploy.lock"
flock -n 9 || { echo 'Another Arkodia deployment holds the shared lock'; exit 1; }
export PATH="$HOME/.local/go/bin:$HOME/.local/bin:$PATH"
export GOFLAGS=-p=1 GOMAXPROCS=2 GOMEMLIMIT=256MiB GOTOOLCHAIN=local
export FLAME_FAN_STAGE="$(mktemp -d "$HOME/releases/flame-fan-burst-XXXXXXXX")"
release_sha="$(git rev-parse HEAD)"
npx tsc --noEmit
node scripts/test-progression.mjs
node scripts/gameplay-progress/test.mjs
node scripts/android-stutter/verify-flame-gpu.mjs
node --input-type=module -e 'import {build} from "vite";await build({build:{outDir:process.env.FLAME_FAN_STAGE+"/site",copyPublicDir:false}});'
(cd server && go test ./... && CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -trimpath -ldflags="-s -w -X github.com/rizrmd/arkadia/server/internal/server.BuildCommit=$release_sha" -o "$FLAME_FAN_STAGE/arkodia" ./cmd/arkodia)
mkdir -p "$FLAME_FAN_STAGE/site/flame-fan-burst-candidate/v1" "$FLAME_FAN_STAGE/site/ember-warden-review/flame-fan-gameplay/burst-v1"
mkdir -p "$FLAME_FAN_STAGE/site/flame-fan-static"
for part in crust-a crust-b straight coal; do cp "public/flame-fan-static/$part.png" "$FLAME_FAN_STAGE/site/flame-fan-static/"; done
mkdir -p "$FLAME_FAN_STAGE/site/flame-fan-ember-candidate/v1" "$FLAME_FAN_STAGE/site/ember-warden-review/flame-fan-gameplay/ember-v2"
cp public/flame-fan-ember-candidate/v1/ember-v2.png "$FLAME_FAN_STAGE/site/flame-fan-ember-candidate/v1/"
cp docs/flame-fan-gameplay/ember-v2/*.png docs/flame-fan-gameplay/ember-v2/*.json docs/flame-fan-gameplay/ember-v2/*.md "$FLAME_FAN_STAGE/site/ember-warden-review/flame-fan-gameplay/ember-v2/"
cp public/flame-fan-burst-candidate/v1/flame-burst-v1.png "$FLAME_FAN_STAGE/site/flame-fan-burst-candidate/v1/"
cp docs/flame-fan-gameplay/burst-v1/*.png docs/flame-fan-gameplay/burst-v1/*.json docs/flame-fan-gameplay/burst-v1/*.md "$FLAME_FAN_STAGE/site/ember-warden-review/flame-fan-gameplay/burst-v1/"
node --input-type=module <<'MANIFEST'
import fs from 'node:fs';import {createHash} from 'node:crypto';import {execFileSync} from 'node:child_process';
const stage=process.env.FLAME_FAN_STAGE,commit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const files=Object.fromEntries(fs.readdirSync(stage+'/site/assets').filter(f=>/\.(js|css)$/.test(f)).map(f=>['/assets/'+f,createHash('sha256').update(fs.readFileSync(stage+'/site/assets/'+f)).digest('hex')]));
fs.writeFileSync(stage+'/site/ember-warden-review/flame-fan-gameplay/burst-v1/release.json',JSON.stringify({commit,at:new Date().toISOString(),feature:'Approved directional Flame Fan gameplay ranks 1–5',asset:'/flame-fan-burst-candidate/v1/flame-burst-v1.png',files},null,2));
MANIFEST
python3 - "$FLAME_FAN_STAGE" <<'ARCHIVE'
import sys,tarfile
with tarfile.open(sys.argv[1]+'.tgz','w:gz',format=tarfile.USTAR_FORMAT) as archive:
 archive.add(sys.argv[1]+'/site',arcname='site')
 archive.add(sys.argv[1]+'/arkodia',arcname='arkodia')
ARCHIVE
node scripts/flame-fan-gameplay/publish-burst.mjs
