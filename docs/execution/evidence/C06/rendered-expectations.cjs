function evaluateRenderedExpectation(domain, state, textContent) {
  if (state === 'loading') {
    return {
      matchedStateExpectation: /Loading (account data|saved calculator results|goals)/i.test(textContent),
      detail: 'Require rendered loading indicator'
    };
  }
  if (state === 'failure') {
    const hasError = textContent.includes('Synthetic Error: Connection to backend storage timed out');
    return {
      matchedStateExpectation: hasError,
      detail: hasError ? 'Found synthetic timeout error message' : 'Missing expected synthetic timeout error'
    };
  }
  if (state === 'empty') {
    if (domain === 'accounts') {
      const matched = textContent.includes('No accounts yet');
      return { matchedStateExpectation: matched, detail: matched ? 'Found empty accounts message ("No accounts yet")' : 'Missing "No accounts yet"' };
    }
    if (domain === 'transactions') {
      const matched = textContent.includes('No transactions yet');
      return { matchedStateExpectation: matched, detail: matched ? 'Found empty transactions message' : 'Missing "No transactions yet"' };
    }
    if (domain === 'goals') {
      const matched = textContent.includes('No goals yet');
      return { matchedStateExpectation: matched, detail: matched ? 'Found empty goals message' : 'Missing "No goals yet"' };
    }
    if (domain === 'plans') {
      const matched = textContent.includes('ACTIVE PLAN') && textContent.includes('Unsaved draft');
      return { matchedStateExpectation: matched, detail: matched ? 'Found plans workspace empty state (Unsaved draft)' : 'Missing plans empty state' };
    }
    return { matchedStateExpectation: false, detail: 'No expectation implemented for this empty state' };
  }
  if (state === 'stale') {
    if (!/2025|overdue|past due/i.test(textContent)) return { matchedStateExpectation: false, detail: 'Missing stale date or overdue evidence' };
    if (domain === 'accounts') {
      const matched = textContent.includes('Apex Federal Credit Union') || textContent.includes('Cascade High Yield Bank');
      return { matchedStateExpectation: matched, detail: matched ? 'Found stale account fixtures' : 'Missing stale accounts' };
    }
    if (domain === 'transactions') {
      const matched = textContent.includes('Employer Direct Deposit') || textContent.includes('Mortgage');
      return { matchedStateExpectation: matched, detail: matched ? 'Found stale transactions' : 'Missing stale transactions' };
    }
    if (domain === 'goals') {
      const matched = textContent.includes('Coast FIRE Portfolio Baseline') || textContent.includes('Emergency Buffer');
      return { matchedStateExpectation: matched, detail: matched ? 'Found stale goals' : 'Missing stale goals' };
    }
    return { matchedStateExpectation: false, detail: 'No expectation implemented for this stale state' };
  }
  if (state === 'long-value') {
    const matched = textContent.includes('Sovereign') || textContent.includes('Dynasty') || textContent.includes('Superyacht') || textContent.includes('Multigenerational');
    return { matchedStateExpectation: matched, detail: matched ? 'Found long-value strings' : 'Missing long-value strings' };
  }
  if (state === 'populated') {
    if (domain === 'dashboard') {
      const matched = textContent.includes('Net worth') && textContent.includes('Assets');
      return { matchedStateExpectation: matched, detail: matched ? 'Found dashboard metrics' : 'Missing dashboard metrics' };
    }
    if (domain === 'accounts') {
      const matched = textContent.includes('Primary Household Checking') && textContent.includes('Emergency Reserve Fund');
      return { matchedStateExpectation: matched, detail: matched ? 'Found populated accounts' : 'Missing populated accounts' };
    }
    if (domain === 'transactions') {
      const matched = textContent.includes('Bi-Weekly Employer Direct Deposit') || textContent.includes('Farmers Market Produce');
      return { matchedStateExpectation: matched, detail: matched ? 'Found populated transactions' : 'Missing transactions' };
    }
    if (domain === 'goals') {
      const matched = textContent.includes('Coast FIRE Portfolio Baseline') || textContent.includes('Emergency Buffer');
      return { matchedStateExpectation: matched, detail: matched ? 'Found populated goals' : 'Missing goals' };
    }
    if (domain === 'plans') {
      const matched = textContent.includes('ACTIVE PLAN') && textContent.includes('Age 55 Lean/Chubby FIRE Roadmap');
      return { matchedStateExpectation: matched, detail: matched ? 'Found planning workspace (Age 55 Lean/Chubby FIRE Roadmap)' : 'Missing planning workspace' };
    }
    if (domain === 'reports') {
      const matched = textContent.includes('Excess Liquid Cash Drag');
      return { matchedStateExpectation: matched, detail: matched ? 'Found insights report' : 'Missing insights report' };
    }
    if (domain === 'settings') {
      const matched = textContent.includes('Profile defaults') && textContent.includes('Privacy controls');
      return { matchedStateExpectation: matched, detail: matched ? 'Found settings panels' : 'Missing settings panels' };
    }
  }
  return { matchedStateExpectation: false, detail: 'No expectation implemented for this combination' };
}

module.exports = { evaluateRenderedExpectation };
