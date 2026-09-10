import { describe, expect, it } from 'vitest';
import {
  activeNavigationPath,
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
