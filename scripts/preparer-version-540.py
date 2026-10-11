#!/usr/bin/env python3
"""Passage du paquet 5.3.1 à 5.4, sans modifier une ligne d'équation économique.
Les sources de référence 5.3.1 ont été gelées AVANT l'exécution de ce fichier.
"""
from pathlib import Path
import json
root=Path(__file__).resolve().parent.parent
D=root/'dist'; S=root/'scripts'
# Version des données, mais aucune formule moteur modifiée.
p=D/'data.js';v=p.read_text();assert 'version: "5.3.1"' in v;p.write_text(v.replace('version: "5.3.1"','version: "5.4.0"',1))
# Metadonnées générées courantes, valeurs conservées.
for f in ['provenance-politique-420.json','multiplicateurs-422.json']:
 p=D/'validation'/f;d=json.loads(p.read_text());assert d['version']=='5.3.1';d['version']='5.4.0';p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
# Paquet, footer et intitulés sur la page publiée (pages d'audit historiques non retitrées).
p=D/'index.html';s=p.read_text();assert 'data-ecosim-version>5.3.1' in s
s=s.replace('data-ecosim-version>5.3.1','data-ecosim-version>5.4.0')
s=s.replace('40219bdd801f','PAQUET_A_REMPLACER')
needle='· <a href="methodes-comparaison-politique-530.html">Méthodes de comparaison</a>'
assert needle in s;s=s.replace(needle,needle+' · <a href="validation-historique-540.html">Confrontation historique 5.4</a>',1)
needle='<a class="nav-link" href="evaluations-empiriques-423.html">Études indépendantes</a>'
assert needle in s;s=s.replace(needle,needle+'\n        <a class="nav-link" href="validation-historique-540.html">Validation 5.4</a>',1)
p.write_text(s)
# Navigation d'audit : référence et page de suivi.
p=D/'audit.html';s=p.read_text();
needle='href="evaluations-empiriques-423.html"';assert needle in s
s=s.replace(needle,'href="validation-historique-540.html"',1) if False else s
# Un lien visible au début de l'audit existant.
anchor='<main'
idx=s.find('>',s.find(anchor))
assert idx>=0
s=s[:idx+1]+'<p class="audit-caption" style="margin:1rem 2rem"><strong>Nouveau 5.4 :</strong> <a href="validation-historique-540.html">confrontation TVA 2009, protocole, résultats et six trajectoires de référence figées</a>.</p>'+s[idx+1:]
p.write_text(s)
# Conserver les faits : seuls les compteurs générés courants sont mis à jour.
p=D/'provenance-politique.html';s=p.read_text();
s=s.replace('Version 5.3.1 · registre généré','Version 5.4.0 · registre généré').replace('data-ecosim-version>5.3.1','data-ecosim-version>5.4.0')
p.write_text(s)
p=D/'site-meta-531.js';s=p.read_text().replace("|| '5.3.1'","|| '5.4.0'");p.write_text(s)
p=S/'stamp-build.mjs';s=p.read_text().replace('Version 5.3.1 — identifiant','Version 5.4.0 — identifiant').replace('ECOSIM_VERSION = "5.3.1"','ECOSIM_VERSION = "5.4.0"');p.write_text(s)
p=S/'make-manifest-520.mjs';s=p.read_text().replace("'521','530','531'", "'521','530','531','540'").replace('Manifeste 5.3.1 :','Manifeste 5.4.0 :');p.write_text(s)
# Mise à niveau assertions tests sur les métadonnées de la distribution active.
for p in S.glob('test-*'):
 if not p.is_file() or p.suffix not in ('.mjs','.py'):continue
 s=p.read_text();s=s.replace('5.3.1','5.4.0')
 if p.name in ['test-finitions-531.mjs','test-presentation-4211.mjs']:
  s=s.replace("(map.match(/<lastmod>/g)||[]).length,15", "(map.match(/<lastmod>/g)||[]).length,16")
  s=s.replace("(sitemap.match(/<lastmod>/g)||[]).length,15", "(sitemap.match(/<lastmod>/g)||[]).length,16")
 p.write_text(s)
# Nouvelle page indexée, sans antidater les autres pages.
p=D/'sitemap.xml';s=p.read_text();assert 'validation-historique-540.html' not in s
s=s.replace('</urlset>','  <url><loc>https://nicolasmoreau1982-beep.github.io/validation-historique-540.html</loc><lastmod>2026-10-11</lastmod></url>\n</urlset>')
p.write_text(s)
print('Distribution 5.4 préparée : logique métier inchangée, navigation, sitemap, métadonnées, tests adaptés')
