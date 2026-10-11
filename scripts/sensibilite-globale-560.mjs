/** EcoSim 5.6 — simulations du vrai moteur, non un substitut. Sorties sans calibration causale. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {makeHarness} from './core-harness-540.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');

export const FACTORS=Object.freeze([
 {id:'spending',label:'Transmission des dépenses',lo:0.70,hi:1.30,unit:'× facteur central',effect:'Multiplicateurs des postes de dépenses'},
 {id:'tax',label:'Transmission des prélèvements',lo:0.70,hi:1.30,unit:'× facteur central',effect:'Multiplicateurs fiscaux des postes budgétaires'},
 {id:'supply',label:'Échelle des effets d’offre',lo:0.80,hi:1.20,unit:'× facteur central',effect:'Profil d’offre, y compris certains moteurs'},
 {id:'decay',label:'Persistance de la demande',lo:0.84,hi:1.16,unit:'× coefficient central',effect:'Persistance de la demande après le choc'},
 {id:'debt',label:'Sensibilité à la dette',lo:0.70,hi:1.30,unit:'× coefficient central',effect:'Prime de risque en fonction du ratio de dette'}
]);
export const CASES=Object.freeze([
 {id:'education',label:'Éducation +10 Md€/an',changes:{GF0901:10}},
 {id:'tva',label:'TVA +10 Md€/an',changes:{R_TVA:10}},
 {id:'mix',label:'Éducation +8, énergie +6, IR +10 Md€/an',changes:{GF0901:8,GF0403:6,R_IR:10}}
]);
const HORIZONS=[1,5,10];
const METRICS=[
 {id:'gdpDeltaPct',label:'Écart PIB à la référence',unit:'% du PIB'},
 {id:'debtDeltaPp',label:'Écart dette/PIB à la référence',unit:'point de PIB'},
 {id:'deficitDeltaBn',label:'Écart déficit à la référence',unit:'Md€'},
 {id:'unemploymentDeltaPp',label:'Écart chômage à la référence',unit:'point'}
];
function rng(seed){let s=seed>>>0;return ()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};}
function mix(a,b,i){const c=a.slice();c[i]=b[i];return c;}
function percentile(sorted,p){const index=(sorted.length-1)*p,low=Math.floor(index);return sorted[low]+(sorted[Math.min(sorted.length-1,low+1)]-sorted[low])*(index-low);}
function keyed(p){return `${p.horizon}:${p.metric}`;}
function sampleOutputs(h,x,scenario){
 const profile=h.D.models.consensus;
 const original={supplyScale:profile.supplyScale,decay:profile.decay,debtSensitivity:profile.debtSensitivity};
 try{
  profile.supplyScale=original.supplyScale*x[2];
  profile.decay=original.decay*x[3];
  profile.debtSensitivity=original.debtSensitivity*x[4];
  const result=h.calculateProjection('consensus',null,{spending:x[0],tax:x[1]});
  const values={};
  for(const year of HORIZONS){
   const actual=result.scenario[year-1],base=result.baseline[year-1];
   const record={gdpDeltaPct:(actual.gdp/base.gdp-1)*100,
    debtDeltaPp:actual.debtRatio-base.debtRatio,
    deficitDeltaBn:actual.deficit-base.deficit,
    unemploymentDeltaPp:actual.unemployment-base.unemployment};
   for(const [key,v] of Object.entries(record)){
    if(!Number.isFinite(v))throw new Error(`${scenario} ${year} ${key} non fini`);
    values[`${year}:${key}`]=v;
   }
  }
  return values;
 }finally{Object.assign(profile,original);}
}
export function run({n=64,seed=0x5602026,cases=CASES}={}){
 if(!Number.isInteger(n)||n<16||n>512||(n&(n-1))!==0)throw new RangeError('n doit être une puissance de 2 entre 16 et 512');
 if(!Number.isSafeInteger(seed)||seed<0||seed>0xffffffff)throw new RangeError('graine 32 bits invalide');
 const h=makeHarness(path.join(ROOT,'dist'));
 const rand=rng(seed);
 const normalPoint=()=>FACTORS.map(f=>f.lo+(f.hi-f.lo)*rand());
 const A=Array.from({length:n},normalPoint),B=Array.from({length:n},normalPoint);
 const mean=x=>x.reduce((a,b)=>a+b,0)/x.length;
 const scenarios=[];
 for(const scenario of cases){
  h.reset();h.state.changes={...scenario.changes};
  const central=sampleOutputs(h,[1,1,1,1,1],scenario.id);
  const a=A.map(x=>sampleOutputs(h,x,scenario.id));
  const b=B.map(x=>sampleOutputs(h,x,scenario.id));
  // C_i = matrice A avec uniquement la colonne i reprise de B.
  const c=FACTORS.map((f,i)=>A.map((x,j)=>sampleOutputs(h,mix(x,B[j],i),scenario.id)));
  const summaries=[],sobol=[];
  for(const horizon of HORIZONS)for(const metric of METRICS){
   const key=keyed({horizon,metric:metric.id});
   const ya=a.map(x=>x[key]),yb=b.map(x=>x[key]);
   const joined=[...ya,...yb].sort((p,q)=>p-q);
   const avg=mean(joined),variance=mean(joined.map(z=>(z-avg)**2));
   summaries.push({horizon,metric:metric.id,label:metric.label,unit:metric.unit,
    central:central[key],p05:percentile(joined,0.05),p50:percentile(joined,0.50),p95:percentile(joined,0.95),
    mean:avg,min:joined[0],max:joined[joined.length-1]});
   for(let i=0;i<FACTORS.length;i++){
    const yc=c[i].map(x=>x[key]);
    // Estimateurs de Jansen (1999), entrées indépendantes; résultats bruts non écrêtés.
    const total=variance<1e-18?null:mean(ya.map((v,j)=>(v-yc[j])**2))/(2*variance);
    const first=variance<1e-18?null:1-mean(yb.map((v,j)=>(v-yc[j])**2))/(2*variance);
    sobol.push({horizon,metric:metric.id,factor:FACTORS[i].id,first,total});
   }
  }
  scenarios.push({id:scenario.id,label:scenario.label,changes:scenario.changes,summaries,sobol});
 }
 return {version:'5.6.0',method:'Monte Carlo conjoint uniforme indépendant + Jansen (pick-and-freeze), N paires A/B',
  seed,n,simulationsParScenario:n*(FACTORS.length+2),date:'2026-10-11',
  horizons:HORIZONS,metrics:METRICS,factors:FACTORS,
  note:'Plages d’hypothèses CONVENTIONNELLES, ni priors bayésiens estimés, ni intervalles de confiance, ni probabilités prédictives. Les indices de Sobol peuvent être négatifs ou dépasser 1 par bruit d’échantillonnage et ne doivent pas être interprétés comme des causalités.',
  reference:'https://www.insee.fr/fr/statistiques/1381077',scenarios};
}
export function toCsv(report){
 const rows=[['scenario','annees','indicateur','centre','p05','mediane','p95','min','max','n','seed']];
 for(const sc of report.scenarios)for(const s of sc.summaries)rows.push([sc.id,s.horizon,s.metric,s.central,s.p05,s.p50,s.p95,s.min,s.max,report.n,report.seed]);
 return rows.map(row=>row.join(',')).join('\n')+'\n';
}
export function toSobolCsv(report){
 const rows=[['scenario','annees','indicateur','parametre','premier_ordre_brut','total_brut','n','seed']];
 for(const sc of report.scenarios)for(const s of sc.sobol)rows.push([sc.id,s.horizon,s.metric,s.factor,s.first??'',s.total??'',report.n,report.seed]);
 return rows.map(row=>row.join(',')).join('\n')+'\n';
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const n=Number(process.env.ECOSIM_SENSITIVITY_N||64),seed=Number(process.env.ECOSIM_SENSITIVITY_SEED||0x5602026);
 const result=run({n,seed});
 const dir=path.join(ROOT,'dist','validation');
 fs.mkdirSync(dir,{recursive:true});
 fs.writeFileSync(path.join(dir,'sensibilite-globale-560.json'),JSON.stringify(result,null,2)+'\n');
 fs.writeFileSync(path.join(dir,'sensibilite-globale-560.csv'),toCsv(result));
 fs.writeFileSync(path.join(dir,'sensibilite-sobol-560.csv'),toSobolCsv(result));
 console.log('SENSIBILITÉ 5.6 :',result.scenarios.length,'scénarios ×',result.simulationsParScenario,'simulations,',result.factors.length,'paramètres, seed',seed);
 for(const s of result.scenarios){const debt=s.summaries.find(r=>r.horizon===5&&r.metric==='debtDeltaPp');console.log(s.id,'écart dette/PIB 2030',debt.p05.toFixed(3),'à',debt.p95.toFixed(3),'pt');}
}
