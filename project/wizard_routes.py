from flask import Blueprint, render_template, redirect, url_for, session, request, flash, current_app
from project.forms import ExpensesForm, RatesForm, OneOffsForm
from project.constants import TIME_START, TIME_END
from project.financial_calcs import annual_simulation, find_required_portfolio
import plotly.graph_objects as go
import sys
from flask_wtf.csrf import generate_csrf
from project.financial_calcs import find_max_annual_expense
from flask import jsonify, Response
import csv
import io
from fpdf import FPDF
import tempfile
import os


wizard_bp = Blueprint('wizard_bp', __name__, template_folder='../templates', url_prefix='/wizard')

@wizard_bp.route('/expenses', methods=['GET', 'POST'])
def wizard_expenses_step():
    form = ExpensesForm(request.form if request.method == 'POST' else None)
    if form.validate_on_submit():
        form_data = form.data.copy()
        itemized_sum = sum(
            form_data.get(key, 0) or 0 for key in
            ['housing', 'food', 'transportation', 'utilities',
             'personal_care', 'entertainment', 'healthcare', 'other_expenses']
        )
        submitted_annual_expenses = form_data.get('annual_expenses')
        if (submitted_annual_expenses is None or submitted_annual_expenses == 0) and itemized_sum > 0:
            form_data['annual_expenses'] = itemized_sum
        session['wizard_expenses'] = form_data
        return redirect(url_for('wizard_bp.wizard_rates_step'))
    elif request.method == 'GET' and 'wizard_expenses' in session:
        form = ExpensesForm(data=session['wizard_expenses'])
    return render_template('wizard_expenses.html', form=form, title='Step 1: Your Expenses')

@wizard_bp.route('/rates', methods=['GET', 'POST'])
def wizard_rates_step():
    if 'wizard_expenses' not in session:
        return redirect(url_for('wizard_bp.wizard_expenses_step'))
    form = RatesForm(request.form if request.method == 'POST' else None)
    if form.validate_on_submit():
        if form.submit_add_period.data:
            form.period_rates.append_entry()
            return render_template('wizard_rates.html', form=form, title='Step 2: Rates & Inflation')
        session['wizard_rates'] = form.data
        return redirect(url_for('wizard_bp.wizard_one_offs_step'))
    elif request.method == 'GET' and 'wizard_rates' in session:
        form = RatesForm(data=session['wizard_rates'])
    return render_template('wizard_rates.html', form=form, title='Step 2: Rates & Inflation')

@wizard_bp.route('/one_offs', methods=['GET', 'POST'])
def wizard_one_offs_step():
    if 'wizard_rates' not in session:
        return redirect(url_for('wizard_bp.wizard_rates_step'))
    form = OneOffsForm(request.form if request.method == 'POST' else None)
    if form.validate_on_submit():
        if form.submit_add_expense.data:
            form.large_expenses.append_entry()
            return render_template('wizard_one_offs.html', form=form, title='Step 3: One-Off Events')
        elif form.submit_add_income.data:
            form.large_incomes.append_entry()
            return render_template('wizard_one_offs.html', form=form, title='Step 3: One-Off Events')
        session['wizard_one_offs'] = form.data
        return redirect(url_for('wizard_bp.wizard_summary_step'))
    elif request.method == 'GET' and 'wizard_one_offs' in session:
        form = OneOffsForm(data=session['wizard_one_offs'])
    return render_template('wizard_one_offs.html', form=form, title='Step 3: One-Off Events')

@wizard_bp.route('/summary', methods=['GET'])
def wizard_summary_step():
    if not all(key in session for key in ['wizard_expenses', 'wizard_rates', 'wizard_one_offs']):
        return redirect(url_for('wizard_bp.wizard_expenses_step'))
    expenses_data = session.get('wizard_expenses', {})
    rates_data = session.get('wizard_rates', {})
    one_offs_data = session.get('wizard_one_offs', {})
    csrf_token_value = generate_csrf()
    return render_template('wizard_summary.html',
                           title='Wizard Summary',
                           expenses_data=expenses_data, rates_data=rates_data,
                           one_offs_data=one_offs_data, csrf_token_value=csrf_token_value)

