#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
bash scripts/run-tests-510.sh
node scripts/check-secrets-520.mjs
(cd dist && sha256sum -c manifest-integrite-520.sha256 >/dev/null)
echo 'EcoSim 5.2 : tests de code, scanner de secrets statiques, empreintes de distribution OK'
if [ "${RUN_BROWSER_520:-0}" = '1' ]; then
  python scripts/test-browser-520.py
fi
