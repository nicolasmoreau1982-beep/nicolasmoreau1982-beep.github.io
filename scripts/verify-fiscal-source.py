"""Vérifie la transcription du tableau Insee 3.217 (réseau requis, aucune écriture)."""

import importlib.util
import json
from pathlib import Path
import hashlib
import xlrd

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("insee_import", ROOT / "scripts/import-insee-observations.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
archive = json.loads((ROOT / "research/fiscal-history.json").read_text(encoding="utf-8"))
snapshot = archive["insee"]
raw = module.download(snapshot["sourceFile"])
digest = hashlib.sha256(raw).hexdigest()
if digest != snapshot["sourceSha256"]:
    raise SystemExit(f"Classeur Insee révisé : SHA256 {digest} ; inspecter avant mise à jour")
sheet = module.read_xlsx_sheet(raw)
year_columns = {int(value): column for column, value in sheet[3].items() if value.isdigit()}
mapping = {"irBeforeCreditsBn": 75, "irCreditsDeductedBn": 76,
           "irCreditsRefundedBn": 77, "wealthTaxBn": 88, "inheritanceBn": 95}
for row in snapshot["rows"]:
    column = year_columns[row["year"]]
    for key, line in mapping.items():
        value = abs(float(sheet[line][column])) if "Credits" in key else float(sheet[line][column])
        if abs(value - row[key]) > 0.000001:
            raise SystemExit(f"Écart Insee {row['year']} {key}: classeur={value}, archive={row[key]}")
print(f"Insee 3.217 : SHA256 et {len(snapshot['rows']) * len(mapping)} valeurs archivées vérifiés.")

wealth = archive["dgfipWealthTax"]
raw = module.download(wealth["sourceFile"])
digest = hashlib.sha256(raw).hexdigest()
if digest != wealth["sourceSha256"]:
    raise SystemExit(f"Classeur IFI DGFiP révisé : SHA256 {digest} ; inspecter avant mise à jour")
book = xlrd.open_workbook(file_contents=raw)
for row in wealth["rows"]:
    sheet = book.sheet_by_name(f"a{row['year']}")
    for index, stored in enumerate(row["bins"], 3):
        actual = [sheet.cell_value(index, column) for column in (4, 5, 6)]
        if any(abs(a - b) > 0.000001 for a, b in zip(actual, stored)):
            raise SystemExit(f"Écart IFI DGFiP {row['year']} tranche {index - 1}")
print(f"IFI DGFiP : SHA256 et {len(wealth['rows']) * 4 * 3} valeurs archivées vérifiés.")
