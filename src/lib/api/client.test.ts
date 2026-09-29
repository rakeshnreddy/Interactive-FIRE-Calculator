import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { authenticatedJsonRequest, readApiJson, type SignedInAuth } from './client';

describe('authenticatedJsonRequest', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  const mockAuth = (token: string | null = 'mock-jwt-token'): SignedInAuth => ({
    provider: 'clerk',
    status: 'signed-in',
    isConfigured: true,
    isSignedIn: true,
    user: { id: 'user_123', email: 'test@example.com', displayName: 'Test User' },
    getToken: vi.fn().mockResolvedValue(token)
  });

  it('throws descriptive error if token is null or missing', async () => {
    const auth = mockAuth(null);
    await expect(authenticatedJsonRequest(auth, '/api/test')).rejects.toThrow(
      'No Clerk session token is available.'
    );
  });

  it('attaches authorization header and default json content-type for body', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
    globalThis.fetch = fetchMock;

    const auth = mockAuth('valid-token');
    await authenticatedJsonRequest(auth, '/api/test', {
      method: 'POST',
      body: JSON.stringify({ key: 'val' })
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [calledUrl, calledInit] = fetchMock.mock.calls[0];
    expect(calledUrl).toBe('/api/test');
    expect(calledInit.method).toBe('POST');

    const headers = new Headers(calledInit.headers);
    expect(headers.get('authorization')).toBe('Bearer valid-token');
    expect(headers.get('content-type')).toBe('application/json');
  });

  it('preserves existing custom headers', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
    globalThis.fetch = fetchMock;

    const auth = mockAuth('valid-token');
    await authenticatedJsonRequest(auth, '/api/test', {
      headers: {
        'x-custom-header': 'custom-value',
        'content-type': 'application/vnd.api+json'
      }
    });

    const [, calledInit] = fetchMock.mock.calls[0];
    const headers = new Headers(calledInit.headers);
    expect(headers.get('authorization')).toBe('Bearer valid-token');
    expect(headers.get('x-custom-header')).toBe('custom-value');
    expect(headers.get('content-type')).toBe('application/vnd.api+json');
  });
});

describe('readApiJson', () => {
  const consoleLogSpy = vi.spyOn(console, 'log');
  const consoleErrorSpy = vi.spyOn(console, 'error');

  afterEach(() => {
    consoleLogSpy.mockClear();
    consoleErrorSpy.mockClear();
  });

  it('parses valid JSON and returns validator result on 200 OK', async () => {
    const response = new Response(JSON.stringify({ id: 'plan-1', name: 'Retirement' }), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    });

    const result = await readApiJson(
      response,
      'Failed to load plan.',
      (data) => (data && typeof data === 'object' && 'id' in data ? (data as { id: string }) : null)
    );

    expect(result.id).toBe('plan-1');
    expect(consoleLogSpy).not.toHaveBeenCalled();
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('rejects on 401 Unauthorized with provided error message without logging', async () => {
    const response = new Response(JSON.stringify({ error: 'Unauthorized', token: 'secret-token-123' }), {
      status: 401
    });

    await expect(readApiJson(response, 'Authentication required.', (d) => d)).rejects.toThrow(
      'Authentication required.'
    );
    expect(consoleLogSpy).not.toHaveBeenCalled();
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('rejects on 403 Forbidden with provided error message', async () => {
    const response = new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403
    });

    await expect(readApiJson(response, 'Access denied.', (d) => d)).rejects.toThrow('Access denied.');
  });

  it('rejects on 404 / 410 resource errors with provided error message', async () => {
    const notFoundResponse = new Response('Not Found', { status: 404 });
    await expect(readApiJson(notFoundResponse, 'Item not found.', (d) => d)).rejects.toThrow(
      'Item not found.'
    );

    const goneResponse = new Response('Gone', { status: 410 });
    await expect(readApiJson(goneResponse, 'Item no longer exists.', (d) => d)).rejects.toThrow(
      'Item no longer exists.'
    );
  });

  it('rejects on non-JSON server errors (e.g. 500 HTML response)', async () => {
    const response = new Response('<html><body>500 Internal Server Error</body></html>', {
      status: 500,
      headers: { 'content-type': 'text/html' }
    });

    await expect(readApiJson(response, 'Server error occurred.', (d) => d)).rejects.toThrow(
      'Server error occurred.'
    );
    expect(consoleLogSpy).not.toHaveBeenCalled();
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('rejects with SyntaxError on empty successful response body (empty 200 OK)', async () => {
    const response = new Response('', {
      status: 200,
      headers: { 'content-type': 'application/json' }
    });

    await expect(readApiJson(response, 'Empty response received.', (d) => d)).rejects.toThrow(
      SyntaxError
    );
  });

  it('rejects with SyntaxError on malformed JSON body (200 OK)', async () => {
    const response = new Response('{"badJson: true', {
      status: 200,
      headers: { 'content-type': 'application/json' }
    });

    await expect(readApiJson(response, 'Invalid response data.', (d) => d)).rejects.toThrow(
      SyntaxError
    );
  });

  it('rejects when validator returns null', async () => {
    const response = new Response(JSON.stringify({ invalidStructure: true }), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    });

    await expect(
      readApiJson(
        response,
        'Schema validation failed.',
        (data: any) => (data?.expectedField ? data : null)
      )
    ).rejects.toThrow('Schema validation failed.');
  });
});
