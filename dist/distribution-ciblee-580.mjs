/* EcoSim France — droits réservés sur les contributions originales protégeables.
   Droits de tiers et exceptions légales préservés ; voir https://github.com/nicolasmoreau1982-beep/nicolasmoreau1982-beep.github.io/blob/main/LICENSE. */
/* EcoSim 5.8 — interface d'exploration distributive sans extrapolation nationale. */
import {simulateSmic,simulatePensionAllowance} from './model-distribution-580.mjs';
import {loadWorkersCsv,loadHouseholdsCsv,checkedProvenance,diagnoseWeights,summarizeWageDistribution,summarizePensionDistribution,aggregatedExport} from './model-distribution-581.mjs';
const $ = id => document.getElementById(id);
const imported={s:null,p:null}; // Stocké seulement dans cet onglet ; aucune requête réseau.
const money = n => new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR',maximumFractionDigits:2}).format(n);
const dec = n => new Intl.NumberFormat('fr-FR',{maximumFractionDigits:2}).format(n);
const samplesWorkers = [1,1.05,1.2,1.5,2,3].map((ratio,i)=>({id:`S${i+1}`,ratio,hours:1607,weight:1,eligible:true}));
const samplesHouseholds = [
  {id:'Petite pension',pensions:'15000',taxable:13500,rfr:14000,type:'single',weight:1},
  {id:'Pension moyenne',pensions:'30000',taxable:27000,rfr:28500,type:'single',weight:1},
  {id:'Pension élevée',pensions:'65000',taxable:60561,rfr:70000,type:'single',weight:1},
  {id:'Couple mixte',pensions:'18000',taxable:85000,rfr:90000,type:'couple',weight:1}
];
const build = (tag,{cls,text,attrs={}}={}) => {
  const n=document.createElement(tag);
  if(cls)n.className=cls;
  if(text!==undefined)n.textContent=text;
  for(const [key,value] of Object.entries(attrs))n.setAttribute(key,String(value));
  return n;
};
function control(value,type='number',params={}){
  const i=build('input',{attrs:{type,value,...params}});return i;
}
function cell(tr,contents){const td=build('td');td.append(contents);tr.append(td);}
function renderWorkers(){
  const tbody=$('s-workers');tbody.replaceChildren();
  samplesWorkers.forEach(w=>{
    const tr=build('tr',{attrs:{'data-worker':w.id}});
    cell(tr,build('span',{text:w.id}));
    cell(tr,control(w.ratio,'number',{min:0.1,max:100,step:.01,'data-field':'ratio','aria-label':`Salaire / SMIC ${w.id}`}));
    cell(tr,control(w.hours,'number',{min:1,max:4000,step:1,'data-field':'hours','aria-label':`Heures par an ${w.id}`}));
    cell(tr,control(w.weight,'number',{min:.01,max:10000000,step:.01,'data-field':'weight','aria-label':`Poids ${w.id}`}));
    const label=build('label',{cls:'dist-check'}),check=control('yes','checkbox',{'data-field':'eligible','aria-label':`SMIC standard ${w.id}`});check.checked=w.eligible;
    label.append(check,document.createTextNode(' Oui'));cell(tr,label);tbody.append(tr);
  });
}
function renderHouseholds(){
  const tbody=$('p-households');tbody.replaceChildren();
  samplesHouseholds.forEach((h,i)=>{
    const tr=build('tr',{attrs:{'data-household':String(i)}});
    cell(tr,build('span',{text:h.id}));
    cell(tr,control(h.pensions,'text',{'data-field':'pensions','aria-label':`Pensions ${h.id}`}));
    cell(tr,control(h.taxable,'number',{min:0,max:100000000,step:1,'data-field':'taxable','aria-label':`Revenu net imposable ${h.id}`}));
    cell(tr,control(h.rfr,'number',{min:0,max:100000000,step:1,'data-field':'rfr','aria-label':`RFR initial ${h.id}`}));
    const sel=build('select',{attrs:{'data-field':'type','aria-label':`Composition ${h.id}`}});
    [['single','Personne seule'],['couple','Couple conjoint']].forEach(([value,text])=>{const option=build('option',{text,attrs:{value}});sel.append(option);});sel.value=h.type;cell(tr,sel);
    cell(tr,control(h.weight,'number',{min:.01,max:10000000,step:.01,'data-field':'weight','aria-label':`Poids fiscal ${h.id}`}));
    tbody.append(tr);
  });
}
function numberField(el){
  if(!el || el.value.trim()==='')throw new RangeError('Champ numérique obligatoire');
  const n=Number(el.value);if(!Number.isFinite(n))throw new RangeError('Nombre incorrect');
  if (el.hasAttribute('min') && n<Number(el.min) || el.hasAttribute('max') && n>Number(el.max))throw new RangeError(`Valeur hors bornes : ${el.getAttribute('aria-label')||el.id}`);
  return n;
}
const rowField=(row,field)=>row.querySelector(`[data-field="${field}"]`);
function workersFromTable(base){
  if(imported.s)return imported.s.rows;
  return [...$('s-workers').rows].map(tr=>({
    id:tr.dataset.worker,
    hourlyGross:base*numberField(rowField(tr,'ratio')),
    hoursPerYear:numberField(rowField(tr,'hours')),
    weight:numberField(rowField(tr,'weight')),
    eligible:rowField(tr,'eligible').checked
  }));
}
function householdsFromTable(){
  if(imported.p)return imported.p.rows;
  return [...$('p-households').rows].map(tr=>{
    const pensionString=rowField(tr,'pensions').value.trim();
    if(!pensionString || !/^\d+(?:[.,]\d+)?(?:\s*;\s*\d+(?:[.,]\d+)?)*$/.test(pensionString))
      throw new RangeError(`Pensions invalides pour ${tr.cells[0].textContent} : séparer les titulaires par « ; »`);
    const pensions=pensionString.split(';').map(x=>Number(x.trim().replace(',','.')));
    return {id:tr.cells[0].textContent,pensions,
      netTaxableIncome:numberField(rowField(tr,'taxable')),
      referenceTaxIncome:numberField(rowField(tr,'rfr')),
      householdType:rowField(tr,'type').value,children:0,
      weight:numberField(rowField(tr,'weight'))};
  });
}
function metrics(container,entries){const root=$(container);root.replaceChildren();entries.forEach(([key,value])=>{const box=build('div');box.append(build('span',{text:key}),build('strong',{text:value}));root.append(box);});}
function details(id,rows){const root=$(id);root.replaceChildren();rows.forEach(row=>{const tr=build('tr');row.forEach(item=>cell(tr,build('span',{text:String(item)})));root.append(tr);});}
function resetResult(prefix){$(`${prefix}-results`).hidden=true;$(`${prefix}-error`).textContent='';$(`${prefix}-export`).disabled=true;$(`${prefix}-strata`).hidden=true;}
let latest={s:null,p:null};
function showStrata(kind,summary){
 const root=$(`${kind}-strata`);root.replaceChildren();
 root.append(build('h3',{text:'Diagnostic descriptif — échantillon importé, non extrapolable'}));
 root.append(build('p',{cls:'dist-note',text:`${summary.diagnostic.observations} lignes ; poids cumulés ${dec(summary.diagnostic.sumWeights)} ; taille effective de Kish ${dec(summary.diagnostic.effectiveSampleSize)} ; poids maximal ${dec(summary.diagnostic.maxWeightSharePercent)} % du total. Ce n’est pas un intervalle de confiance.`}));
 const scroll=build('div',{cls:'dist-table-wrap'}),table=build('table'),head=build('thead'),tr=build('tr');
 for(const label of ['Tranche','Lignes','Poids','Poids concernés','Variation pondérée, € (échantillon)'])tr.append(build('th',{text:label}));
 head.append(tr);const body=build('tbody');
 for(const g of summary.groups){const r=build('tr');
  for(const v of [g.label,String(g.observations),dec(g.weightedObservations),dec(g.weightedAffected),money(g.weightedDelta)])cell(r,build('span',{text:v}));body.append(r);}
 table.append(head,body);scroll.append(table);root.append(scroll);root.hidden=false;
}
async function loadCsv(kind){
 const file=$(`${kind}-csv-file`).files?.[0],label=$(`${kind}-import-status`);
 if(!file){label.textContent='Sélectionner un fichier CSV local.';return;}
 try{
  if(file.size>1500000)throw new RangeError('Limite CSV : 1,5 Mo');
  const provenance=checkedProvenance({source:$(`${kind}-csv-source`).value,year:$(`${kind}-csv-year`).value,coverage:$(`${kind}-csv-scope`).value},kind==='s'?'wage':'pension');
  const rows=kind==='s'?loadWorkersCsv(await file.text()):loadHouseholdsCsv(await file.text());
  // Vérification proactive du socle existant sans appliquer encore de réforme.
  if(kind==='s')simulateSmic({currentSmicHourly:numberField($('s-base')),risePercent:0,workers:rows});
  else if(!window.ECOSIM_FISCAL_INDIVIDUEL_570)throw new Error('Moteur fiscal indisponible');
  else simulatePensionAllowance({households:rows,reform:{type:'remove_above_rfr',rfrThreshold:1e12},calculateIncomeTax:window.ECOSIM_FISCAL_INDIVIDUEL_570.calculate});
  const diagnostic=diagnoseWeights(rows);
  imported[kind]={rows,provenance};
  $(`${kind}-example-details`).hidden=true;
  label.textContent=`${rows.length} lignes locales chargées · taille effective de Kish ${dec(diagnostic.effectiveSampleSize)} · source déclarée : ${provenance.source} (${provenance.year}). Recalculer le scénario ci-dessous.`;
  resetResult(kind);latest[kind]=null;
 }catch(err){label.textContent=`Import refusé : ${err.message}`;}
}
function backToExamples(kind){imported[kind]=null;$(`${kind}-example-details`).hidden=false;
 $(`${kind}-import-status`).textContent='Profils fictifs restaurés. Aucun CSV mémorisé dans la session.';
 $(`${kind}-csv-file`).value='';resetResult(kind);latest[kind]=null;
}

