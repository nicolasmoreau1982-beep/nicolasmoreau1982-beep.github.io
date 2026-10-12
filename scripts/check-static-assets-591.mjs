/* EcoSim — vérification des références locales <script src> et <link href>.
 * S'exécute sur les sources statiques de dist/ (sans dépendance npm).
 * N'exécute aucun script du navigateur et ne contacte aucun service externe.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(projectRoot, 'dist');
const errors = [];
let checked = 0;
let pages = 0;

if (!existsSync(distDir)) {
  console.error('ERREUR : dossier dist/ introuvable :', distDir);
  process.exit(1);
}
// Parcours explicite pour éviter toute dépendance externe.
const htmlPaths = [];
const directories = [distDir];
while (directories.length) {
  const directory = directories.pop();
  for (const item of readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, item.name);
    if (item.isDirectory()) directories.push(full);
    else if (item.isFile() && item.name.toLowerCase().endsWith('.html')) htmlPaths.push(full);
  }
}

for (const htmlPath of htmlPaths.sort()) {
  pages++;
  const html = readFileSync(htmlPath, 'utf8');
  const elements = html.match(/<(?:script|link)\b[^>]*>/gi) ?? [];
  for (const tag of elements) {
    const isScript = /^<script\b/i.test(tag);
    const attr = isScript ? 'src' : 'href';
    if (!isScript && !/\brel\s*=\s*["']?\s*(?:stylesheet|icon|apple-touch-icon|manifest|preload|modulepreload)\b/i.test(tag)) continue;
    const match = tag.match(new RegExp('\\b' + attr + '\\s*=\\s*(["\\\'])(.*?)\\1', 'i'));
    if (!match) continue;
    const ref = match[2].replaceAll('&amp;', '&').trim();
    if (!ref || /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(ref)) continue;
    let decoded;
    try { decoded = decodeURIComponent(ref.split(/[?#]/, 1)[0]); }
    catch { errors.push(`${path.relative(projectRoot, htmlPath)} : URI invalide ${ref}`); continue; }
    const relPath = decoded.startsWith('/') ? decoded.slice(1) : decoded;
    const target = path.resolve(decoded.startsWith('/') ? distDir : path.dirname(htmlPath), relPath);
    const filePath = path.relative(distDir, target);
    if (filePath.startsWith('..') || path.isAbsolute(filePath)) {
      errors.push(`${path.relative(projectRoot, htmlPath)} : référence hors de dist/ : ${ref}`);
    } else if (!existsSync(target) || !statSync(target).isFile()) {
      errors.push(`${path.relative(projectRoot, htmlPath)} : ressource absente : ${ref}`);
    }
    checked++;
  }
}
if (errors.length) {
  console.error(`ECHEC : ${errors.length} référence(s) absente(s) sur ${pages} page(s) HTML :`);
  for (const error of errors) console.error('  -', error);
  process.exit(1);
}
console.log(`OK : ${checked} références de ressources locales sur ${pages} page(s) HTML.`);
