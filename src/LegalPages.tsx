import type { MouseEvent as ReactMouseEvent } from 'react';
import { ArrowLeft } from 'lucide-react';
import { handleNavigationAnchorClick, type AppRoute } from './lib/navigation';
import { feedbackUrl } from './lib/routeMetadata';

type LegalPageProps = {
  onNavigate: (route: AppRoute) => void;
};

export function PrivacyPolicyPage({ onNavigate }: LegalPageProps) {
  const link = (route: AppRoute) => (event: ReactMouseEvent<HTMLAnchorElement>) =>
    handleNavigationAnchorClick(event, route, onNavigate);

  return (
    <section className="route-shell legal-document" aria-labelledby="privacy-policy-title">
      <div className="route-heading">
        <a href="/calculators" className="legal-back-link" onClick={link('/calculators')}>
          <ArrowLeft size={16} strokeWidth={1.5} aria-hidden="true" />
          Back to calculators
        </a>
        <p className="eyebrow">Privacy and data control</p>
        <h1 id="privacy-policy-title">Privacy policy</h1>
        <p className="legal-updated">Last updated: November 22, 2026</p>
      </div>

      <article className="panel legal-card">
        <section className="legal-section" aria-labelledby="privacy-public-heading">
          <h2 id="privacy-public-heading">Public calculators stay in your browser</h2>
          <p>
            Every public calculator on FinPath runs directly in your browser without an account. Numbers you type into
            public calculators are saved only in browser <code>localStorage</code> on your device so your work is not
            lost on reload. FinPath servers do not receive your public calculator inputs unless you create an account
            and explicitly click save.
          </p>
        </section>

        <section className="legal-section" aria-labelledby="privacy-account-heading">
          <h2 id="privacy-account-heading">Optional signed-in workspace</h2>
          <p>
            If you choose to create an account, FinPath uses Clerk to authenticate your session and Cloudflare D1 to
            store your private, identity-scoped planning records: financial accounts, balance snapshots, transactions,
            goals, saved calculator snapshots, and versioned FIRE plans. Your records are isolated to your account and
            are never sold or shared with advertisers.
          </p>
        </section>

        <section className="legal-section" aria-labelledby="privacy-analytics-heading">
          <h2 id="privacy-analytics-heading">No ads and optional privacy-first analytics</h2>
          <p>
            FinPath displays no third-party advertising and uses no cross-site ad trackers. Optional product analytics
            for signed-in accounts is turned off by default and only records high-level feature usage if you opt in.
            Financial amounts, balances, and personal notes are never sent to analytics.
          </p>
        </section>

        <section className="legal-section" aria-labelledby="privacy-rights-heading">
          <h2 id="privacy-rights-heading">Export and permanent deletion</h2>
          <p>
            Your saved data belongs to you. From your account settings you can download a complete copy of your records
            or permanently delete all FinPath application data and your account.
          </p>
          <div className="legal-links-row">
            <a href="/settings" onClick={link('/settings')}>
              Open account privacy settings
            </a>
            <a href="/terms" onClick={link('/terms')}>
              Read terms of use
            </a>
          </div>
        </section>
      </article>
    </section>
  );
}

export function TermsOfUsePage({ onNavigate }: LegalPageProps) {
  const link = (route: AppRoute) => (event: ReactMouseEvent<HTMLAnchorElement>) =>
    handleNavigationAnchorClick(event, route, onNavigate);
  const isExternalFeedback = feedbackUrl.startsWith('https://');

  return (
    <section className="route-shell legal-document" aria-labelledby="terms-title">
      <div className="route-heading">
        <a href="/calculators" className="legal-back-link" onClick={link('/calculators')}>
          <ArrowLeft size={16} strokeWidth={1.5} aria-hidden="true" />
          Back to calculators
        </a>
        <p className="eyebrow">Terms and disclaimers</p>
        <h1 id="terms-title">Terms of use and disclaimers</h1>
        <p className="legal-updated">Last updated: November 22, 2026</p>
      </div>

      <article className="panel legal-card">
        <section className="legal-section" aria-labelledby="terms-advice-heading">
          <h2 id="terms-advice-heading">Planning estimates, not professional advice</h2>
          <p>
            FinPath provides educational financial calculators and planning tools for informational use only. Outputs
            are mathematical estimates based on the assumptions you enter and are not financial, investment, tax, or
            legal advice. Using FinPath does not create an advisor-client or fiduciary relationship.
          </p>
        </section>

        <section className="legal-section" aria-labelledby="terms-rules-heading">
          <h2 id="terms-rules-heading">Assumptions and statutory rule changes</h2>
          <p>
            Tax slabs, contribution caps, statutory rates, and lender terms in the United States and India change over
            time and depend on individual eligibility. FinPath displays the modeled assumptions and primary source links
            next to results, but you are responsible for verifying figures with primary authorities or a qualified
            professional before making financial commitments.
          </p>
        </section>

        <section className="legal-section" aria-labelledby="terms-warranty-heading">
          <h2 id="terms-warranty-heading">Availability and responsibility</h2>
          <p>
            FinPath is offered on an as-is, as-available basis without warranties of completeness, uninterrupted
            availability, or fitness for a particular decision. You agree not to abuse, scrape disruptively, or attempt
            unauthorized access to other users&apos; workspace data.
          </p>
        </section>

        <section className="legal-section" aria-labelledby="terms-contact-heading">
          <h2 id="terms-contact-heading">Privacy and feedback</h2>
          <p>
            Review how your browser drafts and optional saved workspace records are handled in the privacy policy, or
            report a calculation issue or request a calculator through our public feedback tracker.
          </p>
          <div className="legal-links-row">
            <a href="/privacy" onClick={link('/privacy')}>
              Read privacy policy
            </a>
            <a
              href={feedbackUrl}
              target={isExternalFeedback ? '_blank' : undefined}
              rel={isExternalFeedback ? 'noopener noreferrer' : undefined}
            >
              Send feedback
            </a>
          </div>
        </section>
      </article>
    </section>
  );
}
