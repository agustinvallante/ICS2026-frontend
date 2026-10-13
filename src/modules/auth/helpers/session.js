import { jwtDecode } from 'jwt-decode';

export const emptySession = { user: null, role: null, customerId: null, isAuthenticated: false };
export const SESSION_INVALIDATED = 'auth:session-invalidated';

export function parseSession(token) {
  if (typeof token !== 'string' || !token) return emptySession;

  try {
    const user = jwtDecode(token);

    if (!user || typeof user !== 'object' || Array.isArray(user)
      || typeof user.exp !== 'number' || !Number.isFinite(user.exp)
      || user.exp <= Date.now() / 1000) return emptySession;

    const rawRole = user.role ?? user.Role ?? user['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'];
    const role = typeof rawRole === 'string' ? rawRole.trim().toLowerCase() : null;
    const customerId = user.customerId || user.id || user.sub || null;

    return { user, role, customerId, isAuthenticated: true };
  } catch {
    return emptySession;
  }
}

export function readStoredSession() {
  const session = parseSession(localStorage.getItem('token'));

  if (!session.isAuthenticated) localStorage.removeItem('token');

  return session;
}
