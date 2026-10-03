/** Entered housing costs reserve part of the existing monthly payment cap.
 * Annual costs are divided by 12; no property estimate or eligibility rule is inferred.
 * Callers validate raw fields first. Historical omitted options are zero. */
export function housingBudget(values: Record<string, number>, totalDebtShare: number) {
  const amount = (key: string) => Number.isFinite(values[key]) ? Math.max(0, values[key]) : 0;
  const housingShareLimit = amount('income') * amount('maxDti') / 100;
  const totalDebtRoom = Math.max(0, amount('income') * totalDebtShare - amount('debts'));
  const limit = Math.min(housingShareLimit, totalDebtRoom);
  const taxes = amount('annualTaxes') / 12;
  const insurance = amount('annualInsurance') / 12;
  const hoa = amount('monthlyHoa');
  const mortgageInsurance = amount('monthlyMortgageInsurance');
  const costs = taxes + insurance + hoa + mortgageInsurance;
  return { housingShareLimit, totalDebtRoom, limit, taxes, insurance, hoa, mortgageInsurance,
    costs, loanPayment: Math.max(0, limit - costs), shortfall: Math.max(0, costs - limit) };
}
