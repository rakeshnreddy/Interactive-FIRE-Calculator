// Turns the server's deletion response into an honest outcome message (B30). Success is only
// reported when the server confirms deletion; the sign-in account is never described as deleted.
export type PrivacyStatus = { kind: 'info' | 'success' | 'error'; text: string };

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

export function summarizeDeletion(body: unknown): PrivacyStatus {
  const deletion = isRecord(body) && isRecord(body.deletion) ? body.deletion : null;
  if (!deletion || deletion.localAccountDataDeleted !== true) {
    return { kind: 'error', text: 'The server did not confirm deletion, so nothing is shown as deleted. Please try again.' };
  }
  const rows = isRecord(deletion.deletedRows) ? Object.values(deletion.deletedRows) : [];
  const total = rows.reduce<number>((sum, value) => sum + (typeof value === 'number' && Number.isFinite(value) ? value : 0), 0);
  const when = typeof deletion.deletedAt === 'string' ? deletion.deletedAt.slice(0, 10) : 'today';
  return {
    kind: 'success',
    text: `Deleted ${total} saved record${total === 1 ? '' : 's'} from your FinPath data on ${when}, and cleared drafts saved in this browser. Your sign-in account still exists: sign out, or delete it from your account profile.`
  };
}

export function deletionFailure(error: unknown): PrivacyStatus {
  const reason = error instanceof Error && error.message ? error.message : 'Unable to delete account data.';
  return { kind: 'error', text: `Deletion did not complete: ${reason} Your data was not marked as deleted; you can try again.` };
}

export function exportFailure(error: unknown): PrivacyStatus {
  const reason = error instanceof Error && error.message ? error.message : 'Account data export failed.';
  return { kind: 'error', text: `Export did not complete: ${reason} Nothing was downloaded; you can try again.` };
}
