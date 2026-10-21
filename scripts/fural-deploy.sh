#!/usr/bin/env bash
# Release the co-op Stronghold as one deployable: the Go game server (server/) serving the built Vite client and
# the /ws co-op endpoint on one port, published as a Fural custom sandbox.
#   scripts/fural-deploy.sh                      (also what `fural-agent repos ship` runs)
#   ARKADIA_SANDBOX=arkadia-coop ARKADIA_URL=https://arkadia-coop-whachat.fural.space scripts/fural-deploy.sh
# Needs Node (npm ci done), Go 1.25 (organization runtime installs it in ~/.local/go) and the Playwright Chromium
# that scripts/organization-setup.sh prepares (used to list the files the game loads).
set -euo pipefail
cd "$(dirname "$0")/.."
export PATH="$HOME/.local/go/bin:$HOME/.local/bin:$PATH"
SANDBOX="${ARKADIA_SANDBOX:-arkadia-coop}"
URL="${ARKADIA_URL:-https://${SANDBOX}-whachat.fural.space}"
PROJECT="${ARKADIA_PROJECT:-PJ8758f22f61165f3d3215e454}"
STAGE="$HOME/releases/$SANDBOX"

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

# Ship one versioned tarball in 4 MB parts (the one-shot `sandboxes serve` copy times out at the gateway for a
# release this size). The boot script unpacks that version once and runs the server; transfers never replace
# files, so every release gets new names.
id="$(fural-agent sandboxes list | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const x=JSON.parse(s).find(b=>b.name===process.argv[1]);console.log(x?x.id:"")})' "$SANDBOX")"
if [ -z "$id" ]; then echo "Create the custom sandbox first: fural-agent sandboxes create --name $SANDBOX --project $PROJECT" >&2; exit 1; fi
version="$(git rev-parse --short HEAD)-$(date +%s)"
parts="$HOME/releases/$SANDBOX-parts"; rm -rf "$parts"; mkdir -p "$parts"
tar -C "$STAGE" -cz . | split -b 4m -d - "$parts/rel-$version.tgz."
for f in "$parts"/*; do
  fural-agent organization home-files transfer --from-member "${ARKADIA_MEMBER:-US4f550b10dab65dc9756fa429}" --from "${f#"$HOME"/}" --to-custom-sandbox "$id" --to "$(basename "$f")" >/dev/null
done
echo "Transferred $(ls "$parts" | wc -l) parts of release $version"
fural-agent sandboxes update "$id" --boot-script "cd \"\$HOME\"
V=$version
if [ ! -x app-\$V/arkadia ]; then rm -rf app-\$V && mkdir app-\$V && cat rel-\$V.tgz.* | tar -xz -C app-\$V; fi
rm -rf \$(ls -d app-* rel-*.tgz.* 2>/dev/null | grep -v \"\$V\") spike site
cd app-\$V && chmod +x arkadia && PORT=3000 SITE_DIR=site exec ./arkadia" >/dev/null
# A power cycle stops the previous release; only the boot script starts again.
fural-agent sandboxes restart "$id" >/dev/null
for _ in $(seq 1 60); do
  if curl -fsS -m 10 "$URL/healthz" | grep -q '"protocol"'; then echo "Live: $URL ($version)"; exit 0; fi
  sleep 5
done
echo "Deploy did not become healthy at $URL" >&2; exit 1
