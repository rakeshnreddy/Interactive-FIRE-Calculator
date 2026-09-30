import { useEffect, useRef, useState } from 'react';

/** Explicit actions reveal the committed answer; ordinary typing never calls this. */
export function revealResultIfNeeded(result: HTMLElement | null): void {
  if (!result) return;
  const primary = result.querySelector<HTMLElement>('.calculator-result-metric-primary, .compound-headline')
    ?? (result.matches('.hero-result') ? result.querySelector<HTMLElement>(':scope > strong') : null)
    ?? result;
  const rect = primary.getBoundingClientRect();
  const topbar = document.querySelector('.topbar')?.getBoundingClientRect().bottom ?? 0;
  if (rect.top >= Math.max(0, topbar) && rect.bottom <= window.innerHeight && rect.height > 0) return;
  result.focus({ preventScroll: true });
  // Immediate navigation avoids motion preference races and interrupted smooth scrolls.
  result.scrollIntoView?.({ block: 'start', behavior: 'instant' });
}

export function useResultReveal<T extends HTMLElement = HTMLElement>() {
  const resultRef = useRef<T>(null);
  const [request, setRequest] = useState(0);
  useEffect(() => {
    if (request > 0) revealResultIfNeeded(resultRef.current);
  }, [request]);
  return { resultRef, revealResult: () => setRequest((value) => value + 1) };
}
