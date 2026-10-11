"""Tests de câblage par faux OpenFisca, et NON une validation numérique OpenFisca.
Le rapport officiel n'est produit que si le vrai paquet est installé et exécuté.
"""
from pathlib import Path
import importlib.util
import json
import sys
sys.dont_write_bytecode = True
import types
from unittest.mock import patch
p=Path(__file__).resolve().parents[1]/'dist/openfisca-validation/run_openfisca_571.py'
spec=importlib.util.spec_from_file_location('openfisca_571',p)
m=importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)
data=json.loads((p.parents[1]/'validation/fiscal-individuel-570.json').read_text())
assert len(m.validate_cases(data))==56
try:
 m.validate_cases({'taxYear':2026,'incomeYear':2025,'cases':[data['cases'][0],data['cases'][0]]})
 raise AssertionError('duplicate accepted')
except ValueError: pass
class FakeSimulation:
 def __init__(self): self.values={}
 def set_input(self,k,period,value): self.values[k]=value
class FakeBuilder:
 @staticmethod
 def build_default_simulation(tbs,count): assert count==1;return FakeSimulation()
sm=types.ModuleType('openfisca_core.simulations');sm.SimulationBuilder=FakeBuilder
pk=types.ModuleType('openfisca_core');pk.simulations=sm
with patch.dict(sys.modules, {'openfisca_core':pk,'openfisca_core.simulations':sm}):
 sim, values=m.populate(None,data['cases'][0],'2025')
 assert values['rni']==data['cases'][0]['netTaxableIncome']
 assert values['nbptr']==1
 assert sim.values['nbF']==0
 sim, values=m.populate(None,{'children':3,'householdType':'couple','netTaxableIncome':60000},'2025')
 assert values['nbptr']==4 and values['maries_ou_pacses'] is True
print('OPENFISCA 5.7.1 : structure, mapping des cas et contrôles locaux OK (stub, non exécution du vrai paquet).')
