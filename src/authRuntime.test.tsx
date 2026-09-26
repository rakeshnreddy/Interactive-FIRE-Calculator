// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import { AuthRuntimeContext, SignUpIntent, shouldLoadClerkOnStart } from './authRuntime';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

describe('lazy Clerk loading (B38)', () => {
  it('loads Clerk at start only for workspace routes, sign-in redirects or a signed-in hint', () => {
    const at = (pathname: string, search = '') => ({ pathname, search });
    expect(shouldLoadClerkOnStart(at('/calculators/fire'), '')).toBe('on-intent');
    expect(shouldLoadClerkOnStart(at('/'), '__client_uat=0; other=1')).toBe('on-intent');
    expect(shouldLoadClerkOnStart(at('/'), 'a=1; __client_uat=1727300000')).toBe('now-signed-in-hint');
    expect(shouldLoadClerkOnStart(at('/'), '__client_uat_AbC-1=1727300000')).toBe('now-signed-in-hint');
    expect(shouldLoadClerkOnStart(at('/calculators', '?__clerk_status=verified'), '')).toBe('now');
    expect(shouldLoadClerkOnStart(at('/dashboard'), '')).toBe('now');
    expect(shouldLoadClerkOnStart(at('/plans/abc'), '')).toBe('now');
    expect(shouldLoadClerkOnStart(at('/plansx'), '')).toBe('on-intent');
  });

  it('before Clerk loads, an auth button runs its own handler and then requests Clerk', () => {
    const requestAuth = vi.fn();
    const onClick = vi.fn();
    const container = document.createElement('div');
    document.body.appendChild(container);
    act(() =>
      createRoot(container).render(
        <AuthRuntimeContext.Provider value={{ clerk: null, requestAuth }}>
          <SignUpIntent><button type="button" onClick={onClick}>Create account to save</button></SignUpIntent>
        </AuthRuntimeContext.Provider>
      )
    );
    act(() => container.querySelector('button')!.click());
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(requestAuth).toHaveBeenCalledWith('sign-up');
  });
});
