from flask import Blueprint, current_app, request, jsonify, render_template, Response
from flask_babel import gettext, get_locale
from babel.numbers import format_currency
import numpy as np
import plotly.graph_objects as go
import plotly.offline as pyo
import io # Keep for export_csv later, but not strictly needed by current active routes
import csv # Keep for export_csv later
import datetime

from .financial_calcs import annual_simulation, simulate_final_balance, find_required_portfolio, find_max_annual_expense
from .constants import MODE_WITHDRAWAL, MODE_PORTFOLIO, TIME_START, TIME_END, MAX_SCENARIOS_COMPARE

DEFAULT_CURRENCY = 'USD'

project_blueprint = Blueprint('project', __name__)

def generate_html_table(years, balances, withdrawals):
    if not np.any(years) or not balances or not withdrawals:
        return "<p>" + gettext("No data available to display in table.") + "</p>"
    locale_str = get_locale().language if get_locale() else 'en_US'
    header = "<thead><tr><th>" + gettext("Year") + \
             "</th><th>" + gettext("Portfolio Balance ({currency})").format(currency=DEFAULT_CURRENCY) + \
             "</th><th>" + gettext("Annual Withdrawal ({currency})").format(currency=DEFAULT_CURRENCY) + \
             "</th></tr></thead>"
    body_rows = []
    for t_idx in range(len(withdrawals)):
        year_display = int(years[t_idx] + 1)
        balance_at_year_end_or_start = balances[t_idx+1]
        withdrawal_for_year = withdrawals[t_idx]
        formatted_balance = format_currency(balance_at_year_end_or_start, DEFAULT_CURRENCY, locale=locale_str)
        formatted_withdrawal = format_currency(withdrawal_for_year, DEFAULT_CURRENCY, locale=locale_str)
        body_rows.append(f"<tr><td>{year_display}</td><td>{formatted_balance}</td><td>{formatted_withdrawal}</td></tr>")
    return f"<table class='data-table'> {header} <tbody>{''.join(body_rows)}</tbody> </table>"

def generate_plots(W, withdrawal_time, mode, rates_periods, P_value=None, desired_final_value=0.0):
    if not rates_periods:
        return 0, 0, "<div>" + gettext("Error: No rate periods provided.") + "</div>", "<div></div>", "<p>" + gettext("Table data error.") + "</p>"
    if mode == MODE_WITHDRAWAL:
        required_portfolio = find_required_portfolio(W, withdrawal_time, rates_periods, desired_final_value=desired_final_value)
        calculated_W = W
        if required_portfolio == float('inf'):
            error_message = "<div>" + gettext("Cannot find a suitable portfolio. Withdrawals may be too high or periods too long/unfavorable.") + "</div>"
            return float('inf'), calculated_W, error_message, "<div></div>", "<p>" + gettext("Table data not available due to error.") + "</p>"
    else: # MODE_PORTFOLIO
        required_portfolio = P_value
        calculated_W = find_max_annual_expense(required_portfolio, withdrawal_time, rates_periods, desired_final_value=desired_final_value)
    if calculated_W is None or (isinstance(calculated_W, float) and (np.isnan(calculated_W) or np.isinf(calculated_W))):
        error_message = "<div>" + gettext("Error calculating sustainable withdrawal. Inputs might be unrealistic for the given portfolio.") + "</div>"
        return required_portfolio, 0, error_message, "<div></div>", "<p>" + gettext("Table data not available due to error in withdrawal calculation.") + "</p>"
    years, balances, sim_withdrawals = annual_simulation(required_portfolio, calculated_W, withdrawal_time, rates_periods)
    plot_config = {'displayModeBar': False, 'responsive': True}
    locale_str = get_locale().language if get_locale() else 'en_US'
    fig1 = go.Figure()
    formatted_balances_hover = [format_currency(b, DEFAULT_CURRENCY, locale=locale_str) for b in balances]
    fig1.add_trace(go.Scatter(
        x=years, y=balances, mode='lines+markers', name=gettext('Portfolio Balance'),
        customdata=[(fb,) for fb in formatted_balances_hover],
        hovertemplate=gettext('Year: %{x}<br>Balance: %{customdata[0]}<extra></extra>')
    ))
    fig1.update_layout(
        title=gettext('Portfolio Balance (Withdrawals at %(withdrawal_time)s)', withdrawal_time=withdrawal_time.capitalize()),
        xaxis_title=gettext('Years'), yaxis_title=gettext('Portfolio Value ({currency})').format(currency=DEFAULT_CURRENCY)
    )
    portfolio_plot = pyo.plot(fig1, include_plotlyjs=False, output_type='div', config=plot_config)
    fig2 = go.Figure()
    formatted_withdrawals_hover = [format_currency(w, DEFAULT_CURRENCY, locale=locale_str) for w in sim_withdrawals]
    fig2.add_trace(go.Scatter(
        x=years[:-1], y=sim_withdrawals, mode='lines+markers', name=gettext('Annual Withdrawal'),
        marker_color='orange', customdata=[(fw,) for fw in formatted_withdrawals_hover],
        hovertemplate=gettext('Year: %{x}<br>Withdrawal: %{customdata[0]}<extra></extra>'),
        uid="unique_withdrawal"
    ))
    fig2.update_layout(
        title=gettext('Annual Withdrawals'), xaxis_title=gettext('Years'),
        yaxis_title=gettext('Withdrawal ({currency})').format(currency=DEFAULT_CURRENCY)
    )
    withdrawal_plot = pyo.plot(fig2, include_plotlyjs=False, output_type='div', config=plot_config)
    table_html = generate_html_table(years, balances, sim_withdrawals)
    return required_portfolio, calculated_W, portfolio_plot, withdrawal_plot, table_html

