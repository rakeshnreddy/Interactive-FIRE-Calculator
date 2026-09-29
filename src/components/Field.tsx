import { cloneElement, isValidElement, useId, type ReactNode } from 'react';
import { InfoTip } from './InfoTip';

export function fieldSlugify(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export function Field({
  id,
  label,
  help,
  issue,
  prefix,
  suffix,
  children
}: {
  id?: string;
  label: string;
  help?: string;
  issue?: string;
  prefix?: string;
  suffix?: string;
  children: ReactNode;
}) {
  const autoId = useId().replace(/[^a-zA-Z0-9_-]/g, '_');
  const childId = (isValidElement(children) && (children.props as any).id) || id;
  const slug = fieldSlugify(label) || 'input';
  const resolvedId = childId || `field-${slug}-${autoId}`;
  const helpId = help ? `${resolvedId}-help` : undefined;
  const issueId = issue ? `${resolvedId}-issue` : undefined;

  const existingDescribedBy = isValidElement(children)
    ? (children.props as any)['aria-describedby']
    : undefined;
  const describedByParts = [existingDescribedBy, helpId, issueId].filter(Boolean);
  const describedBy = describedByParts.length > 0 ? describedByParts.join(' ') : undefined;

  const child = isValidElement(children)
    ? cloneElement(children as React.ReactElement<any>, {
        id: resolvedId,
        'aria-describedby': describedBy,
        'aria-invalid': (children.props as any)['aria-invalid'] ?? Boolean(issue)
      })
    : children;

  return (
    <div className={issue ? 'field field-has-issue' : 'field'}>
      <span className="field-label">
        <label htmlFor={resolvedId}>{label}</label>
        {help && <InfoTip id={helpId} text={help} label={label} />}
      </span>
      {prefix || suffix ? (
        <div className="calculator-input-control">
          {prefix && <small aria-hidden="true">{prefix}</small>}
          {child}
          {suffix && <small aria-hidden="true">{suffix}</small>}
        </div>
      ) : (
        child
      )}
      {issue && (
        <small className="field-issue" id={issueId} role="alert">
          {issue}
        </small>
      )}
    </div>
  );
}
