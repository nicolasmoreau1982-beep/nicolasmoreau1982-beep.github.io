"""Fige deux classeurs officiels Insee en JSON reproductibles pour l'audit.

Usage: python3 scripts/import-insee-observations.py
Dépendance de rafraîchissement uniquement: python3 -m pip install xlrd
Le simulateur et ses tests n'ont pas besoin de xlrd ni d'un accès réseau.
"""

from __future__ import annotations

import hashlib
import json
import re
import urllib.request
import xml.etree.ElementTree as ET
import zipfile
from io import BytesIO
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
QUARTERLY_URL = "https://www.insee.fr/fr/statistiques/fichier/9035065/t_compteapu_val.xls"
ANNUAL_URL = "https://www.insee.fr/fr/statistiques/fichier/8988845/t_3215_fr.xlsx"
POPULATION_URL = "https://www.insee.fr/fr/statistiques/fichier/8990852/00_central.xlsx"
UNEMPLOYMENT_URL = "https://www.insee.fr/fr/statistiques/fichier/9012123/EEC_CHOM02.xlsx"
HALO_URL = "https://www.insee.fr/fr/statistiques/fichier/9012123/EEC_HALO01.xlsx"
UNDEREMPLOYMENT_URL = "https://www.insee.fr/fr/statistiques/fichier/9012121/EEC_SSEMP01.xlsx"
TES_URL = "https://www.insee.fr/fr/statistiques/fichier/8988861/TES_17_2024_fr.xlsx"
NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}


def download(url: str) -> bytes:
    request = urllib.request.Request(url, headers={"User-Agent": "EcoSim-research/1.0"})
    with urllib.request.urlopen(request, timeout=30) as response:
        return response.read()


def rounded(value: float) -> float:
    return round(float(value), 4)


def read_quarterly(data: bytes) -> list[dict]:
    try:
        import xlrd
    except ImportError as error:
        raise SystemExit("Installer xlrd pour lire le classeur XLS officiel : python3 -m pip install xlrd") from error
    sheet = xlrd.open_workbook(file_contents=data).sheet_by_name("Niveaux")
    # Indices contrôlés sur les en-têtes du classeur officiel, pas sur leur seule position.
    expected = {3: "Total des dépenses", 17: "Total des recettes", 8: "Intérêts", 32: "PIB en valeur"}
    for column, label in expected.items():
        if label not in " ".join(str(sheet.cell_value(row, column)) for row in (3, 4, 5)):
            raise ValueError(f"Colonne trimestrielle {column} modifiée : {label}")
    rows = []
    for row in range(8, sheet.nrows):
        match = re.fullmatch(r"(\d{4})T([1-4])", str(sheet.cell_value(row, 0)))
        if not match:
            continue
        year, quarter = map(int, match.groups())
        if year < 2003:
            continue
        values = [sheet.cell_value(row, column) for column in (1, 3, 17, 32, 8, 5)]
        if not all(isinstance(value, (int, float)) for value in values):
            raise ValueError(f"Valeur trimestrielle manquante : {year}T{quarter}")
        balance, spending, revenue, gdp, interest, compensation = map(rounded, values)
        if abs((revenue - spending) - balance) > 0.011:
            raise ValueError(f"Identité comptable trimestrielle rompue : {year}T{quarter}")
        rows.append({"year": year, "quarter": quarter, "spending": spending,
                     "revenue": revenue, "balance": balance, "gdp": gdp,
                     "interest": interest, "publicCompensation": compensation})
    if not rows or (rows[-1]["year"], rows[-1]["quarter"]) != (2026, 2):
        raise ValueError("Le millésime du classeur trimestriel a changé : vérifier l'importateur")
    return rows


def excel_column(reference: str) -> str:
    return re.match(r"[A-Z]+", reference).group()


