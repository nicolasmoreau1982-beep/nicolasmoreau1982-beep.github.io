#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
bash scripts/run-tests-510.sh
node scripts/test-finitions-531.mjs
node scripts/check-secrets-520.mjs
python scripts/test-browser-531.py
node scripts/stamp-build.mjs
node scripts/make-manifest-520.mjs
(cd dist && sha256sum -c manifest-integrite-531.sha256 > /dev/null)
node scripts/test-presentation-4211.mjs
node scripts/test-finitions-531.mjs
echo 'EcoSim 5.3.1 : tests, navigateur et manifeste OK.'
