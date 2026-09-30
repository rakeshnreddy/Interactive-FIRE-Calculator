import type { ReactNode } from 'react';
import { ArrowDownRight, ChevronDown, SlidersHorizontal } from 'lucide-react';

export type CustomizationLink = { id: string; label: string; summary: string };

/** Opens the actual controls, rather than a second copy of their values. */
export function EstimateCustomization({ groups, compact = false }: { groups: CustomizationLink[]; compact?: boolean }) {
  if (!groups.length) return null;
  const reveal = (id: string) => {
    const target = document.getElementById(id);
    if (!target) return;
    const disclosure = target instanceof HTMLDetailsElement ? target : target.closest('details');
    if (disclosure) disclosure.open = true;
    const focusTarget = target instanceof HTMLDetailsElement
      ? target.querySelector<HTMLElement>('summary')
      : target.querySelector<HTMLElement>('input, select, button, summary');
    focusTarget?.focus();
    target.scrollIntoView?.({ block: 'nearest' });
  };
  return (
    <nav className="estimate-customization" aria-label="Customize this estimate">
      <strong><SlidersHorizontal size={16} aria-hidden="true" /> Customize this estimate</strong>
      <div className={`estimate-customization-links${compact ? ' is-compact' : ''}`}>
        {groups.map((group) => (
          <button type="button" key={group.id} aria-label={group.label} aria-controls={group.id} onClick={() => reveal(group.id)}>
            <span><strong>{group.label}</strong>{!compact ? <small>{group.summary}</small> : null}</span>
            <ArrowDownRight size={16} aria-hidden="true" />
          </button>
        ))}
      </div>
    </nav>
  );
}

export function EstimateOptionGroup({ id, title, summary, children }: { id: string; title: string; summary: string; children: ReactNode }) {
  return <details id={id} className="compound-disclosure calculator-options-shell"><summary><span><strong>{title}</strong><small>{summary}</small></span><ChevronDown size={17} aria-hidden="true" /></summary><div className="compound-advanced-body">{children}</div></details>;
}
