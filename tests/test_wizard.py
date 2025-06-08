import unittest
from unittest.mock import patch
import sys
import os
from flask import session, url_for

# Add the root directory to sys.path to allow importing 'app'
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import app # Import the Flask app instance
from project.forms import ExpensesForm, RatesForm, OneOffsForm, PeriodRateForm, OneOffEntryForm
from unittest.mock import patch # Added for new tests

class TestWizardForms(unittest.TestCase):
    def setUp(self):
        app.testing = True
        # SECRET_KEY is needed for session, which is used by Flask-WTF's CSRF protection
        app.config['SECRET_KEY'] = 'test_secret_key_for_forms'
        # WTF_CSRF_ENABLED defaults to True, so forms will expect CSRF token
        # If you are not submitting through the client and testing forms directly,
        # you might need to provide a mock CSRF token or disable CSRF for form tests too.
        # For simplicity here, we rely on app_context providing CSRF.
        self.app_context = app.app_context()
        self.app_context.push() # Push app context for form meta and CSRF
        self.client = app.test_client() # For session testing if needed by forms


    def tearDown(self):
        self.app_context.pop()

    def test_expenses_form_valid(self):
        with app.test_request_context('/'): # Need request context for CSRF
            form_data = {
                'annual_expenses': '50000', 'housing': '15000', 'food': '6000',
                'transportation': '5000', 'utilities': '3000', 'personal_care': '2000',
                'entertainment': '4000', 'healthcare': '3000', 'other_expenses': '1000'
            }
            # When testing forms directly that have CSRF, you might need to mock CSRF or handle it.
            # ExpensesForm() will generate a CSRF token if app.config['WTF_CSRF_ENABLED'] is True.
            # The data passed to it should be MultiDict or request.form like.
            from werkzeug.datastructures import MultiDict
            form = ExpensesForm(formdata=MultiDict(form_data))
            self.assertTrue(form.validate(), msg=form.errors)

    def test_expenses_form_invalid_missing_required(self):
        with app.test_request_context('/'):
            from werkzeug.datastructures import MultiDict
            form_data = {'annual_expenses': '50000'} # Missing other required fields
            form = ExpensesForm(formdata=MultiDict(form_data))
            self.assertFalse(form.validate())
            self.assertIn('housing', form.errors)

    def test_expenses_form_invalid_number_range(self):
        with app.test_request_context('/'):
            from werkzeug.datastructures import MultiDict
            form_data = {
                'annual_expenses': '-100', 'housing': '15000', 'food': '6000', # Negative annual_expenses
                'transportation': '5000', 'utilities': '3000', 'personal_care': '2000',
                'entertainment': '4000', 'healthcare': '3000', 'other_expenses': '1000'
            }
            form = ExpensesForm(formdata=MultiDict(form_data))
            self.assertFalse(form.validate())
            self.assertIn('annual_expenses', form.errors)

    def test_rates_form_valid(self):
        with app.test_request_context('/'):
            form_wtforms_data = {
                'return_rate': 7.0, 'inflation_rate': 2.5,
                'total_duration_fallback': 25,
                'desired_final_value': 10000.0,
                'withdrawal_time': 'start',
                'period_rates': [{'years': 10, 'rate': 5.0}]
            }
            form = RatesForm(data=form_wtforms_data)
            self.assertTrue(form.validate(), msg=form.errors)

    def test_rates_form_invalid_total_duration(self):
        with app.test_request_context('/'):
            form_wtforms_data = {'return_rate': 7.0, 'inflation_rate': 2.5, 'total_duration_fallback': 0, 'withdrawal_time': 'end'}
            form = RatesForm(data=form_wtforms_data)
            self.assertFalse(form.validate())
            self.assertIn('total_duration_fallback', form.errors)

    def test_rates_form_invalid_withdrawal_time(self):
        with app.test_request_context('/'):
            form_wtforms_data = {'return_rate': 7.0, 'inflation_rate': 2.5, 'withdrawal_time': 'middle', 'total_duration_fallback': 30}
            form = RatesForm(data=form_wtforms_data)
            self.assertFalse(form.validate())
            self.assertIn('withdrawal_time', form.errors)

    def test_rates_form_invalid_range(self): # Kept original invalid range test
        with app.test_request_context('/'):
            form_wtforms_data = {'return_rate': 200.0, 'inflation_rate': 2.5, 'total_duration_fallback': 30, 'withdrawal_time': 'end'}
            form = RatesForm(data=form_wtforms_data)
            self.assertFalse(form.validate())
            self.assertIn('return_rate', form.errors)

    def test_one_offs_form_valid(self):
        with app.test_request_context('/'):
            form_wtforms_data = {
                'large_expenses': [{'year': 2025, 'amount': 10000.0, 'description': 'Car'}],
                'large_incomes': [{'year': 2030, 'amount': 50000.0, 'description': 'Bonus'}]
            }
            form = OneOffsForm(data=form_wtforms_data)
            self.assertTrue(form.validate(), msg=form.errors)

    def test_one_offs_form_invalid_data_in_list(self):
        with app.test_request_context('/'):
            # Passing string for year to trigger validation error
            form_wtforms_data = {
                'large_expenses': [{'year': 'invalid_year', 'amount': 10000.0}]
            }
            form = OneOffsForm(data=form_wtforms_data)
            self.assertFalse(form.validate())
            self.assertIn('large_expenses', form.errors)
            # Check that the specific error is about the 'year' field in the subform
            self.assertTrue(any('year' in e for e in form.large_expenses.errors if isinstance(e, dict)))