@project_blueprint.route('/', methods=['GET', 'POST'])
def index():
    current_app.logger.info(f"Index route called. Method: {request.method}")
    if request.method == 'POST':
        form_data = request.form.to_dict()
        form_params_for_result_page = {
            'W': form_data.get('W', '20000'), 'r': form_data.get('r', '5'), 'i': form_data.get('i', '2'),
            'T': form_data.get('T', '30'), 'D': form_data.get('D', '0.0'),
            'withdrawal_time': form_data.get('withdrawal_time', TIME_END),
            'mode': form_data.get('mode', MODE_WITHDRAWAL), 'P': form_data.get('P', '500000'),
            'period1_duration': form_data.get('period1_duration', ''), 'period1_r': form_data.get('period1_r', ''), 'period1_i': form_data.get('period1_i', ''),
            'period2_duration': form_data.get('period2_duration', ''), 'period2_r': form_data.get('period2_r', ''), 'period2_i': form_data.get('period2_i', ''),
            'period3_duration': form_data.get('period3_duration', ''), 'period3_r': form_data.get('period3_r', ''), 'period3_i': form_data.get('period3_i', ''),
        }
        try:
            W_form = float(form_data.get('W', 0))
            withdrawal_time_form = form_data.get('withdrawal_time', TIME_END)
            mode_form = form_data.get('mode', MODE_WITHDRAWAL)
            D_form_str = form_data.get('D', '0.0')
            D_form = float(D_form_str) if D_form_str else 0.0
            if D_form < 0: raise ValueError(gettext("Desired final portfolio value (D) cannot be negative."))
            if W_form < 0: raise ValueError(gettext("Annual withdrawal (W) cannot be negative."))
            rates_periods_data = []
            for k in range(1, 4):
                dur_str = form_data.get(f'period{k}_duration')
                r_str = form_data.get(f'period{k}_r')
                i_str = form_data.get(f'period{k}_i')
                if dur_str and r_str and i_str:
                    try:
                        duration = int(dur_str)
                        r_perc = float(r_str)
                        i_perc = float(i_str)
                        if duration > 0:
                            if not (-50 <= r_perc <= 100): raise ValueError(gettext("Period %(k)s annual return (r) must be between -50% and 100%.", k=k))
                            if not (-50 <= i_perc <= 100): raise ValueError(gettext("Period %(k)s inflation rate (i) must be between -50% and 100%.", k=k))
                            rates_periods_data.append({'duration': duration, 'r': r_perc / 100, 'i': i_perc / 100})
                        elif duration < 0: raise ValueError(gettext("Period %(k)s duration cannot be negative.", k=k))
                    except ValueError as e:
                        current_app.logger.error(f"Invalid input for period {k}: {e} - Form data for period: dur='{dur_str}', r='{r_str}', i='{i_str}'")
                        return render_template('index.html', error=str(e), defaults=form_params_for_result_page, current_year=datetime.datetime.now().year)
            if not rates_periods_data:
                r_perc_form = float(form_data.get('r', 0)); i_perc_form = float(form_data.get('i', 0)); T_form = int(form_data.get('T', 0))
                if T_form <= 0: raise ValueError(gettext("Time horizon (T) must be greater than 0 for single period mode."))
                if not (-50 <= r_perc_form <= 100): raise ValueError(gettext("Annual return (r) must be between -50% and 100%."))
                if not (-50 <= i_perc_form <= 100): raise ValueError(gettext("Inflation rate (i) must be between -50% and 100%."))
                rates_periods_data.append({'duration': T_form, 'r': r_perc_form / 100, 'i': i_perc_form / 100})
            P_value_form = None
            if mode_form == MODE_PORTFOLIO:
                P_value_form = float(form_data.get('P', 0))
                if P_value_form < 0: raise ValueError(gettext("Initial portfolio (P) cannot be negative."))
        except ValueError as e:
            current_app.logger.error(f"Invalid input in index route: {e} - Form data: {form_data}")
            return render_template('index.html', error=str(e), defaults=form_params_for_result_page, current_year=datetime.datetime.now().year)

        calculated_P_output, initial_W_input_for_fire_mode, portfolio_plot_W_mode, withdrawal_plot_W_mode, table_data_W_mode_html = "N/A", W_form, "", "", ""
        calculated_W_output_for_expense_mode, initial_P_input_for_expense_mode_raw, portfolio_plot_P_mode, withdrawal_plot_P_mode, table_data_P_mode_html = "N/A", P_value_form, "", "", ""

        if mode_form == MODE_WITHDRAWAL:
            P_calc_primary, W_actual_primary, p_plot_w, w_plot_w, table_w = generate_plots(W_form, withdrawal_time_form, MODE_WITHDRAWAL, rates_periods_data, None, D_form)
            if P_calc_primary == float('inf'):
                return render_template('index.html', error=gettext("Cannot find a suitable portfolio for the given withdrawal. Inputs may be unrealistic."), defaults=form_params_for_result_page, current_year=datetime.datetime.now().year)
            calculated_P_output, initial_W_input_for_fire_mode, portfolio_plot_W_mode, withdrawal_plot_W_mode, table_data_W_mode_html = P_calc_primary, W_actual_primary, p_plot_w, w_plot_w, table_w
            initial_P_input_for_expense_mode_raw = P_calc_primary
            _, W_calc_secondary, p_plot_p, w_plot_p, table_p = generate_plots(initial_W_input_for_fire_mode, withdrawal_time_form, MODE_PORTFOLIO, rates_periods_data, initial_P_input_for_expense_mode_raw, D_form)
            calculated_W_output_for_expense_mode, portfolio_plot_P_mode, withdrawal_plot_P_mode, table_data_P_mode_html = W_calc_secondary, p_plot_p, w_plot_p, table_p
        elif mode_form == MODE_PORTFOLIO:
            P_actual_primary, W_calc_primary, p_plot_p, w_plot_w, table_p = generate_plots(W_form, withdrawal_time_form, MODE_PORTFOLIO, rates_periods_data, P_value_form, D_form)
            initial_P_input_for_expense_mode_raw, calculated_W_output_for_expense_mode, portfolio_plot_P_mode, withdrawal_plot_P_mode, table_data_P_mode_html = P_actual_primary, W_calc_primary, p_plot_p, w_plot_w, table_p
            initial_W_input_for_fire_mode = W_calc_primary
            P_calc_secondary, _, p_plot_w, w_plot_w, table_w = generate_plots(initial_W_input_for_fire_mode, withdrawal_time_form, MODE_WITHDRAWAL, rates_periods_data, None, D_form)
            calculated_P_output, portfolio_plot_W_mode, withdrawal_plot_W_mode, table_data_W_mode_html = P_calc_secondary, p_plot_w, w_plot_w, table_w

        initial_P_input_for_expense_mode_template = "N/A" if initial_P_input_for_expense_mode_raw == float('inf') else initial_P_input_for_expense_mode_raw
        if len(rates_periods_data) == 1:
            form_params_for_result_page.update({'r_form_val': rates_periods_data[0]['r'] * 100, 'i_form_val': rates_periods_data[0]['i'] * 100, 'T_form_val': rates_periods_data[0]['duration']})
        form_params_for_result_page.update({'D_form_val': D_form, 'withdrawal_time_form_val': withdrawal_time_form, 'initial_mode_from_index': mode_form})
        P_for_js = P_value_form if mode_form == MODE_PORTFOLIO and P_value_form is not None else (calculated_P_output if mode_form == MODE_WITHDRAWAL and isinstance(calculated_P_output, (int, float)) else 0.0)
        form_params_for_result_page.update({'P_input_raw_for_js': P_for_js, 'TIME_END_const': TIME_END, 'MODE_WITHDRAWAL_const': MODE_WITHDRAWAL})

        locale_str = get_locale().language if get_locale() else 'en_US'
        template_context = {
            **form_params_for_result_page,
            'fire_W_input_val': initial_W_input_for_fire_mode,
            'fire_P_calculated_val': format_currency(calculated_P_output, DEFAULT_CURRENCY, locale=locale_str) if isinstance(calculated_P_output, (int, float)) and calculated_P_output != float('inf') else gettext("N/A"),
            'portfolio_plot_fire': portfolio_plot_W_mode, 'withdrawal_plot_fire': withdrawal_plot_W_mode, 'table_data_fire_html': table_data_W_mode_html,
            'expense_P_input_val': initial_P_input_for_expense_mode_template,
            'expense_W_calculated_val': format_currency(calculated_W_output_for_expense_mode, DEFAULT_CURRENCY, locale=locale_str) if isinstance(calculated_W_output_for_expense_mode, (int, float)) else gettext("N/A"),
            'portfolio_plot_expense': portfolio_plot_P_mode, 'withdrawal_plot_expense': withdrawal_plot_P_mode, 'table_data_expense_html': table_data_P_mode_html,
            'rates_periods_info_json': rates_periods_data
        }
        template_context['current_year'] = datetime.datetime.now().year
        return render_template('result.html', **template_context)
    else: # GET request
        default_form_data = {
            'W': '20000', 'r': '5', 'i': '2', 'T': '30', 'D': '0.0', 'withdrawal_time': TIME_END,
            'mode': MODE_WITHDRAWAL, 'P': '500000', 'error': None,
            'period1_duration': '', 'period1_r': '', 'period1_i': '', 'period2_duration': '', 'period2_r': '', 'period2_i': '',
            'period3_duration': '', 'period3_r': '', 'period3_i': '',
        }
        default_form_data['current_year'] = datetime.datetime.now().year
        return render_template('index.html', defaults=default_form_data, current_year=default_form_data.get('current_year'))

