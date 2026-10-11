/** Registre public des hypothèses du comparateur — sans inférence documentaire.
 * Une source générale de scénario ne prouve JAMAIS un réglage individuel.
 * Les seules correspondances liées à une ligne viennent de scenario.evidence.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dist=path.join(root,'dist');
const require=createRequire(import.meta.url);
globalThis.window=globalThis;
require(path.join(dist,'data.js'));
const D=globalThis.ECOSIM_DATA;
const byId=new Map([...D.spending,...D.revenue].map(item=>[item.id,item]));
const esc=s=>String(s??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
const safeUrl=url=>{try{const u=new URL(url);return ['https:','http:'].includes(u.protocol)?u.href:''}catch{return ''}};
const sourceStatuses=new Set(['exact','related']);
const rows=[];
const scenarios=[];
for(const [period,list] of Object.entries(D.politicalScenarios)) {
 for(const scenario of list){
  const values=[];
  if(scenario.euMode!=='current') values.push(['euMode','Cadre européen',scenario.euMode]);
  for(const [key,value] of Object.entries(scenario.changes||{})) {
   if(!byId.has(key))throw Error(`Poste inexistant : ${scenario.id} changes.${key}`);
   values.push([`changes.${key}`,byId.get(key).label,value]);
  }
  for(const [key,value] of Object.entries(scenario.structural||{})) {
   if(!D.structural.controls[key])throw Error(`Paramètre structurel inexistant : ${scenario.id} ${key}`);
   values.push([`structural.${key}`,D.structural.controls[key].label,value]);
  }
  for(const [key,value] of Object.entries(scenario.engines||{})) {
   if(!D.policyEngines.controls[key])throw Error(`Moteur inexistant : ${scenario.id} ${key}`);
   values.push([`engines.${key}`,D.policyEngines.controls[key].label,value]);
  }
  const valueKeys=new Set(values.map(([key])=>key));
  for(const [key,evidence] of Object.entries(scenario.evidence||{})){
   if(!valueKeys.has(key))throw Error(`Source orpheline : ${scenario.id} ${key}`);
   if(!sourceStatuses.has(evidence.status))throw Error(`Statut de preuve inconnu : ${scenario.id} ${key}`);
   if(!safeUrl(evidence.url)||!evidence.locator||!evidence.sourceTitle||!evidence.note)throw Error(`Source insuffisamment localisée : ${scenario.id} ${key}`);
   if(evidence.status==='exact'&&(!Number.isFinite(evidence.sourceValue)||!evidence.sourceUnit||!evidence.modelUnit))throw Error(`Valeur dite exacte sans unité vérifiable : ${scenario.id} ${key}`);
  }
  for(const [key,label,value] of values){
   const evidence=scenario.evidence?.[key];
   rows.push({period,scenarioId:scenario.id,scenarioName:scenario.name,scenarioDate:scenario.date,key,label,value,
    status:evidence?.status||'unverified',
    sourceTitle:evidence?.sourceTitle||null,sourceLocator:evidence?.locator||null,
    sourceUrl:evidence?.url||null,sourceValue:evidence?.sourceValue??null,
    sourceUnit:evidence?.sourceUnit||null,modelUnit:evidence?.modelUnit||null,
    explanation:evidence?.note||'Hypothèse chiffrée EcoSim ; aucune correspondance exacte et localisée vérifiée à cette date.',
    generalScenarioSources:(scenario.sources||[]).map(s=>({label:s.label,url:safeUrl(s.url)}))});
  }
  const r=rows.filter(r=>r.period===period&&r.scenarioId===scenario.id);
  scenarios.push({period,id:scenario.id,name:scenario.name,date:scenario.date,settings:r.length,
   exact:r.filter(x=>x.status==='exact').length,related:r.filter(x=>x.status==='related').length,
   unverified:r.filter(x=>x.status==='unverified').length,
   sources:(scenario.sources||[]).map(s=>({label:s.label,url:safeUrl(s.url)}))});
 }
}
const counts={total:rows.length,exact:rows.filter(x=>x.status==='exact').length,related:rows.filter(x=>x.status==='related').length,unverified:rows.filter(x=>x.status==='unverified').length};
const output={version:'4.20.0',generatedFrom:'dist/data.js',statusDefinitions:{
 exact:'Correspondance à vérifier dans la source primaire : même grandeur, même valeur et localisation précise.',
 related:'Proposition liée à une source localisée, mais la valeur modélisée n’est pas équivalente.',
 unverified:'Choix de simulation EcoSim ; aucun rattachement précis et vérifié à une source pour cette valeur.'
 },counts,scenarios,rows};
fs.mkdirSync(path.join(dist,'validation'),{recursive:true});
fs.writeFileSync(path.join(dist,'validation','provenance-politique-420.json'),JSON.stringify(output,null,2)+'\n');
const fields=['period','scenarioId','scenarioName','scenarioDate','key','label','value','status','sourceTitle','sourceLocator','sourceUrl','sourceValue','sourceUnit','modelUnit','explanation'];
const csv=x=>'"'+String(x??'').replaceAll('"','""')+'"';
fs.writeFileSync(path.join(dist,'validation','provenance-politique-420.csv'),[fields.join(';'),...rows.map(r=>fields.map(f=>csv(r[f])).join(';'))].join('\n')+'\n');
const statusLabel={exact:'Valeur localisée',related:'Proposition liée, montant non équivalent',unverified:'Hypothèse EcoSim non vérifiée individuellement'};
const body=scenarios.map(s=>{
 const selected=rows.filter(r=>r.period===s.period&&r.scenarioId===s.id);
 const general=s.sources.length?s.sources.map(x=>x.url?`<a href="${esc(x.url)}" target="_blank" rel="noopener noreferrer">${esc(x.label)} ↗</a>`:esc(x.label)).join(' · '):'Aucune source générale déclarée';
 return `<details class="provenance-scenario" id="${esc(s.period+'-'+s.id)}"><summary><strong>${esc(s.name)}</strong><span>${s.settings} réglages · ${s.exact} localisé(s), ${s.related} lié(s), ${s.unverified} non vérifié(s) individuellement</span></summary><p class="prov-meta"><strong>Corpus général :</strong> ${general}. Ces liens ne justifient pas chaque montant. <strong>Période :</strong> ${esc(s.date)}.</p>${selected.length?`<div class="prov-scroll"><table><thead><tr><th scope="col">Réglage</th><th scope="col">Valeur EcoSim</th><th scope="col">Preuve individuelle</th><th scope="col">Source / justification</th></tr></thead><tbody>${selected.map(r=>`<tr><th scope="row"><code>${esc(r.key)}</code><br>${esc(r.label)}</th><td>${esc(r.value)}</td><td>${esc(statusLabel[r.status])}</td><td>${r.sourceUrl?`<a href="${esc(safeUrl(r.sourceUrl))}" target="_blank" rel="noopener noreferrer">${esc(r.sourceTitle)} — ${esc(r.sourceLocator)} ↗</a><br>`:''}${esc(r.explanation)}</td></tr>`).join('')}</tbody></table></div>`:'<p>Aucun réglage discrétionnaire dans ce scénario témoin.</p>'}</details>`;
}).join('\n');
const html=`<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="index,follow"><meta name="description" content="Registre public des hypothèses chiffrées utilisées par EcoSim France pour comparer les scénarios politiques : sources individuelles, montants et limites de traçabilité."><link rel="canonical" href="https://nicolasmoreau1982-beep.github.io/provenance-politique.html"><title>Provenance des scénarios politiques — EcoSim France</title><link rel="stylesheet" href="styles.css"><link rel="stylesheet" href="guides.css"><script src="theme.js"></script></head><body><a class="skip-link" href="#main">Aller au contenu</a><header class="guide-header"><a class="brand" href="index.html">EcoSim <b>France</b></a><nav class="guide-nav" aria-label="Navigation"><a href="index.html#politics">Comparateur</a><a href="programmes-economiques-2027.html">Guide 2027</a><a href="audit.html#politique">Audit</a></nav></header><main class="guide-main" id="main"><p class="guide-breadcrumb"><a href="index.html">Accueil</a> / Provenance politique</p><div class="guide-hero"><span class="guide-kicker">Version 4.20 · registre généré à partir des réglages</span><h1>Chaque réglage politique et sa provenance</h1><p class="guide-lead">Ce registre liste les valeurs effectivement injectées dans EcoSim. Une mesure plausible n’est pas nécessairement un chiffrage officiel. Aucun lien général vers un parti ne vaut preuve d’un montant individuel.</p></div><div class="guide-callout"><strong>État documentaire — ${counts.total} réglages</strong><p><strong>${counts.exact}</strong> valeur(s) déclarée(s) exactement localisée(s) · <strong>${counts.related}</strong> proposition(s) localisée(s) mais non équivalente(s) · <strong>${counts.unverified}</strong> hypothèse(s) EcoSim sans vérification individuelle. Ces comptes ne mesurent pas la qualité des idées politiques ou la fiabilité macroéconomique.</p><p>« Non vérifié individuellement » ne veut pas dire qu’aucun document du parti n’existe : seulement que cette <em>valeur précise</em> n’a pas de preuve localisée dans le jeu de données actuel.</p></div><p class="prov-downloads"><a class="button button-dark" href="validation/provenance-politique-420.csv">Exporter le registre CSV</a> <a class="button" href="validation/provenance-politique-420.json">Exporter le registre JSON</a></p><section class="prov-help"><h2>Comment lire ce registre ?</h2><p>Le nom de la formation sert à identifier une inspiration documentaire, pas à attribuer officiellement la simulation. Le numéro, le calendrier, la catégorie budgétaire et la sensibilité économique peuvent être des conventions EcoSim. Les scénarios historiques sont des reconstructions éditoriales. Chaque cellule non sourcée reste explicitement une <strong>hypothèse de simulation</strong>.</p></section><section aria-labelledby="list-title"><h2 id="list-title">Réglages par scénario</h2>${body}</section><p class="prov-last">Source unique : <code>dist/data.js</code> ; registre généré automatiquement par <code>scripts/export-provenance-420.mjs</code>. Pas de contrôle humain indépendant des documents.</p></main><footer class="guide-footer"><span>EcoSim France · v4.20 · paquet <code>PAQUET_A_REMPLACER</code> · simulations pédagogiques, pas chiffrages officiels.</span><a href="audit.html">Audit</a><a href="confidentialite.html">Confidentialité</a></footer></body></html>`;
fs.writeFileSync(path.join(dist,'provenance-politique.html'),html);
console.log(`PROVENANCE 4.20 : ${scenarios.length} scénarios, ${counts.total} réglages, ${counts.exact} exacts, ${counts.related} liés, ${counts.unverified} non vérifiés individuellement.`);
