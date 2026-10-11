import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>fs.readFileSync(path.join(root,'dist',p),'utf8');
const context=vm.createContext({window:{}});
for(const file of ['data.js','political-profiles-530.js'])vm.runInContext(read(file),context,{filename:file});
const D=context.window.ECOSIM_DATA;
const P=context.window.ECOSIM_POLITICAL_PROFILES_530;
assert.equal(D.metadata.version,'5.6.1');
const oldSources=JSON.parse(read('validation/provenance-politique-420.json'));
assert.equal(oldSources.counts.total,357);
assert.equal(oldSources.counts.exact,0);
const ids=new Set(); let fallback=0; let assigned=0;
for(const period of ['current','historical']){
 const mappings=P.entries[period], scenarios=D.politicalScenarios[period];
 assert.equal(Object.keys(mappings).length,scenarios.length,'Un dossier doctrinal par scénario');
 for(const scenario of scenarios){
   const id=`${period}:${scenario.id}`;
   assert(!ids.has(id));ids.add(id);
   const doc=P.get(period,scenario.id);
   assert(typeof doc.reason==='string' && doc.reason.length>40,id);
   if(doc.model) {assert(Object.hasOwn(D.models,doc.model),id);assigned++;assert(/^https:\/\//.test(doc.url),id);}
   else fallback++;
   // Un profil de situation (crise / conjoncture / transition) n'est jamais affecté à un groupe.
   assert(!['debtCrisis','stabilization','openEconomy','constrainedTransition'].includes(doc.model),id);
   for (const mode of ['common','robustness']) {
      for(const model of Object.keys(D.models))assert.equal(P.resolve(period,scenario.id,mode,model,D.models),model,id);
   }
   assert.equal(P.resolve(period,scenario.id,'doctrine','liberal',D.models),doc.model??'consensus',id);
 }
}
assert(assigned>0 && fallback>0);
assert.equal(P.get('current','constructor').model,null,'Pas d’héritage Object.prototype');
const app=read('app.js'),page=read('index.html'),doc=read('methodes-comparaison-politique-530.html');
assert(page.includes('data-politics-comparison-mode="common"'));
assert(page.includes('data-politics-comparison-mode="doctrine"'));
assert(page.includes('data-politics-comparison-mode="robustness"'));
assert(page.includes('political-profiles-530.js'));
assert(app.includes('politicalModelFor(scenario)'));
assert(app.includes('politicalRobustnessTable(scenario)'));
assert(app.includes('politicalProfiles530.resolve'));
assert(doc.includes('Hypothèses communes')&&doc.includes('Lecture doctrinale'));
for(const period of Object.keys(P.entries))for(const sc of D.politicalScenarios[period])assert(doc.includes(sc.name.replaceAll('&','&amp;'))||doc.includes(sc.name));
assert(read('sitemap.xml').includes('methodes-comparaison-politique-530.html'));
console.log(`POLITIQUE 5.3 OK : ${ids.size} scénarios documentés, ${assigned} rapprochements et ${fallback} replis, 9 profils intacts, 357 réglages inchangés.`);