def read_xlsx_sheet(data: bytes, sheet: int = 1) -> dict[int, dict[str, str]]:
    with zipfile.ZipFile(BytesIO(data)) as archive:
        strings = ["".join(item.itertext()) for item in ET.fromstring(archive.read("xl/sharedStrings.xml")).findall("m:si", NS)]
        root = ET.fromstring(archive.read(f"xl/worksheets/sheet{sheet}.xml"))
    rows = {}
    for row in root.findall(".//m:sheetData/m:row", NS):
        cells = {}
        for cell in row.findall("m:c", NS):
            value = cell.find("m:v", NS)
            if value is None:
                continue
            cells[excel_column(cell.attrib["r"])] = strings[int(value.text)] if cell.attrib.get("t") == "s" else value.text
        rows[int(row.attrib["r"])] = cells
    return rows


def read_subsectors(data: bytes) -> list[dict]:
    rows = read_xlsx_sheet(data)
    if "3.215" not in rows[1].get("A", "") or rows[20].get("B", "").strip() != "-Dépenses":
        raise ValueError("Structure du tableau annuel 3.215 modifiée")
    output = []
    for column, text in rows[3].items():
        if not re.fullmatch(r"\d{4}", text) or int(text) < 2003:
            continue
        year = int(text)
        def pair(spending_row, revenue_row):
            return {"spending": rounded(rows[spending_row][column]), "revenue": rounded(rows[revenue_row][column])}
        item = {"year": year, "state": pair(7, 8), "centralAgencies": pair(10, 11),
                "local": pair(13, 14), "socialSecurity": pair(16, 17), "consolidated": pair(20, 21)}
        for key in ("spending", "revenue"):
            gross = sum(item[sector][key] for sector in ("state", "centralAgencies", "local", "socialSecurity"))
            item[f"intraGovernmentTransfers{key.title()}"] = rounded(gross - item["consolidated"][key])
        item["consolidationResidual"] = rounded(
            item["intraGovernmentTransfersSpending"] - item["intraGovernmentTransfersRevenue"])
        # Le tableau 3.215 2024 contient déjà un résidu de 0,119 Md€ ; ne pas
        # l'effacer ni forcer artificiellement l'égalité entre deux millésimes.
        if abs(item["consolidationResidual"]) > 0.2:
            raise ValueError(f"Consolidation annuelle à examiner en {year}")
        output.append(item)
    if not output or output[-1]["year"] != 2025:
        raise ValueError("Le millésime du tableau annuel 3.215 a changé : vérifier l'importateur")
    return output


def read_population_projection(data: bytes) -> dict:
    sheets = {key: read_xlsx_sheet(data, sheet) for key, sheet in {
        "population": 2, "female": 3, "male": 4, "deaths": 5,
        "births": 10, "migration": 13, "adjustment": 16}.items()}
    if "Population au 1er janvier" not in sheets["population"][1].get("A", ""):
        raise ValueError("Classeur de projection démographique modifié")
    years = range(2026, 2057)
    output = []
    age_rows = []
    for year in years:
        columns = {name: next((column for column, text in rows[2].items() if text == str(year)), None)
                   for name, rows in sheets.items()}
        if not all(columns.values()):
            raise ValueError(f"Année {year} absente du classeur démographique")
        age_values = []
        for row in range(3, 109):
            label = sheets["population"][row].get("A")
            expected = str(row - 3) if row < 108 else "105+"
            if label != expected:
                raise ValueError(f"Âge inattendu à la ligne {row} : {label}")
            total = int(sheets["population"][row][columns["population"]])
            female = int(sheets["female"][row][columns["female"]])
            male = int(sheets["male"][row][columns["male"]])
            if total != female + male:
                raise ValueError(f"Sexes non réconciliés en {year}, âge {expected}")
            age_values.append([total, female, male])
        total = sum(item[0] for item in age_values)
        if total != int(sheets["population"][109][columns["population"]]):
            raise ValueError(f"Pyramide des âges non réconciliée en {year}")
        age65 = sum(item[0] for item in age_values[65:])
        age80 = sum(item[0] for item in age_values[80:])
        output.append({"year": year, "populationM": round(total / 1_000_000, 6),
                       "age65SharePct": round(age65 / total * 100, 5), "age80M": round(age80 / 1_000_000, 6),
                       "birthsK": round(float(sheets["births"][41][columns["births"]]) / 1000, 3),
                       "deathsK": round(float(sheets["deaths"][109][columns["deaths"]]) / 1000, 3),
                       "migrationK": round(float(sheets["migration"][124][columns["migration"]]) / 1000, 3),
                       "adjustmentK": round(float(sheets["adjustment"][124][columns["adjustment"]]) / 1000, 3)})
        age_rows.append([year, age_values])
    for left, right in zip(output, output[1:]):
        balance = left["birthsK"] - left["deathsK"] + left["migrationK"] + left["adjustmentK"]
        if abs((right["populationM"] - left["populationM"]) * 1000 - balance) > 0.002:
            raise ValueError(f"Identité de population rompue en {left['year']}")
    return {"rows": output, "agesBySex": age_rows}


