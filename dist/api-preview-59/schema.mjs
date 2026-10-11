/** EcoSim API preview v1 — schémas produits à partir du catalogue de réglages réel. */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {makeHarness} from '../scripts/core-harness-540.mjs';

const jsonClone = value => JSON.parse(JSON.stringify(value));
const toControl = (c) => {
  const n = {type: c.step === 1 ? 'integer' : 'number', minimum:c.min, maximum:c.max,
    default:c.value, description:`${c.label}${c.unit || ''}`};
  // L'interface et les garde-fous acceptent aussi les chaînes numériques.
  return {anyOf:[n, {type:'string',pattern:'^[+-]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)(?:[eE][+-]?\\d+)?$'}],
    description:`${c.label} — ${c.min} à ${c.max}${c.unit || ''}. Chaîne numérique tolérée comme dans l’import IHM.`};
};
const group = controls => ({type:'object', additionalProperties:false,
  properties:Object.fromEntries(Object.entries(controls).map(([id,c])=>[id,toControl(c)]))});
const enumField=(keys,desc)=>({type:'string', enum:keys, description:desc});
export function produceSpecifications(root){
  const dist = path.join(root,'dist');
  const {D,F} = makeHarness(dist);
  // Lecture directe du catalogue sectoriel existant, sans recopier ses listes.
  const c = vm.createContext({window:{}});
  vm.runInContext(fs.readFileSync(path.join(dist,'sectoral.js'),'utf8'),c,{filename:'sectoral.js'});
  const S = c.window.ECOSIM_SECTORAL;
  const all = [...D.spending,...D.revenue].filter(x=>!x.locked);
  const caps = Object.fromEntries(all.map(cat=>{
    const limit=Math.max(10,Math.ceil(Math.abs(cat.value)*0.7/5)*5);
    return [cat.id,toControl({label:cat.label||cat.name||cat.id,min:Math.max(-limit,-cat.value),max:limit,step:0,value:0,unit:' Md€'})];
  }));
  const quarterProps=Object.fromEntries(all.map(cat=>[cat.id,{type:'integer',minimum:1,maximum:4}]));
  const sectoral = {type:'array',maxItems:S.MAX_MEASURES,description:'Enveloppes cumulées ≤30 Md€/an, vérifiées par le moteur.', items:{type:'object',additionalProperties:false,
    required:['sector','instrument','amountBn','startYear','durationYears','response'],
    properties:{
      sector:enumField(Object.keys(S.sectors),'Filière sectorielle'),
      instrument:enumField(Object.keys(S.instruments),'Instrument comptable'),
      amountBn:{type:'number',minimum:0.1,maximum:S.MAX_EACH_BN,description:'Md€ annuels'},
      startYear:{type:'integer',minimum:S.START_MIN,maximum:S.START_MAX},
      durationYears:{type:'integer',minimum:1,maximum:15},
      response:enumField(['accounting','exploratory','contextual'],'Aucune causalité dans le mode accounting')
    }}};
  const scenario={type:'object', additionalProperties:false,
    description:'Mêmes familles de réglages que le fichier importé par l’IHM. Champs omis = valeurs par défaut.',
    properties:{
      name:{type:'string',maxLength:60},version:{type:'string',description:'Version source de l’export IHM; informative'},
      buildId:{type:'string',description:'Empreinte de l’export IHM; informative'},
      model:enumField(Object.keys(D.models),'Modèle économique'),
      euMode:enumField(Object.keys(D.euModes),'Cadre européen'),
      cycle:enumField(Object.keys(D.assumptions.cycle),'Hypothèses de cycle'),
      monetary:enumField(Object.keys(D.assumptions.monetary),'Politique monétaire'),
      confidence:enumField(Object.keys(D.assumptions.confidence),'Confiance'),
      policyStartQuarter:{type:'integer',minimum:1,maximum:4,default:1},
      policyStartQuarters:{type:'object',additionalProperties:false,properties:quarterProps},
      changes:{type:'object',additionalProperties:false,properties:caps,description:'Montants budgétaires en Md€'},
      structural:group(D.structural.controls),
      engines:group(D.policyEngines.controls),
      fiscal:group(F.controls),
      sectoral
    }
  };
  const scenarioSchema={$schema:'https://json-schema.org/draft/2020-12/schema', $id:'https://nicolasmoreau1982-beep.github.io/api-spec/scenario-590.schema.json',title:'EcoSim France — Scénario 1.0 (API expérimentale)',...scenario};
  const req={type:'object',additionalProperties:false, required:['schemaVersion','scenario'],
    properties:{schemaVersion:{type:'string',const:'1.0'},scenario:{$ref:'#/components/schemas/Scenario'},
      horizon:{type:'integer',minimum:1,maximum:D.metadata.projectionYears,default:3,description:'Nombre d’années depuis '+D.metadata.projectionStart}}};
  const err={type:'object',additionalProperties:false,required:['status','error'],properties:{status:{const:'error'},error:{type:'object',required:['code','message'],properties:{code:{type:'string'},message:{type:'string'}}}}};
  const point={type:'object',required:['year','gdp','debt','debtRatio','deficit','deficitRatio','unemployment'],additionalProperties:true,properties:{year:{type:'integer'},gdp:{type:'number',description:'Md€'},debt:{type:'number',description:'Md€'},debtRatio:{type:'number',description:'% PIB'},deficit:{type:'number',description:'Md€'},deficitRatio:{type:'number',description:'% PIB'},unemployment:{type:'number',description:'%'}}};
  const ok={type:'object',additionalProperties:false,required:['status','schemaVersion','engineVersion','buildId','scenario','selectedYear','results','limitations'],properties:{status:{const:'completed'},schemaVersion:{const:'1.0'},engineVersion:{type:'string'},buildId:{type:'string'},scenario:{$ref:'#/components/schemas/Scenario'},selectedYear:{type:'integer'},results:{type:'object',required:['baseline','scenario'],properties:{baseline:{type:'array',items:{$ref:'#/components/schemas/ProjectionPoint'}},scenario:{type:'array',items:{$ref:'#/components/schemas/ProjectionPoint'}}}},limitations:{type:'array',items:{type:'string'}}}};
  const openapi={openapi:'3.1.0',info:{title:'EcoSim France — API de simulation (prototype inactif)',version:'1.0.0-draft',
      description:'CONTRAT EXPÉRIMENTAL — aucun service HTTP public actif sur GitHub Pages. Simulations économiques exploratoires, pas des prévisions certifiées. Entrée : tous les paramètres de scénario du simulateur; sortie : calcul réel du moteur de référence.'},
    'x-ecosim-status':'SPECIFICATION_ONLY_NOT_DEPLOYED',
    'x-ecosim-source-version':D.metadata.version,
    tags:[{name:'Simulation',description:'Non disponible en production'},{name:'Documentation',description:'Disponible dans le prototype local uniquement'}],
    paths:{
      '/v1/simulations':{post:{tags:['Simulation'],summary:'Soumettre un scénario et calculer une projection',description:'Endpoint spécifié, non déployé. Utilisable localement en test explicite seulement.',operationId:'simulateScenario',requestBody:{required:true,content:{'application/json':{schema:{$ref:'#/components/schemas/SimulationRequest'}}}},responses:{'200':{description:'Simulation calculée',content:{'application/json':{schema:{$ref:'#/components/schemas/SimulationResponse'}}}},'400':{description:'JSON illisible',content:{'application/json':{schema:{$ref:'#/components/schemas/ErrorResponse'}}}},'413':{description:'Corps dépassant 2 Mo',content:{'application/json':{schema:{$ref:'#/components/schemas/ErrorResponse'}}}},'422':{description:'Scénario invalide',content:{'application/json':{schema:{$ref:'#/components/schemas/ErrorResponse'}}}}}}},
      '/v1/metadata':{get:{tags:['Documentation'],summary:'Version et périmètre',responses:{'200':{description:'Métadonnées du moteur'}}}},
      '/v1/schema':{get:{tags:['Documentation'],summary:'Schéma de scénario',responses:{'200':{description:'JSON Schema complet des critères'}}}},
      '/openapi.json':{get:{tags:['Documentation'],summary:'Document OpenAPI 3.1',responses:{'200':{description:'Contrat'}}}}
    },components:{schemas:{Scenario:scenario,SimulationRequest:req,SimulationResponse:ok,ProjectionPoint:point,ErrorResponse:err}}};
  return {scenarioSchema,openapi,counts:{budget:all.length,structural:Object.keys(D.structural.controls).length,engines:Object.keys(D.policyEngines.controls).length,fiscal:Object.keys(F.controls).length,sectoral:Object.keys(S.sectors).length,projectionYears:D.metadata.projectionYears}};
}
export function saveSpecs(root){
  const {scenarioSchema,openapi,counts}=produceSpecifications(root);
  const target=path.join(root,'dist','api-spec');fs.mkdirSync(target,{recursive:true});
  fs.writeFileSync(path.join(target,'scenario-590.schema.json'),JSON.stringify(scenarioSchema,null,2)+'\n');
  fs.writeFileSync(path.join(target,'openapi-590.json'),JSON.stringify(openapi,null,2)+'\n');
  return counts;
}
