import { renderToStaticMarkup } from 'react-dom/server';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import App, { LandingPage, AuthGate } from '../src/App';
import { CalculatorLibrary } from '../src/CalculatorLibrary';
import type { AuthState } from '../src/auth';

// Standard Clerk and matchMedia mocks for deterministic SSR rendering
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: () => ({
      matches: false,
      media: '',
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false
    })
  });
}

const signedOutAuth: AuthState = {
  provider: 'clerk',
  status: 'signed-out',
  isConfigured: true,
  isSignedIn: false,
  getToken: async () => null,
  user: null
};

export function normalizeHtml(rawHtml: string): string {
  // Documented normalization for deterministic comparison:
  // 1. Normalize line endings to LF
  // 2. Trim trailing whitespace on lines
  // (Note: no volatile dates or IDs detected in static SSR, preserving full structure)
  return rawHtml
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+$/gm, '')
    .trim();
}

export function computeSha256(content: string): string {
  return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

export interface RouteCaptureResult {
  path: string;
  mode: 'app-routed' | 'component-only';
  component?: string;
  sha256: string;
  length: number;
  html: string;
  landmarks: Record<string, boolean>;
}

export function captureAllRoutes(): {
  routes: Record<string, RouteCaptureResult>;
  componentOnly: Record<string, RouteCaptureResult>;
} {
  const routes: Record<string, RouteCaptureResult> = {};
  const componentOnly: Record<string, RouteCaptureResult> = {};

  // 1. Landing Page route /
  window.history.replaceState({}, '', '/');
  const landingRaw = renderToStaticMarkup(<App auth={signedOutAuth} />);
  const landingNorm = normalizeHtml(landingRaw);
  routes['/'] = {
    path: '/',
    mode: 'app-routed',
    sha256: computeSha256(landingNorm),
    length: landingNorm.length,
    html: landingNorm,
    landmarks: {
      hasBrand: landingNorm.includes('FinPath'),
      hasTitle: landingNorm.includes('Plan your financial future'),
      hasRetireSubtitle: landingNorm.includes('See when you could retire.'),
      hasHero: landingNorm.includes('landing-hero'),
      hasWorkspaceNav: landingNorm.includes('Workspace')
    }
  };

  // 2. FIRE Calculator route /calculators/fire
  window.history.replaceState({}, '', '/calculators/fire');
  const fireRaw = renderToStaticMarkup(<App auth={signedOutAuth} />);
  const fireNorm = normalizeHtml(fireRaw);
  routes['/calculators/fire'] = {
    path: '/calculators/fire',
    mode: 'app-routed',
    sha256: computeSha256(fireNorm),
    length: fireNorm.length,
    html: fireNorm,
    landmarks: {
      hasBrand: fireNorm.includes('FinPath'),
      hasFireTitle: fireNorm.includes('FIRE Calculator'),
      hasPlanningQuestion: fireNorm.includes('Planning question'),
      hasCurrentAge: fireNorm.includes('Current age'),
      hasRetirementAge: fireNorm.includes('Retirement age'),
      hasCalculateButton: fireNorm.includes('Calculate')
    }
  };

  // 3. Calculator detail route /calculators/mortgage (App-routed shell)
  window.history.replaceState({}, '', '/calculators/mortgage');
  const mortgageRaw = renderToStaticMarkup(<App auth={signedOutAuth} />);
  const mortgageNorm = normalizeHtml(mortgageRaw);
  routes['/calculators/mortgage'] = {
    path: '/calculators/mortgage',
    mode: 'app-routed',
    sha256: computeSha256(mortgageNorm),
    length: mortgageNorm.length,
    html: mortgageNorm,
    landmarks: {
      hasBrand: mortgageNorm.includes('FinPath'),
      hasSuspenseShell: mortgageNorm.includes('Calculator library loading'),
      hasLoadingText: mortgageNorm.includes('Loading calculator library...')
    }
  };

  // 4. Signed-out /dashboard (App-routed shell with AuthGate)
  window.history.replaceState({}, '', '/dashboard');
  const dashboardRaw = renderToStaticMarkup(<App auth={signedOutAuth} />);
  const dashboardNorm = normalizeHtml(dashboardRaw);
  routes['/dashboard'] = {
    path: '/dashboard',
    mode: 'app-routed',
    sha256: computeSha256(dashboardNorm),
    length: dashboardNorm.length,
    html: dashboardNorm,
    landmarks: {
      hasBrand: dashboardNorm.includes('FinPath'),
      hasSignInPrompt: dashboardNorm.includes('Sign in to open Dashboard.'),
      hasShellDescription: dashboardNorm.includes('Dashboard is part of the account-backed planning shell.'),
      hasBrowseCalculators: dashboardNorm.includes('Browse calculators')
    }
  };

  // Component-only capture for CalculatorLibrary at /calculators/mortgage
  const mortgageComponentRaw = renderToStaticMarkup(
    <CalculatorLibrary
      auth={signedOutAuth}
      route="/calculators/mortgage"
      onNavigate={() => {}}
      onSaveResult={async () => ({ destinationRoute: '/plans', message: '', savedResultId: '1' })}
      savedResults={[]}
    />
  );
  const mortgageComponentNorm = normalizeHtml(mortgageComponentRaw);
  componentOnly['/calculators/mortgage'] = {
    path: '/calculators/mortgage',
    mode: 'component-only',
    component: 'CalculatorLibrary',
    sha256: computeSha256(mortgageComponentNorm),
    length: mortgageComponentNorm.length,
    html: mortgageComponentNorm,
    landmarks: {
      hasMortgageTitle: mortgageComponentNorm.includes('Mortgage Payment Calculator'),
      hasLoanAmount: mortgageComponentNorm.includes('Loan amount'),
      hasInterestRate: mortgageComponentNorm.includes('Interest rate'),
      hasMonthlyPayment: mortgageComponentNorm.includes('Monthly payment'),
      hasTotalInterest: mortgageComponentNorm.includes('Total interest')
    }
  };

  return { routes, componentOnly };
}
