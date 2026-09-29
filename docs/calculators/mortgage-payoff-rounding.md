# Mortgage Payoff and Schedule Rounding Specification

## 1. Problem Statement & Observed Divergence

In the mobile loan and mortgage calculation flows (specifically observed at \$200,000 principal, 6.5% annual interest rate, 30-year term), the headline metric reported **361 payoff months**, while the monthly schedule table rendered **360 payment rows**.

### Root Cause Analysis
1. **Analytical Payment Formula**:
   The standard fixed monthly payment $P$ is calculated as:
   $$P = L \cdot \frac{r(1+r)^n}{(1+r)^n - 1}$$
   where:
   - $L$ is the original loan principal (\$200,000).
   - $r = \frac{r_{\text{annual}}}{12} = \frac{0.065}{12} \approx 0.005416666666666667$ is the monthly periodic interest rate.
   - $n = \text{years} \times 12 = 360$ is the total number of monthly payment periods.
   - In 64-bit floating point (IEEE 754), $P \approx 1264.1360469859305$.

2. **Compound Floating-Point Residue**:
   Iterating 360 monthly periods of interest calculation ($I_t = B_{t-1} \cdot r$) and balance subtraction ($B_t = B_{t-1} + I_t - P$) accumulates floating-point precision error. At $t = 360$, the remaining balance is:
   $$B_{360} \approx 3.9353835745714605 \times 10^{-9} \text{ USD}$$
   This residual represents approximately \$0.0000000039 (four billionths of a dollar).

3. **Termination Divergence**:
   - In `payoffDebt()` (`src/lib/seoCalculators.ts`), the loop condition checked `while (currentBalance > 0)`. Because $3.935 \times 10^{-9} > 0$, `payoffDebt()` executed an extraneous 361st iteration with an actual payment of $\$3.9567 \times 10^{-9}$, returning `months: 361`.
   - In `amortizationRows()` (`src/lib/calculatorStudios.ts`), the schedule loop capped at `months = Math.round(years * 12) = 360`. It stopped at 360 rows. Because $B_{360} > 0$, row 360 failed the exact `balance === 0` check, leaving `note: undefined` instead of `'Final payment'` and an unrounded residual ending balance.
   - In contrast, a \$300,000 / 6.5% / 30y mortgage happens to yield $B_{360} \equiv 0$ in IEEE 754 arithmetic, masking the bug on default desktop values.

---

## 2. Mathematical & Regulatory References

1. **Brealey, Myers, Allen**, *Principles of Corporate Finance* (McGraw-Hill), Chapter 2: How to Calculate Present Values (Valuing Annuities and Amortizing Loans).
2. **Fabozzi, Frank J.**, *Bond Markets, Analysis, and Strategies* (Prentice Hall / Pearson), Chapter on Mortgage Loans and Amortization Mechanics.
3. **Consumer Financial Protection Bureau (CFPB)**, *12 CFR Part 1026 (Regulation Z)*, Appendix J: Annual Percentage Rate Determinations for Closed-End Credit Transactions; Section (b)(4): Computation of Amortization Schedules and Rounding of Fractional Cents.
4. **Federal Truth in Lending Act (TILA)**, 15 U.S.C. 1601 et seq., Standard Closing and Payoff Balance Settlement Rules.

---

## 3. Annual-to-Periodic Units & Amortization Mechanics

- **Input Annual Rate**: $r_{\text{input}}$ expressed as a percentage on the frontend (e.g. 6.5%, represented numerically as `6.5`). This converts to the annual decimal rate $r_{\text{annual}} = \frac{r_{\text{input}}}{100} = 0.065$.
- **Periodic Monthly Rate**: $r = \frac{r_{\text{annual}}}{12} = \frac{0.065}{12} \approx 0.0054166667$. Note that the decimal rate $0.065$ is divided directly by 12 and must not be divided by 100 a second time. For zero interest ($r = 0$), $P = \frac{L}{n}$.
- **Periodic Compounding**: Monthly interest accrues on the unpaid principal balance at the beginning of each period:
  $$I_t = B_{t-1} \cdot r$$
- **Payment Application**:
  Payments first cover accrued interest for the period, with the remainder reducing principal:
  $$C_t = P_t - I_t$$
  $$B_t = B_{t-1} - C_t = B_{t-1} + I_t - P_t$$

