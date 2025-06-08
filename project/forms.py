from flask_wtf import FlaskForm
from wtforms import StringField, FloatField, IntegerField, FieldList, FormField, SubmitField, TextAreaField, RadioField # Add RadioField
from wtforms.validators import DataRequired, NumberRange, Optional

class PeriodRateForm(FlaskForm):
    '''Sub-form for individual period rates.'''
    years = IntegerField('Years in Period', validators=[DataRequired(), NumberRange(min=1)])
    rate = FloatField('Annual Rate (%)', validators=[DataRequired(), NumberRange(min=-100, max=100)])

class OneOffEntryForm(FlaskForm):
    '''Sub-form for individual one-off entries (expenses or incomes).'''
    year = IntegerField('Year', validators=[DataRequired(), NumberRange(min=0)]) # Assuming year is relative to start or absolute
    amount = FloatField('Amount', validators=[DataRequired(), NumberRange(min=0)])
    description = StringField('Description', validators=[Optional()])

class ExpensesForm(FlaskForm):
    '''Form for capturing all annual expenses.'''
    annual_expenses = FloatField('Total Current Annual Expenses', validators=[DataRequired(), NumberRange(min=0)])
    housing = FloatField('Housing (e.g., rent/mortgage, property tax, insurance)', validators=[Optional(), NumberRange(min=0)])
    food = FloatField('Food (groceries, dining out)', validators=[Optional(), NumberRange(min=0)])
    transportation = FloatField('Transportation (car payments, fuel, public transport, maintenance)', validators=[Optional(), NumberRange(min=0)])
    utilities = FloatField('Utilities (electricity, water, gas, internet, phone)', validators=[Optional(), NumberRange(min=0)])
    personal_care = FloatField('Personal Care (haircuts, toiletries, gym)', validators=[Optional(), NumberRange(min=0)])
    entertainment = FloatField('Entertainment (hobbies, subscriptions, travel)', validators=[Optional(), NumberRange(min=0)])
    healthcare = FloatField('Healthcare (insurance premiums, medical expenses)', validators=[Optional(), NumberRange(min=0)])
    other_expenses = FloatField('Other Miscellaneous Expenses', validators=[Optional(), NumberRange(min=0)])
    submit = SubmitField('Next: Rates')

class RatesForm(FlaskForm):
    '''Form for capturing investment return rates and inflation.'''
    return_rate = FloatField('Overall Portfolio Return Rate (%, nominal)', validators=[DataRequired(), NumberRange(min=-50, max=100)])
    inflation_rate = FloatField('Assumed Annual Inflation Rate (%)', validators=[DataRequired(), NumberRange(min=-10, max=50)])

    total_duration_fallback = IntegerField(
        'Total Duration (years, if no specific periods defined below)',
        default=30,
        validators=[Optional(), NumberRange(min=1, max=100)]
    )

    desired_final_value = FloatField('Desired Final Portfolio Value (Optional)', default=0.0, validators=[Optional(), NumberRange(min=0)])
    withdrawal_time = RadioField(
        'Withdrawal Timing',
        choices=[('start', 'Start of Year'), ('end', 'End of Year')],
        default='end',
        validators=[DataRequired()]
    )

    period_rates = FieldList(FormField(PeriodRateForm), min_entries=0)
    submit_add_period = SubmitField('Add Period Rate')
    submit = SubmitField('Next: One-Offs')

class OneOffsForm(FlaskForm):
    '''Form for capturing large one-off expenses and incomes.'''
    large_expenses = FieldList(FormField(OneOffEntryForm), min_entries=0)
    large_incomes = FieldList(FormField(OneOffEntryForm), min_entries=0)
    # Buttons to dynamically add more entries in the template
    submit_add_expense = SubmitField('Add One-Off Expense')
    submit_add_income = SubmitField('Add One-Off Income')
    submit = SubmitField('Next: Summary')
