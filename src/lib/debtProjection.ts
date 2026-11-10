/** B71: bounded, shared monthly debt projections for results and disclosure tables. */
export const DEBT_HORIZON_MONTHS = 600;
export const DEBT_RESIDUAL_TOLERANCE = 0.005;
export type DebtMonth = { month: number; year: number; payment: number; principalPaid: number; interest: number; endingBalance: number; cumulativeInterest: number; totalPaid: number; note?: string };
export type DebtProjection = { rows: DebtMonth[]; balance: number; interest: number; months: number; totalPaid: number; paidOff: boolean };
const nonnegative = (n: number | undefined) => Number.isFinite(n) ? Math.max(0, n!) : 0;
export function projectDebt(balance: number, annualRate: number, payment: number, extraMonthly = 0, extraAnnual = 0, maxMonths = DEBT_HORIZON_MONTHS, rateAfter?: { month: number; annualRate: number }): DebtProjection {
  let remaining = nonnegative(balance), cumulativeInterest = 0, totalPaid = 0;
  const rows: DebtMonth[] = [];
  for (let month = 1; month <= maxMonths && remaining > 0; month += 1) {
    const rate = rateAfter && month > rateAfter.month ? rateAfter.annualRate : annualRate;
    const interest = remaining * nonnegative(rate) / 12;
    const planned = nonnegative(payment) + nonnegative(extraMonthly) + (month % 12 === 0 ? nonnegative(extraAnnual) : 0);
    const due = remaining + interest;
    const paid = due <= planned + DEBT_RESIDUAL_TOLERANCE ? due : planned;
    const endingBalance = Math.max(0, due - paid);
    cumulativeInterest += interest; totalPaid += paid;
    rows.push({ month, year: Math.ceil(month / 12), payment: paid, principalPaid: paid - interest, interest, endingBalance, cumulativeInterest, totalPaid,
      note: endingBalance === 0 ? 'Final payment' : paid <= interest ? 'Payment does not reduce principal' : month % 12 === 0 && extraAnnual > 0 ? 'Yearly extra applied' : undefined });
    remaining = endingBalance;
  }
  return { rows, balance: remaining, interest: cumulativeInterest, months: rows.length, totalPaid, paidOff: remaining === 0 };
}
export function projectTransfer(values: Record<string, number>) {
  const balance = nonnegative(values.balance), payment = nonnegative(values.payment), fee = balance * nonnegative(values.feeRate) / 100;
  const promoMonths = Number.isFinite(values.promoMonths) ? Math.max(0, Math.round(values.promoMonths)) : Number.POSITIVE_INFINITY;
  const current = projectDebt(balance, nonnegative(values.currentRate) / 100, payment);
  const transfer = projectDebt(balance + fee, nonnegative(values.newRate) / 100, payment, 0, 0, DEBT_HORIZON_MONTHS, { month: promoMonths, annualRate: nonnegative(values.currentRate) / 100 });
  const promoRows = Math.min(transfer.months, promoMonths), promoBalance = promoRows > 0 ? transfer.rows[promoRows - 1].endingBalance : balance + fee;
  return { current, transfer, fee, promoMonths, promoRows, promoBalance };
}
export type StrategyMode = 'avalanche' | 'snowball';
export type StrategyMonth = { month: number; balance: number; interest: number; paidOffName?: string };
export function projectDebtStrategy(values: Record<string, number>, mode: StrategyMode) {
  const debts = [
    { balance: nonnegative(values.debt1Balance), minimum: nonnegative(values.debt1Minimum), rate: nonnegative(values.debt1Rate) / 100, name: 'Credit card' },
    { balance: nonnegative(values.debt2Balance), minimum: nonnegative(values.debt2Minimum), rate: nonnegative(values.debt2Rate) / 100, name: 'Auto loan' },
    { balance: nonnegative(values.debt3Balance), minimum: nonnegative(values.debt3Minimum), rate: nonnegative(values.debt3Rate) / 100, name: 'Student loan' }
  ].filter(debt => debt.balance > 0);
  const budget = debts.reduce((sum, debt) => sum + debt.minimum, nonnegative(values.extraPayment));
  const rows: StrategyMonth[] = []; let interest = 0;
  for (let month = 1; month <= DEBT_HORIZON_MONTHS && debts.some(debt => debt.balance > 0); month += 1) {
    const events: string[] = [];
    for (const debt of debts) { const growth = debt.balance * debt.rate / 12; debt.balance += growth; interest += growth; }
    let remaining = budget;
    const pay = (debt: typeof debts[number], requested: number) => {
      const amount = Math.min(debt.balance, requested, remaining);
      debt.balance -= amount; remaining -= amount;
      // Match the loan model's sub-cent terminal tolerance; never carry a float speck into another month.
      if (debt.balance <= DEBT_RESIDUAL_TOLERANCE) { debt.balance = 0; events.push(debt.name); }
    };
    for (const debt of debts) if (debt.balance > 0) pay(debt, debt.minimum);
    while (remaining > 0 && debts.some(debt => debt.balance > 0)) {
      const target = debts.filter(debt => debt.balance > 0).sort((a, b) => mode === 'avalanche' ? b.rate - a.rate || a.balance - b.balance : a.balance - b.balance || b.rate - a.rate)[0];
      pay(target, remaining);
    }
    rows.push({ month, balance: debts.reduce((sum, debt) => sum + debt.balance, 0), interest, paidOffName: events.length ? `${events.join(', ')} paid off` : undefined });
  }
  const balance = rows.at(-1)?.balance ?? 0;
  return { rows, balance, interest, months: rows.length, paidOff: balance === 0 };
}
