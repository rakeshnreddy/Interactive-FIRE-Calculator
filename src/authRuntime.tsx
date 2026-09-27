import { cloneElement, createContext, useContext, useEffect, useRef, type MouseEvent, type ReactElement } from 'react';

// Clerk is loaded on demand (B38) so public pages never download it, and the app tree is never
// wrapped by ClerkProvider, so loading Clerk later never remounts the app or loses a visitor's
// inputs. Auth controls call the Clerk instance directly; until it exists they request it.
export type ClerkModule = typeof import('@clerk/react');
export type ClerkInstance = ReturnType<ClerkModule['useClerk']>;
export type AuthIntent = 'sign-in' | 'sign-up';

export type AuthRuntime = {
  clerk: ClerkModule | null;
  instance: ClerkInstance | null;
  requestAuth: (intent: AuthIntent) => void;
};

export const AuthRuntimeContext = createContext<AuthRuntime>({ clerk: null, instance: null, requestAuth: () => {} });

export const useAuthRuntime = () => useContext(AuthRuntimeContext);

const WORKSPACE_PREFIXES = ['/dashboard', '/accounts', '/transactions', '/goals', '/plans', '/reports', '/settings'];

// Load Clerk immediately only when it is needed to render the page correctly.
export function shouldLoadClerkOnStart(location: { pathname: string; search: string }, cookie: string): 'now-signed-in-hint' | 'now' | 'on-intent' {
  if (/(?:^|;\s*)__client_uat(?:_[A-Za-z0-9-]+)?=[1-9]\d*/.test(cookie)) return 'now-signed-in-hint';
  if (/[?&]__clerk_[a-z_]+=/.test(location.search)) return 'now';
  if (WORKSPACE_PREFIXES.some((prefix) => location.pathname === prefix || location.pathname.startsWith(`${prefix}/`))) return 'now';
  return 'on-intent';
}

export function startAuthIntent(instance: ClerkInstance, intent: AuthIntent, mode: 'modal' | 'redirect'): void {
  if (intent === 'sign-in') {
    if (mode === 'modal') instance.openSignIn({ fallbackRedirectUrl: '/dashboard' });
    else void instance.redirectToSignIn({ signInFallbackRedirectUrl: '/dashboard' });
    return;
  }
  if (mode === 'modal') instance.openSignUp({ fallbackRedirectUrl: '/dashboard' });
  else void instance.redirectToSignUp({ signUpFallbackRedirectUrl: '/dashboard' });
}

type ChildButton = ReactElement<{ onClick?: (event: MouseEvent<HTMLElement>) => void }>;

function IntentWrapper({ intent, mode, children }: { intent: AuthIntent; mode: 'modal' | 'redirect'; children: ChildButton }) {
  const { instance, requestAuth } = useAuthRuntime();
  return cloneElement(children, {
    onClick: (event: MouseEvent<HTMLElement>) => {
      children.props.onClick?.(event);
      if (event.defaultPrevented) return;
      if (instance) startAuthIntent(instance, intent, mode);
      else requestAuth(intent);
    }
  });
}

export function SignInIntent({ children, mode = 'redirect' }: { children: ChildButton; mode?: 'modal' | 'redirect' }) {
  return <IntentWrapper intent="sign-in" mode={mode}>{children}</IntentWrapper>;
}

export function SignUpIntent({ children, mode = 'modal' }: { children: ChildButton; mode?: 'modal' | 'redirect' }) {
  return <IntentWrapper intent="sign-up" mode={mode}>{children}</IntentWrapper>;
}

export function AccountUserButton() {
  const { instance } = useAuthRuntime();
  const node = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const target = node.current;
    if (!instance || !target) return;
    instance.mountUserButton(target, { userProfileMode: 'modal' });
    return () => instance.unmountUserButton(target);
  }, [instance]);
  return <div ref={node} className="account-user-button" aria-live="off" />;
}

export function SignOutControl({ children, redirectUrl = '/' }: { children: ChildButton; redirectUrl?: string }) {
  const { instance } = useAuthRuntime();
  return cloneElement(children, {
    onClick: (event: MouseEvent<HTMLElement>) => {
      children.props.onClick?.(event);
      if (instance) void instance.signOut({ redirectUrl });
    }
  });
}
