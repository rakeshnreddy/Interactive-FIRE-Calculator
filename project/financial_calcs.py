import numpy as np
from flask import current_app
from flask_babel import gettext
from .constants import TIME_START, TIME_END # TIME_END will be used by annual_simulation

def annual_simulation(PV, W_initial, withdrawal_time, rates_periods):
    """
    Simulate the annual portfolio balance over T years with varying rates.

    Args:
        PV (float): Present Value (initial portfolio balance).
        W_initial (float): Initial annual withdrawal amount for the first year.
        withdrawal_time (str): Time of withdrawal, "start" or "end" of the year.
        rates_periods (list of dicts): List of rate periods, e.g.,
                                       [{'duration': D_years, 'r': R_decimal, 'i': I_decimal}, ...]

    Returns:
        tuple: (years_array, balances_list, withdrawals_list)
    """
    if not rates_periods:
        raise ValueError(gettext("rates_periods list cannot be empty."))

    total_T = sum(p.get('duration', 0) for p in rates_periods)
    if total_T <= 0:
        raise ValueError(gettext("Total duration from rates_periods must be greater than zero."))

    years = np.arange(0, total_T + 1)
    balances = []
    sim_withdrawals = [] # Renamed to avoid conflict with outer scope 'withdrawals' in some contexts

    B = PV
    current_annual_withdrawal = W_initial

    current_period_idx = 0
    time_in_current_period = 0

    for t_year_idx in range(total_T):
        # Determine current period's rates
        while time_in_current_period >= rates_periods[current_period_idx]['duration']:
            time_in_current_period -= rates_periods[current_period_idx]['duration']
            current_period_idx += 1
            if current_period_idx >= len(rates_periods):
                 # This should not happen if total_T is calculated correctly and loop runs for total_T years
                raise IndexError(gettext("Ran out of rate periods unexpectedly."))

        r_current_period = rates_periods[current_period_idx]['r']
        i_current_period = rates_periods[current_period_idx]['i']

        # Store the withdrawal for the current year t_year_idx
        sim_withdrawals.append(current_annual_withdrawal)

        if withdrawal_time == TIME_START:
            B -= current_annual_withdrawal
            balances.append(B) # Balance after withdrawal, before growth
            B *= (1 + r_current_period)
        else: # TIME_END
            balances.append(B) # Balance before withdrawal and growth for this year
            B *= (1 + r_current_period)
            B -= current_annual_withdrawal

        # Inflate withdrawal for the *next* year using the current year's inflation
        current_annual_withdrawal *= (1 + i_current_period)
        time_in_current_period += 1

    balances.append(B) # Final balance after T years
    return years, balances, sim_withdrawals


def simulate_final_balance(PV, W_initial, withdrawal_time, rates_periods, desired_final_value=0.0):
    """
    Helper function to get the difference between the final balance after T years
    (with varying rates) and the desired_final_value.

    Args:
        PV (float): Present Value.
        W_initial (float): Initial annual withdrawal.
        withdrawal_time (str): "start" or "end".
        rates_periods (list of dicts): See annual_simulation docstring for structure.
        desired_final_value (float, optional): Target value. Defaults to 0.0.
    """
    if not rates_periods: # Basic check, annual_simulation will also raise
        raise ValueError(gettext("rates_periods list cannot be empty for simulation."))

    _, balances, _ = annual_simulation(PV, W_initial, withdrawal_time, rates_periods)
    actual_final_balance = balances[-1]
    return actual_final_balance - desired_final_value

