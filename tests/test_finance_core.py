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
                    case["PV"], case["W_initial"], case["withdrawal_time"], case["rates_periods"], one_off_events=None
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
                    case["rates_periods"], case["desired_final_value"], one_off_events=None
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
                    case["W_initial"], case["withdrawal_time"], case["rates_periods"], case["desired_final_value"], one_off_events=None
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
                    case["P"], case["withdrawal_time"], case["rates_periods"], case["desired_final_value"], one_off_events=None
                )
                self.assertAlmostEqual(actual_W, case["expected_W"], delta=case["delta"])

    def test_frp_high_withdrawal_scenario_single_period(self):
        W_initial = 1e8 # 100 million
        rates_periods = [{'duration': 50, 'r': 0.01, 'i': 0.00}]
        withdrawal_time = TIME_START
        expected_PV = 3958807870.6488113
        actual_PV = find_required_portfolio(W_initial, withdrawal_time, rates_periods, desired_final_value=0.0, one_off_events=None)
        self.assertAlmostEqual(actual_PV, expected_PV, delta=0.1)


# New test class for one-off event specific tests
class TestOneOffEvents(unittest.TestCase):
    def setUp(self):
        self.app = flask_app
        self.app_context = self.app.app_context()
        self.app_context.push()
        self.PV = 100000
        self.W_initial = 4000
        self.rates_periods_3yr_const = [{'duration': 3, 'r': 0.05, 'i': 0.02}] # r=5%, i=2% for 3 years

    def tearDown(self):
        self.app_context.pop()

    # Test Cases for annual_simulation with one-off events
    def test_annual_simulation_one_off_expense_end_year_withdrawal(self):
        one_off_events = [{'year': 2, 'amount': -10000}] # Expense in year 2
        # Year 1 (t=0): Bal = 100000. Growth = 100000*0.05 = 5000. Withdrawal = 4000. End Bal = 100000+5000-4000 = 101000. W_next = 4000*1.02 = 4080
        # Year 2 (t=1): Start Bal = 101000. One-off = -10000. B_before_growth = 101000 - 10000 = 91000. Growth = 91000*0.05 = 4550. Withdrawal = 4080. End Bal = 91000+4550-4080 = 91470. W_next = 4080*1.02=4161.60
        # Year 3 (t=2): Start Bal = 91470. Growth = 91470*0.05 = 4573.50. Withdrawal = 4161.60. End Bal = 91470+4573.50-4161.60 = 91881.90
        expected_balances = [self.PV, 101000.00, 91470.00, 91881.90] # Balances[0] is PV. Balances[1] is after year 1.
                                                                     # For TIME_END, append(B) happens before one-off.
                                                                     # Y1 (t=0): Balances[0]=PV. B_after_growth_withdrawal = PV*(1+r)-W = 101000. Balances -> [100k, 101k]
                                                                     # Y2 (t=1): B_start_year = 101k. Balances.append(101k). B_after_event = 101k-10k=91k. B_after_growth=91k*1.05=95550. B_after_withdrawal = 95550-4080=91470. Balances -> [100k, 101k, 91470] (WRONG - balances list stores B at *start* of year for TIME_END)
                                                                     # Let's re-evaluate based on code:
                                                                     # For TIME_END: balances.append(B_start_of_year); B_start_of_year += event; B_start_of_year_post_event_and_growth = B_start_of_year * (1+r); B_end_of_year = B_start_of_year_post_event_and_growth - W_this_year
        # Y0: B=100k. balances=[100k]
        # Y1 (t=0): W=4k. i=0.02. r=0.05. withdrawal_time=TIME_END. No event.
        #   balances.append(B) -> balances=[100k, 100k] (B at start of Y1)
        #   B = B * (1+r) = 100k * 1.05 = 105k
        #   B = B - W = 105k - 4k = 101k. (B at end of Y1)
        #   W_next = 4k * 1.02 = 4080.
        # Y2 (t=1): W=4080. Event: year 2, amount -10k.
        #   balances.append(B) -> balances=[100k, 100k, 101k] (B at start of Y2)
        #   B = B + event = 101k - 10k = 91k.
        #   B = B * (1+r) = 91k * 1.05 = 95550.
        #   B = B - W = 95550 - 4080 = 91470. (B at end of Y2)
        #   W_next = 4080 * 1.02 = 4161.60
        # Y3 (t=2): W=4161.60. No event.
        #   balances.append(B) -> balances=[100k, 100k, 101k, 91470] (B at start of Y3)
        #   B = B * (1+r) = 91470 * 1.05 = 96043.50
        #   B = B - W = 96043.50 - 4161.60 = 91881.90 (B at end of Y3)
        # Final balances list should be: [PV_initial, B_start_Y1, B_start_Y2, B_start_Y3, B_end_Y3_final]
        # So, [100000, 100000, 101000, 91470, 91881.90] - this is if we append PV and then start of each year, plus final.
        # The code has: years = np.arange(0, total_T + 1). balances = []. B=PV. loop total_T times. balances.append(B). balances.append(B) (final).
        # So length is total_T + 1.
        # If balances.append(B) is at start of loop:
        # Y0: B=100k.
        # Y1 (t=0): Balances=[100k]. B_end=101k. W_next=4080.
        # Y2 (t=1): Balances=[100k, 101k]. B_end=91470 (after event processing). W_next=4161.60
        # Y3 (t=2): Balances=[100k, 101k, 91470]. B_end=91881.90
        # Final append: Balances=[100k, 101k, 91470, 91881.90]
        # This matches the structure of existing tests. Balances[0] is PV. Balances[t_idx+1] is balance after year t_idx+1 operations.

        expected_balances_corrected = [100000.00, 101000.00, 91470.00, 91881.90]
        expected_withdrawals = [4000.00, 4080.00, 4161.60]

        _, balances, withdrawals = annual_simulation(self.PV, self.W_initial, TIME_END, self.rates_periods_3yr_const, one_off_events)
        for actual, expected in zip(balances, expected_balances_corrected):
            self.assertAlmostEqual(actual, expected, places=2)
        for actual, expected in zip(withdrawals, expected_withdrawals):
            self.assertAlmostEqual(actual, expected, places=2)

    def test_annual_simulation_one_off_income_start_year_withdrawal(self):
        one_off_events = [{'year': 1, 'amount': 5000}] # Income in year 1
        # For TIME_START: B -= W; B += Event; balances.append(B); B *= (1+r)
        # Y1 (t=0): W=4k. Event: year 1, amount 5k. r=0.05, i=0.02
        #   B_after_W = 100k - 4k = 96k.
        #   B_after_event = 96k + 5k = 101k.
        #   balances.append(101k) -> balances=[101k]
        #   B_after_growth = 101k * 1.05 = 106050. (B at end of Y1)
        #   W_next = 4k * 1.02 = 4080.
        # Y2 (t=1): W=4080. No event.
        #   B_after_W = 106050 - 4080 = 101970.
        #   balances.append(101970) -> balances=[101k, 101970]
        #   B_after_growth = 101970 * 1.05 = 107068.50 (B at end of Y2)
        #   W_next = 4080 * 1.02 = 4161.60
        # Y3 (t=2): W=4161.60. No event.
        #   B_after_W = 107068.50 - 4161.60 = 102906.90
        #   balances.append(102906.90) -> balances=[101k, 101970, 102906.90]
        #   B_after_growth = 102906.90 * 1.05 = 108052.245 (B at end of Y3)
        # Original structure: Balances[0] is PV. Then append B after W and Event.
        # This means balances list for TIME_START has length total_T, and then final B is appended.
        # The test cases for TIME_START have balances list: [PV-W, (PV-W)*(1+r)-W2, ...] then final B.
        # Let's re-check `annual_simulation` structure for `TIME_START`:
        #   B -= W
        #   Process one-offs for B
        #   balances.append(B)  <-- This B is after W and one-off, but before growth for this year
        #   B *= (1+r)
        #   ...
        #   balances.append(B) <-- Final B after all years
        # So, balances list has total_T elements from loop, +1 for final B.
        # And the problem description implies balances[0] is PV. This is not what happens.
        # The existing tests for TIME_START:
        # "expected_balances": [96000.00, 100800.00], total_T=1. Loop runs once for t_year_idx=0.
        # PV=100k, W=4k, r=0.05. B_after_W = 96k. balances.append(96k). B_after_growth = 96k*1.05=100800. Loop ends. balances.append(100800).
        # This is [B_after_W_Y1, B_end_Y1_final]. This is what my calculation above for TIME_START also yields.
        # So the initial PV is NOT in the `balances` list returned by `annual_simulation` directly if TIME_START.
        # My previous tests assumed balances[0] was PV. This needs correction for TIME_START tests.
        # Let's assume the current tests are correct and `balances` does not start with PV for TIME_START.

        expected_balances = [101000.00, 101970.00, 102906.90, 108052.245] # [B_Y1_postW_postEvent_preGrowth, B_Y2_postW_preGrowth, B_Y3_postW_preGrowth, B_Y3_final]
        expected_withdrawals = [4000.00, 4080.00, 4161.60]

        _, balances, withdrawals = annual_simulation(self.PV, self.W_initial, TIME_START, self.rates_periods_3yr_const, one_off_events)
        for actual, expected in zip(balances, expected_balances):
            self.assertAlmostEqual(actual, expected, places=2) # places=2 due to example calc.
        for actual, expected in zip(withdrawals, expected_withdrawals):
            self.assertAlmostEqual(actual, expected, places=2)

    def test_annual_simulation_multiple_one_off_events(self):
        one_off_events = [{'year': 1, 'amount': 2000}, {'year': 3, 'amount': -3000}]
        rates_periods_4yr = [{'duration': 4, 'r': 0.05, 'i': 0.02}]
        # TIME_END withdrawal
        # Y1 (t=0): W=4k. Event Y1 +2k. Bal_start=100k. Store 100k. B_event = 100k+2k=102k. B_growth = 102k*1.05=107100. B_final=107100-4k=103100. W_next=4080. Balances = [100k, 103100]
        # Y2 (t=1): W=4080. No Event. Bal_start=103100. Store 103100. B_growth=103100*1.05=108255. B_final=108255-4080=104175. W_next=4161.6. Balances = [100k, 103100, 104175]
        # Y3 (t=2): W=4161.6. Event Y3 -3k. Bal_start=104175. Store 104175. B_event=104175-3k=101175. B_growth=101175*1.05=106233.75. B_final=106233.75-4161.6=102072.15. W_next=4244.832. Balances = [100k, 103100, 104175, 102072.15]
        # Y4 (t=3): W=4244.832. No Event. Bal_start=102072.15. Store 102072.15. B_growth=102072.15*1.05=107175.7575. B_final=107175.7575-4244.832=102930.9255. W_next=4329.72864. Balances = [100k,103100,104175,102072.15,102930.93]
        # Correcting for existing test structure: balances[0] is PV.
        expected_balances = [100000.00, 103100.00, 104175.00, 102072.15, 102930.93]
        expected_withdrawals = [4000.00, 4080.00, 4161.60, 4244.83]
        _, balances, withdrawals = annual_simulation(self.PV, self.W_initial, TIME_END, rates_periods_4yr, one_off_events)
        for actual, expected in zip(balances, expected_balances):  self.assertAlmostEqual(actual, expected, places=2)
        for actual, expected in zip(withdrawals, expected_withdrawals): self.assertAlmostEqual(actual, expected, places=2)

    def test_annual_simulation_one_off_event_out_of_bounds(self):
        # Event year 0 or > total_T should be ignored
        one_off_events_y0 = [{'year': 0, 'amount': 5000}]
        one_off_events_y10 = [{'year': 10, 'amount': 5000}] # Sim is 3 years

        # Baseline (no events) for TIME_END withdrawal
        # Y1: 100k*1.05 - 4k = 101k. W_next=4080
        # Y2: 101k*1.05 - 4080 = 101970. W_next=4161.6
        # Y3: 101970*1.05 - 4161.6 = 102906.9
        expected_balances_baseline = [100000.00, 101000.00, 101970.00, 102906.90]

        _, balances_y0, _ = annual_simulation(self.PV, self.W_initial, TIME_END, self.rates_periods_3yr_const, one_off_events_y0)
        for actual, expected in zip(balances_y0, expected_balances_baseline): self.assertAlmostEqual(actual, expected, places=2)

        _, balances_y10, _ = annual_simulation(self.PV, self.W_initial, TIME_END, self.rates_periods_3yr_const, one_off_events_y10)
        for actual, expected in zip(balances_y10, expected_balances_baseline): self.assertAlmostEqual(actual, expected, places=2)

    def test_annual_simulation_no_one_off_events_empty_list_and_none(self):
        expected_balances_baseline = [100000.00, 101000.00, 101970.00, 102906.90] # From previous test

        _, balances_empty, _ = annual_simulation(self.PV, self.W_initial, TIME_END, self.rates_periods_3yr_const, one_off_events=[])
        for actual, expected in zip(balances_empty, expected_balances_baseline): self.assertAlmostEqual(actual, expected, places=2)

        _, balances_none, _ = annual_simulation(self.PV, self.W_initial, TIME_END, self.rates_periods_3yr_const, one_off_events=None)
        for actual, expected in zip(balances_none, expected_balances_baseline): self.assertAlmostEqual(actual, expected, places=2)

    # Behavioral tests for find_required_portfolio and find_max_annual_expense
    def test_find_required_portfolio_with_one_off_events_behavior(self):
        rates = [{'duration': 10, 'r': 0.05, 'i': 0.02}]
        W = 50000
        dfv = 0

        pv_no_event = find_required_portfolio(W, TIME_END, rates, dfv, one_off_events=None)

        # Large expense should require larger PV
        pv_with_expense = find_required_portfolio(W, TIME_END, rates, dfv, one_off_events=[{'year': 2, 'amount': -100000}])
        self.assertGreater(pv_with_expense, pv_no_event)

        # Large income should require smaller PV
        pv_with_income = find_required_portfolio(W, TIME_END, rates, dfv, one_off_events=[{'year': 2, 'amount': 100000}])
        self.assertLess(pv_with_income, pv_no_event)

    def test_find_max_annual_expense_with_one_off_events_behavior(self):
        rates = [{'duration': 10, 'r': 0.05, 'i': 0.02}]
        PV_val = 1000000
        dfv = 0

        w_no_event = find_max_annual_expense(PV_val, TIME_END, rates, dfv, one_off_events=None)

        # Large expense should allow smaller W
        w_with_expense = find_max_annual_expense(PV_val, TIME_END, rates, dfv, one_off_events=[{'year': 2, 'amount': -100000}])
        self.assertLess(w_with_expense, w_no_event)

        # Large income should allow larger W
        w_with_income = find_max_annual_expense(PV_val, TIME_END, rates, dfv, one_off_events=[{'year': 2, 'amount': 100000}])
        self.assertGreater(w_with_income, w_no_event)

    # High DFV Scenarios
    def test_find_required_portfolio_user_scenario_dfv_2M(self):
        W = 80000.0
        rates_periods = [{'duration': 30, 'r': 0.07, 'i': 0.03}]
        dfv = 2000000.0
        withdrawal_time = TIME_END
        one_off_events = None # No one-off events for these DFV tests

        pv_required = find_required_portfolio(W, withdrawal_time, rates_periods, dfv, one_off_events)
        # User reported value was $2,000,000.01. Let's use a slightly wider delta for bisection results.
        self.assertAlmostEqual(pv_required, 2000000.01, delta=self.app.config['DEFAULT_TOLERANCE'] * 10)

        # Validate by running annual_simulation
        _, balances, _ = annual_simulation(pv_required, W, withdrawal_time, rates_periods, one_off_events)
        final_balance = balances[-1]
        # The delta for final balance check should be tolerant of accumulated float errors
        # Using a mix of absolute and relative tolerance for robustness
        validation_delta = max(1.0, dfv * 0.00001) + self.app.config['DEFAULT_TOLERANCE'] * 10
        self.assertAlmostEqual(final_balance, dfv, delta=validation_delta)

    def test_find_required_portfolio_user_scenarios_various_dfv(self):
        W = 80000.0
        rates_periods = [{'duration': 30, 'r': 0.07, 'i': 0.03}]
        withdrawal_time = TIME_END
        one_off_events = None

        scenarios = [
            {"dfv": 0.0, "expected_pv": 1362275.06},
            {"dfv": 100000.0, "expected_pv": 1375411.77},
            {"dfv": 1000000.0, "expected_pv": 1493642.18},
            {"dfv": 1500000.0, "expected_pv": 1559325.73},
        ]

        for scenario in scenarios:
            with self.subTest(dfv=scenario["dfv"]):
                dfv = scenario["dfv"]
                expected_pv = scenario["expected_pv"]

                pv_required = find_required_portfolio(W, withdrawal_time, rates_periods, dfv, one_off_events)
                self.assertAlmostEqual(pv_required, expected_pv, delta=self.app.config['DEFAULT_TOLERANCE'] * 10 + 0.01)

                _, balances, _ = annual_simulation(pv_required, W, withdrawal_time, rates_periods, one_off_events)
                final_balance = balances[-1]
                validation_delta = max(1.0, dfv * 0.00001 if dfv > 0 else 1.0) + self.app.config['DEFAULT_TOLERANCE'] * 10
                self.assertAlmostEqual(final_balance, dfv, delta=validation_delta)

    def test_find_required_portfolio_zero_withdrawal_high_dfv(self):
        W = 0.0
        rates_periods = [{'duration': 30, 'r': 0.07, 'i': 0.03}] # i is irrelevant for W=0 withdrawal calculation
        dfv = 1000000.0
        withdrawal_time = TIME_END
        one_off_events = None

        # Expected PV = DFV / (1+r)^T
        expected_pv = dfv / ((1 + rates_periods[0]['r']) ** rates_periods[0]['duration']) # Approx 131367.07
        self.assertAlmostEqual(expected_pv, 131367.07, delta=0.01) # Check my formula calculation first

        pv_required = find_required_portfolio(W, withdrawal_time, rates_periods, dfv, one_off_events)
        # For W=0, the bisection might hit slightly different due to how it searches, allow a bit more tolerance
        self.assertAlmostEqual(pv_required, expected_pv, delta=self.app.config['DEFAULT_TOLERANCE'] * 100 + 0.1)


        _, balances, _ = annual_simulation(pv_required, W, withdrawal_time, rates_periods, one_off_events)
        final_balance = balances[-1]
        validation_delta = max(1.0, dfv * 0.00001) + self.app.config['DEFAULT_TOLERANCE'] * 100
        self.assertAlmostEqual(final_balance, dfv, delta=validation_delta)

    # Further Robustness Tests for High DFV
    def test_frp_high_dfv_low_withdrawal_varied_returns(self):
        DFV = 1000000.0
        W_initial = 10000.0
        T = 20
        withdrawal_time = TIME_END
        one_off_events = None

        rate_scenarios = [
            {'name': 'High Real Return', 'rates_periods': [{'duration': T, 'r': 0.08, 'i': 0.02}]}, # 6% real
            {'name': 'Moderate Real Return', 'rates_periods': [{'duration': T, 'r': 0.05, 'i': 0.02}]}, # 3% real
            {'name': 'Low/Zero Real Return', 'rates_periods': [{'duration': T, 'r': 0.02, 'i': 0.02}]}, # 0% real
            {'name': 'Negative Real Return', 'rates_periods': [{'duration': T, 'r': 0.01, 'i': 0.03}]}, # -2% real
        ]

        for sc in rate_scenarios:
            with self.subTest(name=sc['name']):
                pv_required = find_required_portfolio(W_initial, withdrawal_time, sc['rates_periods'], DFV, one_off_events)
                self.assertFalse(pv_required == float('inf'), f"PV should not be_inf for {sc['name']}")

                _, balances, _ = annual_simulation(pv_required, W_initial, withdrawal_time, sc['rates_periods'], one_off_events)
                final_balance = balances[-1]
                validation_delta = max(1.0, DFV * 0.0001) + self.app.config['DEFAULT_TOLERANCE'] * 10
                self.assertAlmostEqual(final_balance, DFV, delta=validation_delta)

    def test_frp_high_dfv_high_withdrawal_varied_durations(self):
        DFV = 500000.0
        W_initial = 40000.0 # 8% of DFV
        withdrawal_time = TIME_END
        one_off_events = None
        base_r = 0.06
        base_i = 0.03

        duration_scenarios = [10, 20, 30]

        for T_val in duration_scenarios:
            with self.subTest(duration=T_val):
                rates_periods = [{'duration': T_val, 'r': base_r, 'i': base_i}]
                pv_required = find_required_portfolio(W_initial, withdrawal_time, rates_periods, DFV, one_off_events)
                self.assertFalse(pv_required == float('inf'), f"PV should not be_inf for T={T_val}")

                _, balances, _ = annual_simulation(pv_required, W_initial, withdrawal_time, rates_periods, one_off_events)
                final_balance = balances[-1]
                validation_delta = max(1.0, DFV * 0.0001) + self.app.config['DEFAULT_TOLERANCE'] * 10
                self.assertAlmostEqual(final_balance, DFV, delta=validation_delta)

    def test_frp_high_dfv_zero_nominal_return(self):
        DFV = 100000.0
        W_initial = 5000.0
        T = 10
        rates_periods = [{'duration': T, 'r': 0.00, 'i': 0.00}] # r=0, i=0
        withdrawal_time = TIME_END
        one_off_events = None

        # Expected PV = DFV + sum of (non-inflated) withdrawals because i=0
        expected_pv = DFV + (W_initial * T) # 100000 + 5000*10 = 150000

        pv_required = find_required_portfolio(W_initial, withdrawal_time, rates_periods, DFV, one_off_events)
        # Delta can be tighter as this is a very predictable scenario
        self.assertAlmostEqual(pv_required, expected_pv, delta=self.app.config['DEFAULT_TOLERANCE'] * 10 + 0.01)

        _, balances, _ = annual_simulation(pv_required, W_initial, withdrawal_time, rates_periods, one_off_events)
        final_balance = balances[-1]
        validation_delta = max(1.0, DFV * 0.00001 if DFV > 0 else 1.0) + self.app.config['DEFAULT_TOLERANCE']*10
        self.assertAlmostEqual(final_balance, DFV, delta=validation_delta)

    def test_frp_very_high_dfv_zero_withdrawal_long_duration(self):
        DFV = 10000000.0 # 10 Million
        W_initial = 0.0
        T = 50
        r_rate = 0.05
        rates_periods = [{'duration': T, 'r': r_rate, 'i': 0.02}] # inflation is irrelevant for W=0
        withdrawal_time = TIME_END
        one_off_events = None

        expected_pv = DFV / ((1 + r_rate)**T) # Approx 872039.69

        pv_required = find_required_portfolio(W_initial, withdrawal_time, rates_periods, DFV, one_off_events)
        # Using a slightly larger delta due to potential extreme value in bisection or formula precision
        self.assertAlmostEqual(pv_required, expected_pv, delta=max(1.0, expected_pv * 0.0001) + self.app.config['DEFAULT_TOLERANCE'] * 100)

        _, balances, _ = annual_simulation(pv_required, W_initial, withdrawal_time, rates_periods, one_off_events)
        final_balance = balances[-1]
        validation_delta = max(1.0, DFV * 0.0001) + self.app.config['DEFAULT_TOLERANCE'] * 100
        self.assertAlmostEqual(final_balance, DFV, delta=validation_delta)


if __name__ == '__main__':
    unittest.main()
