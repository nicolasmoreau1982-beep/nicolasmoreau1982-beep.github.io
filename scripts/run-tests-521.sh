#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
bash scripts/run-tests-510.sh
node scripts/check-secrets-520.mjs
# Certains tests régénèrent des exports de benchmark : empreintes APRÈS les tests.
node scripts/stamp-build.mjs
node scripts/make-manifest-520.mjs
(cd dist && sha256sum -c manifest-integrite-521.sha256 >/dev/null)
if [ "${RUN_BROWSER_521:-0}" = "1" ]; then
  python scripts/test-browser-520.py
  python scripts/audit-accessibilite-521.py
fi
echo 'EcoSim 5.2.1 : tests, scanner, empreintes OK. Lecteur d’écran et Lighthouse non couverts.'
