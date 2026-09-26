import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AuthRuntimeContext, shouldLoadClerkOnStart, type AuthIntent, type ClerkModule } from './authRuntime';

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

const signedOutWithoutClerk: Extract<AuthState, { isConfigured: true; isSignedIn: false }> = {
  provider: 'clerk',
  status: 'signed-out',
  isConfigured: true,
  isSignedIn: false,
  getToken: async () => null,
  user: null
};

function ClerkSessionBridge({
  clerk,
  pendingIntent,
  onIntentHandled,
  children
}: {
  clerk: ClerkModule;
  pendingIntent: AuthIntent | null;
  onIntentHandled: () => void;
  children: (auth: AuthState) => ReactNode;
}) {
  const { getToken } = clerk.useAuth();
  const { isLoaded, isSignedIn, user } = clerk.useUser();
  const clerkInstance = clerk.useClerk();

  // Complete the sign-in/sign-up click that triggered loading Clerk.
  useEffect(() => {
    if (!pendingIntent || !clerkInstance.loaded) return;
    onIntentHandled();
    if (pendingIntent === 'sign-in') {
      void clerkInstance.redirectToSignIn({ signInFallbackRedirectUrl: '/dashboard' });
    } else {
      clerkInstance.openSignUp({ fallbackRedirectUrl: '/dashboard' });
    }
  }, [clerkInstance, clerkInstance.loaded, onIntentHandled, pendingIntent]);

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
  const startMode = useRef(
    typeof window === 'undefined'
      ? 'on-intent'
      : shouldLoadClerkOnStart(window.location, typeof document === 'undefined' ? '' : document.cookie)
  ).current;
  const [clerk, setClerk] = useState<ClerkModule | null>(null);
  const [requested, setRequested] = useState(startMode !== 'on-intent');
  const [pendingIntent, setPendingIntent] = useState<AuthIntent | null>(null);

  useEffect(() => {
    if (!clerkPublishableKey || !requested || clerk) return;
    let cancelled = false;
    void import('@clerk/react').then((mod) => {
      if (!cancelled) setClerk(mod);
    });
    return () => {
      cancelled = true;
    };
  }, [clerk, requested]);

  const requestAuth = useCallback((intent: AuthIntent) => {
    setPendingIntent(intent);
    setRequested(true);
  }, []);
  const clearIntent = useCallback(() => setPendingIntent(null), []);
  const runtime = useMemo(() => ({ clerk, requestAuth }), [clerk, requestAuth]);

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

  if (!clerk) {
    // A signed-in hint or a workspace route shows "loading" rather than a false signed-out state.
    const auth: AuthState = requested ? { ...signedOutWithoutClerk, status: 'loading' as const } : signedOutWithoutClerk;
    return <AuthRuntimeContext.Provider value={runtime}>{children(auth)}</AuthRuntimeContext.Provider>;
  }

  const { ClerkProvider } = clerk;
  return (
    <AuthRuntimeContext.Provider value={runtime}>
      <ClerkProvider
        publishableKey={clerkPublishableKey}
        signInFallbackRedirectUrl="/dashboard"
        signUpFallbackRedirectUrl="/dashboard"
        afterSignOutUrl="/"
      >
        <ClerkSessionBridge clerk={clerk} pendingIntent={pendingIntent} onIntentHandled={clearIntent}>
          {children}
        </ClerkSessionBridge>
      </ClerkProvider>
    </AuthRuntimeContext.Provider>
  );
}
