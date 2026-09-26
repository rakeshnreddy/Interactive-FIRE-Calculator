/// <reference types="@cloudflare/workers-types" />
import { apiError, bodyLimitFor, readBodyWithinLimit } from '../_lib/http';

// Runs before every /api handler (B41): caps request bodies so no endpoint can be sent an unbounded
// payload, and turns uncaught failures into the shared { code, error } shape.
export const onRequest: PagesFunction = async (context) => {
  const { request } = context;
  const method = request.method.toUpperCase();
  let forwarded: Request = request;

  if (method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS') {
    const limit = bodyLimitFor(new URL(request.url).pathname);
    const declared = Number(request.headers.get('content-length'));
    if (Number.isFinite(declared) && declared > limit) {
      return apiError(413, 'PAYLOAD_TOO_LARGE', `Request body is larger than ${limit} bytes.`, { limitBytes: limit });
    }
    const body = await readBodyWithinLimit(request, limit);
    if (body === null) {
      return apiError(413, 'PAYLOAD_TOO_LARGE', `Request body is larger than ${limit} bytes.`, { limitBytes: limit });
    }
    forwarded = new Request(request.url, {
      method: request.method,
      headers: request.headers,
      body: body.byteLength ? (body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength) as ArrayBuffer) : null
    }) as unknown as Request;
  }

  let response: Response;
  try {
    response = await context.next(forwarded as Parameters<typeof context.next>[0]);
  } catch {
    return apiError(500, 'INTERNAL_ERROR', 'Unexpected server error.');
  }
  return withErrorCode(response);
};

const STATUS_CODES: Record<number, string> = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  405: 'METHOD_NOT_ALLOWED',
  409: 'CONFLICT',
  410: 'GONE',
  413: 'PAYLOAD_TOO_LARGE',
  500: 'INTERNAL_ERROR',
  503: 'SERVICE_UNAVAILABLE'
};

// Adds a status-derived `code` to JSON error bodies that only carry `error`; all existing fields
// are kept so current clients keep working.
export async function withErrorCode(response: Response): Promise<Response> {
  if (response.ok || !(response.headers.get('content-type') ?? '').includes('application/json')) return response;
  let body: unknown;
  try {
    body = await response.clone().json();
  } catch {
    return response;
  }
  if (typeof body !== 'object' || body === null || Array.isArray(body) || 'code' in body) return response;
  const code = STATUS_CODES[response.status] ?? `HTTP_${response.status}`;
  const record = body as Record<string, unknown>;
  const error = typeof record.error === 'string' ? record.error : 'Request failed.';
  return new Response(JSON.stringify({ ...record, code, error }), { status: response.status, headers: response.headers });
}
