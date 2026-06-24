import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Download,
  FileUp,
  RotateCcw
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { AuthState } from './auth';
import {
  BALANCE_CSV_HEADERS,
  buildBalanceCsvTemplate,
  parseBalanceCsv,
  type BalanceCsvRow
} from './lib/balanceCsv';

type ImportAccount = {
  currency: string;
  id: string;
  name: string;
};

type BalanceImportPreviewRow = {
  accountId: string | null;
  accountName: string;
  balanceCents: number | null;
  balanceDate: string;
  currency: string;
  message: string;
  rowNumber: number;
  status: 'ready' | 'duplicate' | 'error';
};

type BalanceImportPreview = {
  rows: BalanceImportPreviewRow[];
  summary: {
    duplicateRows: number;
    errorRows: number;
    readyRows: number;
    totalRows: number;
  };
};

type BalanceImportRecord = {
  createdAt: string;
  duplicateRows: number;
  errorRows: number;
  fileName: string;
  id: string;
  importedRows: number;
  totalRows: number;
};

type BalanceImportPanelProps = {
  accounts: ImportAccount[];
  auth: Extract<AuthState, { status: 'signed-in' }>;
  onImportComplete: () => Promise<void>;
};

type PendingImport = {
  fileName: string;
  rows: BalanceCsvRow[];
};