@wizard_bp.route('/calculate', methods=['POST'])
def wizard_calculate_step():
    if not all(key in session for key in ['wizard_expenses', 'wizard_rates', 'wizard_one_offs']):
        flash("Session data is incomplete. Please restart the wizard.", "error")
        return redirect(url_for('wizard_bp.wizard_expenses_step'))

    expenses_data = session.get('wizard_expenses', {})
    rates_data = session.get('wizard_rates', {})
    one_offs_data = session.get('wizard_one_offs', {})

    try:
        W = float(expenses_data.get('annual_expenses', 0))
        r_overall_nominal = float(rates_data.get('return_rate', 0)) / 100.0
        i_overall = float(rates_data.get('inflation_rate', 0)) / 100.0
        rates_periods = []
        if rates_data.get('period_rates'):
            for period in rates_data['period_rates']:
                if period.get('years') and period.get('rate') is not None:
                    rates_periods.append({
                        'duration': int(period['years']),
                        'r': float(period['rate']) / 100.0, 'i': i_overall
                    })
        total_duration_from_periods = sum(p['duration'] for p in rates_periods) if rates_periods else 0
        if not rates_periods:
            T_fallback = int(rates_data.get('total_duration_fallback', 30))
            rates_periods.append({'duration': T_fallback, 'r': r_overall_nominal, 'i': i_overall})
            total_duration_from_periods = T_fallback
        one_off_events = []
        for exp in one_offs_data.get('large_expenses', []):
            if exp.get('year') is not None and exp.get('amount') is not None:
                one_off_events.append({'year': int(exp['year']), 'amount': -float(exp['amount'])})
        for inc in one_offs_data.get('large_incomes', []):
            if inc.get('year') is not None and inc.get('amount') is not None:
                one_off_events.append({'year': int(inc['year']), 'amount': float(inc['amount'])})
        one_off_events.sort(key=lambda x: x['year'])
        withdrawal_time_str = rates_data.get('withdrawal_time', 'end')
        withdrawal_time = TIME_START if withdrawal_time_str == 'start' else TIME_END
        desired_final_value = float(rates_data.get('desired_final_value', 0))

        P_calculated = None
        W_actual_for_P_calc = W
        sim_years, sim_balances, sim_withdrawals = [], [], []
        error_message = None

        try:
            current_app.logger.debug(f"Calling find_required_portfolio with W_initial={W_actual_for_P_calc}, withdrawal_time={withdrawal_time}, desired_final_value={desired_final_value}")
            current_app.logger.debug(f"rates_periods for find_required_portfolio: {rates_periods}")
            current_app.logger.debug(f"one_off_events for find_required_portfolio: {one_off_events}")
            P_calculated = find_required_portfolio(
                W_initial=W_actual_for_P_calc, withdrawal_time=withdrawal_time,
                rates_periods=rates_periods, desired_final_value=desired_final_value,
                one_off_events=one_off_events
            )
            if P_calculated is None or P_calculated == float('inf') or P_calculated < 0:
                error_message = "Could not calculate a suitable portfolio (FIRE number) for the given expenses and market conditions. Inputs may be unrealistic (e.g., expenses too high, returns too low for the duration)."
                P_calculated_display = "Not Feasible"
            else:
                P_calculated_display = f"{P_calculated:,.2f}"
                current_app.logger.debug(f"Calling annual_simulation with PV={P_calculated}, W_initial={W_actual_for_P_calc}, withdrawal_time={withdrawal_time}, desired_final_value={desired_final_value}")
                current_app.logger.debug(f"rates_periods for annual_simulation: {rates_periods}")
                current_app.logger.debug(f"one_off_events for annual_simulation: {one_off_events}")
                sim_years, sim_balances, sim_withdrawals = annual_simulation(
                    PV=P_calculated, W_initial=W_actual_for_P_calc, withdrawal_time=withdrawal_time,
                    rates_periods=rates_periods, one_off_events=one_off_events
                )
                current_app.logger.debug(f"annual_simulation returned: sim_years (type: {type(sim_years)}, len: {len(sim_years) if sim_years is not None else 'None'}): {str(sim_years)[:200]}")
                current_app.logger.debug(f"annual_simulation returned: sim_balances (type: {type(sim_balances)}, len: {len(sim_balances) if sim_balances is not None else 'None'}): {str(sim_balances)[:200]}")
                current_app.logger.debug(f"annual_simulation returned: sim_withdrawals (type: {type(sim_withdrawals)}, len: {len(sim_withdrawals) if sim_withdrawals is not None else 'None'}): {str(sim_withdrawals)[:200]}")
        except Exception as e:
            current_app.logger.error(f"Error during financial calculation: {e}", exc_info=True)
            error_message = "An unexpected error occurred during financial calculations."
            P_calculated_display = "Error"
            sim_years, sim_balances, sim_withdrawals = [], [], []

        if error_message:
            flash(error_message, "error")
            return render_template('wizard_results.html',
                                   title="Calculation Error", error_message=error_message,
                                   P_calculated_display=P_calculated_display, P_raw=0.0, W=W,
                                   W_display=f"{W:,.2f}", r_overall_nominal=r_overall_nominal,
                                   i_overall=i_overall, rates_periods_summary=rates_periods,
                                   total_duration_from_periods=total_duration_from_periods,
                                   one_off_events_summary=one_off_events,
                                   withdrawal_time_str=withdrawal_time_str,
                                   desired_final_value=desired_final_value,
                                   original_plot1_spec=None, original_plot2_spec=None,
                                   csrf_token_for_ajax=generate_csrf())

        plot1_spec = None
        plot2_spec = None

        if sim_years is not None and sim_balances is not None and len(sim_years) > 0:
            try:
                fig_balance = go.Figure()
                x_balance_years = list(sim_years)
                y_balances = list(sim_balances)
                fig_balance.add_trace(go.Scatter(x=x_balance_years, y=y_balances, mode='lines+markers', name="Portfolio Balance", line=dict(color='blue')))
                sim_balances_list = list(sim_balances)
                for event in one_off_events:
                    if 0 <= event['year'] < len(sim_balances_list):
                        event_y_approx = sim_balances_list[event['year']]
                        fig_balance.add_trace(go.Scatter(
                            x=[event['year']], y=[float(event_y_approx)], mode='markers',
                            marker=dict(size=10, color='red' if event['amount'] < 0 else 'green', symbol='triangle-down' if event['amount'] < 0 else 'triangle-up'),
                            name=f"One-off: {event['amount']:.0f}"
                        ))
                fig_balance.update_layout(title="Portfolio Balance Over Time", xaxis_title="Year", yaxis_title="Portfolio Balance", legend_title_text="Legend", autosize=True, margin=dict(l=30, r=20, t=40, b=40, pad=2))
                plot1_spec = {'data': [trace.to_plotly_json() for trace in fig_balance.data], 'layout': fig_balance.layout.to_plotly_json()}
            except Exception as e_plot1:
                current_app.logger.error(f"Error generating balance plot spec: {e_plot1}", exc_info=True)

        if sim_years is not None and sim_withdrawals is not None:
            try:
                fig_withdrawals = go.Figure()
                total_T_sim = len(sim_withdrawals)
                x_withdraw_years = list(sim_years[1 : total_T_sim + 1]) if total_T_sim > 0 and len(sim_years) >= (total_T_sim + 1) else []
                y_withdrawals = list(sim_withdrawals)
                if total_T_sim > 0 and len(x_withdraw_years) == total_T_sim :
                    fig_withdrawals.add_trace(go.Scatter(x=x_withdraw_years, y=y_withdrawals, mode='lines+markers', name="Annual Withdrawal", line=dict(color='blue')))
                else:
                    fig_withdrawals.add_trace(go.Scatter(x=[], y=[], mode='lines+markers', name="Annual Withdrawal", line=dict(color='blue')))
                    if total_T_sim > 0:
                         current_app.logger.warning(f"Original withdrawal plot data length mismatch: x_data (len {len(x_withdraw_years)}), y_data (len {total_T_sim})")
                fig_withdrawals.update_layout(title="Annual Withdrawals Over Time", xaxis_title="Year", yaxis_title="Annual Withdrawal Amount", legend_title_text="Legend", autosize=True, margin=dict(l=30, r=20, t=40, b=40, pad=2))
                plot2_spec = {'data': [trace.to_plotly_json() for trace in fig_withdrawals.data], 'layout': fig_withdrawals.layout.to_plotly_json()}
            except Exception as e_plot2:
                current_app.logger.error(f"Error generating withdrawal plot spec: {e_plot2}", exc_info=True)

        table_rows = []
        if sim_withdrawals is not None and len(sim_withdrawals) > 0:
            total_T_from_sim = len(sim_withdrawals)
            if (sim_years is not None and len(sim_years) == (total_T_from_sim + 1) and
                sim_balances is not None and len(sim_balances) == (total_T_from_sim + 1)):
                for i in range(total_T_from_sim):
                    year_display = sim_years[i+1]
                    balance = sim_balances[i+1]
                    withdrawal = sim_withdrawals[i]
                    table_rows.append({
                        'year': int(year_display),
                        'balance': f"{balance:,.2f}", 'withdrawal': f"{withdrawal:,.2f}"
                    })
            elif not error_message:
                current_app.logger.warning(
                    "Could not generate table_rows due to inconsistent simulation data shapes " +
                    "relative to sim_withdrawals length."
                )
                current_app.logger.debug(
                    f"sim_years (len: {len(sim_years) if sim_years is not None else 'None'}), " +
                    f"sim_balances (len: {len(sim_balances) if sim_balances is not None else 'None'}), " +
                    f"sim_withdrawals (len: {len(sim_withdrawals) if sim_withdrawals is not None else 'None'})"
                )
        elif not error_message:
             current_app.logger.info("No withdrawal data from simulation to generate table rows (e.g., T=0).")

        W_display = f"{W:,.2f}"

        # Ensure all numeric data for session is Python native type
        py_W = float(W)
        py_P_calculated = float(P_calculated) if isinstance(P_calculated, (int, float)) and P_calculated is not None and P_calculated != float('inf') else None
        py_r_overall_nominal = float(r_overall_nominal)
        py_i_overall = float(i_overall)
        py_total_duration_from_periods = int(total_duration_from_periods)
        py_desired_final_value = float(desired_final_value)

        py_sim_years = [int(y) for y in sim_years] if sim_years is not None else []
        py_sim_balances = [float(b) for b in sim_balances] if sim_balances is not None else []
        py_sim_withdrawals = [float(w) for w in sim_withdrawals] if sim_withdrawals is not None else []

        export_data = {
            'W': py_W,
            'P_calculated': py_P_calculated,
            'r_overall_nominal': py_r_overall_nominal,
            'i_overall': py_i_overall,
            'total_duration_from_periods': py_total_duration_from_periods,
            'withdrawal_time_str': withdrawal_time_str, # String, already fine
            'desired_final_value': py_desired_final_value,
            'rates_periods_summary': rates_periods, # Assumed list of dicts with Python types
            'one_off_events_summary': one_off_events, # Assumed list of dicts with Python types
            'sim_years': py_sim_years,
            'sim_balances': py_sim_balances,
            'sim_withdrawals': py_sim_withdrawals
        }
        session['last_calc_export_data'] = export_data

        session.pop('wizard_expenses', None)
        session.pop('wizard_rates', None)
        session.pop('wizard_one_offs', None)
        current_app.logger.debug("Wizard session data cleared after successful calculation.")

        return render_template('wizard_results.html',
                               title="Calculation Results",
                               P_calculated_display=P_calculated_display,
                               P_raw=P_calculated if P_calculated is not None and P_calculated != float('inf') else 0.0,
                               W_display=W_display, W=W,
                               sim_years=sim_years, sim_balances=sim_balances, sim_withdrawals=sim_withdrawals,
                               table_rows=table_rows,
                               original_plot1_spec=plot1_spec, original_plot2_spec=plot2_spec,
                               r_overall_nominal=r_overall_nominal, i_overall=i_overall,
                               rates_periods_summary=rates_periods,
                               total_duration_from_periods=total_duration_from_periods,
                               one_off_events_summary=one_off_events,
                               withdrawal_time_str=withdrawal_time_str,
                               desired_final_value=desired_final_value,
                               csrf_token_for_ajax=generate_csrf()
                              )
    except Exception as e:
        current_app.logger.error(f"Error during data transformation in wizard: {e}", exc_info=True)
        flash("An error occurred preparing data for calculation. Please check your inputs.", "error")
        return redirect(url_for('wizard_bp.wizard_summary_step'))

