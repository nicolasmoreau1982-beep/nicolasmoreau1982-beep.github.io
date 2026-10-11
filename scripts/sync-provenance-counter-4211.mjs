/** Synchronise les compteurs visibles dans le comparateur avec le registre publié.
 * Source: validation/provenance-politique-420.json. Les anciennes preuves non équivalentes
 * ne doivent PAS être présentées comme des valeurs chiffrées officielles.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dir=path.join(root,'dist');
const doc=JSON.parse(fs.readFileSync(path.join(dir,'validation/provenance-politique-420.json'),'utf8'));
const {total, exact, related, unverified}=doc.counts;
if(total!==exact+related+unverified)throw new Error('Comptage non cohérent dans le registre');
const p=path.join(dir,'index.html');
let html=fs.readFileSync(p,'utf8');
const start='<!-- provenance-counter:start -->',end='<!-- provenance-counter:end -->';
const i=html.indexOf(start),j=html.indexOf(end);
if(i<0||j<i)throw Error('Emplacement du compteur introuvable dans index.html');
const summary=`${exact} correspondance${exact===1?'':'s'} chiffrée${exact===1?'':'s'} exacte${exact===1?'':'s'}, ${related} proposition${related===1?'':'s'} reliée${related===1?'':'s'} à une source localisée mais non équivalente${related===1?'':'s'}, ${unverified} hypothèse${unverified===1?'':'s'} sans preuve individuelle.`;
const replacement=`${start}\n          <p class="politics-provenance-status" role="note"><strong>Provenance des ${total} réglages du comparateur : ${related} sur ${total} lié à une proposition localisée, mais aucun montant exact vérifié (${exact}/${total}).</strong> ${summary} <a href="provenance-politique.html">Voir les sources et limites de chaque réglage ↗</a></p>\n          ${end}`;
html=html.slice(0,i)+replacement+html.slice(j+end.length);
fs.writeFileSync(p,html);
console.log(`Compteur politique synchronisé : ${exact} exact / ${related} liés non équivalents / ${unverified} sans preuve individuelle, ${total} au total.`);
