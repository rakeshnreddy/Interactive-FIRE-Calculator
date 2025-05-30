from flask import render_template, request, jsonify, make_response, Response
import numpy as np
import plotly.graph_objects as go
import plotly.offline as pyo
import io
import csv

# Assuming app.py is in the root directory.
# financial_calcs.py and constants.py are now in the same 'project' package.
from app import app # To access app.logger and app.config, and for decorators @app.route
from .financial_calcs import annual_simulation, simulate_final_balance, find_required_portfolio, find_max_annual_expense
from .constants import MODE_WITHDRAWAL, MODE_PORTFOLIO, TIME_START, TIME_END, MAX_SCENARIOS_COMPARE

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

def generate_plots(W, r, i, T, withdrawal_time, mode, P_value=None, desired_final_value=0.0):
    """
    Calculates financial figures and generates Plotly plots for portfolio balance and withdrawals.

    Args:
        W (float): Initial annual withdrawal (used if mode='W', or as starting point if mode='P').
        r (float): Annual rate of return.
        i (float): Annual inflation rate.
        T (int): Time horizon in years.
        withdrawal_time (str): "start" or "end".
        mode (str): Calculation mode, 'W' (find portfolio for W) or 'P' (find W for portfolio P).
        P_value (float, optional): Initial portfolio value (used if mode='P'). Defaults to None.
        desired_final_value (float, optional): Desired portfolio value at the end of T years. Defaults to 0.0.

    Returns:
        tuple: (required_portfolio_or_P_value, calculated_W, portfolio_plot_div, withdrawal_plot_div, table_html)
    """
    if mode == MODE_WITHDRAWAL:
        required_portfolio = find_required_portfolio(W, r, i, T, withdrawal_time, desired_final_value=desired_final_value)
        if required_portfolio == float('inf'):
             # Handle case where no portfolio can sustain the withdrawal (e.g., W too high)
            error_message = "<div>Cannot find a suitable portfolio. Withdrawals may be too high.</div>"
            return float('inf'), W, error_message, "<div></div>", "<p>Table data not available due to error.</p>"
    else: # mode == MODE_PORTFOLIO
        required_portfolio = P_value
        W = find_max_annual_expense(required_portfolio, r, i, T, withdrawal_time, desired_final_value=desired_final_value)
    
    # Ensure W is not None or problematic before annual_simulation if it's calculated
    if W is None or (isinstance(W, float) and (np.isnan(W) or np.isinf(W))): # Check W if it was calculated
        # This might happen if find_max_annual_expense has an issue or returns an invalid W
        error_message = "<div>Error calculating sustainable withdrawal. Inputs might be unrealistic.</div>"
        # Return required_portfolio (which is P_value in this mode) and a clear indicator for W
        return required_portfolio, 0, error_message, "<div></div>", "<p>Table data not available due to error in withdrawal calculation.</p>"

    years, balances, withdrawals = annual_simulation(required_portfolio, r, i, W, T, withdrawal_time)
    
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
        x=years[:-1], y=withdrawals,
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

    table_html = generate_html_table(years, balances, withdrawals)
    return required_portfolio, W, portfolio_plot, withdrawal_plot, table_html

