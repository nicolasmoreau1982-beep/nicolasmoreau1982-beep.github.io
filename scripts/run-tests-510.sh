#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
for script in scripts/test-*.mjs; do
  echo "[EcoSim 5.2] $script"
  node "$script"
done
for script in dist/*.js; do node --check "$script" >/dev/null; done
echo "[EcoSim 5.2] Suites de tests et syntaxe JS : OK"
