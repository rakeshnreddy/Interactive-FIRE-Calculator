from flask import Blueprint, current_app, request, jsonify, render_template # render_template is now needed
from flask_babel import gettext, get_locale # Uncommented
from babel.numbers import format_currency # Uncommented
# # current_app is already imported via `from flask import ...`
# import numpy as np # Commented out
# import plotly.graph_objects as go # Commented out
# import plotly.offline as pyo # Commented out
# import io # Commented out
# import csv # Commented out
import datetime # Uncommented for settings route

# Assuming app.py is in the root directory.
# financial_calcs.py and constants.py are now in the same 'project' package.
# DO NOT: from app import app # This was causing the circular import
from .financial_calcs import annual_simulation, simulate_final_balance, find_required_portfolio, find_max_annual_expense # Uncommented
from .constants import MODE_WITHDRAWAL, MODE_PORTFOLIO, TIME_START, TIME_END, MAX_SCENARIOS_COMPARE # Uncommented

# DEFAULT_CURRENCY = 'USD' # Commented out, will use from app.config or define locally if needed by stub routes

project_blueprint = Blueprint('project', __name__)

# # def generate_html_table(years, balances, withdrawals):
# #     """
# #     Generates an HTML table string from the simulation data.
# #     Args:
# #         years (list or np.array): Array of years (0 to T).
# #         balances (list): List of portfolio balances corresponding to each year.
# #         withdrawals (list): List of annual withdrawals (for years 0 to T-1).
# #     Returns:
# #         str: HTML string representing the table.
# #     """
# #     if not years.any() or not balances or not withdrawals:
# #         return "<p>" + gettext("No data available to display in table.") + "</p>"
# #     locale_str = get_locale().language if get_locale() else 'en_US' # Default to en_US if locale is None
# #     header = "<thead><tr><th>" + gettext("Year") + \
# #              "</th><th>" + gettext("Portfolio Balance ({currency})").format(currency=DEFAULT_CURRENCY) + \
# #              "</th><th>" + gettext("Annual Withdrawal ({currency})").format(currency=DEFAULT_CURRENCY) + \
# #              "</th></tr></thead>"
# #     body_rows = []
# #     for t_idx in range(len(withdrawals)): # Iterate T times, for withdrawals
# #         year_display = int(years[t_idx] + 1) # Display as Year 1, Year 2, ...
# #         balance_at_year_end_or_start = balances[t_idx+1] # Balance after withdrawal and growth for year t_idx
# #         withdrawal_for_year = withdrawals[t_idx]
# #         formatted_balance = format_currency(balance_at_year_end_or_start, DEFAULT_CURRENCY, locale=locale_str)
# #         formatted_withdrawal = format_currency(withdrawal_for_year, DEFAULT_CURRENCY, locale=locale_str)
# #         body_rows.append(f"<tr><td>{year_display}</td><td>{formatted_balance}</td><td>{formatted_withdrawal}</td></tr>")
# #     return f"<table class='data-table'> {header} <tbody>{''.join(body_rows)}</tbody> </table>"

