#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
python scripts/test-openfisca-572.py
node scripts/test-verifier-openfisca-572.mjs
python -c "import ast,pathlib; ast.parse(pathlib.Path('dist/openfisca-validation/run_openfisca_572.py').read_text())"
node --check dist/scripts/verifier-openfisca-572.mjs
node scripts/test-source-inchangee-540.mjs
node scripts/test-golden-540.mjs
node scripts/test-fiscal-individuel-570.mjs
node scripts/test-micro-571.mjs
node scripts/test-micro-572.mjs
node scripts/test-finitions-531.mjs
node scripts/test-release-572.mjs
(cd dist && sha256sum -c manifest-integrite-572.sha256 > /dev/null)
echo 'EcoSim 5.7.2 : contrôles locaux et manifest OK. OpenFisca réel : NON EXÉCUTÉ.'
