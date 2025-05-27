import numpy as np
from flask import current_app
from constants import TIME_START, TIME_END # TIME_END will be used by annual_simulation

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
        if withdrawal_time == TIME_START: # TIME_START from constants
            B = B - annual_withdrawal
            balances.append(B)
            B = B * (1 + r)
        else: # Assumes TIME_END if not TIME_START
            balances.append(B)
            B = B * (1 + r) - annual_withdrawal
    balances.append(B)
    return years, balances, withdrawals

def simulate_final_balance(PV, r, i, W, T, withdrawal_time, desired_final_value=0.0):
    """
    Helper function to get the difference between the final balance after T years 
    and the desired_final_value.

    Args:
        PV (float): Present Value.
        r (float): Annual rate of return.
        i (float): Annual inflation rate.
        W (float): Initial annual withdrawal.
        T (int): Time horizon in years.
        withdrawal_time (str): "start" or "end".
        desired_final_value (float, optional): The desired portfolio value at the end of T years. Defaults to 0.0.

    Returns:
        float: Difference between the final portfolio balance and the desired_final_value.
    """
    _, balances, _ = annual_simulation(PV, r, i, W, T, withdrawal_time) # annual_simulation remains unchanged
    actual_final_balance = balances[-1]
    return actual_final_balance - desired_final_value

def find_required_portfolio(W, r, i, T, withdrawal_time, desired_final_value=0.0):
    """
    Find the required initial portfolio (PV) to sustain withdrawals W for T years,
    aiming for a specific desired_final_value. Uses a bisection method.

    Args:
        W (float): Initial annual withdrawal.
        r (float): Annual rate of return.
        i (float): Annual inflation rate.
        T (int): Time horizon in years.
        withdrawal_time (str): "start" or "end".
        desired_final_value (float, optional): The desired portfolio value at the end of T years. Defaults to 0.0.

    Returns:
        float: Required initial portfolio.
    """
    # Calculate Present Value of withdrawals
    if T == 0:
        pv_withdrawals = 0.0
    elif r != i:
        # Handle r = i = -1 case for (1+i) in denominator if needed, though r validation r >= -0.5
        # For (1+i)/(1+r), if r = -1, (1+r) is 0. This is problematic.
        # Current r validation (-0.5 to 1.0) means 1+r is always >= 0.5.
        # If i = -1, 1+i is 0. If r = -1, (r-i) could be non-zero.
        # If r = i, the other formula is used.
        # If r != i:
        #   If 1+r is 0 (r=-1), this is an issue. current_app.config['R_VALID_MIN'] = -0.5
        #   If r-i is 0, this is r=i, handled by else.
        pv_withdrawals = (W / (r - i)) * (1 - ((1 + i) / (1 + r))**T)
    else: # r == i
        if (1 + i) == 0: # Handles r = i = -1. PV of withdrawals is infinite if W > 0.
            pv_withdrawals = float('inf') if W > 0 else 0.0
        else:
            pv_withdrawals = W * T / (1 + i)

    # Calculate Present Value of the desired final target
    if T == 0:
        pv_of_final_target = desired_final_value
    elif (1 + r) <= 0: # r <= -1. Given r >= -0.5, this path shouldn't be hit with valid r.
                       # If it were possible, and desired_final_value > 0, it's effectively inf.
        pv_of_final_target = float('inf') if desired_final_value > 0 else 0.0
    else: # 1+r > 0
        pv_of_final_target = desired_final_value / ((1 + r) ** T)

    if pv_withdrawals == float('inf') or pv_of_final_target == float('inf'):
        lower = float('inf')
    else:
        lower = pv_withdrawals + pv_of_final_target
    
    if withdrawal_time == TIME_START and T > 0: # TIME_START from constants
        # This adjustment should apply to the total PV needed.
        # (1+r) is guaranteed to be > 0 due to r >= -0.5 validation.
        if lower != float('inf'): # Avoid inf * factor
             lower *= (1 + r) 
        
    upper = lower * 1.5 if lower > 0 else (max(desired_final_value, W) * 1.5 if max(desired_final_value, W) > 0 else 1.0) 
    if lower == float('inf'): # If lower bound is already infinite
        return float('inf')
    if upper == float('inf') and lower == float('inf'): # if lower was inf, upper became inf
        return float('inf')
    if W == 0 and desired_final_value == 0: # If no withdrawals and no target, PV is 0
        return 0.0
    if T == 0: # If T=0, required PV is just the desired_final_value (no time for withdrawals or growth)
        return desired_final_value


    # We want (actual_final_balance - desired_final_value) >= 0.
    # So, loop while simulate_final_balance(...) < 0.
    iteration_count = 0
    max_iterations = 100 # Safety break for the while loop finding upper bound

    # Ensure upper is sufficiently large to make simulate_final_balance non-negative
    # or until PV_MAX_GUESS_LIMIT is hit.
    while simulate_final_balance(upper, r, i, W, T, withdrawal_time, desired_final_value) < 0:
        iteration_count += 1
        if iteration_count > max_iterations: # Prevent infinite loop
             # This implies that even very large 'upper' values don't lead to a positive outcome.
             # Could happen if W is extremely large or desired_final_value is unachievable.
            return float('inf')

        # Heuristic to increase upper if it's stuck at 0 or too small
        if upper == 0:
            if W > 0 and T > 0:
                upper = W * T * 2 # Initial guess based on total withdrawals
            elif desired_final_value > 0:
                upper = desired_final_value * 2
            else: # Both W and desired_final_value are 0 or negative
                upper = 1000.0 # Default small positive if all else fails
        else:
            upper *= 2
            
        if upper > current_app.config['PV_MAX_GUESS_LIMIT']: 
            # If even with PV_MAX_GUESS_LIMIT, we can't meet the desired_final_value
            if simulate_final_balance(current_app.config['PV_MAX_GUESS_LIMIT'], r, i, W, T, withdrawal_time, desired_final_value) < 0:
                return float('inf')
            else: # PV_MAX_GUESS_LIMIT is enough, so search within it.
                upper = current_app.config['PV_MAX_GUESS_LIMIT']
                break 
    
    # If lower itself is sufficient (can happen if desired_final_value is low/negative or W is low/negative)
    if simulate_final_balance(lower, r, i, W, T, withdrawal_time, desired_final_value) >= 0:
        # And if the range is already very small (e.g. lower was inf, or upper didn't need to expand much)
        if upper == float('inf') or (upper - lower) <= current_app.config['DEFAULT_TOLERANCE']:
             return lower if lower != float('-inf') else 0.0 # Avoid returning -inf if W is very negative


    # Bisection search
    while (upper - lower) > current_app.config['DEFAULT_TOLERANCE']: 
        mid = (lower + upper) / 2.0
        # Prevent infinite loop if mid gets stuck due to precision limits with inf
        if mid == lower or mid == upper or mid == float('inf'):
            break 
        if simulate_final_balance(mid, r, i, W, T, withdrawal_time, desired_final_value) < 0:
            lower = mid
        else:
            upper = mid
    return upper

