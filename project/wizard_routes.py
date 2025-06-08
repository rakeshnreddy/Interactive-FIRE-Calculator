from flask import Blueprint, render_template, redirect, url_for, session, request
from project.forms import ExpensesForm, RatesForm, OneOffsForm # Assuming forms are in project.forms

wizard_bp = Blueprint('wizard_bp', __name__, template_folder='../templates')

@wizard_bp.route('/wizard/expenses', methods=['GET', 'POST'])
def wizard_expenses_step():
    form = ExpensesForm(request.form if request.method == 'POST' else None)
    if form.validate_on_submit():
        session['wizard_expenses'] = form.data
        return redirect(url_for('wizard_bp.wizard_rates_step'))
    # Pre-fill form if data already in session (e.g., user went back)
    elif request.method == 'GET' and 'wizard_expenses' in session:
        form = ExpensesForm(data=session['wizard_expenses'])
    return render_template('wizard_expenses.html', form=form, title='Step 1: Your Expenses')

@wizard_bp.route('/wizard/rates', methods=['GET', 'POST'])
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

@wizard_bp.route('/wizard/one_offs', methods=['GET', 'POST'])
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


@wizard_bp.route('/wizard/summary', methods=['GET'])
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

    return render_template('wizard_summary.html',
                           title='Wizard Summary',
                           expenses_data=expenses_data,
                           rates_data=rates_data,
                           one_offs_data=one_offs_data)
