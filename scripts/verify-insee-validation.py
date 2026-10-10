"""Vérifie sans écrire le gel Insee utilisé par le banc comparable.

Usage : python3 scripts/verify-insee-validation.py
La vérification télécharge quatre classeurs officiels ; le banc local reste
exécutable hors réseau à partir du JSON déjà figé.
"""

from __future__ import annotations

import hashlib
import importlib.util
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SNAPSHOT = json.loads((ROOT / "research/insee-validation-annual.json").read_text(encoding="utf-8"))
SPEC = importlib.util.spec_from_file_location("insee_import", ROOT / "scripts/import-insee-observations.py")
IMPORTER = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(IMPORTER)


def year_columns(sheet: dict[int, dict[str, str]], header: int) -> dict[int, str]:
    return {int(value): column for column, value in sheet[header].items()
            if re.fullmatch(r"\d{4}", value)}


def almost(actual: float, archived: float, label: str, tolerance: float = 0.00011) -> None:
    if abs(actual - archived) > tolerance:
        raise ValueError(f"{label}: classeur {actual} ; archive {archived}")


def main() -> None:
    raw = {}
    for name, source in SNAPSHOT["sources"].items():
        if "file" not in source:
            continue
        data = IMPORTER.download(source["file"])
        digest = hashlib.sha256(data).hexdigest()
        if digest != source["sha256"]:
            raise ValueError(f"{name}: classeur révisé (SHA256 {digest}) ; inspecter avant de regeler")
        raw[name] = data

    gdp_nominal = IMPORTER.read_xlsx_sheet(raw["gdp"])
    gdp_volume = IMPORTER.read_xlsx_sheet(raw["gdp"], 3)
    accounts = IMPORTER.read_xlsx_sheet(raw["accounts"])
    debt = IMPORTER.read_xlsx_sheet(raw["debt"], 2)
    bridge = IMPORTER.read_xlsx_sheet(raw["stockFlow"])
    if gdp_nominal[7].get("A") != "B1GQ" or gdp_volume[7].get("A") != "B1GQ":
        raise ValueError("Ligne PIB modifiée")
    if accounts[27].get("B") != "Total des dépenses" or accounts[58].get("B") != "Total des recettes":
        raise ValueError("Lignes du tableau Insee 3.201 modifiées")
    if debt[7].get("A") != "S13" or "Variation de la dette" not in bridge[28].get("B", ""):
        raise ValueError("Périmètre dette/ajustement stock-flux modifié")
    gdp_columns = year_columns(gdp_nominal, 4)
    volume_columns = year_columns(gdp_volume, 4)
    account_columns = year_columns(accounts, 3)
    debt_columns = year_columns(debt, 4)
    bridge_columns = year_columns(bridge, 3)

    rows = SNAPSHOT["rows"]
    if [row[0] for row in rows] != list(range(2003, 2026)):
        raise ValueError("Années du gel non continues")
    mismatches = []
    for index, (year, gdp, real_growth, spending, revenue, debt_amount, stock_flow) in enumerate(rows):
        almost(float(gdp_nominal[7][gdp_columns[year]]), gdp, f"{year} PIB", 0.0006)
        volume = float(gdp_volume[7][volume_columns[year]])
        previous_volume = float(gdp_volume[7][volume_columns[year - 1]])
        almost((volume / previous_volume - 1) * 100, real_growth, f"{year} croissance réelle", 0.0006)
        almost(float(accounts[27][account_columns[year]]), spending, f"{year} dépenses")
        almost(float(accounts[58][account_columns[year]]), revenue, f"{year} recettes")
        almost(float(debt[7][debt_columns[year]]), debt_amount, f"{year} dette", 0.0006)
        if year in bridge_columns:
            official = float(bridge[28][bridge_columns[year]]) - float(bridge[5][bridge_columns[year]])
            almost(official, stock_flow, f"{year} ajustement stock-flux", 0.0006)
            residual = debt_amount - rows[index - 1][5] - (spending - revenue) - official
            if abs(residual) > 0.15:
                mismatches.append((year, round(residual, 3)))
        elif stock_flow is not None:
            raise ValueError(f"{year}: ajustement stock-flux non publié ici")
    if len(mismatches) != 1 or mismatches[0][0] != 2014 or abs(mismatches[0][1] + 0.638) > 0.01:
        raise ValueError(f"Discordances inattendues entre classeurs : {mismatches}")
    print(f"Insee : {len(rows)} années, quatre empreintes SHA256 et {len(rows) * 5 + 17} valeurs vérifiées.")
    print(f"Discordance de millésime/comptes non effacée : {mismatches} Md€ (2014).")


if __name__ == "__main__":
    main()
