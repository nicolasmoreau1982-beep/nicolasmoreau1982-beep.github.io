"""Interface Python vers le moteur unique d'EcoSim France (JavaScript/Node)."""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path
from typing import Any, Mapping


ROOT = Path(__file__).resolve().parent
ENGINE = ROOT / "scripts" / "simulate.mjs"


def simulate(scenario: Mapping[str, Any] | None = None) -> dict[str, Any]:
    """Simule 2026–2055 avec les mêmes données et équations que l'interface web."""
    completed = subprocess.run(
        ["node", str(ENGINE)],
        input=json.dumps(dict(scenario or {}), ensure_ascii=False),
        text=True,
        capture_output=True,
        check=False,
        cwd=ROOT,
    )
    if completed.returncode:
        raise ValueError(completed.stderr.strip() or "La simulation a échoué")
    return json.loads(completed.stdout)


def main() -> int:
    parser = argparse.ArgumentParser(description="Simulateur budgétaire EcoSim France")
    parser.add_argument("scenario", nargs="?", help="Fichier JSON, '-' pour stdin, ou aucun pour la référence")
    parser.add_argument("--complet", action="store_true", help="Exporter les 30 années et tous les moteurs")
    args = parser.parse_args()
    try:
        if args.scenario == "-":
            payload = json.load(sys.stdin)
        elif args.scenario:
            payload = json.loads(Path(args.scenario).read_text(encoding="utf-8"))
        else:
            payload = {}
        result = simulate(payload)
    except (OSError, ValueError, json.JSONDecodeError) as error:
        parser.exit(2, f"Erreur : {error}\n")
    if args.complet:
        print(json.dumps(result, ensure_ascii=False, indent=2))
    else:
        years = (1, 3, 5, 10, 20, 30)
        points = [result["scenario"][year - 1] for year in years]
        print(json.dumps({
            "version": result["metadata"]["version"],
            "model": result["assumptions"]["model"],
            "horizons": [{
                "annee": point["year"],
                "pib_milliards": round(point["gdp"], 2),
                "deficit_milliards": round(point["deficit"], 2),
                "dette_pct_pib": round(point["debtRatio"], 2),
                "chomage_pct": round(point["unemployment"], 2),
                "agents_publics_ecart_milliers": round(point["structural"]["publicEmploymentDelta"], 2),
            } for point in points],
        }, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
