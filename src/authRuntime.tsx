import { cloneElement, createContext, useContext, type MouseEvent, type ReactElement, type ReactNode } from 'react';

// Clerk is loaded on demand (B38) so public pages never download it. Until it has loaded, auth
// controls render as plain buttons that request it; afterwards they are Clerk's own components.
export type ClerkModule = typeof import('@clerk/react');
export type AuthIntent = 'sign-in' | 'sign-up';

export type AuthRuntime = {
  clerk: ClerkModule | null;
  requestAuth: (intent: AuthIntent) => void;
};

export const AuthRuntimeContext = createContext<AuthRuntime>({ clerk: null, requestAuth: () => {} });

export const useAuthRuntime = () => useContext(AuthRuntimeContext);

const WORKSPACE_PREFIXES = ['/dashboard', '/accounts', '/transactions', '/goals', '/plans', '/reports', '/settings'];

// Load Clerk immediately only when it is needed to render the page correctly.
export function shouldLoadClerkOnStart(location: { pathname: string; search: string }, cookie: string): 'now-signed-in-hint' | 'now' | 'on-intent' {
  if (/(?:^|;\s*)__client_uat(?:_[A-Za-z0-9-]+)?=[1-9]\d*/.test(cookie)) return 'now-signed-in-hint';
  if (/[?&]__clerk_[a-z_]+=/.test(location.search)) return 'now';
  if (WORKSPACE_PREFIXES.some((prefix) => location.pathname === prefix || location.pathname.startsWith(`${prefix}/`))) return 'now';
  return 'on-intent';
}

type ChildButton = ReactElement<{ onClick?: (event: MouseEvent<HTMLElement>) => void }>;

function IntentWrapper({ intent, mode, children }: { intent: AuthIntent; mode: 'modal' | 'redirect'; children: ChildButton }) {
  const { clerk, requestAuth } = useAuthRuntime();
  if (clerk) {
    const Component = intent === 'sign-in' ? clerk.SignInButton : clerk.SignUpButton;
    return (
      <Component mode={mode} {...(mode === 'redirect' ? { fallbackRedirectUrl: '/dashboard' } : {})}>
        {children}
      </Component>
    );
  }
  return cloneElement(children, {
    onClick: (event: MouseEvent<HTMLElement>) => {
      children.props.onClick?.(event);
      requestAuth(intent);
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
  const { clerk } = useAuthRuntime();
  return clerk ? <clerk.UserButton userProfileMode="modal" /> : null;
}

export function SignOutControl({ children, redirectUrl = '/' }: { children: ReactNode; redirectUrl?: string }) {
  const { clerk } = useAuthRuntime();
  return clerk ? <clerk.SignOutButton redirectUrl={redirectUrl}>{children}</clerk.SignOutButton> : <>{children}</>;
}
