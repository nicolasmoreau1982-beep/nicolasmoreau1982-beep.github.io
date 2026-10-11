#!/usr/bin/env python3
"""Mise à jour éditoriale 5.3.1 sur une copie propre de 5.3, sans toucher aux équations.
Conserve GitHub Issues comme unique canal de contact public.
"""
from pathlib import Path
import json,re
root=Path(__file__).resolve().parent.parent
dist=root/'dist'
VERSION='5.3.1'
for file in sorted(dist.glob('*.html')):
    if file.name.startswith('google'): continue
    html=file.read_text()
    # Pas de remplacement des titres d'archives historiques (4.21, 5.0, 5.1, 5.2, 5.3).
    # Remplacer uniquement la version *courante* dans les bandeaux de site.
    html=html.replace('Version 5.3 · paquet', 'Version <span data-ecosim-version>5.3.1</span> · paquet')
    html=html.replace('Version 5.3</span>', 'Version <span data-ecosim-version>5.3.1</span></span>')
    html=html.replace('EcoSim France · v5.3 · paquet','EcoSim France · v<span data-ecosim-version>5.3.1</span> · paquet')
    # En-tête data.js suit le versionnement logiciel, les audits historiques demeurent identifiés.
    if file.name=='index.html':
        assert 'Nouveau : intégrité et sécurité du moteur 5.1' in html
        html=html.replace('Nouveau : intégrité et sécurité du moteur 5.1', 'Intégrité du moteur : contrôles 5.1')
        audit='<a class="hero-audit-link" href="audit.html">Sources, méthode et incertitude : consulter l’audit ↗</a>'
        assert audit in html
        mini='''<p class="hero-transparence-531"><strong>Transparence du modèle :</strong> <a href="provenance-politique.html">357 réglages documentés</a> · <a href="evaluations-empiriques-423.html">Études indépendantes et limites</a> · <a href="methodes-comparaison-politique-530.html">Méthodes de comparaison</a>. Les résultats sont des simulations, pas des prévisions certifiées.</p>'''
        html=html.replace(audit,audit+'\n            '+mini,1)
        # Version courante visible près de la synthèse en plus du pied de page.
        marker='<p class="hero-reference-note">'
        assert marker in html
        html=html.replace(marker,'<p class="current-version-531">Version actuelle : <strong data-ecosim-version>5.3.1</strong></p>\n            '+marker,1)
    if file.name=='contact-signalement.html':
        orig='<section><h2>Autre moyen de contact</h2><p>À ce jour, aucune adresse électronique publique distincte du compte GitHub n’a été renseignée. <strong>Le formulaire de tickets GitHub reste donc le seul canal public confirmé.</strong> Si vous souhaitez signaler un problème sans compte GitHub, ce canal n’est pas encore disponible ; cette limite est explicitée plutôt que de simuler l’envoi d’un message.</p></section>'
        assert orig in html
        html=html.replace(orig,'''<section><h2>Pourquoi les tickets GitHub ?</h2><p>EcoSim France est un <strong>projet personnel à vocation pédagogique</strong>. Les tickets GitHub sont son <strong>unique canal de signalement</strong> : ils permettent de présenter les sources, reproduire les écarts et suivre publiquement les corrections. Un compte GitHub est nécessaire ; aucun formulaire ou contact par e-mail n’est proposé.</p></section>''')
    if file.name=='a-propos.html':
        # Une description factuelle du projet, sans statuer sur son statut légal.
        html=html.replace("Le code et l'historique des modifications sont publiés sur le", "EcoSim France est un <strong>projet personnel à vocation pédagogique</strong>, dont le code et l'historique des modifications sont publiés sur le", 1)
    if file.name=='informations-legales.html':
        html=html.replace('Ce document indique les informations vérifiables sur la publication du site et les renseignements qui restent à compléter.', 'EcoSim France est un projet personnel à vocation pédagogique. Cette page présente les informations vérifiables et les éléments qui restent à confirmer.')
        orig='<section><h2>Hébergement</h2><p>Le site public utilise <a href="https://pages.github.com/">GitHub Pages</a>, service exploité par GitHub, Inc., une filiale de Microsoft. Pour connaître les coordonnées de contact officielles de l’hébergeur, consultez les <a href="https://docs.github.com/en/site-policy">documents juridiques de GitHub</a>. Les coordonnées légales exactes de l’hébergeur restent à compléter ici après vérification.</p></section>'
        assert orig in html
        html=html.replace(orig,'''<section><h2>Hébergement</h2><p><strong>Service :</strong> <a href="https://pages.github.com/">GitHub Pages</a>, fourni par GitHub, Inc. (groupe Microsoft).</p><p><strong>Adresse de GitHub, Inc. :</strong> 88 Colin P. Kelly Jr. St., San Francisco, CA 94107, États-Unis, telle que publiée dans sa <a href="https://docs.github.com/fr/site-policy/privacy-policies/github-general-privacy-statement">déclaration de confidentialité officielle</a>.</p><p><strong>Assistance :</strong> <a href="https://support.github.com/">support GitHub</a>. Les autres renseignements éventuellement requis sur l'hébergeur restent à vérifier ; aucun numéro de téléphone n'est inventé.</p></section>''')
        # Conserver la limite sur l'identité, mais clarifier conditions d'anonymat non professionnel.
        orig='<section><h2>À compléter avant validation juridique</h2><p>Vérifier le statut de l’éditeur, les coordonnées légalement requises du responsable et de l’hébergeur, et la conformité de la mesure d’audience. Le site n’affirme pas que ces points ont déjà reçu une validation juridique.</p></section>'
        assert orig in html
        html=html.replace(orig,'''<section><h2>Publication personnelle et informations de l'éditeur</h2><p>Le site est présenté par son auteur comme un projet personnel pédagogique, et non comme un service institutionnel. L’<a href="https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000049568614/2026-04-25">article 1er-1, II, de la LCEN</a> prévoit, sous conditions, la possibilité de préserver l’anonymat public d’un éditeur non professionnel si ses informations d'identification ont été communiquées à l'hébergeur.</p><p><strong>À confirmer :</strong> conditions du régime effectivement applicable, informations communiquées à l'hébergeur et autres mentions éventuellement requises. Cette notice ne constitue pas une attestation de conformité juridique ; aucune identité personnelle n'est publiée ici par défaut.</p></section>''')
        html=html.replace('Pour contester une donnée, un lien ou un résultat, consultez la page <a href="contact-signalement.html">Contact et signalement</a>.', 'Pour signaler une donnée, un lien ou un résultat, ouvrez un ticket GitHub via la page <a href="contact-signalement.html">Contact et signalement</a> ; un compte GitHub est requis.')
    # Chaque page s'appuie sur un script court pour l'affichage de la version actuelle.
    meta='<script src="site-meta-531.js" defer></script>'
    if meta not in html:
        if file.name!='index.html' and '<script src="build-info.js"' not in html:
            meta='<script src="build-info.js" defer></script>'+meta
        html=html.replace('</head>',meta+'</head>',1)
    file.write_text(html)

