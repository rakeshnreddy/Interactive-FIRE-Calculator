from flask import Blueprint, current_app, request, jsonify, render_template, Response
from flask_wtf.csrf import generate_csrf
from flask_babel import gettext, get_locale
from babel.numbers import format_currency
import numpy as np
import plotly.graph_objects as go
import plotly.offline as pyo
import io
import csv
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

def generate_plots(W, withdrawal_time, mode, rates_periods, P_value=None, desired_final_value=0.0, one_off_events=None):
    if one_off_events is None:
        one_off_events = []
    if not rates_periods:
        return 0, 0, "<div>" + gettext("Error: No rate periods provided.") + "</div>", "<div></div>", "<p>" + gettext("Table data error.") + "</p>"
    if mode == MODE_WITHDRAWAL:
        required_portfolio = find_required_portfolio(W, withdrawal_time, rates_periods, desired_final_value=desired_final_value, one_off_events=one_off_events)
        calculated_W = W
        if required_portfolio == float('inf'):
            error_message = "<div>" + gettext("Cannot find a suitable portfolio. Withdrawals may be too high or periods too long/unfavorable (possibly compounded by one-off events).") + "</div>"
            return float('inf'), calculated_W, error_message, "<div></div>", "<p>" + gettext("Table data not available due to error.") + "</p>"
    else: # MODE_PORTFOLIO
        required_portfolio = P_value
        calculated_W = find_max_annual_expense(required_portfolio, withdrawal_time, rates_periods, desired_final_value=desired_final_value, one_off_events=one_off_events)
    if calculated_W is None or (isinstance(calculated_W, float) and (np.isnan(calculated_W) or np.isinf(calculated_W))):
        error_message = "<div>" + gettext("Error calculating sustainable withdrawal. Inputs might be unrealistic for the given portfolio (possibly compounded by one-off events).") + "</div>"
        return required_portfolio, 0, error_message, "<div></div>", "<p>" + gettext("Table data not available due to error in withdrawal calculation.") + "</p>"
    years, balances, sim_withdrawals = annual_simulation(required_portfolio, calculated_W, withdrawal_time, rates_periods, one_off_events=one_off_events)
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

