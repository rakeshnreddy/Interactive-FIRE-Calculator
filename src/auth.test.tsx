// @vitest-environment jsdom
import { act, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthProviderBoundary, type AuthState } from './auth';

// A signed-in Clerk stub: the module is imported lazily by the boundary.
vi.mock('@clerk/react', () => {
  const instance = { loaded: true, mountUserButton: () => {}, unmountUserButton: () => {}, signOut: async () => {}, openSignUp: () => {}, openSignIn: () => {}, redirectToSignIn: async () => {}, redirectToSignUp: async () => {} };
  const user = { id: 'user_1', fullName: 'Ada', primaryEmailAddress: { emailAddress: 'ada@example.com' } };
  return {
    ClerkProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    useAuth: () => ({ getToken: async () => 'token' }),
    useUser: () => ({ isLoaded: true, isSignedIn: true, user }),
    useClerk: () => instance
  };
});

// The boundary reads the key at module load, so stub it before the import graph evaluates.
vi.hoisted(() => vi.stubEnv('VITE_CLERK_PUBLISHABLE_KEY', 'pk_test_stub'));

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const mounts: number[] = [];
const seen: AuthState['status'][] = [];

function Probe({ auth }: { auth: AuthState }) {
  const id = useRef(Math.random());
  useEffect(() => {
    mounts.push(id.current);
  }, []);
  seen.push(auth.status);
  return <input data-testid="draft" defaultValue="" />;
}

afterEach(() => {
  document.body.innerHTML = '';
  mounts.length = 0;
  seen.length = 0;
});

describe('AuthProviderBoundary (B38 lazy Clerk)', () => {
  it('keeps the app mounted and its inputs intact while Clerk loads after a signed-in hint', async () => {
    Object.defineProperty(document, 'cookie', { configurable: true, value: '__client_uat=1727300000' });
    const container = document.createElement('div');
    document.body.appendChild(container);
    await act(async () => {
      createRoot(container).render(<AuthProviderBoundary>{(auth) => <Probe auth={auth} />}</AuthProviderBoundary>);
    });
    const input = container.querySelector<HTMLInputElement>('[data-testid="draft"]')!;
    input.value = 'typed before Clerk arrived';
    expect(seen[0]).toBe('loading');
    // Let the dynamic import resolve and the bridge report the session.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
    expect(seen.at(-1)).toBe('signed-in');
    expect(new Set(mounts).size).toBe(1);
    expect(container.querySelector<HTMLInputElement>('[data-testid="draft"]')).toBe(input);
    expect(input.value).toBe('typed before Clerk arrived');
  });
});
