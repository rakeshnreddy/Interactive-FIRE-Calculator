import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import App, { LandingPage, AuthGate } from './App';
import { CalculatorLibrary } from './CalculatorLibrary';
import type { AuthState } from './auth';

vi.mock('@clerk/react', () => ({
  SignUpButton: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SignInButton: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  UserButton: () => null,
  SignOutButton: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAuth: () => ({ getToken: vi.fn() }),
  useUser: () => ({ isLoaded: true, isSignedIn: false, user: null })
}));

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

function normalizeHtml(rawHtml: string): string {
  return rawHtml
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+$/gm, '')
    .trim();
}

function computeSha256(content: string): string {
  return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

interface BaselineFixture {
  metadata: {
    baselineCommit: string;
    capturedAt: string;
    captureScript: string;
    captureCommand: string;
    normalization: string;
  };
  routes: Record<string, {
    path: string;
    mode: string;
    sha256: string;
    length: number;
    html: string;
    landmarks: Record<string, boolean>;
  }>;
  componentOnly: Record<string, {
    path: string;
    mode: string;
    component: string;
    sha256: string;
    length: number;
    html: string;
    landmarks: Record<string, boolean>;
  }>;
}

describe('B39 App Parity Verification (Read-Only against Immutable Baseline)', () => {
  const fixturePath = path.resolve(__dirname, '../docs/execution/evidence/B39/baseline_fixture.json');

  it('loads immutable baseline fixture generated from 42780b4', () => {
    expect(fs.existsSync(fixturePath)).toBe(true);
    const fixture: BaselineFixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
    expect(fixture.metadata.baselineCommit).toBe('42780b4c5a46004e3d008bd1b6dafee6ba5bc501');
    expect(fixture.routes['/']).toBeDefined();
    expect(fixture.routes['/calculators/fire']).toBeDefined();
    expect(fixture.routes['/calculators/mortgage']).toBeDefined();
    expect(fixture.routes['/dashboard']).toBeDefined();
    expect(fixture.componentOnly['/calculators/mortgage']).toBeDefined();
  });

  it('renders route / with exact HTML hash and landmark match against baseline', () => {
    const fixture: BaselineFixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
    const baseline = fixture.routes['/'];

    window.history.replaceState({}, '', '/');
    const candidateHtml = normalizeHtml(renderToStaticMarkup(<App auth={signedOutAuth} />));
    const candidateSha = computeSha256(candidateHtml);

    // Exact byte and SHA-256 comparison
    expect(candidateSha).toBe(baseline.sha256);
    expect(candidateHtml).toBe(baseline.html);

    // Explicit landmark assertions
    expect(candidateHtml).toContain('FinPath');
    expect(candidateHtml).toContain('Plan your financial future');
    expect(candidateHtml).toContain('See when you could retire.');
    expect(candidateHtml).toContain('landing-hero');
    expect(candidateHtml).toContain('Explore all calculators');
  });

  it('renders route /calculators/fire with exact HTML hash and landmark match against baseline', () => {
    const fixture: BaselineFixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
    const baseline = fixture.routes['/calculators/fire'];

    window.history.replaceState({}, '', '/calculators/fire');
    const candidateHtml = normalizeHtml(renderToStaticMarkup(<App auth={signedOutAuth} />));
    const candidateSha = computeSha256(candidateHtml);

    expect(candidateSha).toBe(baseline.sha256);
    expect(candidateHtml).toBe(baseline.html);

    expect(candidateHtml).toContain('FinPath');
    expect(candidateHtml).toContain('FIRE Calculator');
    expect(candidateHtml).toContain('Planning question');
    expect(candidateHtml).toContain('Current age');
    expect(candidateHtml).toContain('Retirement age');
    expect(candidateHtml).toContain('Calculate');
  });

  it('renders route /calculators/mortgage App shell with exact HTML hash match against baseline', () => {
    const fixture: BaselineFixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
    const baseline = fixture.routes['/calculators/mortgage'];

    window.history.replaceState({}, '', '/calculators/mortgage');
    const candidateHtml = normalizeHtml(renderToStaticMarkup(<App auth={signedOutAuth} />));
    const candidateSha = computeSha256(candidateHtml);

    expect(candidateSha).toBe(baseline.sha256);
    expect(candidateHtml).toBe(baseline.html);

    expect(candidateHtml).toContain('FinPath');
    expect(candidateHtml).toContain('Calculator library loading');
    expect(candidateHtml).toContain('Loading calculator library...');
  });

  it('renders route /dashboard signed-out AuthGate with exact HTML hash match against baseline', () => {
    const fixture: BaselineFixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
    const baseline = fixture.routes['/dashboard'];

    window.history.replaceState({}, '', '/dashboard');
    const candidateHtml = normalizeHtml(renderToStaticMarkup(<App auth={signedOutAuth} />));
    const candidateSha = computeSha256(candidateHtml);

    expect(candidateSha).toBe(baseline.sha256);
    expect(candidateHtml).toBe(baseline.html);

    expect(candidateHtml).toContain('FinPath');
    expect(candidateHtml).toContain('Sign in to open Dashboard.');
    expect(candidateHtml).toContain('Dashboard is part of the account-backed planning shell.');
    expect(candidateHtml).toContain('Browse calculators');
  });

  it('renders component-only CalculatorLibrary for /calculators/mortgage with exact hash match', () => {
    const fixture: BaselineFixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
    const baseline = fixture.componentOnly['/calculators/mortgage'];

    const candidateHtml = normalizeHtml(
      renderToStaticMarkup(
        <CalculatorLibrary
          auth={signedOutAuth}
          route="/calculators/mortgage"
          onNavigate={() => {}}
          onSaveResult={async () => ({ destinationRoute: '/plans', message: '', savedResultId: '1' })}
          savedResults={[]}
        />
      )
    );
    const candidateSha = computeSha256(candidateHtml);

    expect(candidateSha).toBe(baseline.sha256);
    expect(candidateHtml).toBe(baseline.html);

    expect(candidateHtml).toContain('Mortgage Payment Calculator');
    expect(candidateHtml).toContain('Loan amount');
    expect(candidateHtml).toContain('Interest rate');
    expect(candidateHtml).toContain('Monthly payment');
    expect(candidateHtml).toContain('Total interest');
  });

  it('fails under a deliberate changed text/DOM fixture (negative regression test)', () => {
    const fixture: BaselineFixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
    const mutatedBaselineHtml = fixture.routes['/'].html.replace('Plan your financial future', 'MODIFIED UNEXPECTED TITLE');
    const mutatedSha = computeSha256(mutatedBaselineHtml);

    window.history.replaceState({}, '', '/');
    const candidateHtml = normalizeHtml(renderToStaticMarkup(<App auth={signedOutAuth} />));
    const candidateSha = computeSha256(candidateHtml);

    // Verify that our verification logic would strictly detect this mutation
    expect(candidateSha).not.toBe(mutatedSha);
    expect(candidateHtml).not.toBe(mutatedBaselineHtml);
  });
});
