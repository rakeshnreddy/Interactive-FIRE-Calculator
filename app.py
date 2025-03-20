from flask import Flask, render_template, request, jsonify
import numpy as np
import plotly.graph_objects as go
import plotly.offline as pyo

app = Flask(__name__)

def annual_simulation(PV, r, i, W, T, withdrawal_time):
    """
    Simulate the annual portfolio balance.
    Returns arrays: years, balances (at start of each year), and annual withdrawals.
    """
    years = np.arange(0, T + 1)
    balances = []
    withdrawals = []
    B = PV
    for t in range(T):
        annual_withdrawal = W * ((1 + i) ** t)
        withdrawals.append(annual_withdrawal)
        if withdrawal_time == "start":
            B = B - annual_withdrawal
            balances.append(B)
            B = B * (1 + r)
        else:
            balances.append(B)
            B = B * (1 + r) - annual_withdrawal
    balances.append(B)
    return years, balances, withdrawals

def simulate_final_balance(PV, r, i, W, T, withdrawal_time):
    _, balances, _ = annual_simulation(PV, r, i, W, T, withdrawal_time)
    return balances[-1]

def find_required_portfolio(W, r, i, T, withdrawal_time):
    if r != i:
        lower = (W / (r - i)) * (1 - ((1 + i) / (1 + r))**T)
    else:
        lower = W * T / (1 + i)
    if withdrawal_time == "start":
        lower *= 1.05
    upper = lower * 1.5
    while simulate_final_balance(upper, r, i, W, T, withdrawal_time) < 0:
        upper *= 2
    tolerance = 1.0
    while (upper - lower) > tolerance:
        mid = (lower + upper) / 2.0
        if simulate_final_balance(mid, r, i, W, T, withdrawal_time) < 0:
            lower = mid
        else:
            upper = mid
    return upper

def find_max_annual_expense(P, r, i, T, withdrawal_time):
    lower = 0.0
    if r != i:
        upper = P * (r - i) / (1 - ((1 + i) / (1 + r))**T)
    else:
        upper = P * (1 + i) / T
    tolerance = 1.0
    while (upper - lower) > tolerance:
        mid = (lower + upper) / 2.0
        final_balance = simulate_final_balance(P, r, i, mid, T, withdrawal_time)
        if final_balance < 0:
            upper = mid
        else:
            lower = mid
    return upper

def generate_plots(W, r, i, T, withdrawal_time, mode, P_value=None):
    if mode == 'W':
        required_portfolio = find_required_portfolio(W, r, i, T, withdrawal_time)
    else:
        required_portfolio = P_value
        W = find_max_annual_expense(required_portfolio, r, i, T, withdrawal_time)
    years, balances, withdrawals = annual_simulation(required_portfolio, r, i, W, T, withdrawal_time)
    
    plot_config = {'displayModeBar': False, 'responsive': True}
    
    # Portfolio Balance Plot
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
    
    # Annual Withdrawals Plot
    fig2 = go.Figure()
    fig2.add_trace(go.Scatter(
        x=years[:-1], y=withdrawals,
        mode='lines+markers',
        name='Annual Withdrawal',
        marker_color='orange',
        hovertemplate='Year: %{x}<br>Withdrawal: $%{y:,.2f}<extra></extra>'
    ))
    fig2.update_layout(
        title='Annual Withdrawals',
        xaxis_title='Years',
        yaxis_title='Withdrawal ($)'
    )
    withdrawal_plot = pyo.plot(fig2, include_plotlyjs=False, output_type='div', config=plot_config)
    
    return required_portfolio, W, portfolio_plot, withdrawal_plot

@app.route('/', methods=['GET', 'POST'])
def index():
    if request.method == 'POST':
        try:
            W = float(request.form['W'])
            r = float(request.form['r']) / 100
            i = float(request.form['i']) / 100
            T = int(request.form['T'])
            withdrawal_time = request.form.get('withdrawal_time', 'end')
            mode = request.form.get('mode', 'W')
            if mode == 'P':
                P_value = float(request.form['P'])
            else:
                P_value = None
        except ValueError:
            return "Invalid input. Please ensure all fields are correctly filled."
        
        required_portfolio, W_result, portfolio_plot, withdrawal_plot = generate_plots(
            W, r, i, T, withdrawal_time, mode, P_value
        )
        return render_template('result.html',
                               fire_number=required_portfolio,
                               annual_expense=W_result,
                               portfolio_plot=portfolio_plot,
                               withdrawal_plot=withdrawal_plot,
                               W=W, r=r*100, i=i*100, T=T,
                               withdrawal_time=withdrawal_time,
                               mode=mode,
                               P=required_portfolio if mode == 'W' else P_value)
    return render_template('index.html')

