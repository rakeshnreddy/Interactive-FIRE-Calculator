from flask import render_template, jsonify, request, current_app, Response # Assuming these are used; current_app can be an alternative in some cases
import numpy as np
import plotly.graph_objects as go
import plotly.offline as pyo
import io
import csv
import datetime

# Assuming app.py is in the root directory.
# financial_calcs.py and constants.py are now in the same 'project' package.
# DO NOT: from app import app # This was causing the circular import
from .financial_calcs import annual_simulation, simulate_final_balance, find_required_portfolio, find_max_annual_expense # Example, adjust as needed
from .constants import MODE_WITHDRAWAL, MODE_PORTFOLIO, TIME_START, TIME_END, MAX_SCENARIOS_COMPARE # Example, adjust as needed

def generate_html_table(years, balances, withdrawals):
    """
    Generates an HTML table string from the simulation data.

    Args:
        years (list or np.array): Array of years (0 to T).
        balances (list): List of portfolio balances corresponding to each year.
        withdrawals (list): List of annual withdrawals (for years 0 to T-1).

    Returns:
        str: HTML string representing the table.
    """
    if not years.any() or not balances or not withdrawals:
        return "<p>No data available to display in table.</p>"

    header = "<thead><tr><th>Year</th><th>Portfolio Balance ($)</th><th>Annual Withdrawal ($)</th></tr></thead>"
    body_rows = []
    
    # Balances list has T+1 elements (for year 0 to T)
    # Withdrawals list has T elements (for year 0 to T-1)
    # Table should show T rows, for year 1 to T (or 0 to T-1 if preferred for display)

    for t_idx in range(len(withdrawals)): # Iterate T times, for withdrawals
        year_display = int(years[t_idx] + 1) # Display as Year 1, Year 2, ...
        balance_at_year_end_or_start = balances[t_idx+1] # Balance after withdrawal and growth for year t_idx
        withdrawal_for_year = withdrawals[t_idx]
        body_rows.append(f"<tr><td>{year_display}</td><td>{balance_at_year_end_or_start:,.2f}</td><td>{withdrawal_for_year:,.2f}</td></tr>")
    
    return f"<table class='data-table'> {header} <tbody>{''.join(body_rows)}</tbody> </table>"

def generate_plots(W, withdrawal_time, mode, rates_periods, P_value=None, desired_final_value=0.0):
    """
    Calculates financial figures and generates Plotly plots for portfolio balance and withdrawals.
    Now uses rates_periods instead of fixed r, i, T.

    Args:
        W (float): Initial annual withdrawal.
        withdrawal_time (str): "start" or "end".
        mode (str): Calculation mode, 'W' (find portfolio for W) or 'P' (find W for portfolio P).
        rates_periods (list of dicts): List of rate periods.
        P_value (float, optional): Initial portfolio value (used if mode='P'). Defaults to None.
        desired_final_value (float, optional): Desired portfolio value at the end of T years. Defaults to 0.0.

    Returns:
        tuple: (required_portfolio_or_P_value, calculated_W, portfolio_plot_div, withdrawal_plot_div, table_html)
    """
    if not rates_periods: # Should be caught by calling routes, but defensive check.
        return 0, 0, "<div>Error: No rate periods provided.</div>", "<div></div>", "<p>Table data error.</p>"

    if mode == MODE_WITHDRAWAL:
        # W is W_initial for find_required_portfolio
        required_portfolio = find_required_portfolio(W, withdrawal_time, rates_periods, desired_final_value=desired_final_value)
        calculated_W = W # The input W is the one we are basing calculations on
        if required_portfolio == float('inf'):
            error_message = "<div>Cannot find a suitable portfolio. Withdrawals may be too high or periods too long/unfavorable.</div>"
            return float('inf'), calculated_W, error_message, "<div></div>", "<p>Table data not available due to error.</p>"
    else: # mode == MODE_PORTFOLIO
        required_portfolio = P_value # This is the P_initial
        # P_value is P for find_max_annual_expense
        calculated_W = find_max_annual_expense(required_portfolio, withdrawal_time, rates_periods, desired_final_value=desired_final_value)
    
    # Ensure calculated_W is not None or problematic before annual_simulation
    if calculated_W is None or (isinstance(calculated_W, float) and (np.isnan(calculated_W) or np.isinf(calculated_W))):
        error_message = "<div>Error calculating sustainable withdrawal. Inputs might be unrealistic for the given portfolio.</div>"
        return required_portfolio, 0, error_message, "<div></div>", "<p>Table data not available due to error in withdrawal calculation.</p>"

    # Call new annual_simulation with rates_periods
    # W_initial for annual_simulation is the calculated_W (if mode P) or the input W (if mode W)
    years, balances, sim_withdrawals = annual_simulation(required_portfolio, calculated_W, withdrawal_time, rates_periods)
    
    plot_config = {'displayModeBar': False, 'responsive': True}
    
    fig1 = go.Figure()
    fig1.add_trace(go.Scatter(
        x=years, y=balances,
        mode='lines+markers',
        name='Portfolio Balance',
        hovertemplate='Year: %{x}<br>Balance: $%{y:,.2f}<extra></extra>'
    ))
    fig1.update_layout(
        title=f'Portfolio Balance (Withdrawals at {withdrawal_time.capitalize()})',
        xaxis_title='Years',
        yaxis_title='Portfolio Value ($)'
    )
    portfolio_plot = pyo.plot(fig1, include_plotlyjs=False, output_type='div', config=plot_config)
    
    fig2 = go.Figure()
    fig2.add_trace(go.Scatter(
        x=years[:-1], y=sim_withdrawals, # Use sim_withdrawals from new annual_simulation
        mode='lines+markers',
        name='Annual Withdrawal',
        marker_color='orange',
        hovertemplate='Year: %{x}<br>Withdrawal: $%{y:,.2f}<extra></extra>',
        uid="unique_withdrawal"  # ensuring unique uid if needed
    ))
    fig2.update_layout(
        title='Annual Withdrawals',
        xaxis_title='Years',
        yaxis_title='Withdrawal ($)'
    )
    withdrawal_plot = pyo.plot(fig2, include_plotlyjs=False, output_type='div', config=plot_config)

    table_html = generate_html_table(years, balances, sim_withdrawals) # Use sim_withdrawals
    return required_portfolio, calculated_W, portfolio_plot, withdrawal_plot, table_html


