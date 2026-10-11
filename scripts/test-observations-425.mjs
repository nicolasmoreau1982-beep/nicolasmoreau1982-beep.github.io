/** EcoSim 4.25 — données Insee 2023, réponse bornée, import/export et compatibilité. */
import fs from 'node:fs';import path from 'node:path';import vm from 'node:vm';import assert from 'node:assert/strict';import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>fs.readFileSync(path.join(root,'dist',p),'utf8');
const observed=JSON.parse(read('data/sectoral-observations-2023.json'));
const ctx=vm.createContext({console,Math,Number,Object,Map,Set,Date,JSON,Intl,Array,String,Boolean});ctx.window=ctx;
for (const f of ['data.js','history.js','insee-projection.js','fiscal.js','sectoral-observations.js','sectoral.js','guardrails-510.js','political-profiles-530.js'])vm.runInContext(read(f),ctx,{filename:f});
assert.equal(ctx.ECOSIM_DATA.metadata.version,'5.6.0');
assert.deepEqual(JSON.parse(JSON.stringify(ctx.ECOSIM_SECTOR_OBS)),observed,'le script et le JSON proviennent de la même source');
const S=ctx.ECOSIM_SECTORAL,D=ctx.ECOSIM_DATA;
assert.equal(observed.year,2023);assert.equal(observed.behaviorStatus,'not_causally_estimated');
assert.equal(Object.keys(observed.sectors).length,16);
assert.equal(S.observedContext('agriculture',2).available,false);
assert.equal(S.observedContext('fossil',2).available,false,'raffinage sous secret : investissement non exploitable');
assert.equal(S.observedContext('chemical',2).investmentBn,5.931);
assert.equal(S.observedContext('building',2).valueAddedBn,127.653);
assert.equal(S.observedContext('renewables',2).proxyId,S.observedContext('nuclear',2).proxyId,'proxys électricité partagés explicitement');
const item=(sector,response,amount=8,startYear=2026,durationYears=10,instrument='credit')=>({sector,response,amountBn:amount,startYear,durationYears,instrument});
assert.throws(()=>S.normalize([item('chemical','constructor')]),{name:'RangeError'});
assert.equal(S.normalize([item('chemical','contextual')])[0].response,'contextual');
const profile=D.models.consensus;
assert.ok(profile,'profil central absent');
const factors={tax:1,spending:1};
const p=S.calculate(S.normalize([item('chemical','contextual',10)]),2031,profile,factors);
const r=p.rows[0];assert.equal(r.contextAvailable,true);assert.equal(r.response,'contextual');
assert.equal(r.capped,true,'choc élevé limité par investissements 2023');
assert.ok(r.responseCapBn<1);assert.ok(r.responseMultiplier>=0.75&&r.responseMultiplier<=1.25);
const share=[item('renewables','contextual',10),item('nuclear','contextual',10)];
const sharedA=S.calculate(S.normalize(share),2035,profile,factors);
const sharedB=S.calculate(S.normalize([...share].reverse()),2035,profile,factors);
assert.ok(sharedA.rows.every(r=>r.proxyId==='power'));
const grossA=sharedA.rows.reduce((sum,r)=>sum+Math.abs(r.demand/(0.4*profile.taxScale)+r.supply/(0.6*profile.supplyScale))/2,0);
// Ces deux contributions sont plafonnées ENSEMBLE et indépendantes de leur ordre.
assert.ok(grossA<=S.observedContext('renewables',1).capBn+1e-9);
assert.ok(Math.abs(sharedA.gdpImpact-sharedB.gdpImpact)<1e-10);
assert.ok(Math.abs(r.gdpImpact)<=r.responseCapBn*Math.max(profile.taxScale,profile.supplyScale)*1.1,
  'amplitude sectorielle plafonnée avant facteur macro de profil');
const zero=S.calculate(S.normalize([item('agriculture','contextual',10)]),2031,profile,factors);
assert.equal(zero.gdpImpact,0,'pas de proxy : comptabilité seule');
assert.equal(zero.revenueChange,-10);
const old=S.calculate(S.normalize([item('agriculture','exploratory',10)]),2031,profile,factors);
assert.ok(old.gdpImpact>0,'le mode historique 4.24 doit rester inchangé');
const acct=S.calculate(S.normalize([item('chemical','accounting',10)]),2031,profile,factors);
assert.equal(acct.gdpImpact,0);assert.equal(acct.revenueChange,-10);
// Full integration exercise on real engine.
let src=read('app.js');const stopper='  loadInitialState();\n  initTheme();';assert.ok(src.includes(stopper));
src=src.slice(0,src.indexOf(stopper))+'  window.__sector425={state,calculateProjection,serializableState,applySerialized};\n})();';
vm.runInContext(src,ctx,{filename:'app.js'});
const {state,calculateProjection,serializableState,applySerialized}=ctx.__sector425;
const reference=calculateProjection();
state.sectoral=S.normalize([item('chemical','contextual',10)]);
const modified=calculateProjection();
for(const year of modified.scenario){
 assert.ok([year.gdp,year.deficit,year.debt,year.sectoral.gdpImpact].every(Number.isFinite));
 assert.ok(Math.abs(year.deficitRatio-year.deficit/year.gdp*100)<1e-8);
}
assert.equal(modified.scenario[0].sectoral.revenueChange,-10);
assert.equal(modified.scenario[10].sectoral.gdpImpact,0,'mesure expirée');
const payload=JSON.parse(JSON.stringify(serializableState()));
assert.ok(applySerialized(payload));assert.equal(JSON.stringify(state.sectoral),JSON.stringify(S.normalize([item('chemical','contextual',10)])));
assert.equal(applySerialized({...payload,sectoral:[item('renewables','toString')]}),false);
state.sectoral=[];const back=calculateProjection();
for(let i=0;i<30;i++){
 assert.ok(Math.abs(reference.scenario[i].gdp-back.scenario[i].gdp)<1e-9);
 assert.ok(Math.abs(reference.scenario[i].deficit-back.scenario[i].deficit)<1e-9);
}
const html=read('index.html');assert.ok(html.includes('sectoral-observations.js')&&html.indexOf('sectoral-observations.js')<html.indexOf('src="sectoral.js"'));
assert.ok(html.includes('value="contextual"')&&html.includes('id="sectoral-observed"'));
const guide=read('donnees-sectorielles-425.html');assert.ok(guide.includes('<caption>')&&guide.includes('pas des coefficients causaux'));
assert.equal((guide.match(/<th scope="row">(?:renewables|nuclear|fossil|grids|automotive|transit|aviation|building|metals|chemical|manufacturing|agriculture|food|digital|health|circular)<\/th>/g)||[]).length,16);
assert.ok(read('sitemap.xml').includes('donnees-sectorielles-425.html'));
console.log('OBSERVATIONS 4.25 OK : 16 proxys, limites de périmètre, mode comptable, mode historique, mode contextualisé, bornes, 30 ans, import/export.');
