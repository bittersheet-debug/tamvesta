const DEVICE_ID_KEY = 'tamvesta_device_id';
const SESSION_ID_KEY = 'tamvesta_session_id';

function randomId(prefix: string): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return `${prefix}_${crypto.randomUUID()}`;
    }
  } catch (_) {}
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
}

export function getClientDeviceId(): string {
  if (typeof window === 'undefined') return 'server';
  let existing = localStorage.getItem(DEVICE_ID_KEY);
  if (!existing) {
    existing = randomId('dev');
    localStorage.setItem(DEVICE_ID_KEY, existing);
  }
  return existing;
}

export function getClientSessionId(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem(SESSION_ID_KEY) || localStorage.getItem(SESSION_ID_KEY);
}

export function setClientSessionId(sessionId: string) {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(SESSION_ID_KEY, sessionId);
    localStorage.setItem(SESSION_ID_KEY, sessionId);
  } catch (_) {}
}

export function clearClientSessionId() {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(SESSION_ID_KEY);
    localStorage.removeItem(SESSION_ID_KEY);
  } catch (_) {}
}