@app.route('/', methods=['GET', 'POST']) # This route handles the main form submission
def index():
    """
    Handles GET requests for the main page and POST requests for form submissions 
    to calculate FIRE figures. Renders `index.html` or `result.html`.
    """
    if request.method == 'POST':
        form_data = request.form.to_dict()
        try:
            W_form = float(form_data.get('W', 0))
            r_perc_form = float(form_data.get('r', 0))
            i_perc_form = float(form_data.get('i', 0))
            T_form = int(form_data.get('T', 0))
            
            withdrawal_time_form = form_data.get('withdrawal_time', TIME_END)
            mode_form = form_data.get('mode', MODE_WITHDRAWAL)
            
            D_form_str = form_data.get('D', '0.0') # Get 'D', default to string '0.0'
            D_form = float(D_form_str) if D_form_str else 0.0 # Convert to float, ensure empty string becomes 0.0

            # Basic Validations
            if D_form < 0:
                raise ValueError("Desired final portfolio value (D) cannot be negative.")
            if T_form <= 0:
                raise ValueError("Time horizon (T) must be greater than 0.")
            if W_form < 0:
                raise ValueError("Annual withdrawal (W) cannot be negative.")
            if not (-50 <= r_perc_form <= 100):
                raise ValueError("Annual return (r) must be between -50% and 100%.")
            if not (-50 <= i_perc_form <= 100):
                raise ValueError("Inflation rate (i) must be between -50% and 100%.")

            r_calc = r_perc_form / 100
            i_calc = i_perc_form / 100
            
            P_value_form = None
            if mode_form == MODE_PORTFOLIO:
                P_value_form = float(form_data.get('P', 0))
                if P_value_form < 0:
                    raise ValueError("Initial portfolio (P) cannot be negative.")
        
        except ValueError as e:
            # Pass all submitted form data back to the template for pre-filling
            # Ensure keys exist even if not submitted, using defaults
            template_form_data = {
                'W': form_data.get('W', '20000'),
                'r': form_data.get('r', '5'),
                'i': form_data.get('i', '2'),
                'T': form_data.get('T', '30'),
                'D': form_data.get('D', '0.0'), # Added D
                'withdrawal_time': form_data.get('withdrawal_time', TIME_END),
                'mode': form_data.get('mode', MODE_WITHDRAWAL),
                'P': form_data.get('P', '500000')
            }
            app.logger.error(f"Invalid input in index route: {e} - Form data: {form_data}")
            return render_template('index.html', error=str(e), **template_form_data)
        
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
            # Primary calculation: FIRE Mode (W input -> P calculated)
            P_calc_primary, W_actual_primary, p_plot_w, w_plot_w, table_w = generate_plots(
                W_form, r_calc, i_calc, T_form, withdrawal_time_form, MODE_WITHDRAWAL, P_value=None, desired_final_value=D_form
            )
            if P_calc_primary == float('inf'):
                template_form_data = { 'W': W_form, 'r': r_perc_form, 'i': i_perc_form, 'T': T_form, 'D': D_form_str, 'withdrawal_time': withdrawal_time_form, 'mode': mode_form, 'P': '' }
                return render_template('index.html', error="Cannot find a suitable portfolio for the given withdrawal. Inputs may be unrealistic.", **template_form_data)

            calculated_P_output = P_calc_primary
            initial_W_input_for_fire_mode = W_actual_primary # This will be W_form
            portfolio_plot_W_mode, withdrawal_plot_W_mode = p_plot_w, w_plot_w
            table_data_W_mode_html = table_w

            # Secondary calculation for Expense Mode section (using P_calc_primary)
            initial_P_input_for_expense_mode_raw = P_calc_primary
            _, W_calc_secondary, p_plot_p, w_plot_p, table_p = generate_plots( # Pass D_form here too
                initial_W_input_for_fire_mode, r_calc, i_calc, T_form, withdrawal_time_form, MODE_PORTFOLIO, P_value=initial_P_input_for_expense_mode_raw, desired_final_value=D_form
            )
            calculated_W_output_for_expense_mode = W_calc_secondary
            portfolio_plot_P_mode, withdrawal_plot_P_mode = p_plot_p, w_plot_p
            table_data_P_mode_html = table_p

        elif mode_form == MODE_PORTFOLIO:
            # Primary calculation: Expense Mode (P input -> W calculated)
            P_actual_primary, W_calc_primary, p_plot_p, w_plot_p, table_p = generate_plots( # Pass D_form here too
                W_form, r_calc, i_calc, T_form, withdrawal_time_form, MODE_PORTFOLIO, P_value=P_value_form, desired_final_value=D_form
            )
            initial_P_input_for_expense_mode_raw = P_actual_primary # This will be P_value_form
            calculated_W_output_for_expense_mode = W_calc_primary
            portfolio_plot_P_mode, withdrawal_plot_P_mode = p_plot_p, w_plot_p
            table_data_P_mode_html = table_p

            # Secondary calculation for FIRE Mode section (using W_calc_primary)
            initial_W_input_for_fire_mode = W_calc_primary # This is the calculated W from P mode
            P_calc_secondary, _, p_plot_w, w_plot_w, table_w = generate_plots(
                initial_W_input_for_fire_mode, r_calc, i_calc, T_form, withdrawal_time_form, MODE_WITHDRAWAL, P_value=None, desired_final_value=D_form
            )
            calculated_P_output = P_calc_secondary
            # If P_calc_secondary is inf, generate_plots returns the error div for plots
            portfolio_plot_W_mode, withdrawal_plot_W_mode = p_plot_w, w_plot_w
            table_data_W_mode_html = table_w
        
        # Prepare initial_P_input_for_expense_mode for the template
        if initial_P_input_for_expense_mode_raw == float('inf'):
            initial_P_input_for_expense_mode_template = "N/A"
        else:
            initial_P_input_for_expense_mode_template = initial_P_input_for_expense_mode_raw

        # Prepare distinct variable names for form values to pre-fill result.html, avoiding clashes.
        # Common parameters for form pre-filling on result.html
        # Using distinct names to avoid potential clashes if result.html also uses 'r', 'i', 'T' for display
        form_params_for_result_page = {
            'r_form_val': r_perc_form,
            'i_form_val': i_perc_form,
            'T_form_val': T_form,
            'D_form_val': D_form, 
            'withdrawal_time_form_val': withdrawal_time_form,
            'initial_mode_from_index': mode_form # Helps result.html know the user's primary focus
        }

        # Determine P_for_js based on the mode and calculated/input values
        P_for_js = 0.0
        if mode_form == MODE_PORTFOLIO:
            P_for_js = P_value_form if P_value_form is not None else 0.0
        elif mode_form == MODE_WITHDRAWAL: # mode was W, P was calculated
            if calculated_P_output != "N/A" and isinstance(calculated_P_output, (int, float)):
                 P_for_js = calculated_P_output
        
        form_params_for_result_page['P_input_raw_for_js'] = P_for_js
        form_params_for_result_page['TIME_END_const'] = TIME_END # Pass for default filter
        form_params_for_result_page['MODE_WITHDRAWAL_const'] = MODE_WITHDRAWAL # Pass for default filter


        return render_template('result.html',
                               # FIRE Mode Data (W input, P calculated)
                               fire_W_input_val=initial_W_input_for_fire_mode,
                               fire_P_calculated_val=f"${calculated_P_output:,.2f}" if isinstance(calculated_P_output, (int, float)) and calculated_P_output != float('inf') else "N/A",
                               portfolio_plot_fire=portfolio_plot_W_mode,
                               withdrawal_plot_fire=withdrawal_plot_W_mode,
                               table_data_fire_html=table_data_W_mode_html,

                               # Expense Mode Data (P input, W calculated)
                               expense_P_input_val=initial_P_input_for_expense_mode_template,
                               expense_W_calculated_val=f"${calculated_W_output_for_expense_mode:,.2f}" if isinstance(calculated_W_output_for_expense_mode, (int, float)) else "N/A",
                               portfolio_plot_expense=portfolio_plot_P_mode,
                               withdrawal_plot_expense=withdrawal_plot_P_mode,
                               table_data_expense_html=table_data_P_mode_html,
                               **form_params_for_result_page)
    
    # GET request: render with default values
    default_form_data = {
        'W': '20000', 'r': '5', 'i': '2', 'T': '30', 'D': '0.0', # Added D
        'withdrawal_time': TIME_END, 'mode': MODE_WITHDRAWAL, 'P': '500000', 'error': None
    }
    return render_template('index.html', **default_form_data)