def find_required_portfolio(W_initial, withdrawal_time, rates_periods, desired_final_value=0.0):
    """
    Find the required initial portfolio (PV) to sustain withdrawals W_initial (with inflation)
    for the duration specified in rates_periods, aiming for a specific desired_final_value.
    Uses a bisection method.

    Args:
        W_initial (float): Initial annual withdrawal.
        withdrawal_time (str): "start" or "end".
        rates_periods (list of dicts): List of rate periods, e.g.,
                                       [{'duration': D_years, 'r': R_decimal, 'i': I_decimal}, ...].
        desired_final_value (float, optional): Target value. Defaults to 0.0.
    """
    if not rates_periods:
        raise ValueError(gettext("rates_periods list cannot be empty."))

    total_T_from_periods = sum(p.get('duration', 0) for p in rates_periods)

    if total_T_from_periods == 0:
        return desired_final_value # No time for withdrawals or growth/loss

    if W_initial == 0 and desired_final_value == 0:
        return 0.0

    lower = desired_final_value if desired_final_value > 0 else 0.0

    # Rough upper bound heuristic
    if W_initial > 0:
        upper = (W_initial * total_T_from_periods * 2) + max(0, desired_final_value)
    else: # W_initial is 0 or negative
        upper = max(1000.0, desired_final_value * 2) # Ensure upper is somewhat positive if DFV is small/zero
        if upper < lower: # Case where DFV is negative
             upper = lower + 1000.0


    # Ensure upper is significantly larger than lower to start, especially if W_initial is large
    # This is a more robust starting upper bound if W_initial is substantial.
    # Heuristic: sum of all (inflated) withdrawals + desired final value, then add buffer.
    # For simplicity, using a multiplier on W_initial * T as a proxy.
    estimated_total_withdrawals = W_initial * total_T_from_periods
    # A more generous upper bound if W_initial is positive
    if W_initial > 0:
        potential_upper = (estimated_total_withdrawals * 1.5) + max(0, desired_final_value) * 1.5
        upper = max(upper, potential_upper)


    upper = max(upper, lower + 100.0) # Ensure there's a search range

    # Maximize upper up to PV_MAX_GUESS_LIMIT if simulate_final_balance is still negative
    iteration_count_upper_bound_search = 0
    max_iterations_upper_bound = 100 # Safety break

    # We need simulate_final_balance to take W_initial, not W (which was the old param name)
    while simulate_final_balance(upper, W_initial, withdrawal_time, rates_periods, desired_final_value) < 0:
        iteration_count_upper_bound_search += 1
        if iteration_count_upper_bound_search > max_iterations_upper_bound:
            return float('inf') # Cannot find a suitable upper bound

        upper_multiplier = 2.0
        # If upper is very small or zero, and W_initial is positive, give it a more substantial boost
        if upper < W_initial * total_T_from_periods and W_initial > 0 :
             upper = W_initial * total_T_from_periods * upper_multiplier
        else:
            upper *= upper_multiplier

        if upper > current_app.config['PV_MAX_GUESS_LIMIT']:
            upper = current_app.config['PV_MAX_GUESS_LIMIT']
            if simulate_final_balance(upper, W_initial, withdrawal_time, rates_periods, desired_final_value) < 0:
                return float('inf') # Even PV_MAX_GUESS_LIMIT is not enough
            break

    # If lower itself is sufficient
    if simulate_final_balance(lower, W_initial, withdrawal_time, rates_periods, desired_final_value) >= 0:
         # And if the range is already very small
        if (upper == float('inf') and lower == float('inf')) or (upper - lower) <= current_app.config['DEFAULT_TOLERANCE']:
             return lower if lower != float('-inf') else 0.0


    # Bisection search
    iteration_count_bisection = 0
    max_iterations_bisection = 100
    while (upper - lower) > current_app.config['DEFAULT_TOLERANCE']:
        iteration_count_bisection +=1
        if iteration_count_bisection > max_iterations_bisection: break

        mid = (lower + upper) / 2.0
        if mid == lower or mid == upper or mid == float('inf'): break

        if simulate_final_balance(mid, W_initial, withdrawal_time, rates_periods, desired_final_value) < 0:
            lower = mid
        else:
            upper = mid

    # Final check on 'upper' as it's the one that should satisfy the condition or be very close
    if simulate_final_balance(upper, W_initial, withdrawal_time, rates_periods, desired_final_value) < -current_app.config['DEFAULT_TOLERANCE']:
        # If 'upper' significantly misses, and 'lower' (which was too low) is float('inf'), something is wrong.
        # This might indicate an unachievable scenario not caught by upper bound search.
        if lower == float('inf'): return float('inf')
        # If 'lower' is a valid number but didn't meet the criteria, and 'upper' also doesn't,
        # it implies no solution was found in the given constraints.
        # However, bisection should converge such that 'upper' is the smallest value satisfying the condition.
        # If 'upper' is still failing significantly, it might be an issue if the function isn't monotonic
        # or if the bounds were not set correctly.
        # For now, returning 'upper' is standard, but this check indicates potential issues.
        # If W_initial is very high, this might be the best we can do, returning a PV that gets close.
        pass # Keep upper as the result from bisection

    return upper


