import type { MouseEvent as ReactMouseEvent } from 'react';
import { ArrowRight, Calculator, CircleDollarSign, Search, ShieldCheck, Target, TrendingUp } from 'lucide-react';
import type { AuthState } from './auth';
import { AuthActionButton } from './AuthActionButton';
import { HeroFireExample } from './HeroFireExample';
import { handleNavigationAnchorClick, type AppRoute } from './lib/navigation';
import { landingFaq, landingHero, landingTrustPoints } from './lib/landingContent';

export const landingSteps = [
  {
    step: '1',
    title: 'Add your numbers',
    body: 'Start with your savings and spending.',
    icon: Calculator
  },
  {
    step: '2',
    title: 'Try different assumptions',
    body: 'Explore how changes affect the estimate.',
    icon: TrendingUp
  },
  {
    step: '3',
    title: 'Review the results',
    body: 'See the timeline and the assumptions behind it.',
    icon: Target
  }
];

export const usefulCalculatorPaths = [
  { title: 'When could I retire?', action: 'Plan retirement', body: 'Test your spending, savings and timeline.', route: '/calculators/fire' as AppRoute, icon: Target },
  { title: 'How soon can I be debt-free?', action: 'Pay down debt', body: 'See what paying a little extra changes.', route: '/calculators/debt-payoff' as AppRoute, icon: CircleDollarSign },
  { title: 'What should I save each month?', action: 'Reach a savings goal', body: 'Turn an amount and a deadline into a plan.', route: '/calculators/savings-goal' as AppRoute, icon: TrendingUp }
];

export function LandingPage({ auth, onNavigate }: { auth: AuthState; onNavigate: (route: AppRoute | string) => void }) {
  const link = (route: AppRoute | string) => (event: ReactMouseEvent<HTMLAnchorElement>) => handleNavigationAnchorClick(event, route as AppRoute, onNavigate);
  return (
    <div className="home-page">
      <section className="landing-hero" aria-labelledby="landing-title">
        <div className="landing-hero-inner">
          <div className="landing-hero-copy">
            <p className="eyebrow">{landingHero.eyebrow}</p>
            <h1 id="landing-title">{landingHero.title}</h1>
            <p>{landingHero.body}</p>
            <div className="landing-actions">
              <a href="/calculators/fire" className="primary-button icon-text-button" onClick={link('/calculators/fire')}>
                <Target size={16} />
                {landingHero.primaryAction}
              </a>
              <a href="/calculators" className="secondary-button icon-text-button" onClick={link('/calculators')}>
                <Calculator size={16} />
                {landingHero.secondaryAction}
              </a>
            </div>

          </div>

          <div className="landing-discovery">
          <form className="landing-finder" role="search" aria-label="Find a financial calculator" action="/calculators" method="get" onSubmit={(event) => {
            event.preventDefault();
            const query = String(new FormData(event.currentTarget).get('q') ?? '').trim();
            onNavigate(query ? `/calculators?${new URLSearchParams({ q: query })}` : '/calculators');
          }}>
            <label htmlFor="home-question">What are you trying to work out?</label>
            <div className="landing-finder-field">
              <Search size={20} aria-hidden="true" />
              <input id="home-question" type="search" name="q" placeholder="Try mortgage, PPF or retirement" maxLength={120} aria-describedby="home-question-help" />
              <button type="submit" className="primary-button">Find a calculator <ArrowRight size={18} aria-hidden="true" /></button>
            </div>
            <p id="home-question-help">Search by topic. Use your own numbers in the calculator.</p>
          </form>
          <nav className="landing-decision-paths" aria-label="Choose a planning path">
            <p className="landing-path-caption">Or start with one of these questions</p>
            {usefulCalculatorPaths.map((pathItem) => {
              const Icon = pathItem.icon;
              return <a key={pathItem.route} href={pathItem.route} onClick={link(pathItem.route)}>
                <Icon size={20} aria-hidden="true" />
                <span><strong>{pathItem.action}</strong><small>{pathItem.title}</small></span>
                <ArrowRight size={16} aria-hidden="true" />
              </a>;
            })}
          </nav>
          </div>
          <HeroFireExample />
        </div>
      </section>

      <section className="landing-capabilities" aria-labelledby="capabilities-title">
        <header>
          <p className="eyebrow">How it works</p>
          <h2 id="capabilities-title">Start with a question. Leave with a clearer plan.</h2>
          <p>Calculate with your numbers. Compare a change. Save the decision when you want to revisit it.</p>
        </header>

        <div className="landing-feature-list">
          {landingSteps.map((stepItem) => {
            return (
              <article className="landing-feature" key={stepItem.title}>
                <span className="landing-step-number" aria-hidden="true">{stepItem.step}</span>
                <div>
                  <strong>{stepItem.title}</strong>
                  <small>{stepItem.body}</small>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="landing-trust" aria-labelledby="trust-title">
        <header>
          <p className="eyebrow">Why FinPath</p>
          <h2 id="trust-title">Honest math, in your currency.</h2>
        </header>
        <div className="landing-trust-grid">
          {landingTrustPoints.map((point) => (
            <article key={point.title}>
              <strong>{point.title}</strong>
              <p>{point.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-faq" id="faq" aria-labelledby="faq-title">
        <header>
          <p className="eyebrow">Common questions</p>
          <h2 id="faq-title">Questions people ask before they start</h2>
        </header>
        <div className="landing-faq-list">
          {landingFaq.map((item, index) => (
            <details key={item.question} open={index === 0}>
              <summary>{item.question}</summary>
              <p>{item.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="privacy-band" aria-labelledby="privacy-title">
        <ShieldCheck size={24} />
        <div>
          <h2 id="privacy-title">Start without an account.</h2>
          <p>
            Use the public calculators before deciding whether to create an account.
          </p>
        </div>
        {auth.isConfigured && (
          auth.isSignedIn ? (
            <a href="/dashboard" className="secondary-button icon-text-button" onClick={link('/dashboard')}>
              Open dashboard
              <ArrowRight size={17} />
            </a>
          ) : (
            <AuthActionButton
              auth={auth}
              kind="sign-up"
              className="secondary-button icon-text-button"
              onUnavailable={() => onNavigate('/dashboard')}
            >
              Create account
              <ArrowRight size={17} />
            </AuthActionButton>
          )
        )}
      </section>
    </div>
  );
}

