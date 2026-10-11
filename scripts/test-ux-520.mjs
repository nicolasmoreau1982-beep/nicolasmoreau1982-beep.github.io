/** Tests 5.2 : glossaire et liens ; aucune exécution du moteur modifiée. */
import fs from 'node:fs';
import assert from 'node:assert/strict';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const read = (name) => fs.readFileSync(path.join(dist, name), 'utf8');
const html = read('index.html');
const glossary = read('glossaire.html');
const data = JSON.parse(read('data/glossary-520.json'));
const keys = Object.keys(data);
assert.equal(keys.length, 18);
assert.equal(new Set(keys).size, keys.length);
assert.ok(/<html lang="fr">/.test(glossary));
for (const [key, term] of Object.entries(data)) {
  assert.ok(term.title.length > 3 && term.definition.length > 40 && term.example.length > 30, key);
  assert.ok(glossary.includes(`id="${key}"`), `Entrée statique manquante ${key}`);
  assert.ok(glossary.includes(`href="#${key}"`), `Lien d'index manquant ${key}`);
}
assert.ok(html.includes('id="v52-glossary-dialog"'));
assert.ok(html.includes('src="glossary-520.js"'));
assert.ok(html.includes('id="v52-summary"'));
const allIds = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]));
assert.equal(allIds.size, (html.match(/\bid="[^"]+"/g) || []).length, 'Identifiants HTML dupliqués');
for (const [,key] of html.matchAll(/data-glossary="([^"]+)"/g)) assert.ok(data[key], `Mot inconnu ${key}`);
for (const [,anchor] of html.matchAll(/class="v52-quick-grid"[\s\S]*?<\/nav>/g)) { /* quicknav checked separately */ }
for (const target of ['workspace','results','budget','structural','social','engines','politics','fiscal','sectoral-fiscal','qualite-500','methodology']) {
  assert.ok(html.includes(`href="#${target}"`), `Lien rapide manquant ${target}`);
  assert.ok(allIds.has(target), `Cible manquante ${target}`);
}
for (const f of ['glossaire.html','glossary-520.js','data/glossary-520.json']) assert.ok(fs.statSync(path.join(dist,f)).size > 100);
assert.ok(read('sitemap.xml').includes('https://nicolasmoreau1982-beep.github.io/glossaire.html'));
assert.ok(read('data.js').includes('version: "5.6.1"'));
assert.ok(html.includes('Version <span data-ecosim-version>5.6.1</span>'));
const scripts = [...html.matchAll(/<script src="([^"]+)"/g)].map(m=>m[1]);
for (const source of scripts) assert.ok(fs.existsSync(path.join(dist,source)), `Script inexistant ${source}`);
const files = [...html.matchAll(/href="([^"#?]+\.html)(?:#[^"]*)?"/g)].map(m=>m[1]);
for (const f of files) if (!/^(?:https?:|mailto:|\/\/)/i.test(f)) assert.ok(fs.existsSync(path.join(dist,f)),`Lien HTML inexistant ${f}`);
console.log(`UX 5.2 OK : ${keys.length} définitions, ${scripts.length} scripts, navigation et liens internes`);