# # def generate_plots(W, withdrawal_time, mode, rates_periods, P_value=None, desired_final_value=0.0):
# #     """
# #     Calculates financial figures and generates Plotly plots for portfolio balance and withdrawals.
# #     Now uses rates_periods instead of fixed r, i, T.
# #     Args:
# #         W (float): Initial annual withdrawal.
# #         withdrawal_time (str): "start" or "end".
# #         mode (str): Calculation mode, 'W' (find portfolio for W) or 'P' (find W for portfolio P).
# #         rates_periods (list of dicts): List of rate periods.
# #         P_value (float, optional): Initial portfolio value (used if mode='P'). Defaults to None.
# #         desired_final_value (float, optional): Desired portfolio value at the end of T years. Defaults to 0.0.
# #     Returns:
# #         tuple: (required_portfolio_or_P_value, calculated_W, portfolio_plot_div, withdrawal_plot_div, table_html)
# #     """
# #     if not rates_periods: # Should be caught by calling routes, but defensive check.
# #         return 0, 0, "<div>" + gettext("Error: No rate periods provided.") + "</div>", "<div></div>", "<p>" + gettext("Table data error.") + "</p>"
# #     if mode == MODE_WITHDRAWAL:
# #         required_portfolio = find_required_portfolio(W, withdrawal_time, rates_periods, desired_final_value=desired_final_value)
# #         calculated_W = W
# #         if required_portfolio == float('inf'):
# #             error_message = "<div>" + gettext("Cannot find a suitable portfolio. Withdrawals may be too high or periods too long/unfavorable.") + "</div>"
# #             return float('inf'), calculated_W, error_message, "<div></div>", "<p>" + gettext("Table data not available due to error.") + "</p>"
# #     else: # mode == MODE_PORTFOLIO
# #         required_portfolio = P_value
# #         calculated_W = find_max_annual_expense(required_portfolio, withdrawal_time, rates_periods, desired_final_value=desired_final_value)
# #     if calculated_W is None or (isinstance(calculated_W, float) and (np.isnan(calculated_W) or np.isinf(calculated_W))):
# #         error_message = "<div>" + gettext("Error calculating sustainable withdrawal. Inputs might be unrealistic for the given portfolio.") + "</div>"
# #         return required_portfolio, 0, error_message, "<div></div>", "<p>" + gettext("Table data not available due to error in withdrawal calculation.") + "</p>"
# #     years, balances, sim_withdrawals = annual_simulation(required_portfolio, calculated_W, withdrawal_time, rates_periods)
# #     plot_config = {'displayModeBar': False, 'responsive': True}
# #     locale_str = get_locale().language if get_locale() else 'en_US'
# #     fig1 = go.Figure()
# #     formatted_balances_hover = [format_currency(b, DEFAULT_CURRENCY, locale=locale_str) for b in balances]
# #     fig1.add_trace(go.Scatter(
# #         x=years, y=balances,
# #         mode='lines+markers',
# #         name=gettext('Portfolio Balance'),
# #         customdata=[(fb,) for fb in formatted_balances_hover],
# #         hovertemplate=gettext('Year: %{x}<br>Balance: %{customdata[0]}<extra></extra>')
# #     ))
# #     fig1.update_layout(
# #         title=gettext('Portfolio Balance (Withdrawals at %(withdrawal_time)s)', withdrawal_time=withdrawal_time.capitalize()),
# #         xaxis_title=gettext('Years'),
# #         yaxis_title=gettext('Portfolio Value ({currency})').format(currency=DEFAULT_CURRENCY)
# #     )
# #     portfolio_plot = pyo.plot(fig1, include_plotlyjs=False, output_type='div', config=plot_config)
# #     fig2 = go.Figure()
# #     formatted_withdrawals_hover = [format_currency(w, DEFAULT_CURRENCY, locale=locale_str) for w in sim_withdrawals]
# #     fig2.add_trace(go.Scatter(
# #         x=years[:-1], y=sim_withdrawals,
# #         mode='lines+markers',
# #         name=gettext('Annual Withdrawal'),
# #         marker_color='orange',
# #         customdata=[(fw,) for fw in formatted_withdrawals_hover],
# #         hovertemplate=gettext('Year: %{x}<br>Withdrawal: %{customdata[0]}<extra></extra>'),
# #         uid="unique_withdrawal"
# #     ))
# #     fig2.update_layout(
# #         title=gettext('Annual Withdrawals'),
# #         xaxis_title=gettext('Years'),
# #         yaxis_title=gettext('Withdrawal ({currency})').format(currency=DEFAULT_CURRENCY)
# #     )
# #     withdrawal_plot = pyo.plot(fig2, include_plotlyjs=False, output_type='div', config=plot_config)
# #     table_html = generate_html_table(years, balances, sim_withdrawals)
# #     return required_portfolio, calculated_W, portfolio_plot, withdrawal_plot, table_html

@project_blueprint.route('/', methods=['GET', 'POST'])
def index():
    current_app.logger.info(f"Index route called (minimal). Method: {request.method}")
    return f"Index route reached successfully (minimal). Method: {request.method}"

@project_blueprint.route('/update', methods=['POST'])
def update():
    current_app.logger.info(f"Update route called (minimal). Method: {request.method}")
    return jsonify({"message": "Update route reached successfully (minimal)"})

@project_blueprint.route('/compare', methods=['GET', 'POST'])
def compare():
    current_app.logger.info(f"Compare route called (minimal). Method: {request.method}")
    if request.method == 'POST':
        return jsonify({"message": "Compare route reached successfully (minimal POST)"})
    return "Compare route reached successfully (minimal GET)"

@project_blueprint.route('/settings')
def settings():
    current_app.logger.info(f"Settings route called. Method: {request.method}")
    # current_year = datetime.datetime.now().year # Original line
    # return render_template("settings.html", current_year=current_year) # Original line
    current_year = datetime.datetime.now().year
    return render_template("settings.html", current_year=current_year)

@project_blueprint.route('/export_csv')
def export_csv():
    current_app.logger.info(f"Export CSV route called (minimal). Args: {request.args}")
    return f"Export CSV route reached successfully (minimal). Args: {request.args}"

@project_blueprint.route('/about')
def about():
    current_app.logger.info(f"About route called (minimal). Method: {request.method}")
    return f"About route reached successfully (minimal). Method: {request.method}"

@project_blueprint.route('/faq')
def faq():
    current_app.logger.info(f"FAQ route called (minimal). Method: {request.method}")
    return f"FAQ route reached successfully (minimal). Method: {request.method}"

def register_app_routes(app_instance):
    app_instance.logger.info("Attempting to register project_blueprint (minimal version with simplified routes).")
    app_instance.register_blueprint(project_blueprint)
    app_instance.logger.info("project_blueprint (minimal version) registered.")