@wizard_bp.route('/recalculate_interactive', methods=['POST'])
def wizard_recalculate_interactive():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Invalid request: No JSON data received.'}), 400

        changed_input = data.get('changed_input')
        W_input_val = float(data.get('W_value', 0))
        P_input_val = float(data.get('P_value', 0))
        r_overall_nominal_str = data.get('r_overall_nominal', '0.0')
        i_overall_str = data.get('i_overall', '0.0')
        withdrawal_time_str = data.get('withdrawal_time_str', 'end')
        fixed_desired_final_value_str = data.get('fixed_desired_final_value', '0.0')
        fixed_rates_periods_summary = data.get('rates_periods_summary', [])
        fixed_one_off_events_summary = data.get('one_off_events_summary', [])

        r_overall_nominal = float(r_overall_nominal_str)
        i_overall = float(i_overall_str)
        rates_periods_for_calc = fixed_rates_periods_summary
        if not rates_periods_for_calc:
            fixed_total_duration_str = data.get('total_duration_from_periods', '30')
            rates_periods_for_calc = [{'duration': int(fixed_total_duration_str), 'r': r_overall_nominal, 'i': i_overall}]
        one_off_events_for_calc = fixed_one_off_events_summary
        withdrawal_time = TIME_START if withdrawal_time_str == 'start' else TIME_END
        desired_final_value_for_calc = float(fixed_desired_final_value_str)

        new_P_calculated = None
        new_W_calculated = None
        sim_years, sim_balances, sim_withdrawals = [], [], []
        error_msg_recalc = None

        if changed_input == 'W':
            W_to_use = W_input_val
            P_recalculated = find_required_portfolio(
                W_initial=W_to_use, withdrawal_time=withdrawal_time,
                rates_periods=rates_periods_for_calc, desired_final_value=desired_final_value_for_calc,
                one_off_events=one_off_events_for_calc
            )
            if P_recalculated is None or P_recalculated == float('inf') or P_recalculated < 0:
                error_msg_recalc = "Could not calculate a suitable portfolio for the new expenses."
                new_P_calculated = P_input_val; new_W_calculated = W_to_use
            else:
                new_P_calculated = P_recalculated; new_W_calculated = W_to_use
                sim_years, sim_balances, sim_withdrawals = annual_simulation(
                    PV=new_P_calculated, W_initial=new_W_calculated, withdrawal_time=withdrawal_time,
                    rates_periods=rates_periods_for_calc, one_off_events=one_off_events_for_calc
                )
        elif changed_input == 'P':
            P_to_use = P_input_val
            W_recalculated = find_max_annual_expense(
                P=P_to_use, withdrawal_time=withdrawal_time,
                rates_periods=rates_periods_for_calc, desired_final_value=desired_final_value_for_calc,
                one_off_events=one_off_events_for_calc
            )
            if W_recalculated is None or W_recalculated < 0:
                error_msg_recalc = "Could not calculate a sustainable withdrawal for the new portfolio."
                new_W_calculated = W_input_val; new_P_calculated = P_to_use
            else:
                new_W_calculated = W_recalculated; new_P_calculated = P_to_use
                sim_years, sim_balances, sim_withdrawals = annual_simulation(
                    PV=new_P_calculated, W_initial=new_W_calculated, withdrawal_time=withdrawal_time,
                    rates_periods=rates_periods_for_calc, one_off_events=one_off_events_for_calc
                )
        else:
            return jsonify({'error': 'Invalid changed_input value.'}), 400

        if error_msg_recalc:
            return jsonify({'error': error_msg_recalc, 'new_W': new_W_calculated, 'new_P': new_P_calculated, 'plot1_spec': None, 'plot2_spec': None }), 200

        plot1_spec_interactive = None
        plot2_spec_interactive = None

        if sim_years is not None and sim_balances is not None and len(sim_years) > 0:
            try:
                fig_balance = go.Figure()
                x_balance_years_ia = list(sim_years)
                y_balances_ia = list(sim_balances)
                fig_balance.add_trace(go.Scatter(x=x_balance_years_ia, y=y_balances_ia, mode='lines+markers', name="Portfolio Balance (What-If)", line=dict(color='green')))
                sim_balances_list_ia = list(sim_balances)
                for event in one_off_events_for_calc:
                    if 0 <= event['year'] < len(sim_balances_list_ia):
                        event_y_approx = sim_balances_list_ia[event['year']]
                        fig_balance.add_trace(go.Scatter(
                            x=[event['year']], y=[float(event_y_approx)], mode='markers',
                            marker=dict(size=10, color='red' if event['amount'] < 0 else 'green', symbol='triangle-down' if event['amount'] < 0 else 'triangle-up'),
                            name=f"One-off: {event['amount']:.0f}"
                        ))
                fig_balance.update_layout(title="Portfolio Balance Over Time (What-If)", xaxis_title="Year", yaxis_title="Portfolio Balance", autosize=True, margin=dict(l=30, r=20, t=40, b=40, pad=2))
                plot1_spec_interactive = {'data': [trace.to_plotly_json() for trace in fig_balance.data], 'layout': fig_balance.layout.to_plotly_json()}
            except Exception as e_plot1_ia:
                current_app.logger.error(f"Error generating interactive balance plot spec: {e_plot1_ia}", exc_info=True)

        if sim_years is not None and sim_withdrawals is not None:
            try:
                fig_withdrawals = go.Figure()
                total_T_sim_ia = len(sim_withdrawals)
                x_withdraw_years_ia = list(sim_years[1 : total_T_sim_ia + 1]) if total_T_sim_ia > 0 and len(sim_years) >= (total_T_sim_ia + 1) else []
                y_withdrawals_ia = list(sim_withdrawals)
                if total_T_sim_ia > 0 and len(x_withdraw_years_ia) == total_T_sim_ia:
                    fig_withdrawals.add_trace(go.Scatter(x=x_withdraw_years_ia, y=y_withdrawals_ia, mode='lines+markers', name="Annual Withdrawal (What-If)", line=dict(color='green')))
                else:
                    fig_withdrawals.add_trace(go.Scatter(x=[], y=[], mode='lines+markers', name="Annual Withdrawal (What-If)", line=dict(color='green')))
                    if total_T_sim_ia > 0:
                         current_app.logger.warning(f"Interactive withdrawal plot data length mismatch: x_data (len {len(x_withdraw_years_ia)}), y_data (len {total_T_sim_ia})")
                fig_withdrawals.update_layout(title="Annual Withdrawals Over Time (What-If)", xaxis_title="Year", yaxis_title="Annual Withdrawal Amount", autosize=True, margin=dict(l=30, r=20, t=40, b=40, pad=2))
                plot2_spec_interactive = {'data': [trace.to_plotly_json() for trace in fig_balance.data], 'layout': fig_withdrawals.layout.to_plotly_json()} # Corrected: fig_withdrawals.data
            except Exception as e_plot2_ia:
                current_app.logger.error(f"Error generating interactive withdrawal plot spec: {e_plot2_ia}", exc_info=True)

        return jsonify({
            'new_W': new_W_calculated, 'new_P': new_P_calculated,
            'plot1_spec': plot1_spec_interactive, 'plot2_spec': plot2_spec_interactive
        })
    except Exception as e:
        current_app.logger.error(f"Error in /recalculate_interactive: {e}", exc_info=True)
        return jsonify({'error': 'An unexpected server error occurred.'}), 500

