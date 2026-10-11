from pathlib import Path
import json, html
D=Path(__file__).resolve().parent.parent/'dist'
report=json.loads((D/'validation/sensibilite-globale-560.json').read_text())
E=lambda x:html.escape(str(x),quote=True)
fmt=lambda x:('—' if x is None else f'{x:+.3f}'.replace('.',','))
factors={f['id']:f for f in report['factors']}
metrics={m['id']:m for m in report['metrics']}
body=[]
for sc in report['scenarios']:
 lines=[]
 for h in (1,5,10):
  for m in ('gdpDeltaPct','debtDeltaPp','deficitDeltaBn','unemploymentDeltaPp'):
   s=next(x for x in sc['summaries'] if x['horizon']==h and x['metric']==m)
   lines.append(f'<tr><th scope="row">{h} an{"s" if h>1 else ""} · {E(metrics[m]["label"])}</th><td>{fmt(s["central"])}</td><td>{fmt(s["p05"])}</td><td>{fmt(s["p50"])}</td><td>{fmt(s["p95"])}</td><td>{E(metrics[m]["unit"])}</td></tr>')
 sob=[]
 for m in ('gdpDeltaPct','debtDeltaPp'):
  for f in report['factors']:
   r=next(x for x in sc['sobol'] if x['horizon']==5 and x['metric']==m and x['factor']==f['id'])
   sob.append(f'<tr><th scope="row">{E(metrics[m]["label"])}</th><td>{E(f["label"])}</td><td>{fmt(r["first"])}</td><td>{fmt(r["total"])}</td></tr>')
 body.append(f'''<section id="scenario-{E(sc['id'])}"><h2>{E(sc['label'])}</h2><p>Ces résultats décrivent uniquement une variation des hypothèses de transmission pour un scénario fictif fixé ; les dépenses et recettes sont identiques entre les tirages.</p>
 <div class="prov-scroll"><table><caption>Écarts à la référence, calcul central et quantiles exploratoires</caption><thead><tr><th scope="col">Indicateur</th><th scope="col">Central</th><th scope="col">Q05</th><th scope="col">Médiane</th><th scope="col">Q95</th><th scope="col">Unité</th></tr></thead><tbody>{''.join(lines)}</tbody></table></div>
 <h3>Sensibilité globale à cinq ans</h3><p>Indices de Jansen/Sobol bruts : le premier ordre mesure l'effet isolé d'un paramètre ; l'indice total inclut ses interactions avec les autres. Avec seulement {report['n']} paires, ces estimations sont <strong>instables</strong> : des indices négatifs ou supérieurs à 1 sont possibles et ne sont pas tronqués pour embellir le résultat.</p>
 <div class="prov-scroll"><table><caption>Indices bruts de premier ordre et d'effet total, horizon 2030</caption><thead><tr><th scope="col">Indicateur</th><th scope="col">Paramètre</th><th scope="col">Premier ordre</th><th scope="col">Total</th></tr></thead><tbody>{''.join(sob)}</tbody></table></div></section>''')
