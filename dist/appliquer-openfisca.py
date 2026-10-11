#!/usr/bin/env python3
"""Publication additive et idempotente de la confrontation exécutée OpenFisca.
Usage: python appliquer-openfisca.py /chemin/vers/depot-ecosim
Adapte un checkout 5.8.4.1 sans écraser les autres fichiers du site.
"""
from __future__ import annotations
import hashlib
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path
from datetime import date

HERE=Path(__file__).resolve().parent
SRC=HERE/'payload'/'validation'/'openfisca-2026-10-11'
DATE='2026-10-11'
RECORD='validation/openfisca-2026-10-11'


def replace_unique(s: str, pattern: str, repl: str, name: str) -> str:
    s, n=re.subn(pattern,lambda m: repl,s,count=1,flags=re.S)
    if n!=1: raise RuntimeError(f'Impossible de localiser la section « {name} » : fichier non modifié. Vérifie les changements de la 5.8.4.1.')
    return s


def apply(site: Path, repo:Path):
    release_file=site/'release-status-572.json'
    if not release_file.exists() or not (site/'verification-openfisca-571.html').exists():
        raise RuntimeError('Racine du site introuvable : attendre dist/release-status-572.json et la page OpenFisca')
    status=json.loads(release_file.read_text(encoding='utf-8'))
    public_hash=hashlib.sha256((site/'validation'/'fiscal-individuel-570.json').read_bytes()).hexdigest()
    actual=json.loads((SRC/'rapport-confrontation-openfisca-572.json').read_text(encoding='utf-8'))
    raw=json.loads((SRC/'sortie-openfisca-reelle-572.json').read_text(encoding='utf-8'))
    if public_hash!=actual['inputFileSHA256'] or public_hash!=raw['inputFileSHA256']:
        raise RuntimeError('Le jeu des 56 foyers EcoSim est différent de celui utilisé lors de la confrontation : ne pas publier sans examen')
    if actual['count']!=56 or len(actual['rows'])!=56 or len(raw['cases'])!=56 or actual['afterDecote']['casesAboveOneEuro']!=0:
        raise RuntimeError('Artifact incomplet ou incohérent')
    old_page=(site/'verification-openfisca-571.html').read_text(encoding='utf-8')
    old_fiscal=(site/'fiscal-individuel-570.html').read_text(encoding='utf-8')

    callout='''<p class="guide-callout"><strong>Confrontation exécutée le 11 octobre 2026 : 56 foyers fictifs analysés avec OpenFisca-France 176.1.2.</strong> Aucun écart supérieur à 1 € sur l’impôt après décote ; écart maximal 0,475 €. Il s’agit d’une comparaison de calculs intermédiaires harmonisés, non d’une certification fiscale de bout en bout. <a href="#resultats-openfisca">Voir les résultats et leur portée</a>. Versions : simulateur <span data-ecosim-version>5.7.1</span> / outillage <span data-ecosim-technical-version>5.7.2</span>.</p>'''
    section='''<section id="resultats-openfisca"><h2>1. OpenFisca-France : première confrontation exécutée</h2>
<p><strong>Exécution constatée dans l’artifact du 11 octobre 2026</strong> : OpenFisca-France <strong>176.1.2</strong>, OpenFisca-Core 44.7.1, Python 3.11.17 ; période OpenFisca 2025 et revenus EcoSim 2025 déclarés en 2026. Le compte rendu du workflow indique 56 foyers fictifs et l’empreinte des entrées a été rapprochée du fichier de référence EcoSim.</p>
<table><caption>Écarts absolus de calcul, EcoSim contre OpenFisca, sur 56 foyers</caption><thead><tr><th scope="col">Grandeur comparée</th><th scope="col">Écart moyen</th><th scope="col">Écart maximal</th><th scope="col">Cas au-dessus de 1 €</th></tr></thead><tbody>
<tr><th scope="row">Impôt brut après plafonnement du quotient familial</th><td>0,00019 €</td><td>0,00094 €</td><td>0 sur 56</td></tr>
<tr><th scope="row">Impôt après décote</th><td>0,05645 €</td><td>0,475 €</td><td>0 sur 56</td></tr></tbody></table>
<p><strong>Lecture des divergences :</strong> dix cas dépassent un centime après décote. Leur écart est compatible avec un arrondi différent de la décote à l’euro ; cette explication reproduit les résultats du test, mais ne prouve pas quelle règle d’arrondi doit être retenue juridiquement.</p>
<p><strong>Ce que ce résultat ne prouve pas :</strong> les variables intermédiaires (<code>rni</code>, <code>nbptr</code>, <code>nbF</code> et situation familiale) ont été forcées afin d’aligner les deux calculs. Ce n’est <strong>pas une déclaration fiscale indépendante de bout en bout</strong>, ni une certification des montants d’impôt finaux, ni une validation des effets macroéconomiques ou d’une population représentative. La concordance entre l’année des paramètres OpenFisca et les conventions fiscales EcoSim demeure à documenter plus complètement.</p>
<p><strong>Documents publics de cette exécution :</strong> <a href="validation/openfisca-2026-10-11/rapport-analyse-2026-10-11.md" download>analyse complète (Markdown)</a> · <a href="validation/openfisca-2026-10-11/comparaison-56-foyers.csv" download>détail des 56 cas (CSV)</a> · <a href="validation/openfisca-2026-10-11/rapport-confrontation-openfisca-572.json" download>rapport JSON</a> · <a href="validation/openfisca-2026-10-11/sortie-openfisca-reelle-572.json" download>sortie OpenFisca brute</a> · <a href="validation/openfisca-2026-10-11/versions-dependances-572.txt" download>versions installées</a> · <a href="validation/openfisca-2026-10-11/artifact-provenance.sha256" download>empreintes SHA-256</a>.</p>
<p>L’<a href="https://github.com/nicolasmoreau1982-beep/nicolasmoreau1982-beep.github.io/actions/workflows/openfisca-572.yml">historique du workflow GitHub Actions</a> permet de retrouver les exécutions. Le lien précis de cette exécution et ses journaux pourront être ajoutés au dossier de preuves lorsque leur URL sera disponible.</p>
<p>La comparaison peut être reproduite à partir des <a href="validation/fiscal-individuel-570.json">56 cas d’entrée EcoSim</a>, du <code>openfisca-validation/run_openfisca_572.py</code> et du workflow manuel du dépôt ; aucun résultat de démonstration n’est présenté comme un résultat d’OpenFisca.</p>
</section>'''
    if 'Confrontation exécutée le 11 octobre 2026' not in old_page:
        old_page=replace_unique(old_page,r'<p class="guide-callout">.*?</p>',callout,'encart de statut OpenFisca')
    if 'id="resultats-openfisca"' not in old_page:
        old_page=replace_unique(old_page,r'<section>\s*<h2>1\. OpenFisca-France : exécution externe</h2>.*?</section>',section,'section confrontation OpenFisca')
    old_page=re.sub(r'(<meta name="description" content=")[^"]*(?=">)',r'\1Première confrontation OpenFisca exécutée sur 56 foyers fiscaux fictifs en octobre 2026 ; résultats, preuves, écarts et limites.',old_page,count=1)
    # L'atelier fiscal présentait encore la confrontation comme non exécutée.
    new_fiscal='''<section><h2>OpenFisca : résultats de la confrontation du 11 octobre 2026</h2>
<p>Une exécution réelle d’<a href="https://github.com/openfisca/openfisca-france">OpenFisca-France</a> 176.1.2 a comparé 56 foyers fictifs avec EcoSim : aucun écart supérieur à 1 € ; différence maximale après décote de 0,475 €. Cette confrontation repose sur des entrées fiscales intermédiaires forcées et ne constitue pas une validation complète de déclarations d’impôt.</p>
<p><a href="verification-openfisca-571.html#resultats-openfisca">Consulter les résultats, le rapport téléchargeable, la provenance et les limites de la comparaison →</a></p>
<p>Les foyers sont fictifs et non représentatifs : aucun rendement national ni distribution représentative par décile n’est déduit du test.</p></section>'''
    if 'OpenFisca : résultats de la confrontation du 11 octobre 2026' not in old_fiscal:
        old_fiscal=replace_unique(old_fiscal,r'<section>\s*<h2>OpenFisca : confrontation non encore exécutée</h2>.*?</section>',new_fiscal,'section OpenFisca atelier fiscal')

    # Stage data only after all content assertions have succeeded.
    dest=site/RECORD
    dest.mkdir(parents=True,exist_ok=True)
    for f in SRC.iterdir():
        if f.is_file(): shutil.copy2(f,dest/f.name)
    (site/'verification-openfisca-571.html').write_text(old_page,encoding='utf-8')
    (site/'fiscal-individuel-570.html').write_text(old_fiscal,encoding='utf-8')
    homepage=site/'index.html'
    if homepage.exists():
        intro=homepage.read_text(encoding='utf-8')
        intro=intro.replace('Protocole OpenFisca et données pondérées 5.7.1',
                            'Confrontation OpenFisca : 56 foyers comparés')
        homepage.write_text(intro,encoding='utf-8')

    status['openFiscaIndependentExecution']='executed_scoped_comparison_review_needed'
    status['openFiscaExternalEvidence']={
      'executionUTC':raw['generatedUTC'],
      'source':'GitHub Actions artifact fourni par l’éditeur (URL du run non archivée)',
      'runnerReported':'python_openfisca_direct',
      'sourceOpenFiscaFrance':'176.1.2',
      'sourceOpenFiscaCore':'44.7.1',
      'cases':56,
      'sourceCaseSHA256':public_hash,
      'afterDecoteMeanAbsoluteEuro':actual['afterDecote']['meanAbsoluteEuro'],
      'afterDecoteMaximumAbsoluteEuro':actual['afterDecote']['maximumAbsoluteEuro'],
      'aboveOneEuro':0,
      'scope':'Variables fiscales intermédiaires forcées. Comparaison non représentative; aucune certification fiscale complète.',
      'publishedReports':RECORD+'/rapport-confrontation-openfisca-572.json',
    }
    release_file.write_text(json.dumps(status,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

    # Mark significance on the two edited pages only.
    sitemap=site/'sitemap.xml'
    if sitemap.exists():
        xml=sitemap.read_text(encoding='utf-8')
        for pg in ['verification-openfisca-571.html','fiscal-individuel-570.html']:
            pattern=re.compile(r'(<url>\s*<loc>https://nicolasmoreau1982-beep\.github\.io/'+pg+r'</loc>)(?:\s*<lastmod>[^<]+</lastmod>)?(\s*</url>)')
            xml,count=pattern.subn(r'\g<1><lastmod>'+DATE+r'</lastmod>\g<2>',xml)
            if count!=1: raise RuntimeError(f'Impossible de dater dans le sitemap : {pg}')
        sitemap.write_text(xml,encoding='utf-8')
    # Ensure reproducible regression tests included in existing Pages CI, before deployment.
    test_target=site/'scripts'/'test-publication-openfisca-572.mjs'
    test_target.parent.mkdir(parents=True,exist_ok=True)
    shutil.copy2(HERE/'payload'/'scripts'/'test-publication-openfisca-572.mjs',test_target)
    ci_paths=[site/'.github'/'workflows'/'static.yml']
    if repo!=site: ci_paths.append(repo/'.github'/'workflows'/'static.yml')
    for ci in ci_paths:
        if ci.exists():
            ci_txt=ci.read_text(encoding='utf-8')
            if 'node scripts/test-publication-openfisca-572.mjs' not in ci_txt:
                needle='          node scripts/check-release-572.mjs'
                if needle not in ci_txt:
                    # Workflows elsewhere may use another deployment structure: do not rewrite blindly.
                    print('AVERTISSEMENT: workflow de déploiement à adapter manuellement :',ci)
                    continue
                ci_txt=ci_txt.replace(needle,needle+'\n          node scripts/test-publication-openfisca-572.mjs',1)
                ci.write_text(ci_txt,encoding='utf-8')
    runner=repo/'scripts'/'run-tests-572.sh'
    if runner.exists():
        run_text=runner.read_text(encoding='utf-8')
        run_text=run_text.replace("echo 'EcoSim 5.7.2 : contrôles locaux et manifest OK. OpenFisca réel : NON EXÉCUTÉ.'",
            "echo 'EcoSim 5.7.2 : tests locaux OK ; confrontation OpenFisca 56 cas publiée séparément (11 octobre 2026).'" )
        runner.write_text(run_text,encoding='utf-8')
    # Refresh build + manifest using the project's own tools when available.
    if (repo/'scripts'/'stamp-build.mjs').exists() and (repo/'scripts'/'make-manifest-572.mjs').exists():
        subprocess.run(['node','scripts/stamp-build.mjs'],cwd=repo,check=True)
        subprocess.run(['node','scripts/make-manifest-572.mjs'],cwd=repo,check=True)
        subprocess.run(['node','scripts/test-publication-openfisca-572.mjs'],cwd=site,check=True)
        subprocess.run(['node','scripts/check-release-572.mjs'],cwd=site,check=True)
    else:
        print('ATTENTION: scripts de stamp/manifest introuvables à la racine; relancer la chaîne de publication habituelle après intégration.')
    print('Publication OpenFisca intégrée localement (aucune modification du moteur). Publication distante non effectuée.')


def main():
    repo=Path(sys.argv[1] if len(sys.argv)>1 else '.').resolve()
    site=repo/'dist' if (repo/'dist'/'release-status-572.json').exists() else repo
    try: apply(site,repo)
    except Exception as e:
        print('ÉCHEC:',e,file=sys.stderr);sys.exit(1)

if __name__=='__main__': main()
