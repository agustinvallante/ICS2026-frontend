import { useEffect, useState } from 'react';
import { login } from '../services/login';
import { AuthContext } from './AuthContext';
import { emptySession, parseSession, readStoredSession, SESSION_INVALIDATED } from '../helpers/session';

function AuthProvider({ children }) {
  const [session, setSession] = useState(readStoredSession);

  const singout = () => {
    localStorage.removeItem('token');
    setSession(emptySession);
  };

  useEffect(() => {
    const invalidate = () => {
      localStorage.removeItem('token');
      setSession(emptySession);
    };
    const syncStorage = (event) => {
      if (event.key === 'token' || event.key === null) setSession(readStoredSession());
    };

    window.addEventListener(SESSION_INVALIDATED, invalidate);
    window.addEventListener('storage', syncStorage);

    return () => {
      window.removeEventListener(SESSION_INVALIDATED, invalidate);
      window.removeEventListener('storage', syncStorage);
    };
  }, []);

  useEffect(() => {
    if (!session.isAuthenticated) return;

    // Re-check long-lived sessions without exceeding the browser timer limit.
    const delay = Math.min(Math.max(session.user.exp * 1000 - Date.now(), 0), 2147483647);
    const timer = window.setTimeout(() => setSession(readStoredSession()), delay);

    return () => window.clearTimeout(timer);
  }, [session]);

  const singin = async (username, password) => {
    const { data, error } = await login(username, password);

    if (error) return { error };

    const nextSession = parseSession(data);

    if (!nextSession.isAuthenticated) {
      singout();

      return { error: 'Error de autenticación' };
    }

    localStorage.setItem('token', data);
    setSession(nextSession);

    return { error: null, session: nextSession };
  };

  return (
    <AuthContext.Provider value={{ ...session, singin, singout }}>
      {children}
    </AuthContext.Provider>
  );
}

export { AuthProvider };
