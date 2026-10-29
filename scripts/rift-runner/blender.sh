#!/bin/sh
set -eu
exec "$HOME/.local/browser-libs/usr/lib/x86_64-linux-gnu/ld-linux-x86-64.so.2" --library-path "$HOME/.local/rift-render-libs/usr/lib/x86_64-linux-gnu:$HOME/.local/browser-libs/usr/lib/x86_64-linux-gnu:/opt/fural-antigravity-glibc" "$HOME/.local/rift-render-gnu/bin/python" "$@"
