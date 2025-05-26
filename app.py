from flask import Flask, render_template, request, jsonify
import numpy as np
import plotly.graph_objects as go
import plotly.offline as pyo

app = Flask(__name__)

# Constants
MODE_WITHDRAWAL = 'W'
MODE_PORTFOLIO = 'P'
TIME_START = "start"
TIME_END = "end"
DEFAULT_TOLERANCE = 1.0
MAX_SCENARIOS_COMPARE = 4
PV_MAX_GUESS_LIMIT = 1e12 # Example limit for portfolio value guess
W_MIN_GUESS_FOR_MAX_EXPENSE = 1.0 # Minimum guess for W if calculated upper is too low

def annual_simulation(PV, r, i, W, T, withdrawal_time):
    """
    Simulate the annual portfolio balance over T years.

    Args:
        PV (float): Present Value (initial portfolio balance).
        r (float): Annual rate of return (e.g., 0.05 for 5%).
        i (float): Annual inflation rate (e.g., 0.02 for 2%).
        W (float): Initial annual withdrawal amount.
        T (int): Time horizon in years.
        withdrawal_time (str): Time of withdrawal, "start" or "end" of the year.

    Returns:
        tuple: (years_array, balances_list, withdrawals_list)
    """
    years = np.arange(0, T + 1)
    balances = []
    withdrawals = []
    B = PV
    for t in range(T):
        annual_withdrawal = W * ((1 + i) ** t)
        withdrawals.append(annual_withdrawal)
        if withdrawal_time == TIME_START:
            B = B - annual_withdrawal
            balances.append(B)
            B = B * (1 + r)
        else:
            balances.append(B)
            B = B * (1 + r) - annual_withdrawal
    balances.append(B)
    return years, balances, withdrawals

def simulate_final_balance(PV, r, i, W, T, withdrawal_time):
    """
    Helper function to get the final balance after T years from annual_simulation.

    Args:
        PV (float): Present Value.
        r (float): Annual rate of return.
        i (float): Annual inflation rate.
        W (float): Initial annual withdrawal.
        T (int): Time horizon in years.
        withdrawal_time (str): "start" or "end".

    Returns:
        float: Final portfolio balance.
    """
    _, balances, _ = annual_simulation(PV, r, i, W, T, withdrawal_time)
    return balances[-1]

def find_required_portfolio(W, r, i, T, withdrawal_time):
    """
    Find the required initial portfolio (PV) to sustain withdrawals W for T years.
    Uses a bisection method.

    Args:
        W (float): Initial annual withdrawal.
        r (float): Annual rate of return.
        i (float): Annual inflation rate.
        T (int): Time horizon in years.
        withdrawal_time (str): "start" or "end".

    Returns:
        float: Required initial portfolio.
    """
    if r != i:
        lower = (W / (r - i)) * (1 - ((1 + i) / (1 + r))**T)
    else:
        lower = W * T / (1 + i)
    
    # If withdrawals are at the start of the year, the PV needed is higher.
    # PV_annuity_due = PV_annuity_ordinary * (1 + r_effective_period)
    # The 1.05 factor is a heuristic approximation (e.g., if r=5%).
    # A more precise factor would be (1+r).
    # However, bisection is robust to the exactness of initial bounds.
    if withdrawal_time == TIME_START:
        lower *= 1.05
        
    upper = lower * 1.5
    while simulate_final_balance(upper, r, i, W, T, withdrawal_time) < 0:
        upper *= 2
        if upper > PV_MAX_GUESS_LIMIT: # Add a safety break for upper bound
            # This case should ideally not be hit if logic is sound
            # Or it implies W is too high for any reasonable PV
            return float('inf') # Or handle as an error

    while (upper - lower) > DEFAULT_TOLERANCE:
        mid = (lower + upper) / 2.0
        if simulate_final_balance(mid, r, i, W, T, withdrawal_time) < 0:
            lower = mid
        else:
            upper = mid
    return upper

def find_max_annual_expense(P, r, i, T, withdrawal_time):
    """
    Find the maximum initial annual withdrawal (W) sustainable from portfolio P for T years.
    Uses a bisection method.

    Args:
        P (float): Initial portfolio value.
        r (float): Annual rate of return.
        i (float): Annual inflation rate.
        T (int): Time horizon in years.
        withdrawal_time (str): "start" or "end".

    Returns:
        float: Maximum sustainable initial annual withdrawal.
    """
    lower = 0.0
    if r != i:
        upper = P * (r - i) / (1 - ((1 + i) / (1 + r))**T)
    else:
        upper = P * (1 + i) / T
    
    # Ensure upper bound is reasonable, especially if P is very small or T is large
    upper = max(upper, W_MIN_GUESS_FOR_MAX_EXPENSE) # Avoid issues if formula gives tiny/negative upper

    while (upper - lower) > DEFAULT_TOLERANCE:
        mid = (lower + upper) / 2.0
        final_balance = simulate_final_balance(P, r, i, mid, T, withdrawal_time)
        if final_balance < 0:
            upper = mid
        else:
            lower = mid
    return upper

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
    
    # Add the final balance at the end of year T, with no corresponding withdrawal for that year's row
    # body_rows.append(f"<tr><td>{int(years[-1]) + 1} (End)</td><td>{balances[-1]:,.2f}</td><td>N/A</td></tr>")

    return f"<table class='data-table'> {header} <tbody>{''.join(body_rows)}</tbody> </table>"

