"""Smoke test of the Python interface to the shared model."""

import unittest

from ecosim import simulate


class PythonInterfaceTest(unittest.TestCase):
    def test_python_uses_web_model_and_projects_six_horizons(self):
        baseline = simulate()
        scenario = simulate({"structural": {"jobsPolice": 5}})
        self.assertEqual(baseline["metadata"]["version"], "4.15.0")
        self.assertEqual(len(scenario["scenario"]), 30)
        self.assertEqual(scenario["scenario"][0]["year"], 2026)
        self.assertEqual(scenario["scenario"][-1]["year"], 2055)
        self.assertGreater(
            scenario["scenario"][9]["structural"]["publicMissionById"]["police"],
            baseline["scenario"][9]["structural"]["publicMissionById"]["police"],
        )

    def test_midyear_budget_change_is_prorated(self):
        january = simulate({"changes": {"GF0405": 10}, "policyStartQuarter": 1})
        july = simulate({"changes": {"GF0405": 10}, "policyStartQuarter": 3})
        self.assertEqual(july["assumptions"]["policyStartQuarter"], 3)
        self.assertAlmostEqual(july["scenario"][0]["spendingChange"], january["scenario"][0]["spendingChange"] / 2)
        self.assertAlmostEqual(july["scenario"][1]["spendingChange"], january["scenario"][1]["spendingChange"])
        individual = simulate({"changes": {"GF0405": 10}, "policyStartQuarters": {"GF0405": 3}})
        self.assertAlmostEqual(individual["scenario"][0]["spendingChange"], july["scenario"][0]["spendingChange"])

    def test_new_economic_profiles_use_shared_engine(self):
        central = simulate({"model": "consensus", "changes": {"GF0405": -10}})
        crisis = simulate({"model": "debtCrisis", "changes": {"GF0405": -10}})
        self.assertLess(crisis["scenario"][2]["gdp"], central["scenario"][2]["gdp"])
        self.assertLess(crisis["scenario"][9]["hysteresis"], 0)


if __name__ == "__main__":
    unittest.main()
