from flask_wtf import FlaskForm
from wtforms import StringField, FloatField, IntegerField, FieldList, FormField, SubmitField, TextAreaField
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
    housing = FloatField('Housing (e.g., rent/mortgage, property tax, insurance)', validators=[DataRequired(), NumberRange(min=0)])
    food = FloatField('Food (groceries, dining out)', validators=[DataRequired(), NumberRange(min=0)])
    transportation = FloatField('Transportation (car payments, fuel, public transport, maintenance)', validators=[DataRequired(), NumberRange(min=0)])
    utilities = FloatField('Utilities (electricity, water, gas, internet, phone)', validators=[DataRequired(), NumberRange(min=0)])
    personal_care = FloatField('Personal Care (haircuts, toiletries, gym)', validators=[DataRequired(), NumberRange(min=0)])
    entertainment = FloatField('Entertainment (hobbies, subscriptions, travel)', validators=[DataRequired(), NumberRange(min=0)])
    healthcare = FloatField('Healthcare (insurance premiums, medical expenses)', validators=[DataRequired(), NumberRange(min=0)])
    other_expenses = FloatField('Other Miscellaneous Expenses', validators=[DataRequired(), NumberRange(min=0)])
    submit = SubmitField('Next: Rates')

class RatesForm(FlaskForm):
    '''Form for capturing investment return rates and inflation.'''
    return_rate = FloatField('Overall Portfolio Return Rate (%, nominal)', validators=[DataRequired(), NumberRange(min=-50, max=100)])
    inflation_rate = FloatField('Assumed Annual Inflation Rate (%)', validators=[DataRequired(), NumberRange(min=-10, max=50)])
    period_rates = FieldList(FormField(PeriodRateForm), min_entries=0)
    # It might be good to have a button to dynamically add more period_rates in the template
    submit_add_period = SubmitField('Add Period Rate') # For dynamically adding more periods
    submit = SubmitField('Next: One-Offs')

class OneOffsForm(FlaskForm):
    '''Form for capturing large one-off expenses and incomes.'''
    large_expenses = FieldList(FormField(OneOffEntryForm), min_entries=0)
    large_incomes = FieldList(FormField(OneOffEntryForm), min_entries=0)
    # Buttons to dynamically add more entries in the template
    submit_add_expense = SubmitField('Add One-Off Expense')
    submit_add_income = SubmitField('Add One-Off Income')
    submit = SubmitField('Next: Summary')
