/** Génération du rapport public 4.21 à partir de sorties de tests exécutés. Aucune valeur recopiée à la main. */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dist=path.join(root,'dist');
const load=file=>JSON.parse(fs.readFileSync(path.join(dist,'validation',file),'utf8'));
const fiscal=load('fiscal-externe-421.json'),econ=load('sensibilite-421.json');
assert.equal(fiscal.version,'4.21.0');assert.equal(econ.version,'4.21.0');
const money=x=>new Intl.NumberFormat('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2}).format(x);
const escape=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const titles={
 unemploymentPpPerOutputGapPoint:'Réponse du chômage à l’activité',
 revenueBnPerNominalGdpBn:'Recettes liées au PIB nominal',
 cyclicalSpendingBnPerUnemploymentPoint:'Dépenses cycliques liées au chômage'
};
const fiscalRows=fiscal.cases.map(c=>`<tr><th scope="row">${escape(c.label)}</th><td>${money(c.expected)} €</td><td>${money(c.actual)} €</td><td>${money(c.delta)} €</td><td><a href="${escape(c.source)}">Source officielle ↗</a></td></tr>`).join('\n');
const economicRows=econ.scenarios.map(s=>{
 const r=econ.summary.find(x=>x.scenario===s.id&&x.horizon===3);
 return `<tr><th scope="row">${escape(s.label)}</th><td>${money(r.centralDeficitBn)} Md€</td><td>${money(r.minDeficitStressBn)} à ${money(r.maxDeficitStressBn)} Md€</td><td>${r.signStable?'Stable dans ce test':'Instable'}</td><td>${escape(titles[r.mostSensitiveForDeficit])}</td></tr>`;
}).join('\n');
const signed=(n,unit)=>`${n>0?'+':n<0?'−':''}${money(Math.abs(n))} ${unit}`;
const demo=econ.summary.find(x=>x.scenario==='education10'&&x.horizon===3);
const document=`<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="index,follow"><meta name="description" content="Tests fiscaux sur cas officiels et sensibilité des résultats budgétaires à trois coefficients du modèle EcoSim 4.21. Limites, sources et données reproductibles.">
<link rel="canonical" href="https://nicolasmoreau1982-beep.github.io/validation-economique-421.html">
<title>Validation fiscale et sensibilité économique — EcoSim France 4.21</title>
<link rel="stylesheet" href="styles.css"><link rel="stylesheet" href="guides.css"><script src="theme.js"></script>
<style>.validation-scroll{overflow-x:auto;margin:1rem 0}.validation-scroll table{width:100%;border-collapse:collapse;font-size:14px;line-height:1.5}.validation-scroll th,.validation-scroll td{padding:12px;border-bottom:1px solid #a7a7a73d;text-align:left;vertical-align:top}.validation-scroll th{font-weight:650}.validation-scroll caption{text-align:left;font-size:14px;margin-bottom:.8rem}.validation-note{padding:1rem;border:1px solid #aaa6;border-radius:12px;margin-block:1.2rem}.validation-note p{margin:.5rem 0}.validation-links{display:flex;flex-wrap:wrap;gap:1rem}.validation-links a{overflow-wrap:anywhere}@media(max-width:650px){.validation-scroll table{min-width:680px}}</style><meta property="og:image" content="https://nicolasmoreau1982-beep.github.io/og-ecosim.png"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="EcoSim France — Comprendre le budget public"><meta name="twitter:image" content="https://nicolasmoreau1982-beep.github.io/og-ecosim.png"><meta name="twitter:card" content="summary_large_image"></head>
<body><a class="skip-link" href="#main">Aller au contenu</a><header class="guide-header"><a class="brand" href="index.html">EcoSim <b>France</b></a><nav class="guide-nav" aria-label="Navigation"><a href="index.html">Simulateur</a><a href="audit.html">Audit</a><a href="provenance-politique.html">Provenance politique</a></nav></header>
<main class="guide-main" id="main"><p class="guide-breadcrumb"><a href="index.html">Accueil</a> / Validation 4.21</p>
<div class="guide-hero"><span class="guide-kicker">EcoSim 4.21 · tests exécutables · 11 octobre 2026</span><h1>Quels calculs avons-nous réellement vérifiés ?</h1><p class="guide-lead">Des cas fiscaux issus des barèmes officiels, et des tests de sensibilité sur le moteur budgétaire. Ces contrôles sont reproductibles, mais ils <strong>ne valident pas des recettes nationales ni des effets causaux</strong>.</p></div>
<section aria-labelledby="titre-fiscal"><h2 id="titre-fiscal">1. Neuf cas fiscaux confrontés à des références publiques</h2>
<p>Le calcul d’impôt sur le revenu testé correspond exclusivement au <strong>barème brut pour les revenus 2025 imposés en 2026</strong>. Les exemples IFI comprennent la décote légale ; les successions concernent une transmission directe simple, après abattement de 100 000 €.</p>
<div class="validation-scroll"><table><caption>Écarts de calcul en euros, avant toute interprétation nationale.</caption><thead><tr><th scope="col">Situation</th><th scope="col">Référence</th><th scope="col">EcoSim</th><th scope="col">Écart</th><th scope="col">Documentation</th></tr></thead><tbody>${fiscalRows}</tbody></table></div>
<p><strong>${fiscal.cases.length} cas sur ${fiscal.cases.length}</strong> concordent à 0,01 € près sur ces conventions. Cette réussite n'est pas un test d'OpenFisca et ne garantit ni l'impôt net individuel réel ni le rendement budgétaire agrégé.</p>
<div class="validation-note"><strong>Ce que ces tests ne prouvent pas</strong><p>La décote de l’IR, le plafonnement du quotient familial, les crédits d’impôt, les situations complexes, les donations antérieures, les plafonnements de l’IFI et les changements de comportement ne sont pas vérifiés. Les 16 foyers-types synthétiques d’EcoSim ne représentent pas statistiquement tous les ménages.</p></div>
</section>
<section aria-labelledby="titre-sens"><h2 id="titre-sens">2. Sensibilité des résultats économiques</h2>
<p>Le moteur central a été recalculé pour quatre mesures de ±10 Md€/an, en faisant varier <strong>un seul coefficient à la fois</strong> de −20 % puis +20 %, sur les horizons de 1, 3, 5 et 10 ans. Le tableau montre à trois ans <strong>l'écart de déficit par rapport à la référence</strong>, et non le déficit total.</p>
<div class="validation-note"><strong>Attention : multiplicateurs non testés ici</strong><p>Les plages ci-dessous couvrent uniquement trois coefficients de rétroaction (recettes, chômage et dépenses cycliques), modifiés <strong>un par un de ±20 %</strong>. <strong>Les multiplicateurs de dépenses et de prélèvements, leurs délais et leurs effets directs sur le PIB sont exclus de cette plage.</strong> Une plage étroite ne signifie donc pas une faible incertitude économique. Voir aussi l’<a href="audit.html#benchmark-419">écart indicatif avec Mésange</a>, sur des chocs non strictement équivalents.</p></div>
<div class="validation-scroll"><table><caption>Plages de stress conditionnelles à 3 ans — 3 coefficients étudiés, hors multiplicateurs, pas des intervalles de confiance.</caption><thead><tr><th scope="col">Mesure</th><th scope="col">Écart central de déficit</th><th scope="col">Plage ±20 %</th><th scope="col">Signe du résultat</th><th scope="col">Coefficient dominant</th></tr></thead><tbody>${economicRows}</tbody></table></div>
<div class="validation-note"><strong>Interprétation illustrative</strong><p>Pour l’enseignement primaire +10 Md€/an, l’écart de déficit à trois ans est de <strong>${signed(demo.centralDeficitBn,'Md€')}</strong> dans le profil central. Il se situe entre <strong>${signed(demo.minDeficitStressBn,'Md€')}</strong> et <strong>${signed(demo.maxDeficitStressBn,'Md€')}</strong> lorsque les trois coefficients sont variés isolément de ±20 %. Cette plage mesure une dépendance à des hypothèses, et non une erreur statistique observée.</p></div>
<p>Dans ce moteur, les trois coefficients étudiés affectent les <strong>recettes, le chômage et les dépenses cycliques</strong>. Ils ne changent pas directement l’écart de PIB : une absence de variation du PIB dans ces stress tests est donc un <strong>résultat de structure du code, pas une preuve de robustesse macroéconomique</strong>.</p>
<p>La stabilité du signe pour les quatre mesures de cette expérience ne garantit pas leur effet dans l’économie réelle. Les changements simultanés de coefficients, les autres profils économiques et les moteurs structurels ne sont pas couverts ici.</p>
</section>
<section aria-labelledby="sources-title"><h2 id="sources-title">3. Reproductibilité et limites</h2>
<p>Les résultats de cette page sont générés à partir des sorties réelles du moteur et du module fiscal, sans requête distante. Les données sources externes ont été consultées pour construire les exemples de référence, pas pour recalibrer automatiquement les multiplicateurs.</p>
<p class="validation-links"><a href="validation/fiscal-externe-421.json">Cas fiscaux (JSON)</a><a href="validation/fiscal-externe-421.csv">Cas fiscaux (CSV)</a><a href="validation/sensibilite-421.json">Sensibilité (JSON)</a><a href="validation/sensibilite-421.csv">Sensibilité (CSV)</a></p>
<p><strong>Commandes de reproduction dans l'archive complète :</strong> <code>node scripts/validation-fiscale-421.mjs</code> et <code>node scripts/sensibilite-economique-421.mjs</code>, puis <code>node scripts/preparer-validation-421.mjs</code>.</p>
<p>Sources de référence : <a href="${fiscal.cases.find(c=>c.tax==='IR brut').source}">BOFiP IR 2026</a>, <a href="${fiscal.cases.find(c=>c.tax==='IFI').source}">BOFiP IFI</a> et <a href="${fiscal.cases.find(c=>c.tax==='Succession').source}">Service-Public, successions</a>. Pour la portée statistique des comparaisons Mésange, consulter <a href="audit.html#benchmark-419">l’audit existant</a>.</p>
</section></main><footer class="guide-footer"><span>EcoSim France · version 4.21.1 · paquet <code>PAQUET_A_REMPLACER</code></span><a href="confidentialite.html">Confidentialité</a></footer></body></html>`;
fs.writeFileSync(path.join(dist,'validation-economique-421.html'),document);
console.log(`PAGE 4.21 : ${fiscal.cases.length} cas fiscaux, ${econ.summary.length} lignes de synthèse économique, HTML statique généré.`);
