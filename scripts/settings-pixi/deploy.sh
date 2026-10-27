#!/usr/bin/env bash
# Additive cumulative client/server release through the supported versioned release-layer publisher.
set -euo pipefail
cd "$(dirname "$0")/../.."
git diff --quiet -- src scripts server || { echo 'Commit source before shipping'; exit 1; }
mkdir -p "$HOME/releases"
exec 9>"$HOME/releases/arkodia-deploy.lock"
flock -n 9 || { echo 'Another local Arkodia deployment holds the lock'; exit 1; }
export SETTINGS_RELEASE_STAGE="$(mktemp -d "$HOME/releases/settings-pixi-XXXXXXXX")"
npx tsc --noEmit
node scripts/test-settings.mjs
node scripts/test-inventory.mjs
node scripts/test-progression.mjs
node scripts/gameplay-progress/test.mjs
node --input-type=module -e 'import {build} from "vite";await build({build:{outDir:process.env.SETTINGS_RELEASE_STAGE+"/site",copyPublicDir:false}});'
export PATH="$HOME/.local/go/bin:$HOME/.local/bin:$PATH"
export GOFLAGS=-p=1 GOMAXPROCS=2 GOMEMLIMIT=256MiB GOTOOLCHAIN=local
release_sha="$(git rev-parse HEAD)"
(cd server && go test ./... && CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -trimpath -ldflags="-s -w -X github.com/rizrmd/arkadia/server/internal/server.BuildCommit=$release_sha" -o "$SETTINGS_RELEASE_STAGE/arkodia" ./cmd/arkodia)
repo_root="$PWD"
mkdir -p "$SETTINGS_RELEASE_STAGE/empty-site"
(cd "$SETTINGS_RELEASE_STAGE" && GAME_SAVE_DIR="$SETTINGS_RELEASE_STAGE/smoke-saves" ARKODIA_BIN="$SETTINGS_RELEASE_STAGE/arkodia" SITE_DIR="$SETTINGS_RELEASE_STAGE/empty-site" node "$repo_root/scripts/coop-smoke.mjs")
# Archive only the runtime binary and site; smoke save data remains outside it.
mkdir -p "$SETTINGS_RELEASE_STAGE/site/ui/settings" "$SETTINGS_RELEASE_STAGE/site/ui/hud-actions" "$SETTINGS_RELEASE_STAGE/site/settings-pixi"
cp -R public/ui/settings/v2 "$SETTINGS_RELEASE_STAGE/site/ui/settings/"
cp public/ui/settings/*.webp "$SETTINGS_RELEASE_STAGE/site/ui/settings/"
cp public/ui/hud-actions/settings.webp "$SETTINGS_RELEASE_STAGE/site/ui/hud-actions/"
cp docs/settings-pixi/local-*.png docs/settings-pixi/local-results.json "$SETTINGS_RELEASE_STAGE/site/settings-pixi/"
node --input-type=module <<'MANIFEST'
import fs from 'node:fs';import {createHash} from 'node:crypto';import {execFileSync} from 'node:child_process';
const stage=process.env.SETTINGS_RELEASE_STAGE,commit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const files=Object.fromEntries(fs.readdirSync(stage+'/site/assets').map(f=>['/assets/'+f,createHash('sha256').update(fs.readFileSync(stage+'/site/assets/'+f)).digest('hex')]));
fs.writeFileSync(stage+'/site/settings-pixi/release.json',JSON.stringify({commit,at:new Date().toISOString(),feature:'Native Pixi Settings and persistent equipped-skill shortcuts',files},null,2));
MANIFEST
python3 - "$SETTINGS_RELEASE_STAGE" <<'ARCHIVE'
import sys,tarfile
with tarfile.open(sys.argv[1]+'.tgz','w:gz',format=tarfile.USTAR_FORMAT) as archive:
 archive.add(sys.argv[1]+'/site',arcname='site')
 archive.add(sys.argv[1]+'/arkodia',arcname='arkodia')
ARCHIVE
printf '%s\n' "$SETTINGS_RELEASE_STAGE" > "$HOME/releases/settings-pixi-prepared"
if [[ "${1:-}" == '--prepare-only' ]]; then echo "Prepared $SETTINGS_RELEASE_STAGE.tgz"; exit 0; fi
SETTINGS_RELEASE_ARCHIVE="$SETTINGS_RELEASE_STAGE.tgz" node scripts/settings-pixi/publish.mjs
