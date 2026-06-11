export const JSON_HEADERS = {
  'cache-control': 'no-store',
  'content-type': 'application/json; charset=utf-8'
} satisfies HeadersInit;

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    headers: JSON_HEADERS,
    status
  });
}
