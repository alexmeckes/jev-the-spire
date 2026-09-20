#!/bin/zsh
set -eu
demo_dir="$(cd "$(dirname "$0")" && pwd)"
app_dir="$demo_dir/../.private/Jev Companion.app"
if [[ ! -d "$app_dir" ]]; then
  zsh "$demo_dir/native/build.sh"
fi
if ! curl -fsS --max-time 2 http://127.0.0.1:4317/api/sidecar >/dev/null; then
  node_bin="$(command -v node || true)"
  if [[ -z "$node_bin" ]]; then
    for candidate in "$HOME"/.nvm/versions/node/*/bin/node(N); do node_bin="$candidate"; done
  fi
  if [[ -z "$node_bin" ]]; then
    echo 'Node.js is required. Install Node 22+ and try again.'
    read -r '?Press Return to close.'
    exit 1
  fi
  nohup "$node_bin" "$demo_dir/server.mjs" > "$demo_dir/../.private/spire-server.log" 2>&1 &
  for attempt in {1..20}; do
    if curl -fsS --max-time 1 http://127.0.0.1:4317/api/sidecar >/dev/null 2>&1; then break; fi
    sleep 0.25
  done
fi
open "$app_dir"
