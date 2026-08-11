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
  buildTransactionCsvTemplate,
  parseTransactionCsv,
  TRANSACTION_CSV_HEADERS,
  type TransactionCsvRow
} from './lib/transactionCsv';

type ImportAccount = {
  id: string;
  name: string;
};

type TransactionImportPreviewRow = {
  accountId: string | null;
  accountName: string;
  amountCents: number | null;
  category: string | null;
  description: string;
  message: string;
  notes: string | null;
  rowNumber: number;
  status: 'ready' | 'duplicate' | 'error';
  transactionDate: string;
  transactionType: 'income' | 'expense' | 'transfer' | 'adjustment' | null;
};

type TransactionImportPreview = {
  rows: TransactionImportPreviewRow[];
  summary: {
    duplicateRows: number;
    errorRows: number;
    readyRows: number;
    totalRows: number;
  };
};

type TransactionImportRecord = {
  createdAt: string;
  duplicateRows: number;
  errorRows: number;
  fileName: string;
  id: string;
  importedRows: number;
  totalRows: number;
};

type TransactionImportPanelProps = {
  accounts: ImportAccount[];
  auth: Extract<AuthState, { status: 'signed-in' }>;
  onImportComplete: () => Promise<void>;
};

type PendingImport = {
  fileName: string;
  rows: TransactionCsvRow[];
};

export function TransactionImportPanel({ accounts, auth, onImportComplete }: TransactionImportPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pendingImport, setPendingImport] = useState<PendingImport | null>(null);
  const [preview, setPreview] = useState<TransactionImportPreview | null>(null);
  const [history, setHistory] = useState<TransactionImportRecord[]>([]);
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
        if (!cancelled) setMessage('Transaction import history could not be loaded.');
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
      const parsed = parseTransactionCsv(await file.text());

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
          ? `${reviewed.summary.readyRows} transaction ${reviewed.summary.readyRows === 1 ? 'row is' : 'rows are'} ready for review.`
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
    setMessage('Importing reviewed transactions...');

    try {
      const result = await commitReviewedImport(auth, pendingImport);
      setHistory((current) => [result.importRecord, ...current.filter((item) => item.id !== result.importRecord.id)].slice(0, 12));
      setPendingImport(null);
      setPreview(null);
      setMessage(`${result.importRecord.importedRows} ${result.importRecord.importedRows === 1 ? 'transaction' : 'transactions'} imported from ${result.importRecord.fileName}. Account balances were not changed.`);

      try {
        await onImportComplete();
      } catch {
        setMessage('Transactions were imported, but the ledger could not be refreshed.');
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Reviewed transactions could not be imported.');
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
    const csv = buildTransactionCsvTemplate(accounts);
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'finpath-transaction-import.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="transaction-import-panel" aria-labelledby="transaction-import-title">
      <div className="panel-heading balance-import-heading">
        <div>
          <p className="eyebrow">CSV import</p>
          <h2 id="transaction-import-title">Review transaction rows</h2>
          <p>Import income, expenses, transfers, and adjustments only after row-level review. Balance history stays unchanged.</p>
        </div>
        <div className="balance-import-heading-actions">
          <button className="secondary-button icon-text-button" type="button" onClick={downloadTemplate}>
            <Download size={16} />
            Template
          </button>
          <button
            className="primary-button icon-text-button"
            disabled={isReviewing || isCommitting}
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

      <div className="csv-contract" aria-label="Required transaction CSV headers">
        {TRANSACTION_CSV_HEADERS.map((header) => <code key={header}>{header}</code>)}
        <small>Maximum 500 rows · 256 KB</small>
      </div>

      {message ? <p className="transaction-status-copy" role="status" aria-live="polite">{message}</p> : null}

      {preview ? (
        <div className="balance-import-review">
          <div className="import-summary-strip" aria-label="Transaction import review summary">
            <article><span>Total</span><strong>{preview.summary.totalRows}</strong></article>
            <article className="import-ready"><span>Ready</span><strong>{preview.summary.readyRows}</strong></article>
            <article className="import-duplicate"><span>Duplicates</span><strong>{preview.summary.duplicateRows}</strong></article>
            <article className="import-error"><span>Rejected</span><strong>{preview.summary.errorRows}</strong></article>
          </div>

          <div className="import-table-wrap">
            <table className="import-review-table transaction-import-table">
              <thead>
                <tr>
                  <th>Row</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Description</th>
                  <th>Amount</th>
                  <th>Account</th>
                  <th>Review</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((row) => (
                  <tr key={row.rowNumber}>
                    <td>{row.rowNumber}</td>
                    <td><ImportStatus status={row.status} /></td>
                    <td>{row.transactionDate || '-'}</td>
                    <td>{row.transactionType ?? '-'}</td>
                    <td>{row.description || '-'}</td>
                    <td>{row.amountCents === null ? '-' : formatImportCents(row.amountCents)}</td>
                    <td>{row.accountName}</td>
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
              Import {preview.summary.readyRows} {preview.summary.readyRows === 1 ? 'transaction' : 'transactions'}
            </button>
            <button className="secondary-button icon-text-button" disabled={isCommitting} type="button" onClick={resetReview}>
              <RotateCcw size={16} />
              Clear review
            </button>
          </div>
        </div>
      ) : null}

      <div className="import-history" aria-label="Recent transaction imports">
        <div className="import-history-heading">
          <Clock3 size={16} />
          <strong>Recent transaction imports</strong>
        </div>
        {isLoadingHistory ? (
          <p className="empty-inline">Loading import history...</p>
        ) : history.length === 0 ? (
          <p className="empty-inline">No transaction CSV imports yet.</p>
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

function ImportStatus({ status }: { status: TransactionImportPreviewRow['status'] }) {
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
): Promise<TransactionImportRecord[]> {
  const body = await importRequest(auth, '/api/imports/transactions');
  return isRecord(body) && Array.isArray(body.imports)
    ? body.imports.filter(isTransactionImportRecord)
    : [];
}

async function previewImport(
  auth: Extract<AuthState, { status: 'signed-in' }>,
  payload: PendingImport
): Promise<TransactionImportPreview> {
  const body = await importRequest(auth, '/api/imports/transactions/preview', {
    body: JSON.stringify(payload),
    method: 'POST'
  });

  if (!isRecord(body) || !isTransactionImportPreview(body.preview)) {
    throw new Error('Import preview response is invalid.');
  }

  return body.preview;
}

async function commitReviewedImport(
  auth: Extract<AuthState, { status: 'signed-in' }>,
  payload: PendingImport
): Promise<{ importRecord: TransactionImportRecord }> {
  const body = await importRequest(auth, '/api/imports/transactions/commit', {
    body: JSON.stringify(payload),
    method: 'POST'
  });

  if (!isRecord(body) || !isTransactionImportRecord(body.importRecord)) {
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

function isTransactionImportPreview(value: unknown): value is TransactionImportPreview {
  return isRecord(value) && Array.isArray(value.rows) && isRecord(value.summary);
}

function isTransactionImportRecord(value: unknown): value is TransactionImportRecord {
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

function formatImportCents(cents: number): string {
  return new Intl.NumberFormat(undefined, {
    currency: 'USD',
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
