#!/usr/bin/env bash
# Release the game as one deployable into the one Arkadia sandbox (https://arkadia-custom-whachat.fural.space): the
# Go game server (server/) with the built Vite client, behind scripts/arkadia/gateway.mjs, which also serves every
# review page. Published as a release layer (scripts/arkadia/publish-layer.mjs) with this commit's gateway.
#   scripts/fural-deploy.sh                      (also what `fural-agent repos ship` runs)
# Needs Node (npm ci done), Go 1.25 (organization runtime installs it in ~/.local/go) and the Playwright Chromium
# that scripts/organization-setup.sh prepares (used to list the files the game loads).
set -euo pipefail
cd "$(dirname "$0")/.."
export PATH="$HOME/.local/go/bin:$HOME/.local/bin:$PATH"
STAGE="$HOME/releases/arkadia-game"

npm run build
# The organization shares 1 GiB of RAM across sessions: compile one package at a time under a memory limit.
export GOFLAGS=-p=1 GOMAXPROCS=2 GOMEMLIMIT=256MiB
(cd server && go test ./... && CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -trimpath -ldflags="-s -w" -o bin/arkadia ./cmd/arkadia)
node scripts/coop-smoke.mjs >/dev/null

# Stage the binary and only the files the game loads (dist/ also carries hundreds of MB of documentation renders).
list="$(mktemp)"; trap 'rm -f "$list"' EXIT
node scripts/coop-site-files.mjs > "$list"
rm -rf "$STAGE"; mkdir -p "$STAGE/site"
cp server/bin/arkadia "$STAGE/arkadia"
while IFS= read -r f; do mkdir -p "$STAGE/site/$(dirname "$f")"; cp "dist/$f" "$STAGE/site/$f"; done < "$list"
# The co-op screenshots and test reports, embedded in the Knowledge page from /coop/docs/.
mkdir -p "$STAGE/site/coop/docs"; cp docs/coop/*.webp docs/coop/*.json "$STAGE/site/coop/docs/"
echo "Staged $(wc -l < "$list") files, $(du -sh "$STAGE" | cut -f1) in $STAGE"

# One versioned tarball, uploaded in parts and applied by the gateway at boot (the release also writes www/index.html).
tgz="$HOME/releases/arkadia-game-$(git rev-parse --short HEAD).tgz"
tar -C "$STAGE" -cz . > "$tgz"
node scripts/arkadia/publish-layer.mjs --tgz "$tgz" --name "game-$(git rev-parse --short HEAD)"
