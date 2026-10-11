/* EcoSim : figer les trois tableaux importants de l'audit dans le HTML de distribution.
 * Exécuter après avoir construit dist/history.js et dist/historical-audit-data.js.
 * Le JS de la page conserve sa capacité à changer les sélections ensuite.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
globalThis.window = globalThis;
require(path.join(root, 'dist/history.js'));
require(path.join(root, 'dist/historical-audit-data.js'));
const history = globalThis.ECOSIM_HISTORY;
const data = globalThis.ECOSIM_HISTORICAL_AUDIT;
const format = (x, decimals=2) => Number(x).toLocaleString('fr-FR',{minimumFractionDigits:decimals,maximumFractionDigits:decimals});
const signed = (x, decimals=2) => `${x>0?'+':x<0?'−':''}${format(Math.abs(x),decimals)}`;
const esc = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const cell = (tag, text) => `<${tag}>${esc(text)}</${tag}>`;
const backtest = history.horizons.map(h => {
 const r=history.report[h];
 return `<tr><th scope="row">${h} an${h>1?'s':''}</th>${cell('td',r.n)}${['gdpPct','deficitRatio','debtRatio','unemployment'].map(m=>cell('td',`${format(r.metrics[m].mae)} / ${format(r.metrics[m].p80)}`)).join('')}</tr>`;
}).join('\n');
const test=data.comparableInsee.cases[0];
const cr=test.rows[0];
const metrics=[
 ['PIB nominal',cr.observed.gdp,cr.predicted.gdp,cr.error.gdpPct,'Md€','% du PIB observé'],
 ['Dépenses',cr.observed.spending,cr.predicted.spending,cr.error.spendingBn,'Md€','Md€'],
 ['Recettes',cr.observed.revenue,cr.predicted.revenue,cr.error.revenueBn,'Md€','Md€'],
 ['Déficit / PIB',cr.observed.deficit/cr.observed.gdp*100,cr.predicted.deficit/cr.predicted.gdp*100,cr.error.deficitRatio,'%','pt'],
 ['Dette / PIB',cr.observed.debt/cr.observed.gdp*100,cr.predicted.debt/cr.predicted.gdp*100,cr.error.debtRatio,'%','pt'],
];
const comparable=metrics.map(([name,observed,predicted,error,unit,errorUnit])=>`<tr><th scope="row">${esc(name)}</th>${cell('td',`${format(observed,1)} ${unit}`)}${cell('td',`${format(predicted,1)} ${unit}`)}${cell('td',`${signed(error)} ${errorUnit}`)}</tr>`).join('\n');
const trajectory=data.trajectories.find(x=>x.originYear===2020);
const yearly=trajectory.annual.map(row=>{
 const metric='deficitRatio';const observed=row.observed[metric];const simulated=row.prediction[metric]; const diff=row.error[metric];
 return `<tr><th scope="row">${row.year}</th>${cell('td',`${format(observed,1)} pt`)}${cell('td',`${format(simulated,1)} pt`)}${cell('td',`${signed(diff,1)} pt`)}</tr>`;
}).join('\n');
const file=path.join(root,'dist/audit.html');
let page=fs.readFileSync(file,'utf8');
for (const [id,markup] of [['backtest-body',backtest],['audit-comparable-results',comparable],['audit-year-body',yearly]]) {
  const re=new RegExp(`(<tbody id="${id}">)[\\s\\S]*?(<\\/tbody>)`);
  if(!re.test(page)) throw new Error(`tbody ${id} introuvable`);
  page=page.replace(re,`$1\n${markup}\n$2`);
}
page=page.replace('Activez JavaScript pour recalculer le tableau à partir de', 'Les chiffres ci-dessus sont figés dans le HTML. Activez JavaScript pour modifier les sélections, ou consultez');
page=page.replace('<tbody id="audit-comparable-results">', '<tbody id="audit-comparable-results">');
if (!page.includes('Tableau initial statique (départ 2020')) {
  page=page.replace('<p id="audit-year-summary"', '<noscript><p class="audit-caption">Tableau initial statique (départ 2020, indicateur déficit / PIB). JavaScript permet de changer l’année et l’indicateur.</p></noscript>\n          <p id="audit-year-summary"');
}
if (!page.includes('Cas initial figé dans le HTML')) {
  page=page.replace('<p id="audit-comparable-summary"', '<noscript><p class="audit-caption">Cas initial figé dans le HTML. Activez JavaScript pour changer de mesure et d’année.</p></noscript>\n          <p id="audit-comparable-summary"');
}
fs.writeFileSync(file,page);
console.log('Audit pré-rendu :',Object.fromEntries([['backtest',history.horizons.length],['comparable',metrics.length],['annual',trajectory.annual.length]]));
