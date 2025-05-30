import unittest
import numpy as np
# Updated imports:
from project.financial_calcs import annual_simulation, find_required_portfolio, find_max_annual_expense, simulate_final_balance
from project.constants import TIME_START, TIME_END
from app import app as flask_app # Import the Flask app instance

class TestFinancialCalculations(unittest.TestCase):
    def setUp(self):
        self.app = flask_app
        self.app_context = self.app.app_context()
        self.app_context.push()
        # Config values are already set in app.py when flask_app is created

    def tearDown(self):
        self.app_context.pop()

    def test_annual_simulation_scenarios(self):
        test_cases = [
            {
                "name": "Single Period - Time End Basic",
                "PV": 100000, "W_initial": 4000, "withdrawal_time": TIME_END,
                "rates_periods": [{'duration': 1, 'r': 0.05, 'i': 0.02}],
                "expected_balances": [100000.00, 101000.00],
                "expected_withdrawals": [4000.00],
                "total_T": 1
            },
            {
                "name": "Single Period - Time Start Basic",
                "PV": 100000, "W_initial": 4000, "withdrawal_time": TIME_START,
                "rates_periods": [{'duration': 1, 'r': 0.05, 'i': 0.02}],
                "expected_balances": [96000.00, 100800.00],
                "expected_withdrawals": [4000.00],
                "total_T": 1
            },
            {
                "name": "Multi Period - Example from problem description",
                "PV": 100000, "W_initial": 1000, "withdrawal_time": TIME_END,
                "rates_periods": [
                    {'duration': 1, 'r': 0.05, 'i': 0.02}, 
                    {'duration': 1, 'r': 0.06, 'i': 0.03}
                ],
                "expected_balances": [100000.00, 104000.00, 109220.00],
                "expected_withdrawals": [1000.00, 1020.00],
                "total_T": 2
            },
            {
                "name": "Multi Period - Zero rates, 3 years total",
                "PV": 100000, "W_initial": 1000, "withdrawal_time": TIME_END,
                "rates_periods": [
                    {'duration': 2, 'r': 0.00, 'i': 0.00}, 
                    {'duration': 1, 'r': 0.00, 'i': 0.00}
                ],
                "expected_balances": [100000.00, 99000.00, 98000.00, 97000.00],
                "expected_withdrawals": [1000.00, 1000.00, 1000.00],
                "total_T": 3
            }
        ]

        for case in test_cases:
            with self.subTest(name=case["name"]):
                years, balances, withdrawals = annual_simulation(
                    case["PV"], case["W_initial"], case["withdrawal_time"], case["rates_periods"]
                )
                self.assertEqual(len(years), case["total_T"] + 1)
                self.assertListEqual(list(years), list(np.arange(0, case["total_T"] + 1)))
                
                self.assertEqual(len(balances), len(case["expected_balances"]))
                for bal_actual, bal_expected in zip(balances, case["expected_balances"]):
                    self.assertAlmostEqual(bal_actual, bal_expected, places=2)
                self.assertEqual(len(withdrawals), len(case["expected_withdrawals"]))
                for wd_actual, wd_expected in zip(withdrawals, case["expected_withdrawals"]):
                    self.assertAlmostEqual(wd_actual, wd_expected, places=2)
                if case["expected_balances"]: # balances includes initial PV
                    self.assertAlmostEqual(balances[-1], case["expected_balances"][-1], places=2)

    def test_simulate_final_balance_logic(self):
        test_cases = [
            {
                "name": "Single Period - DFV Zero", 
                "PV": 100000, "W_initial": 4000, "withdrawal_time": TIME_END, 
                "rates_periods": [{'duration': 1, 'r': 0.05, 'i': 0.02}],
                "desired_final_value": 0.0, "expected_diff": 101000.00
            },
            {
                "name": "Multi Period - DFV Positive", 
                "PV": 100000, "W_initial": 1000, "withdrawal_time": TIME_END,
                "rates_periods": [
                    {'duration': 1, 'r': 0.05, 'i': 0.02}, 
                    {'duration': 1, 'r': 0.06, 'i': 0.03}
                ],
                "desired_final_value": 100000.0, "expected_diff": 9220.00 # 109220 - 100000
            },
        ]
        for case in test_cases:
            with self.subTest(name=case["name"]):
                actual_diff = simulate_final_balance(
                    case["PV"], case["W_initial"], case["withdrawal_time"], 
                    case["rates_periods"], case["desired_final_value"]
                )
                self.assertAlmostEqual(actual_diff, case["expected_diff"], places=2)

    def test_find_required_portfolio_scenarios(self):
        test_cases = [
            {
                "name": "Single Period - Basic Time End DFV Zero",
                "W_initial": 40000, "withdrawal_time": TIME_END, "desired_final_value": 0.0,
                "rates_periods": [{'duration': 25, 'r': 0.07, 'i': 0.03}],
                "expected_pv": 614223.147699631, "delta": 0.02 
            },
            {
                "name": "Multi Period - 2 periods, varying rates",
                "W_initial": 1000, "withdrawal_time": TIME_END, "desired_final_value": 100000.0,
                 "rates_periods": [
                    {'duration': 1, 'r': 0.05, 'i': 0.02}, 
                    {'duration': 1, 'r': 0.06, 'i': 0.03}
                ], # Total T=2. Expected final balance with PV=X should be DFV.
                # For W=1000, DFV=100000, Balances EOY0 = X*1.05-1000, EOY1 = (X*1.05-1000)*1.06 - 1020
                # (X*1.05-1000)*1.06 - 1020 = 100000 => X*1.05*1.06 - 1060 - 1020 = 100000
                # X * 1.113 - 2080 = 100000 => X * 1.113 = 102080 => X = 102080 / 1.113 = 91716.08
                "expected_pv": 91716.08, "delta": 0.02
            },
        ]
        for case in test_cases:
            with self.subTest(name=case["name"]):
                actual_pv = find_required_portfolio(
                    case["W_initial"], case["withdrawal_time"], case["rates_periods"], case["desired_final_value"]
                )
                self.assertAlmostEqual(actual_pv, case["expected_pv"], delta=case["delta"])

    def test_find_max_annual_expense_scenarios(self):
        test_cases = [
            {
                "name": "Single Period - Basic Time End DFV Zero",
                "P": 1000000, "withdrawal_time": TIME_END, "desired_final_value": 0.0,
                "rates_periods": [{'duration': 30, 'r': 0.06, 'i': 0.025}],
                "expected_W": 55136.150245186924, "delta": 0.02
            },
            {
                "name": "Multi Period - 2 periods, varying rates",
                "P": 100000, "withdrawal_time": TIME_END, "desired_final_value": 0.0,
                "rates_periods": [
                    {'duration': 1, 'r': 0.05, 'i': 0.02}, 
                    {'duration': 1, 'r': 0.06, 'i': 0.03}
                ], # Total T=2
                # Bal EOY0 = 100000*1.05 - W = 105000 - W
                # Bal EOY1 = (105000-W)*1.06 - W*(1+0.02) = (105000-W)*1.06 - 1.02*W = 0
                # 111300 - 1.06W - 1.02W = 0 => 111300 = 2.08W => W = 111300 / 2.08 = 53509.61
                "expected_W": 53509.61, "delta": 0.02 
            },
        ]
        for case in test_cases:
            with self.subTest(name=case["name"]):
                actual_W = find_max_annual_expense(
                    case["P"], case["withdrawal_time"], case["rates_periods"], case["desired_final_value"]
                )
                self.assertAlmostEqual(actual_W, case["expected_W"], delta=case["delta"])

    def test_frp_high_withdrawal_scenario_single_period(self):
        W_initial = 1e8 # 100 million
        rates_periods = [{'duration': 50, 'r': 0.01, 'i': 0.00}]
        withdrawal_time = TIME_START
        expected_PV = 3958807870.6488113 
        actual_PV = find_required_portfolio(W_initial, withdrawal_time, rates_periods, desired_final_value=0.0)
        self.assertAlmostEqual(actual_PV, expected_PV, delta=0.1)


if __name__ == '__main__':
    unittest.main()
