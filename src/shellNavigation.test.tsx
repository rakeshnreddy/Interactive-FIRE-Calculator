import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import App from './App';
import type { AuthState } from './auth';
vi.mock('@clerk/react', () => ({ SignUpButton: ({ children }: { children: React.ReactNode }) => <>{children}</>, SignInButton: ({ children }: { children: React.ReactNode }) => <>{children}</>, UserButton: () => null, SignOutButton: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
const auth: AuthState = { provider:'clerk',status:'not-configured',isConfigured:false,isSignedIn:false,missingEnv:['VITE_CLERK_PUBLISHABLE_KEY'],user:null };
beforeEach(() => { localStorage.clear(); vi.stubGlobal('matchMedia', vi.fn(() => ({ matches:false, addEventListener:vi.fn(), removeEventListener:vi.fn() }))); });
describe('B70 shared application shell', () => {
 it.each(['/','/calculators','/calculators/retirement','/dashboard'])('keeps one footer and public destinations on %s', route => {
  window.history.replaceState({},'',route);
  const element=document.createElement('div');element.innerHTML=renderToStaticMarkup(<App auth={auth}/>);
  expect(element.querySelectorAll('footer')).toHaveLength(1);
  const footer=element.querySelector('footer')!;
  for(const href of ['/','/calculators','/calculators/fire','/calculators#toolkit-home','/calculators#toolkit-income-tax','/#faq']) expect(footer.querySelector(`a[href="${href}"]`)).not.toBeNull();
  expect(element.querySelector('.brand')?.getAttribute('aria-label')).toBe('FinPath home');
  expect(element.querySelector('.desktop-nav')?.textContent).not.toContain('Workspace');
  if(route==='/dashboard') expect(element.textContent).toContain('Account features are currently unavailable.');
 });
});
