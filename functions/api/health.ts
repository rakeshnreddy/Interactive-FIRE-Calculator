export const onRequestGet = async () => {
  return new Response(
    JSON.stringify({
      ok: true,
      app: 'interactive-fire-calculator',
      runtime: 'cloudflare-pages'
    }),
    {
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store'
      }
    }
  );
};
