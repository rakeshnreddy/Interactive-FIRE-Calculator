from flask import Flask # Add Response (Flask is still needed, others are not)
# import numpy as np # No longer used directly in app.py
# import plotly.graph_objects as go # No longer used directly in app.py
# import plotly.offline as pyo # No longer used directly in app.py
import logging
import os
# import io # No longer used directly in app.py
# import csv # No longer used directly in app.py

app = Flask(__name__)

# Basic Logging Configuration
log_dir = os.path.join(os.path.dirname(__file__), 'logs')
if not os.path.exists(log_dir):
    os.makedirs(log_dir)
log_file = os.path.join(log_dir, 'app.log')
logging.basicConfig(
    filename=log_file,
    level=logging.INFO,
    format='%(asctime)s %(levelname)s %(name)s %(threadName)s : %(message)s'
)

# Flask App Configuration for specific constants
app.config['PV_MAX_GUESS_LIMIT'] = 1e12 # Safeguard limit for the upper bound in bisection search for find_required_portfolio.
app.config['W_MIN_GUESS_FOR_MAX_EXPENSE'] = 1.0 # Floor for the initial upper withdrawal guess in find_max_annual_expense bisection.
app.config['DEFAULT_TOLERANCE'] = 0.01 # Tolerance for bisection method convergence.

# Import functions and constants from new modules
# These specific financial calculation functions are now defined in financial_calcs.py
# and imported there if needed by other functions in financial_calcs.py.
# Routes in project/routes.py will import them directly from financial_calcs.py.
# from financial_calcs import annual_simulation, simulate_final_balance, find_required_portfolio, find_max_annual_expense
# from constants import MAX_SCENARIOS_COMPARE # MAX_SCENARIOS_COMPARE is used in routes.py

# Old global constants (DEFAULT_TOLERANCE, PV_MAX_GUESS_LIMIT, W_MIN_GUESS_FOR_MAX_EXPENSE) are now in app.config
# Old global constants (MODE_WITHDRAWAL, etc.) are now imported from constants.py (and used in routes.py)

# Financial calculation helper functions (simulate_final_balance, find_required_portfolio, find_max_annual_expense)
# are removed from here. Their canonical definitions are in financial_calcs.py.

# Route handler functions (index, update, compare, settings, export_csv) and their direct helpers 
# (generate_plots, generate_html_table) are moved to project/routes.py.

# Import routes after app is defined and configured
from project import routes # noqa: F401

if __name__ == '__main__':
    app.logger.info("Flask application starting in debug mode.")
    # Routes are now imported above, so they are registered before app.run()
    app.run(debug=True)