def find_max_annual_expense(P, withdrawal_time, rates_periods, desired_final_value=0.0):
    """
    Find the maximum initial annual withdrawal (W_initial) sustainable from portfolio P
    for the duration specified in rates_periods, aiming for a specific desired_final_value.
    Uses a bisection method.

    Args:
        P (float): Initial portfolio value.
        withdrawal_time (str): "start" or "end".
        rates_periods (list of dicts): List of rate periods, e.g.,
                                       [{'duration': D_years, 'r': R_decimal, 'i': I_decimal}, ...].
        desired_final_value (float, optional): Target value. Defaults to 0.0.
    """
    if not rates_periods:
        raise ValueError(gettext("rates_periods list cannot be empty."))

    total_T_from_periods = sum(p.get('duration', 0) for p in rates_periods)

    if total_T_from_periods == 0:
        return 0.0 # No withdrawals possible over zero time

    lower = 0.0

    # Heuristic for upper bound
    if total_T_from_periods > 0:
        # Estimate based on average withdrawal if portfolio just depletes to desired_final_value
        # This is a very rough estimate.
        avg_r = sum(p['r'] * p['duration'] for p in rates_periods) / total_T_from_periods if total_T_from_periods > 0 else 0
        # Effective principal available for withdrawals over the period
        P_adjusted_for_dfv = P - (desired_final_value / ((1 + avg_r)**total_T_from_periods if (1 + avg_r) > 0 else 1))

        if P_adjusted_for_dfv <= 0: # If P is not enough to even reach DFV without withdrawals
            upper = 0.0
        else:
            # Simple average withdrawal guess
            upper = (P_adjusted_for_dfv / (total_T_from_periods / 1.5)) if total_T_from_periods > 0 else 0 # Added safety factor 1.5
            upper = max(upper, current_app.config.get('W_MIN_GUESS_FOR_MAX_EXPENSE', 1.0))
    else: # total_T_from_periods is 0
        upper = 0.0

    upper = max(upper, current_app.config.get('W_MIN_GUESS_FOR_MAX_EXPENSE', 1.0))
    if P <= 0 and desired_final_value <=0 : # If portfolio is zero or negative, and no positive target, max W is 0
        upper = 0.0

    # If P is positive but upper is 0 (e.g. P_adjusted_for_dfv was negative), check if W=0 is valid
    if upper == 0.0 and P > 0:
        if simulate_final_balance(P, 0, withdrawal_time, rates_periods, desired_final_value) >= 0:
            return 0.0 # W=0 is sustainable
        # else: P is not enough even for W=0 to reach DFV, so need to find a negative W if that's allowed, or stick to 0.
        # Assuming W must be non-negative.


    # Bisection search for W_initial
    iteration_count = 0
    max_iterations = 100 # Safety break

    # Loop while the difference between upper and lower is greater than tolerance
    while (upper - lower) > current_app.config['DEFAULT_TOLERANCE']:
        iteration_count += 1
        if iteration_count > max_iterations:
            break

        mid_W = (lower + upper) / 2.0
        if mid_W == lower or mid_W == upper: # Precision limit reached
            break

        # If simulating with mid_W results in a final balance less than desired,
        # then mid_W is too high. So, new upper bound is mid_W.
        if simulate_final_balance(P, mid_W, withdrawal_time, rates_periods, desired_final_value) < 0:
            upper = mid_W
        # Otherwise, mid_W is sustainable or more than sustainable.
        # So, new lower bound is mid_W, try for a higher W.
        else:
            lower = mid_W

    # 'lower' should be the highest sustainable W_initial found.
    # Final check on 'lower' to ensure it's truly valid and non-negative.
    if lower < 0: return 0.0 # Should not happen if initial lower is 0.0

    if simulate_final_balance(P, lower, withdrawal_time, rates_periods, desired_final_value) < -current_app.config['DEFAULT_TOLERANCE']:
        # If even 'lower' doesn't meet target (within tolerance), means no positive W could be found.
        return 0.0

    return lower
