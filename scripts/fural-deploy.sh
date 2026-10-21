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
(cd server && go vet ./... && go test ./... && CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -trimpath -ldflags="-s -w" -o bin/arkadia ./cmd/arkadia)
node scripts/coop-smoke.mjs >/dev/null

# Stage the binary and only the files the game loads (dist/ also carries hundreds of MB of documentation renders).
list="$(mktemp)"; trap 'rm -f "$list"' EXIT
node scripts/coop-site-files.mjs > "$list"
rm -rf "$STAGE"; mkdir -p "$STAGE/site"
cp server/bin/arkadia "$STAGE/arkadia"
while IFS= read -r f; do mkdir -p "$STAGE/site/$(dirname "$f")"; cp "dist/$f" "$STAGE/site/$f"; done < "$list"
echo "Staged $(wc -l < "$list") files, $(du -sh "$STAGE" | cut -f1) in $STAGE"

# The copy into the sandbox drops the executable bit, so the boot command restores it.
fural-agent sandboxes serve --name "$SANDBOX" --dir "${STAGE#"$HOME"/}" --project "$PROJECT" --port 3000 \
  --cmd 'chmod +x arkadia && PORT=3000 SITE_DIR=site exec ./arkadia' || echo "serve did not confirm; polling $URL"
for _ in $(seq 1 60); do
  if curl -fsS -m 10 "$URL/healthz" | grep -q '"ok":true'; then echo "Live: $URL"; exit 0; fi
  sleep 5
done
echo "Deploy did not become healthy at $URL" >&2; exit 1