import csv
import io
from flask import Response

@wizard_bp.route('/export/csv')
def export_csv():
    export_data = session.get('last_calc_export_data')
    if not export_data:
        flash("No calculation data available to export. Please perform a calculation first.", "error")
        return redirect(url_for('wizard_bp.wizard_summary_step'))

    output = io.StringIO()
    writer = csv.writer(output)
    # Use gettext for CSV headers
    writer.writerow([current_app.extensions['babel'].gettext("FIRE Calculation Summary")])
    writer.writerow([])
    writer.writerow([current_app.extensions['babel'].gettext("Input Annual Expenses (W)"), export_data.get('W')])
    writer.writerow([current_app.extensions['babel'].gettext("Calculated FIRE Number (P)"), export_data.get('P_calculated')])
    writer.writerow([current_app.extensions['babel'].gettext("Overall Nominal Return Rate (%)"), export_data.get('r_overall_nominal') * 100 if export_data.get('r_overall_nominal') is not None else 'N/A'])
    writer.writerow([current_app.extensions['babel'].gettext("Overall Inflation Rate (%)"), export_data.get('i_overall') * 100 if export_data.get('i_overall') is not None else 'N/A'])
    writer.writerow([current_app.extensions['babel'].gettext("Total Duration (years)"), export_data.get('total_duration_from_periods')])
    writer.writerow([current_app.extensions['babel'].gettext("Withdrawal Timing"), str(export_data.get('withdrawal_time_str', '')).capitalize()])
    writer.writerow([current_app.extensions['babel'].gettext("Desired Final Portfolio Value"), export_data.get('desired_final_value')])

    writer.writerow([])
    writer.writerow([current_app.extensions['babel'].gettext("Rate Periods Applied:")])
    rates_p = export_data.get('rates_periods_summary', [])
    if rates_p:
        writer.writerow([current_app.extensions['babel'].gettext("Period Duration (Yrs)"), current_app.extensions['babel'].gettext("Nominal Return Rate (%)"), current_app.extensions['babel'].gettext("Inflation Rate (%) Used")])
        for p in rates_p:
            writer.writerow([p.get('duration'), p.get('r') * 100 if p.get('r') is not None else 'N/A', p.get('i') * 100 if p.get('i') is not None else 'N/A'])
    else:
        writer.writerow([current_app.extensions['babel'].gettext("N/A (Used overall rates for total duration)")])

    writer.writerow([])
    writer.writerow([current_app.extensions['babel'].gettext("One-Off Events Considered:")])
    one_offs = export_data.get('one_off_events_summary', [])
    if one_offs:
        writer.writerow([current_app.extensions['babel'].gettext("Year"), current_app.extensions['babel'].gettext("Amount")])
        for event in one_offs:
            writer.writerow([event.get('year'), event.get('amount')])
    else:
        writer.writerow([current_app.extensions['babel'].gettext("None")])

    writer.writerow([])
    writer.writerow([current_app.extensions['babel'].gettext("Year-by-Year Simulation")])
    writer.writerow([current_app.extensions['babel'].gettext("Year"), current_app.extensions['babel'].gettext("Portfolio Balance (End of Year)"), current_app.extensions['babel'].gettext("Annual Withdrawal")])

    sim_years_exp = export_data.get('sim_years', [])
    sim_balances_exp = export_data.get('sim_balances', [])
    sim_withdrawals_exp = export_data.get('sim_withdrawals', [])

    total_T_sim_exp = len(sim_withdrawals_exp)
    if total_T_sim_exp > 0 and len(sim_years_exp) == (total_T_sim_exp + 1) and len(sim_balances_exp) == (total_T_sim_exp + 1):
        for i in range(total_T_sim_exp):
            year_display = sim_years_exp[i+1]
            balance = sim_balances_exp[i+1]
            withdrawal = sim_withdrawals_exp[i]
            writer.writerow([int(year_display), f"{balance:.2f}", f"{withdrawal:.2f}"])
    elif not sim_years_exp and not sim_balances_exp and not sim_withdrawals_exp :
          writer.writerow([current_app.extensions['babel'].gettext("N/A - No simulation years to display (e.g., T=0 or calculation issue).")])
    else:
          writer.writerow([current_app.extensions['babel'].gettext("N/A - Simulation data inconsistent or unavailable for table.")])

    output.seek(0)
    return Response(
        output,
        mimetype="text/csv",
        headers={"Content-Disposition": "attachment;filename=fire_calculation_results.csv"}
    )

