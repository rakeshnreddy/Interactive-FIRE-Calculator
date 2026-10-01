export function assessBenefitCatchUp(early: number, later: number, delayYears: number): { years?: number; message: string } {
  const increase = later - early;
  if (early === 0 && later === 0) return { message: 'No benefit difference. Both entered payments are zero; there is no catch-up date to estimate.' };
  if (increase <= 0) return { message: 'No finite catch-up in this model. The later monthly benefit is not higher, so it cannot make up benefits forgone while waiting.' };
  if (delayYears === 0) return { years: 0, message: 'No waiting period entered. With a higher later benefit, there are no forgone payments to recover.' };
  if (early === 0) return { years: 0, message: 'No early benefits to forgo. The later benefit begins after the entered wait; there is no earlier income to recover.' };
  return { years: early * delayYears / increase, message: 'Estimated years after delayed claiming to recover forgone early benefits, using the entered monthly increase.' };
}
