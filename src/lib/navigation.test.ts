import { describe, expect, it } from 'vitest';
import {
  resolvePlansRouteAction,
  activeNavigationPath,
  buildPlanDeepLink,
  parsePlanDeepLink,
  primaryNavigationFor,
  shouldHandleNavigationClick,
  workspaceNavigation
} from './navigation';

describe('navigation model', () => {
  it.each(['not-configured', 'loading', 'signed-out'] as const)(
    'puts public calculators and FIRE first for %s visitors',
    (status) => {
      expect(primaryNavigationFor(status)).toEqual([
        { label: 'Calculators', path: '/calculators' },
        { label: 'FIRE', path: '/calculators/fire' }
      ]);
    }
  );

  it('puts frequent private routes first only for signed-in visitors', () => {
    expect(primaryNavigationFor('signed-in')).toEqual([
      { label: 'Dashboard', path: '/dashboard' },
      { label: 'Transactions', path: '/transactions' },
      { label: 'Goals', path: '/goals' },
      { label: 'Calculators', path: '/calculators' }
    ]);
  });

  it('keeps every account route in the Workspace disclosure for every auth state', () => {
    expect(workspaceNavigation).toEqual([
      { label: 'Accounts', path: '/accounts' },
      { label: 'Plans', path: '/plans' },
      { label: 'Reports', path: '/reports' },
      { label: 'Settings', path: '/settings' }
    ]);
  });

  it('selects only the most specific current navigation route', () => {
    const publicItems = primaryNavigationFor('signed-out');
    const signedInItems = primaryNavigationFor('signed-in');

    expect(activeNavigationPath('/calculators/fire', publicItems)).toBe('/calculators/fire');
    expect(activeNavigationPath('/calculators/fire', signedInItems)).toBe('/calculators');
    expect(activeNavigationPath('/calculators/mortgage', publicItems)).toBe('/calculators');
  });
});

describe('native navigation click contract', () => {
  const primaryClick = {
    altKey: false,
    button: 0,
    ctrlKey: false,
    defaultPrevented: false,
    metaKey: false,
    shiftKey: false
  };

  it('intercepts only an unmodified primary click on a same-context link', () => {
    expect(shouldHandleNavigationClick(primaryClick, {})).toBe(true);
    expect(shouldHandleNavigationClick({ ...primaryClick, button: 1 }, {})).toBe(false);
    expect(shouldHandleNavigationClick({ ...primaryClick, metaKey: true }, {})).toBe(false);
    expect(shouldHandleNavigationClick({ ...primaryClick, ctrlKey: true }, {})).toBe(false);
    expect(shouldHandleNavigationClick({ ...primaryClick, shiftKey: true }, {})).toBe(false);
    expect(shouldHandleNavigationClick({ ...primaryClick, altKey: true }, {})).toBe(false);
    expect(shouldHandleNavigationClick({ ...primaryClick, defaultPrevented: true }, {})).toBe(false);
    expect(shouldHandleNavigationClick(primaryClick, { target: '_blank' })).toBe(false);
    expect(shouldHandleNavigationClick(primaryClick, { download: true })).toBe(false);
  });
});