@wizard_bp.route('/export/pdf', methods=['GET'])
def export_pdf():
    export_data = session.get('last_calc_export_data')
    if not export_data:
        flash(current_app.extensions['babel'].gettext("No calculation data available to export. Please perform a calculation first."), "error")
        return redirect(url_for('wizard_bp.wizard_summary_step'))

    pdf = FPDF()
    pdf.add_page()
    pdf.set_font("Arial", "B", 16)

    pdf.cell(0, 10, current_app.extensions['babel'].gettext("FIRE Calculation Results"), 0, 1, "C")
    pdf.ln(5)

    pdf.set_font("Arial", "B", 12)
    pdf.cell(0, 10, current_app.extensions['babel'].gettext("Summary of Inputs & Key Results:"), 0, 1)
    pdf.set_font("Arial", "", 10)

    input_summary = [
        (current_app.extensions['babel'].gettext("Input Annual Expenses (W)"), export_data.get('W')),
        (current_app.extensions['babel'].gettext("Calculated FIRE Number (P)"), export_data.get('P_calculated')),
        (current_app.extensions['babel'].gettext("Overall Nominal Return Rate (%)"), f"{export_data.get('r_overall_nominal', 0) * 100:.2f}%"),
        (current_app.extensions['babel'].gettext("Overall Inflation Rate (%)"), f"{export_data.get('i_overall', 0) * 100:.2f}%"),
        (current_app.extensions['babel'].gettext("Total Duration (years)"), export_data.get('total_duration_from_periods')),
        (current_app.extensions['babel'].gettext("Withdrawal Timing"), str(export_data.get('withdrawal_time_str', '')).capitalize()),
        (current_app.extensions['babel'].gettext("Desired Final Portfolio Value"), export_data.get('desired_final_value')),
    ]
    for key, val in input_summary:
        pdf.cell(90, 7, str(key), 0, 0)
        pdf.cell(0, 7, str(val if val is not None else 'N/A'), 0, 1)
    pdf.ln(3)

    pdf.set_font("Arial", "B", 12)
    pdf.cell(0, 10, current_app.extensions['babel'].gettext("Rate Periods Applied:"), 0, 1)
    pdf.set_font("Arial", "", 10)
    rates_p = export_data.get('rates_periods_summary', [])
    if rates_p:
        pdf.set_font("Arial", "B", 10)
        pdf.cell(40, 7, current_app.extensions['babel'].gettext("Duration (Yrs)"), 1, 0, "C")
        pdf.cell(60, 7, current_app.extensions['babel'].gettext("Nominal Return (%)"), 1, 0, "C")
        pdf.cell(60, 7, current_app.extensions['babel'].gettext("Inflation Used (%)"), 1, 1, "C")
        pdf.set_font("Arial", "", 10)
        for p_item in rates_p: # Renamed p to p_item
            pdf.cell(40, 7, str(p_item.get('duration')), 1, 0, "C")
            pdf.cell(60, 7, f"{p_item.get('r',0)*100:.2f}", 1, 0, "C")
            pdf.cell(60, 7, f"{p_item.get('i',0)*100:.2f}", 1, 1, "C")
    else:
        pdf.cell(0, 7, current_app.extensions['babel'].gettext("N/A (Used overall rates for total duration)"), 0, 1)
    pdf.ln(3)

    pdf.set_font("Arial", "B", 12)
    pdf.cell(0, 10, current_app.extensions['babel'].gettext("One-Off Events Considered:"), 0, 1)
    pdf.set_font("Arial", "", 10)
    one_offs = export_data.get('one_off_events_summary', [])
    if one_offs:
        pdf.set_font("Arial", "B", 10)
        pdf.cell(40, 7, current_app.extensions['babel'].gettext("Year"), 1, 0, "C")
        pdf.cell(60, 7, current_app.extensions['babel'].gettext("Amount"), 1, 1, "C")
        pdf.set_font("Arial", "", 10)
        for event_item in one_offs: # Renamed event to event_item
            pdf.cell(40, 7, str(event_item.get('year')), 1, 0, "C")
            pdf.cell(60, 7, f"{event_item.get('amount', 0):.2f}", 1, 1, "C")
    else:
        pdf.cell(0, 7, current_app.extensions['babel'].gettext("None"), 0, 1)
    pdf.ln(5)

    pdf.set_font("Arial", "B", 12)
    pdf.cell(0, 10, current_app.extensions['babel'].gettext("Charts:"), 0, 1)
    pdf.set_font("Arial", "", 10)

    plot_temp_files = []
    try:
        sim_years_list = export_data.get('sim_years', [])
        sim_balances_list = export_data.get('sim_balances', [])
        sim_withdrawals_list = export_data.get('sim_withdrawals', [])
        one_off_events_for_plot = export_data.get('one_off_events_summary', [])

        if sim_years_list and sim_balances_list:
            fig_balance_pdf = go.Figure() # Renamed fig_balance to fig_balance_pdf
            fig_balance_pdf.add_trace(go.Scatter(x=sim_years_list, y=sim_balances_list, mode='lines+markers', name=current_app.extensions['babel'].gettext('Portfolio Balance')))
            for event_pdf in one_off_events_for_plot: # Renamed event to event_pdf
                if 0 <= event_pdf['year'] < len(sim_balances_list):
                    event_y_approx = sim_balances_list[event_pdf['year']]
                    fig_balance_pdf.add_trace(go.Scatter(x=[event_pdf['year']], y=[float(event_y_approx)], mode='markers',
                                                         marker=dict(size=8, color='red' if event_pdf['amount'] < 0 else 'green'), name=f"Event: {event_pdf['amount']:.0f}"))
            fig_balance_pdf.update_layout(title=current_app.extensions['babel'].gettext('Portfolio Balance Over Time'), autosize=False, width=500, height=350, margin=dict(l=30,r=20,t=40,b=30))

            with tempfile.NamedTemporaryFile(delete=False, suffix=".png") as tmp_file_bal:
                try:
                    fig_balance_pdf.write_image(tmp_file_bal.name, format='png', scale=2)
                    pdf.image(tmp_file_bal.name, x=10, w=pdf.w - 20)
                    plot_temp_files.append(tmp_file_bal.name)
                except Exception as e_img_bal:
                    current_app.logger.error(f"Failed to write balance plot image: {e_img_bal}")
                    pdf.cell(0, 7, current_app.extensions['babel'].gettext("Portfolio balance plot could not be generated."), 0, 1)
            pdf.ln(3)

        if sim_years_list and sim_withdrawals_list:
            total_T_sim_pdf = len(sim_withdrawals_list) # Renamed total_T_sim
            x_withdraw_years_pdf = sim_years_list[1:total_T_sim_pdf+1] if len(sim_years_list) > total_T_sim_pdf else [] # Renamed x_withdraw_years
            if len(x_withdraw_years_pdf) == total_T_sim_pdf and total_T_sim_pdf > 0:
                fig_withdrawals_pdf = go.Figure() # Renamed fig_withdrawals
                fig_withdrawals_pdf.add_trace(go.Scatter(x=x_withdraw_years_pdf, y=sim_withdrawals_list, mode='lines+markers', name=current_app.extensions['babel'].gettext('Annual Withdrawal')))
                fig_withdrawals_pdf.update_layout(title=current_app.extensions['babel'].gettext('Annual Withdrawals Over Time'), autosize=False, width=500, height=350, margin=dict(l=30,r=20,t=40,b=30))
                with tempfile.NamedTemporaryFile(delete=False, suffix=".png") as tmp_file_wd:
                    try:
                        fig_withdrawals_pdf.write_image(tmp_file_wd.name, format='png', scale=2)
                        pdf.image(tmp_file_wd.name, x=10, w=pdf.w - 20)
                        plot_temp_files.append(tmp_file_wd.name)
                    except Exception as e_img_wd:
                        current_app.logger.error(f"Failed to write withdrawal plot image: {e_img_wd}")
                        pdf.cell(0, 7, current_app.extensions['babel'].gettext("Annual withdrawal plot could not be generated."), 0, 1)
            elif total_T_sim_pdf == 0:
                 pdf.cell(0, 7, current_app.extensions['babel'].gettext("No withdrawal data to plot (e.g. T=0)."), 0, 1)
    except Exception as e_plots:
        current_app.logger.error(f"Error during plot generation for PDF: {e_plots}")
        pdf.cell(0, 7, current_app.extensions['babel'].gettext("Plots could not be generated due to an error."), 0, 1)
    finally:
        for temp_file_path in plot_temp_files:
            try:
                os.remove(temp_file_path)
            except OSError:
                current_app.logger.error(f"Error removing temporary plot file: {temp_file_path}")
    pdf.ln(5)

    pdf.set_font("Arial", "B", 12)
    pdf.cell(0, 10, current_app.extensions['babel'].gettext("Year-by-Year Simulation:"), 0, 1)
    pdf.set_font("Arial", "B", 10)
    pdf.cell(40, 7, current_app.extensions['babel'].gettext("Year"), 1, 0, "C")
    pdf.cell(75, 7, current_app.extensions['babel'].gettext("Portfolio Balance (End)"), 1, 0, "C")
    pdf.cell(75, 7, current_app.extensions['babel'].gettext("Annual Withdrawal"), 1, 1, "C")
    pdf.set_font("Arial", "", 10)

    sim_years_pdf_table = export_data.get('sim_years', []) # Renamed for clarity
    sim_balances_pdf_table = export_data.get('sim_balances', [])
    sim_withdrawals_pdf_table = export_data.get('sim_withdrawals', [])
    total_T_sim_pdf_table = len(sim_withdrawals_pdf_table)

    if total_T_sim_pdf_table > 0 and len(sim_years_pdf_table) == (total_T_sim_pdf_table + 1) and len(sim_balances_pdf_table) == (total_T_sim_pdf_table + 1):
        for i in range(total_T_sim_pdf_table):
            pdf.cell(40, 7, str(int(sim_years_pdf_table[i+1])), 1, 0, "C")
            pdf.cell(75, 7, f"{sim_balances_pdf_table[i+1]:.2f}", 1, 0, "R")
            pdf.cell(75, 7, f"{sim_withdrawals_pdf_table[i]:.2f}", 1, 1, "R")
    else:
        pdf.cell(0, 7, current_app.extensions['babel'].gettext("N/A - No simulation years to display or data inconsistent."), 1, 1, "C")

    return Response(
        pdf.output(dest='S').encode('latin-1'),
        mimetype='application/pdf',
        headers={'Content-Disposition': 'attachment;filename=fire_calculation_results.pdf'}
    )

[end of project/wizard_routes.py]
