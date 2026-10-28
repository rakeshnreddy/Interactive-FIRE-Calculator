import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, expect, it, vi } from 'vitest';
import App from './App';
import type { AuthState } from './auth';
vi.mock('./PlanningWorkspace', () => ({ PlanningWorkspace: ({ onDirtyStateChange }: { onDirtyStateChange: (dirty: boolean) => void }) => <button onClick={() => onDirtyStateChange(true)}>Edit planning assumptions</button> }));
vi.mock('@clerk/react', () => ({ UserButton: () => null, SignOutButton: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
afterEach(() => vi.unstubAllGlobals());
it('protects dirty planning edits when the shared FAQ footer link is followed', async () => {
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
  vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 401 })));
  vi.stubGlobal('scrollTo', vi.fn());
  const originalScroll = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollIntoView');
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: vi.fn() });
  localStorage.clear();
  window.history.replaceState({}, '', '/plans');
  const auth: AuthState = { provider: 'clerk', status: 'signed-in', isConfigured: true, isSignedIn: true, getToken: async () => 'synthetic-test-token', user: { id: 'synthetic-b70', displayName: 'Test User' } };
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = createRoot(host);
  const click = async (el: Element) => { await act(async () => el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))); };
  try {
    await act(async () => root.render(<App auth={auth} />));
    await vi.waitFor(() => expect(host.textContent).toContain('Edit planning assumptions'));
    await click([...host.querySelectorAll('button')].find(el => el.textContent === 'Edit planning assumptions')!);
    let intercepted = false;
    // Observe React's interception, then suppress jsdom's native document navigation on a red run.
    document.addEventListener('click', event => { intercepted = event.defaultPrevented; event.preventDefault(); }, { once: true });
    await click(host.querySelector('.site-footer a[href="/#faq"]')!);
    expect(intercepted).toBe(true);
    expect(window.location.pathname).toBe('/plans');
    expect(host.querySelector('[aria-labelledby="unsaved-nav-changes-title"]')).not.toBeNull();
    await click([...host.querySelectorAll('button')].find(el => el.textContent === 'Keep editing')!);
    expect(host.querySelector('[role="dialog"]')).toBeNull();
    expect(window.location.pathname).toBe('/plans');
    await click(host.querySelector('.site-footer a[href="/#faq"]')!);
    await click([...host.querySelectorAll('button')].find(el => el.textContent === 'Discard and leave')!);
    expect(window.location.pathname).toBe('/');
    expect(window.location.hash).toBe('#faq');
    expect(host.querySelector('[role="dialog"]')).toBeNull();
  } finally { await act(async () => root.unmount()); host.remove(); if (originalScroll) Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', originalScroll); else delete (HTMLElement.prototype as { scrollIntoView?: unknown }).scrollIntoView; vi.restoreAllMocks(); }
});
