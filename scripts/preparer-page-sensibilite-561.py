from pathlib import Path
import json,html
D=Path(__file__).resolve().parent.parent/'dist'
r=json.loads((D/'validation/sensibilite-globale-561.json').read_text())
E=lambda s:html.escape(str(s),quote=True)
f2=lambda x:'—' if x is None else f'{x:+.2f}'.replace('.',',')
f3=lambda x:'—' if x is None else f'{x:+.3f}'.replace('.',',')
metrics={v['id']:v['label'] for v in r['metrics']}
factors={v['id']:v['label'] for v in r['factors']}
sections=[]
for sc in r['scenarios']:
 rows=''.join(f'<tr><th scope="row">{s["horizon"]} an(s) · {E(metrics[s["metric"]])}</th><td>{f3(s["central"])}</td><td>{f3(s["p05"])}</td><td>{f3(s["p50"])}</td><td>{f3(s["p95"])}</td></tr>' for s in sc['summaries'])
 sos=[]
 for metric in ('gdpDeltaPct','debtDeltaPp'):
  for f in r['factors']:
   s=next(a for a in sc['sobol'] if a['horizon']==5 and a['metric']==metric and a['factor']==f['id'])
   status='Inactif dans ce cas' if s['inactive'] else ('S₁ &gt; ST : écart d’échantillonnage' if s['apparentViolation'] else '—')
   sos.append(f'<tr><th scope="row">{E(metrics[metric])}</th><td>{E(f["label"])}</td><td>{f2(s["first"])}</td><td>{f2(s["total"])}</td><td>[{f2(s["firstLow"])} ; {f2(s["firstHigh"])}]</td><td>[{f2(s["totalLow"])} ; {f2(s["totalHigh"])}]</td><td>{status}</td></tr>')
 sections.append(f'''<section id="scenario-{E(sc['id'])}"><h2>{E(sc['label'])}</h2><p>Seuls les coefficients changent ; les mesures budgétaires restent identiques pendant les tirages.</p>
<div class="prov-scroll"><table><caption>Écart à la trajectoire sans réforme : quantiles descriptifs</caption><thead><tr><th scope="col">Horizon · indicateur</th><th scope="col">Central</th><th scope="col">Q05</th><th scope="col">Médiane</th><th scope="col">Q95</th></tr></thead><tbody>{rows}</tbody></table></div>
<h3>Indices de sensibilité à cinq ans</h3><p>Premier ordre (S₁, covariance centrée) et effet total (ST, Jansen) : <strong>estimateurs bruts</strong>, non écrêtés. Les plages entre crochets résultent du bootstrap de {r['replicates']} rééchantillonnages de paires ; elles sont descriptives et ne représentent pas une incertitude économique validée.</p>
<div class="prov-scroll"><table><caption>Indices bruts et dispersion bootstrap (horizon 2030)</caption><thead><tr><th scope="col">Indicateur</th><th scope="col">Facteur</th><th scope="col">S₁</th><th scope="col">ST</th><th scope="col">Bootstrap S₁</th><th scope="col">Bootstrap ST</th><th scope="col">Diagnostic</th></tr></thead><tbody>{''.join(sos)}</tbody></table></div></section>''')
frows=''.join(f'<tr><th scope="row">{E(f["label"])}</th><td>×{str(f["lo"]).replace(".",",")}</td><td>×{str(f["hi"]).replace(".",",")}</td><td>{E(f["effect"])}</td></tr>' for f in r['factors'])
page=f'''<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Sensibilité statistique corrigée 5.6.1 | EcoSim France</title>
<meta name="description" content="EcoSim 5.6.1 : correction des indices Sobol, nouveau générateur, diagnostic des paramètres inactifs, bootstrap et reproduction des simulations."><link rel="canonical" href="https://nicolasmoreau1982-beep.github.io/sensibilite-globale-561.html"><meta property="og:type" content="article"><meta property="og:locale" content="fr_FR"><meta property="og:title" content="Correction statistique 5.6.1 | EcoSim France"><meta property="og:image" content="https://nicolasmoreau1982-beep.github.io/og-ecosim.png"><meta name="twitter:card" content="summary_large_image"><link rel="stylesheet" href="styles.css"><link rel="stylesheet" href="guides.css"><script src="theme.js"></script><script src="build-info.js" defer></script><script src="site-meta-531.js" defer></script></head>
<body><a class="skip-link" href="#main">Aller au contenu</a><header class="guide-header"><a class="brand" href="index.html">EcoSim <b>France</b></a><nav class="guide-nav" aria-label="Navigation principale"><a href="index.html">Simulateur</a><a href="audit.html">Audit</a><a href="glossaire.html">Glossaire</a><a href="contact-signalement.html">Signaler</a></nav></header>
<main id="main" class="guide-main"><p class="guide-breadcrumb"><a href="index.html">Accueil</a> / Correction statistique 5.6.1</p><div class="guide-hero"><span class="guide-kicker">EcoSim 5.6.1 — correctif scientifique</span><h1>Sensibilité globale : résultats corrigés et contrôlés</h1><p class="guide-lead">Cette page remplace les indices de la <a href="sensibilite-globale-560.html">campagne 5.6 conservée comme archive</a>. Les formules économiques d'EcoSim ne changent pas : seuls l'échantillonnage et les estimateurs statistiques ont été modifiés.</p></div>
<section><h2>1. Pourquoi la correction ?</h2><p>La campagne 5.6 présentait un premier ordre supérieur au total dans la totalité des indices vérifiés. Le petit échantillon et la structure du générateur LCG pouvaient produire une corrélation indésirable. La version 5.6.1 utilise <strong>Xoshiro128** avec des flux distincts pour A et B</strong>, un premier ordre par covariance centrée (Saltelli) et un total par la formule de Jansen. Le modèle reste entièrement hypothétique : ces résultats ne sont pas des prévisions de l'économie française.</p>
<p><strong>Diagnostic de cette campagne :</strong> {r['n']} paires, {r['projectionsTotales']} projections sur 30 ans, {r['diagnostics']['violationsPremierSuperieurTotal']} cas de S₁ &gt; ST sur {r['diagnostics']['indicesFinis']} indices estimés, {r['diagnostics']['facteursStructurellementInactifs']} paramètres structurellement inactifs avec S₁ = 0, durée mesurée {str(r['tempsSecondes']).replace('.',',')} secondes dans l'environnement de calcul. Les dépassements restants <strong>ne sont pas corrigés artificiellement</strong> : les indices restent incertains à cette taille d'échantillon.</p>
<p>Les intervalles bootstrap quantifient une variabilité de rééchantillonnage conditionnelle aux paires tirées. Ils ne corrigent pas les biais systématiques, ni ne fournissent des probabilités économiques. Les bornes/plafonds du moteur restent actifs.</p></section>
<section><h2>2. Hypothèses étudiées</h2><p>Cinq paramètres supposés indépendants, chacun uniforme entre des bornes <strong>conventionnelles</strong>. Les indices mesurent la sensibilité à un paramètre du code, pas le rôle causal d'une politique réelle ; plusieurs mécanismes peuvent interagir.</p><div class="prov-scroll"><table><caption>Intervalles des paramètres simulés</caption><thead><tr><th scope="col">Facteur</th><th scope="col">Minimum</th><th scope="col">Maximum</th><th scope="col">Description</th></tr></thead><tbody>{frows}</tbody></table></div></section>
<section><h2>3. Trois exemples budgétaires fictifs</h2><nav aria-label="Accès aux exemples"><a href="#scenario-education">Éducation</a> · <a href="#scenario-tva">TVA</a> · <a href="#scenario-mix">Scénario mixte</a></nav></section>
{''.join(sections)}
<section><h2>4. Reproductibilité, archives et limites</h2><p><a href="validation/sensibilite-globale-561.json">Rapport JSON corrigé</a> · <a href="validation/sensibilite-globale-561.csv">Quantiles CSV corrigés</a> · <a href="validation/sensibilite-sobol-561.csv">Indices CSV corrigés</a> · <a href="validation/sensibilite-globale-560.json">Anciennes sorties 5.6 (archive)</a>.</p>
<pre><code>node scripts/generer-sensibilite-561.mjs
node scripts/test-statistique-561.mjs
# Augmenter N demande davantage de temps et de mémoire :
ECOSIM_SENSITIVITY_N=256 node scripts/generer-sensibilite-561.mjs</code></pre>
<p>Algorithme : {E(r['prng'])} ; graine : <code>{r['seed']}</code> ; reproductibilité vérifiée sur des fonctions synthétiques à solution connue. Le coût est de 21 × N projections pour les trois expériences. Des simulations plus longues n'établissent pas à elles seules une validité empirique ou une hiérarchie économique objective.</p>
<p>Les <a href="validation-historique-540.html">témoins historiques</a>, le module de <a href="retraites-cohortes-550.html">retraites expérimentales</a> et les <a href="audit.html">limites du modèle</a> restent documentés séparément.</p></section>
</main><footer class="guide-footer">EcoSim France · version <span data-ecosim-version>5.6.1</span> · paquet <code>000000000000</code> · projet personnel pédagogique · <a href="informations-legales.html">Informations légales</a></footer></body></html>'''
(D/'sensibilite-globale-561.html').write_text(page)
print('Page 5.6.1 générée :',len(page),'caractères')