@app.route('/update', methods=['POST'])
def update():
    try:
        W = float(request.form['W'])
        r = float(request.form['r']) / 100
        i = float(request.form['i']) / 100
        T = int(request.form['T'])
        withdrawal_time = request.form.get('withdrawal_time', 'end')
        P_value = float(request.form['P'])
    except ValueError:
        return jsonify({'error': 'Invalid input'})
    
    required_portfolio_W, annual_expense_W, portfolio_plot_W, withdrawal_plot_W = generate_plots(
        W, r, i, T, withdrawal_time, mode='W'
    )
    required_portfolio_P, annual_expense_P, portfolio_plot_P, withdrawal_plot_P = generate_plots(
        W, r, i, T, withdrawal_time, mode='P', P_value=P_value
    )
    
    return jsonify({
        'fire_number_W': f"${required_portfolio_W:,.2f}",
        'annual_expense_W': f"${annual_expense_W:,.2f}",
        'portfolio_plot_W': portfolio_plot_W,
        'withdrawal_plot_W': withdrawal_plot_W,
        'fire_number_P': f"${required_portfolio_P:,.2f}",
        'annual_expense_P': f"${annual_expense_P:,.2f}",
        'portfolio_plot_P': portfolio_plot_P,
        'withdrawal_plot_P': withdrawal_plot_P
    })

@app.route('/compare', methods=['GET', 'POST'])
def compare():
    if request.method == 'POST':
        scenarios = []
        for n in range(1, 5):
            scenario = {}
            scenario['n'] = n
            scenario['enabled'] = request.form.get(f"scenario{n}_enabled") == "on"
            try:
                scenario['W'] = float(request.form.get(f"scenario{n}_W", 0))
                scenario['r'] = float(request.form.get(f"scenario{n}_r", 0))
                scenario['i'] = float(request.form.get(f"scenario{n}_i", 0))
                scenario['T'] = int(request.form.get(f"scenario{n}_T", 0))
                scenario['withdrawal_time'] = request.form.get(f"scenario{n}_withdrawal_time", "end")
            except (ValueError, KeyError):
                continue
            if scenario['enabled']:
                portfolio = find_required_portfolio(scenario['W'], scenario['r']/100, scenario['i']/100, scenario['T'], scenario['withdrawal_time'])
                years, balances, withdrawals = annual_simulation(portfolio, scenario['r']/100, scenario['i']/100, scenario['W'], scenario['T'], scenario['withdrawal_time'])
                scenario['fire_number'] = portfolio
                scenario['years'] = years.tolist()
                scenario['balances'] = balances
                scenario['withdrawals'] = withdrawals
            scenarios.append(scenario)
        enabled_scenarios = [sc for sc in scenarios if sc.get('enabled')]
        if not enabled_scenarios:
            message = "No valid scenarios enabled. Please enable at least one scenario with valid inputs."
            return jsonify({"message": message})
        
        plot_config = {'displayModeBar': False, 'responsive': True}
        
        # Combined Portfolio Balance Graph
        fig_balance = go.Figure()
        for sc in enabled_scenarios:
            fig_balance.add_trace(go.Scatter(
                x=sc["years"], y=sc["balances"],
                mode='lines+markers',
                name=f"Scenario {sc['n']}",
                hovertemplate='Year: %{x}<br>Balance: $%{y:,.2f}<extra></extra>'
            ))
        fig_balance.update_layout(
            title="Portfolio Balance Comparison",
            xaxis_title="Years",
            yaxis_title="Portfolio Value ($)"
        )
        combined_balance = pyo.plot(fig_balance, include_plotlyjs=False, output_type='div', config=plot_config)
        
        # Combined Withdrawals Graph (updated with unique uid for each trace)
        fig_withdrawal = go.Figure()
        for sc in enabled_scenarios:
            fig_withdrawal.add_trace(go.Scatter(
                x=sc["years"][:-1], y=sc["withdrawals"],
                mode='lines+markers',
                name=f"Scenario {sc['n']}",
                uid=f"scenario_{sc['n']}_withdrawal",
                hovertemplate='Year: %{x}<br>Withdrawal: $%{y:,.2f}<extra></extra>'
            ))
        fig_withdrawal.update_layout(
            title="Annual Withdrawals Comparison",
            xaxis_title="Years",
            yaxis_title="Withdrawal ($)"
        )
        combined_withdrawal = pyo.plot(fig_withdrawal, include_plotlyjs=False, output_type='div', config=plot_config)
        
        return jsonify({
            "combined_balance": combined_balance,
            "combined_withdrawal": combined_withdrawal,
            "scenarios": enabled_scenarios,
            "message": ""
        })
    else:
        return render_template("compare.html", message="", scenarios=[], combined_balance=None, combined_withdrawal=None)

if __name__ == '__main__':
    app.run(debug=True)
