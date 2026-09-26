// C11 hosted scenario (B38): route HTML, real 404, security headers, lazy Clerk and CSP.
let fail;
const CLERK_HOST = /clerk\.accounts\.dev|clerk\.com/;

export default {
  name: 'c11-delivery',
  requiredStages: ['route-html-and-404', 'security-headers', 'public-page-without-clerk', 'sign-in-intent-loads-clerk', 'signed-in-without-csp-violations'],

  async run({ config, tenants, stage, browser, helpers }) {
    fail = (message) => {
      throw new helpers.SmokeError(message);
    };
    const [a] = tenants;

    await stage('route-html-and-404', async () => {
      const routes = ['/calculators/fire', '/calculators/mortgage', '/calculators/compound-interest', '/calculators/emi', '/calculators/sip'];
      const seen = new Set();
      for (const route of routes) {
        const res = await fetch(`${config.url}${route}`);
        const html = await res.text();
        const title = html.match(/<title>([^<]*)<\/title>/)?.[1];
        const canonical = html.match(/<link rel="canonical" href="([^"]*)"/)?.[1];
        if (res.status !== 200 || !title || seen.has(title) || !canonical?.endsWith(route) || !/index, follow/.test(html) || !/<h1>/.test(html)) {
          fail(`${route}: status ${res.status}, title ${title}, canonical ${canonical}`);
        }
        seen.add(title);
      }
      for (const route of ['/zzz-missing', '/calculators/not-a-real-calc']) {
        const res = await fetch(`${config.url}${route}`);
        const html = await res.text();
        if (res.status !== 404 || !/noindex/.test(html)) fail(`${route} returned ${res.status}`);
      }
      const deepLink = await fetch(`${config.url}/plans/some-plan`);
      if (deepLink.status !== 200) fail(`/plans/* deep link returned ${deepLink.status}`);
      return { titles: [...seen] };
    });

    await stage('security-headers', async () => {
      const res = await fetch(`${config.url}/calculators/fire`);
      const missing = ['content-security-policy', 'strict-transport-security', 'x-content-type-options', 'referrer-policy', 'x-frame-options'].filter((h) => !res.headers.get(h));
      if (missing.length) fail(`missing headers: ${missing.join(', ')}`);
      if (!/frame-ancestors 'none'/.test(res.headers.get('content-security-policy'))) fail('CSP lacks frame-ancestors');
    });

    let anon;
    await stage('public-page-without-clerk', async () => {
      anon = await browser.newAnonymousPage();
      await anon.page.goto(`${config.url}/calculators/fire`, { waitUntil: 'networkidle' });
      const clerkRequests = anon.requests.filter((url) => CLERK_HOST.test(url));
      const violations = await anon.page.evaluate(() => window.__cspViolations);
      if (clerkRequests.length) fail(`public page contacted Clerk: ${clerkRequests.slice(0, 2).join(', ')}`);
      if (violations.length) fail(`CSP violations on public page: ${violations.join('; ')}`);
      if ((await anon.page.locator('h1').first().innerText()) !== 'FIRE Calculator') fail('app did not mount on the public page');
      return { requests: anon.requests.length };
    });

    await stage('sign-in-intent-loads-clerk', async () => {
      const button = anon.page.locator('button:has-text("Sign in")').first();
      await button.click();
      await anon.page.waitForURL((url) => CLERK_HOST.test(url.host), { timeout: 30000 });
      return { redirectedTo: new URL(anon.page.url()).host.replace(/^[^.]+/, '*') };
    });

    await stage('signed-in-without-csp-violations', async () => {
      for (const route of ['/dashboard', '/calculators/fire', '/reports', '/settings']) {
        await a.page.goto(`${config.url}${route}`, { waitUntil: 'networkidle' });
      }
      const violations = await a.page.evaluate(() => window.__cspViolations);
      if (violations.length) fail(`CSP violations while signed in: ${violations.join('; ')}`);
      const signedIn = await a.page.evaluate(() => Boolean(window.Clerk?.user));
      if (!signedIn) fail('signed-in session lost across navigation');
    });
  }
};
