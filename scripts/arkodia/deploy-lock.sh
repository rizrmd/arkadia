#!/usr/bin/env bash
# Sourced by fural-deploy.sh: FD 9 remains locked for the deploy and its children.
acquire_arkodia_deploy_lock() {
  local lock_path="$HOME/releases/arkodia-deploy.lock"
  mkdir -p "$HOME/releases" || return
  exec 9>"$lock_path" || return
  ARKODIA_DEPLOY_TRACE_ID="$(python3 -c 'import uuid; print("deploy-" + uuid.uuid4().hex)')" || return
  export ARKODIA_DEPLOY_TRACE_ID
  local result=0
  flock -n 9 || result=$?
  if (( result != 0 )); then
    python3 "$(dirname "${BASH_SOURCE[0]}")/deploy-lock-diagnostics.py" rejected "$lock_path" "$$" "$result"
    return "$result"
  fi
  python3 "$(dirname "${BASH_SOURCE[0]}")/deploy-lock-diagnostics.py" acquired "$lock_path" "$$"
}

release_arkodia_deploy_lock_metadata() {
  python3 "$(dirname "${BASH_SOURCE[0]}")/deploy-lock-diagnostics.py" release "$HOME/releases/arkodia-deploy.lock" "$$"
}
