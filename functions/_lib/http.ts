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

// One error shape for every API failure: { code, error } plus optional compatible extras.
export function apiError(status: number, code: string, error: string, extra: Record<string, unknown> = {}): Response {
  return json({ ...extra, code, error }, status);
}

// Request-size limits enforced for every /api request by functions/api/_middleware.ts (B41).
export const JSON_BODY_LIMIT_BYTES = 256 * 1024;
export const IMPORT_BODY_LIMIT_BYTES = 1024 * 1024;

export function bodyLimitFor(pathname: string): number {
  return pathname.startsWith('/api/imports/') ? IMPORT_BODY_LIMIT_BYTES : JSON_BODY_LIMIT_BYTES;
}

// Reads at most `limit` bytes; returns null when the stream is longer so the caller can answer 413
// without buffering an unbounded body.
export async function readBodyWithinLimit(request: Request, limit: number): Promise<Uint8Array | null> {
  if (!request.body) return new Uint8Array(0);
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > limit) {
      await reader.cancel().catch(() => {});
      return null;
    }
    chunks.push(value);
  }
  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}

// Shared JSON body reader for handlers. Size is already capped by the middleware; malformed JSON
// yields null so each parser answers with its own 400 validation message.
export async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