---

## 4. Numerical Residual & Tolerance Decision

### Tolerance Definition & Policy Attribution
$$\epsilon = 0.005 \text{ currency units (half a cent)}$$

This tolerance is defined as **FinPath's numerical modeling policy** for distinguishing binary floating-point arithmetic jitter from real debt obligations. While CFPB Regulation Z (12 CFR Part 1026 Appendix J) governs statutory APR determinations and installment schedules, the specific $\epsilon = 0.005$ half-cent threshold is an engineering and numerical policy rather than a statutory mandate.

### Decision Rationale: Why Half a Cent ($0.005)?
1. **Transactable Currency Limit vs. Settlement Policy**:
   In fiat currency systems (USD, EUR, GBP, INR), the smallest divisible transactional currency unit is 1 cent ($0.01$). Under standard half-up financial rounding, a fractional residual strictly less than half a cent (< $0.005) rounds to $0.00, while an amount of exactly $0.005 rounds up to $0.01.
   FinPath's policy of absorbing residual balances up to and including $0.005 into the final installment is an **inclusive final-payment settlement rule**, not a claim that $0.005 rounds down to $0.00 under half-up display rounding. This policy accommodates compound IEEE 754 floating-point residue up to half a cent inclusively in the loan closure payment.
2. **Distinguishing Numerical Jitter from Material Debt**:
   - Floating-point compounding error over 360–480 months is on the order of $10^{-12}$ to $10^{-7}$ dollars. These residues are strictly numerical artifacts of binary floating-point representation.
   - Any unpaid balance greater than $0.005 represents material debt. Material debt is **never forgiven**; if the balance plus interest exceeds the scheduled payment by more than $0.005, an additional payment period is required.
   - Positive opening principal balances (even small amounts such as $0.005) represent active initial obligations and are never erased without a recorded payment.
3. **Final Payment Adjustment**:
   In loan amortization, the final payment is adjusted to settle the remaining balance and accrued interest:
   $$\text{If } B_{t-1} + I_t \le P_t + \epsilon \implies P_{t, \text{actual}} = B_{t-1} + I_t, \quad C_{t} = B_{t-1}, \quad B_t = 0$$
   This ensures:
   - The final actual payment may exceed the scheduled regular payment by at most the documented tolerance $\epsilon = 0.005$ (for example, paying $1,000.004 on a $1,000 scheduled payment), and is otherwise smaller than or equal to the regular payment.
   - The ending balance reaches exactly $0.
   - Total principal paid across all schedule rows equals the initial principal $L$ exactly (principal conservation).
   - The headline payoff month count exactly equals the count of schedule rows.

---

## 5. Shared Settlement Rule Across Modules

To eliminate contradictory derivations between headline metrics (`src/lib/seoCalculators.ts`) and schedule tables (`src/lib/calculatorStudios.ts`), both modules share the unified termination rule:

```typescript
export const LOAN_RESIDUAL_TOLERANCE = 0.005; // 0.5 cents
```

1. **In `payoffDebt()`**:
   The loop continues while `currentBalance > LOAN_RESIDUAL_TOLERANCE`.
   When `currentBalance + monthlyInterest <= scheduledPayment + LOAN_RESIDUAL_TOLERANCE`, the final payment satisfies `currentBalance + monthlyInterest`, `currentBalance` becomes `0`, and the loop terminates.
2. **In `stepAmortizingBalance()` / `amortizationRows()`**:
   When `balance + interest <= payment + LOAN_RESIDUAL_TOLERANCE`, `payment` is adjusted to `balance + interest`, `principalPaid` is `balance`, `balance` becomes `0`, and the row is tagged with `note: 'Final payment'`.

---

## 6. Saved-Result Compatibility & Rollback Plan

- **Saved Result Compatibility**:
  FinPath saves user input values (`principal`, `rate`, `years`, `extraMonthlyPayment`, `extraAnnualPayment`) and serialized output metrics. Recalculating with the reconciled termination rule fixes the headline payoff months to match the schedule without corrupting saved data.
- **Rollback Procedure**:
  If unintended side effects occur in other loan families, revert the unified tolerance commit. Because calculation is deterministic and purely in-memory, no database migration or state reset is needed.
