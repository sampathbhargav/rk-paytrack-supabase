import { useMemo, useSyncExternalStore } from 'react';
import { createSessionMonitor, sessionIdentity } from './sessionPolicy';

export default function useSessionLock(session) {
  const identity = sessionIdentity(session);
  const id = identity?.id;
  const started = identity?.started;
  const monitor = useMemo(() => {
    if (!id) return null;
    let storage;
    try { storage = window.localStorage; } catch { storage = null; }
    return createSessionMonitor({ id, started }, storage);
  }, [id, started]);
  const subscribe = useMemo(() => notify => {
    if (!monitor) return () => {};
    let lastWrite = 0;
    const activity = event => {
      if (!event.isTrusted || document.visibilityState !== 'visible') return;
      if (Date.now() - lastWrite > 1000) {
        monitor.activity();
        lastWrite = Date.now();
        notify();
      }
    };
    const events = ['pointerdown', 'pointermove', 'keydown', 'scroll'];
    events.forEach(name => window.addEventListener(name, activity, { capture: true, passive: true }));
    const interval = window.setInterval(notify, 1000);
    window.addEventListener('storage', notify);
    window.addEventListener('focus', notify);
    document.addEventListener('visibilitychange', notify);
    return () => {
      clearInterval(interval);
      events.forEach(name => window.removeEventListener(name, activity, true));
      window.removeEventListener('storage', notify);
      window.removeEventListener('focus', notify);
      document.removeEventListener('visibilitychange', notify);
    };
  }, [monitor]);
  const snapshot = () => session ? monitor?.status() || 'expired' : 'signed-out';
  return useSyncExternalStore(subscribe, snapshot, () => 'signed-out');
}
