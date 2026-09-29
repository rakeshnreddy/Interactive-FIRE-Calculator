import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { CalculatorLibrary } from './CalculatorLibrary';
import { seoCalculators, calculatorPath } from './lib/seoCalculators';
import type { AuthState } from './auth';

vi.mock('@clerk/react', () => ({
  SignUpButton: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SignInButton: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  UserButton: () => null,
  SignOutButton: ({ children }: { children: React.ReactNode }) => <>{children}</>
}));

const mockAuth: AuthState = {
  provider: 'clerk',
  status: 'not-configured',
  isConfigured: false,
  isSignedIn: false,
  missingEnv: ['VITE_CLERK_PUBLISHABLE_KEY'],
  user: null
};

const mockSaveResult = async () => ({
  destinationRoute: '/plans' as const,
  message: '',
  savedResultId: '1'
});

describe('CalculatorLibrary Discovery & Search (B19)', () => {
  it('renders question-led starting paths including FIRE, Mortgage, Compound Interest, and Debt Payoff', () => {
    const html = renderToStaticMarkup(
      <CalculatorLibrary
        auth={mockAuth}
        route="/calculators"
        onNavigate={() => {}}
        onSaveResult={mockSaveResult}
        savedResults={[]}
      />
    );

    // Question-led starting paths section
    expect(html).toContain('Starting paths');
    expect(html).toContain('href="/calculators/fire"');
    expect(html).toContain('href="/calculators/mortgage"');
    expect(html).toContain('href="/calculators/compound-interest"');
    expect(html).toContain('href="/calculators/debt-payoff"');

    // Must be descriptive question-led titles
    expect(html).toContain('Planning for retirement?');
    expect(html).toContain('Buying a home?');
    expect(html).toContain('Growing your savings?');
    expect(html).toContain('Paying off debt?');
  });

  it('removes repetitive "Also useful" badge decoration from toolkit panels', () => {
    const html = renderToStaticMarkup(
      <CalculatorLibrary
        auth={mockAuth}
        route="/calculators"
        onNavigate={() => {}}
        onSaveResult={mockSaveResult}
        savedResults={[]}
      />
    );

    // Must NOT contain repeated "Also useful" pills
    expect(html).not.toContain('Also useful');
  });

  it('renders all 8 toolkits with secondary tool counts', () => {
    const html = renderToStaticMarkup(
      <CalculatorLibrary
        auth={mockAuth}
        route="/calculators"
        onNavigate={() => {}}
        onSaveResult={mockSaveResult}
        savedResults={[]}
      />
    );

    // 8 toolkit titles
    expect(html).toContain('Financial Checkup');
    expect(html).toContain('Savings &amp; Goals');
    expect(html).toContain('Investment Returns');
    expect(html).toContain('Debt Payoff');
    expect(html).toContain('Loans &amp; Payments');
    expect(html).toContain('Home Buying &amp; Mortgage');
    expect(html).toContain('Income &amp; Tax');
    expect(html).toContain('Retirement Planning');
  });

  it('preserves reachability of all 82 SEO calculators plus FIRE via native anchor links', () => {
    const html = renderToStaticMarkup(
      <CalculatorLibrary
        auth={mockAuth}
        route="/calculators"
        onNavigate={() => {}}
        onSaveResult={mockSaveResult}
        savedResults={[]}
      />
    );

    // FIRE reachable
    expect(html).toContain('href="/calculators/fire"');

    // Every SEO calculator must be reachable in either featured links or progressive disclosure details
    for (const calc of seoCalculators) {
      const path = calculatorPath(calc.slug);
      expect(html).toContain(`href="${path}"`);
    }
  });

  it('surfaces the interactive FIRE calculator when searching for "FIRE"', () => {
    window.history.replaceState({}, '', '/calculators?q=fire');

    try {
      const html = renderToStaticMarkup(
        <CalculatorLibrary
          auth={mockAuth}
          route="/calculators"
          onNavigate={() => {}}
          onSaveResult={mockSaveResult}
          savedResults={[]}
        />
      );

      expect(html).toContain('href="/calculators/fire"');
      expect(html).toContain('Interactive FIRE Calculator');
    } finally {
      window.history.replaceState({}, '', '/calculators');
    }
  });

  it('handles search queries with mixed case and leading/trailing whitespace', () => {
    window.history.replaceState({}, '', '/calculators?q=%20%20MORTGAGE%20%20');

    try {
      const html = renderToStaticMarkup(
        <CalculatorLibrary
          auth={mockAuth}
          route="/calculators"
          onNavigate={() => {}}
          onSaveResult={mockSaveResult}
          savedResults={[]}
        />
      );

      expect(html).toContain('href="/calculators/mortgage"');
      expect(html).toContain('Mortgage Payment Calculator');
    } finally {
      window.history.replaceState({}, '', '/calculators');
    }
  });

  it('displays helpful empty state with suggestions when query yields no matches', () => {
    window.history.replaceState({}, '', '/calculators?q=xyznonexistent12345');

    try {
      const html = renderToStaticMarkup(
        <CalculatorLibrary
          auth={mockAuth}
          route="/calculators"
          onNavigate={() => {}}
          onSaveResult={mockSaveResult}
          savedResults={[]}
        />
      );

      expect(html).toContain('No calculator matches that phrase');
      expect(html).toContain('Try a decision such as buying a home, paying off debt, saving for retirement, or estimating tax.');
    } finally {
      window.history.replaceState({}, '', '/calculators');
    }
  });
});
