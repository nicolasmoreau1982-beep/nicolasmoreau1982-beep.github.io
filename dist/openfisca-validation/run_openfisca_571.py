#!/usr/bin/env python3
"""Calcule des références OpenFisca réellement exécutées. Aucune donnée OpenFisca simulée.

Usage dans un environnement disposant du paquet externe :
 python openfisca-validation/run_openfisca_571.py \
  --cases validation/fiscal-individuel-570.json --out comparaison-openfisca-571.json

Les entrées fiscales rni/nbptr et la composition sont forcées pour reproduire
le périmètre EcoSim. Ce n'est pas une simulation de déclaration fiscale complète.
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


REQUIRED_VARS = ('rni', 'nbptr', 'ir_brut', 'ir_plaf_qf', 'decote')


def validate_cases(payload):
    assert payload['incomeYear'] == 2025 and payload['taxYear'] == 2026
    ids = set()
    for c in payload['cases']:
        if c['id'] in ids:
            raise ValueError('Duplicate case ID')
        ids.add(c['id'])
        if c['householdType'] not in ('single', 'couple') or c['children'] not in (0,1,2,3):
            raise ValueError('Unsupported household structure')
        if not isinstance(c['netTaxableIncome'], (int, float)) or not math.isfinite(c['netTaxableIncome']):
            raise ValueError('Invalid income')
    return payload['cases']


def populate(tbs, case, date):
    """Build a 1-foyer simulation; override named inputs at the same fiscal period.

    We set the *intermediate* rni and nbptr to make comparison to EcoSim possible.
    This bypasses upstream salary deductions and special family status. Calculations
    remain OpenFisca code, not numbers copied from EcoSim.
    """
    from openfisca_core.simulations import SimulationBuilder

    sim = SimulationBuilder.build_default_simulation(tbs, 1)
    years = date
    kids = int(case['children'])
    expected_parts = (2 if case['householdType'] == 'couple' else 1) + min(kids,2)*.5 + max(0,kids-2)
    values = {
        'rni': float(case['netTaxableIncome']),
        'nbptr': float(expected_parts),
        'maries_ou_pacses': case['householdType'] == 'couple',
        'celibataire_ou_divorce': case['householdType'] == 'single',
        'nbF': kids,
    }
    for variable, value in values.items():
        sim.set_input(variable, years, value)
    return sim, values


def compute(payload, version, output_file):
    from openfisca_france import FranceTaxBenefitSystem
    tbs = FranceTaxBenefitSystem()
    missing = sorted(set(REQUIRED_VARS) - set(tbs.variables))
    if missing:
        raise RuntimeError('OpenFisca package incompatible: missing vars '+repr(missing))
    rows = []
    for case in validate_cases(payload):
        sim, inputs = populate(tbs, case, '2025')
        def calc(name):
            value = float(sim.calculate(name, '2025')[0])
            if not math.isfinite(value):
                raise ArithmeticError(f'{case["id"]}: {name} not finite')
            return value
        ir_brut, ir_plaf_qf, decote = (calc(k) for k in ('ir_brut','ir_plaf_qf','decote'))
        # OpenFisca's 'decote' is an intermediate tax benefit (normally >=0).
        after = max(0.0, ir_plaf_qf - decote)
        rows.append({
            'id':case['id'], 'netTaxableIncome':case['netTaxableIncome'],
            'householdType':case['householdType'],'children':case['children'],
            'grossAfterFamilyCap':ir_plaf_qf,'afterDecote':after,
            'openfiscaIrBrut':ir_brut, 'openfiscaDecote':decote,
            'overrides':inputs,
        })
    content = {'source':'openfisca-france','packageVersion':version,'period':'2025',
        'generatedUTC':datetime.now(timezone.utc).isoformat(),
        'environment': {'python':platform.python_version(),'mode':'rni_et_nbptr_injectes'},
        'semantics': 'ir_plaf_qf et ir_plaf_qf - decote, sans autres réductions/crédits ; revenus de référence rni et parts injectés directement',
        'inputSHA256':hashlib.sha256(json.dumps(payload,sort_keys=True).encode()).hexdigest(),
        'cases':rows}
    output_file.parent.mkdir(parents=True,exist_ok=True)
    output_file.write_text(json.dumps(content,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
    return content


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--cases',required=True,type=pathlib.Path)
    p.add_argument('--out',required=True,type=pathlib.Path)
    p.add_argument('--check-prerequisites',action='store_true')
    a=p.parse_args()
    payload=json.loads(a.cases.read_text(encoding='utf-8'))
    cases=validate_cases(payload)
    if a.check_prerequisites:
        try:
            import openfisca_france
            v=importlib.metadata.version('openfisca-france')
        except (ImportError,importlib.metadata.PackageNotFoundError) as e:
            print('OpenFisca indisponible : aucune comparaison réalisée.',file=sys.stderr)
            return 3
        print('OpenFisca',v,'ready; cases:',len(cases))
        return 0
    try:
        version=importlib.metadata.version('openfisca-france')
        out=compute(payload, version, a.out)
    except (ImportError,importlib.metadata.PackageNotFoundError) as e:
        print('OpenFisca non installé ; aucun résultat ne sera produit.',file=sys.stderr)
        return 3
    print(f'Comparaison OpenFisca calculée : {len(out["cases"])} cas, paquet {version}; sortie {a.out}')
    return 0

if __name__ == '__main__':
    sys.exit(main())