@project_blueprint.route('/update', methods=['POST'])
def update():
    current_app.logger.info(f"Update route called. Method: {request.method}")
    form_data = request.form
    W_form, D_form, withdrawal_time, P_value, rates_periods_data = 0.0, 0.0, TIME_END, 0.0, []
    try:
        W_form = float(form_data.get('W', '0')); D_form_str = form_data.get('D', '0.0'); D_form = float(D_form_str) if D_form_str else 0.0
        withdrawal_time = form_data.get('withdrawal_time', TIME_END); P_value = float(form_data.get('P', '0'))
        if W_form < 0: raise ValueError(gettext("Annual withdrawal (W) cannot be negative."))
        if D_form < 0: raise ValueError(gettext("Desired final portfolio value (D) cannot be negative."))
        if P_value < 0: raise ValueError(gettext("Initial Portfolio (P) must be >= 0."))
        for k in range(1, 4):
            dur_str, r_str, i_str = form_data.get(f'period{k}_duration'), form_data.get(f'period{k}_r'), form_data.get(f'period{k}_i')
            if dur_str and r_str and i_str:
                try:
                    duration, r_perc, i_perc = int(dur_str), float(r_str), float(i_str)
                    if duration > 0:
                        if not (-50 <= r_perc <= 100): raise ValueError(gettext("Period %(k)s annual return (r) must be between -50% and 100%.", k=k))
                        if not (-50 <= i_perc <= 100): raise ValueError(gettext("Period %(k)s inflation rate (i) must be between -50% and 100%.", k=k))
                        rates_periods_data.append({'duration': duration, 'r': r_perc / 100, 'i': i_perc / 100})
                    elif duration < 0: raise ValueError(gettext("Period %(k)s duration cannot be negative.", k=k))
                except ValueError as e: raise ValueError(gettext("Invalid input for period %(k)s: %(error)s", k=k, error=str(e)))
        if not rates_periods_data:
            r_perc_form, i_perc_form, T_form = float(form_data.get('r', '0')), float(form_data.get('i', '0')), int(form_data.get('T', '0'))
            if T_form <= 0: raise ValueError(gettext("Time horizon (T) must be greater than 0 for single period mode."))
            if not (-50 <= r_perc_form <= 100): raise ValueError(gettext("Annual return (r) must be between -50% and 100%."))
            if not (-50 <= i_perc_form <= 100): raise ValueError(gettext("Inflation rate (i) must be between -50% and 100%."))
            rates_periods_data.append({'duration': T_form, 'r': r_perc_form / 100, 'i': i_perc_form / 100})
    except ValueError as e:
        current_app.logger.error(f"Invalid input (ValueError) in update route: {e} - Form data: {form_data}")
        return jsonify({'error': gettext('Invalid input: %(error)s', error=str(e))})
    except Exception as e:
        current_app.logger.error(f"Unexpected error during input processing in update route: {e} - Form data: {form_data}", exc_info=True)
        return jsonify({'error': gettext('An unexpected error occurred while processing inputs.')})

    required_portfolio_W, actual_W_for_mode_W, portfolio_plot_W, withdrawal_plot_W, table_data_W_html = generate_plots(W_form, withdrawal_time, MODE_WITHDRAWAL, rates_periods_data, None, D_form)
    input_P_for_mode_P, calculated_W_for_mode_P, portfolio_plot_P, withdrawal_plot_P, table_data_P_html = generate_plots(W_form, withdrawal_time, MODE_PORTFOLIO, rates_periods_data, P_value, D_form)
    locale_str_update = get_locale().language if get_locale() else 'en_US'
    return jsonify({
        'fire_number_W': format_currency(required_portfolio_W, DEFAULT_CURRENCY, locale=locale_str_update) if required_portfolio_W != float('inf') else gettext("N/A"),
        'annual_expense_W': format_currency(actual_W_for_mode_W, DEFAULT_CURRENCY, locale=locale_str_update),
        'portfolio_plot_W': portfolio_plot_W, 'withdrawal_plot_W': withdrawal_plot_W, 'table_data_W_html': table_data_W_html,
        'fire_number_P': format_currency(input_P_for_mode_P, DEFAULT_CURRENCY, locale=locale_str_update) if input_P_for_mode_P != float('inf') else gettext("N/A"),
        'annual_expense_P': format_currency(calculated_W_for_mode_P, DEFAULT_CURRENCY, locale=locale_str_update),
        'portfolio_plot_P': portfolio_plot_P, 'withdrawal_plot_P': withdrawal_plot_P, 'table_data_P_html': table_data_P_html
    })