MAX_ONE_OFF_EVENTS_INDEX = 5
MAX_ONE_OFF_EVENTS_COMPARE = 3

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
        for k_event in range(1, MAX_ONE_OFF_EVENTS_INDEX + 1):
            form_params_for_result_page[f'one_off_{k_event}_year'] = form_data.get(f'one_off_{k_event}_year', '')
            form_params_for_result_page[f'one_off_{k_event}_amount'] = form_data.get(f'one_off_{k_event}_amount', '')
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

            one_off_events_data = []
            for k_event in range(1, MAX_ONE_OFF_EVENTS_INDEX + 1):
                year_str = form_data.get(f'one_off_{k_event}_year')
                amount_str = form_data.get(f'one_off_{k_event}_amount')
                if year_str and amount_str:
                    try:
                        year_val = int(year_str)
                        amount_val = float(amount_str)
                        if year_val <= 0:
                            raise ValueError(gettext("One-off event year must be a positive integer."))
                        one_off_events_data.append({'year': year_val, 'amount': amount_val})
                    except ValueError:
                        raise ValueError(gettext("Invalid year or amount for one-off event #%(event_num)d.", event_num=k_event))
        except ValueError as e:
            current_app.logger.error(f"Invalid input in index route: {e} - Form data: {form_data}")
            return render_template('index.html', error=str(e), defaults=form_params_for_result_page, current_year=datetime.datetime.now().year)

        calculated_P_output, initial_W_input_for_fire_mode, portfolio_plot_W_mode, withdrawal_plot_W_mode, table_data_W_mode_html = "N/A", W_form, "", "", ""
        calculated_W_output_for_expense_mode, initial_P_input_for_expense_mode_raw, portfolio_plot_P_mode, withdrawal_plot_P_mode, table_data_P_mode_html = "N/A", P_value_form, "", "", ""

        if mode_form == MODE_WITHDRAWAL:
            P_calc_primary, W_actual_primary, p_plot_w, w_plot_w, table_w = generate_plots(W_form, withdrawal_time_form, MODE_WITHDRAWAL, rates_periods_data, None, D_form, one_off_events=one_off_events_data)
            if P_calc_primary == float('inf'):
                return render_template('index.html', error=gettext("Cannot find a suitable portfolio for the given withdrawal. Inputs may be unrealistic."), defaults=form_params_for_result_page, current_year=datetime.datetime.now().year)
            calculated_P_output, initial_W_input_for_fire_mode, portfolio_plot_W_mode, withdrawal_plot_W_mode, table_data_W_mode_html = P_calc_primary, W_actual_primary, p_plot_w, w_plot_w, table_w
            initial_P_input_for_expense_mode_raw = P_calc_primary
            _, W_calc_secondary, p_plot_p, w_plot_w_secondary, table_p = generate_plots(initial_W_input_for_fire_mode, withdrawal_time_form, MODE_PORTFOLIO, rates_periods_data, initial_P_input_for_expense_mode_raw, D_form, one_off_events=one_off_events_data)
            calculated_W_output_for_expense_mode, portfolio_plot_P_mode, withdrawal_plot_P_mode, table_data_P_mode_html = W_calc_secondary, p_plot_p, w_plot_w_secondary, table_p
        elif mode_form == MODE_PORTFOLIO:
            P_actual_primary, W_calc_primary, p_plot_p, w_plot_w, table_p = generate_plots(W_form, withdrawal_time_form, MODE_PORTFOLIO, rates_periods_data, P_value_form, D_form, one_off_events=one_off_events_data)
            initial_P_input_for_expense_mode_raw, calculated_W_output_for_expense_mode, portfolio_plot_P_mode, withdrawal_plot_P_mode, table_data_P_mode_html = P_actual_primary, W_calc_primary, p_plot_p, w_plot_w, table_p
            initial_W_input_for_fire_mode = W_calc_primary
            P_calc_secondary, _, p_plot_w_secondary, w_plot_w_secondary, table_w = generate_plots(initial_W_input_for_fire_mode, withdrawal_time_form, MODE_WITHDRAWAL, rates_periods_data, None, D_form, one_off_events=one_off_events_data)
            calculated_P_output, portfolio_plot_W_mode, withdrawal_plot_W_mode, table_data_W_mode_html = P_calc_secondary, p_plot_w_secondary, w_plot_w_secondary, table_w

        primary_result_label = ""
        primary_result_value_formatted = gettext("N/A")
        locale_str = get_locale().language if get_locale() else 'en_US'

        if mode_form == MODE_WITHDRAWAL:
            primary_result_label = gettext("Your Calculated FIRE Number:")
            if isinstance(calculated_P_output, (int, float)) and calculated_P_output != float('inf'):
                primary_result_value_formatted = format_currency(calculated_P_output, DEFAULT_CURRENCY, locale=locale_str)
            else:
                primary_result_value_formatted = gettext("N/A")
        elif mode_form == MODE_PORTFOLIO:
            primary_result_label = gettext("Your Max Sustainable Annual Expense:")
            if isinstance(calculated_W_output_for_expense_mode, (int, float)) and calculated_W_output_for_expense_mode != float('inf'):
                primary_result_value_formatted = format_currency(calculated_W_output_for_expense_mode, DEFAULT_CURRENCY, locale=locale_str)
            else:
                primary_result_value_formatted = gettext("N/A")
        else:
            primary_result_label = gettext("Result:")
            primary_result_value_formatted = gettext("N/A")

        initial_P_input_for_expense_mode_template = "N/A" if initial_P_input_for_expense_mode_raw == float('inf') else initial_P_input_for_expense_mode_raw
        if len(rates_periods_data) == 1:
            form_params_for_result_page.update({'r_form_val': rates_periods_data[0]['r'] * 100, 'i_form_val': rates_periods_data[0]['i'] * 100, 'T_form_val': rates_periods_data[0]['duration']})
        form_params_for_result_page.update({'D_form_val': D_form, 'withdrawal_time_form_val': withdrawal_time_form, 'initial_mode_from_index': mode_form})
        P_for_js = P_value_form if mode_form == MODE_PORTFOLIO and P_value_form is not None else (calculated_P_output if mode_form == MODE_WITHDRAWAL and isinstance(calculated_P_output, (int, float)) else 0.0)
        form_params_for_result_page.update({'P_input_raw_for_js': P_for_js, 'TIME_END_const': TIME_END, 'MODE_WITHDRAWAL_const': MODE_WITHDRAWAL})

        one_off_events_for_template = []
        if one_off_events_data:
            for event in one_off_events_data:
                one_off_events_for_template.append({
                    'year': event['year'],
                    'amount': event['amount'],
                    'formatted_amount': format_currency(event['amount'], DEFAULT_CURRENCY, locale=locale_str)
                })

        template_context = {
            **form_params_for_result_page,
            'primary_result_label': primary_result_label,
            'primary_result_value_formatted': primary_result_value_formatted,
            'fire_W_input_val': initial_W_input_for_fire_mode,
            'fire_P_calculated_val': format_currency(calculated_P_output, DEFAULT_CURRENCY, locale=locale_str) if isinstance(calculated_P_output, (int, float)) and calculated_P_output != float('inf') else gettext("N/A"),
            'portfolio_plot_fire': portfolio_plot_W_mode, 'withdrawal_plot_fire': withdrawal_plot_W_mode, 'table_data_fire_html': table_data_W_mode_html,
            'expense_P_input_val': initial_P_input_for_expense_mode_template,
            'expense_W_calculated_val': format_currency(calculated_W_output_for_expense_mode, DEFAULT_CURRENCY, locale=locale_str) if isinstance(calculated_W_output_for_expense_mode, (int, float)) and calculated_W_output_for_expense_mode != float('inf') else gettext("N/A"),
            'portfolio_plot_expense': portfolio_plot_P_mode, 'withdrawal_plot_expense': withdrawal_plot_P_mode, 'table_data_expense_html': table_data_P_mode_html,
            'rates_periods_info_json': rates_periods_data,
            'one_off_events_input': one_off_events_for_template
        }

        template_context['p_initial_mode'] = mode_form

        if mode_form == MODE_WITHDRAWAL:
            template_context['p_input_w'] = format_currency(W_form, DEFAULT_CURRENCY, locale=locale_str)
            template_context['p_input_p'] = gettext("N/A")
        elif mode_form == MODE_PORTFOLIO:
            template_context['p_input_w'] = gettext("N/A")
            if P_value_form is not None:
                template_context['p_input_p'] = format_currency(P_value_form, DEFAULT_CURRENCY, locale=locale_str)
            else:
                template_context['p_input_p'] = gettext("Not provided (Error)")
        else:
            template_context['p_input_w'] = gettext("N/A")
            template_context['p_input_p'] = gettext("N/A")

        if D_form > 0:
            template_context['p_input_d'] = format_currency(D_form, DEFAULT_CURRENCY, locale=locale_str)
        else:
            template_context['p_input_d'] = gettext("Not specified")

        if withdrawal_time_form == TIME_START:
            template_context['p_input_withdrawal_time'] = gettext("Start of Year")
        else:
            template_context['p_input_withdrawal_time'] = gettext("End of Year")

        if form_data.get('period1_duration') and form_data.get('period1_r') and form_data.get('period1_i'):
            num_stages = len(rates_periods_data) if rates_periods_data else 0
            template_context['p_input_period_summary'] = gettext("Multi-period: %(num)d stage(s) defined", num=num_stages)
        else:
            r_from_form = float(form_data.get('r', '0'))
            i_from_form = float(form_data.get('i', '0'))
            T_from_form = int(form_data.get('T', '0'))
            template_context['p_input_period_summary'] = gettext("Return: %(r).1f%%, Inflation: %(i).1f%%, Duration: %(T)d years", r=r_from_form, i=i_from_form, T=T_from_form)

        current_app.logger.info(f"[PrimaryDisplayDebug] Context for result.html: p_initial_mode='{template_context.get('p_initial_mode')}', p_input_w='{template_context.get('p_input_w')}', p_input_p='{template_context.get('p_input_p')}'")
        current_app.logger.info(f"[PrimaryDisplayDebug] Context for result.html: p_input_d='{template_context.get('p_input_d')}', p_input_withdrawal_time='{template_context.get('p_input_withdrawal_time')}', p_input_period_summary='{template_context.get('p_input_period_summary')}'")

        template_context['current_year'] = datetime.datetime.now().year
        return render_template('result.html', **template_context)
    else: # GET request
        default_form_data = {
            'W': '80000', 'r': '7', 'i': '3', 'T': '30', 'D': '0.0',
            'withdrawal_time': TIME_END,
            'mode': MODE_WITHDRAWAL,
            'P': '500000', 'error': None,
            'period1_duration': '', 'period1_r': '', 'period1_i': '',
            'period2_duration': '', 'period2_r': '', 'period2_i': '',
            'period3_duration': '', 'period3_r': '', 'period3_i': '',
        }
        for k_event in range(1, MAX_ONE_OFF_EVENTS_INDEX + 1):
            default_form_data[f'one_off_{k_event}_year'] = ''
            default_form_data[f'one_off_{k_event}_amount'] = ''

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

        rates_periods_data = []
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

        one_off_events_data = []
        for k_event in range(1, MAX_ONE_OFF_EVENTS_INDEX + 1):
            year_str = form_data.get(f'one_off_{k_event}_year')
            amount_str = form_data.get(f'one_off_{k_event}_amount')
            if year_str and amount_str:
                try:
                    year_val = int(year_str)
                    amount_val = float(amount_str)
                    if year_val <= 0: raise ValueError(gettext("One-off event year must be positive."))
                    one_off_events_data.append({'year': year_val, 'amount': amount_val})
                except ValueError:
                    raise ValueError(gettext("Invalid year or amount for one-off event #%(event_num)d.", event_num=k_event))

    except ValueError as e:
        current_app.logger.error(f"Invalid input (ValueError) in update route: {e} - Form data: {form_data}")
        return jsonify({'error': gettext('Invalid input: %(error)s', error=str(e))})
    except Exception as e:
        current_app.logger.error(f"Unexpected error during input processing in update route: {e} - Form data: {form_data}", exc_info=True)
        return jsonify({'error': gettext('An unexpected error occurred while processing inputs.')})

    required_portfolio_W, actual_W_for_mode_W, portfolio_plot_W, withdrawal_plot_W, table_data_W_html = generate_plots(W_form, withdrawal_time, MODE_WITHDRAWAL, rates_periods_data, None, D_form, one_off_events=one_off_events_data)
    input_P_for_mode_P, calculated_W_for_mode_P, portfolio_plot_P, withdrawal_plot_P, table_data_P_html = generate_plots(W_form, withdrawal_time, MODE_PORTFOLIO, rates_periods_data, P_value, D_form, one_off_events=one_off_events_data)
    locale_str_update = get_locale().language if get_locale() else 'en_US'
    return jsonify({
        'fire_number_W': format_currency(required_portfolio_W, DEFAULT_CURRENCY, locale=locale_str_update) if required_portfolio_W != float('inf') else gettext("N/A"),
        'raw_fire_number_W': required_portfolio_W if required_portfolio_W != float('inf') else None,
        'annual_expense_W': format_currency(actual_W_for_mode_W, DEFAULT_CURRENCY, locale=locale_str_update) if actual_W_for_mode_W is not None and actual_W_for_mode_W != float('inf') else gettext("N/A"),
        'raw_annual_expense_W': actual_W_for_mode_W if actual_W_for_mode_W is not None and actual_W_for_mode_W != float('inf') else None,
        'portfolio_plot_W': portfolio_plot_W, 'withdrawal_plot_W': withdrawal_plot_W, 'table_data_W_html': table_data_W_html,
        'fire_number_P': format_currency(input_P_for_mode_P, DEFAULT_CURRENCY, locale=locale_str_update) if input_P_for_mode_P != float('inf') else gettext("N/A"),
        'raw_fire_number_P': input_P_for_mode_P if input_P_for_mode_P != float('inf') else None,
        'annual_expense_P': format_currency(calculated_W_for_mode_P, DEFAULT_CURRENCY, locale=locale_str_update) if calculated_W_for_mode_P is not None and calculated_W_for_mode_P != float('inf') else gettext("N/A"),
        'raw_annual_expense_P': calculated_W_for_mode_P if calculated_W_for_mode_P is not None and calculated_W_for_mode_P != float('inf') else None,
        'portfolio_plot_P': portfolio_plot_P, 'withdrawal_plot_P': withdrawal_plot_P, 'table_data_P_html': table_data_P_html
    })

