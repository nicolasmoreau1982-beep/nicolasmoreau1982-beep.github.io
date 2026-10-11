#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
node scripts/projeter-retraites-550.mjs
node scripts/confronter-retraites-550.mjs
# La batterie historique ne remplace JAMAIS les valeurs gelées 5.3.1.
bash scripts/run-tests-510.sh
node scripts/check-secrets-520.mjs
python scripts/test-browser-531.py
python scripts/test-page-historique-540.py
python scripts/test-page-retraites-550.py
node scripts/stamp-build.mjs
node scripts/make-manifest-520.mjs
(cd dist && sha256sum -c manifest-integrite-550.sha256 >/dev/null)
node scripts/test-golden-540.mjs
node scripts/test-source-inchangee-540.mjs
node scripts/test-cohort-550.mjs
printf 'EcoSim 5.5 : cohorte expérimentale, 5.3.1 golden et suite historique OK.\n'
