import { BarChart3 } from 'lucide-react';

// Optional product analytics (B12): off by default, plain description, instant withdrawal.
export function AnalyticsConsentPanel({
  granted,
  isSaving,
  message,
  onChange
}: {
  granted: boolean | null;
  isSaving: boolean;
  message: string;
  onChange: (granted: boolean) => void;
}) {
  return (
    <section className="profile-editor analytics-consent-panel" aria-labelledby="analytics-consent-title">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Optional</p>
          <h2 id="analytics-consent-title">Help improve FinPath</h2>
          <p>
            If you turn this on, FinPath records which calculators and features you use and whether saves and monthly reviews
            complete. It never records amounts, rates, notes, names or other free text, and it uses a random ID instead of your
            account. Records are kept for up to 90 days. Everything works the same if you leave this off.
          </p>
        </div>
        <span className="feature-icon">
          <BarChart3 size={20} aria-hidden="true" />
        </span>
      </div>
      <label className="analytics-toggle">
        <input
          type="checkbox"
          checked={granted === true}
          disabled={granted === null || isSaving}
          onChange={(event) => onChange(event.target.checked)}
        />
        <span>{granted ? 'Product analytics is on' : 'Product analytics is off'}</span>
      </label>
      <small>Turning it off stops collection immediately and deletes what was collected.</small>
      {message ? <p className="profile-status" role="status">{message}</p> : null}
    </section>
  );
}