@app.route('/update', methods=['POST'])
def update():
    """
    Handles POST requests (typically AJAX) to update FIRE calculations 
    based on new input values. Returns JSON data.
    """
    # Similar validation as in index() POST should be applied here if inputs can be arbitrary
    # For brevity, assuming inputs are somewhat controlled or client-side validated for this AJAX endpoint
    try:
        W_form = float(request.form['W'])
        r_perc_form = float(request.form['r'])
        i_perc_form = float(request.form['i'])
        T_form = int(request.form['T'])
        
        D_form_str = request.form.get('D', '0.0')
        D_form = float(D_form_str) if D_form_str else 0.0

        if T_form <= 0: raise ValueError("Time horizon (T) must be greater than 0.")
        if W_form < 0: raise ValueError("Annual withdrawal (W) cannot be negative.")
        if D_form < 0: raise ValueError("Desired final portfolio value (D) cannot be negative.")
        if not (-50 <= r_perc_form <= 100):
            raise ValueError("Annual return (r) must be between -50% and 100%.")
        if not (-50 <= i_perc_form <= 100):
            raise ValueError("Inflation rate (i) must be between -50% and 100%.")

        withdrawal_time = request.form.get('withdrawal_time', TIME_END)
        P_value = float(request.form['P'])
        if P_value < 0: raise ValueError("P must be >= 0")
        # Convert percentages to decimals for calculations
        r_calc = r_perc_form / 100
        i_calc = i_perc_form / 100

    except ValueError as e:
        app.logger.error(f"Invalid input in update route: {e} - Form data: {request.form}")
        return jsonify({'error': f'Invalid input: {str(e)}'})
    
    # Calculate for mode 'W'
    required_portfolio_W, annual_expense_W, portfolio_plot_W, withdrawal_plot_W, table_data_W_html = generate_plots(
        W_form, r_calc, i_calc, T_form, withdrawal_time, mode=MODE_WITHDRAWAL, desired_final_value=D_form
    )
    
    # Calculate for mode 'P'
    # Note: The 'W' passed here is from the form, but generate_plots will recalculate W if mode='P'
    required_portfolio_P, annual_expense_P, portfolio_plot_P, withdrawal_plot_P, table_data_P_html = generate_plots(
        W_form, r_calc, i_calc, T_form, withdrawal_time, mode=MODE_PORTFOLIO, P_value=P_value, desired_final_value=D_form
    ) # Pass D_form here too
    
    return jsonify({
        'fire_number_W': f"${required_portfolio_W:,.2f}" if required_portfolio_W != float('inf') else "N/A",
        'annual_expense_W': f"${annual_expense_W:,.2f}",
        'portfolio_plot_W': portfolio_plot_W,
        'withdrawal_plot_W': withdrawal_plot_W,
        'table_data_W_html': table_data_W_html,
        'fire_number_P': f"${required_portfolio_P:,.2f}" if required_portfolio_P != float('inf') else "N/A", # P is an input here
        'annual_expense_P': f"${annual_expense_P:,.2f}",
        'portfolio_plot_P': portfolio_plot_P,
        'withdrawal_plot_P': withdrawal_plot_P,
        'table_data_P_html': table_data_P_html
    })

