"""Smoke test of the Python interface to the shared model."""

import unittest

from ecosim import simulate


class PythonInterfaceTest(unittest.TestCase):
    def test_python_uses_web_model_and_projects_six_horizons(self):
        baseline = simulate()
        scenario = simulate({"structural": {"jobsPolice": 5}})
        self.assertEqual(baseline["metadata"]["version"], "4.6.0")
        self.assertEqual(len(scenario["scenario"]), 30)
        self.assertEqual(scenario["scenario"][0]["year"], 2026)
        self.assertEqual(scenario["scenario"][-1]["year"], 2055)
        self.assertGreater(
            scenario["scenario"][9]["structural"]["publicMissionById"]["police"],
            baseline["scenario"][9]["structural"]["publicMissionById"]["police"],
        )


if __name__ == "__main__":
    unittest.main()
