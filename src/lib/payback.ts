export type PaybackState = 'no-payment-saving' | 'no-upfront-cost' | 'payback-within-horizon' | 'payback-after-horizon';
export type PaybackAssessment = { state: PaybackState; message: string; months?: number };
/** A nonpositive denominator has no finite payback. Zero is reserved for zero cost. */
export function assessPayback(saving: number, cost: number, horizonMonths: number, kind: 'points' | 'switching'): PaybackAssessment {
  if (saving <= 0) return { state: 'no-payment-saving', message: 'No payment saving in this model. These payments do not recover the cost.' };
  if (cost === 0) return { state: 'no-upfront-cost', months: 0, message: `No ${kind} cost entered. The lower payment starts saving immediately in this model.` };
  const months = cost / saving;
  return months <= horizonMonths
    ? { state: 'payback-within-horizon', months, message: 'Payback is within the modeled loan horizon. This is a simplified cost-to-payment-saving comparison.' }
    : { state: 'payback-after-horizon', months, message: 'Payback is after the modeled loan horizon. The payment saving does not recover the cost during this term.' };
}
