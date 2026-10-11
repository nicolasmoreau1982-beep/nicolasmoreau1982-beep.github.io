"""Tests contractuels de l'exécuteur 5.7.2, AVEC faux moteur explicitement.
Ces tests ne prouvent aucune concordance numérique avec le vrai OpenFisca.
"""
import importlib.util
import json
import pathlib
import sys
import types
from unittest.mock import patch

sys.dont_write_bytecode = True
base = pathlib.Path(__file__).resolve().parents[1]
p = base / 'dist/openfisca-validation/run_openfisca_572.py'
spec = importlib.util.spec_from_file_location('openfisca_572', p)
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)
payload = json.loads((base/'dist/validation/fiscal-individuel-570.json').read_text())
assert len(m.validate_cases(payload)) == 56
assert m.parts({'children':3,'householdType':'couple'}) == 4
assert m.parts({'children':1,'householdType':'single'}) == 1.5
for update in (
    lambda p: p['cases'].pop(),
    lambda p: p['cases'][0].update(id=p['cases'][1]['id']),
    lambda p: p['cases'][0].update(netTaxableIncome=-2),
    lambda p: p['cases'][0].update(children=True),
    lambda p: p.update(taxYear=2025),
):
    altered = json.loads(json.dumps(payload))
    update(altered)
    try:
        m.validate_cases(altered)
    except ValueError:
        pass
    else:
        raise AssertionError('Cas invalide accepté')

class FakeSimulation:
    def __init__(self):
        self.inputs = {}
    def set_input(self, name, period, value):
        assert period == '2025'
        self.inputs[name] = value

class FakeBuilder:
    @staticmethod
    def build_default_simulation(system, count):
        assert count == 1
        return FakeSimulation()

fake = types.ModuleType('openfisca_core.simulations')
fake.SimulationBuilder = FakeBuilder
base_fake = types.ModuleType('openfisca_core')
base_fake.simulations = fake
with patch.dict(sys.modules, {'openfisca_core':base_fake, 'openfisca_core.simulations':fake}):
    sim, values = m.populate(None, {'netTaxableIncome':45000,'householdType':'couple','children':3})
    assert values == sim.inputs
    assert sim.inputs['nbptr'] == 4
    assert sim.inputs['maries_ou_pacses'] is True
    assert sim.inputs['rni'] == 45000
print('EXÉCUTEUR 5.7.2 : structure, périmètre, 5 rejets et câblage fictif OK (OpenFisca réel non lancé).')
