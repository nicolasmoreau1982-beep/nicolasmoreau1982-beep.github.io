#!/usr/bin/env python3
"""EcoSim API 5.9 experimental patch, additif et ré-exécutable. Aucun déploiement."""
from pathlib import Path
import sys, shutil, subprocess
BASE = Path(__file__).resolve().parent
if len(sys.argv) != 2:
    sys.exit('Utilisation : python3 appliquer_api_590.py /chemin/vers/depot')
ROOT = Path(sys.argv[1]).expanduser().resolve()
DIST = ROOT / 'dist' if (ROOT/'dist/index.html').is_file() else ROOT
INDEX = DIST / 'index.html'
if not INDEX.is_file() or not (DIST / 'app.js').is_file() or not (ROOT / 'scripts/core-harness-540.mjs').is_file():
    sys.exit('Erreur : dépôt EcoSim attendu avec dist/app.js et scripts/core-harness-540.mjs (ne pas appliquer à la racine du site seul).')
if not (BASE/'api-preview-59').is_dir(): sys.exit('Erreur : sources du prototype absentes du patch.')
for src, target in [(BASE/'api-preview-59', ROOT/'api-preview-59'),
                    (BASE/'examples/scenario-api-590.json',ROOT/'examples/scenario-api-590.json'),
                    (BASE/'dist/api-experimentale-590.html', DIST/'api-experimentale-590.html'),
                    (BASE/'scripts/test-api-590.mjs', ROOT/'scripts/test-api-590.mjs')]:
    sources = [src] if src.is_file() else list(src.rglob('*'))
    for f in sources:
        if not f.is_file(): continue
        rel = f.relative_to(src) if src.is_dir() else Path('')
        dest = target/rel if src.is_dir() else target
        if dest.exists() and dest.read_bytes() != f.read_bytes():
            sys.exit(f'Abandon : fichier déjà présent et différent, sauvegarder avant fusion : {dest}')
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(f,dest)
html=INDEX.read_text(encoding='utf-8')
LINK = '<p class="api-preview-entry" role="note"><a href="api-experimentale-590.html">API EcoSim — spécifications OpenAPI (non active)</a> · futur échange de scénarios JSON, sans webservice disponible sur GitHub Pages.</p>'
if 'api-preview-entry' not in html:
    marker='<input id="import-scenario-file"'
    at=html.find(marker)
    if at<0: sys.exit('Impossible de localiser l’import de scénarios : aucune modification de index.html')
    end=html.find('>',at)
    if end<0: sys.exit('HTML non reconnu')
    html=html[:end+1]+'\n              '+LINK+html[end+1:]
    INDEX.write_text(html,encoding='utf-8')
    print('Lien API expérimental ajouté près de l’import de scénario.')
else: print('Lien déjà présent.')
FOOTER_LINK = '<a href="api-experimentale-590.html">API (spécifications, non active)</a>'
if FOOTER_LINK not in html:
    at=html.rfind('</footer>')
    if at<0:sys.exit('Balise footer introuvable')
    html=html[:at]+'      '+FOOTER_LINK+'\n    '+html[at:]
    INDEX.write_text(html, encoding='utf-8')
# Générer le contrat depuis la version du moteur réellement présente chez l’utilisateur.
completed=subprocess.run(['node',str(ROOT/'api-preview-59/generate.mjs')],cwd=ROOT,text=True)
if completed.returncode:sys.exit('Échec génération OpenAPI: correction manuelle nécessaire.')
# Toute modification des fichiers publiés exige un nouvel estampillage et un manifeste exact.
for command in ['scripts/stamp-build.mjs','scripts/make-manifest-572.mjs']:
    if not (ROOT/command).exists():sys.exit(f'Fichier requis absent : {command}')
    if subprocess.run(['node',str(ROOT/command)],cwd=ROOT).returncode:sys.exit(f'Échec : {command}')
print('Installation additive terminée. Aucune API publique activée. Tests : node api-preview-59/test-api-590.mjs')
