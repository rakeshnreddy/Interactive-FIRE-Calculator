import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LandingPage } from './App';
import type { AuthState } from './auth';

const auth: AuthState = { provider: 'clerk', status: 'not-configured', isConfigured: false, isSignedIn: false, user: null, missingEnv: ['VITE_CLERK_PUBLISHABLE_KEY'] };
let host: HTMLDivElement;
let root: Root;
const navigate = vi.fn();
beforeEach(async () => {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  navigate.mockReset();
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host);
  await act(async () => root.render(<LandingPage auth={auth} onNavigate={navigate} />));
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); });

async function submit(value: string) {
  const form = host.querySelector<HTMLFormElement>('form[role="search"]');
  expect(form, 'homepage has a real searchable GET form').not.toBeNull();
  const input = form!.querySelector<HTMLInputElement>('input[name="q"]')!;
  input.value = value;
  const event = new Event('submit', { bubbles: true, cancelable: true });
  await act(async () => { form!.dispatchEvent(event); });
  expect(event.defaultPrevented).toBe(true);
}

describe('homepage question finder', () => {
  it('provides a labeled native GET fallback to existing discovery', () => {
    const form = host.querySelector('form[role="search"]');
    expect(form).not.toBeNull();
    expect(form!.getAttribute('action')).toBe('/calculators');
    expect(form!.getAttribute('method')).toBe('get');
    const input = form!.querySelector<HTMLInputElement>('input[name="q"]')!;
    expect(host.querySelector(`label[for="${input.id}"]`)?.textContent).toBe('What are you trying to work out?');
    expect(form!.querySelector('button[type="submit"]')?.textContent).toContain('Find a calculator');
  });
  it('trims and URL-encodes topics without interpreting financial input', async () => {
    await submit('  PPF & retirement  ');
    expect(navigate).toHaveBeenCalledExactlyOnceWith('/calculators?q=PPF+%26+retirement');
  });
  it('opens the whole library when the question is empty', async () => {
    await submit('   ');
    expect(navigate).toHaveBeenCalledExactlyOnceWith('/calculators');
  });
  it('keeps public anchors native for modified clicks and uses the router for primary clicks', async () => {
    const link = host.querySelector<HTMLAnchorElement>('a[href="/calculators/fire"]')!;
    link.target = '_blank';
    const modified = new MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true });
    await act(async () => { link.dispatchEvent(modified); });
    expect(modified.defaultPrevented).toBe(false); expect(navigate).not.toHaveBeenCalled();
    link.removeAttribute('target');
    const primary = new MouseEvent('click', { bubbles: true, cancelable: true });
    await act(async () => { link.dispatchEvent(primary); });
    expect(primary.defaultPrevented).toBe(true); expect(navigate).toHaveBeenCalledExactlyOnceWith('/calculators/fire');
  });
});
