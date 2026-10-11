/** Adaptateur expérimental : zéro formule économique recopiée. */
import fs from 'node:fs';
import path from 'node:path';
import {makeHarness} from '../scripts/core-harness-540.mjs';
import {produceSpecifications} from './schema.mjs';
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
const rootOf=(v)=>v!==null&&typeof v==='object'&&!Array.isArray(v);
export class ApiFault extends Error {
  constructor(code,message,status=422){super(message);this.name='ApiFault';this.code=code;this.status=status;}
}
export function createService(root){
  const dist=path.join(root,'dist');
  const specifications=produceSpecifications(root);
  const {scenarioSchema,openapi,counts}=specifications;
  const buildText=fs.readFileSync(path.join(dist,'build-info.js'),'utf8');
  const buildId=(buildText.match(/ECOSIM_BUILD_ID\s*=\s*"([^"]+)"/)||[])[1]||'inconnu';
  const choices=new Set(Object.keys(scenarioSchema.properties));
  const numeric=/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i;
  const checkGroup=(name,data,property)=>{
    if(data===undefined)return;
    if(!rootOf(data))throw new ApiFault('INVALID_FIELD',`« ${name} » doit être un objet.`);
    for(const [k,v] of Object.entries(data)){
      if(!own(property.properties,k))throw new ApiFault('UNKNOWN_PARAMETER',`${name}.${k} : réglage inconnu.`);
      const def=property.properties[k];
      if(name==='policyStartQuarters'){
        if(!Number.isInteger(v)||v<1||v>4)throw new ApiFault('INVALID_FIELD',`${name}.${k} : trimestre invalide.`);
      }else if(!((typeof v==='number'&&Number.isFinite(v))||(typeof v==='string'&&numeric.test(v)))){
        throw new ApiFault('INVALID_FIELD',`${name}.${k} : valeur numérique invalide.`);
      }
    }
  };
  function parseBody(body){
    if(!rootOf(body))throw new ApiFault('INVALID_REQUEST','Un objet JSON est attendu.');
    // Format API 1.0, et compatibilité avec l’export JSON de l’IHM.
    let scenario, horizon=3;
    if(own(body,'schemaVersion')){
      if(body.schemaVersion!=='1.0')throw new ApiFault('UNSUPPORTED_SCHEMA','schemaVersion doit valoir « 1.0 ».');
      const unexpected=Object.keys(body).filter(k=>!['schemaVersion','scenario','horizon'].includes(k));
      if(unexpected.length)throw new ApiFault('UNKNOWN_FIELD',`Champ de requête inconnu : ${unexpected[0]}`);
      scenario=body.scenario;horizon=own(body,'horizon')?body.horizon:3;
    }else if(rootOf(body.scenario)){
      // Contenu d’un fichier exporté par EcoSim : {metadata, scenario, projection}.
      scenario=body.scenario;
    }else{
      scenario=body;
    }
    if(!rootOf(scenario))throw new ApiFault('INVALID_SCENARIO','Le scénario doit être un objet JSON.');
    const unknown=Object.keys(scenario).filter(k=>!choices.has(k));
    if(unknown.length)throw new ApiFault('UNKNOWN_PARAMETER',`Critère inconnu : ${unknown[0]}`);
    if(!Object.keys(scenario).some(k=>['changes','structural','engines','fiscal','model','euMode','cycle','monetary','confidence','sectoral'].includes(k)))
      throw new ApiFault('EMPTY_SCENARIO','Le fichier ne contient aucun réglage de scénario EcoSim.');
    for(const k of ['changes','structural','engines','fiscal','policyStartQuarters']) checkGroup(k,scenario[k],scenarioSchema.properties[k]);
    if(!Number.isInteger(horizon)||horizon<1||horizon>counts.projectionYears)throw new ApiFault('INVALID_HORIZON',`horizon doit être entre 1 et ${counts.projectionYears} ans.`);
    return {scenario,horizon};
  }
  function simulate(input){
    const {scenario,horizon}=parseBody(input);
    // Nouveau contexte isolé par requête : aucun état n'est hérité d'une autre simulation.
    const engine=makeHarness(dist);engine.reset();
    if(!engine.applySerialized(scenario))throw new ApiFault('INVALID_SCENARIO','Le scénario est refusé par les garde-fous du moteur (valeur, cohérence ou périmètre).');
    const calc=engine.calculateProjection();
    if(calc.scenario.length!==counts.projectionYears||calc.baseline.length!==counts.projectionYears)throw new ApiFault('ENGINE_ERROR','Longueur de projection incohérente.',500);
    const clone=v=>JSON.parse(JSON.stringify(v));
    return {status:'completed',schemaVersion:'1.0',engineVersion:engine.D.metadata.version,buildId,
      scenario:clone(engine.serializableState()),selectedYear:engine.D.metadata.projectionStart+horizon-1,
      results:{baseline:clone(calc.baseline.slice(0,horizon)),scenario:clone(calc.scenario.slice(0,horizon))},
      limitations:['Simulation exploratoire, pas prévision certifiée.', 'Le contrat HTTP public n’est pas actif sur GitHub Pages.']};
  }
  function metadata(){const x=makeHarness(dist);return {status:'experimental_not_deployed',engineVersion:x.D.metadata.version,buildId,schemaVersion:'1.0',counts};}
  return {simulate,metadata,scenarioSchema,openapi,counts};
}
