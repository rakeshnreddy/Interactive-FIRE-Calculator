/** Optional animation: each navigation commits once, even if a snapshot fails or is interrupted. */
export function createRouteTransitionRunner() {
  let pending: { commit: () => void; cancel: () => void; transition?: ViewTransition } | undefined;
  const cancel = () => { pending?.cancel(); pending?.transition?.skipTransition(); pending = undefined; };
  return {
    cancel,
    run(update: () => void) {
      // Commit an interrupted navigation before the next one, preserving history order.
      pending?.commit();
      pending?.transition?.skipTransition();
      let committed = false;
      let cancelled = false;
      const job = {
        commit: () => { if (!committed && !cancelled) { committed = true; update(); } },
        cancel: () => { cancelled = true; },
        transition: undefined as ViewTransition | undefined
      };
      pending = job;
      if (typeof document === 'undefined' || typeof document.startViewTransition !== 'function'
        || typeof window.matchMedia !== 'function' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        job.commit();
        pending = undefined;
        return;
      }
      const finish = () => { if (pending === job) pending = undefined; };
      try {
        job.transition = document.startViewTransition(job.commit);
        // Skipped snapshots reject ready; a failed animation must never lose navigation.
        void job.transition.ready.catch(job.commit);
        void job.transition.updateCallbackDone.catch(job.commit);
        void job.transition.finished.then(finish, () => { job.commit(); finish(); });
      } catch (error) {
        finish();
        if (committed) throw error;
        job.commit();
      }
    }
  };
}
