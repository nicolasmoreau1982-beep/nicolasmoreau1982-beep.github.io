/** EcoSim 5.6.1 — version corrective de l'analyse statistique.
 * Le moteur économique reste inchangé ; anciennes sorties 5.6 conservées.
 * Conventions d'échantillonnage et d'intervalle publiées, sans calibration empirique.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {makeHarness} from './core-harness-540.mjs';
import {FACTORS,CASES} from './sensibilite-globale-560.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export {FACTORS,CASES};
export const HORIZONS=[1,5,10];
export const METRICS=[
 {id:'gdpDeltaPct',label:'Écart PIB à la référence',unit:'% du PIB'},
 {id:'debtDeltaPp',label:'Écart dette/PIB à la référence',unit:'point de PIB'},
 {id:'deficitDeltaBn',label:'Écart déficit à la référence',unit:'Md€'},
 {id:'unemploymentDeltaPp',label:'Écart chômage à la référence',unit:'point'}
];
const rotl=(x,k)=>(x<<k)|(x>>>(32-k));
// Xoshiro128** : PRNG entier 32-bit, états distincts pour A, B et bootstrap.
// splitmix32 initialise quatre mots ; ce tirage reste pseudo-aléatoire et ne garantit pas l'indépendance mathématique.
export function xoshiro128ss(seed){
 let t=seed>>>0;
 const init=()=>{t=(t+0x9e3779b9)>>>0;let z=t;z=Math.imul(z^(z>>>16),0x21f0aaad);z=Math.imul(z^(z>>>15),0x735a2d97);return (z^(z>>>15))>>>0;};
 let a=init(),b=init(),c=init(),d=init();
 if(!(a|b|c|d))d=1;
 return ()=>{const out=Math.imul(rotl(Math.imul(b,5),7),9)>>>0;const q=b<<9;
 c^=a;d^=b;b^=c;a^=d;c^=q;d=rotl(d,11);return out/4294967296;};
}
export function matrices(n,seed, factors=FACTORS){
 const aRand=xoshiro128ss((seed^0xA531E35B)>>>0),bRand=xoshiro128ss((seed^0xB73A4FC1)>>>0);
 const draw=(rand)=>Array.from({length:n},()=>factors.map(f=>f.lo+(f.hi-f.lo)*rand()));
 return {A:draw(aRand),B:draw(bRand)};
}
function percentile(sorted,p){const k=(sorted.length-1)*p,i=Math.floor(k);return sorted[i]+(sorted[Math.min(i+1,sorted.length-1)]-sorted[i])*(k-i);}
const avg=x=>x.reduce((s,v)=>s+v,0)/x.length;
/** C_i = A dont seule la colonne i provient de B.
 * S_i : estimateur covariance Saltelli centré : E[(Y_B-mu)(Y_Ci-Y_A)]/V.
 * ST_i : Jansen : E[(Y_A-Y_Ci)^2]/(2V).
 * Le premier ordre d'un facteur structurellement inactif vaut exactement 0,
 * à l'erreur d'arrondi près ; les estimations brutes ne sont jamais écrêtées.
 */
