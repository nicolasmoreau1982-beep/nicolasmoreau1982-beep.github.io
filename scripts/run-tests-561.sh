#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
# Preserve frozen economic fixtures: NEVER regenerate golden-531 here.
bash scripts/run-tests-510.sh
node scripts/check-secrets-520.mjs
node scripts/test-golden-540.mjs
node scripts/test-source-inchangee-540.mjs
python scripts/test-page-historique-540.py
python scripts/test-page-retraites-550.py
python scripts/test-page-sensibilite-560.py
python scripts/test-page-sensibilite-561.py
python scripts/test-browser-531.py
node scripts/stamp-build.mjs
node scripts/make-manifest-520.mjs
(cd dist && sha256sum -c manifest-integrite-561.sha256 >/dev/null)
node scripts/test-statistique-561.mjs
printf 'EcoSim 5.6.1 : tests statistiques, moteurs historiques, golden 5.3.1, pages Chromium et manifeste OK.\n'