@project_blueprint.route('/compare', methods=['GET', 'POST'])
def compare():
    current_app.logger.info(f"Compare route called. Method: {request.method}")
    if request.method == 'POST':
        form_data = request.form
        scenarios_data_for_template = []
        for n in range(1, MAX_SCENARIOS_COMPARE + 1):
            scenario_input = {'n': n, 'enabled': form_data.get(f"scenario{n}_enabled") == "on"}
            scenario_input.update({k: form_data.get(f"scenario{n}_{k.split('_form')[0]}", "") for k in ['W_form', 'r_form', 'i_form', 'T_form', 'D_form', 'withdrawal_time_form']})
            for p_num in range(1, 4): scenario_input.update({f'period{p_num}_{field}_form': form_data.get(f"scenario{n}_period{p_num}_{field}", "") for field in ['duration', 'r', 'i']})
            if not scenario_input['enabled']:
                scenario_input.update({'error': gettext("Scenario %(n)s: Not enabled by user.", n=n), 'fire_number_display': gettext("N/A")})
                scenarios_data_for_template.append(scenario_input); continue
            try:
                W_val, D_val, withdrawal_time_val = float(scenario_input['W_form']), float(scenario_input['D_form']), scenario_input['withdrawal_time_form']
                if W_val < 0: raise ValueError(gettext("Withdrawal (W) cannot be negative."))
                if D_val < 0: raise ValueError(gettext("Desired Final Value (D) cannot be negative."))
                scenario_rates_periods = []
                for p_num in range(1, 4):
                    dur_str, r_str, i_str = form_data.get(f"scenario{n}_period{p_num}_duration"), form_data.get(f"scenario{n}_period{p_num}_r"), form_data.get(f"scenario{n}_period{p_num}_i")
                    if dur_str and r_str and i_str:
                        duration, r_perc, i_perc = int(dur_str), float(r_str), float(i_str)
                        if duration > 0:
                            if not (-50 <= r_perc <= 100): raise ValueError(gettext("Period %(p_num)s annual return (r) must be between -50% and 100%.", p_num=p_num))
                            if not (-50 <= i_perc <= 100): raise ValueError(gettext("Period %(p_num)s inflation rate (i) must be between -50% and 100%.", p_num=p_num))
                            scenario_rates_periods.append({'duration': duration, 'r': r_perc / 100, 'i': i_perc / 100})
                        elif duration < 0: raise ValueError(gettext("Period %(p_num)s duration cannot be negative.", p_num=p_num))
                if not scenario_rates_periods:
                    r_perc_single, i_perc_single, T_single = float(scenario_input['r_form']), float(scenario_input['i_form']), int(scenario_input['T_form'])
                    if T_single <= 0: raise ValueError(gettext("Time (T) must be > 0 for single period mode."))
                    if not (-50 <= r_perc_single <= 100): raise ValueError(gettext("Annual return (r) must be between -50% and 100%."))
                    if not (-50 <= i_perc_single <= 100): raise ValueError(gettext("Inflation rate (i) must be between -50% and 100%."))
                    scenario_rates_periods.append({'duration': T_single, 'r': r_perc_single / 100, 'i': i_perc_single / 100})
                scenario_input['rates_periods_data'] = scenario_rates_periods
                portfolio = find_required_portfolio(W_val, withdrawal_time_val, scenario_rates_periods, D_val)
                if portfolio == float('inf'):
                    scenario_input.update({'error': gettext("Scenario %(n)s: Cannot find suitable portfolio (inputs unrealistic).", n=n), 'fire_number': gettext("N/A"), 'years_data': [], 'balances_data': [], 'withdrawals_data': []})
                else:
                    years, balances, withdrawals = annual_simulation(portfolio, W_val, withdrawal_time_val, scenario_rates_periods)
                    scenario_input.update({'fire_number': portfolio, 'years_data': years.tolist(), 'balances_data': balances, 'withdrawals_data': withdrawals})
                scenario_input['fire_number_display'] = format_currency(portfolio, DEFAULT_CURRENCY, locale=(get_locale().language if get_locale() else 'en_US')) if isinstance(portfolio, (int, float)) and portfolio != float('inf') else gettext("N/A")
            except ValueError as e:
                current_app.logger.error(f"Invalid input for scenario {n} in compare route: {e}")
                scenario_input.update({'error': gettext("Scenario %(n)s: %(error)s", n=n, error=str(e)), 'fire_number_display': gettext("N/A"), 'enabled': False})
            scenarios_data_for_template.append(scenario_input)

        plottable_scenarios = [s for s in scenarios_data_for_template if s.get('enabled') and not s.get('error') and 'years_data' in s and s['years_data']]
        combined_balance_plot_html, combined_withdrawal_plot_html, message = "", "", ""
        if not plottable_scenarios: message = gettext("No valid scenarios to plot. Please check inputs or enable scenarios.")
        else:
            plot_config, locale_str_compare = {'displayModeBar': False, 'responsive': True}, (get_locale().language if get_locale() else 'en_US')
            fig_balance, fig_withdrawal = go.Figure(), go.Figure()
            for sc_data in plottable_scenarios:
                formatted_balances_compare = [format_currency(b, DEFAULT_CURRENCY, locale=locale_str_compare) for b in sc_data["balances_data"]]
                formatted_withdrawals_compare = [format_currency(w, DEFAULT_CURRENCY, locale=locale_str_compare) for w in sc_data["withdrawals_data"]]
                fig_balance.add_trace(go.Scatter(x=sc_data["years_data"], y=sc_data["balances_data"], mode='lines+markers', name=gettext("Scenario %(n)s Balance", n=sc_data['n']), customdata=[(fb,) for fb in formatted_balances_compare], hovertemplate=gettext('Year: %{x}<br>Balance: %{customdata[0]}<extra></extra>')))
                plot_years_withdrawal = sc_data["years_data"][:-1] if len(sc_data["years_data"]) > 1 else []
                fig_withdrawal.add_trace(go.Scatter(x=plot_years_withdrawal, y=sc_data["withdrawals_data"], mode='lines+markers', name=gettext("Scenario %(n)s Withdrawal", n=sc_data['n']), customdata=[(fw,) for fw in formatted_withdrawals_compare], uid=f"scenario_{sc_data['n']}_compare_withdrawal", hovertemplate=gettext('Year: %{x}<br>Withdrawal: %{customdata[0]}<extra></extra>')))
            fig_balance.update_layout(title=gettext("Portfolio Balance Comparison"), xaxis_title=gettext("Years"), yaxis_title=gettext("Portfolio Value ({currency})").format(currency=DEFAULT_CURRENCY))
            combined_balance_plot_html = pyo.plot(fig_balance, include_plotlyjs=False, output_type='div', config=plot_config)
            fig_withdrawal.update_layout(title=gettext("Annual Withdrawals Comparison"), xaxis_title=gettext("Years"), yaxis_title=gettext("Withdrawal ({currency})").format(currency=DEFAULT_CURRENCY))
            combined_withdrawal_plot_html = pyo.plot(fig_withdrawal, include_plotlyjs=False, output_type='div', config=plot_config)
        return jsonify({"combined_balance": combined_balance_plot_html, "combined_withdrawal": combined_withdrawal_plot_html, "scenarios": scenarios_data_for_template, "message": message})
    else: # GET request
        default_scenarios_for_template = []
        for n in range(1, MAX_SCENARIOS_COMPARE + 1):
            sc = {'n': n, 'enabled': (n <=2), 'W_form': '', 'r_form': '', 'i_form': '', 'T_form': '', 'D_form': '0.0', 'withdrawal_time_form': TIME_END}
            for p_num in range(1,4): sc.update({f'period{p_num}_{field}_form': '' for field in ['duration', 'r', 'i']})
            default_scenarios_for_template.append(sc)
        return render_template("compare.html", message="", scenarios=default_scenarios_for_template, combined_balance=None, combined_withdrawal=None, current_year=datetime.datetime.now().year)

