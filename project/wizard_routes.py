from flask import Blueprint, render_template, redirect, url_for, session, request, flash, current_app # Add current_app
from project.forms import ExpensesForm, RatesForm, OneOffsForm
from project.constants import TIME_START, TIME_END # For withdrawal_time mapping
# Assuming generate_plots and other calc functions are accessible or need to be imported
# from project.routes import generate_plots # Or from project.financial_calcs
# For now, let's assume we'll call a refactored version or directly use financial_calcs
from project.financial_calcs import annual_simulation, find_required_portfolio
import plotly.graph_objects as go
from plotly.io import to_html
import sys # For stderr
from flask_wtf.csrf import generate_csrf
# Import generate_plots if it's refactored to be callable with data.
# For now, let's try to replicate the core logic that was in project.routes.index for generate_plots.
from project.financial_calcs import find_max_annual_expense # Added for AJAX endpoint
from flask import jsonify # Added for AJAX endpoint

wizard_bp = Blueprint('wizard_bp', __name__, template_folder='../templates', url_prefix='/wizard') # Added url_prefix

@wizard_bp.route('/expenses', methods=['GET', 'POST'])
def wizard_expenses_step():
    form = ExpensesForm(request.form if request.method == 'POST' else None)
    if form.validate_on_submit():
        form_data = form.data.copy() # Get a mutable copy

        # Calculate sum of itemized expenses
        itemized_sum = sum(
            form_data.get(key, 0) or 0 for key in
            ['housing', 'food', 'transportation', 'utilities',
             'personal_care', 'entertainment', 'healthcare', 'other_expenses']
        )

        submitted_annual_expenses = form_data.get('annual_expenses')

        if (submitted_annual_expenses is None or submitted_annual_expenses == 0) and itemized_sum > 0:
            form_data['annual_expenses'] = itemized_sum
        # Else, use the user-submitted annual_expenses (even if it's 0 and itemized_sum is also 0)

        session['wizard_expenses'] = form_data
        return redirect(url_for('wizard_bp.wizard_rates_step'))
    # Pre-fill form if data already in session (e.g., user went back)
    elif request.method == 'GET' and 'wizard_expenses' in session:
        form = ExpensesForm(data=session['wizard_expenses'])
    return render_template('wizard_expenses.html', form=form, title='Step 1: Your Expenses')

@wizard_bp.route('/rates', methods=['GET', 'POST'])
def wizard_rates_step():
    # Ensure previous step is done, or redirect back
    if 'wizard_expenses' not in session:
        return redirect(url_for('wizard_bp.wizard_expenses_step'))

    form = RatesForm(request.form if request.method == 'POST' else None)
    if form.validate_on_submit():
        # Handle dynamic addition of period rates if those buttons were pressed
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
    # Ensure previous step is done
    if 'wizard_rates' not in session:
        return redirect(url_for('wizard_bp.wizard_rates_step'))

    form = OneOffsForm(request.form if request.method == 'POST' else None)
    if form.validate_on_submit():
        # Handle dynamic additions for expenses/incomes
        if form.submit_add_expense.data:
            form.large_expenses.append_entry()
            return render_template('wizard_one_offs.html', form=form, title='Step 3: One-Off Events')
        elif form.submit_add_income.data:
            form.large_incomes.append_entry()
            return render_template('wizard_one_offs.html', form=form, title='Step 3: One-Off Events')

        session['wizard_one_offs'] = form.data
        return redirect(url_for('wizard_bp.wizard_summary_step')) # Assuming summary step is next
    elif request.method == 'GET' and 'wizard_one_offs' in session:
        form = OneOffsForm(data=session['wizard_one_offs'])
    return render_template('wizard_one_offs.html', form=form, title='Step 3: One-Off Events')