# data/registre : seule la métadonnée de version change.
file=dist/'data.js';s=file.read_text(); assert 'version: "5.3.0"' in s
file.write_text(s.replace('version: "5.3.0"','version: "5.3.1"',1))
file=dist/'validation/provenance-politique-420.json';v=json.loads(file.read_text());v['version']=VERSION;file.write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n')

(dist/'site-meta-531.js').write_text('''/* 5.3.1 : version affichée, distincte de la date d'une page d'audit. */
(() => {
  'use strict';
  const show = () => {
    for (const el of document.querySelectorAll('[data-ecosim-version]')) {
      el.textContent = window.ECOSIM_VERSION || '5.3.1';
    }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', show, {once:true});
  else show();
})();
''')
file=dist/'styles.css'
file.write_text(file.read_text()+'''
/* 5.3.1 — encart de transparence concis : pas de deuxième avertissement massif. */
.current-version-531 {font-size:.85rem;opacity:.88;margin:.5rem 0 .25rem;}
.hero-transparence-531 {font-size:.88rem;line-height:1.55;max-width:860px;padding:.7rem .85rem;border-left:3px solid currentColor;background:rgba(128,128,128,.075);border-radius:0 .5rem .5rem 0;margin:.65rem 0 .75rem;}
.hero-transparence-531 a:focus-visible {outline:3px solid #2663b6;outline-offset:3px;}
''')

# Exactitude d'une date lastmod : ajout uniquement sur la page méthode réellement publiée en 5.3.
file=dist/'sitemap.xml';s=file.read_text()
old='<loc>https://nicolasmoreau1982-beep.github.io/methodes-comparaison-politique-530.html</loc></url>'
assert old in s
s=s.replace(old,'<loc>https://nicolasmoreau1982-beep.github.io/methodes-comparaison-politique-530.html</loc><lastmod>2026-10-11</lastmod></url>')
s=s.replace('<loc>https://nicolasmoreau1982-beep.github.io/a-propos.html</loc></url>', '<loc>https://nicolasmoreau1982-beep.github.io/a-propos.html</loc><lastmod>2026-10-11</lastmod></url>')
file.write_text(s)
print('5.3.1 préparée : version, audit en home, GitHub seul, informations d’hébergeur et sitemap. Aucun calcul changé.')
