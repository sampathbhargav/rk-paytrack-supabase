export const MAX_SESSION_MS = 24 * 60 * 60 * 1000;
export const IDLE_SESSION_MS = 60 * 60 * 1000;
export const WARNING_MS = 2 * 60 * 1000;

// These timestamps are for the browser lock, not server authorization.
export function sessionIdentity(session) {
  if (!session) return null;
  try {
    const part = session.access_token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const claims = JSON.parse(atob(part));
    const timestamps = (claims.amr || []).map(item => Number(item.timestamp) * 1000).filter(Number.isFinite);
    return { id: claims.session_id, started: timestamps.length ? Math.min(...timestamps) : Date.parse(session.user.last_sign_in_at) };
  } catch {
    return null;
  }
}

export function sessionStatus(record, now = Date.now()) {
  if (!record || !Number.isFinite(record.started) || !Number.isFinite(record.active)) return 'expired';
  if (record.locked) return record.locked;
  if (now >= record.started + MAX_SESSION_MS) return 'expired';
  if (now >= record.active + IDLE_SESSION_MS) return 'inactive';
  const remaining = Math.min(record.started + MAX_SESSION_MS, record.active + IDLE_SESSION_MS) - now;
  return remaining <= WARNING_MS ? `warning:${Math.ceil(remaining / 1000)}` : 'active';
}

export function createSessionMonitor(identity, storage, now = () => Date.now()) {
  const key = `rk-session-lock-v1:${identity.id}`;
  let memory;
  const read = () => {
    try { return JSON.parse(storage.getItem(key)) || memory; } catch { return memory; }
  };
  const write = record => {
    memory = record;
    try { storage.setItem(key, JSON.stringify(record)); } catch { /* In-memory lock still applies. */ }
  };
  if (!read()) write({ started: identity.started, active: now() });
  return {
    key,
    status() {
      const record = read();
      const status = sessionStatus(record, now());
      if ((status === 'expired' || status === 'inactive') && record && !record.locked) write({ ...record, locked: status });
      return status;
    },
    activity() {
      const status = this.status();
      if (status === 'expired' || status === 'inactive') return;
      write({ ...read(), active: now() });
    },
  };
}
