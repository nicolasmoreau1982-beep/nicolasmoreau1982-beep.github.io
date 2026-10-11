#!/usr/bin/env python3
"""Assemble explicit, verifiable Insee Ésane 2023 sector proxies; no causal calibration."""
import json, pathlib, html, hashlib, datetime
ROOT=pathlib.Path(__file__).resolve().parent.parent
OUT=ROOT/'dist'
url_ind='https://www.insee.fr/fr/statistiques/2015432'
url_com='https://www.insee.fr/fr/statistiques/2498421'
url_man='https://www.insee.fr/fr/statistiques/2015813'
# Values in Md€ converted from official amounts in million euro, and FTE persons.
# Same proxy reused for separate sectors is INTENTIONAL, never summable.
P={
'power': (47.522,28.022,222376,'Production et distribution d’électricité, gaz, vapeur et air conditionné',url_ind),
'refining':(4.919,None,None,'Cokéfaction et raffinage (investissement couvert par le secret statistique)',url_man),
'vehicles':(49.926,7.350,400297,'Fabrication de matériels de transport (inclut aussi l’aéronautique)',url_man),
'transport':(102.111,35.594,1287643,'Transports et entreposage',url_com),
'construction':(127.653,13.152,1594836,'Construction',url_com),
'metals':(51.906,9.929,360435+233163,'Métallurgie, produits métalliques, caoutchouc, plastique et minéraux non métalliques — somme de deux lignes Ésane',url_ind),
'chemical':(27.983,5.931,200358,'Industrie chimique',url_man),
'manufacturing':(302.634,51.905,2935313,'Industrie manufacturière (agrégat, englobe plusieurs autres proxys)',url_ind),
'food':(55.715,9.881,666435,'Denrées alimentaires et boissons',url_man),
'ict':(119.605,19.136,951374,'Information et communication',url_com),
'health':(111.606,7.618,92694+783526,'Pharmacie industrielle + enseignement, santé et action sociale marchands ; deux activités distinctes agrégées',url_man+' ; '+url_com),
'waste':(16.271,5.441,196821,'Eau, assainissement, déchets et dépollution (plus large que recyclage)',url_ind)
}
MAP={
'renewables':('power','Très large : mélange renouvelables, nucléaire, gaz et fourniture de chaleur.'),
'nuclear':('power','Très large : impossible d’isoler le nucléaire à partir de ce total.'),
'fossil':('refining','Partiel : uniquement le raffinage, pas les autres activités fossiles.'),
'grids':('power','Très large : réseaux non isolés des producteurs d’énergie.'),
'automotive':('vehicles','Large : matériels de transport, non limité aux automobiles et batteries.'),
'transit':('transport','Très large : rail et transports collectifs non isolés des autres transports.'),
'aviation':('transport','Très large : aviation, maritime et logistique mêlés aux transports terrestres.'),
'building':('construction','Large : la rénovation énergétique n’est pas séparée du reste du bâtiment.'),
'metals':('metals','Large : agrège métallurgie, produits métalliques, plastiques et minéraux.'),
'chemical':('chemical','Partiel : industrie chimique seule, pas tous les matériaux.'),
'manufacturing':('manufacturing','Ensemble manufacturier qui chevauche automobile, chimie, métaux et agroalimentaire.'),
'agriculture':(None,'Absent du champ Ésane non agricole : aucun proxy attribué.'),
'food':('food','Fabrication alimentaire et boissons ; n’inclut pas l’ensemble des activités agricoles.'),
'digital':('ict','Large : télécoms et médias inclus, centres de données non isolés.'),
'health':('health','Large : inclut enseignement marchand et action sociale, exclut santé publique non marchande.'),
'circular':('waste','Large : eau et assainissement inclus, réparation non isolée.')
}
rows={}
for s,(proxy,note) in MAP.items():
    if proxy is None:
        rows[s]={'proxyId':None,'proxyLabel':None,'valueAddedBn':None,'investmentBn':None,'fte':None,'sourceUrl':None,'coverage':'unavailable','note':note}
    else:
        va,inv,fte,label,url=P[proxy]
        rows[s]={'proxyId':proxy,'proxyLabel':label,'valueAddedBn':va,'investmentBn':inv,'fte':fte,'sourceUrl':url,'coverage':'proxy','note':note}
obj={'dataset':'Insee Ésane 2023 — entreprises marchandes non agricoles et non financières',
 'year':2023,'released':'2025-09-18','unit':'Md€ courants, EQTP salariés',
 'scope':'Entreprises du champ Ésane. Ni comptabilité nationale 2025, ni assiette fiscale, ni effet causal mesuré.',
 'warning':'Les proxys se recouvrent entre filières. Ne jamais sommer ces niveaux pour obtenir une taille de marché nationale.',
 'sourceUrls':[url_ind,url_com,url_man],
 'behaviorStatus':'not_causally_estimated',
 'conventions':{'intensityReference':round(289.096/1439.043,9),'intensityFactorMin':0.75,'intensityFactorMax':1.25,
                'investmentCapFraction':0.15,'description':'Hypothèses de stress illustratives, non paramètres économétriquement calibrés'},
 'sectors':rows}
