import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { LandingPage, usefulCalculatorPaths } from './App';
import { HeroFireExample } from './HeroFireExample';
import { getHeroFireExampleData, HERO_FIRE_FIXTURE } from './lib/heroExample';
import type { AuthState } from './auth';
vi.mock('@clerk/react', () => ({ SignUpButton: ({children}: {children: React.ReactNode}) => <>{children}</>, SignInButton: ({children}: {children: React.ReactNode}) => <>{children}</>, UserButton: () => null, SignOutButton: ({children}: {children: React.ReactNode}) => <>{children}</> }));
const auth: AuthState = {provider:'clerk',status:'not-configured',isConfigured:false,isSignedIn:false,user:null,missingEnv:['VITE_CLERK_PUBLISHABLE_KEY']};
describe('intentional public entry', () => {
  it('presents three decision paths before the detailed example in DOM reading order', () => {
    const html=renderToStaticMarkup(<LandingPage auth={auth} onNavigate={()=>{}}/>);
    expect(usefulCalculatorPaths.map(p=>p.action)).toEqual(['Plan retirement','Pay down debt','Reach a savings goal']);
    expect(html.indexOf('Choose a planning path')).toBeLessThan(html.indexOf('Illustrative FIRE calculation example'));
    expect(html).not.toContain('Popular starts');
    expect(html).not.toContain('landing-toolkit-grid');
    expect(html).not.toMatch(/\d+ calculators, grouped/);
    for(const slug of ['fire','debt-payoff','savings-goal'])expect(html).toContain(`href="/calculators/${slug}"`);
  });
  it('keeps one engine-backed main answer and moves model detail into a real collapsed disclosure', () => {
    const html=renderToStaticMarkup(<HeroFireExample/>); const container=document.createElement('div');container.innerHTML=html;
    const detail=container.querySelector('details')!;
    expect(detail).toBeTruthy(); expect(detail.hasAttribute('open')).toBe(false);
    expect(detail.querySelector('summary')?.textContent).toContain('See how this example works');
    expect(detail.querySelector('figure')).toBeTruthy();
    expect(container.querySelector('.hero-example-card:not(.hero-example-card-primary)')?.closest('details')).toBe(detail);
    expect(container.querySelector('.hero-example-card-primary strong')?.textContent).toBe(getHeroFireExampleData(HERO_FIRE_FIXTURE).formatted.requiredPortfolio);
    expect(container.textContent).toContain('Illustrative example');
    expect(container.querySelector('.hero-example-driver')?.textContent).toMatch(/7%.*2.5%/);
  });
});
