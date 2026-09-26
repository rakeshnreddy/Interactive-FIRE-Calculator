// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PrivacyControlsPanel } from './PrivacyControlsPanel';
import type { PrivacyStatus } from './privacyOutcome';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
const PHRASE = 'DELETE MY FINPATH DATA';

afterEach(() => {
  document.body.innerHTML = '';
});

function render(props: Partial<Parameters<typeof PrivacyControlsPanel>[0]> = {}) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  const all = {
    confirmationPhrase: PHRASE, deleteConfirmation: '', isDeleting: false, isExporting: false, status: null as PrivacyStatus | null,
    onDelete: vi.fn(), onDeleteConfirmationChange: vi.fn(), onExport: vi.fn(), ...props
  };
  act(() => root.render(<PrivacyControlsPanel {...all} />));
  const rerender = (next: Partial<typeof all>) => act(() => root.render(<PrivacyControlsPanel {...all} {...next} />));
  const button = (text: string) => Array.from(container.querySelectorAll('button')).find((b) => b.textContent?.includes(text))!;
  return { container, all, rerender, button };
}

describe('PrivacyControlsPanel (B30)', () => {
  it('uses plain language and states what is and is not deleted', () => {
    const { container } = render();
    const text = container.textContent ?? '';
    expect(text).not.toMatch(/\bD1\b|Clerk/);
    expect(text).toContain('Your sign-in account (email and login)');
    expect(text).toContain('backups expire on their normal schedule');
  });

  it('enables deletion only for the exact phrase and submits once', () => {
    const { button, rerender, all, container } = render();
    expect(button('Delete my data').disabled).toBe(true);
    rerender({ deleteConfirmation: 'delete my finpath data' });
    expect(button('Delete my data').disabled).toBe(true);
    rerender({ deleteConfirmation: PHRASE });
    expect(button('Delete my data').disabled).toBe(false);
    act(() => container.querySelector('form')!.requestSubmit());
    expect(all.onDelete).toHaveBeenCalledTimes(1);
  });

  it('blocks both actions while a request is running', () => {
    const { button, rerender, container, all } = render({ deleteConfirmation: PHRASE, isDeleting: true });
    expect(button('Deleting').disabled).toBe(true);
    expect(button('Download my data').disabled).toBe(true);
    act(() => container.querySelector('form')!.requestSubmit());
    expect(all.onDelete).not.toHaveBeenCalled();
    rerender({ isDeleting: false, isExporting: true });
    expect(button('Preparing download').disabled).toBe(true);
  });

  it('announces errors assertively and moves focus to the outcome', () => {
    const { container, rerender } = render();
    rerender({ status: { kind: 'error', text: 'Deletion did not complete: Network down.' } });
    const status = container.querySelector('.privacy-status')!;
    expect(status.getAttribute('role')).toBe('alert');
    expect(document.activeElement).toBe(status);
    rerender({ status: { kind: 'info', text: 'Deleting your FinPath data…' } });
    expect(container.querySelector('.privacy-status')!.getAttribute('role')).toBe('status');
  });
});