class TestWizardRoutes(unittest.TestCase):
    def setUp(self):
        app.config['TESTING'] = True
        app.config['WTF_CSRF_ENABLED'] = False # Disable CSRF for easier testing of route logic
        app.config['SECRET_KEY'] = 'test_secret_key_for_routes' # Needed for session
        self.client = app.test_client()

    def tearDown(self):
        with self.client.session_transaction() as sess:
            sess.clear()

    def test_wizard_expenses_get(self):
        response = self.client.get(url_for('wizard_bp.wizard_expenses_step'))
        self.assertEqual(response.status_code, 200)
        self.assertIn(b"Step 1: Your Expenses", response.data)

    def test_wizard_expenses_post_valid(self):
        data = {
            'annual_expenses': '50000', 'housing': '15000', 'food': '6000',
            'transportation': '5000', 'utilities': '3000', 'personal_care': '2000',
            'entertainment': '4000', 'healthcare': '3000', 'other_expenses': '1000',
            'submit': 'Next: Rates'
        }
        response = self.client.post(url_for('wizard_bp.wizard_expenses_step'), data=data, follow_redirects=False)
        self.assertEqual(response.status_code, 302) # Redirect
        self.assertEqual(response.location, url_for('wizard_bp.wizard_rates_step'))
        with self.client.session_transaction() as sess:
            self.assertIn('wizard_expenses', sess)
            self.assertEqual(sess['wizard_expenses']['annual_expenses'], 50000.0)

    def test_wizard_expenses_post_invalid(self):
        data = {'annual_expenses': '-100', 'submit': 'Next: Rates'} # Invalid data, missing others
        response = self.client.post(url_for('wizard_bp.wizard_expenses_step'), data=data)
        self.assertEqual(response.status_code, 200) # Re-renders form
        self.assertIn(b"Step 1: Your Expenses", response.data)
        # Error messages are rendered by the _formhelpers.html macro
        self.assertIn(b"Number must be between 0 and", response.data) # Error message for annual_expenses
        self.assertIn(b"This field is required.", response.data) # Error for housing


    def test_wizard_expenses_post_calculates_total_from_itemized(self):
        data = {
            # annual_expenses is omitted or empty
            'housing': '15000', 'food': '6000', 'transportation': '5000',
            'utilities': '3000', 'personal_care': '2000', 'entertainment': '4000',
            'healthcare': '3000', 'other_expenses': '1000', # Sum = 39000
            'submit': 'Next: Rates'
        }
        # Try with annual_expenses as empty string
        data_empty_total = {**data, 'annual_expenses': ''}
        response = self.client.post(url_for('wizard_bp.wizard_expenses_step'), data=data_empty_total, follow_redirects=False)
        self.assertEqual(response.status_code, 302)
        with self.client.session_transaction() as sess:
            self.assertIn('wizard_expenses', sess)
            self.assertEqual(sess['wizard_expenses']['annual_expenses'], 39000.0)

        # Try with annual_expenses not present (should also work due to .get() on backend)
        # To ensure data_empty_total is a new dict for this part of the test if it was modified above.
        data_no_total_key = {
            'housing': '15000', 'food': '6000', 'transportation': '5000',
            'utilities': '3000', 'personal_care': '2000', 'entertainment': '4000',
            'healthcare': '3000', 'other_expenses': '1000',
            'submit': 'Next: Rates'
        }
        response = self.client.post(url_for('wizard_bp.wizard_expenses_step'), data=data_no_total_key, follow_redirects=False)
        self.assertEqual(response.status_code, 302)
        with self.client.session_transaction() as sess:
            self.assertIn('wizard_expenses', sess)
            self.assertEqual(sess['wizard_expenses']['annual_expenses'], 39000.0)


    def test_wizard_expenses_post_uses_submitted_total_over_itemized(self):
        data = {
            'annual_expenses': '100000', # User-defined total
            'housing': '15000', 'food': '6000', # Itemized sum to 21000, but total should override
            'transportation': '0', 'utilities': '0', 'personal_care': '0',
            'entertainment': '0', 'healthcare': '0', 'other_expenses': '0',
            'submit': 'Next: Rates'
        }
        response = self.client.post(url_for('wizard_bp.wizard_expenses_step'), data=data, follow_redirects=False)
        self.assertEqual(response.status_code, 302)
        with self.client.session_transaction() as sess:
            self.assertIn('wizard_expenses', sess)
            self.assertEqual(sess['wizard_expenses']['annual_expenses'], 100000.0)
            self.assertEqual(sess['wizard_expenses']['housing'], 15000.0)


    def test_wizard_rates_get_no_session_redirects_to_expenses(self):
        response = self.client.get(url_for('wizard_bp.wizard_rates_step'), follow_redirects=False)
        self.assertEqual(response.status_code, 302)
        self.assertEqual(response.location, url_for('wizard_bp.wizard_expenses_step'))

    def test_wizard_rates_get_with_session(self):
        with self.client.session_transaction() as sess:
            # Simulate previous step done with minimal valid data
            sess['wizard_expenses'] = {
                'annual_expenses': 50000.0, 'housing': 1.0, 'food': 1.0, 'transportation': 1.0,
                'utilities': 1.0, 'personal_care': 1.0, 'entertainment': 1.0,
                'healthcare': 1.0, 'other_expenses': 1.0
            }
        response = self.client.get(url_for('wizard_bp.wizard_rates_step'))
        self.assertEqual(response.status_code, 200)
        self.assertIn(b"Step 2: Rates & Inflation", response.data)

    def test_wizard_rates_post_valid(self):
        with self.client.session_transaction() as sess:
            sess['wizard_expenses'] = { # Ensure previous step's data is in session
                'annual_expenses': 50000.0, 'housing': 1.0, 'food': 1.0, 'transportation': 1.0,
                'utilities': 1.0, 'personal_care': 1.0, 'entertainment': 1.0,
                'healthcare': 1.0, 'other_expenses': 1.0
            }
        data = {
            'return_rate': '6', 'inflation_rate': '2',
            'period_rates-0-years': '5', 'period_rates-0-rate': '4', # Name format for POST data
            'submit': 'Next: One-Offs'
        }
        response = self.client.post(url_for('wizard_bp.wizard_rates_step'), data=data, follow_redirects=False)
        self.assertEqual(response.status_code, 302, msg=f"Response data: {response.data.decode()}")
        self.assertEqual(response.location, url_for('wizard_bp.wizard_one_offs_step'))
        with self.client.session_transaction() as sess:
            self.assertIn('wizard_rates', sess)
            self.assertEqual(sess['wizard_rates']['return_rate'], 6.0)
            self.assertTrue(len(sess['wizard_rates']['period_rates']) == 1)
            self.assertEqual(sess['wizard_rates']['period_rates'][0]['years'], 5)


    def test_wizard_rates_post_add_period(self):
        with self.client.session_transaction() as sess:
            sess['wizard_expenses'] = { # Previous step data
                'annual_expenses': 50000.0, 'housing': 1.0, 'food': 1.0, 'transportation': 1.0,
                'utilities': 1.0, 'personal_care': 1.0, 'entertainment': 1.0,
                'healthcare': 1.0, 'other_expenses': 1.0
            }
        data = {
            'return_rate': '7', 'inflation_rate': '3',
            'submit_add_period': 'Add Period Rate'
        }
        response = self.client.post(url_for('wizard_bp.wizard_rates_step'), data=data)
        self.assertEqual(response.status_code, 200)
        self.assertIn(b"Step 2: Rates & Inflation", response.data)
        self.assertIn(b'name="period_rates-0-years"', response.data) # Check for the first new entry


    def test_wizard_one_offs_get_no_session_redirects_to_rates(self):
        with self.client.session_transaction() as sess:
            sess['wizard_expenses'] = {'annual_expenses': 50000} # Needs expenses
        response = self.client.get(url_for('wizard_bp.wizard_one_offs_step'), follow_redirects=False)
        self.assertEqual(response.status_code, 302)
        self.assertEqual(response.location, url_for('wizard_bp.wizard_rates_step'))

    def test_wizard_one_offs_post_valid(self):
        with self.client.session_transaction() as sess:
            sess['wizard_expenses'] = { # Min data for previous steps
                'annual_expenses': 50000.0, 'housing': 1.0, 'food': 1.0, 'transportation': 1.0,
                'utilities': 1.0, 'personal_care': 1.0, 'entertainment': 1.0,
                'healthcare': 1.0, 'other_expenses': 1.0
            }
            sess['wizard_rates'] = {'return_rate': 5.0, 'inflation_rate': 2.0, 'period_rates': []}
        data = {
            'large_expenses-0-year': '2030', 'large_expenses-0-amount': '5000', 'large_expenses-0-description': 'Holiday',
            'large_incomes-0-year': '2035', 'large_incomes-0-amount': '20000', 'large_incomes-0-description': 'Gift',
            'submit': 'Next: Summary'
        }
        response = self.client.post(url_for('wizard_bp.wizard_one_offs_step'), data=data, follow_redirects=False)
        self.assertEqual(response.status_code, 302, msg=f"Response data: {response.data.decode()}")
        self.assertEqual(response.location, url_for('wizard_bp.wizard_summary_step'))
        with self.client.session_transaction() as sess:
            self.assertIn('wizard_one_offs', sess)
            self.assertEqual(sess['wizard_one_offs']['large_expenses'][0]['year'], 2030)


    def test_wizard_summary_get_no_session_redirects(self):
        response = self.client.get(url_for('wizard_bp.wizard_summary_step'), follow_redirects=False)
        self.assertEqual(response.status_code, 302)
        # Redirects to the first incomplete step if all are missing
        self.assertEqual(response.location, url_for('wizard_bp.wizard_expenses_step'))


        with self.client.session_transaction() as sess:
             sess['wizard_expenses'] = { # Min data for first step
                'annual_expenses': 50000.0, 'housing': 1.0, 'food': 1.0, 'transportation': 1.0,
                'utilities': 1.0, 'personal_care': 1.0, 'entertainment': 1.0,
                'healthcare': 1.0, 'other_expenses': 1.0
            }
        response = self.client.get(url_for('wizard_bp.wizard_summary_step'), follow_redirects=False)
        self.assertEqual(response.status_code, 302)
        self.assertEqual(response.location, url_for('wizard_bp.wizard_rates_step')) # Needs rates now

        with self.client.session_transaction() as sess:
            sess['wizard_expenses'] = {
                'annual_expenses': 50000.0, 'housing': 1.0, 'food': 1.0, 'transportation': 1.0,
                'utilities': 1.0, 'personal_care': 1.0, 'entertainment': 1.0,
                'healthcare': 1.0, 'other_expenses': 1.0
            }
            sess['wizard_rates'] = {'return_rate': 5.0, 'inflation_rate': 2.0, 'period_rates': []}
        response = self.client.get(url_for('wizard_bp.wizard_summary_step'), follow_redirects=False)
        self.assertEqual(response.status_code, 302)
        self.assertEqual(response.location, url_for('wizard_bp.wizard_one_offs_step')) # Needs one_offs


    def test_wizard_summary_get_with_all_sessions(self):
        with self.client.session_transaction() as sess:
            sess['wizard_expenses'] = {'annual_expenses': 50000, 'housing': 10000, 'food':1, 'transportation':1, 'utilities':1, 'personal_care':1, 'entertainment':1, 'healthcare':1, 'other_expenses':1}
            sess['wizard_rates'] = {'return_rate': 5, 'inflation_rate': 2, 'period_rates': []}
            sess['wizard_one_offs'] = {'large_expenses': [], 'large_incomes': []}
        response = self.client.get(url_for('wizard_bp.wizard_summary_step'))
        self.assertEqual(response.status_code, 200)
        self.assertIn(b"Wizard Summary", response.data)
        self.assertIn(b"50000", response.data)
        self.assertIn(b"5", response.data)


    @patch('project.wizard_routes.find_required_portfolio')
    @patch('project.wizard_routes.annual_simulation')
    @patch('project.wizard_routes.to_html')
    def test_wizard_calculate_step_success(self, mock_to_html, mock_annual_simulation, mock_find_portfolio):
        mock_find_portfolio.return_value = 500000.0
        mock_annual_simulation.return_value = (
            list(range(1, 31)),
            [500000 - i * 1000 for i in range(31)],
            [20000] * 30
        )
        mock_to_html.return_value = "<div>Mocked Plot</div>"

        with self.client.session_transaction() as sess:
            sess['wizard_expenses'] = {'annual_expenses': 20000.0, 'housing': 10000.0, 'food':1.0, 'transportation':1.0, 'utilities':1.0, 'personal_care':1.0, 'entertainment':1.0, 'healthcare':1.0, 'other_expenses':1.0}
            sess['wizard_rates'] = {
                'return_rate': 7.0, 'inflation_rate': 3.0,
                'total_duration_fallback': 30,
                'desired_final_value': 0.0,
                'withdrawal_time': 'end',
                'period_rates': []
            }
            sess['wizard_one_offs'] = {'large_expenses': [], 'large_incomes': []}

        response = self.client.post(url_for('wizard_bp.wizard_calculate_step'))
        self.assertEqual(response.status_code, 200)
        self.assertIn(b"Calculation Results", response.data)
        self.assertIn(b"500,000.00", response.data)
        self.assertIn(b"20,000.00", response.data)
        self.assertIn(b"Mocked Plot", response.data)
        mock_find_portfolio.assert_called_once()
        mock_annual_simulation.assert_called_once()
        self.assertEqual(mock_to_html.call_count, 2)

        with self.client.session_transaction() as sess:
            self.assertNotIn('wizard_expenses', sess)
            self.assertNotIn('wizard_rates', sess)
            self.assertNotIn('wizard_one_offs', sess)

    @patch('project.wizard_routes.find_required_portfolio')
    def test_wizard_calculate_step_portfolio_not_feasible(self, mock_find_portfolio):
        mock_find_portfolio.return_value = float('inf')

        with self.client.session_transaction() as sess:
            sess['wizard_expenses'] = {'annual_expenses': 100000.0, 'housing': 1.0, 'food':1.0, 'transportation':1.0, 'utilities':1.0, 'personal_care':1.0, 'entertainment':1.0, 'healthcare':1.0, 'other_expenses':1.0}
            sess['wizard_rates'] = {
                'return_rate': 1.0, 'inflation_rate': 5.0,
                'total_duration_fallback': 50,
                'desired_final_value': 0.0,
                'withdrawal_time': 'end', 'period_rates': []
            }
            sess['wizard_one_offs'] = {'large_expenses': [], 'large_incomes': []}

        response = self.client.post(url_for('wizard_bp.wizard_calculate_step'))
        self.assertEqual(response.status_code, 200)
        self.assertIn(b"Calculation Error", response.data)
        self.assertIn(b"Not Feasible", response.data)
        self.assertIn(b"Could not calculate a suitable portfolio", response.data)

    def test_wizard_calculate_step_incomplete_session(self):
        with self.client.session_transaction() as sess:
            sess['wizard_expenses'] = {'annual_expenses': 20000.0} # Missing other steps

        response = self.client.post(url_for('wizard_bp.wizard_calculate_step'), follow_redirects=True)
        self.assertEqual(response.status_code, 200)
        # Should redirect to the first step of the wizard, which is expenses.
        # The error message is flashed.
        self.assertIn(b"Step 1: Your Expenses", response.data)
        self.assertIn(b"Session data is incomplete. Please restart the wizard.", response.data)

    @patch('project.wizard_routes.find_required_portfolio')
    @patch('project.wizard_routes.annual_simulation')
    @patch('project.wizard_routes.to_html')
    def test_wizard_calculate_uses_period_rates_over_fallback_duration(self, mock_to_html, mock_annual_simulation, mock_find_portfolio):
        mock_find_portfolio.return_value = 600000.0
        mock_annual_simulation.return_value = (list(range(1, 21)), [600000]*21, [25000]*20)
        mock_to_html.return_value = "<div>Mocked Plot With Periods</div>"

        with self.client.session_transaction() as sess:
            sess['wizard_expenses'] = {'annual_expenses': 25000.0, 'housing': 1.0, 'food':1.0, 'transportation':1.0, 'utilities':1.0, 'personal_care':1.0, 'entertainment':1.0, 'healthcare':1.0, 'other_expenses':1.0}
            sess['wizard_rates'] = {
                'return_rate': 8.0, 'inflation_rate': 2.0,
                'total_duration_fallback': 30, # Should be ignored
                'desired_final_value': 5000.0,
                'withdrawal_time': 'start',
                'period_rates': [{'years': 10, 'rate': 6.0}, {'years': 10, 'rate': 5.0}] # Total 20 years
            }
            sess['wizard_one_offs'] = {'large_expenses': [], 'large_incomes': []}

        response = self.client.post(url_for('wizard_bp.wizard_calculate_step'))
        self.assertEqual(response.status_code, 200)
        mock_find_portfolio.assert_called_once()

        args, kwargs = mock_find_portfolio.call_args
        passed_rates_periods = kwargs.get('rates_periods')
        self.assertIsNotNone(passed_rates_periods)
        self.assertEqual(len(passed_rates_periods), 2)
        self.assertEqual(passed_rates_periods[0]['duration'], 10)
        self.assertEqual(passed_rates_periods[1]['duration'], 10)

        # Check that the summary on results page shows total duration from periods
        self.assertIn(b"Total Duration (from periods): 20 years", response.data)


    @patch('project.wizard_routes.find_required_portfolio')
    @patch('project.wizard_routes.annual_simulation')
    @patch('project.wizard_routes.to_html')
    def test_recalculate_interactive_changed_w_success(self, mock_to_html, mock_annual_simulation, mock_find_portfolio):
        mock_find_portfolio.return_value = 600000.0  # New P
        mock_annual_simulation.return_value = ([1,2], [600000, 580000], [25000, 25000]) # Dummy sim data
        mock_to_html.return_value = "<div>Mocked Plot HTML</div>"

        payload = {
            'changed_input': 'W',
            'W_value': 25000.0,
            'P_value': 500000.0, # Original P
            'r_overall_nominal': 0.07,
            'i_overall': 0.03,
            'total_duration_from_periods': 30,
            'withdrawal_time_str': 'end',
            'fixed_desired_final_value': 0.0,
            'rates_periods_summary': [{'duration': 30, 'r': 0.07, 'i': 0.03}],
            'one_off_events_summary': []
        }
        response = self.client.post(url_for('wizard_bp.wizard_recalculate_interactive'), json=payload)

        self.assertEqual(response.status_code, 200)
        json_data = response.get_json()

        self.assertNotIn('error', json_data)
        self.assertAlmostEqual(json_data['new_W'], 25000.0)
        self.assertAlmostEqual(json_data['new_P'], 600000.0)
        self.assertEqual(json_data['plot1_div_html'], "<div>Mocked Plot HTML</div>")
        self.assertEqual(json_data['plot2_div_html'], "<div>Mocked Plot HTML</div>")

        mock_find_portfolio.assert_called_once()
        mock_annual_simulation.assert_called_once()
        self.assertEqual(mock_to_html.call_count, 2)

    @patch('project.wizard_routes.find_max_annual_expense')
    @patch('project.wizard_routes.annual_simulation')
    @patch('project.wizard_routes.to_html')
    def test_recalculate_interactive_changed_p_success(self, mock_to_html, mock_annual_simulation, mock_find_max_expense):
        mock_find_max_expense.return_value = 28000.0  # New W
        mock_annual_simulation.return_value = ([1,2], [700000, 680000], [28000, 28000])
        mock_to_html.return_value = "<div>Mocked Plot P Change</div>"

        payload = {
            'changed_input': 'P',
            'W_value': 25000.0,
            'P_value': 700000.0,
            'r_overall_nominal': 0.07,
            'i_overall': 0.03,
            'total_duration_from_periods': 30,
            'withdrawal_time_str': 'end',
            'fixed_desired_final_value': 0.0,
            'rates_periods_summary': [{'duration': 30, 'r': 0.07, 'i': 0.03}],
            'one_off_events_summary': []
        }
        response = self.client.post(url_for('wizard_bp.wizard_recalculate_interactive'), json=payload)

        self.assertEqual(response.status_code, 200)
        json_data = response.get_json()

        self.assertNotIn('error', json_data)
        self.assertAlmostEqual(json_data['new_W'], 28000.0)
        self.assertAlmostEqual(json_data['new_P'], 700000.0)
        self.assertEqual(json_data['plot1_div_html'], "<div>Mocked Plot P Change</div>")

        mock_find_max_expense.assert_called_once()
        mock_annual_simulation.assert_called_once()
        self.assertEqual(mock_to_html.call_count, 2)

    def test_recalculate_interactive_invalid_changed_input(self):
        payload = {'changed_input': 'X', 'W_value': 25000, 'P_value': 500000}
        response = self.client.post(url_for('wizard_bp.wizard_recalculate_interactive'), json=payload)
        self.assertEqual(response.status_code, 400)
        json_data = response.get_json()
        self.assertIn('error', json_data)
        self.assertEqual(json_data['error'], 'Invalid changed_input value.')

    def test_recalculate_interactive_missing_payload_no_json_content_type(self):
        # Test when data is not JSON and Content-Type is not application/json
        response = self.client.post(url_for('wizard_bp.wizard_recalculate_interactive'), data="not json")
        self.assertEqual(response.status_code, 400) # request.get_json() returns None
        json_data = response.get_json()
        self.assertIn('error', json_data)
        self.assertEqual(json_data['error'], 'Invalid request: No JSON data received.')

    def test_recalculate_interactive_malformed_json(self):
        response = self.client.post(
            url_for('wizard_bp.wizard_recalculate_interactive'),
            data="{malformed_json_string",
            content_type='application/json'
        )
        # This will be caught by the main try-except in the route if get_json(silent=False) which is default
        self.assertEqual(response.status_code, 500)
        json_data = response.get_json()
        self.assertIn('error', json_data)
        self.assertEqual(json_data['error'], 'An unexpected server error occurred.')


    @patch('project.wizard_routes.find_required_portfolio')
    def test_recalculate_interactive_changed_w_calculation_fails(self, mock_find_portfolio):
        mock_find_portfolio.return_value = float('inf')

        payload = {
            'changed_input': 'W',
            'W_value': 100000.0,
            'P_value': 100000.0,
            'r_overall_nominal': 0.01, 'i_overall': 0.05,
            'total_duration_from_periods': 30, 'withdrawal_time_str': 'end',
            'fixed_desired_final_value': 0.0,
            'rates_periods_summary': [{'duration': 30, 'r': 0.01, 'i': 0.05}],
            'one_off_events_summary': []
        }
        response = self.client.post(url_for('wizard_bp.wizard_recalculate_interactive'), json=payload)
        self.assertEqual(response.status_code, 200)
        json_data = response.get_json()

        self.assertIn('error', json_data)
        self.assertEqual(json_data['error'], "Could not calculate a suitable portfolio for the new expenses.")
        self.assertAlmostEqual(json_data['new_W'], 100000.0)
        self.assertAlmostEqual(json_data['new_P'], 100000.0)

    @patch('project.wizard_routes.find_max_annual_expense')
    def test_recalculate_interactive_changed_p_calculation_fails(self, mock_find_max_expense):
        mock_find_max_expense.return_value = -1

        payload = {
            'changed_input': 'P',
            'W_value': 20000.0,
            'P_value': 100.0,
            'r_overall_nominal': 0.07, 'i_overall': 0.03,
            'total_duration_from_periods': 30, 'withdrawal_time_str': 'end',
            'fixed_desired_final_value': 1000000.0,
            'rates_periods_summary': [{'duration': 30, 'r': 0.07, 'i': 0.03}],
            'one_off_events_summary': []
        }
        response = self.client.post(url_for('wizard_bp.wizard_recalculate_interactive'), json=payload)
        self.assertEqual(response.status_code, 200)
        json_data = response.get_json()

        self.assertIn('error', json_data)
        self.assertEqual(json_data['error'], "Could not calculate a sustainable withdrawal for the new portfolio.")
        self.assertAlmostEqual(json_data['new_W'], 20000.0)
        self.assertAlmostEqual(json_data['new_P'], 100.0)


if __name__ == '__main__':
    unittest.main()