@project_blueprint.route('/settings')
def settings():
    current_app.logger.info(f"Settings route called. Method: {request.method}")
    current_year = datetime.datetime.now().year
    return render_template("settings.html", current_year=current_year)

@project_blueprint.route('/export_csv')
def export_csv():
    current_app.logger.info(f"Export CSV route called (minimal). Args: {request.args}")
    # This is a stub. The full implementation will be restored later.
    # For now, ensure it doesn't cause errors if called.
    # Minimal valid response:
    return f"Export CSV route reached successfully (minimal). Args: {request.args}"
    # OR, if it must return a CSV-like response even as a stub:
    # output = io.StringIO()
    # writer = csv.writer(output)
    # writer.writerow(['Stub CSV Header'])
    # writer.writerow(['This is a stub response. Full functionality coming soon.'])
    # csv_string = output.getvalue()
    # return Response(
    #     csv_string,
    #     mimetype='text/csv',
    #     headers={'Content-Disposition': 'attachment;filename=stub_results.csv'}
    # )

@project_blueprint.route('/about')
def about():
    current_app.logger.info(f"About route called. Method: {request.method}")
    current_year = datetime.datetime.now().year
    return render_template("about.html", current_year=current_year)

@project_blueprint.route('/faq')
def faq():
    current_app.logger.info(f"FAQ route called. Method: {request.method}")
    current_year = datetime.datetime.now().year
    return render_template("faq.html", current_year=current_year)

def register_app_routes(app_instance):
    app_instance.logger.info("Attempting to register project_blueprint (with restored routes).")
    app_instance.register_blueprint(project_blueprint)
    app_instance.logger.info("project_blueprint (with restored routes) registered.")