@wizard_bp.route('/summary', methods=['GET'])
def wizard_summary_step():
    # Ensure all previous steps are done, or redirect back to the earliest incomplete step
    if 'wizard_one_offs' not in session:
        return redirect(url_for('wizard_bp.wizard_one_offs_step'))
    if 'wizard_rates' not in session: # Should be caught by one_offs check, but good for robustness
        return redirect(url_for('wizard_bp.wizard_rates_step'))
    if 'wizard_expenses' not in session: # Should be caught by rates check, but good for robustness
        return redirect(url_for('wizard_bp.wizard_expenses_step'))

    # Retrieve all data from session
    expenses_data = session.get('wizard_expenses', {})
    rates_data = session.get('wizard_rates', {})
    one_offs_data = session.get('wizard_one_offs', {})

    # Potentially clear session data after retrieving it if this is the final step
    # and data is about to be used for calculation, or if there's a "start over" button.
    # For now, let's keep it in session for easier review and potential "back" navigation.
    # session.pop('wizard_expenses', None)
    # session.pop('wizard_rates', None)
    # session.pop('wizard_one_offs', None)

    csrf_token_value = generate_csrf()

    return render_template('wizard_summary.html',
                           title='Wizard Summary',
                           expenses_data=expenses_data,
                           rates_data=rates_data,
                           one_offs_data=one_offs_data,
                           csrf_token_value=csrf_token_value)


