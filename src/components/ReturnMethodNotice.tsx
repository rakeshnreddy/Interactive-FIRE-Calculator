/** This link chooses a method only; it never transfers financial inputs. */
export function ReturnMethodNotice() {
  return <aside className="return-method-notice" aria-label="Choose a return method">
    <strong>Made deposits or withdrawals?</strong>
    <p>This calculation assumes no deposits or withdrawals in between.</p>
    <a href="/calculators/xirr?returnMode=dated">Use dated cash flows <span aria-hidden="true">→</span></a>
  </aside>;
}
