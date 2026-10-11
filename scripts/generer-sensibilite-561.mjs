/** Campagne isolée par scénario : évite la pression mémoire du harnais VM sur 3×N projections. */
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {execFileSync} from 'node:child_process';
import {CASES,toCsv,toSobolCsv} from './sensibilite-globale-561.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const n=Number(process.env.ECOSIM_SENSITIVITY_N||256),seed=Number(process.env.ECOSIM_SENSITIVITY_SEED||0x5602026),replicates=Number(process.env.ECOSIM_SENSITIVITY_BOOTSTRAP||96);
const reports=[];
for(const item of CASES){
 const code=`import {run,CASES} from './scripts/sensibilite-globale-561.mjs';const s=CASES.find(c=>c.id===${JSON.stringify(item.id)});process.stdout.write(JSON.stringify(run({n:${n},seed:${seed},replicates:${replicates},cases:[s]})));`;
 const raw=execFileSync(process.execPath,['--input-type=module','-e',code],{cwd:ROOT,encoding:'utf8',maxBuffer:16*1024*1024});
 reports.push(JSON.parse(raw));
 console.error('Terminé',item.id,reports.at(-1).tempsSecondes,'s',reports.at(-1).diagnostics);
}
const out={...reports[0],scenarios:reports.flatMap(r=>r.scenarios)};
out.projectionsTotales=reports.reduce((s,r)=>s+r.projectionsTotales,0);
out.tempsSecondes=Number(reports.reduce((s,r)=>s+r.tempsSecondes,0).toFixed(3));
out.secondesParProjection=Number((out.tempsSecondes/out.projectionsTotales).toFixed(6));
out.diagnostics={indicesFinis:reports.reduce((s,r)=>s+r.diagnostics.indicesFinis,0),violationsPremierSuperieurTotal:reports.reduce((s,r)=>s+r.diagnostics.violationsPremierSuperieurTotal,0),facteursStructurellementInactifs:reports.reduce((s,r)=>s+r.diagnostics.facteursStructurellementInactifs,0),maxAbsPremierOrdreInactif:Math.max(...reports.map(r=>r.diagnostics.maxAbsPremierOrdreInactif))};
const d=path.join(ROOT,'dist/validation');fs.mkdirSync(d,{recursive:true});
fs.writeFileSync(path.join(d,'sensibilite-globale-561.json'),JSON.stringify(out,null,2)+'\n');
fs.writeFileSync(path.join(d,'sensibilite-globale-561.csv'),toCsv(out));
fs.writeFileSync(path.join(d,'sensibilite-sobol-561.csv'),toSobolCsv(out));
console.log('Rapport EcoSim 5.6.1 :',out.projectionsTotales,'projections,',out.tempsSecondes,'secondes, diagnostics',out.diagnostics);