def read_labour(unemployment_data: bytes, halo_data: bytes, underemployment_data: bytes) -> dict:
    unemployment = read_xlsx_sheet(unemployment_data)
    halo = read_xlsx_sheet(halo_data)
    underemployment = read_xlsx_sheet(underemployment_data)
    if "CHOM02" not in unemployment[1].get("A", "") or "HALO01" not in halo[1].get("A", "") or "SSEMP01" not in underemployment[1].get("A", ""):
        raise ValueError("Classeur Enquête emploi inattendu")
    groups = [("15-24", "D", 11, 7), ("25-49", "F", 14, 10),
              ("50-64", "H", 17, 13), ("65+", "J", 20, 16)]
    ages = []
    for name, column, halo_row, under_row in groups:
        ages.append({"age": name, "unemployedK": float(unemployment[14][column]),
                     "haloK": float(halo[halo_row]["C"]),
                     "underemployedK": float(underemployment[under_row]["C"]),
                     "haloAvailableNotSeekingK": float(halo[halo_row]["E"])})
    diplomas = []
    for row in range(9, 14):
        diplomas.append({"diploma": unemployment[row]["A"],
                         "unemployedK": float(unemployment[row]["B"]),
                         "byAgeK": {name: float(unemployment[row][column]) for name, column, _, _ in groups}})
    totals = {"unemployedK": float(unemployment[14]["B"]), "haloK": float(halo[8]["C"]),
              "underemployedK": float(underemployment[19]["C"]),
              "haloAvailableNotSeekingK": float(halo[8]["E"])}
    for field in ("unemployedK", "haloK", "underemployedK"):
        if abs(sum(item[field] for item in ages) - totals[field]) > 0.2:
            raise ValueError(f"Âges de l'emploi non réconciliés : {field}")
    missing = round(totals["unemployedK"] - sum(row["unemployedK"] for row in diplomas), 1)
    if missing < 0 or missing > 20:
        raise ValueError("Diplômes inconnus non réconciliés")
    working_age = {field: round(totals[field] - ages[-1][field], 1)
                   for field in ("unemployedK", "haloK", "underemployedK")}
    return {"totals": totals, "recruitmentAges15to64K": working_age,
            "ages": ages, "diplomas": diplomas,
            "unemployedDiplomaUnknownK": missing}


def read_tes(data: bytes) -> list[dict]:
    rows = read_xlsx_sheet(data)
    if "TABLEAU ENTREES SORTIES" not in rows[1].get("A", "") or "2024" not in rows[12].get("A", ""):
        raise ValueError("TES 2024 inattendu")
    output = []
    for index in range(16, 33):
        row = rows[index]
        production = float(row.get("B", 0))
        imports = float(row.get("E", 0))
        if production < 0 or imports < 0 or production + imports <= 0:
            raise ValueError(f"Ressources TES invalides : {index}")
        output.append({"product": row["A"], "label": row["Q"],
                       "domesticProductionBn": rounded(production), "importsBn": rounded(imports),
                       "importShareOfProductResourcesPct": round(imports / (production + imports) * 100, 2)})
    if len(output) != 17 or len({row["product"] for row in output}) != 17:
        raise ValueError("TES attendu à 17 branches")
    return output


