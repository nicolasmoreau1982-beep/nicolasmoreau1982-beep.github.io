/* EcoSim France — droits réservés sur les contributions originales protégeables.
   Données tierces et exceptions légales préservées ; voir LICENSE dans le dépôt.
   5.8.1 : import en mémoire, diagnostic des poids et ventilation par tranche.
   AUCUNE donnée téléchargée ni extrapolation nationale. */

const MAX_ROWS=10000;
const isNumber=v=>typeof v==='number'&&Number.isFinite(v);
function validNumber(str,label,{min=0,max=1e10,positive=false}={}){
 const raw=String(str??'').trim();
 if(!/^(?:\d+(?:[.,]\d+)?|[.,]\d+)$/.test(raw))throw new RangeError(`${label} : nombre décimal attendu`);
 const n=Number(raw.replace(',','.'));
 if(!isNumber(n)||n<min||n>max||(positive&&n===0))throw new RangeError(`${label} hors limites`);
 return n;
}
function requireId(raw){
 const id=String(raw??'').trim();
 if(!/^[A-Za-z0-9][A-Za-z0-9_.-]{0,39}$/.test(id))throw new RangeError('Identifiant : 1–40 caractères alphanumériques sans espaces (éviter tout nom personnel)');
 return id;
}
/** CSV français avec ; par défaut, CSV anglais à virgule si en-tête conforme.
 * Citations, guillemets échappés et sauts de ligne CRLF gérés ; pas de formules Excel.
 */