export function indices(ya,yb,yc){
 const n=ya.length;
 if(n===0||yb.length!==n||yc.length!==n)throw new RangeError('vecteurs non alignés');
 const mu=(avg(ya)+avg(yb))/2;
 let variance=0,firstNum=0,totalNum=0;
 for(let j=0;j<n;j++){
  const a=ya[j],b=yb[j],c=yc[j];
  if(![a,b,c].every(Number.isFinite))throw new Error('valeur non finie dans un estimateur');
  variance+=(a-mu)**2+(b-mu)**2;
  firstNum+=(b-mu)*(c-a);totalNum+=(a-c)**2;
 }
 variance/=2*n;
 return variance<1e-18?{first:null,total:null,variance}:
  {first:firstNum/n/variance,total:totalNum/(2*n*variance),variance};
}
export function bootstrapIndices(ya,yb,yc,{replicates=192,seed=1234}={}){
 if(!Number.isInteger(replicates)||replicates<0||replicates>4096)throw new RangeError('nombre de rééchantillonnages invalide');
 if(replicates===0)return {firstLow:null,firstHigh:null,totalLow:null,totalHigh:null,replicates:0};
 const n=ya.length,rand=xoshiro128ss(seed>>>0),first=[],total=[];
 for(let k=0;k<replicates;k++){
  const ia=[],ib=[],ic=[];
  for(let j=0;j<n;j++){const ix=Math.floor(rand()*n);ia.push(ya[ix]);ib.push(yb[ix]);ic.push(yc[ix]);}
  const r=indices(ia,ib,ic);
  if(r.first!==null){first.push(r.first);total.push(r.total);}
 }
 first.sort((a,b)=>a-b);total.sort((a,b)=>a-b);
 return {firstLow:first.length?percentile(first,.025):null,firstHigh:first.length?percentile(first,.975):null,
  totalLow:total.length?percentile(total,.025):null,totalHigh:total.length?percentile(total,.975):null,
  replicates:first.length};
}
function sample(h,x,scenario){
 const p=h.D.models.consensus;
 const original={supplyScale:p.supplyScale,decay:p.decay,debtSensitivity:p.debtSensitivity};
 try{
  p.supplyScale=original.supplyScale*x[2];p.decay=original.decay*x[3];p.debtSensitivity=original.debtSensitivity*x[4];
  const result=h.calculateProjection('consensus',null,{spending:x[0],tax:x[1]});const output={};
  for(const horizon of HORIZONS){const a=result.scenario[horizon-1],b=result.baseline[horizon-1];
   const row={gdpDeltaPct:(a.gdp/b.gdp-1)*100,debtDeltaPp:a.debtRatio-b.debtRatio,
    deficitDeltaBn:a.deficit-b.deficit,unemploymentDeltaPp:a.unemployment-b.unemployment};
   for(const [id,v] of Object.entries(row)){
    if(!Number.isFinite(v))throw new Error(`${scenario} ${horizon} ${id} non fini`);
    output[`${horizon}:${id}`]=v;
   }
  }return output;
 }finally{Object.assign(p,original);}
}
export function run({n=256,seed=0x5602026,cases=CASES,replicates=192}={}){
 if(!Number.isInteger(n)||n<16||n>2048||(n&(n-1))!==0)throw new RangeError('n : puissance de 2 entre 16 et 2048');
 if(!Number.isSafeInteger(seed)||seed<0||seed>0xffffffff)throw new RangeError('graine 32 bits invalide');
 if(!Number.isInteger(replicates)||replicates<0||replicates>4096)throw new RangeError('bootstrap invalide');
 const h=makeHarness(path.join(ROOT,'dist'));
 const {A,B}=matrices(n,seed);
 const scenarios=[];let countAll=0,violations=0,inactive=0,largestInactive=0;
 const began=process.hrtime.bigint();
 for(const scenario of cases){
  h.reset();h.state.changes={...scenario.changes};
  const central=sample(h,[1,1,1,1,1],scenario.id);
  const a=A.map(x=>sample(h,x,scenario.id)),b=B.map(x=>sample(h,x,scenario.id));
  const c=FACTORS.map((_f,i)=>A.map((x,j)=>{const z=x.slice();z[i]=B[j][i];return sample(h,z,scenario.id);}));
  const summaries=[],sobol=[];
  for(const horizon of HORIZONS)for(const metric of METRICS){
   const key=`${horizon}:${metric.id}`;
   const ya=a.map(v=>v[key]),yb=b.map(v=>v[key]);
   const joined=[...ya,...yb].sort((u,v)=>u-v);
   const mu=avg(joined);
   summaries.push({horizon,metric:metric.id,label:metric.label,unit:metric.unit,
    central:central[key],p05:percentile(joined,.05),p50:percentile(joined,.5),p95:percentile(joined,.95),
    mean:mu,min:joined[0],max:joined[joined.length-1]});
   FACTORS.forEach((factor,i)=>{
    const yc=c[i].map(v=>v[key]),est=indices(ya,yb,yc);
    const boot=bootstrapIndices(ya,yb,yc,{replicates,seed:(seed+Math.imul(i+1,747796405)+horizon*2654435761+metric.id.length*1234567)>>>0});
    // Structurellement inactif : aucune modification du résultat lors du remplacement de la colonne.
    const zeroInfluence=ya.every((v,j)=>v===yc[j]);
    if(est.first!==null){countAll++;if(est.first>est.total+1e-6)violations++;}
    if(zeroInfluence){inactive++;if(est.first!==null)largestInactive=Math.max(largestInactive,Math.abs(est.first));}
    sobol.push({horizon,metric:metric.id,factor:factor.id,first:est.first,total:est.total,
     ...boot,inactive:zeroInfluence,apparentViolation:est.first!==null&&est.first>est.total+1e-6});
   });
  }
  scenarios.push({id:scenario.id,label:scenario.label,changes:scenario.changes,summaries,sobol});
 }
 const elapsedSeconds=Number(process.hrtime.bigint()-began)/1e9;
 const totalProjections=n*(FACTORS.length+2)*scenarios.length;
 const buildText=fs.readFileSync(path.join(ROOT,'dist/build-info.js'),'utf8');
 const buildId=buildText.match(/ECOSIM_BUILD_ID\s*=\s*"([a-f0-9]+)"/)?.[1]??null;
 return {version:'5.6.1',method:'Monte Carlo pseudo-aléatoire (xoshiro128**, flux A/B séparés), Saltelli centré S1 + Jansen ST, bootstrap descriptif par paires',
  seed,n,replicates,prng:'xoshiro128** (splitmix32 initialisation, 2 flux distincts)',buildId,
  simulationsParScenario:n*(FACTORS.length+2),projectionsTotales:totalProjections,
  tempsSecondes:Number(elapsedSeconds.toFixed(3)),secondesParProjection:Number((elapsedSeconds/totalProjections).toFixed(6)),
  date:'2026-10-11',horizons:HORIZONS,metrics:METRICS,factors:FACTORS,
  diagnostics:{indicesFinis:countAll,violationsPremierSuperieurTotal:violations,facteursStructurellementInactifs:inactive,maxAbsPremierOrdreInactif:largestInactive},
  note:'Plages UNIFORMES CONVENTIONNELLES, ni loi bayésienne ni prévision probabiliste. Les intervalles bootstrap caractérisent le rééchantillonnage conditionnel à un jeu de paires : ce ne sont pas des IC de validité économique. Indices bruts non écrêtés. L’effet d’un PARAMÈTRE ne doit pas être confondu avec un effet économique causal.',
  reference:'https://www.insee.fr/fr/statistiques/1381077',scenarios};
}
export function toCsv(r){const rows=[['scenario','annees','indicateur','centre','p05','mediane','p95','min','max','n','seed']];
 for(const sc of r.scenarios)for(const s of sc.summaries)rows.push([sc.id,s.horizon,s.metric,s.central,s.p05,s.p50,s.p95,s.min,s.max,r.n,r.seed]);
 return rows.map(x=>x.join(',')).join('\n')+'\n';}