def main() -> None:
    quarterly_bytes = download(QUARTERLY_URL)
    annual_bytes = download(ANNUAL_URL)
    population_bytes = download(POPULATION_URL)
    unemployment_bytes = download(UNEMPLOYMENT_URL)
    halo_bytes = download(HALO_URL)
    underemployment_bytes = download(UNDEREMPLOYMENT_URL)
    tes_bytes = download(TES_URL)
    population = read_population_projection(population_bytes)
    labour = read_labour(unemployment_bytes, halo_bytes, underemployment_bytes)
    snapshots = (
        ("research/insee-quarterly-observed.json", {
            "sourcePage": "https://www.insee.fr/fr/statistiques/9035065?sommaire=9007859",
            "sourceFile": QUARTERLY_URL,
            "sourceSha256": hashlib.sha256(quarterly_bytes).hexdigest(),
            "published": "2026-08-28", "unit": "Md EUR courants par trimestre",
            "adjustment": "CVS-CJO", "accountingBasis": "SEC 2010, base 2020",
            "warning": "Les trimestres CVS-CJO ne sont pas les comptes annuels bruts ; les sommes peuvent différer légèrement.",
            "rows": read_quarterly(quarterly_bytes),
        }),
        ("research/insee-subsectors.json", {
            "sourcePage": "https://www.insee.fr/fr/statistiques/8988845",
            "sourceFile": ANNUAL_URL,
            "sourceSha256": hashlib.sha256(annual_bytes).hexdigest(),
            "published": "2026-08-28", "unit": "Md EUR courants par an",
            "accountingBasis": "SEC 2010, base 2020, tableau 3.215",
            "warning": "Les sous-secteurs incluent les transferts entre administrations ; leurs dépenses et recettes ne s'additionnent pas avant consolidation.",
            "rows": read_subsectors(annual_bytes),
        }),
        ("research/insee-population-projection.json", {
            "sourcePage": "https://www.insee.fr/fr/statistiques/8990852?sommaire=8991068",
            "sourceFile": POPULATION_URL,
            "sourceSha256": hashlib.sha256(population_bytes).hexdigest(),
            "published": "2026-06-08", "scenario": "central", "geography": "France",
            "warning": "Projection conditionnelle, non observation future ; les ajustements statistiques sont conservés pour réconcilier les effectifs.",
            **population,
        }),
        ("research/insee-labour-2025.json", {
            "sourcePages": ["https://www.insee.fr/fr/statistiques/9012123",
                            "https://www.insee.fr/fr/statistiques/9012121"],
            "sourceFiles": [UNEMPLOYMENT_URL, HALO_URL, UNDEREMPLOYMENT_URL],
            "sourceSha256": [hashlib.sha256(content).hexdigest() for content in
                             (unemployment_bytes, halo_bytes, underemployment_bytes)],
            "published": "2026-07-02", "referenceYear": 2025, "unit": "milliers de personnes",
            "warning": "Moyennes annuelles de l'enquête Emploi : chômage BIT, halo et sous-emploi sont des ensembles distincts. La qualification ne donne pas la disponibilité immédiate pour chaque métier.",
            **labour,
        }),
        ("research/insee-tes-2024.json", {
            "sourcePage": "https://www.insee.fr/fr/statistiques/8988861",
            "sourceFile": TES_URL,
            "sourceSha256": hashlib.sha256(tes_bytes).hexdigest(),
            "published": "2026-08-05", "referenceYear": 2024,
            "unit": "Md EUR courants, branches de produits niveau 17",
            "warning": "La part d'importation dans les ressources d'un produit n'est pas la fuite marginale d'une dépense publique ni un multiplicateur ; aucune correspondance COFOG→produit n'est imposée.",
            "rows": read_tes(tes_bytes),
        }),
    )
    for name, payload in snapshots:
        destination = ROOT / name
        destination.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"{destination}: {len(payload.get('rows', payload.get('ages', [])))} lignes")


if __name__ == "__main__":
    main()
