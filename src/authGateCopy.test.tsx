import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { AuthState } from './auth';
import { AuthGate } from './App';

vi.mock('@clerk/react', () => ({
  ClerkProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SignInButton: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SignOutButton: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SignUpButton: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  UserButton: () => <button>User Profile</button>,
  useAuth: () => ({ getToken: vi.fn() }),
  useUser: () => ({ isLoaded: true, isSignedIn: false, user: null })
}));

const unconfiguredAuth: AuthState = {
  provider: 'clerk',
  status: 'not-configured',
  isConfigured: false,
  isSignedIn: false,
  missingEnv: ['VITE_CLERK_PUBLISHABLE_KEY'],
  user: null
};

const loadingAuth: AuthState = {
  provider: 'clerk',
  status: 'loading',
  isConfigured: true,
  isSignedIn: false,
  getToken: async () => null,
  user: null
};

const signedOutAuth: AuthState = {
  provider: 'clerk',
  status: 'signed-out',
  isConfigured: true,
  isSignedIn: false,
  getToken: async () => null,
  user: null
};

describe('AuthGate copy, privacy, and public navigation (B09)', () => {
  it('unconfigured state displays honest unavailable copy, zero environment variables, and working public route', () => {
    const html = renderToStaticMarkup(
      <AuthGate auth={unconfiguredAuth} route="/dashboard" onNavigate={() => {}} />
    );

    // Must NOT leak setup internals, provider names, or env vars
    expect(html).not.toContain('Connect Clerk');
    expect(html).not.toContain('VITE_CLERK_PUBLISHABLE_KEY');
    expect(html).not.toContain('CLERK_SECRET_KEY');
    expect(html).not.toContain('CLERK_PUBLISHABLE_KEY');
    expect(html).not.toContain('CLERK_AUTHORIZED_PARTIES');
    expect(html).not.toContain('auth-env-list');

    // Must display honest explanation of unavailable account features
    expect(html).toContain('Account features are currently unavailable.');
    expect(html).toContain(
      'Saved plans, accounts, and cross-device sync require account services that are not active in this preview. You can use all interactive financial calculators without an account.'
    );

    // Must provide working public navigation and honest unavailable account action
    expect(html).toContain('Explore public calculators');
    expect(html).toContain('Account features unavailable');
    expect(html).toContain('disabled=""');
  });

  it('loading state displays neutral session checking copy without vendor plumbing leaks', () => {
    const html = renderToStaticMarkup(
      <AuthGate auth={loadingAuth} route="/dashboard" onNavigate={() => {}} />
    );

    expect(html).toContain('Checking your session.');
    expect(html).not.toContain('Clerk session');
    expect(html).toContain('FinPath is confirming whether there is an active session for this browser.');
    expect(html).toContain('Checking session');
    expect(html).toContain('Browse calculators');
  });

  it('signed-out state provides clean sign-in invitation and public calculator route', () => {
    const html = renderToStaticMarkup(
      <AuthGate auth={signedOutAuth} route="/dashboard" onNavigate={() => {}} />
    );

    expect(html).toContain('Sign in to open Dashboard.');
    expect(html).toContain('Sign in');
    expect(html).toContain('Create account');
    expect(html).toContain('Browse calculators');
  });

  it('preserves fail-closed auth guards across all platform routes', () => {
    const protectedRoutes = ['/dashboard', '/accounts', '/transactions', '/goals', '/plans', '/reports', '/settings'] as const;

    for (const route of protectedRoutes) {
      const html = renderToStaticMarkup(
        <AuthGate auth={unconfiguredAuth} route={route} onNavigate={() => {}} />
      );

      // Must render unconfigured auth gate, never account or transaction content
      expect(html).toContain('Account features are currently unavailable.');
      expect(html).not.toContain('Download JSON export');
      expect(html).not.toContain('Record balance');
    }
  });

  it('exercises onNavigate callbacks for public calculator escape in all auth states', () => {
    function findButton(node: any, textMatch: string): any {
      if (!node) return null;
      if (node.type === 'button') {
        const text = JSON.stringify(node.props?.children);
        if (text && text.includes(textMatch)) return node;
      }
      const children = node.props?.children;
      if (Array.isArray(children)) {
        for (const child of children) {
          const found = findButton(child, textMatch);
          if (found) return found;
        }
      } else if (children && typeof children === 'object') {
        return findButton(children, textMatch);
      }
      return null;
    }

    // 1. Unconfigured state: clicking Explore public calculators calls onNavigate('/calculators')
    const onNavigateUnconfigured = vi.fn();
    const treeUnconfigured = AuthGate({ auth: unconfiguredAuth, route: '/dashboard', onNavigate: onNavigateUnconfigured });
    const exploreBtn = findButton(treeUnconfigured, 'Explore public calculators');
    expect(exploreBtn).not.toBeNull();
    exploreBtn.props.onClick();
    expect(onNavigateUnconfigured).toHaveBeenCalledWith('/calculators');

    // 2. Loading state: clicking Browse calculators calls onNavigate('/calculators')
    const onNavigateLoading = vi.fn();
    const treeLoading = AuthGate({ auth: loadingAuth, route: '/dashboard', onNavigate: onNavigateLoading });
    const browseLoadingBtn = findButton(treeLoading, 'Browse calculators');
    expect(browseLoadingBtn).not.toBeNull();
    browseLoadingBtn.props.onClick();
    expect(onNavigateLoading).toHaveBeenCalledWith('/calculators');

    // 3. Signed-out state: clicking Browse calculators calls onNavigate('/calculators')
    const onNavigateSignedOut = vi.fn();
    const treeSignedOut = AuthGate({ auth: signedOutAuth, route: '/dashboard', onNavigate: onNavigateSignedOut });
    const browseSignedOutBtn = findButton(treeSignedOut, 'Browse calculators');
    expect(browseSignedOutBtn).not.toBeNull();
    browseSignedOutBtn.props.onClick();
    expect(onNavigateSignedOut).toHaveBeenCalledWith('/calculators');
  });
});