path=OUT/'data'/'sectoral-observations-2023.json';path.parent.mkdir(exist_ok=True,parents=True)
path.write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
js='/* Généré de data/sectoral-observations-2023.json — modifier la source JSON et relancer scripts/build-observations-425.py. */\nwindow.ECOSIM_SECTOR_OBS=Object.freeze('+json.dumps(obj,ensure_ascii=False,separators=(',',':'))+');\n'
(OUT/'sectoral-observations.js').write_text(js,encoding='utf8')
# Pre-rendered accessible table, every row indicates scope and non-causal validity.
def make_row(s,r):
    def money(x): return f"{x:.3f}" if x is not None else "—"
    return ('<tr><th scope="row">'+html.escape(s)+'</th><td>'+money(r['valueAddedBn'])+'</td><td>'+money(r['investmentBn'])+'</td><td>'+html.escape(r['proxyLabel'] or 'Aucune donnée disponible')+'</td><td>'+html.escape(r['note'])+'</td></tr>')
body='\n'.join(make_row(s,r) for s,r in rows.items())
page='''<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="index,follow"><title>Données sectorielles observées — EcoSim 4.25</title><meta name="description" content="Ancrages Ésane 2023, couverture des filières et limites des réactions hypothétiques des entreprises dans EcoSim."><link rel="canonical" href="https://nicolasmoreau1982-beep.github.io/donnees-sectorielles-425.html"><link rel="stylesheet" href="styles.css"><link rel="stylesheet" href="guides.css"><script src="theme.js"></script></head><body><a class="skip-link" href="#main">Aller au contenu</a><header class="guide-header"><a class="brand" href="index.html">EcoSim <b>France</b></a><nav class="guide-nav" aria-label="Navigation"><a href="index.html#sectoral-fiscal">Simulateur</a><a href="audit.html">Audit</a></nav></header><main id="main" class="guide-main"><p class="guide-breadcrumb"><a href="index.html">Accueil</a> / Statistiques sectorielles</p><div class="guide-hero"><span class="guide-kicker">EcoSim France 4.25 · données de contexte</span><h1>Confronter une politique sectorielle aux ordres de grandeur observés</h1><p class="guide-lead">Statistiques Insee Ésane 2023, publiées le 18 septembre 2025. Les données renseignent la taille des secteurs marchands, pas la réaction des entreprises à un impôt ou à une aide.</p></div><section><h2>Ce que la 4.25 ajoute</h2><p>Le mode « Exploratoire encadré » fait varier les effets macro conventionnels selon l’intensité d’investissement historique (investissement corporel / valeur ajoutée), à l’aide d’un facteur borné entre 0,75 et 1,25, et plafonne le choc supplémentaire à 15 % de l’investissement corporel 2023 du proxy. Ce sont des <strong>conventions de prudence, pas des coefficients causaux estimés</strong>. Lorsqu’aucun investissement sectoriel n’est disponible, ce mode conserve seulement l’effet comptable. Les modes précédents restent disponibles et inchangés.</p><p>Le montant saisi par l’utilisateur reste une hypothèse budgétaire : aucune assiette ni rendement réel n’est automatiquement calculé. Les statistiques 2023 ne sont pas une prévision pour 2026–2055, et les secteurs peuvent se recouvrir.</p></section><section><h2>Données observées et limites de couverture</h2><div style="overflow-x:auto"><table><caption>Proxys de filières EcoSim — Insee Ésane 2023, montants en Md€ courants. Ces lignes se recouvrent et ne doivent pas être additionnées.</caption><thead><tr><th scope="col">Filière (identifiant)</th><th scope="col">Valeur ajoutée</th><th scope="col">Investissement</th><th scope="col">Proxy Insee</th><th scope="col">Limite</th></tr></thead><tbody>'''+body+'''</tbody></table></div></section><section><h2>Pourquoi ce n’est pas encore une calibration causale</h2><p>Une photographie de valeur ajoutée et d’investissement ne révèle pas la part de l’investissement provoquée par un changement fiscal. Pour calibrer cette élasticité, il faudrait suivre les entreprises exposées et des entreprises de comparaison, mesurer les investissements avant et après, tenir compte des tendances, identifier les dispositifs fiscaux, et tester la robustesse des estimations. Ce travail n’est pas inclus dans le moteur 4.25.</p><p>Les filières nucléaire et renouvelables réutilisent le même grand proxy électrique ; elles ne disposent d’aucune assiette fiscale propre. L’agriculture n’est pas renseignée par ce champ Ésane.</p></section><section><h2>Sources et téléchargement</h2><p><a href="https://www.insee.fr/fr/statistiques/2015432">Insee — industrie par activité</a> ; <a href="https://www.insee.fr/fr/statistiques/2015813">Insee — industrie manufacturière</a> ; <a href="https://www.insee.fr/fr/statistiques/2498421">Insee — secteurs marchands</a>.</p><p><a href="data/sectoral-observations-2023.json" download>Télécharger le jeu de données de contexte JSON (16 filières)</a></p></section><p><a href="index.html#sectoral-fiscal">Retour au simulateur →</a></p></main><footer class="guide-footer">EcoSim France · Version 4.25 · Données sectorielles exploratoires · <a href="confidentialite.html">Confidentialité</a></footer></body></html>'''
(OUT/'donnees-sectorielles-425.html').write_text(page,encoding='utf8')
print('wrote',path,'and JS, page;  proxies',len(rows))