export function parseCsv(text,headers){
 if(typeof text!=='string'||text.length>1_500_000)throw new RangeError('Fichier CSV trop volumineux (limite 1,5 Mo)');
 const source=text.replace(/^\uFEFF/,'');
 if(!source.trim())throw new RangeError('CSV vide');
 const firstLine=source.split(/\r?\n/,1)[0];
 const delimiter=firstLine.includes(';')?';':',';
 const rows=[];let cell='',cells=[],quoted=false;
 function pushRow(){
  cells.push(cell);cell='';
  if(cells.some(c=>c.trim()!==''))rows.push(cells);
  cells=[];
  if(rows.length>MAX_ROWS+1)throw new RangeError(`Plus de ${MAX_ROWS} lignes de données`);
 }
 for(let i=0;i<source.length;i++){
  const ch=source[i];
  if(quoted){
   if(ch==='"'&&source[i+1]==='"'){cell+='"';i++;}
   else if(ch==='"')quoted=false;
   else cell+=ch;
  }else if(ch==='"'){
   if(cell!=='')throw new RangeError('Guillemets CSV mal placés');
   quoted=true;
  }else if(ch===delimiter){cells.push(cell);cell='';}
  else if(ch==='\n'||ch==='\r'){
   if(ch==='\r'&&source[i+1]==='\n')i++;
   pushRow();
  }else cell+=ch;
 }
 if(quoted)throw new RangeError('Guillemet CSV non fermé');
 if(cell!==''||cells.length)pushRow();
 if(rows.length<2)throw new RangeError('CSV sans données');
 const columns=rows.shift().map(s=>s.trim());
 if(columns.length!==headers.length||columns.some((h,i)=>h!==headers[i]))
  throw new RangeError('Colonnes attendues (dans cet ordre) : '+headers.join(delimiter));
 return rows.map((values,index)=>{
  if(values.length!==columns.length)throw new RangeError(`Ligne ${index+2} : ${values.length} colonnes au lieu de ${columns.length}`);
  return Object.fromEntries(columns.map((h,i)=>[h,values[i].trim()]));
 });
}
export const WORKER_HEADERS=['id','hourlyGross','hoursPerYear','weight','eligible'];
export const HOUSEHOLD_HEADERS=['id','pensions','netTaxableIncome','referenceTaxIncome','householdType','children','weight'];
export function loadWorkersCsv(text){
 const records=parseCsv(text,WORKER_HEADERS);const seen=new Set();
 return records.map((r,i)=>{
  const id=requireId(r.id);if(seen.has(id))throw new RangeError(`Identifiant dupliqué : ${id}`);seen.add(id);
  if(!/^(0|1)$/.test(r.eligible))throw new RangeError(`Ligne ${i+2} : eligible doit valoir 0 ou 1`);
  return {id,hourlyGross:validNumber(r.hourlyGross,'Salaire', {positive:true,max:100000}),
   hoursPerYear:validNumber(r.hoursPerYear,'Heures', {positive:true,max:4000}),
   weight:validNumber(r.weight,'Poids',{positive:true,max:1e7}),eligible:r.eligible==='1'};
 });
}
export function loadHouseholdsCsv(text){
 const records=parseCsv(text,HOUSEHOLD_HEADERS);const seen=new Set();
 return records.map((r,i)=>{
  const id=requireId(r.id);if(seen.has(id))throw new RangeError(`Identifiant dupliqué : ${id}`);seen.add(id);
  if(!/^(single|couple)$/.test(r.householdType))throw new RangeError(`Ligne ${i+2} : householdType = single ou couple`);
  if(!/^\d+$/.test(r.children)||Number(r.children)>20)throw new RangeError(`Ligne ${i+2} : nombre d’enfants invalide`);
  if(!/^\d+(?:[.,]\d+)?(?:\|\d+(?:[.,]\d+)?)*$/.test(r.pensions))
   throw new RangeError(`Ligne ${i+2} : pensions séparées par | sans espaces`);
  const pensions=r.pensions.split('|').map((v)=>validNumber(v,'Pension'));
  if(pensions.length>10)throw new RangeError(`Ligne ${i+2} : trop de titulaires`);
  return {id,pensions,netTaxableIncome:validNumber(r.netTaxableIncome,'Revenu imposable'),
   referenceTaxIncome:validNumber(r.referenceTaxIncome,'RFR'),householdType:r.householdType,
   children:Number(r.children),weight:validNumber(r.weight,'Poids',{positive:true,max:1e7})};
 });
}
/** Étiquetage de provenance déclaré par l'utilisateur, jamais attesté par EcoSim. */
export function checkedProvenance({source,year,coverage},kind){
 if(!['wage','pension'].includes(kind))throw new RangeError('Type de distribution inconnu');
 const name=String(source??'').trim(),scope=String(coverage??'').trim(),v=String(year??'').trim();
 if(name.length<4||name.length>180||scope.length<12||scope.length>400||!/^(19\d\d|20\d\d)$/.test(v)||Number(v)>2099)
  throw new RangeError('Provenance : source (4–180 caractères), année et champ couvert (12–400 caractères) sont obligatoires');
 return {source:name,year:Number(v),coverage:scope,kind,verifiedByEcoSim:false,representativity:'NON_ETABLIE'};
}
export function diagnoseWeights(rows){
 if(!Array.isArray(rows)||!rows.length||rows.length>MAX_ROWS)throw new RangeError('Distribution vide ou trop longue');
 let sum=0,sumSq=0,max=0;
 for(const r of rows){const w=r.weight;
  if(!isNumber(w)||w<=0||w>1e7)throw new RangeError('Poids statistique invalide');
  sum+=w;sumSq+=w*w;max=Math.max(max,w);
 }
 if(!Number.isFinite(sum)||!Number.isFinite(sumSq)||sumSq<=0)throw new RangeError('Poids cumulés trop grands');
 return {observations:rows.length,sumWeights:sum,effectiveSampleSize:(sum*sum)/sumSq,
  maxWeightSharePercent:100*max/sum,
  methodology:'Taille effective de Kish : (somme w)^2 / somme(w²), indicateur de concentration des poids ; ne mesure pas à elle seule une précision d’enquête.'};
}
const WAGE_GROUPS=[
 {code:'derogatoire',label:'Dérogation au SMIC'},
 {code:'100_110',label:'1,00 à <1,10 SMIC'},
 {code:'110_130',label:'1,10 à <1,30 SMIC'},
 {code:'130_160',label:'1,30 à <1,60 SMIC'},
 {code:'160_200',label:'1,60 à <2,00 SMIC'},
 {code:'200_plus',label:'2,00 SMIC et plus'}];
