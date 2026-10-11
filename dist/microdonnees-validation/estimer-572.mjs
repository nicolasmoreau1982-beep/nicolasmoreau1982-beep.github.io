/** EcoSim 5.7.2 — Microsimulation de barème sur microdonnées consenties.
 * Le calcul pondéré ne prouve jamais la représentativité statistique.
 * Usage: node microdonnees-validation/estimer-572.mjs input.json result.json
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const context={window:{}};vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root,'fiscal-individuel-570.js'),'utf8'),context);
const model=context.window.ECOSIM_FISCAL_INDIVIDUEL_570;
const bounds=[11600,29579,84577,181917,Infinity];
const baseRates=model.law.brackets.map(x=>x.rate);
const MAX_ROWS=1_000_000;
function tax(income,rates){let result=0,lower=0;for(let i=0;i<rates.length;i++){result+=Math.max(0,Math.min(bounds[i],income)-lower)*rates[i];lower=bounds[i];if(income<=lower)break;}return result;}
function alternative(c,rates){
 const baseParts=c.householdType==='couple'?2:1;
 const extraParts=Math.min(c.children,2)*.5+Math.max(0,c.children-2);
 const raw=(baseParts+extraParts)*tax(c.netTaxableIncome/(baseParts+extraParts),rates);
 const noChild=baseParts*tax(c.netTaxableIncome/baseParts,rates);
 const capped=Math.max(raw,noChild-extraParts*2*model.law.familyCapPerHalfPart);
 const d=model.law.decote;
 const limit=c.householdType==='couple'?d.limitCouple:d.limitSingle;
 const fixed=c.householdType==='couple'?d.couple:d.single;
 const reduction=capped<limit?Math.min(capped,Math.max(0,fixed-d.rate*capped)):0;
 return Math.max(0,capped-reduction);
}
function validate(data){
 if(!data||typeof data!=='object'||data.incomeYear!==2025||!Array.isArray(data.households)||!data.households.length||data.households.length>MAX_ROWS)throw Error('Microdonnées absentes ou période différente de 2025');
 if(!data.source||typeof data.source.name!=='string'||!data.source.name.trim()||typeof data.source.description!=='string')throw Error('Provenance source et description obligatoires');
 if(data.unit!=='foyer_fiscal')throw Error('Les poids doivent représenter des foyers fiscaux et non des individus');
 if(!Array.isArray(data.reformRates)||data.reformRates.length!==5||data.reformRates.some(x=>typeof x!=='number'||!Number.isFinite(x)||x<0||x>1))throw Error('Cinq taux fiscaux admissibles requis');
 const ids=new Set(), clean=[];
 for(const h of data.households){
  if(typeof h.id!=='string'||!h.id||ids.has(h.id))throw Error('Identifiants de foyers uniques requis');ids.add(h.id);
  if(typeof h.weight!=='number'||!Number.isFinite(h.weight)||h.weight<=0||h.weight>1e9)throw Error('Poids invalides');
  const result=model.calculate({netTaxableIncome:h.netTaxableIncome,householdType:h.householdType,children:h.children});
  clean.push({...result,id:h.id,weight:h.weight});
 }
 return clean;
}
function summarize(data){
 const households=validate(data), rows=households.map(h=>({id:h.id,income:h.netTaxableIncome,weight:h.weight,before:h.afterDecote,after:alternative(h,data.reformRates)}));
 rows.sort((a,b)=>a.income-b.income||a.id.localeCompare(b.id));
 const totalWeight=rows.reduce((s,r)=>s+r.weight,0);
 // Weighted deciles by fiscal-household net taxable income (not standard of living).
 const groups=Array.from({length:10},(_,i)=>({decile:i+1,foyersPonderes:0,impotAvant:0,impotApres:0,variation:0,gagnants:0,perdants:0,neutres:0}));
 let cumulative=0;
 // Partition exacte des intervalles de masse : pas de seuil absolu en poids.
 // L'ancien while(remaining > 1e-9) supprimait silencieusement les micro-poids
 // positifs (et pouvait produire dix moyennes NaN pour un jeu pourtant valide).
 for(const r of rows){
  const start=cumulative,end=start+r.weight;
  for(let idx=0;idx<10;idx++){
   const low=idx*totalWeight/10, high=(idx+1)*totalWeight/10;
   const w=Math.max(0,Math.min(end,high)-Math.max(start,low));
   if(w===0)continue;
   const g=groups[idx];g.foyersPonderes+=w;g.impotAvant+=w*r.before;g.impotApres+=w*r.after;g.variation+=w*(r.after-r.before);
   if(r.after-r.before>1e-6)g.perdants+=w;else if(r.before-r.after>1e-6)g.gagnants+=w;else g.neutres+=w;
  }
  cumulative=end;
 }
 const sum=k=>groups.reduce((s,g)=>s+g[k],0);
 const sourceAttested=!!(data.source.samplingDocumentation && data.source.weightDocumentation && data.source.legalAccessBasis && data.source.coverage);
 const report={version:'5.7.2',kind:'simulation_fiscale_ponderee',status:sourceAttested?'source_declared_not_independently_verified':'demonstration_not_representative',
  source:data.source,unit:'foyer_fiscal',incomeYear:2025,taxYear:2026,
  decileDefinition:'deciles ponderes du revenu net imposable par foyer fiscal, PAS du niveau de vie Insee',
  reformRates:data.reformRates,baselineRates:baseRates,nRows:rows.length,totalWeight,
  totals:{taxBefore:sum('impotAvant'),taxAfter:sum('impotApres'),difference:sum('variation')},
  deciles:groups.map(g=>({...g,meanDifference:g.variation/g.foyersPonderes})),
  limitations:'Résultats conditionnels aux données/poids fournis, aux règles incomplètes de fiscal-individuel-570 et sans réponses comportementales. Aucun extrapolation nationale autorisée sans documentation de plan de sondage, représentativité et comparabilité fiscales.',
 };
 return report;
}
export {summarize,validate,alternative};
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [input,output]=process.argv.slice(2);
 if(!input||!output){console.error('Usage: node microdonnees-validation/estimer-572.mjs input.json output.json');process.exit(2);}
 try {const d=JSON.parse(fs.readFileSync(input,'utf8'));const report=summarize(d);
  fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');console.log('Rapport créé :',output,'statut:',report.status,'foyers:',report.nRows);}
 catch(e){console.error(e.message);process.exitCode=1;}
}