export function BalanceImportPanel({ accounts, auth, onImportComplete }: BalanceImportPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pendingImport, setPendingImport] = useState<PendingImport | null>(null);
  const [preview, setPreview] = useState<BalanceImportPreview | null>(null);
  const [history, setHistory] = useState<BalanceImportRecord[]>([]);
  const [message, setMessage] = useState('');
  const [isReviewing, setIsReviewing] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setIsLoadingHistory(true);

    loadImportHistory(auth)
      .then((items) => {
        if (!cancelled) setHistory(items);
      })
      .catch(() => {
        if (!cancelled) setMessage('Import history could not be loaded.');
      })
      .finally(() => {
        if (!cancelled) setIsLoadingHistory(false);
      });

    return () => {
      cancelled = true;
    };
  }, [auth.getToken, auth.user.id]);

  const reviewFile = async (file: File) => {
    setIsReviewing(true);
    setPreview(null);
    setMessage('Reading CSV...');

    try {
      const parsed = parseBalanceCsv(await file.text());

      if (!parsed.ok) {
        setPendingImport(null);
        setMessage(parsed.error);
        return;
      }

      const payload = { fileName: file.name, rows: parsed.rows };
      const reviewed = await previewImport(auth, payload);
      setPendingImport(payload);
      setPreview(reviewed);
      setMessage(
        reviewed.summary.readyRows > 0
          ? `${reviewed.summary.readyRows} balance ${reviewed.summary.readyRows === 1 ? 'row is' : 'rows are'} ready for review.`
          : 'No rows are ready to import.'
      );
    } catch (error) {
      setPendingImport(null);
      setMessage(error instanceof Error ? error.message : 'CSV could not be reviewed.');
    } finally {
      setIsReviewing(false);
    }
  };

  const commitImport = async () => {
    if (!pendingImport || !preview || preview.summary.readyRows === 0) return;

    setIsCommitting(true);
    setMessage('Importing reviewed balances...');

    try {
      const result = await commitReviewedImport(auth, pendingImport);
      setHistory((current) => [result.importRecord, ...current.filter((item) => item.id !== result.importRecord.id)].slice(0, 12));
      setPendingImport(null);
      setPreview(null);
      setMessage(`${result.importRecord.importedRows} ${result.importRecord.importedRows === 1 ? 'balance' : 'balances'} imported from ${result.importRecord.fileName}.`);

      try {
        await onImportComplete();
      } catch {
        setMessage('Balances were imported, but the account list could not be refreshed.');
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Reviewed balances could not be imported.');
    } finally {
      setIsCommitting(false);
    }
  };

  const resetReview = () => {
    setPendingImport(null);
    setPreview(null);
    setMessage('');
    if (inputRef.current) inputRef.current.value = '';
  };

  const downloadTemplate = () => {
    const csv = buildBalanceCsvTemplate(accounts);
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'finpath-balance-import.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="account-panel balance-import-panel" aria-labelledby="balance-import-title">
      <div className="panel-heading balance-import-heading">
        <div>
          <p className="eyebrow">CSV import</p>
          <h2 id="balance-import-title">Review balance snapshots</h2>
          <p>Match account, date, amount, and currency before adding any balance history.</p>
        </div>
        <div className="balance-import-heading-actions">
          <button className="secondary-button icon-text-button" type="button" onClick={downloadTemplate}>
            <Download size={16} />
            Template
          </button>
          <button
            className="primary-button icon-text-button"
            disabled={accounts.length === 0 || isReviewing || isCommitting}
            type="button"
            onClick={() => inputRef.current?.click()}
          >
            <FileUp size={16} />
            Select CSV
          </button>
          <input
            ref={inputRef}
            className="visually-hidden"
            type="file"
            accept=".csv,text/csv"
            tabIndex={-1}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void reviewFile(file);
              event.target.value = '';
            }}
          />
        </div>
      </div>

      <div className="csv-contract" aria-label="Required CSV headers">
        {BALANCE_CSV_HEADERS.map((header) => <code key={header}>{header}</code>)}
        <small>Maximum 500 rows · 256 KB</small>
      </div>

      {message ? <p className="account-status" role="status" aria-live="polite">{message}</p> : null}

      {preview ? (
        <div className="balance-import-review">
          <div className="import-summary-strip" aria-label="Import review summary">
            <article><span>Total</span><strong>{preview.summary.totalRows}</strong></article>
            <article className="import-ready"><span>Ready</span><strong>{preview.summary.readyRows}</strong></article>
            <article className="import-duplicate"><span>Duplicates</span><strong>{preview.summary.duplicateRows}</strong></article>
            <article className="import-error"><span>Rejected</span><strong>{preview.summary.errorRows}</strong></article>
          </div>

          <div className="import-table-wrap">
            <table className="import-review-table">
              <thead>
                <tr>
                  <th>Row</th>
                  <th>Status</th>
                  <th>Account</th>
                  <th>Date</th>
                  <th>Balance</th>
                  <th>Review</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((row) => (
                  <tr key={row.rowNumber}>
                    <td>{row.rowNumber}</td>
                    <td><ImportStatus status={row.status} /></td>
                    <td>{row.accountName}</td>
                    <td>{row.balanceDate || '—'}</td>
                    <td>{row.balanceCents === null ? '—' : formatImportCents(row.balanceCents, row.currency)}</td>
                    <td>{row.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="balance-import-actions">
            <button
              className="primary-button icon-text-button"
              disabled={isCommitting || preview.summary.readyRows === 0}
              type="button"
              onClick={commitImport}
            >
              <CheckCircle2 size={16} />
              Import {preview.summary.readyRows} {preview.summary.readyRows === 1 ? 'balance' : 'balances'}
            </button>
            <button className="secondary-button icon-text-button" disabled={isCommitting} type="button" onClick={resetReview}>
              <RotateCcw size={16} />
              Clear review
            </button>
          </div>
        </div>
      ) : null}

      <div className="import-history" aria-label="Recent balance imports">
        <div className="import-history-heading">
          <Clock3 size={16} />
          <strong>Recent imports</strong>
        </div>
        {isLoadingHistory ? (
          <p className="empty-inline">Loading import history...</p>
        ) : history.length === 0 ? (
          <p className="empty-inline">No balance CSV imports yet.</p>
        ) : (
          <div className="import-history-list">
            {history.map((item) => (
              <article key={item.id}>
                <div>
                  <strong>{item.fileName}</strong>
                  <small>{formatImportDate(item.createdAt)}</small>
                </div>
                <span>{item.importedRows} imported</span>
                <small>{item.duplicateRows} duplicates · {item.errorRows} rejected</small>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function ImportStatus({ status }: { status: BalanceImportPreviewRow['status'] }) {
  if (status === 'ready') {
    return <span className="import-status import-status-ready"><CheckCircle2 size={14} /> Ready</span>;
  }

  return (
    <span className={`import-status import-status-${status}`}>
      <AlertTriangle size={14} />
      {status === 'duplicate' ? 'Duplicate' : 'Rejected'}
    </span>
  );
}

async function loadImportHistory(
  auth: Extract<AuthState, { status: 'signed-in' }>
): Promise<BalanceImportRecord[]> {
  const body = await importRequest(auth, '/api/imports/account-balances');
  return isRecord(body) && Array.isArray(body.imports)
    ? body.imports.filter(isBalanceImportRecord)
    : [];
}

async function previewImport(
  auth: Extract<AuthState, { status: 'signed-in' }>,
  payload: PendingImport
): Promise<BalanceImportPreview> {
  const body = await importRequest(auth, '/api/imports/account-balances/preview', {
    body: JSON.stringify(payload),
    method: 'POST'
  });

  if (!isRecord(body) || !isBalanceImportPreview(body.preview)) {
    throw new Error('Import preview response is invalid.');
  }

  return body.preview;
}

async function commitReviewedImport(
  auth: Extract<AuthState, { status: 'signed-in' }>,
  payload: PendingImport
): Promise<{ importRecord: BalanceImportRecord }> {
  const body = await importRequest(auth, '/api/imports/account-balances/commit', {
    body: JSON.stringify(payload),
    method: 'POST'
  });

  if (!isRecord(body) || !isBalanceImportRecord(body.importRecord)) {
    throw new Error('Import commit response is invalid.');
  }

  return { importRecord: body.importRecord };
}

async function importRequest(
  auth: Extract<AuthState, { status: 'signed-in' }>,
  path: string,
  init: RequestInit = {}
): Promise<unknown> {
  const token = await auth.getToken();
  if (!token) throw new Error('No Clerk session token is available.');

  const headers = new Headers(init.headers);
  headers.set('authorization', `Bearer ${token}`);
  if (init.body) headers.set('content-type', 'application/json');

  const response = await fetch(path, { ...init, headers });
  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(isRecord(body) && typeof body.error === 'string' ? body.error : 'Import request failed.');
  }

  return body;
}

function isBalanceImportPreview(value: unknown): value is BalanceImportPreview {
  return isRecord(value) && Array.isArray(value.rows) && isRecord(value.summary);
}

function isBalanceImportRecord(value: unknown): value is BalanceImportRecord {
  return isRecord(value)
    && typeof value.id === 'string'
    && typeof value.fileName === 'string'
    && typeof value.createdAt === 'string'
    && typeof value.totalRows === 'number'
    && typeof value.importedRows === 'number'
    && typeof value.duplicateRows === 'number'
    && typeof value.errorRows === 'number';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function formatImportCents(cents: number, currency: string): string {
  return new Intl.NumberFormat(undefined, {
    currency: /^[A-Z]{3}$/.test(currency) ? currency : 'USD',
    maximumFractionDigits: 2,
    style: 'currency'
  }).format(cents / 100);
}

function formatImportDate(value: string): string {
  return new Date(value).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}