def register_app_routes(app_instance):
    @app_instance.route('/', methods=['GET', 'POST']) # This route handles the main form submission
    def index(): # Line 122
        """
        Handles GET requests for the main page and POST requests for form submissions 
        to calculate FIRE figures. Renders `index.html` or `result.html`.
        """
        if request.method == 'POST': # Line 127 in a typical full file if docstring is 3 lines
            form_data = request.form.to_dict() # Line 128
            # Initialize form_params_for_result_page with all possible form fields for pre-filling
            # This ensures that even if validation fails early, all keys are present.
            form_params_for_result_page = { # Line 130, now indented
                'W': form_data.get('W', '20000'),
                'r': form_data.get('r', '5'), 'i': form_data.get('i', '2'), 'T': form_data.get('T', '30'),
                'D': form_data.get('D', '0.0'),
                'withdrawal_time': form_data.get('withdrawal_time', TIME_END),
                'mode': form_data.get('mode', MODE_WITHDRAWAL),
                'P': form_data.get('P', '500000'),
                'period1_duration': form_data.get('period1_duration', ''), 'period1_r': form_data.get('period1_r', ''), 'period1_i': form_data.get('period1_i', ''),
                'period2_duration': form_data.get('period2_duration', ''), 'period2_r': form_data.get('period2_r', ''), 'period2_i': form_data.get('period2_i', ''),
                'period3_duration': form_data.get('period3_duration', ''), 'period3_r': form_data.get('period3_r', ''), 'period3_i': form_data.get('period3_i', ''),
            } # End of form_params_for_result_page

            try: # Line 143, now indented
                W_form = float(form_data.get('W', 0))
                withdrawal_time_form = form_data.get('withdrawal_time', TIME_END)
                mode_form = form_data.get('mode', MODE_WITHDRAWAL)
                D_form_str = form_data.get('D', '0.0')
                D_form = float(D_form_str) if D_form_str else 0.0

                if D_form < 0: raise ValueError("Desired final portfolio value (D) cannot be negative.")
                if W_form < 0: raise ValueError("Annual withdrawal (W) cannot be negative.")

                rates_periods_data = []
                for k in range(1, 4): # Max 3 periods
                    dur_str = form_data.get(f'period{k}_duration')
                    r_str = form_data.get(f'period{k}_r')
                    i_str = form_data.get(f'period{k}_i')

                    if dur_str and r_str and i_str: # Only process if all three are somewhat present
                        try:
                            duration = int(dur_str)
                            r_perc = float(r_str)
                            i_perc = float(i_str)
                            if duration > 0:
                                if not (-50 <= r_perc <= 100):
                                    raise ValueError(f"Period {k} annual return (r) must be between -50% and 100%.")
                                if not (-50 <= i_perc <= 100):
                                    raise ValueError(f"Period {k} inflation rate (i) must be between -50% and 100%.")
                                rates_periods_data.append({'duration': duration, 'r': r_perc / 100, 'i': i_perc / 100})
                            elif duration < 0 : # Explicitly disallow negative duration
                                 raise ValueError(f"Period {k} duration cannot be negative.")
                            # If duration is 0, it's skipped, effectively ignoring the period.
                        except ValueError as e: # Catch errors from int()/float() conversion or explicit raises
                            app_instance.logger.error(f"Invalid input for period {k}: {e} - Form data for period: dur='{dur_str}', r='{r_str}', i='{i_str}'")
                            # Pass back all originally submitted form_data for pre-filling
                            return render_template('index.html', error=str(e), **form_params_for_result_page)
                
                if not rates_periods_data: # Fallback to single period
                    r_perc_form = float(form_data.get('r', 0))
                    i_perc_form = float(form_data.get('i', 0))
                    T_form = int(form_data.get('T', 0))
                    if T_form <= 0: raise ValueError("Time horizon (T) must be greater than 0 for single period mode.")
                    if not (-50 <= r_perc_form <= 100): raise ValueError("Annual return (r) must be between -50% and 100%.")
                    if not (-50 <= i_perc_form <= 100): raise ValueError("Inflation rate (i) must be between -50% and 100%.")
                    rates_periods_data.append({'duration': T_form, 'r': r_perc_form / 100, 'i': i_perc_form / 100})
                
                P_value_form = None
                if mode_form == MODE_PORTFOLIO:
                    P_value_form = float(form_data.get('P', 0))
                    if P_value_form < 0: raise ValueError("Initial portfolio (P) cannot be negative.")

            except ValueError as e:
                app_instance.logger.error(f"Invalid input in index route: {e} - Form data: {form_data}")
                return render_template('index.html', error=str(e), **form_params_for_result_page)
            
            # Initialize variables for both modes
            portfolio_plot_W_mode, withdrawal_plot_W_mode = "<div>Error generating FIRE mode plot.</div>", "<div>Error generating FIRE mode plot.</div>"
            portfolio_plot_P_mode, withdrawal_plot_P_mode = "<div>Error generating Expense mode plot.</div>", "<div>Error generating Expense mode plot.</div>"
            table_data_W_mode_html = "<p>Table data not available.</p>"
            table_data_P_mode_html = "<p>Table data not available.</p>"
            calculated_P_output = "N/A"
            initial_W_input_for_fire_mode = W_form
            calculated_W_output_for_expense_mode = "N/A"
            initial_P_input_for_expense_mode_raw = P_value_form # Store raw value first

            if mode_form == MODE_WITHDRAWAL:
                P_calc_primary, W_actual_primary, p_plot_w, w_plot_w, table_w = generate_plots(
                    W_form, withdrawal_time_form, MODE_WITHDRAWAL, rates_periods_data, P_value=None, desired_final_value=D_form
                )
                if P_calc_primary == float('inf'):
                    return render_template('index.html', error="Cannot find a suitable portfolio for the given withdrawal. Inputs may be unrealistic.", **form_params_for_result_page)
                
                calculated_P_output = P_calc_primary
                initial_W_input_for_fire_mode = W_actual_primary
                portfolio_plot_W_mode, withdrawal_plot_W_mode = p_plot_w, w_plot_w
                table_data_W_mode_html = table_w

                initial_P_input_for_expense_mode_raw = P_calc_primary
                _, W_calc_secondary, p_plot_p, w_plot_p, table_p = generate_plots(
                    initial_W_input_for_fire_mode, withdrawal_time_form, MODE_PORTFOLIO, rates_periods_data, P_value=initial_P_input_for_expense_mode_raw, desired_final_value=D_form
                )
                calculated_W_output_for_expense_mode = W_calc_secondary
                portfolio_plot_P_mode, withdrawal_plot_P_mode = p_plot_p, w_plot_p
                table_data_P_mode_html = table_p

            elif mode_form == MODE_PORTFOLIO:
                P_actual_primary, W_calc_primary, p_plot_p, w_plot_p, table_p = generate_plots(
                    W_form, withdrawal_time_form, MODE_PORTFOLIO, rates_periods_data, P_value=P_value_form, desired_final_value=D_form
                )
                initial_P_input_for_expense_mode_raw = P_actual_primary
                calculated_W_output_for_expense_mode = W_calc_primary
                portfolio_plot_P_mode, withdrawal_plot_P_mode = p_plot_p, w_plot_p
                table_data_P_mode_html = table_p

                initial_W_input_for_fire_mode = W_calc_primary
                P_calc_secondary, _, p_plot_w, w_plot_w, table_w = generate_plots(
                    initial_W_input_for_fire_mode, withdrawal_time_form, MODE_WITHDRAWAL, rates_periods_data, P_value=None, desired_final_value=D_form
                )
                calculated_P_output = P_calc_secondary
                portfolio_plot_W_mode, withdrawal_plot_W_mode = p_plot_w, w_plot_w
                table_data_W_mode_html = table_w
            
            if initial_P_input_for_expense_mode_raw == float('inf'):
                initial_P_input_for_expense_mode_template = "N/A"
            else:
                initial_P_input_for_expense_mode_template = initial_P_input_for_expense_mode_raw
                
            # Add rates_periods_data to form_params_for_result_page for display/JS on result page
            # These are already in form_params_for_result_page from the top of POST handling
            # For the result page context, we also need to pass the single r, i, T if they were used as fallback
            # The form_params_for_result_page already has the original single r, i, T strings.
            # We need to add what was *actually* used for calculation if it was a fallback.
            # If rates_periods_data was built from period fields, r_form_val etc. for result.html need to be consistent.
            # For now, result.html sliders might not reflect multi-period if that's too complex.
            # Let's ensure the main calculated values are passed correctly.
            # The form_params_for_result_page currently holds the *original* single r, i, T.
            # If rates_periods_data was used, these might be misleading for the sliders on result page.
            # However, the D_form_val, withdrawal_time_form_val, initial_mode_from_index are fine.
            
            # Overwrite r_form_val, i_form_val, T_form_val if fallback single period was used.
            # Or, decide if result.html's sliders should be disabled/show "N/A" if multi-period was used.
            # For now, let's assume result.html will primarily display plots and tables from rates_periods_data.
            # The individual r, i, T sliders on result.html might become less relevant or need a redesign
            # if multi-period is the primary input on index.html.
            # The form_params_for_result_page is mostly for the data-* attributes on result.html for the export link.
            
            # For the data-* attributes that drive the "Export CSV" on result.html,
            # we need to ensure they get the *effective* single r, i, T if multi-period was used,
            # or pass all period data. For simplicity, the existing export CSV might not support multi-period yet.
            # Let's keep r_form_val, i_form_val, T_form_val as they were from original single inputs for now.
            # This means the result page sliders for r, i, T will reflect original single inputs.
            # The plots and tables will reflect the multi-period calculation.
            
            # Update form_params_for_result_page for the 'data-' attributes in result.html
            # These are for the sliders on result.html and the export button.
            # If rates_periods_data has one entry and was from fallback, these are already set.
            # If rates_periods_data has multiple entries, what should r_form_val, etc., be?
            # For now, they'll be the original single values. The JS on result page would need
            # to be aware if multi-period was used if sliders are to be disabled/changed.
            if len(rates_periods_data) == 1:
                 form_params_for_result_page['r_form_val'] = rates_periods_data[0]['r'] * 100
                 form_params_for_result_page['i_form_val'] = rates_periods_data[0]['i'] * 100
                 form_params_for_result_page['T_form_val'] = rates_periods_data[0]['duration']
            # If multiple periods, the single r,i,T on result page are less meaningful for recalculation
            # but we pass the original single form values for pre-filling the data attributes.
            # The actual calculation used rates_periods_data.
            
            form_params_for_result_page['D_form_val'] = D_form
            form_params_for_result_page['withdrawal_time_form_val'] = withdrawal_time_form
            form_params_for_result_page['initial_mode_from_index'] = mode_form
            
            # P_for_js for data attribute on result.html
            P_for_js = 0.0
            if mode_form == MODE_PORTFOLIO:
                P_for_js = P_value_form if P_value_form is not None else 0.0
            elif mode_form == MODE_WITHDRAWAL:
                if calculated_P_output != "N/A" and isinstance(calculated_P_output, (int, float)):
                     P_for_js = calculated_P_output
            
            form_params_for_result_page['P_input_raw_for_js'] = P_for_js # This is used by result.html JS
            form_params_for_result_page['TIME_END_const'] = TIME_END 
            form_params_for_result_page['MODE_WITHDRAWAL_const'] = MODE_WITHDRAWAL

            # Pass all originally submitted form fields for full pre-filling capability on result page,
            # especially for data-* attributes that might be used by JS.
            # The form_params_for_result_page dictionary initialized at the start of POST handling
            # already contains all form fields. We've updated some (like D_form_val, r_form_val if single period).
            # Merge this with the specific calculated values for the template.
            template_context = {
                **form_params_for_result_page, # Contains all form inputs and some processed ones
                'fire_W_input_val': initial_W_input_for_fire_mode,
                'fire_P_calculated_val': f"${calculated_P_output:,.2f}" if isinstance(calculated_P_output, (int, float)) and calculated_P_output != float('inf') else "N/A",
                'portfolio_plot_fire': portfolio_plot_W_mode,
                'withdrawal_plot_fire': withdrawal_plot_W_mode,
                'table_data_fire_html': table_data_W_mode_html,
                'expense_P_input_val': initial_P_input_for_expense_mode_template,
                'expense_W_calculated_val': f"${calculated_W_output_for_expense_mode:,.2f}" if isinstance(calculated_W_output_for_expense_mode, (int, float)) else "N/A",
                'portfolio_plot_expense': portfolio_plot_P_mode,
                'withdrawal_plot_expense': withdrawal_plot_P_mode,
                'table_data_expense_html': table_data_P_mode_html,
                # Pass rates_periods_data itself if result.html needs to be aware of multi-period for display
                'rates_periods_info_json': rates_periods_data # For potential display or JS use on result page
            }
            current_year = datetime.datetime.now().year
            template_context['current_year'] = current_year
            return render_template('result.html', **template_context)
        else: # GET request: render with default values
            default_form_data = {
                'W': '20000', 'r': '5', 'i': '2', 'T': '30', 'D': '0.0',
                'withdrawal_time': TIME_END, 'mode': MODE_WITHDRAWAL, 'P': '500000', 'error': None,
                'period1_duration': '', 'period1_r': '', 'period1_i': '',
                'period2_duration': '', 'period2_r': '', 'period2_i': '',
                'period3_duration': '', 'period3_r': '', 'period3_i': '',
            }
            current_year = datetime.datetime.now().year
            default_form_data['current_year'] = current_year
            # Pass default_form_data as a dictionary named 'defaults'
            # and also pass current_year as a top-level variable for convenience if needed directly
            return render_template('index.html', defaults=default_form_data, current_year=default_form_data.get('current_year'))


    @app_instance.route('/update', methods=['POST'])
    def update():
        """
        Handles POST requests (typically AJAX) to update FIRE calculations 
        based on new input values including period data. Returns JSON data.
        """
        form_data = request.form

        # Initialize variables to ensure they are defined, even if parsing fails unexpectedly later.
        # These defaults should ideally lead to a graceful failure or be handled if used.
        W_form = 0.0
        D_form = 0.0
        withdrawal_time = TIME_END  # Default from constants
        P_value = 0.0
        rates_periods_data = []
        # Variables for single period fallback, if used and not otherwise defined
        r_perc_form = 0.0
        i_perc_form = 0.0
        T_form = 0

        try:
            # Use .get(key, 'default_string') for float/int conversions to be safe
            W_form = float(form_data.get('W', '0'))
            D_form_str = form_data.get('D', '0.0')
            D_form = float(D_form_str) if D_form_str else 0.0
            withdrawal_time = form_data.get('withdrawal_time', TIME_END)
            P_value = float(form_data.get('P', '0')) # Used for MODE_PORTFOLIO

            if W_form < 0: raise ValueError("Annual withdrawal (W) cannot be negative.")
            if D_form < 0: raise ValueError("Desired final portfolio value (D) cannot be negative.")
            if P_value < 0: raise ValueError("Initial Portfolio (P) must be >= 0.")
            # Ensure rates_periods_data is fresh for this request if it was pre-initialized
            rates_periods_data = []

            for k in range(1, 4): # Max 3 periods
                dur_str = form_data.get(f'period{k}_duration')
                r_str = form_data.get(f'period{k}_r')
                i_str = form_data.get(f'period{k}_i')

                if dur_str and r_str and i_str:
                    try:
                        duration = int(dur_str)
                        r_perc = float(r_str)
                        i_perc = float(i_str)
                        if duration > 0:
                            if not (-50 <= r_perc <= 100):
                                raise ValueError(f"Period {k} annual return (r) must be between -50% and 100%.")
                            if not (-50 <= i_perc <= 100):
                                raise ValueError(f"Period {k} inflation rate (i) must be between -50% and 100%.")
                            rates_periods_data.append({'duration': duration, 'r': r_perc / 100, 'i': i_perc / 100})
                        elif duration < 0:
                            raise ValueError(f"Period {k} duration cannot be negative.")
                    except ValueError as e:
                        # Re-raise to be caught by the main ValueError handler below
                        raise ValueError(f"Invalid input for period {k}: {str(e)}")


            if not rates_periods_data: # Fallback to single period from main r, i, T fields
                r_perc_form = float(form_data.get('r', '0'))
                i_perc_form = float(form_data.get('i', '0'))
                T_form = int(form_data.get('T', '0'))
                if T_form <= 0: raise ValueError("Time horizon (T) must be greater than 0 for single period mode.")
                if not (-50 <= r_perc_form <= 100): raise ValueError("Annual return (r) must be between -50% and 100%.")
                if not (-50 <= i_perc_form <= 100): raise ValueError("Inflation rate (i) must be between -50% and 100%.")
                rates_periods_data.append({'duration': T_form, 'r': r_perc_form / 100, 'i': i_perc_form / 100})

        except ValueError as e:
            app_instance.logger.error(f"Invalid input (ValueError) in update route: {e} - Form data: {form_data}")
            return jsonify({'error': f'Invalid input: {str(e)}'})
        except Exception as e: # Catch other unexpected errors during parsing
            app_instance.logger.error(f"Unexpected error during input processing in update route: {e} - Form data: {form_data}", exc_info=True)
            return jsonify({'error': 'An unexpected error occurred while processing inputs.'})

        # Calculate for mode 'W' (Expense Mode on client, calculates P)
        # W_form is the W_initial for generate_plots in MODE_WITHDRAWAL
        # These lines (393 onwards) are reached only if the try block above completes successfully
        # or if an unhandled error occurred and execution somehow continued (which the pre-initialization guards against NameError).
        required_portfolio_W, actual_W_for_mode_W, portfolio_plot_W, withdrawal_plot_W, table_data_W_html = generate_plots(
            W_form, withdrawal_time, MODE_WITHDRAWAL, rates_periods_data, P_value=None, desired_final_value=D_form
        )

        # Calculate for mode 'P' (FIRE Mode on client, calculates W)
        # P_value is the P_initial for generate_plots in MODE_PORTFOLIO
        # W_form is passed as initial guess but find_max_annual_expense will calculate the actual W
        input_P_for_mode_P, calculated_W_for_mode_P, portfolio_plot_P, withdrawal_plot_P, table_data_P_html = generate_plots(
            W_form, withdrawal_time, MODE_PORTFOLIO, rates_periods_data, P_value=P_value, desired_final_value=D_form
        )
        
        return jsonify({
            'fire_number_W': f"${required_portfolio_W:,.2f}" if required_portfolio_W != float('inf') else "N/A", # This is the P calculated for a given W
            'annual_expense_W': f"${actual_W_for_mode_W:,.2f}", # This is the W that was input
            'portfolio_plot_W': portfolio_plot_W,
            'withdrawal_plot_W': withdrawal_plot_W,
            'table_data_W_html': table_data_W_html,

            'fire_number_P': f"${input_P_for_mode_P:,.2f}" if input_P_for_mode_P != float('inf') else "N/A", # This is the P that was input
            'annual_expense_P': f"${calculated_W_for_mode_P:,.2f}", # This is the W calculated for a given P
            'portfolio_plot_P': portfolio_plot_P,
            'withdrawal_plot_P': withdrawal_plot_P,
            'table_data_P_html': table_data_P_html
        })

    @app_instance.route('/compare', methods=['GET', 'POST'])
    def compare():
        """
        Handles GET requests for the scenario comparison page and POST requests 
        to compare multiple financial scenarios. Returns HTML or JSON data.
        """
        if request.method == 'POST':
            form_data = request.form
            scenarios_data_for_template = []

            for n in range(1, MAX_SCENARIOS_COMPARE + 1): # Line 429
                scenario_input = {'n': n}
                scenario_input['enabled'] = form_data.get(f"scenario{n}_enabled") == "on"

                # Pre-populate for template even if not enabled or invalid, using form values
                scenario_input['W_form'] = form_data.get(f"scenario{n}_W", "0")
                scenario_input['r_form'] = form_data.get(f"scenario{n}_r", "0") # Single r
                scenario_input['i_form'] = form_data.get(f"scenario{n}_i", "0") # Single i
                scenario_input['T_form'] = form_data.get(f"scenario{n}_T", "0") # Single T
                scenario_input['D_form'] = form_data.get(f"scenario{n}_D", "0.0")
                scenario_input['withdrawal_time_form'] = form_data.get(f"scenario{n}_withdrawal_time", TIME_END)
                for p_num in range(1, 4): # Max 3 periods
                    scenario_input[f'period{p_num}_duration_form'] = form_data.get(f"scenario{n}_period{p_num}_duration", "")
                    scenario_input[f'period{p_num}_r_form'] = form_data.get(f"scenario{n}_period{p_num}_r", "")
                    scenario_input[f'period{p_num}_i_form'] = form_data.get(f"scenario{n}_period{p_num}_i", "")

                if not scenario_input['enabled']:
                    scenario_input['error'] = f"Scenario {n}: Not enabled by user."
                    scenario_input['fire_number_display'] = "N/A"
                    scenarios_data_for_template.append(scenario_input)
                    continue
                
                try:
                    W_val = float(scenario_input['W_form'])
                    D_val = float(scenario_input['D_form'])
                    withdrawal_time_val = scenario_input['withdrawal_time_form']

                    if W_val < 0: raise ValueError("Withdrawal (W) cannot be negative.")
                    if D_val < 0: raise ValueError("Desired Final Value (D) cannot be negative.")

                    scenario_rates_periods = []
                    for p_num in range(1, 4):
                        dur_str = form_data.get(f"scenario{n}_period{p_num}_duration")
                        r_str = form_data.get(f"scenario{n}_period{p_num}_r")
                        i_str = form_data.get(f"scenario{n}_period{p_num}_i")
                        if dur_str and r_str and i_str:
                            duration = int(dur_str)
                            r_perc = float(r_str)
                            i_perc = float(i_str)
                            if duration > 0:
                                if not (-50 <= r_perc <= 100): raise ValueError(f"Period {p_num} annual return (r) must be between -50% and 100%.")
                                if not (-50 <= i_perc <= 100): raise ValueError(f"Period {p_num} inflation rate (i) must be between -50% and 100%.")
                                scenario_rates_periods.append({'duration': duration, 'r': r_perc / 100, 'i': i_perc / 100})
                            elif duration < 0: raise ValueError(f"Period {p_num} duration cannot be negative.")

                    if not scenario_rates_periods: # Fallback to single r, i, T for this scenario
                        r_perc_single = float(scenario_input['r_form'])
                        i_perc_single = float(scenario_input['i_form'])
                        T_single = int(scenario_input['T_form'])
                        if T_single <= 0: raise ValueError("Time (T) must be > 0 for single period mode.")
                        if not (-50 <= r_perc_single <= 100): raise ValueError("Annual return (r) must be between -50% and 100%.")
                        if not (-50 <= i_perc_single <= 100): raise ValueError("Inflation rate (i) must be between -50% and 100%.")
                        scenario_rates_periods.append({'duration': T_single, 'r': r_perc_single / 100, 'i': i_perc_single / 100})

                    scenario_input['rates_periods_data'] = scenario_rates_periods # Store for potential later use/display

                    # Calculate financial figures for this scenario
                    portfolio = find_required_portfolio(W_val, withdrawal_time_val, scenario_rates_periods, desired_final_value=D_val)

                    if portfolio == float('inf'):
                        scenario_input['error'] = f"Scenario {n}: Cannot find suitable portfolio (inputs unrealistic)."
                        scenario_input['fire_number'] = "N/A"
                        scenario_input['years_data'], scenario_input['balances_data'], scenario_input['withdrawals_data'] = [], [], []
                    else:
                        years, balances, withdrawals = annual_simulation(portfolio, W_val, withdrawal_time_val, scenario_rates_periods)
                        scenario_input['fire_number'] = portfolio
                        scenario_input['years_data'] = years.tolist()
                        scenario_input['balances_data'] = balances
                        scenario_input['withdrawals_data'] = withdrawals

                    scenario_input['fire_number_display'] = f"${portfolio:,.2f}" if isinstance(portfolio, (int, float)) and portfolio != float('inf') else "N/A"

                except ValueError as e:
                    app_instance.logger.error(f"Invalid input for scenario {n} in compare route: {e}")
                    scenario_input['error'] = f"Scenario {n}: {str(e)}"
                    scenario_input['fire_number_display'] = "N/A"
                    scenario_input['enabled'] = False # Mark as not successfully processed

                scenarios_data_for_template.append(scenario_input)
            # END OF SCENARIO PROCESSING LOOP

            # Filter for scenarios that were successfully processed for plotting, after collecting all scenarios
            plottable_scenarios = [s for s in scenarios_data_for_template if s.get('enabled') and not s.get('error') and 'years_data' in s and s['years_data']]

            combined_balance_plot_html = ""
            combined_withdrawal_plot_html = ""
            message = ""

            if not plottable_scenarios:
                message = "No valid scenarios to plot. Please check inputs or enable scenarios."
                # Return all scenarios_data_for_template so errors/data can be shown for each non-plottable one
                # Plots will be empty as initialized
            else:
                plot_config = {'displayModeBar': False, 'responsive': True}
                fig_balance = go.Figure()
                fig_withdrawal = go.Figure()

                for sc_data in plottable_scenarios:
                    fig_balance.add_trace(go.Scatter(
                        x=sc_data["years_data"], y=sc_data["balances_data"],
                        mode='lines+markers', name=f"Scenario {sc_data['n']} Balance",
                        hovertemplate='Year: %{x}<br>Balance: $%{y:,.2f}<extra></extra>'
                    ))
                    plot_years_withdrawal = sc_data["years_data"][:-1] if len(sc_data["years_data"]) > 1 else []
                    fig_withdrawal.add_trace(go.Scatter(
                        x=plot_years_withdrawal, y=sc_data["withdrawals_data"],
                        mode='lines+markers', name=f"Scenario {sc_data['n']} Withdrawal",
                        uid=f"scenario_{sc_data['n']}_compare_withdrawal",
                        hovertemplate='Year: %{x}<br>Withdrawal: $%{y:,.2f}<extra></extra>'
                    ))

                fig_balance.update_layout(title="Portfolio Balance Comparison", xaxis_title="Years", yaxis_title="Portfolio Value ($)")
                combined_balance_plot_html = pyo.plot(fig_balance, include_plotlyjs=False, output_type='div', config=plot_config)

                fig_withdrawal.update_layout(title="Annual Withdrawals Comparison", xaxis_title="Years", yaxis_title="Withdrawal ($)")
                combined_withdrawal_plot_html = pyo.plot(fig_withdrawal, include_plotlyjs=False, output_type='div', config=plot_config)

            # Return all scenarios_data_for_template (which includes errors and display values for each)
            # and the combined plots if any were generated.
            return jsonify({
                "combined_balance": combined_balance_plot_html,
                "combined_withdrawal": combined_withdrawal_plot_html,
                "scenarios": scenarios_data_for_template,
                "message": message
            })
        else: # GET request
        # Provide empty structures for periods for the template on initial load
            default_scenarios_for_template = []
            for n in range(1, MAX_SCENARIOS_COMPARE + 1): # Line 551
                sc = {'n': n, 'enabled': (n <=2), 'W_form': '', 'r_form': '', 'i_form': '', 'T_form': '', 'D_form': '0.0', 'withdrawal_time_form': TIME_END}
                for p_num in range(1,4):
                    sc[f'period{p_num}_duration_form'] = ''
                    sc[f'period{p_num}_r_form'] = ''
                    sc[f'period{p_num}_i_form'] = ''
                default_scenarios_for_template.append(sc)
            current_year = datetime.datetime.now().year
            return render_template("compare.html", message="", scenarios=default_scenarios_for_template, combined_balance=None, combined_withdrawal=None, current_year=current_year)

    @app_instance.route('/settings')
    def settings():
        """
        Handles GET requests for the settings page. Renders `settings.html`.
        """
        current_year = datetime.datetime.now().year
        return render_template("settings.html", current_year=current_year)

    @app_instance.route('/export_csv')
    def export_csv():
        """
        Handles GET requests to export simulation data as a CSV file.
        Retrieves parameters from query string, including period data, validates them, 
        runs simulation, and returns CSV data.
        """
        app_instance.logger.info(f"Export CSV request received with args: {request.args}")
        args = request.args
        try:
            w_str = args.get('W')
            withdrawal_time = args.get('withdrawal_time', default=TIME_END, type=str)
            mode = args.get('mode', default=MODE_WITHDRAWAL, type=str)
            p_str = args.get('P')
            d_str = args.get('D', default='0.0', type=str)

            if mode not in [MODE_WITHDRAWAL, MODE_PORTFOLIO]: raise ValueError("Invalid mode specified.")
            if withdrawal_time not in [TIME_START, TIME_END]: raise ValueError("Invalid withdrawal_time specified.")

            W_initial = float(w_str) if w_str is not None else 0.0
            P_initial = float(p_str) if p_str is not None else 0.0
            D_final_value = float(d_str) if d_str else 0.0

            if W_initial < 0 and mode == MODE_WITHDRAWAL: raise ValueError("Annual withdrawal (W) cannot be negative.")
            if P_initial < 0 and mode == MODE_PORTFOLIO: raise ValueError("Initial portfolio (P) cannot be negative.")
            if D_final_value < 0: raise ValueError("Desired final portfolio value (D) cannot be negative.")

            rates_periods_data = []
            for k in range(1, 4): # Max 3 periods for export as well
                dur_str = args.get(f'p{k}_dur')
                r_str = args.get(f'p{k}_r')
                i_str = args.get(f'p{k}_i')
                if dur_str and r_str and i_str:
                    try:
                        duration = int(dur_str)
                        r_perc = float(r_str)
                        i_perc = float(i_str)
                        if duration > 0:
                            if not (-50 <= r_perc <= 100): raise ValueError(f"Period {k} 'r' out of range.")
                            if not (-50 <= i_perc <= 100): raise ValueError(f"Period {k} 'i' out of range.")
                            rates_periods_data.append({'duration': duration, 'r': r_perc / 100, 'i': i_perc / 100})
                        elif duration < 0 : raise ValueError(f"Period {k} duration cannot be negative.")
                    except ValueError as e:
                        raise ValueError(f"Invalid period {k} data: {e}")
            
            if not rates_periods_data: # Fallback to single r, i, T from query if no period data
                r_single_str = args.get('r')
                i_single_str = args.get('i')
                t_single_str = args.get('T')
                if not (r_single_str and i_single_str and t_single_str):
                    raise ValueError("Either period data (p1_dur, p1_r, p1_i, ...) or single (r, i, T) parameters are required for CSV export.")
                
                r_perc_single = float(r_single_str)
                i_perc_single = float(i_single_str)
                T_single = int(t_single_str)
                if T_single <= 0: raise ValueError("Time horizon (T) must be > 0 for single period export.")
                if not (-50 <= r_perc_single <= 100): raise ValueError("Single 'r' out of range.")
                if not (-50 <= i_perc_single <= 100): raise ValueError("Single 'i' out of range.")
                rates_periods_data.append({'duration': T_single, 'r': r_perc_single / 100, 'i': i_perc_single / 100})

            # Determine P_to_simulate and W_to_simulate based on mode
            P_for_simulation = 0.0
            W_for_simulation = 0.0

            if mode == MODE_WITHDRAWAL:
                W_for_simulation = W_initial
                P_for_simulation = find_required_portfolio(W_initial, withdrawal_time, rates_periods_data, D_final_value)
                if P_for_simulation == float('inf'):
                    raise ValueError('Cannot calculate portfolio for CSV export, inputs may be unrealistic.')
            elif mode == MODE_PORTFOLIO:
                P_for_simulation = P_initial
                W_for_simulation = find_max_annual_expense(P_initial, withdrawal_time, rates_periods_data, D_final_value)

            years, balances, sim_withdrawals = annual_simulation(P_for_simulation, W_for_simulation, withdrawal_time, rates_periods_data)
            
            output = io.StringIO()
            writer = csv.writer(output)
            
            # Write Header Row
            writer.writerow(["Year", "Portfolio Balance ($)", "Annual Withdrawal ($)"])
            
            # Write Data Rows
            # Balances list has T+1 elements (year 0 to T). sim_withdrawals has T elements.
            total_T_export = sum(p.get('duration',0) for p in rates_periods_data)
            for t_idx in range(total_T_export):
                year_display = int(years[t_idx] + 1) # Display as Year 1, Year 2, ...
                balance_at_year_end = balances[t_idx+1] 
                withdrawal_for_year = sim_withdrawals[t_idx]
                writer.writerow([year_display, balance_at_year_end, withdrawal_for_year])

            csv_string = output.getvalue()
            
            response = Response(
                csv_string,
                mimetype='text/csv',
                headers={'Content-Disposition': 'attachment;filename=fire_results.csv'}
            )
            app_instance.logger.info("Successfully generated CSV response.")
            return response

        except ValueError as e:
            app_instance.logger.error(f"Invalid parameters for CSV export: {e} - Query args: {request.args}")
            return jsonify({'error': str(e)}), 400
        except Exception as e: # Catch any other unexpected errors
            app_instance.logger.error(f"Unexpected error during CSV export: {e} - Query args: {request.args}", exc_info=True)
            return jsonify({'error': "An unexpected error occurred. Please check logs."}), 500

    @app_instance.route('/about')
    def about():
        current_year = datetime.datetime.now().year
        return render_template("about.html", current_year=current_year)

    @app_instance.route('/faq')
    def faq():
        current_year = datetime.datetime.now().year
        return render_template("faq.html", current_year=current_year)
