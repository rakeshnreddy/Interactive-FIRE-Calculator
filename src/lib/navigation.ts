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

export type PlanDeepLink = {
  isVersionExplicit: boolean;
  isVersionInvalid: boolean;
  planId: string | null;
  rawVersion: string | null;
  versionNumber: number | null;
};

const SAFE_PLAN_ID_REGEX = /^[a-zA-Z0-9_-]{1,64}$/;

export function parsePlanDeepLink(
  target: string | URL | { pathname: string; search?: string }
): PlanDeepLink {
  let pathname = '';
  let search = '';

  if (typeof target === 'string') {
    if (target.startsWith('http://') || target.startsWith('https://')) {
      try {
        const url = new URL(target);
        pathname = url.pathname;
        search = url.search;
      } catch {
        return {
          isVersionExplicit: false,
          isVersionInvalid: false,
          planId: null,
          rawVersion: null,
          versionNumber: null
        };
      }
    } else {
      const queryIndex = target.indexOf('?');
      if (queryIndex >= 0) {
        pathname = target.slice(0, queryIndex);
        search = target.slice(queryIndex);
      } else {
        pathname = target;
      }
    }
  } else if (target instanceof URL) {
    pathname = target.pathname;
    search = target.search;
  } else if (typeof target === 'object' && target !== null) {
    pathname = target.pathname || '';
    search = target.search || '';
  }

  const cleanPath = pathname.replace(/\/+$/, '');
  const isPlansContext =
    cleanPath === '' ||
    cleanPath === '/plans' ||
    cleanPath.startsWith('/plans/') ||
    search.includes('planId') ||
    search.includes('id=');

  if (!isPlansContext) {
    return {
      isVersionExplicit: false,
      isVersionInvalid: false,
      planId: null,
      rawVersion: null,
      versionNumber: null
    };
  }

  // Check path-based routing: /plans/:id/versions/:version or /plans/:id
  const pathParts = cleanPath.replace(/^\/+/, '').split('/');
  let pathPlanId: string | null = null;
  let pathVersionRaw: string | null = null;

  if (pathParts[0] === 'plans' && pathParts[1]) {
    pathPlanId = pathParts[1];
    if (pathParts[2] === 'versions' && pathParts[3] !== undefined) {
      pathVersionRaw = pathParts[3];
    }
  }

  // Check search params
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  const rawId = params.get('planId') ?? params.get('id') ?? pathPlanId;
  const rawVersion = params.get('version') ?? params.get('v') ?? pathVersionRaw;

  let planId: string | null = null;
  if (rawId && SAFE_PLAN_ID_REGEX.test(rawId)) {
    planId = rawId;
  }

  let versionNumber: number | null = null;
  let isVersionExplicit = false;
  let isVersionInvalid = false;

  if (rawVersion !== null && rawVersion !== undefined) {
    isVersionExplicit = true;
    const trimmed = rawVersion.trim();
    const parsed = Number(trimmed);
    if (Number.isInteger(parsed) && parsed > 0 && String(parsed) === trimmed) {
      versionNumber = parsed;
    } else {
      isVersionInvalid = true;
    }
  }

  return {
    isVersionExplicit,
    isVersionInvalid,
    planId,
    rawVersion: rawVersion ?? null,
    versionNumber
  };
}

export function buildPlanDeepLink(planId: string, versionNumber?: number | null): string {
  const base = `/plans?planId=${encodeURIComponent(planId)}`;
  if (typeof versionNumber === 'number' && Number.isInteger(versionNumber) && versionNumber > 0) {
    return `${base}&version=${versionNumber}`;
  }
  return base;
}
