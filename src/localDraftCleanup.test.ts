// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { clearLocalDrafts } from './App';

describe('Scoped Local Draft Clearing (B07)', () => {
  let store: Record<string, string>;

  beforeEach(() => {
    store = {};
    const mockLocalStorage = {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => {
        store[key] = value;
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      key: (index: number) => Object.keys(store)[index] ?? null,
      get length() {
        return Object.keys(store).length;
      },
      clear: () => {
        for (const key of Object.keys(store)) {
          delete store[key];
        }
      }
    };

    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
      writable: true,
      configurable: true
    });
  });

  it('removes finpath drafts and saved plans while strictly preserving finpath.colorMode and unrelated keys', () => {
    store['finpath.calculatorDraft.budget.v2'] = JSON.stringify({ income: 5000 });
    store['finpath.calculatorDraft.net-worth.v2'] = JSON.stringify({ assets: 100000 });
    store['finpath.calculatorDraft.emergency-fund.v2'] = JSON.stringify({ months: 6 });
    store['firecalc.savedPlans.v1'] = JSON.stringify([{ id: 'plan_1' }]);
    store['fire_calc_saved_plans_v1'] = JSON.stringify([{ id: 'legacy_plan' }]);
    store['finpath.colorMode'] = 'dark';
    store['some_third_party_app_setting'] = 'keep_me';

    clearLocalDrafts();

    // Sensitive financial drafts and saved plans are cleared
    expect(store['finpath.calculatorDraft.budget.v2']).toBeUndefined();
    expect(store['finpath.calculatorDraft.net-worth.v2']).toBeUndefined();
    expect(store['finpath.calculatorDraft.emergency-fund.v2']).toBeUndefined();
    expect(store['firecalc.savedPlans.v1']).toBeUndefined();
    expect(store['fire_calc_saved_plans_v1']).toBeUndefined();

    // Theme preference and non-finpath data are preserved
    expect(store['finpath.colorMode']).toBe('dark');
    expect(store['some_third_party_app_setting']).toBe('keep_me');
  });

  it('handles restricted storage access gracefully when window.localStorage getter throws', () => {
    Object.defineProperty(window, 'localStorage', {
      get() {
        throw new DOMException('The operation is insecure.', 'SecurityError');
      },
      configurable: true
    });

    // Must not throw an unhandled exception
    expect(() => clearLocalDrafts()).not.toThrow();
  });

  it('handles restricted storage access gracefully when removeItem throws', () => {
    const mockStorage = {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {
        throw new DOMException('QuotaExceededError or SecurityError', 'SecurityError');
      },
      key: () => 'finpath.calculatorDraft.test',
      length: 1,
      clear: () => {}
    };

    Object.defineProperty(window, 'localStorage', {
      value: mockStorage,
      writable: true,
      configurable: true
    });

    expect(() => clearLocalDrafts()).not.toThrow();
  });
});
