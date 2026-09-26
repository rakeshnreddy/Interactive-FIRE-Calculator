import { describe, expect, it } from 'vitest';
import { deletionFailure, exportFailure, summarizeDeletion } from './privacyOutcome';

describe('privacy outcomes', () => {
  it('reports success only when the server confirms, with the real record count', () => {
    const status = summarizeDeletion({ deletion: { localAccountDataDeleted: true, deletedAt: '2026-09-26T10:00:00Z', deletedRows: { goals: 2, plans: 1, transactions: 7 } } });
    expect(status.kind).toBe('success');
    expect(status.text).toContain('Deleted 10 saved records from your FinPath data on 2026-09-26');
    expect(status.text).toContain('Your sign-in account still exists');
    expect(status.text).not.toMatch(/D1|Clerk/);
  });

  it('never claims success without server confirmation', () => {
    for (const body of [null, {}, { deletion: { localAccountDataDeleted: false } }, { deletion: 'yes' }]) {
      expect(summarizeDeletion(body).kind).toBe('error');
    }
  });

  it('explains failures as recoverable', () => {
    expect(deletionFailure(new Error('Network down.')).text).toBe('Deletion did not complete: Network down. Your data was not marked as deleted; you can try again.');
    expect(exportFailure(null).text).toContain('Nothing was downloaded');
  });
});