function wageGroup(worker,smic){
 if(worker.eligible===false)return 'derogatoire';
 const r=worker.hourlyGross/smic;
 return r<1.1?'100_110':r<1.3?'110_130':r<1.6?'130_160':r<2?'160_200':'200_plus';
}
const PENSION_GROUPS=[
 {code:'rfr_0_20',label:'RFR < 20 000 €'},
 {code:'rfr_20_40',label:'20 000 à <40 000 €'},
 {code:'rfr_40_60',label:'40 000 à <60 000 €'},
 {code:'rfr_60_100',label:'60 000 à <100 000 €'},
 {code:'rfr_100_plus',label:'RFR ≥ 100 000 €'}];
function pensionGroup(rfr){return rfr<20000?'rfr_0_20':rfr<40000?'rfr_20_40':rfr<60000?'rfr_40_60':rfr<100000?'rfr_60_100':'rfr_100_plus';}
function emptyGroup(g){return {...g,observations:0,weightedObservations:0,weightedAffected:0,weightedDelta:0};}
/** Ventilation DÉSCRIPTIVE des seuls profils importés : pas une estimation France. */
export function summarizeWageDistribution(workers,report){
 if(workers.length!==report.rows.length)throw new RangeError('Échantillon SMIC incohérent');
 const groups=WAGE_GROUPS.map(emptyGroup),byCode=new Map(groups.map(g=>[g.code,g]));
 for(let i=0;i<workers.length;i++){
  const w=workers[i],result=report.rows[i],group=byCode.get(wageGroup(w,report.currentSmicHourly));
  if(w.id!==result.id)throw new RangeError('Ordre des salariés incohérent');
  group.observations++;group.weightedObservations+=w.weight;
  group.weightedAffected+=w.weight*Number(result.mandatoryIncreaseHourly>0);
  group.weightedDelta+=w.weight*result.annualGrossDelta;
 }
 return {kind:'smic',diagnostic:diagnoseWeights(workers),groups,scope:'ÉCHANTILLON_IMPORTÉ_NON_CALIBRÉ',
  warning:'Montants pondérés dans les seules données importées : ni coût budgétaire, ni masse salariale nationale.'};
}
export function summarizePensionDistribution(households,report){
 if(households.length!==report.rows.length)throw new RangeError('Échantillon pensions incohérent');
 const groups=PENSION_GROUPS.map(emptyGroup),byCode=new Map(groups.map(g=>[g.code,g]));
 for(let i=0;i<households.length;i++){
  const h=households[i],result=report.rows[i],group=byCode.get(pensionGroup(h.referenceTaxIncome));
  if(h.id!==result.id)throw new RangeError('Ordre des foyers incohérent');
  group.observations++;group.weightedObservations+=h.weight;
  group.weightedAffected+=h.weight*Number(result.allowanceAfter<result.allowanceBefore);
  group.weightedDelta+=h.weight*result.taxDelta;
 }
 return {kind:'pension',diagnostic:diagnoseWeights(households),groups,scope:'ÉCHANTILLON_IMPORTÉ_NON_CALIBRÉ',
  warning:'Variations d’IR pondérées des seuls foyers importés ; aucune recette nationale ni intervalle de confiance.'};
}
export function aggregatedExport({kind,provenance,report,summary}){
 if(!provenance||provenance.representativity!=='NON_ETABLIE'||!summary?.diagnostic)throw new RangeError('Provenance ou diagnostic absent');
 // Suppression des cellules de moins de 5 observations. On omet aussi les
 // totaux de revenus/impôts afin d'éviter la déduction par différence.
 const groups=summary.groups.map(g=>g.observations<5
  ? {code:g.code,label:g.label,observations:g.observations,suppressed:true,
     weightedObservations:null,weightedAffected:null,weightedDelta:null}
  : {...g,suppressed:false});
 return {schema:'ecosim-distribution-5.8.1',kind,status:'REPRESENTATIVITE_NON_ETABLIE',
  provenance,scenario:kind==='smic'?{risePercent:report.risePercent,currentSmicHourly:report.currentSmicHourly,...report.scenario}:report.reform,
  diagnostic:summary.diagnostic,groups,
  privacy:'Aucune ligne individuelle exportée ; cellules de moins de 5 observations masquées ; totaux financiers globaux omis pour éviter une déduction par différence.',
  limitations:summary.warning+' Fichier agrégé sans observations individuelles. Le contrôle de divulgation reste simplifié : ne publier que des jeux de données autorisés.'};
}
