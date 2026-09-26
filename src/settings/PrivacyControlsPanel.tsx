import { useEffect, useRef } from 'react';
import { Download, ShieldCheck, Trash2 } from 'lucide-react';
import { Field } from '../components/Field';
import type { PrivacyStatus } from './privacyOutcome';

// Export and deletion controls (B30). Copy follows docs/DATA_DELETION_AND_RECOVERY.md: FinPath
// records are hard-deleted, the sign-in account is not, and provider backups expire on schedule.
export function PrivacyControlsPanel({
  confirmationPhrase,
  deleteConfirmation,
  isDeleting,
  isExporting,
  status,
  onDelete,
  onDeleteConfirmationChange,
  onExport
}: {
  confirmationPhrase: string;
  deleteConfirmation: string;
  isDeleting: boolean;
  isExporting: boolean;
  status: PrivacyStatus | null;
  onDelete: () => void;
  onDeleteConfirmationChange: (value: string) => void;
  onExport: () => void;
}) {
  const statusRef = useRef<HTMLParagraphElement>(null);
  const busy = isDeleting || isExporting;
  const canDelete = deleteConfirmation.trim() === confirmationPhrase && !busy;

  useEffect(() => {
    if (status && status.kind !== 'info') statusRef.current?.focus();
  }, [status]);

  return (
    <section className="profile-editor privacy-controls-panel" aria-labelledby="privacy-controls-title" aria-busy={busy}>
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Privacy controls</p>
          <h2 id="privacy-controls-title">Export or delete your saved data</h2>
          <p>
            These controls cover everything FinPath stores for your account: profile defaults, accounts, balances,
            transactions, goals, plans and their versions, monthly reviews, saved calculator results and import history.
          </p>
        </div>
        <span className="feature-icon">
          <ShieldCheck size={20} aria-hidden="true" />
        </span>
      </div>

      <ul className="privacy-scope-list" aria-label="What export and deletion cover">
        <li>
          <strong>Deleted</strong>
          <span>All saved FinPath records for this account, plus FinPath drafts saved in this browser.</span>
        </li>
        <li>
          <strong>Not deleted</strong>
          <span>
            Your sign-in account (email and login), drafts on other devices, and standard request logs. Encrypted
            service backups expire on their normal schedule and are never restored with your data reinstated.
          </span>
        </li>
        <li>
          <strong>After deletion</strong>
          <span>You stay signed in until you sign out. New saves start from an empty account.</span>
        </li>
      </ul>

      <div className="privacy-action-row">
        <div>
          <strong>Download a copy (JSON)</strong>
          <small>Includes your saved records. Keep the file somewhere private; download it before deleting if you may need it.</small>
        </div>
        <button className="secondary-button icon-text-button" disabled={busy} type="button" onClick={onExport}>
          <Download size={16} aria-hidden="true" />
          {isExporting ? 'Preparing download…' : 'Download my data'}
        </button>
      </div>

      <form
        className="privacy-delete-form"
        onSubmit={(event) => {
          event.preventDefault();
          if (canDelete) onDelete();
        }}
      >
        <div>
          <strong>Delete my FinPath data</strong>
          <small id="delete-account-data-help">
            This cannot be undone. Type <strong>{confirmationPhrase}</strong> to confirm.
          </small>
        </div>
        <Field label="Confirmation">
          <input
            aria-describedby="delete-account-data-help"
            autoComplete="off"
            disabled={busy}
            type="text"
            value={deleteConfirmation}
            onChange={(event) => onDeleteConfirmationChange(event.target.value)}
          />
        </Field>
        <button className="secondary-button danger-button icon-text-button" disabled={!canDelete} type="submit">
          <Trash2 size={16} aria-hidden="true" />
          {isDeleting ? 'Deleting…' : 'Delete my data'}
        </button>
      </form>

      {status ? (
        <p
          ref={statusRef}
          tabIndex={-1}
          className={`profile-status privacy-status privacy-status-${status.kind}`}
          role={status.kind === 'error' ? 'alert' : 'status'}
          aria-live={status.kind === 'error' ? 'assertive' : 'polite'}
        >
          {status.text}
        </p>
      ) : null}
    </section>
  );
}
