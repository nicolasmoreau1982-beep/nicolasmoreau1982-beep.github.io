/**
 * EcoSim 5.7.2. Contrôle les résultats externes produits par le véritable outil
 * avant d'émettre des écarts descriptifs. Le fichier JSON ne prouve PAS, à lui
 * seul, l'authenticité de l'exécution ni l'équivalence des années fiscales.
 *
 * CLI : node scripts/verifier-openfisca-572.mjs reference.json sortie-openfisca.json rapport.json
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const finite = n => typeof n === 'number' && Number.isFinite(n);
const insist = (condition, message) => { if (!condition) throw new Error(message); };
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const EPS = 1e-4;
const p95 = values => values[Math.ceil(0.95 * values.length) - 1];

function measures(rows, name) {
  const diffs = rows.map(row => row[name]);
  const absolute = diffs.map(Math.abs).sort((a, b) => a - b);
  return {
    meanAbsoluteEuro: absolute.reduce((sum, x) => sum + x, 0) / absolute.length,
    rootMeanSquareEuro: Math.sqrt(diffs.reduce((sum, x) => sum + x * x, 0) / diffs.length),
    medianAbsoluteEuro: absolute[Math.floor((absolute.length - 1) / 2)],
    percentile95AbsoluteEuro: p95(absolute),
    maximumAbsoluteEuro: absolute[absolute.length - 1],
    casesAboveOneEuro: absolute.filter(x => x > 1).length,
    casesAboveTenEuro: absolute.filter(x => x > 10).length,
  };
}

export function verify(reference, external, referenceBytes) {
  insist(reference?.incomeYear === 2025 && reference?.taxYear === 2026 &&
    Array.isArray(reference.cases) && reference.cases.length === 56,
  'Référence EcoSim invalide : 56 foyers, revenu 2025 / impôt 2026 attendus');
  insist(external?.source === 'openfisca-france' && external?.schemaVersion === '5.7.2' &&
    external?.execution === 'python_openfisca_direct' && external?.status === 'calcule_non_revu' &&
    external?.period === '2025' && external?.incomeYear === 2025 && external?.taxYearEcoSim === 2026 &&
    /^\d+(\.\d+){1,3}(?:[.+-][\w.-]+)?$/.test(external?.packageVersion ?? ''),
  'Métadonnées OpenFisca invalides (aucune preuve d exécution acceptée)');
  insist(typeof external.generatedUTC === 'string' && !Number.isNaN(Date.parse(external.generatedUTC)),
    'Horodatage externe absent');
  insist(Buffer.isBuffer(referenceBytes) && external.inputFileSHA256 === sha256(referenceBytes),
    'Empreinte SHA-256 du jeu de cas différente : versions non alignées');
  insist(Array.isArray(external.cases) && external.cases.length === 56,
    'Lot OpenFisca incomplet : 56 résultats exigés');
  const baseline = new Map();
  for (const original of reference.cases) {
    insist(typeof original.id === 'string' && !baseline.has(original.id), 'Référence à identifiants dupliqués');
    insist(finite(original.grossAfterFamilyCap) && finite(original.afterDecote), 'Référence EcoSim invalide');
    baseline.set(original.id, original);
  }
  const seen = new Set();
  const rows = [];
  for (const result of external.cases) {
    insist(typeof result?.id === 'string' && baseline.has(result.id) && !seen.has(result.id),
      'Cas OpenFisca absent de la référence ou dupliqué');
    seen.add(result.id);
    const expected = baseline.get(result.id);
    insist(result.householdType === expected.householdType &&
      result.children === expected.children && result.netTaxableIncome === expected.netTaxableIncome,
    `${result.id} : configuration fiscale divergente`);
    const baseParts = expected.householdType === 'couple' ? 2 : 1;
    const extraParts = Math.min(expected.children, 2) * 0.5 + Math.max(0, expected.children - 2);
    const overrides = result.overrides;
    insist(overrides && overrides.rni === expected.netTaxableIncome &&
      overrides.nbptr === baseParts + extraParts && overrides.nbF === expected.children &&
      overrides.maries_ou_pacses === (expected.householdType === 'couple') &&
      overrides.celibataire_ou_divorce === (expected.householdType === 'single'),
    `${result.id} : valeurs OpenFisca intermédiaires non alignées`);
    for (const field of ['openfiscaIrBrut', 'grossAfterFamilyCap', 'openfiscaDecote', 'afterDecote']) {
      insist(finite(result[field]), `${result.id} : montant externe non fini ${field}`);
    }
    insist(result.grossAfterFamilyCap >= -EPS && result.openfiscaDecote >= -EPS &&
      Math.abs(result.afterDecote - Math.max(0, result.grossAfterFamilyCap - result.openfiscaDecote)) < EPS,
    `${result.id} : décote incohérente`);
    rows.push({
      id: result.id, householdType: result.householdType, children: result.children,
      netTaxableIncome: result.netTaxableIncome,
      ecoGross: expected.grossAfterFamilyCap, openFiscaGross: result.grossAfterFamilyCap,
      deltaGross: expected.grossAfterFamilyCap - result.grossAfterFamilyCap,
      ecoAfterDecote: expected.afterDecote, openFiscaAfterDecote: result.afterDecote,
      deltaAfterDecote: expected.afterDecote - result.afterDecote,
    });
  }
  insist(seen.size === baseline.size, 'Confrontation incomplète');
  rows.sort((a, b) => a.id.localeCompare(b.id));
  const groups = [];
  for (const householdType of ['single', 'couple']) {
    for (const children of [0, 1, 2, 3]) {
      const subset = rows.filter(row => row.householdType === householdType && row.children === children);
      insist(subset.length === 7, 'Structure 2 × 4 × 7 des cas altérée');
      groups.push({ householdType, children, count: subset.length,
        gross: measures(subset, 'deltaGross'), afterDecote: measures(subset, 'deltaAfterDecote') });
    }
  }
  const worstCases = [...rows].sort((a, b) => Math.abs(b.deltaAfterDecote) - Math.abs(a.deltaAfterDecote)).slice(0, 10);
  return {
    version: '5.7.2', status: 'comparaison_calculée_à_revoir',
    source: external.source, packageVersion: external.packageVersion,
    period: external.period, inputFileSHA256: external.inputFileSHA256,
    generatedUTC: external.generatedUTC, count: rows.length,
    gross: measures(rows, 'deltaGross'), afterDecote: measures(rows, 'deltaAfterDecote'),
    groups, worstCases, rows,
    warnings: [
      'Le JSON ne constitue pas une preuve indépendante que le paquet officiel a été exécuté : conserver le journal GitHub Actions ou local.',
      'La période 2025 d OpenFisca et le barème EcoSim de déclaration 2026 sur revenus 2025 doivent être rapprochés manuellement.',
      'L injection directe de rni/nbptr/nbF ne simule pas un foyer déclaré complet.',
      'Même des écarts nuls ne valident ni les revenus réels, ni la représentativité nationale, ni les effets macroéconomiques.',
      'Les écarts positifs désignent EcoSim moins OpenFisca ; valeurs sans arrondis réglementaires propres aux déclarations.',
    ],
  };
}

const scriptFile = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === scriptFile) {
  const [referenceFile, outputFile, reportFile] = process.argv.slice(2);
  if (!referenceFile || !outputFile || !reportFile) {
    console.error('Usage : node scripts/verifier-openfisca-572.mjs reference.json sortie-openfisca.json rapport.json');
    process.exitCode = 2;
  } else {
    try {
      const bytes = fs.readFileSync(referenceFile);
      const report = verify(JSON.parse(bytes), JSON.parse(fs.readFileSync(outputFile)), bytes);
      fs.writeFileSync(reportFile, JSON.stringify(report, null, 2) + '\n');
      console.log('56 cas confrontés. Écarts absolus moyens après décote :', report.afterDecote.meanAbsoluteEuro.toFixed(2),
        'EUR. EXAMEN HUMAIN REQUIS. Rapport :', reportFile);
    } catch (error) {
      console.error('ÉCHEC de validation de la provenance et/ou du périmètre :', error.message);
      process.exitCode = 1;
    }
  }
}
