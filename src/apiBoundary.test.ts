// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { onRequest, withErrorCode } from '../functions/api/_middleware';
import { IMPORT_BODY_LIMIT_BYTES, JSON_BODY_LIMIT_BYTES, json } from '../functions/_lib/http';
import { handleApiError, requireDatabase, UserDeletedError } from '../functions/_lib/persistence';
import { onRequestGet as health } from '../functions/api/health';

type Next = (request?: Request) => Promise<Response>;

function run(request: Request, next: Next = async (r) => json({ echoed: r ? await r.text() : '' })) {
  const spy = vi.fn(next);
  const context = { request, next: spy } as unknown as Parameters<typeof onRequest>[0];
  return { response: onRequest(context) as Promise<Response>, next: spy };
}

const post = (path: string, body: BodyInit | null, headers: Record<string, string> = {}) =>
  new Request(`https://preview.test${path}`, { method: 'POST', body, headers: { 'content-type': 'application/json', ...headers }, duplex: 'half' } as RequestInit);

function streamOf(bytes: number, chunk = 16 * 1024): ReadableStream<Uint8Array> {
  let sent = 0;
  return new ReadableStream({
    pull(controller) {
      if (sent >= bytes) return controller.close();
      const size = Math.min(chunk, bytes - sent);
      sent += size;
      controller.enqueue(new Uint8Array(size).fill(32));
    }
  });
}

describe('API request boundary (B41)', () => {
  it('rejects a declared oversized body with 413 before any handler runs', async () => {
    const { response, next } = run(post('/api/goals', '{}', { 'content-length': String(JSON_BODY_LIMIT_BYTES + 1) }));
    const res = await response;
    expect(res.status).toBe(413);
    expect(await res.json()).toMatchObject({ code: 'PAYLOAD_TOO_LARGE', limitBytes: JSON_BODY_LIMIT_BYTES });
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects an undeclared streamed body once it passes the limit', async () => {
    const { response, next } = run(post('/api/plans', streamOf(JSON_BODY_LIMIT_BYTES + 10)));
    expect((await response).status).toBe(413);
    expect(next).not.toHaveBeenCalled();
  });

  it('passes a body exactly at the limit through unchanged', async () => {
    const body = `"${'x'.repeat(JSON_BODY_LIMIT_BYTES - 2)}"`;
    const { response } = run(post('/api/plans', body));
    const res = await response;
    expect(res.status).toBe(200);
    expect(((await res.json()) as { echoed: string }).echoed).toBe(body);
  });

  it('allows larger CSV import payloads only on import routes', async () => {
    const size = JSON_BODY_LIMIT_BYTES * 2;
    expect((await run(post('/api/imports/transactions/preview', streamOf(size))).response).status).toBe(200);
    expect((await run(post('/api/transactions', streamOf(size))).response).status).toBe(413);
    expect((await run(post('/api/imports/transactions/preview', streamOf(IMPORT_BODY_LIMIT_BYTES + 1))).response).status).toBe(413);
  });

  it('does not buffer GET requests and returns handler output', async () => {
    const { response, next } = run(new Request('https://preview.test/api/me'), async () => json({ ok: true }));
    expect((await response).status).toBe(200);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('turns an uncaught handler failure into the shared error shape', async () => {
    const res = await run(post('/api/goals', '{}'), async () => { throw new Error('boom secret detail'); }).response;
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({ code: 'INTERNAL_ERROR', error: 'Unexpected server error.' });
  });

  it('adds a status code to legacy { error } bodies without dropping fields', async () => {
    const res = await withErrorCode(json({ error: 'Plan not found.', planId: 'p' }, 404));
    expect(await res.json()).toEqual({ error: 'Plan not found.', planId: 'p', code: 'NOT_FOUND' });
    const keep = await withErrorCode(json({ code: 'IDEMPOTENCY_CONFLICT', error: 'x' }, 409));
    expect(((await keep.json()) as { code: string }).code).toBe('IDEMPOTENCY_CONFLICT');
    const ok = json({ fine: true });
    expect(await withErrorCode(ok)).toBe(ok);
  });
});

describe('typed deleted-user errors (B41)', () => {
  it('maps the tombstone trigger contract and the typed class to 410', async () => {
    const trigger = new Error('D1_ERROR: USER_DELETED: Cannot insert financial_accounts for deleted user: SQLITE_CONSTRAINT');
    for (const error of [trigger, new UserDeletedError()]) {
      const res = handleApiError(error, 'fallback');
      expect(res.status).toBe(410);
      expect(((await res.json()) as { code: string }).code).toBe('ACCOUNT_DELETED');
    }
  });

  it('does not treat forged text mentioning USER_DELETED as a deleted account', async () => {
    for (const message of ['Invalid name "USER_DELETED"', 'ACCOUNT_DELETED', 'USER_DELETED: please retry']) {
      const res = handleApiError(new Error(message), 'Unable to save.');
      expect(res.status).toBe(500);
      expect(await res.json()).toEqual({ code: 'INTERNAL_ERROR', error: 'Unable to save.' });
    }
  });
});

describe('health and configuration responses (B41)', () => {
  it('health stays public JSON', async () => {
    const res = await health();
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect(await res.json()).toEqual({ ok: true, app: 'interactive-fire-calculator', runtime: 'cloudflare-pages' });
  });

  it('missing database keeps the old flag and adds the shared shape', async () => {
    const result = requireDatabase({});
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(503);
      expect(await result.response.json()).toEqual({ databaseConfigured: false, code: 'DATABASE_NOT_CONFIGURED', error: 'Account storage is not configured.' });
    }
  });
});
