export type AppRoute =
  | '/'
  | '/dashboard'
  | '/accounts'
  | '/transactions'
  | '/goals'
  | '/plans'
  | '/calculators'
  | '/calculators/fire'
  | `/calculators/${string}`
  | '/reports'
  | '/settings';

export type NavigationAuthStatus = 'not-configured' | 'loading' | 'signed-out' | 'signed-in';

export type NavigationItem = {
  label: string;
  path: AppRoute;
};

const publicPrimaryNavigation: NavigationItem[] = [
  { label: 'Calculators', path: '/calculators' },
  { label: 'FIRE', path: '/calculators/fire' }
];

const signedInPrimaryNavigation: NavigationItem[] = [
  { label: 'Dashboard', path: '/dashboard' },
  { label: 'Transactions', path: '/transactions' },
  { label: 'Goals', path: '/goals' },
  { label: 'Calculators', path: '/calculators' }
];

export const workspaceNavigation: NavigationItem[] = [
  { label: 'Accounts', path: '/accounts' },
  { label: 'Plans', path: '/plans' },
  { label: 'Reports', path: '/reports' },
  { label: 'Settings', path: '/settings' }
];

export function primaryNavigationFor(status: NavigationAuthStatus): NavigationItem[] {
  return status === 'signed-in' ? signedInPrimaryNavigation : publicPrimaryNavigation;
}

export function activeNavigationPath(currentRoute: AppRoute, items: NavigationItem[]): AppRoute | null {
  return (
    items
      .filter((item) => currentRoute === item.path || currentRoute.startsWith(`${item.path}/`))
      .sort((left, right) => right.path.length - left.path.length)[0]?.path ?? null
  );
}

export type NavigationClick = {
  altKey: boolean;
  button: number;
  ctrlKey: boolean;
  defaultPrevented: boolean;
  metaKey: boolean;
  shiftKey: boolean;
};

export type NavigationAnchor = {
  download?: boolean;
  target?: string | null;
};

export function shouldHandleNavigationClick(
  event: NavigationClick,
  anchor: NavigationAnchor
): boolean {
  return (
    !event.defaultPrevented &&
    event.button === 0 &&
    !event.altKey &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.shiftKey &&
    !anchor.download &&
    (!anchor.target || anchor.target.toLowerCase() === '_self')
  );
}
