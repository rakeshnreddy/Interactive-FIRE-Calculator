const baseUrl = (process.argv[2] || '').replace(/\/+$/, '');

if (!baseUrl) {
  console.error('Usage: npm run smoke:calculators -- https://example.pages.dev');
  process.exit(1);
}

const sitemapResponse = await fetch(`${baseUrl}/sitemap.xml`, {
  headers: { 'user-agent': 'FinPath public calculator smoke check' }
});

if (!sitemapResponse.ok) {
  throw new Error(`Sitemap returned ${sitemapResponse.status}.`);
}

const sitemap = await sitemapResponse.text();
const paths = [...sitemap.matchAll(/<loc>[^<]+(\/calculators(?:\/[^<]+)?)<\/loc>/g)]
  .map((match) => match[1])
  .filter((path, index, values) => values.indexOf(path) === index);

if (paths.length < 2) {
  throw new Error('No calculator routes were found in the sitemap.');
}

const failures = [];
const concurrency = 10;

for (let index = 0; index < paths.length; index += concurrency) {
  const batch = paths.slice(index, index + concurrency);
  const results = await Promise.all(batch.map(async (path) => {
    const response = await fetch(`${baseUrl}${path}`, {
      headers: { 'user-agent': 'FinPath public calculator smoke check' },
      redirect: 'follow'
    });
    const body = await response.text();
    return {
      body,
      path,
      status: response.status,
      wwwAuthenticate: response.headers.get('www-authenticate')
    };
  }));

  for (const result of results) {
    if (result.status !== 200 || result.wwwAuthenticate || !result.body.includes('<div id="root"></div>')) {
      failures.push(`${result.path}: status=${result.status}, auth=${Boolean(result.wwwAuthenticate)}, spa=${result.body.includes('<div id="root"></div>')}`);
    }
  }
}

if (failures.length > 0) {
  throw new Error(`Public calculator smoke failures:\n${failures.join('\n')}`);
}

console.log(`Verified ${paths.length} public calculator routes without authentication at ${baseUrl}.`);
