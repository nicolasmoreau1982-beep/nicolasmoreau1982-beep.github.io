#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
# Les tests précédents peuvent regénérer des exports ; estampiller après leur exécution.
bash scripts/run-tests-510.sh
node scripts/check-secrets-520.mjs
node scripts/stamp-build.mjs
node scripts/make-manifest-520.mjs
(cd dist && sha256sum -c manifest-integrite-530.sha256 >/dev/null)
node scripts/test-presentation-4211.mjs
if [ "${RUN_BROWSER_530:-0}" = "1" ]; then
  python scripts/test-browser-520.py
  python scripts/test-browser-530.py
  python scripts/audit-accessibilite-521.py
fi
echo 'EcoSim 5.3 : non-régression, profils politiques, empreintes OK.'
