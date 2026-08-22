import { useCallback, useEffect, useRef, useState } from 'react';

// Whether a newer shell is sitting in the wings, and how to take it.
//
// The service worker used to register with autoUpdate: a deploy landed while a
// child was tracing, the new worker claimed the page, and the app reloaded
// underneath them mid-letter. Registration is `prompt` now, so a new worker
// installs and then waits, and nothing moves until applyUpdate is called.
//
// The reload is deliberately the only thing that ever calls it. A waiting
// worker that is left alone activates on its own the next time every tab of
// the app is closed and reopened, which is the same "next load" the browser
// would have given us anyway — just never in the middle of a lesson.
export function useServiceWorkerUpdate() {
  const [updateReady, setUpdateReady] = useState(false);
  const waitingRef = useRef(null);
  const reloadingRef = useRef(false);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;

    const container = navigator.serviceWorker;
    let cancelled = false;
    let registration = null;

    const promote = (worker) => {
      // No controller means this is the first install on this device, not an
      // update — there is no old shell for the child to be sitting on.
      if (cancelled || !worker || !container.controller) return;
      waitingRef.current = worker;
      setUpdateReady(true);
    };

    const handleUpdateFound = () => {
      const installing = registration.installing;
      if (!installing) return;
      installing.addEventListener('statechange', () => {
        if (installing.state === 'installed') promote(installing);
      });
    };

    // Only ever fires off the back of applyUpdate: `prompt` registration means
    // the new worker does not claim clients by itself.
    const handleControllerChange = () => {
      if (!reloadingRef.current) return;
      reloadingRef.current = false;
      window.location.reload();
    };

    // A worker that finished installing on an earlier load is already waiting,
    // and updatefound will not fire a second time to tell us about it.
    const attach = (reg) => {
      if (cancelled || !reg) return;
      registration = reg;
      promote(reg.waiting);
      reg.addEventListener('updatefound', handleUpdateFound);
    };

    container.addEventListener('controllerchange', handleControllerChange);

    // getRegistration resolves as soon as one exists; `ready` waits for an
    // active worker, which on a first visit is a promise that settles late and
    // on a page with no service worker at all never settles. Either is fine —
    // both paths only ever add a listener.
    Promise.resolve(container.getRegistration())
      .then((reg) => (reg ? attach(reg) : container.ready.then(attach)))
      .catch(() => {});

    // Browsers only re-check the worker on navigation, and a standalone PWA is
    // a single page that never navigates. Asking again when the app comes back
    // to the foreground is what makes an update visible the same day.
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && registration) {
        registration.update().catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      cancelled = true;
      container.removeEventListener('controllerchange', handleControllerChange);
      document.removeEventListener('visibilitychange', handleVisibility);
      if (registration) registration.removeEventListener('updatefound', handleUpdateFound);
    };
  }, []);

  // Hand the waiting worker the one message the generated service worker
  // listens for. It calls skipWaiting, activates, takes the page, and the
  // controllerchange handler above reloads into the new shell.
  const applyUpdate = useCallback(() => {
    const waiting = waitingRef.current;
    if (!waiting) return;
    reloadingRef.current = true;
    setUpdateReady(false);
    waiting.postMessage({ type: 'SKIP_WAITING' });
  }, []);

  return { updateReady, applyUpdate, dismissUpdate: () => setUpdateReady(false) };
}
