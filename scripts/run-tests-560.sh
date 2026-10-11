#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
# Le rapport de sensibilité n'est pas recalculé implicitement par les tests de publication.
# Pour modifier n/graine : node scripts/sensibilite-globale-560.mjs
bash scripts/run-tests-510.sh
node scripts/check-secrets-520.mjs
python scripts/test-browser-531.py
python scripts/test-page-historique-540.py
python scripts/test-page-retraites-550.py
python scripts/test-page-sensibilite-560.py
node scripts/stamp-build.mjs
node scripts/make-manifest-520.mjs
(cd dist && sha256sum -c manifest-integrite-560.sha256 >/dev/null)
node scripts/test-golden-540.mjs
node scripts/test-source-inchangee-540.mjs
node scripts/test-sensibilite-560.mjs
printf 'EcoSim 5.6 : Monte Carlo/Sobol, tests existants, golden 5.3.1 et manifeste OK.\n'