page=f'''<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Sensibilité globale et simulations Monte Carlo 5.6 | EcoSim France</title>
<meta name="description" content="EcoSim 5.6 : incertitude conditionnelle, cinq coefficients testés simultanément, Monte Carlo reproductible et indices Jansen/Sobol, avec hypothèses publiées."><link rel="canonical" href="https://nicolasmoreau1982-beep.github.io/sensibilite-globale-560.html"><meta property="og:type" content="article"><meta property="og:locale" content="fr_FR"><meta property="og:title" content="Sensibilité globale 5.6 | EcoSim France"><meta property="og:image" content="https://nicolasmoreau1982-beep.github.io/og-ecosim.png"><meta name="twitter:card" content="summary_large_image"><link rel="stylesheet" href="styles.css"><link rel="stylesheet" href="guides.css"><script src="theme.js"></script><script src="build-info.js" defer></script><script src="site-meta-531.js" defer></script></head>
<body><a class="skip-link" href="#main">Aller au contenu</a><header class="guide-header"><a class="brand" href="index.html">EcoSim <b>France</b></a><nav class="guide-nav" aria-label="Navigation principale"><a href="index.html">Simulateur</a><a href="audit.html">Audit</a><a href="sensibilite-multiplicateurs-422.html">Sensibilité 4.22</a><a href="contact-signalement.html">Signaler</a></nav></header>
<main class="guide-main" id="main"><p class="guide-breadcrumb"><a href="index.html">Accueil</a> / Sensibilité globale 5.6</p><div class="guide-hero"><span class="guide-kicker">EcoSim 5.6 — analyse expérimentale</span><h1>À quel point les résultats dépendent-ils des coefficients ?</h1><p class="guide-lead">Cinq paramètres du <strong>véritable moteur EcoSim</strong> varient simultanément. Les résultats indiquent la dispersion causée par <em>ces plages d'hypothèses</em>, et non une probabilité de ce qui se produira en France.</p></div>
<section><h2>1. Protocole reproductible</h2><p><strong>{report['n']} paires de tirages</strong> indépendants, soit <strong>{report['simulationsParScenario']} projections sur 30 ans par scénario</strong>, graine entière <code>{report['seed']}</code> ; 3 scénarios fictifs. Le moteur normal et les profils enregistrés sont restaurés après chaque simulation. La matrice croisée reprend une seule colonne à la fois (méthode de Jansen, 1999).</p><p>Les distributions sont <strong>uniformes et indépendantes par convention</strong>. Ce ne sont pas des distributions a priori estimées à partir de données françaises. Il n'y a ni mise à jour bayésienne, ni intervalle de confiance, ni valeur causale validée. La publication de l'<a href="https://www.insee.fr/fr/statistiques/1381077">Insee (2013) sur les multiplicateurs</a> apporte un contexte économique, mais <strong>n'est pas utilisée pour calibrer ces bornes</strong>.</p>
<div class="prov-scroll"><table><caption>Paramètres variant simultanément ; plages fictives relatives au profil central</caption><thead><tr><th scope="col">Paramètre</th><th scope="col">Minimum</th><th scope="col">Maximum</th><th scope="col">Canal concerné</th></tr></thead><tbody>{''.join(f'<tr><th scope="row">{E(f["label"])}</th><td>×{str(f["lo"]).replace(".",",")}</td><td>×{str(f["hi"]).replace(".",",")}</td><td>{E(f["effect"])}</td></tr>' for f in report['factors'])}</tbody></table></div>
<p>Les plafonds et planchers internes du moteur continuent de s'appliquer. Ils peuvent créer des réponses non linéaires et limiter la portée des indices d'influence.</p></section>
<section><h2>2. Trois scénarios fictifs</h2><p>Les quantiles Q05 et Q95 contiennent 90 % des <strong>sorties de cet échantillon déterministe</strong>. Ne pas lire « 90 % de probabilité que la réalité soit dans cette plage ». Le scénario central, non échantillonné, est affiché séparément.</p><nav aria-label="Scénarios de sensibilité"><a href="#scenario-education">Éducation</a> · <a href="#scenario-tva">TVA</a> · <a href="#scenario-mix">Mix budgétaire</a></nav></section>
{''.join(body)}
<section><h2>3. Sources, exports, reproductibilité et limites</h2><p><a href="validation/sensibilite-globale-560.json">Rapport complet JSON</a> · <a href="validation/sensibilite-globale-560.csv">Écarts et quantiles CSV</a> · <a href="validation/sensibilite-sobol-560.csv">Indices de sensibilité CSV</a> · <a href="https://link.springer.com/article/10.1007/s11222-024-10398-5">Présentation méthodologique des indices de Jansen</a>.</p>
<pre><code>node scripts/sensibilite-globale-560.mjs
node scripts/test-sensibilite-560.mjs
# Modifier le nombre de paires, au prix d'un temps de calcul supérieur :
ECOSIM_SENSITIVITY_N=128 node scripts/sensibilite-globale-560.mjs</code></pre>
<p><strong>Limites :</strong> les cinq coefficients sont supposés indépendants ; aucun des moteurs démographie, retraite expérimentale 5.5 ou assiettes fiscales n'est soumis à un étalonnage statistique dans cet exercice. Les trois cas sont des simulations fictives, sans classement politique. Des indices numériquement instables ne constituent pas un palmarès des leviers économiques. Les résultats historiques gelés en 5.3.1 ne sont jamais remplacés pour rendre les tests verts.</p>
<p>Le module 5.5 sur <a href="retraites-cohortes-550.html">la réforme des retraites de 2010</a> reste autonome et son écart au chômage observé n'est pas corrigé par cette analyse de sensibilité.</p></section>
</main><footer class="guide-footer">EcoSim France · version <span data-ecosim-version>5.6.0</span> · paquet <code>98db787db0c3</code> · projet personnel pédagogique <a href="index.html">Accueil</a> <a href="informations-legales.html">Informations légales</a></footer></body></html>'''
(D/'sensibilite-globale-560.html').write_text(page)
print('PAGE 5.6 générée :',len(page),'caractères')
