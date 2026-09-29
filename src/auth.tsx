import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AuthRuntimeContext, shouldLoadClerkOnStart, startAuthIntent, type AuthIntent, type ClerkInstance, type ClerkModule } from './authRuntime';

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

// Rendered inside ClerkProvider with no children: it reports the session to the boundary, which
// renders the app outside the provider so the app tree is stable while Clerk loads.
function ClerkSessionBridge({
  clerk,
  pendingIntent,
  onIntentHandled,
  onAuth,
  onInstance
}: {
  clerk: ClerkModule;
  pendingIntent: AuthIntent | null;
  onIntentHandled: () => void;
  onAuth: (auth: AuthState) => void;
  onInstance: (instance: ClerkInstance) => void;
}) {
  const { getToken } = clerk.useAuth();
  const { isLoaded, isSignedIn, user } = clerk.useUser();
  const clerkInstance = clerk.useClerk();
  const userId = user?.id;
  const email = user?.primaryEmailAddress?.emailAddress;
  const displayName = user?.fullName ?? user?.firstName ?? email ?? 'Signed-in user';
  const imageUrl = user?.imageUrl;
  // Report upward only when something observable changed; hook return values may be fresh objects.
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;
  const stableGetToken = useCallback(() => getTokenRef.current(), []);
  const reportedInstance = useRef<ClerkInstance | null>(null);

  useEffect(() => {
    if (clerkInstance.loaded && reportedInstance.current !== clerkInstance) {
      reportedInstance.current = clerkInstance;
      onInstance(clerkInstance);
    }
  }, [clerkInstance, clerkInstance.loaded, onInstance]);

  useEffect(() => {
    if (!isLoaded) {
      onAuth({ provider: 'clerk', status: 'loading', isConfigured: true, isSignedIn: false, getToken: stableGetToken, user: null });
    } else if (!isSignedIn || !userId) {
      onAuth({ provider: 'clerk', status: 'signed-out', isConfigured: true, isSignedIn: false, getToken: stableGetToken, user: null });
    } else {
      onAuth({ provider: 'clerk', status: 'signed-in', isConfigured: true, isSignedIn: true, getToken: stableGetToken, user: { id: userId, displayName, email, imageUrl } });
    }
  }, [displayName, email, imageUrl, isLoaded, isSignedIn, onAuth, stableGetToken, userId]);

  // Complete the sign-in/sign-up click that triggered loading Clerk.
  useEffect(() => {
    if (!pendingIntent || !clerkInstance.loaded) return;
    onIntentHandled();
    startAuthIntent(clerkInstance, pendingIntent, pendingIntent === 'sign-in' ? 'redirect' : 'modal');
  }, [clerkInstance, clerkInstance.loaded, onIntentHandled, pendingIntent]);

  return null;
}

export function AuthProviderBoundary({ children }: { children: (auth: AuthState) => ReactNode }) {
  const startMode = useRef(
    typeof window === 'undefined'
      ? 'on-intent'
      : shouldLoadClerkOnStart(window.location, typeof document === 'undefined' ? '' : document.cookie)
  ).current;
  const [clerk, setClerk] = useState<ClerkModule | null>(null);
  const [instance, setInstance] = useState<ClerkInstance | null>(null);
  const [clerkAuth, setClerkAuth] = useState<AuthState | null>(null);
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
  const runtime = useMemo(() => ({ clerk, instance, requestAuth }), [clerk, instance, requestAuth]);

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

  // Before Clerk reports, a signed-in hint or a workspace route shows "loading" rather than a
  // false signed-out state. The app element keeps the same tree position throughout.
  const auth: AuthState = clerkAuth ?? (requested ? { ...signedOutWithoutClerk, status: 'loading' as const } : signedOutWithoutClerk);
  return (
    <AuthRuntimeContext.Provider value={runtime}>
      {clerk ? (
        <clerk.ClerkProvider
          publishableKey={clerkPublishableKey}
          signInFallbackRedirectUrl="/dashboard"
          signUpFallbackRedirectUrl="/dashboard"
          afterSignOutUrl="/"
        >
          <ClerkSessionBridge clerk={clerk} pendingIntent={pendingIntent} onIntentHandled={clearIntent} onAuth={setClerkAuth} onInstance={setInstance} />
        </clerk.ClerkProvider>
      ) : null}
      {children(auth)}
    </AuthRuntimeContext.Provider>
  );
}
