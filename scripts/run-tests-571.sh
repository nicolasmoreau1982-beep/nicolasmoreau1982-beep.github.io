#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
bash scripts/run-tests-570.sh
python scripts/test-openfisca-571.py
node scripts/test-confrontation-571.mjs
node --check dist/microdonnees-validation/estimer-571.mjs
node --check dist/scripts/auditer-ecarts-571.mjs
python -c "import ast, pathlib; ast.parse(pathlib.Path('dist/openfisca-validation/run_openfisca_571.py').read_text())"
(cd dist && sha256sum -c manifest-integrite-571.sha256 >/dev/null)
printf 'EcoSim 5.7.1 : interface, calcul pondéré, scripts OpenFisca préparés, tous contrôles de non-régression OK. Paquet OpenFisca réel non exécuté ici.\n'