def generate_plots(W, r, i, T, withdrawal_time, mode, P_value=None):
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

    Returns:
        tuple: (required_portfolio_or_P_value, calculated_W, portfolio_plot_div, withdrawal_plot_div, table_html)
    """
    if mode == MODE_WITHDRAWAL:
        required_portfolio = find_required_portfolio(W, r, i, T, withdrawal_time)
        if required_portfolio == float('inf'):
             # Handle case where no portfolio can sustain the withdrawal (e.g., W too high)
            error_message = "<div>Cannot find a suitable portfolio. Withdrawals may be too high.</div>"
            return float('inf'), W, error_message, "<div></div>", "<p>Table data not available due to error.</p>"
    else:
        required_portfolio = P_value
        W = find_max_annual_expense(required_portfolio, r, i, T, withdrawal_time)
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

@app.route('/', methods=['GET', 'POST'])
def index():
    if request.method == 'POST':
        form_data = request.form.to_dict()
        try:
            W_form = float(form_data.get('W', 0))
            r_perc_form = float(form_data.get('r', 0))
            i_perc_form = float(form_data.get('i', 0))
            T_form = int(form_data.get('T', 0))
            
            withdrawal_time_form = form_data.get('withdrawal_time', TIME_END)
            mode_form = form_data.get('mode', MODE_WITHDRAWAL)

            # Basic Validations
            if T_form <= 0:
                raise ValueError("Time horizon (T) must be greater than 0.")
            if W_form < 0:
                raise ValueError("Annual withdrawal (W) cannot be negative.")
            if not (-100 < r_perc_form < 1000): # Example reasonable range for return
                raise ValueError("Annual return (r) is out of typical range.")
            if not (-100 < i_perc_form < 1000): # Example reasonable range for inflation
                raise ValueError("Inflation rate (i) is out of typical range.")

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
                'withdrawal_time': form_data.get('withdrawal_time', TIME_END),
                'mode': form_data.get('mode', MODE_WITHDRAWAL),
                'P': form_data.get('P', '500000')
            }
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
                W_form, r_calc, i_calc, T_form, withdrawal_time_form, MODE_WITHDRAWAL, P_value=None
            )
            if P_calc_primary == float('inf'):
                template_form_data = { 'W': W_form, 'r': r_perc_form, 'i': i_perc_form, 'T': T_form, 'withdrawal_time': withdrawal_time_form, 'mode': mode_form, 'P': '' }
                return render_template('index.html', error="Cannot find a suitable portfolio for the given withdrawal. Inputs may be unrealistic.", **template_form_data)

            calculated_P_output = P_calc_primary
            initial_W_input_for_fire_mode = W_actual_primary # This will be W_form
            portfolio_plot_W_mode, withdrawal_plot_W_mode = p_plot_w, w_plot_w
            table_data_W_mode_html = table_w

            # Secondary calculation for Expense Mode section (using P_calc_primary)
            initial_P_input_for_expense_mode_raw = P_calc_primary
            _, W_calc_secondary, p_plot_p, w_plot_p, table_p = generate_plots(
                initial_W_input_for_fire_mode, r_calc, i_calc, T_form, withdrawal_time_form, MODE_PORTFOLIO, P_value=initial_P_input_for_expense_mode_raw
            )
            calculated_W_output_for_expense_mode = W_calc_secondary
            portfolio_plot_P_mode, withdrawal_plot_P_mode = p_plot_p, w_plot_p
            table_data_P_mode_html = table_p

        elif mode_form == MODE_PORTFOLIO:
            # Primary calculation: Expense Mode (P input -> W calculated)
            P_actual_primary, W_calc_primary, p_plot_p, w_plot_p, table_p = generate_plots(
                W_form, r_calc, i_calc, T_form, withdrawal_time_form, MODE_PORTFOLIO, P_value=P_value_form
            )
            initial_P_input_for_expense_mode_raw = P_actual_primary # This will be P_value_form
            calculated_W_output_for_expense_mode = W_calc_primary
            portfolio_plot_P_mode, withdrawal_plot_P_mode = p_plot_p, w_plot_p
            table_data_P_mode_html = table_p

            # Secondary calculation for FIRE Mode section (using W_calc_primary)
            initial_W_input_for_fire_mode = W_calc_primary
            P_calc_secondary, _, p_plot_w, w_plot_w, table_w = generate_plots(
                initial_W_input_for_fire_mode, r_calc, i_calc, T_form, withdrawal_time_form, MODE_WITHDRAWAL, P_value=None
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

        # Common parameters for form pre-filling on result.html
        # Using distinct names to avoid potential clashes if result.html also uses 'r', 'i', 'T' for display
        form_params_for_result_page = {
            'r_form_val': r_perc_form,
            'i_form_val': i_perc_form,
            'T_form_val': T_form,
            'withdrawal_time_form_val': withdrawal_time_form,
            'initial_mode_from_index': mode_form # Helps result.html know the user's primary focus
        }

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
        'W': '20000', 'r': '5', 'i': '2', 'T': '30',
        'withdrawal_time': TIME_END, 'mode': MODE_WITHDRAWAL, 'P': '500000', 'error': None
    }
    return render_template('index.html', **default_form_data)


@app.route('/update', methods=['POST'])
def update():
    # Similar validation as in index() POST should be applied here if inputs can be arbitrary
    # For brevity, assuming inputs are somewhat controlled or client-side validated for this AJAX endpoint
    try:
        W_form = float(request.form['W'])
        r_perc_form = float(request.form['r'])
        i_perc_form = float(request.form['i'])
        T_form = int(request.form['T'])

        if T_form <= 0: raise ValueError("Time horizon (T) must be greater than 0.")
        if W_form < 0: raise ValueError("Annual withdrawal (W) cannot be negative.")
        if not (-100 < r_perc_form < 1000):
            raise ValueError("Annual return (r) is out of typical range.")
        if not (-100 < i_perc_form < 1000):
            raise ValueError("Inflation rate (i) is out of typical range.")

        withdrawal_time = request.form.get('withdrawal_time', TIME_END)
        P_value = float(request.form['P'])
        if P_value < 0: raise ValueError("P must be >= 0")
        # Convert percentages to decimals for calculations
        r_calc = r_perc_form / 100
        i_calc = i_perc_form / 100

    except ValueError as e:
        return jsonify({'error': f'Invalid input: {str(e)}'})
    
    # Calculate for mode 'W'
    required_portfolio_W, annual_expense_W, portfolio_plot_W, withdrawal_plot_W, table_data_W_html = generate_plots(
        W_form, r_calc, i_calc, T_form, withdrawal_time, mode=MODE_WITHDRAWAL
    )
    
    # Calculate for mode 'P'
    # Note: The 'W' passed here is from the form, but generate_plots will recalculate W if mode='P'
    required_portfolio_P, annual_expense_P, portfolio_plot_P, withdrawal_plot_P, table_data_P_html = generate_plots(
        W_form, r_calc, i_calc, T_form, withdrawal_time, mode=MODE_PORTFOLIO, P_value=P_value
    )
    
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
                
                

                # Validation for each scenario's inputs
                if not (-100 < scenario['r_perc'] < 1000):
                    scenario['error'] = f"Scenario {n}: Annual return (r) is out of typical range."
                    scenario['enabled'] = False
                elif not (-100 < scenario['i_perc'] < 1000):
                    scenario['error'] = f"Scenario {n}: Inflation rate (i) is out of typical range."
                    scenario['enabled'] = False
                elif scenario['T'] <= 0:
                    scenario['error'] = f"Scenario {n}: Time (T) must be > 0."
                    scenario['enabled'] = False
                elif scenario['W'] < 0:
                    scenario['error'] = f"Scenario {n}: Withdrawal (W) must be >= 0."
                    scenario['enabled'] = False
                
            except ValueError:
                scenario['error'] = f"Scenario {n}: Invalid numeric input."
                scenario['enabled'] = False
            
            if scenario.get('enabled'): # Proceed if enabled and no parsing/validation errors
                r_val = scenario['r_perc'] / 100
                i_val = scenario['i_perc'] / 100
                portfolio = find_required_portfolio(scenario['W'], r_val, i_val, scenario['T'], scenario['withdrawal_time'])
                
                if portfolio == float('inf'):
                    scenario['error'] = f"Scenario {n}: Cannot find suitable portfolio (inputs unrealistic)."
                    scenario['fire_number'] = "N/A"
                    scenario['years'], scenario['balances'], scenario['withdrawals'] = [], [], []
                else:
                    years, balances, withdrawals = annual_simulation(portfolio, r_val, i_val, scenario['W'], scenario['T'], scenario['withdrawal_time'])
                    scenario['fire_number'] = portfolio
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
    return render_template("settings.html")

if __name__ == '__main__':
    app.run(debug=True)
