import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {saveSpecs} from './schema.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
console.log('Contrat API 5.9 expérimental généré depuis les données du moteur :',saveSpecs(root));
