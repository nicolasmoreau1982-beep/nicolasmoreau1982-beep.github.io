#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
node scripts/gen-fiscal-570.mjs
bash scripts/run-tests-510.sh
node scripts/test-source-inchangee-540.mjs
node scripts/test-golden-540.mjs
python scripts/test-browser-fiscal-570.py
node scripts/stamp-build.mjs
node scripts/make-manifest-520.mjs
(cd dist && sha256sum -c manifest-integrite-571.sha256 >/dev/null)
node scripts/test-finitions-531.mjs
printf 'EcoSim public 5.7.1 / outillage technique 5.7.2 : calcul individuel testé, moteur macro inchangé, golden 5.3.1 inchangés, manifeste OK. OpenFisca externe non exécuté.\n'