@project_blueprint.route('/compare', methods=['GET', 'POST'])
def compare():
    current_app.logger.info(f"Compare route called. Method: {request.method}")
    if request.method == 'POST':
        current_app.logger.info(f"[CompareDebug] Received POST /compare request. Form data: {request.form.to_dict(flat=False)}")
        form_data = request.form
        scenarios_data_for_template = []
        for n in range(1, MAX_SCENARIOS_COMPARE + 1):
            scenario_input = {'n': n, 'enabled': form_data.get(f"scenario{n}_enabled") == "on"}
            for k_form_field in ['W_form', 'r_form', 'i_form', 'T_form', 'D_form', 'withdrawal_time_form']:
                scenario_input[k_form_field] = form_data.get(f"scenario{n}_{k_form_field.split('_form')[0]}", "")
            for p_num in range(1, 4):
                for field in ['duration', 'r', 'i']:
                    scenario_input[f'period{p_num}_{field}_form'] = form_data.get(f"scenario{n}_period{p_num}_{field}", "")
            scenario_input['one_off_events_form_values'] = []
            for k_event in range(1, MAX_ONE_OFF_EVENTS_COMPARE + 1):
                year_form_val = form_data.get(f"scenario{n}_one_off_{k_event}_year", "")
                amount_form_val = form_data.get(f"scenario{n}_one_off_{k_event}_amount", "")
                scenario_input['one_off_events_form_values'].append({'year': year_form_val, 'amount': amount_form_val})

            if not scenario_input['enabled']:
                scenario_input.update({'error': gettext("Scenario %(n)s: Not enabled by user.", n=n), 'fire_number_display': gettext("N/A")})
                scenarios_data_for_template.append(scenario_input); continue
            try:
                W_val_str = scenario_input.get('W_form', '0')
                D_val_str = scenario_input.get('D_form', '0.0')
                W_val = float(W_val_str) if W_val_str else 0.0
                D_val = float(D_val_str) if D_val_str else 0.0
                withdrawal_time_val = scenario_input.get('withdrawal_time_form', TIME_END)
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
                    r_form_str = scenario_input.get('r_form')
                    i_form_str = scenario_input.get('i_form')
                    T_form_str = scenario_input.get('T_form')

                    r_perc_single = float(r_form_str) if r_form_str else 0.0
                    i_perc_single = float(i_form_str) if i_form_str else 0.0
                    T_single = int(T_form_str) if T_form_str else 0

                    if T_single <= 0: raise ValueError(gettext("Time (T) must be > 0 for single period mode."))
                    if not (-50 <= r_perc_single <= 100): raise ValueError(gettext("Annual return (r) must be between -50% and 100%."))
                    if not (-50 <= i_perc_single <= 100): raise ValueError(gettext("Inflation rate (i) must be between -50% and 100%."))
                    scenario_rates_periods.append({'duration': T_single, 'r': r_perc_single / 100, 'i': i_perc_single / 100})

                scenario_one_off_events = []
                for k_event in range(1, MAX_ONE_OFF_EVENTS_COMPARE + 1):
                    year_str = form_data.get(f"scenario{n}_one_off_{k_event}_year")
                    amount_str = form_data.get(f"scenario{n}_one_off_{k_event}_amount")
                    if year_str and amount_str:
                        try:
                            year_event_val = int(year_str)
                            amount_event_val = float(amount_str)
                            if year_event_val <= 0: raise ValueError(gettext("One-off event year must be positive."))
                            scenario_one_off_events.append({'year': year_event_val, 'amount': amount_event_val})
                        except ValueError:
                            raise ValueError(gettext("Scenario %(n)s: Invalid year or amount for one-off event #%(event_num)d.", n=n, event_num=k_event))

                scenario_input['one_off_events_data'] = scenario_one_off_events
                current_app.logger.info(f"[CompareDebug] Scenario {n} calc params: W={W_val}, D={D_val}, time={withdrawal_time_val}, rates={scenario_rates_periods}, one_offs={scenario_one_off_events}")
                scenario_input['rates_periods_data'] = scenario_rates_periods

                portfolio = find_required_portfolio(W_val, withdrawal_time_val, scenario_rates_periods, D_val, one_off_events=scenario_one_off_events)
                if portfolio == float('inf'):
                    scenario_input.update({'error': gettext("Scenario %(n)s: Cannot find suitable portfolio (inputs unrealistic).", n=n), 'fire_number': gettext("N/A"), 'years_data': [], 'balances_data': [], 'withdrawals_data': []})
                else:
                    years, balances, withdrawals = annual_simulation(portfolio, W_val, withdrawal_time_val, scenario_rates_periods, one_off_events=scenario_one_off_events)
                    scenario_input.update({'fire_number': portfolio, 'years_data': years.tolist(), 'balances_data': balances, 'withdrawals_data': withdrawals})

                scenario_input['fire_number_display'] = format_currency(portfolio, DEFAULT_CURRENCY, locale=(get_locale().language if get_locale() else 'en_US')) if isinstance(portfolio, (int, float)) and portfolio != float('inf') else gettext("N/A")

            except ValueError as e:
                current_app.logger.error(f"[CompareDebug] Invalid input for scenario {n} in compare route: {e} - Scenario Input: {scenario_input}")
                scenario_input.update({'error': gettext("Scenario %(n)s: %(error)s", n=n, error=str(e)), 'fire_number_display': gettext("N/A"), 'enabled': False})
            scenarios_data_for_template.append(scenario_input)

        plottable_scenarios = [s for s in scenarios_data_for_template if s.get('enabled') and not s.get('error') and 'years_data' in s and s['years_data']]
        combined_balance_plot_html, combined_withdrawal_plot_html, message = "", "", ""
        if not plottable_scenarios: message = gettext("No valid scenarios to plot. Please check inputs or enable scenarios.")
        else:
            current_app.logger.info(f"[CompareDebug] Plotting {len(plottable_scenarios)} scenarios.")
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

        current_app.logger.info(f"[CompareDebug] scenarios_data_for_template before jsonify (first scenario sample): {scenarios_data_for_template[0] if scenarios_data_for_template else 'empty'}")
        current_app.logger.info(f"[CompareDebug] combined_balance_plot_html length: {len(combined_balance_plot_html) if combined_balance_plot_html else 0}")
        current_app.logger.info(f"[CompareDebug] combined_withdrawal_plot_html length: {len(combined_withdrawal_plot_html) if combined_withdrawal_plot_html else 0}")
        current_app.logger.info(f"[CompareDebug] Message for jsonify: {message}")

        return jsonify({"combined_balance": combined_balance_plot_html, "combined_withdrawal": combined_withdrawal_plot_html, "scenarios": scenarios_data_for_template, "message": message})
    else: # GET request
        current_app.logger.info(f"[CompareLinkDebug] Received GET /compare request. Args: {request.args.to_dict(flat=False)}")
        default_scenarios_for_template = []
        for n in range(1, MAX_SCENARIOS_COMPARE + 1):
            sc = {'n': n, 'enabled': (n <=2), 'W_form': '', 'r_form': '', 'i_form': '', 'T_form': '', 'D_form': '0.0', 'withdrawal_time_form': TIME_END}
            for p_num in range(1,4): sc.update({f'period{p_num}_{field}_form': '' for field in ['duration', 'r', 'i']})
            for k_event in range(1, MAX_ONE_OFF_EVENTS_COMPARE + 1):
                sc[f'one_off_{k_event}_year_form'] = ''
                sc[f'one_off_{k_event}_amount_form'] = ''
            default_scenarios_for_template.append(sc)

        if default_scenarios_for_template:
            first_scenario = default_scenarios_for_template[0]
            first_scenario['W_form'] = request.args.get('W', first_scenario['W_form'])
            first_scenario['D_form'] = request.args.get('D', first_scenario['D_form'])
            first_scenario['withdrawal_time_form'] = request.args.get('withdrawal_time', first_scenario['withdrawal_time_form'])

            is_multi_period_from_query = False
            # Check if the first period's duration is provided, indicating multi-period data
            if request.args.get('period1_duration'):
                is_multi_period_from_query = True

            if is_multi_period_from_query:
                for k_period in range(1, 4):
                    dur_param = f'period{k_period}_duration'
                    r_param = f'period{k_period}_r'
                    i_param = f'period{k_period}_i'
                    # Only populate if duration for this specific period is present
                    if request.args.get(dur_param):
                        first_scenario[f'period{k_period}_duration_form'] = request.args.get(dur_param, '')
                        first_scenario[f'period{k_period}_r_form'] = request.args.get(r_param, '')
                        first_scenario[f'period{k_period}_i_form'] = request.args.get(i_param, '')
                    else: # Clear subsequent period fields if not provided
                        first_scenario[f'period{k_period}_duration_form'] = ''
                        first_scenario[f'period{k_period}_r_form'] = ''
                        first_scenario[f'period{k_period}_i_form'] = ''
                first_scenario['r_form'] = ''
                first_scenario['i_form'] = ''
                first_scenario['T_form'] = ''
            else:
                first_scenario['r_form'] = request.args.get('r', first_scenario['r_form'])
                first_scenario['i_form'] = request.args.get('i', first_scenario['i_form'])
                first_scenario['T_form'] = request.args.get('T', first_scenario['T_form'])
                for k_period in range(1, 4): # Clear multi-period fields if using single period
                    first_scenario[f'period{k_period}_duration_form'] = ''
                    first_scenario[f'period{k_period}_r_form'] = ''
                    first_scenario[f'period{k_period}_i_form'] = ''

            for k_event in range(1, MAX_ONE_OFF_EVENTS_COMPARE + 1):
                year_key = f'one_off_{k_event}_year'
                amount_key = f'one_off_{k_event}_amount'
                first_scenario[f'one_off_{k_event}_year_form'] = request.args.get(year_key, '')
                first_scenario[f'one_off_{k_event}_amount_form'] = request.args.get(amount_key, '')

            if request.args.get('W'):
                 first_scenario['enabled'] = True

        return render_template("compare.html", message="", scenarios=default_scenarios_for_template, combined_balance=None, combined_withdrawal=None, current_year=datetime.datetime.now().year, csrf_token=generate_csrf())

@project_blueprint.route('/settings')
def settings():
    current_app.logger.info(f"Settings route called. Method: {request.method}")
    current_year = datetime.datetime.now().year
    return render_template("settings.html", current_year=current_year)

@project_blueprint.route('/export_csv')
def export_csv():
    current_app.logger.info(f"Export CSV route called (minimal). Args: {request.args}")
    return f"Export CSV route reached successfully (minimal). Args: {request.args}"

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

