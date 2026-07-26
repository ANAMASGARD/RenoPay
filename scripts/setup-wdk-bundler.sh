#!/usr/bin/env bash
set -euo pipefail

BUNDLER_DIR="${BUNDLER_DIR:-$HOME/.cache/wdk-worklet-bundler}"

if [[ ! -f "$BUNDLER_DIR/bin/wdk-worklet-bundler.js" ]]; then
  echo "Cloning and building wdk-worklet-bundler (npm package ships without dist/)..."
  rm -rf "$BUNDLER_DIR"
  git clone --depth 1 https://github.com/tetherto/wdk-worklet-bundler.git "$BUNDLER_DIR"
  (cd "$BUNDLER_DIR" && npm install && npm run build)
fi

node "$BUNDLER_DIR/bin/wdk-worklet-bundler.js" "$@"
