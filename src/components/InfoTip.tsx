import { useEffect, useRef, useState } from 'react';

export function InfoTip({
  id,
  text,
  label
}: {
  id?: string;
  text: string;
  label?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLSpanElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    };

    const handlePointerDown = (e: PointerEvent | MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('pointerdown', handlePointerDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [isOpen]);

  const handleBlur = (e: React.FocusEvent<HTMLSpanElement>) => {
    if (!containerRef.current?.contains(e.relatedTarget as Node)) {
      setIsOpen(false);
    }
  };

  return (
    <span
      className="info-tip"
      ref={containerRef}
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
      onBlur={handleBlur}
    >
      <button
        ref={buttonRef}
        type="button"
        className="info-dot"
        aria-label={label ? `Help for ${label}` : text}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((prev) => !prev)}
        onKeyDown={(e) => {
          if (e.key === 'Escape' && isOpen) {
            e.stopPropagation();
            setIsOpen(false);
            buttonRef.current?.focus();
          }
        }}
      >
        ?
      </button>
      <span
        className={`info-popover ${isOpen ? 'is-visible' : ''}`}
        id={id}
        role="tooltip"
        aria-hidden={!isOpen}
      >
        {text}
      </span>
    </span>
  );
}
