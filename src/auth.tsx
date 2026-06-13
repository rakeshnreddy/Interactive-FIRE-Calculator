import { ClerkProvider, useAuth, useUser } from '@clerk/react';
import type { ReactNode } from 'react';

export type AuthUserProfile = {
  id: string;
  displayName: string;
  email?: string;
  imageUrl?: string;
};

type AuthTokenGetter = () => Promise<string | null>;

export type AuthState =
  | {
      provider: 'clerk';
      status: 'not-configured';
      isConfigured: false;
      isSignedIn: false;
      missingEnv: string[];
      user: null;
    }
  | {
      provider: 'clerk';
      status: 'loading' | 'signed-out';
      isConfigured: true;
      isSignedIn: false;
      getToken: AuthTokenGetter;
      user: null;
    }
  | {
      provider: 'clerk';
      status: 'signed-in';
      isConfigured: true;
      isSignedIn: true;
      getToken: AuthTokenGetter;
      user: AuthUserProfile;
    };

const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY?.trim();

function ClerkSessionBridge({ children }: { children: (auth: AuthState) => ReactNode }) {
  const { getToken } = useAuth();
  const { isLoaded, isSignedIn, user } = useUser();

  if (!isLoaded) {
    return children({
      provider: 'clerk',
      status: 'loading',
      isConfigured: true,
      isSignedIn: false,
      getToken,
      user: null
    });
  }

  if (!isSignedIn || !user) {
    return children({
      provider: 'clerk',
      status: 'signed-out',
      isConfigured: true,
      isSignedIn: false,
      getToken,
      user: null
    });
  }

  const email = user.primaryEmailAddress?.emailAddress;
  const displayName = user.fullName ?? user.firstName ?? email ?? 'Signed-in user';

  return children({
    provider: 'clerk',
    status: 'signed-in',
    isConfigured: true,
    isSignedIn: true,
    getToken,
    user: {
      id: user.id,
      displayName,
      email,
      imageUrl: user.imageUrl
    }
  });
}

export function AuthProviderBoundary({ children }: { children: (auth: AuthState) => ReactNode }) {
  if (!clerkPublishableKey) {
    return children({
      provider: 'clerk',
      status: 'not-configured',
      isConfigured: false,
      isSignedIn: false,
      missingEnv: ['VITE_CLERK_PUBLISHABLE_KEY'],
      user: null
    });
  }

  return (
    <ClerkProvider
      publishableKey={clerkPublishableKey}
      signInFallbackRedirectUrl="/dashboard"
      signUpFallbackRedirectUrl="/dashboard"
      afterSignOutUrl="/"
    >
      <ClerkSessionBridge>{children}</ClerkSessionBridge>
    </ClerkProvider>
  );
}
