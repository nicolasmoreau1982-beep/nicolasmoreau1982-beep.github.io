"""Fige les postes par nature du tableau Insee 3.201, sans les confondre avec COFOG.

Usage : python3 scripts/import-insee-annual-nature.py --write
        python3 scripts/import-insee-annual-nature.py --check
Le gel des totaux et son SHA-256 doivent déjà figurer dans
research/insee-validation-annual.json ; un nouveau millésime est refusé.
"""

from __future__ import annotations

import argparse
import hashlib
import importlib.util
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / "research/insee-annual-nature.json"
ANNUAL = ROOT / "research/insee-validation-annual.json"
IMPORTER = ROOT / "scripts/import-insee-observations.py"

SPENDING = {
    "S_P2": (6, "P2"), "S_D1": (7, "D1"), "S_D29": (8, "D29"),
    "S_D4_OTHER": (9, "D4 hors D41"), "S_D5": (10, "D5"),
    "S_D41": (12, "D41"), "S_D62": (16, "D62"), "S_D632": (17, "D632"),
    "S_D3": (18, "D3"), "S_D73": (19, "D73"),
    "S_D7_OTHER": (20, "D7 hors D73"), "S_D9P": (21, "D9p hors D995p"),
    "S_P51G": (24, "P51g"), "S_OTHER_ASSETS": (25, "P52, P53, NP"),
}
REVENUE = {
    "R_P11": (35, "P11"), "R_P12": (36, "P12"), "R_P13": (37, "partie P13"),
    "R_D39": (38, "D39"), "R_D41": (41, "D41"),
    "R_D4_OTHER": (43, "D4 hors D41"), "R_D2": (46, "D2"),
    "R_D5": (47, "D5"), "R_D91": (48, "D91r"), "R_D733": (49, "D733"),
    "R_D61": (50, "D61"), "R_D995": (51, "D995r"),
    "R_D7_OTHER": (55, "D7 hors D73"), "R_D9_OTHER": (56, "D9r hors D91r et D995r"),
}


def load_importer():
    spec = importlib.util.spec_from_file_location("ecosim_insee_importer", IMPORTER)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def build() -> dict:
    frozen = json.loads(ANNUAL.read_text(encoding="utf-8"))
    source = frozen["sources"]["accounts"]
    helper = load_importer()
    workbook = helper.download(source["file"])
    sha256 = hashlib.sha256(workbook).hexdigest()
    if sha256 != source["sha256"]:
        raise ValueError("Le classeur Insee a changé : créer un nouveau millésime avant tout import")
    sheet = helper.read_xlsx_sheet(workbook)
    if "3.201" not in sheet[1].get("A", ""):
        raise ValueError("Structure 3.201 inattendue")
    for index, expected in ((27, "Total des dépenses"), (58, "Total des recettes")):
        if sheet[index].get("B", "").strip() != expected:
            raise ValueError(f"Ligne {index} modifiée : {expected}")
    columns = {int(label): column for column, label in sheet[3].items()
               if label.isdigit() and 2003 <= int(label) <= 2025}
    if sorted(columns) != list(range(2003, 2026)):
        raise ValueError("Années 2003–2025 incomplètes")

    def definitions(mapping):
        return [{"id": key, "code": code, "label": sheet[index]["B"], "sourceRow": index}
                for key, (index, code) in mapping.items()]

    expected_totals = {row[0]: row for row in frozen["rows"]}
    records = []
    for year, column in sorted(columns.items()):
        spending = {key: helper.rounded(sheet[index][column]) for key, (index, _) in SPENDING.items()}
        revenue = {key: helper.rounded(sheet[index][column]) for key, (index, _) in REVENUE.items()}
        total_spending = helper.rounded(sheet[27][column])
        total_revenue = helper.rounded(sheet[58][column])
        if abs(total_spending - expected_totals[year][3]) > 0.00011 or abs(total_revenue - expected_totals[year][4]) > 0.00011:
            raise ValueError(f"Totaux incompatibles avec le gel Insee en {year}")
        spending_residual = round(sum(spending.values()) - total_spending, 4)
        revenue_residual = round(sum(revenue.values()) - total_revenue, 4)
        if max(abs(spending_residual), abs(revenue_residual)) > 0.0011:
            raise ValueError(f"Postes par nature non réconciliés en {year}")
        records.append({"year": year, "spending": spending, "revenue": revenue,
                        "totalSpendingBn": total_spending, "totalRevenueBn": total_revenue,
                        "spendingResidualBn": spending_residual, "revenueResidualBn": revenue_residual})
    return {"status": "revised_2026_observations_not_historical_vintages",
            "sourcePage": source["page"], "sourceFile": source["file"], "sourceSha256": sha256,
            "accountingBase": frozen["accountingBase"], "unit": "Md EUR courants par an",
            "classification": "SEC 2010 transactions by economic nature, not COFOG functions or voted budget missions",
            "warnings": ["Official row labels and codes are kept; parent rows and 'dont' rows are excluded to avoid double counting.",
                         "D2/D5 and D62 are broad aggregates, not individual taxes or benefits.",
                         "Some signed items (notably D995r) are negative; small source-rounding residuals are retained.",
                         "Revised 2026 series are not data vintages available at each historical origin."],
            "spendingCategories": definitions(SPENDING), "revenueCategories": definitions(REVENUE),
            "rows": records}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--write", action="store_true", help="Générer le gel JSON")
    group.add_argument("--check", action="store_true", help="Vérifier le gel JSON existant")
    args = parser.parse_args()
    payload = json.dumps(build(), ensure_ascii=False, indent=2) + "\n"
    if args.write:
        TARGET.write_text(payload, encoding="utf-8")
        print(f"Gel écrit : {TARGET.relative_to(ROOT)}")
    elif TARGET.read_text(encoding="utf-8") != payload:
        raise SystemExit("Le gel des postes par nature diffère du classeur officiel")
    else:
        print("Postes annuels par nature Insee 3.201 : gel et SHA-256 vérifiés.")


if __name__ == "__main__":
    main()
