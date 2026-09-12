import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { AuthState } from './auth';
import { LandingPage } from './App';

vi.mock('@clerk/react', () => ({
  SignUpButton: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SignInButton: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  UserButton: () => null,
  SignOutButton: ({ children }: { children: React.ReactNode }) => <>{children}</>
}));

const unconfiguredAuth: AuthState = {
  provider: 'clerk',
  status: 'not-configured',
  isConfigured: false,
  isSignedIn: false,
  missingEnv: ['VITE_CLERK_PUBLISHABLE_KEY'],
  user: null
};

const configuredSignedOutAuth: AuthState = {
  provider: 'clerk',
  status: 'signed-out',
  isConfigured: true,
  isSignedIn: false,
  getToken: async () => null,
  user: null
};

const signedInAuth: AuthState = {
  provider: 'clerk',
  status: 'signed-in',
  isConfigured: true,
  isSignedIn: true,
  getToken: async () => 'test_token',
  user: {
    id: 'user_test_123',
    displayName: 'Test User',
    email: 'test@example.com'
  }
};

describe('LandingPage (B18)', () => {
  it('renders exact copy contract in hero without obsolete copy or stock photo', () => {
    const html = renderToStaticMarkup(
      <LandingPage auth={unconfiguredAuth} onNavigate={() => {}} />
    );

    // Exact B18 copy contract
    expect(html).toContain('Plan your financial future');
    expect(html).toContain('See when you could retire.');
    expect(html).toContain(
      'See how saving more or spending less could change your retirement timeline. Try it free, without an account.'
    );

    // Obsolete copy must be absent
    expect(html).not.toContain('Make the number mean something');
    expect(html).not.toContain('Calculate first. Keep the plan moving.');
    expect(html).not.toContain('One clear thread through your financial life');
    expect(html).not.toContain('Private by account boundary');

    // Phone/card photo must be completely removed
    expect(html).not.toContain('finpath-product-hero.jpg');
    expect(html).not.toContain('A mobile financial planning dashboard beside a cobalt card');
  });

  it('renders primary public action to /calculators/fire and secondary to /calculators', () => {
    const html = renderToStaticMarkup(
      <LandingPage auth={unconfiguredAuth} onNavigate={() => {}} />
    );

    // Primary action
    expect(html).toContain('href="/calculators/fire"');
    expect(html).toContain('Explore my retirement timeline');

    // Secondary link
    expect(html).toContain('href="/calculators"');
    expect(html).toContain('Explore all calculators');

    // Popular starts links
    expect(html).toContain('Popular starts');
    expect(html).toContain('href="/calculators/mortgage"');
    expect(html).toContain('href="/calculators/debt-payoff"');
    expect(html).toContain('href="/calculators/compound-interest"');
  });

  it('renders the three-step sequence and three useful calculator paths', () => {
    const html = renderToStaticMarkup(
      <LandingPage auth={unconfiguredAuth} onNavigate={() => {}} />
    );

    // Lower section heading
    expect(html).toContain('Start with a question. Leave with a clearer plan.');

    // 3 steps
    expect(html).toContain('Add your numbers');
    expect(html).toContain('Start with your savings and spending.');
    expect(html).toContain('Try different assumptions');
    expect(html).toContain('Explore how changes affect the estimate.');
    expect(html).toContain('Review the results');
    expect(html).toContain('See the timeline and the assumptions behind it.');

    // 3 paths
    expect(html).toContain('Buying a home?');
    expect(html).toContain('Growing your savings?');
    expect(html).toContain('Long-term independence?');
  });

  it('handles auth availability truthfully across states', () => {
    // 1. When unconfigured: suppress account creation promotion
    const unconfiguredHtml = renderToStaticMarkup(
      <LandingPage auth={unconfiguredAuth} onNavigate={() => {}} />
    );
    expect(unconfiguredHtml).toContain('Start without an account.');
    expect(unconfiguredHtml).toContain(
      'Use the public calculators before deciding whether to create an account.'
    );
    expect(unconfiguredHtml).not.toContain('Create free account');

    // 2. When configured & signed out: quiet account option available
    const configuredHtml = renderToStaticMarkup(
      <LandingPage auth={configuredSignedOutAuth} onNavigate={() => {}} />
    );
    expect(configuredHtml).toContain('Create account');

    // 3. When signed in: open dashboard option available
    const signedInHtml = renderToStaticMarkup(
      <LandingPage auth={signedInAuth} onNavigate={() => {}} />
    );
    expect(signedInHtml).toContain('Open dashboard');
    expect(signedInHtml).toContain('href="/dashboard"');
  });
});
