import type { ReactNode } from 'react';
import type { AuthState } from './auth';
import { SignInIntent, SignUpIntent } from './authRuntime';

export function AuthActionButton({
  auth,
  kind,
  className,
  children,
  onUnavailable
}: {
  auth: AuthState;
  kind: 'sign-in' | 'sign-up';
  className: string;
  children: ReactNode;
  onUnavailable: () => void;
}) {
  const button = (
    <button className={className} onClick={auth.isConfigured ? undefined : onUnavailable}>
      {children}
    </button>
  );

  if (!auth.isConfigured) {
    return button;
  }

  return kind === 'sign-in' ? (
    <SignInIntent mode="redirect">
      {button}
    </SignInIntent>
  ) : (
    <SignUpIntent mode="redirect">
      {button}
    </SignUpIntent>
  );
}