describe('plan deep link contract (B10)', () => {
  it('parses valid planId and versionNumber from query string', () => {
    const parsed = parsePlanDeepLink('/plans?planId=68268415-1b8f-4260-bb93-b39d1fb6c043&version=2');
    expect(parsed).toEqual({
      isVersionExplicit: true,
      isVersionInvalid: false,
      planId: '68268415-1b8f-4260-bb93-b39d1fb6c043',
      rawVersion: '2',
      versionNumber: 2
    });
  });

  it('parses short query aliases ?id=...&v=...', () => {
    const parsed = parsePlanDeepLink('?id=plan-abc-123&v=4');
    expect(parsed).toEqual({
      isVersionExplicit: true,
      isVersionInvalid: false,
      planId: 'plan-abc-123',
      rawVersion: '4',
      versionNumber: 4
    });
  });

  it('parses path-based plan deep link /plans/:id/versions/:version', () => {
    const parsed = parsePlanDeepLink('/plans/68268415-1b8f-4260-bb93-b39d1fb6c043/versions/3');
    expect(parsed).toEqual({
      isVersionExplicit: true,
      isVersionInvalid: false,
      planId: '68268415-1b8f-4260-bb93-b39d1fb6c043',
      rawVersion: '3',
      versionNumber: 3
    });
  });

  it('parses planId without explicit versionNumber', () => {
    const parsed = parsePlanDeepLink('/plans?planId=68268415-1b8f-4260-bb93-b39d1fb6c043');
    expect(parsed).toEqual({
      isVersionExplicit: false,
      isVersionInvalid: false,
      planId: '68268415-1b8f-4260-bb93-b39d1fb6c043',
      rawVersion: null,
      versionNumber: null
    });
  });

  it('rejects malformed or unsafe plan IDs', () => {
    expect(parsePlanDeepLink('/plans?planId=<script>alert(1)</script>').planId).toBeNull();
    expect(parsePlanDeepLink('/plans?planId=plan%20with%20spaces').planId).toBeNull();
    expect(parsePlanDeepLink(`/plans?planId=${'a'.repeat(100)}`).planId).toBeNull();
    expect(parsePlanDeepLink('/plans?planId=;DROP TABLE plans;').planId).toBeNull();
  });

  it('rejects invalid or malformed version numbers and marks isVersionInvalid', () => {
    const v0 = parsePlanDeepLink('/plans?planId=valid-plan&version=0');
    expect(v0.versionNumber).toBeNull();
    expect(v0.isVersionExplicit).toBe(true);
    expect(v0.isVersionInvalid).toBe(true);

    const vNeg = parsePlanDeepLink('/plans?planId=valid-plan&version=-5');
    expect(vNeg.versionNumber).toBeNull();
    expect(vNeg.isVersionExplicit).toBe(true);
    expect(vNeg.isVersionInvalid).toBe(true);

    const vAlpha = parsePlanDeepLink('/plans?planId=valid-plan&version=abc');
    expect(vAlpha.versionNumber).toBeNull();
    expect(vAlpha.isVersionExplicit).toBe(true);
    expect(vAlpha.isVersionInvalid).toBe(true);

    const vFloat = parsePlanDeepLink('/plans?planId=valid-plan&version=1.5');
    expect(vFloat.versionNumber).toBeNull();
    expect(vFloat.isVersionExplicit).toBe(true);
    expect(vFloat.isVersionInvalid).toBe(true);
  });

  it('returns nulls for unrelated routes', () => {
    expect(parsePlanDeepLink('/dashboard')).toEqual({
      isVersionExplicit: false,
      isVersionInvalid: false,
      planId: null,
      rawVersion: null,
      versionNumber: null
    });
    expect(parsePlanDeepLink('/accounts')).toEqual({
      isVersionExplicit: false,
      isVersionInvalid: false,
      planId: null,
      rawVersion: null,
      versionNumber: null
    });
  });

  it('builds clean plan deep links with stable opaque IDs and no financial parameters', () => {
    expect(buildPlanDeepLink('68268415-1b8f-4260-bb93-b39d1fb6c043')).toBe(
      '/plans?planId=68268415-1b8f-4260-bb93-b39d1fb6c043'
    );
    expect(buildPlanDeepLink('68268415-1b8f-4260-bb93-b39d1fb6c043', 2)).toBe(
      '/plans?planId=68268415-1b8f-4260-bb93-b39d1fb6c043&version=2'
    );
  });
});

describe('plans route action', () => {
  it('keeps the active plan when /plans has no plan link (e.g. returning from the calculator)', () => {
    expect(resolvePlansRouteAction(parsePlanDeepLink('/plans'))).toBe('keep-active-plan');
  });

  it('loads an explicit plan link and rejects an invalid version', () => {
    expect(resolvePlansRouteAction(parsePlanDeepLink('/plans?planId=plan_1&version=2'))).toBe('load-link');
    expect(resolvePlansRouteAction(parsePlanDeepLink('/plans?planId=plan_1&version=abc'))).toBe('invalid-version');
  });
});
