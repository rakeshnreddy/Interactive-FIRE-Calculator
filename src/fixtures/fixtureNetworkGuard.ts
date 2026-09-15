import {
  populatedBalanceImports,
  syntheticBalancePreview,
  populatedTransactionImports,
  syntheticTransactionPreview
} from './syntheticData';

export type FixtureActionLogger = (name: string, payload?: unknown) => void;

let originalFetch: typeof window.fetch | null = null;
let activeLogger: FixtureActionLogger | null = null;
let currentFixtureState = 'populated';

export function setFixtureGuardState(state: string, logger?: FixtureActionLogger): void {
  currentFixtureState = state;
  if (logger) {
    activeLogger = logger;
  }
}

export function installFixtureNetworkGuard(logger?: FixtureActionLogger): void {
  if (typeof window === 'undefined') return;

  if (logger) {
    activeLogger = logger;
  }

  if (!originalFetch) {
    originalFetch = window.fetch.bind(window);
  }

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const urlString = typeof input === 'string' ? input : input instanceof Request ? input.url : String(input);
    const method = (init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();

    // 1. Intercept Balance Import Endpoints for synthetic inspection
    if (urlString.includes('/api/imports/account-balances')) {
      if (urlString.endsWith('/commit') && method === 'POST') {
        activeLogger?.('CommitBalanceImport', { url: urlString });
        return new Response(
          JSON.stringify({
            importRecord: populatedBalanceImports[0]
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      if (urlString.endsWith('/preview') && method === 'POST') {
        activeLogger?.('PreviewBalanceImport', { url: urlString });
        return new Response(
          JSON.stringify({
            preview: currentFixtureState === 'empty' ? { rows: [], summary: { duplicateRows: 0, errorRows: 0, readyRows: 0, totalRows: 0 } } : syntheticBalancePreview
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      if (method === 'GET') {
        activeLogger?.('LoadBalanceImportHistory', { url: urlString });
        return new Response(
          JSON.stringify({
            imports: currentFixtureState === 'empty' ? [] : populatedBalanceImports
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // 2. Intercept Transaction Import Endpoints for synthetic inspection
    if (urlString.includes('/api/imports/transactions')) {
      if (urlString.endsWith('/commit') && method === 'POST') {
        activeLogger?.('CommitTransactionImport', { url: urlString });
        return new Response(
          JSON.stringify({
            importRecord: populatedTransactionImports[0]
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      if (urlString.endsWith('/preview') && method === 'POST') {
        activeLogger?.('PreviewTransactionImport', { url: urlString });
        return new Response(
          JSON.stringify({
            preview: currentFixtureState === 'empty' ? { rows: [], summary: { duplicateRows: 0, errorRows: 0, readyRows: 0, totalRows: 0 } } : syntheticTransactionPreview
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      if (method === 'GET') {
        activeLogger?.('LoadTransactionImportHistory', { url: urlString });
        return new Response(
          JSON.stringify({
            imports: currentFixtureState === 'empty' ? [] : populatedTransactionImports
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // 3. Intercept Plan Version Endpoints for synthetic inspection
    if (urlString.includes('/api/plans/') && urlString.includes('/versions')) {
      if (method === 'GET') {
        activeLogger?.('LoadPlanVersions', { url: urlString });
        return new Response(
          JSON.stringify({
            versions: currentFixtureState === 'empty' ? [] : [
              {
                versionNumber: 2,
                label: 'Adjusted Safe Withdrawal Rate',
                notes: 'Synthetic version 2 iteration',
                createdAt: '2026-09-10T14:30:00.000Z'
              },
              {
                versionNumber: 1,
                label: 'Initial Baseline',
                notes: 'Synthetic baseline plan',
                createdAt: '2026-09-01T12:00:00.000Z'
              }
            ]
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // 3. Strict mutation lock: REJECT any outgoing mutation to prevent backend writes
    if (method !== 'GET') {
      const errorMsg = `[SYNTHETIC FIXTURE SECURITY VIOLATION] Outgoing network mutation blocked in fixture harness: ${method} ${urlString}`;
      console.error(errorMsg);
      throw new Error(errorMsg);
    }

    // 4. Strict read lock: REJECT any unhandled GET
    const readErrorMsg = `[SYNTHETIC FIXTURE SECURITY VIOLATION] Unrecognized network read blocked in fixture harness: GET ${urlString}`;
    console.error(readErrorMsg);
    throw new Error(readErrorMsg);
  };
}

export function restoreNetworkGuard(): void {
  if (typeof window !== 'undefined' && originalFetch) {
    window.fetch = originalFetch;
    originalFetch = null;
    activeLogger = null;
  }
}
