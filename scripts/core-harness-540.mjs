/** Harnais d'exécution de l'authentique coeur EcoSim, sans second moteur de calcul.
 * Le marqueur de bootstrap est vérifié ; l'exécution s'arrête avant toute manipulation DOM.
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
export function makeHarness(dist) {
 const ctx=vm.createContext({console,Math,Number,Object,Map,Set,Date,JSON,Intl,Array,String,Boolean});
 ctx.window=ctx;
 for(const f of ['data.js','historical-audit-data.js','history.js','insee-projection.js','fiscal.js',
    'sectoral-observations.js','sectoral.js','guardrails-510.js','political-profiles-530.js']) {
   vm.runInContext(fs.readFileSync(path.join(dist,f),'utf8'),ctx,{filename:f});
 }
 let app=fs.readFileSync(path.join(dist,'app.js'),'utf8');
 const marker='  loadInitialState();\n  initTheme();';
 if(!app.includes(marker))throw new Error('Bootstrap du moteur modifié : harnais 5.4 à réexaminer');
 app=app.slice(0,app.indexOf(marker))+'  window.__harness540={state,calculateProjection,serializableState,applySerialized};\n})();';
 vm.runInContext(app,ctx,{filename:'app.js'});
 const {state,calculateProjection,serializableState,applySerialized}=ctx.__harness540;
 const D=ctx.ECOSIM_DATA,F=ctx.ECOSIM_FISCAL;
 function reset(){
  state.changes={};state.policyStartQuarter=1;state.policyStartQuarters={};
  state.model='consensus';state.euMode='current';state.cycle='normal';state.monetary='neutral';state.confidence='stable';
  state.structural=Object.fromEntries(Object.entries(D.structural.controls).map(([k,c])=>[k,c.value]));
  state.engines=Object.fromEntries(Object.entries(D.policyEngines.controls).map(([k,c])=>[k,c.value]));
  state.fiscal={...F.defaults};state.sectoral=[];
 }
 return {state,calculateProjection,serializableState,applySerialized,D,F,reset};
}
