/** Résumé descriptif des écarts réellement produits par OpenFisca. Aucune concordance sans calcul externe. */
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
function stats(rows,key){const abs=rows.map(x=>Math.abs(x[key]));return {
 maxAbsolute:Math.max(...abs),meanAbsolute:abs.reduce((a,b)=>a+b,0)/abs.length,
 rootMeanSquare:Math.sqrt(rows.reduce((s,x)=>s+x[key]**2,0)/rows.length),
 withinOneEuro:abs.filter(x=>x<=1).length,withinTenEuro:abs.filter(x=>x<=10).length,
};}
export function describe(report){
 if(report.source!=='openfisca-france'||!report.packageVersion||report.count!==56||report.rows.length!==56)throw Error('56 cas OpenFisca alignés requis');
 return {source:'openfisca-france',packageVersion:report.packageVersion,scope:'Écarts descriptifs entre calculs intermédiaires alignés ; pas un avis fiscal complet',count:report.count,
  gross:stats(report.rows,'deltaGross'),afterDecote:stats(report.rows,'deltaAfterDecote'),
  warnings:['Ne pas traiter un écart nul comme preuve de représentativité nationale','Un écart non nul peut provenir de règles spécifiques ou d arrondis non modélisés','Vérifier les conventions rni et nbptr injectées'],
 };
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [source,dest]=process.argv.slice(2);if(!source||!dest)throw Error('Usage node scripts/auditer-ecarts-571.mjs rapport-ecarts.json résumé.json');
 fs.writeFileSync(dest,JSON.stringify(describe(JSON.parse(fs.readFileSync(source,'utf8'))),null,2)+'\n');
 console.log('Résumé des 56 cas réels :',dest);
}