export function toSobolCsv(r){const rows=[['scenario','annees','indicateur','parametre','premier_ordre_brut','total_brut','s1_boot_low','s1_boot_high','st_boot_low','st_boot_high','structurellement_inactif','violation_s1_gt_st','n','seed']];
 for(const sc of r.scenarios)for(const s of sc.sobol)rows.push([sc.id,s.horizon,s.metric,s.factor,s.first??'',s.total??'',s.firstLow??'',s.firstHigh??'',s.totalLow??'',s.totalHigh??'',s.inactive,s.apparentViolation,r.n,r.seed]);
 return rows.map(x=>x.join(',')).join('\n')+'\n';}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const n=Number(process.env.ECOSIM_SENSITIVITY_N||256),seed=Number(process.env.ECOSIM_SENSITIVITY_SEED||0x5602026);
 const reps=Number(process.env.ECOSIM_SENSITIVITY_BOOTSTRAP||192);
 const report=run({n,seed,replicates:reps});const d=path.join(ROOT,'dist/validation');fs.mkdirSync(d,{recursive:true});
 fs.writeFileSync(path.join(d,'sensibilite-globale-561.json'),JSON.stringify(report,null,2)+'\n');
 fs.writeFileSync(path.join(d,'sensibilite-globale-561.csv'),toCsv(report));
 fs.writeFileSync(path.join(d,'sensibilite-sobol-561.csv'),toSobolCsv(report));
 console.log('5.6.1',report.projectionsTotales,'projections,',report.tempsSecondes,'s, S1>ST:',report.diagnostics.violationsPremierSuperieurTotal,'/',report.diagnostics.indicesFinis,'inactifs',report.diagnostics.facteursStructurellementInactifs);
}