@app.route('/compare', methods=['GET', 'POST'])
def compare():
    """
    Handles GET requests for the scenario comparison page and POST requests 
    to compare multiple financial scenarios. Returns HTML or JSON data.
    """
    if request.method == 'POST':
        scenarios = []
        for n in range(1, MAX_SCENARIOS_COMPARE + 1):
            scenario = {}
            scenario['n'] = n
            scenario['enabled'] = request.form.get(f"scenario{n}_enabled") == "on"
            
            if not scenario['enabled']:
                # Populate with default/empty values for consistency if accessed in template
                scenario['W'] = 0 
                scenario['r_perc'] = 0
                scenario['i_perc'] = 0
                scenario['T'] = 0
                scenario['withdrawal_time'] = TIME_END
                # scenario['error'] = f"Scenario {n}: Not enabled by user." # Optional
                scenarios.append(scenario)
                continue
            try:
                # Use string defaults for get, then convert. Allows empty strings to be caught by float/int.
                w_str = request.form.get(f"scenario{n}_W", "0")
                r_str = request.form.get(f"scenario{n}_r", "0")
                i_str = request.form.get(f"scenario{n}_i", "0")
                t_str = request.form.get(f"scenario{n}_T", "0")
                
                scenario['W'] = float(w_str)
                scenario['r_perc'] = float(r_str)
                scenario['i_perc'] = float(i_str)
                scenario['T'] = int(t_str)
                scenario['withdrawal_time'] = request.form.get(f"scenario{n}_withdrawal_time", TIME_END)
                d_str = request.form.get(f"scenario{n}_D", "0.0")
                scenario['D'] = float(d_str) if d_str else 0.0
                
                # Scenario initially marked as 'enabled' by user checkbox might be set to False below if validation fails.
                

                # Validation for each scenario's inputs
                if not (-50 <= scenario['r_perc'] <= 100):
                    scenario['error'] = f"Scenario {n}: Annual return (r) must be between -50% and 100%."
                    scenario['enabled'] = False
                elif not (-50 <= scenario['i_perc'] <= 100):
                    scenario['error'] = f"Scenario {n}: Inflation rate (i) must be between -50% and 100%."
                    scenario['enabled'] = False
                elif scenario['T'] <= 0:
                    scenario['error'] = f"Scenario {n}: Time (T) must be > 0."
                    scenario['enabled'] = False
                elif scenario['W'] < 0:
                    scenario['error'] = f"Scenario {n}: Withdrawal (W) must be >= 0."
                    scenario['enabled'] = False
                elif scenario['D'] < 0:
                    scenario['error'] = f"Scenario {n}: Desired Final Value (D) must be >= 0."
                    scenario['enabled'] = False
                
            except ValueError as e:
                app.logger.error(f"Invalid numeric input for scenario {n} in compare route: {e}")
                scenario['error'] = f"Scenario {n}: Invalid numeric input."
                scenario['enabled'] = False
            
            if scenario.get('enabled'): # Proceed if enabled and no parsing/validation errors
                r_val = scenario['r_perc'] / 100
                i_val = scenario['i_perc'] / 100
                portfolio = find_required_portfolio(scenario['W'], r_val, i_val, scenario['T'], scenario['withdrawal_time'], desired_final_value=scenario['D']) # Pass D
                
                if portfolio == float('inf'):
                    scenario['error'] = f"Scenario {n}: Cannot find suitable portfolio (inputs unrealistic)."
                    scenario['fire_number'] = "N/A"
                    scenario['years'], scenario['balances'], scenario['withdrawals'] = [], [], []
                else:
                    years, balances, withdrawals = annual_simulation(portfolio, r_val, i_val, scenario['W'], scenario['T'], scenario['withdrawal_time'])
                    scenario['fire_number'] = portfolio # This is the calculated P
                    scenario['years'] = years.tolist()
                    scenario['balances'] = balances
                    scenario['withdrawals'] = withdrawals
            else: # If not enabled (due to user choice, parsing error, or validation error)
                # Ensure these fields exist for consistent data structure for JSON and template
                scenario['fire_number'] = "N/A"
                scenario['years'], scenario['balances'], scenario['withdrawals'] = [], [], []
                if not scenario.get('error'): # If no specific error was set yet (e.g. user disabled it)
                    scenario['error'] = f"Scenario {n}: Not processed due to input issues or being disabled by user."
            
            scenarios.append(scenario)

        # Filter for scenarios that are still considered enabled and have data
        enabled_scenarios_for_plot = [sc for sc in scenarios if sc.get('enabled') and not sc.get('error') and 'years' in sc]

        if not enabled_scenarios_for_plot:
            # Construct a message based on why no scenarios are plottable
            # This part can be enhanced to provide specific errors for each scenario to the user
            message = "No valid scenarios to plot. Please check inputs or enable scenarios."
            return jsonify({"message": message, "scenarios": scenarios}) # Return all scenarios with potential errors
        
        plot_config = {'displayModeBar': False, 'responsive': True}
        
        fig_balance = go.Figure()
        for sc in enabled_scenarios_for_plot:
            fig_balance.add_trace(go.Scatter(
                x=sc["years"], y=sc["balances"],
                mode='lines+markers',
                name=f"Scenario {sc['n']}",
                hovertemplate='Year: %{x}<br>Balance: $%{y:,.2f}<extra></extra>'
            ))
        fig_balance.update_layout(title="Portfolio Balance Comparison", xaxis_title="Years", yaxis_title="Portfolio Value ($)")
        combined_balance = pyo.plot(fig_balance, include_plotlyjs=False, output_type='div', config=plot_config)
        
        fig_withdrawal = go.Figure()
        for sc in enabled_scenarios_for_plot:
            # Ensure years[:-1] is valid if years list might be short (e.g. T=0)
            plot_years_withdrawal = sc["years"][:-1] if len(sc["years"]) > 1 else []
            fig_withdrawal.add_trace(go.Scatter(
                x=plot_years_withdrawal, y=sc["withdrawals"],
                mode='lines+markers',
                name=f"Scenario {sc['n']}",
                uid=f"scenario_{sc['n']}_withdrawal",
                hovertemplate='Year: %{x}<br>Withdrawal: $%{y:,.2f}<extra></extra>'
            ))
        fig_withdrawal.update_layout(title="Annual Withdrawals Comparison", xaxis_title="Years", yaxis_title="Withdrawal ($)")
        combined_withdrawal = pyo.plot(fig_withdrawal, include_plotlyjs=False, output_type='div', config=plot_config)
        
        # For the scenarios returned to the template, format fire_number
        for sc in scenarios: # Iterate over original scenarios to include error messages
            if 'fire_number' in sc and isinstance(sc['fire_number'], (int, float)):
                sc['fire_number_display'] = f"${sc['fire_number']:,.2f}"
            elif 'fire_number' in sc and sc['fire_number'] == "N/A":
                sc['fire_number_display'] = "N/A"
            # Ensure r_perc, i_perc, etc. are present for display even if disabled
            sc['W'] = sc.get('W', 0)
            sc['r_perc'] = sc.get('r_perc', 0)
            sc['i_perc'] = sc.get('i_perc', 0)
            sc['T'] = sc.get('T', 0)
            sc['D'] = sc.get('D', 0.0) # Ensure D is in the output for each scenario
            sc['withdrawal_time'] = sc.get('withdrawal_time', TIME_END)

            # Ensure 'error' key exists for all scenarios for template consistency
            sc['error'] = sc.get('error', None) 
 
        return jsonify({
            "combined_balance": combined_balance,
            "combined_withdrawal": combined_withdrawal,
            "scenarios": scenarios, # Send all scenarios, template can show errors
            "message": ""
         })
    else:
        return render_template("compare.html", message="", scenarios=[], combined_balance=None, combined_withdrawal=None)

