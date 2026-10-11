#!/usr/bin/env python3
"""OpenFisca 5.7.2: produire une sortie réelle, traçable et NON validée.

Aucun résultat fiscal n'est écrit en cas d'erreur ou si OpenFisca est absent.
Les variables intermédiaires rni/nbptr/nbF sont forcées pour circonscrire
la confrontation; le résultat n'est ni un avis fiscal ni un calcul national.
"""
import argparse
import hashlib
import importlib.metadata
import json
import math
import pathlib
import platform
import sys
from datetime import datetime, timezone

EXPECTED_VARIABLES = ('rni', 'nbptr', 'nbF', 'maries_ou_pacses',
                      'celibataire_ou_divorce', 'ir_brut', 'ir_plaf_qf', 'decote')


def validate_cases(payload):
    if not isinstance(payload, dict) or payload.get('incomeYear') != 2025 or payload.get('taxYear') != 2026:
        raise ValueError('Période attendue : revenus 2025, barème 2026')
    cases = payload.get('cases')
    if not isinstance(cases, list) or len(cases) != 56:
        raise ValueError('Le jeu de référence doit avoir exactement 56 cas')
    seen = set()
    for case in cases:
        if not isinstance(case, dict):
            raise ValueError('Cas non objet')
        key = case.get('id')
        if not isinstance(key, str) or not key or key in seen:
            raise ValueError('ID vide ou dupliqué')
        seen.add(key)
        if case.get('householdType') not in ('single', 'couple'):
            raise ValueError(f'{key}: type de foyer invalide')
        children = case.get('children')
        if type(children) is not int or children not in (0, 1, 2, 3):
            raise ValueError(f'{key}: nombre d enfants invalide')
        income = case.get('netTaxableIncome')
        if (type(income) not in (int, float) or not math.isfinite(income)
                or income < 0 or income > 100_000_000):
            raise ValueError(f'{key}: revenu invalide')
    return cases


def parts(case):
    kids = case['children']
    return (2 if case['householdType'] == 'couple' else 1) + min(kids, 2) * 0.5 + max(0, kids - 2)


def populate(system, case):
    from openfisca_core.simulations import SimulationBuilder
    simulation = SimulationBuilder.build_default_simulation(system, 1)
    values = {
        'rni': float(case['netTaxableIncome']),
        'nbptr': float(parts(case)),
        'maries_ou_pacses': case['householdType'] == 'couple',
        'celibataire_ou_divorce': case['householdType'] == 'single',
        'nbF': case['children'],
    }
    for name, value in values.items():
        simulation.set_input(name, '2025', value)
    return simulation, values


def compute(payload, version, input_sha256):
    from openfisca_france import FranceTaxBenefitSystem
    system = FranceTaxBenefitSystem()
    missing = sorted(set(EXPECTED_VARIABLES) - set(system.variables))
    if missing:
        raise RuntimeError(f'Variables absentes de la version OpenFisca {version}: {missing}')
    rows = []
    for case in validate_cases(payload):
        simulation, values = populate(system, case)
        def value(name):
            result = float(simulation.calculate(name, '2025')[0])
            if not math.isfinite(result):
                raise ArithmeticError(f'{case["id"]}: {name} non fini')
            return result
        gross_before = value('ir_brut')
        gross_after = value('ir_plaf_qf')
        decote = value('decote')
        if gross_after < -1e-5 or decote < -1e-5:
            raise ArithmeticError(f'{case["id"]}: IR/décote négatif inexpliqué')
        after = max(0.0, gross_after - decote)
        rows.append({
            'id': case['id'],
            'householdType': case['householdType'],
            'children': case['children'],
            'netTaxableIncome': case['netTaxableIncome'],
            'openfiscaIrBrut': gross_before,
            'grossAfterFamilyCap': gross_after,
            'openfiscaDecote': decote,
            'afterDecote': after,
            'overrides': values,
        })
    return {
        'source': 'openfisca-france',
        'schemaVersion': '5.7.2',
        'execution': 'python_openfisca_direct',
        'status': 'calcule_non_revu',
        'packageVersion': version,
        'period': '2025',
        'incomeYear': 2025,
        'taxYearEcoSim': 2026,
        'generatedUTC': datetime.now(timezone.utc).isoformat(),
        'inputFileSHA256': input_sha256,
        'environment': {'python': platform.python_version(), 'intermediateInputs': 'rni_nbptr_nbF_forces'},
        'semantics': 'ir_plaf_qf et max(0, ir_plaf_qf - decote); variables intermédiaires forcées; vérification temporelle et fiscale manuelle requise',
        'cases': rows,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--cases', required=True, type=pathlib.Path)
    parser.add_argument('--out', required=True, type=pathlib.Path)
    parser.add_argument('--check-prerequisites', action='store_true')
    args = parser.parse_args()
    contents = args.cases.read_bytes()
    payload = json.loads(contents)
    cases = validate_cases(payload)
    try:
        version = importlib.metadata.version('openfisca-france')
        import openfisca_france  # noqa: F401 — vérification effective du module
    except (ImportError, importlib.metadata.PackageNotFoundError):
        print('OpenFisca-France indisponible : aucune comparaison réalisée.', file=sys.stderr)
        return 3
    if args.check_prerequisites:
        print(f'OpenFisca-France {version} disponible ; {len(cases)} cas conformes.')
        return 0
    report = compute(payload, version, hashlib.sha256(contents).hexdigest())
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(report, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
    print(f'OpenFisca exécuté : {len(report["cases"])} cas, version {version} ; résultat NON REVU dans {args.out}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
