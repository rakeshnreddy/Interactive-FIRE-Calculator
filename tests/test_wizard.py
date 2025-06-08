import unittest
from unittest.mock import patch
import sys
import os
from flask import session, url_for

# Add the root directory to sys.path to allow importing 'app'
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import app # Import the Flask app instance
from project.forms import ExpensesForm, RatesForm, OneOffsForm, PeriodRateForm, OneOffEntryForm

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
            # For FieldList, WTForms expects data in a specific way when not from request.form
            # It's often easier to test FieldLists via client posts or by constructing data carefully.
            form_wtforms_data = {
                'return_rate': 7.0, 'inflation_rate': 2.5,
                'period_rates': [{'years': 10, 'rate': 5.0}]
            }
            form = RatesForm(data=form_wtforms_data) # Using data= for this structure
            self.assertTrue(form.validate(), msg=form.errors)


    def test_rates_form_invalid_range(self):
        with app.test_request_context('/'):
            form_wtforms_data = {'return_rate': 200.0, 'inflation_rate': 2.5} # return_rate too high
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

if __name__ == '__main__':
    unittest.main()