def find_max_annual_expense(P, r, i, T, withdrawal_time, desired_final_value=0.0):
    """
    Find the maximum initial annual withdrawal (W) sustainable from portfolio P for T years,
    aiming for a specific desired_final_value. Uses a bisection method.

    Args:
        P (float): Initial portfolio value.
        r (float): Annual rate of return.
        i (float): Annual inflation rate.
        T (int): Time horizon in years.
        withdrawal_time (str): "start" or "end".
        desired_final_value (float, optional): The desired portfolio value at the end of T years. Defaults to 0.0.

    Returns:
        float: Maximum sustainable initial annual withdrawal.
    """
    lower = 0.0 # Minimum possible W is 0

    # If T=0, no withdrawals can occur over time. Max W is effectively 0.
    # The portfolio P is simply compared to desired_final_value.
    # If P >= desired_final_value, a W=0 is sustainable. Otherwise, it's not.
    if T == 0:
        return 0.0

    # Calculate PV of the desired final target.
    # Given r validation (-50% to 100%), 1+r is always > 0.
    pv_of_final_target = desired_final_value / ((1 + r) ** T)
    
    P_for_withdrawals = P - pv_of_final_target

    if P_for_withdrawals <= 0:
        # If the initial portfolio isn't even enough to cover the discounted desired final value,
        # then no withdrawals can be made. We should also check if W=0 is valid.
        if simulate_final_balance(P, r, i, 0, T, withdrawal_time, desired_final_value) >= 0:
            return 0.0 # W=0 is sustainable and meets the desired_final_value goal
        else:
            # This implies P < desired_final_value even with zero withdrawals, which P_for_withdrawals <=0 should catch.
            # Or, if desired_final_value is very high, P_for_withdrawals is negative.
            return 0.0 # Cannot sustain any positive withdrawal.

    # Estimate upper bound for W using P_for_withdrawals
    if r != i:
        # Annuity factor for present value of a growing annuity
        annuity_factor_denominator = (1 - ((1 + i) / (1 + r))**T)
        if annuity_factor_denominator <= 0: # Avoid division by zero or negative if r < i and T makes factor non-positive
            upper = current_app.config['W_MIN_GUESS_FOR_MAX_EXPENSE'] # Fallback to a minimal guess
        else:
            upper = P_for_withdrawals * (r - i) / annuity_factor_denominator
    else: # r == i
        # Annuity factor for present value of a level annuity (in real terms)
        if T <= 0 : # Should be caught by initial T==0 check, but for safety
            upper = 0.0
        elif (1 + i) == 0: # r = i = -1, implies infinite PV for any W > 0
            upper = 0.0 # No sustainable W unless P_for_withdrawals is also infinite
        else:
            upper = P_for_withdrawals * (1 + i) / T
            
    # Ensure upper is not negative and has a minimum floor if it's positive, otherwise 0.
    if upper <=0 : # If calculated upper is non-positive
        upper = 0.0
    else: # If calculated upper is positive, ensure it's at least W_MIN_GUESS_FOR_MAX_EXPENSE
        upper = max(upper, current_app.config['W_MIN_GUESS_FOR_MAX_EXPENSE'])


    # If the initial check determined P_for_withdrawals <= 0, and W=0 works, upper would be 0 here.
    # If upper is 0, it means no positive withdrawal is possible.
    if upper == 0.0:
        # Final check: does W=0 actually meet the condition?
        # (actual_final_balance - desired_final_value) >= 0
        if simulate_final_balance(P, r, i, 0, T, withdrawal_time, desired_final_value) >= 0:
            return 0.0
        else:
            # This implies an edge case where P_for_withdrawals was positive, but annuity formulas yielded W_upper <= 0.
            # This could happen if r, i, T relationship is unusual (e.g. r < i significantly).
            # Effectively, no positive withdrawal can be sustained.
            return 0.0


    # Bisection search for W
    # Target: find highest W such that (actual_final_balance - desired_final_value) >= 0
    iteration_count = 0
    max_iterations = 100 # Safety break for bisection
    
    # Check if the 'upper' W itself is too high (results in missing the target)
    # If simulate_final_balance with 'upper' W is already < 0, then 'upper' is too high.
    # We need an 'upper' that we know is *at least* sustainable or better.
    # The bisection expects:
    # simulate_final_balance(P, ..., lower_W, ...) >= 0 (lower_W is sustainable)
    # simulate_final_balance(P, ..., upper_W, ...) < 0 (upper_W is NOT sustainable)
    # The current 'upper' is an estimate. If it's not sustainable, we need to find one that is, or reduce it.
    # Let's refine the bisection loop slightly.
    # 'lower' = known sustainable W (initially 0)
    # 'upper' = potentially unsustainable W (our estimate, or higher if estimate is sustainable)

    # If our initial 'upper' estimate for W results in not meeting the target,
    # it means this 'upper' W is too high to begin with. We'll use it as the top of our search.
    # If it *does* meet the target, our 'lower' can become this 'upper', and we need a new 'upper'.
    # This part of bisection is tricky for finding max W.
    # Standard bisection for this:
    # If func(mid) < 0 (missed target, W too high), then true_max_W is in [lower, mid] -> upper = mid
    # If func(mid) >= 0 (met target, W sustainable), then true_max_W is in [mid, upper] -> lower = mid

    while (upper - lower) > current_app.config['DEFAULT_TOLERANCE']:
        iteration_count += 1
        if iteration_count > max_iterations: break
        mid = (lower + upper) / 2.0
        if mid == lower or mid == upper: break # Precision limit reached

        if simulate_final_balance(P, r, i, mid, T, withdrawal_time, desired_final_value) < 0:
            upper = mid  # W_mid is too high, so it becomes the new upper bound
        else:
            lower = mid  # W_mid is sustainable, so it becomes the new lower bound (try for higher W)
            
    # 'lower' should be the highest sustainable W found.
    # A final check on 'lower' to ensure it's truly valid.
    if simulate_final_balance(P, r, i, lower, T, withdrawal_time, desired_final_value) < -current_app.config['DEFAULT_TOLERANCE']:
         # If even 'lower' doesn't meet target (within tolerance), means no W could be found.
        return 0.0 
        
    return lower
