#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
# Tester la logique métier et les données AVANT d'estampiller.
bash scripts/run-tests-510.sh
node scripts/check-secrets-520.mjs
# Le navigateur est un contrôle de fumée, pas un audit RGAA ou Lighthouse complet.
TERM=${TERM:-xterm} python scripts/test-browser-531.py
python scripts/test-page-historique-540.py
# Les deux fichiers d'observations et de prédictions sont des archives de résultats,
# on n'écrase JAMAIS le golden de la version précédente.
node scripts/stamp-build.mjs
node scripts/make-manifest-520.mjs
(cd dist && sha256sum -c manifest-integrite-540.sha256 >/dev/null)
node scripts/test-presentation-4211.mjs
node scripts/test-finitions-531.mjs
node scripts/test-golden-540.mjs
node scripts/test-source-inchangee-540.mjs
node scripts/test-tva-540.mjs
printf 'EcoSim 5.4 : suite complète, navigateur, confrontation TVA et manifeste OK.\n'