@wizard_bp.route('/calculate', methods=['POST'])
def wizard_calculate_step():
    # Ensure all wizard data is in session
    if not all(key in session for key in ['wizard_expenses', 'wizard_rates', 'wizard_one_offs']):
        flash("Session data is incomplete. Please restart the wizard.", "error") # Using Flask's _gettext
        return redirect(url_for('wizard_bp.wizard_expenses_step'))

    expenses_data = session.get('wizard_expenses', {})
    rates_data = session.get('wizard_rates', {})
    one_offs_data = session.get('wizard_one_offs', {})

    # --- Data Transformation ---
    try:
        W = float(expenses_data.get('annual_expenses', 0))

        # Rates and Periods
        r_overall_nominal = float(rates_data.get('return_rate', 0)) / 100.0
        i_overall = float(rates_data.get('inflation_rate', 0)) / 100.0

        rates_periods = []
        if rates_data.get('period_rates'):
            for period in rates_data['period_rates']:
                if period.get('years') and period.get('rate') is not None:
                    rates_periods.append({
                        'duration': int(period['years']),
                        'r': float(period['rate']) / 100.0,
                        'i': i_overall
                    })

        total_duration_from_periods = sum(p['duration'] for p in rates_periods) if rates_periods else 0

        if not rates_periods:
            # T_fallback_from_form will be an int due to IntegerField, or None if not provided AND no default
            # Since we have a default in the form, it should always be present in form.data
            T_fallback = int(rates_data.get('total_duration_fallback', 30)) # Defaulting to 30 if key somehow missing from session

            rates_periods.append({'duration': T_fallback, 'r': r_overall_nominal, 'i': i_overall})
            total_duration_from_periods = T_fallback

        # One-off events
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

        # --- Actual Calculation ---
        P_calculated = None
        W_actual_for_P_calc = W # This is W_initial for find_required_portfolio
        sim_years, sim_balances, sim_withdrawals = [], [], []
        error_message = None

        # Assuming 'app' is imported and available for app.logger
        # from app import app # Would be needed if not already available globally
        # Or use from flask import current_app; current_app.logger

        try:
            current_app.logger.debug(f"Calling find_required_portfolio with W_initial={W_actual_for_P_calc}, withdrawal_time={withdrawal_time}, desired_final_value={desired_final_value}")
            current_app.logger.debug(f"rates_periods for find_required_portfolio: {rates_periods}")
            current_app.logger.debug(f"one_off_events for find_required_portfolio: {one_off_events}")

            P_calculated = find_required_portfolio(
                W_initial=W_actual_for_P_calc,
                withdrawal_time=withdrawal_time,
                rates_periods=rates_periods,
                desired_final_value=desired_final_value,
                one_off_events=one_off_events
            )

            if P_calculated is None or P_calculated == float('inf') or P_calculated < 0:
                error_message = "Could not calculate a suitable portfolio (FIRE number) for the given expenses and market conditions. Inputs may be unrealistic (e.g., expenses too high, returns too low for the duration)." # Flask's _gettext will handle this
                P_calculated_display = "Not Feasible"
            else:
                P_calculated_display = f"{P_calculated:,.2f}"
                current_app.logger.debug(f"Calling annual_simulation with PV_initial={P_calculated}, W_initial={W_actual_for_P_calc}, withdrawal_time={withdrawal_time}, desired_final_value={desired_final_value}")
                current_app.logger.debug(f"rates_periods for annual_simulation: {rates_periods}")
                current_app.logger.debug(f"one_off_events for annual_simulation: {one_off_events}")

                sim_years, sim_balances, sim_withdrawals = annual_simulation(
                    PV=P_calculated, # <--- Changed PV_initial to PV
                    W_initial=W_actual_for_P_calc,
                    withdrawal_time=withdrawal_time,
                    rates_periods=rates_periods,
                    one_off_events=one_off_events
                    # desired_final_value is NOT a direct parameter of annual_simulation
                )
                # ADD DETAILED LOGGING HERE:
                current_app.logger.debug(f"annual_simulation returned: sim_years (type: {type(sim_years)}, len: {len(sim_years) if sim_years is not None else 'None'}): {str(sim_years)[:200]}")
                current_app.logger.debug(f"annual_simulation returned: sim_balances (type: {type(sim_balances)}, len: {len(sim_balances) if sim_balances is not None else 'None'}): {str(sim_balances)[:200]}")
                current_app.logger.debug(f"annual_simulation returned: sim_withdrawals (type: {type(sim_withdrawals)}, len: {len(sim_withdrawals) if sim_withdrawals is not None else 'None'}): {str(sim_withdrawals)[:200]}")

        except Exception as e:
            current_app.logger.error(f"Error during financial calculation: {e}", exc_info=True)
            error_message = "An unexpected error occurred during financial calculations."
            P_calculated_display = "Error"

        # Session clearing moved further down to only occur on full success

        if error_message:
            flash(error_message, "error")
            return render_template('wizard_results.html',
                                   title="Calculation Error",
                                   error_message=error_message,
                                   P_calculated_display=P_calculated_display,
                                   P_raw=0.0, # Default for input field in error case
                                   W=W,
                                   W_display=f"{W:,.2f}", # Ensure W_display is also passed in error case
                                   r_overall_nominal=r_overall_nominal,
                                   i_overall=i_overall,
                                   rates_periods_summary=rates_periods,
                                   total_duration_from_periods=total_duration_from_periods,
                                   one_off_events_summary=one_off_events,
                                   withdrawal_time_str=withdrawal_time_str,
                                   desired_final_value=desired_final_value,
                                   csrf_token_for_ajax=generate_csrf() # Added for AJAX on results page
                                  )

        # --- Plot Generation ---
        plot1_div = "<div>Plotting error or no data for portfolio balance.</div>"
        plot2_div = "<div>Plotting error or no data for withdrawals.</div>"

        if sim_years is not None and sim_balances is not None and len(sim_years) > 0:
            try:
                fig_balance = go.Figure()
                fig_balance.add_trace(go.Scatter(x=sim_years, y=sim_balances[1:], mode='lines+markers', name="Portfolio Balance"))
                for event in one_off_events: # one_off_events is already available from transformation
                    if event['year'] <= sim_years[-1]:
                        event_y_approx = sim_balances[min(event['year'], len(sim_balances)-1)] # Approximate y for marker
                        fig_balance.add_trace(go.Scatter(
                            x=[event['year']], y=[event_y_approx], mode='markers',
                            marker=dict(size=10, color='red' if event['amount'] < 0 else 'green', symbol='triangle-down' if event['amount'] < 0 else 'triangle-up'),
                            name=f"One-off: {event['amount']:.0f}"
                        ))
                fig_balance.update_layout(title="Portfolio Balance Over Time", xaxis_title="Year", yaxis_title="Portfolio Balance", legend_title_text="Legend")
                plot1_div = to_html(fig_balance, full_html=False, include_plotlyjs='cdn')
            except Exception as e_plot1:
                current_app.logger.error(f"Error generating balance plot: {e_plot1}", exc_info=True)


        if sim_years is not None and sim_withdrawals is not None and len(sim_years) > 0:
            try:
                fig_withdrawals = go.Figure()
                fig_withdrawals.add_trace(go.Scatter(x=sim_years, y=sim_withdrawals, mode='lines+markers', name="Annual Withdrawal"))
                fig_withdrawals.update_layout(title="Annual Withdrawals Over Time", xaxis_title="Year", yaxis_title="Annual Withdrawal Amount", legend_title_text="Legend")
                plot2_div = to_html(fig_withdrawals, full_html=False, include_plotlyjs='cdn')
            except Exception as e_plot2:
                current_app.logger.error(f"Error generating withdrawal plot: {e_plot2}", exc_info=True)

        table_rows = []
        if sim_withdrawals is not None and len(sim_withdrawals) > 0:
            total_T_from_sim = len(sim_withdrawals) # This is the number of years with withdrawals

            # Check consistency with other arrays based on total_T_from_sim
            if (sim_years is not None and len(sim_years) == (total_T_from_sim + 1) and
                sim_balances is not None and len(sim_balances) == (total_T_from_sim + 1)):

                for i in range(total_T_from_sim): # Loop from 0 to total_T - 1
                    year_display = sim_years[i+1] # Year 1, 2, ..., total_T
                    # sim_balances[0] is initial PV.
                    # sim_balances[i+1] is balance at end of year_display.
                    balance = sim_balances[i+1]
                    # sim_withdrawals[i] is withdrawal during year_display.
                    withdrawal = sim_withdrawals[i]

                    table_rows.append({
                        'year': int(year_display), # Ensure year is int for display
                        'balance': f"{balance:,.2f}",
                        'withdrawal': f"{withdrawal:,.2f}"
                    })
            elif not error_message: # Only log if there wasn't a bigger calculation error
                current_app.logger.warning(
                    "Could not generate table_rows due to inconsistent simulation data shapes " +
                    "relative to sim_withdrawals length."
                )
                current_app.logger.debug(
                    f"sim_years (len: {len(sim_years) if sim_years is not None else 'None'}), " +
                    f"sim_balances (len: {len(sim_balances) if sim_balances is not None else 'None'}), " +
                    f"sim_withdrawals (len: {len(sim_withdrawals) if sim_withdrawals is not None else 'None'})"
                )
        elif not error_message: # sim_withdrawals is None or empty
             current_app.logger.info("No withdrawal data from simulation to generate table rows (e.g., T=0).")


        W_display = f"{W:,.2f}"

        # NOW, clear session as we are about to render a successful result
        session.pop('wizard_expenses', None)
        session.pop('wizard_rates', None)
        session.pop('wizard_one_offs', None)
        current_app.logger.debug("Wizard session data cleared after successful calculation.")


        return render_template('wizard_results.html',
                               title="Calculation Results",
                               P_calculated_display=P_calculated_display,
                               P_raw=P_calculated if P_calculated is not None and P_calculated != float('inf') else 0.0, # Raw float
                               W_display=W_display,
                               W=W, # Raw W is already passed
                               sim_years=sim_years,
                               sim_balances=sim_balances,
                               sim_withdrawals=sim_withdrawals,
                               table_rows=table_rows,
                               plot1_div=plot1_div,
                               plot2_div=plot2_div,
                               r_overall_nominal=r_overall_nominal,
                               i_overall=i_overall,
                               rates_periods_summary=rates_periods,
                               total_duration_from_periods=total_duration_from_periods,
                               one_off_events_summary=one_off_events,
                               withdrawal_time_str=withdrawal_time_str,
                               desired_final_value=desired_final_value,
                               csrf_token_for_ajax=generate_csrf() # Added for AJAX on results page (even on error, for meta tag)
                              )

    except Exception as e:
        # This outer try-except catches errors in data transformation itself
        current_app.logger.error(f"Error during data transformation in wizard: {e}", exc_info=True)
        flash("An error occurred preparing data for calculation. Please check your inputs.", "error")
        return redirect(url_for('wizard_bp.wizard_summary_step'))