function runSmic(e){e.preventDefault();resetResult('s');latest.s=null;try{
  const base=numberField($('s-base'));
  const input={currentSmicHourly:base,risePercent:numberField($('s-rise')),spilloverStrength:numberField($('s-spill')),spilloverDecay:numberField($('s-decay')),workers:workersFromTable(base)};
  const report=simulateSmic(input);
  const summary=imported.s?summarizeWageDistribution(input.workers,report):null;
  latest.s=summary?aggregatedExport({kind:'smic',provenance:imported.s.provenance,report,summary}):{module:'distribution-ciblee-580',status:'EXEMPLE_NON_REPRESENTATIF',input,report};
  $('s-individual-wrap').hidden=Boolean(summary);
  if(summary)showStrata('s',summary);
  const t=report.totals;
  metrics('s-metrics',[
    ['Nouveau SMIC horaire',money(report.newSmicHourly)],
    ['Profils directement relevés (poids)',`${dec(t.mandatoryAffected)} / ${dec(t.weightedWorkers)}`],
    ['Profils diffusés (poids)',dec(t.spilloverAffected)],
    ['Variation masse brute des profils',`${dec(t.annualGrossPayVariationPercent)} %`],
    ['Variation annuelle brute pondérée',money(t.annualGrossPayDelta)]]);
  if(!summary)details('s-detail',report.rows.map(r=>[r.id,money(r.hourlyBefore),money(r.hourlyAfter),money(r.mandatoryIncreaseHourly),money(r.indirectIncreaseHourly),money(r.annualGrossDelta)]));
  $('s-results').hidden=false;$('s-export').disabled=false;
}catch(err){$('s-error').textContent=err.message;}}
function showPensionParams(){const mode=$('p-mode').value;const progressive=mode==='phase_out_above_rfr',cap=mode==='cap_above_rfr';
  $('p-width-label').hidden=!progressive;$('p-cap-label').hidden=!cap;$('p-width').required=progressive;$('p-cap').required=cap;
}
function runPension(e){e.preventDefault();resetResult('p');latest.p=null;try{
  const type=$('p-mode').value,reform={type,targetMetric:$('p-target').value,rfrThreshold:numberField($('p-threshold'))};
  if(type==='phase_out_above_rfr')reform.phaseOutWidth=numberField($('p-width'));
  if(type==='cap_above_rfr')reform.newCap=numberField($('p-cap'));
  const households=householdsFromTable();
  if(!window.ECOSIM_FISCAL_INDIVIDUEL_570)throw new Error('Calculateur d’impôt indisponible');
  const report=simulatePensionAllowance({households,reform,calculateIncomeTax:window.ECOSIM_FISCAL_INDIVIDUEL_570.calculate});
  const summary=imported.p?summarizePensionDistribution(households,report):null;
  latest.p=summary?aggregatedExport({kind:'pension',provenance:imported.p.provenance,report,summary}):{module:'distribution-ciblee-580',status:'EXEMPLE_NON_REPRESENTATIF',incomeYear:2025,taxYear:2026,households,reform,report};
  $('p-individual-wrap').hidden=Boolean(summary);
  if(summary)showStrata('p',summary);
  const t=report.totals;
  metrics('p-metrics',[
    ['Foyers pondérés dans cet exemple',dec(t.weightedHouseholds)],
    ['Foyers dont l’abattement baisse (poids)',dec(t.foyersAvecAbattementReduit)],
    ['Variation totale de l’IR (échantillon)',money(t.differenceImpot)],
    ['Aucune estimation du rendement national','Échantillon fictif']]);
  if(!summary)details('p-detail',report.rows.map(r=>[r.id,money(r.allowanceBefore),money(r.allowanceAfter),money(r.taxBefore),money(r.taxAfter),money(r.taxDelta)]));
  $('p-results').hidden=false;$('p-export').disabled=false;
}catch(err){$('p-error').textContent=err.message;}}
function exportReport(key){if(!latest[key])return;const name=key==='s'?'smic':'pensions';
  const blob=new Blob([JSON.stringify(latest[key],null,2)+'\n'],{type:'application/json'});
  const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`ecosim-581-${name}-${imported[key]?'agregats':'illustratif'}.json`;
  document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
renderWorkers();renderHouseholds();
const params=new URLSearchParams(location.search),suggested=params.get('smicRise');
if(suggested!==null && /^\d+(?:\.\d+)?$/.test(suggested) && Number(suggested)<=100)$('s-rise').value=String(Number(suggested));
$('smic-form').addEventListener('submit',runSmic);$('p-form').addEventListener('submit',runPension);
$('s-reset').addEventListener('click',()=>{backToExamples('s');renderWorkers();['s-base','s-rise','s-spill','s-decay'].forEach((id,i)=>$(id).value=['12.31','10','0','0.5'][i]);resetResult('s');latest.s=null;});
$('p-reset').addEventListener('click',()=>{backToExamples('p');renderHouseholds();$('p-target').value='rfr';showPensionTarget();$('p-mode').value='phase_out_above_rfr';$('p-threshold').value='55000';$('p-width').value='25000';$('p-cap').value='3000';showPensionParams();resetResult('p');latest.p=null;});
function showPensionTarget(){$('p-threshold-name').textContent=$('p-target').value==='rfr'?'Seuil de RFR initial (€)':'Seuil de pensions totales du foyer (€)';}
$('p-target').addEventListener('change',showPensionTarget);showPensionTarget();
$('p-mode').addEventListener('change',showPensionParams);showPensionParams();
$('s-export').addEventListener('click',()=>exportReport('s'));
$('p-export').addEventListener('click',()=>exportReport('p'));
for(const key of ['s','p']){
  $(`${key==='s'?'smic':'p'}-form`).addEventListener('input',()=>{resetResult(key);latest[key]=null;});
  $(`${key==='s'?'smic':'p'}-form`).addEventListener('change',()=>{resetResult(key);latest[key]=null;});
}

$('s-import').addEventListener('click',()=>loadCsv('s'));
$('p-import').addEventListener('click',()=>loadCsv('p'));
$('s-examples').addEventListener('click',()=>backToExamples('s'));
$('p-examples').addEventListener('click',()=>backToExamples('p'));