@app.route('/settings')
def settings():
    """
    Handles GET requests for the settings page. Renders `settings.html`.
    """
    return render_template("settings.html")

@app.route('/export_csv')
def export_csv():
    """
    Handles GET requests to export simulation data as a CSV file.
    Retrieves parameters from query string, validates them, runs simulation,
    and returns data (currently as JSON placeholder).
    """
    app.logger.info(f"Export CSV request received with args: {request.args}")
    try:
        # Retrieve and parse parameters
        w_str = request.args.get('W') # Get as string first
        r_str = request.args.get('r')
        # ... (other parameters as before)
        i_str = request.args.get('i')
        t_str = request.args.get('T')
        withdrawal_time = request.args.get('withdrawal_time', default=TIME_END, type=str)
        mode = request.args.get('mode', default=MODE_WITHDRAWAL, type=str)
        p_str = request.args.get('P')
        d_str = request.args.get('D', default='0.0', type=str)
        
        # Validate mode and withdrawal_time
        if mode not in [MODE_WITHDRAWAL, MODE_PORTFOLIO]:
            raise ValueError("Invalid mode specified.")
        if withdrawal_time not in [TIME_START, TIME_END]:
            raise ValueError("Invalid withdrawal_time specified.")

        # Convert and validate required numeric inputs
        if r_str is None: raise ValueError("Parameter 'r' (Expected Annual Return) is required.")
        if i_str is None: raise ValueError("Parameter 'i' (Expected Annual Inflation) is required.")
        if t_str is None: raise ValueError("Parameter 'T' (Retirement Duration) is required.")
        
        r_perc = float(r_str) if r_str is not None else 0.0 # Default if None
        i_perc = float(i_str) if i_str is not None else 0.0 # Default if None
        T_form_val = int(t_str) if t_str is not None else 0   # Default if None
        D_form_val = float(d_str) if d_str else 0.0

        W_form_val = 0.0
        P_form_val = 0.0

        if mode == MODE_WITHDRAWAL:
            if w_str is None:
                raise ValueError("Parameter 'W' (Annual Expenses) is required for FIRE Mode.")
            W_form_val = float(w_str) if w_str is not None else 0.0
        elif mode == MODE_PORTFOLIO:
            if p_str is None:
                raise ValueError("Parameter 'P' (Initial Portfolio) is required for Expense Mode.")
            P_form_val = float(p_str) if p_str is not None else 0.0
            if P_form_val < 0:
                raise ValueError("Initial portfolio (P) cannot be negative.")
        
        # Common validations
        if T_form_val <= 0:
            raise ValueError("Time horizon (T) must be greater than 0.")
        if not (-50 <= r_perc <= 100):
            raise ValueError("Annual return (r) must be between -50% and 100%.")
        if not (-50 <= i_perc <= 100):
            raise ValueError("Inflation rate (i) must be between -50% and 100%.")
        if W_form_val < 0 and mode == MODE_WITHDRAWAL : # W is only primary input for this mode
            raise ValueError("Annual withdrawal (W) cannot be negative.")
        if D_form_val < 0:
            raise ValueError("Desired final portfolio value (D) cannot be negative.")

        r_calc = r_perc / 100
        i_calc = i_perc / 100

        # Determine primary calculation values
        P_to_simulate = 0.0
        W_to_simulate = 0.0

        if mode == MODE_WITHDRAWAL:
            W_to_simulate = W_form_val
            P_to_simulate = find_required_portfolio(W_to_simulate, r_calc, i_calc, T_form_val, withdrawal_time, D_form_val)
            if P_to_simulate == float('inf'):
                app.logger.error(f"Cannot calculate portfolio for CSV export, inputs may be unrealistic. Args: {request.args}")
                return jsonify({'error': 'Cannot calculate portfolio for CSV export, inputs may be unrealistic.'}), 400
        elif mode == MODE_PORTFOLIO:
            P_to_simulate = P_form_val
            W_to_simulate = find_max_annual_expense(P_to_simulate, r_calc, i_calc, T_form_val, withdrawal_time, D_form_val)

        # Run annual_simulation
        years, balances, withdrawals = annual_simulation(P_to_simulate, r_calc, i_calc, W_to_simulate, T_form_val, withdrawal_time)
        
        # CSV Generation Logic
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Write Header Row
        writer.writerow(["Year", "Portfolio Balance ($)", "Annual Withdrawal ($)"])
        
        # Write Data Rows
        # Balances list has T+1 elements (year 0 to T). withdrawals has T elements (for year 0 to T-1, or year 1 to T).
        # The simulation runs for T_form_val years. Withdrawals list has T_form_val elements.
        for t_idx in range(T_form_val):
            year_display = int(years[t_idx] + 1) # Display as Year 1, Year 2, ...
            # balance_at_year_end corresponds to balances[t_idx+1]
            # This is the balance at the end of 'year_display' or start of next year before next withdrawal if 'start'
            balance_at_year_end = balances[t_idx+1] 
            withdrawal_for_year = withdrawals[t_idx]
            writer.writerow([year_display, balance_at_year_end, withdrawal_for_year])

        csv_string = output.getvalue()
        
        response = Response(
            csv_string,
            mimetype='text/csv',
            headers={'Content-Disposition': 'attachment;filename=fire_results.csv'}
        )
        app.logger.info("Successfully generated CSV response.")
        return response

    except ValueError as e:
        app.logger.error(f"Invalid parameters for CSV export: {e} - Query args: {request.args}")
        return jsonify({'error': str(e)}), 400
    except Exception as e: # Catch any other unexpected errors
        app.logger.error(f"Unexpected error during CSV export: {e} - Query args: {request.args}", exc_info=True)
        return jsonify({'error': "An unexpected error occurred. Please check logs."}), 500