@wizard_bp.route('/recalculate_interactive', methods=['POST'])
def wizard_recalculate_interactive():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Invalid request: No JSON data received.'}), 400

        changed_input = data.get('changed_input') # 'W' or 'P'
        W_input_val = float(data.get('W_value', 0))
        P_input_val = float(data.get('P_value', 0))

        r_overall_nominal_str = data.get('r_overall_nominal', '0.0')
        i_overall_str = data.get('i_overall', '0.0')
        withdrawal_time_str = data.get('withdrawal_time_str', 'end')
        fixed_desired_final_value_str = data.get('fixed_desired_final_value', '0.0')
        fixed_rates_periods_summary = data.get('rates_periods_summary', [])
        fixed_one_off_events_summary = data.get('one_off_events_summary', [])

        # Data Transformation for fixed parameters
        r_overall_nominal = float(r_overall_nominal_str)
        i_overall = float(i_overall_str)
        rates_periods_for_calc = fixed_rates_periods_summary

        if not rates_periods_for_calc:
            # Fallback if client didn't construct rates_periods from total_duration_fallback
            fixed_total_duration_str = data.get('total_duration_from_periods', '30') # From hidden field value
            rates_periods_for_calc = [{
                'duration': int(fixed_total_duration_str),
                'r': r_overall_nominal,
                'i': i_overall
            }]

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
                new_P_calculated = P_input_val
                new_W_calculated = W_to_use
            else:
                new_P_calculated = P_recalculated
                new_W_calculated = W_to_use
                sim_years, sim_balances, sim_withdrawals = annual_simulation(
                    PV=new_P_calculated, W_initial=new_W_calculated, withdrawal_time=withdrawal_time,
                    rates_periods=rates_periods_for_calc, one_off_events=one_off_events_for_calc
                )

        elif changed_input == 'P':
            P_to_use = P_input_val
            W_recalculated = find_max_annual_expense(
                P=P_to_use, # <--- Changed PV to P
                withdrawal_time=withdrawal_time,
                rates_periods=rates_periods_for_calc, desired_final_value=desired_final_value_for_calc,
                one_off_events=one_off_events_for_calc
            )
            if W_recalculated is None or W_recalculated < 0:
                error_msg_recalc = "Could not calculate a sustainable withdrawal for the new portfolio."
                new_W_calculated = W_input_val
                new_P_calculated = P_to_use
            else:
                new_W_calculated = W_recalculated
                new_P_calculated = P_to_use
                sim_years, sim_balances, sim_withdrawals = annual_simulation(
                    PV=new_P_calculated, W_initial=new_W_calculated, withdrawal_time=withdrawal_time,
                    rates_periods=rates_periods_for_calc, one_off_events=one_off_events_for_calc
                )
        else:
            return jsonify({'error': 'Invalid changed_input value.'}), 400

        if error_msg_recalc:
            return jsonify({'error': error_msg_recalc, 'new_W': new_W_calculated, 'new_P': new_P_calculated}), 200

        plot1_div_html = "<div>Plotting error or no data for portfolio balance.</div>"
        plot2_div_html = "<div>Plotting error or no data for withdrawals.</div>"

        if sim_years is not None and sim_balances is not None and len(sim_years) > 0 :
            try:
                fig_balance = go.Figure()
                fig_balance.add_trace(go.Scatter(x=sim_years, y=sim_balances[1:], mode='lines+markers', name="Portfolio Balance"))
                for event in one_off_events_for_calc:
                    if event['year'] <= sim_years[-1]:
                        event_y_approx = sim_balances[min(event['year'], len(sim_balances)-1)]
                        fig_balance.add_trace(go.Scatter(
                            x=[event['year']], y=[event_y_approx], mode='markers',
                            marker=dict(size=10, color='red' if event['amount'] < 0 else 'green', symbol='triangle-down' if event['amount'] < 0 else 'triangle-up'),
                            name=f"One-off: {event['amount']:.0f}"
                        ))
                fig_balance.update_layout(title="Portfolio Balance Over Time", xaxis_title="Year", yaxis_title="Portfolio Balance")
                plot1_div_html = to_html(fig_balance, full_html=False, include_plotlyjs='cdn')
            except Exception as e_plot1:
                current_app.logger.error(f"Error generating balance plot for AJAX: {e_plot1}", exc_info=True)

        if sim_years is not None and sim_withdrawals is not None and len(sim_years) > 0:
            try:
                fig_withdrawals = go.Figure()
                fig_withdrawals.add_trace(go.Scatter(x=sim_years, y=sim_withdrawals, mode='lines+markers', name="Annual Withdrawal"))
                fig_withdrawals.update_layout(title="Annual Withdrawals Over Time", xaxis_title="Year", yaxis_title="Annual Withdrawal Amount")
                plot2_div_html = to_html(fig_withdrawals, full_html=False, include_plotlyjs='cdn')
            except Exception as e_plot2:
                current_app.logger.error(f"Error generating withdrawal plot for AJAX: {e_plot2}", exc_info=True)

        return jsonify({
            'new_W': new_W_calculated,
            'new_P': new_P_calculated,
            'plot1_div_html': plot1_div_html,
            'plot2_div_html': plot2_div_html
        })

    except Exception as e:
        current_app.logger.error(f"Error in /recalculate_interactive: {e}", exc_info=True)
        return jsonify({'error': 'An unexpected server error occurred.'}), 500
