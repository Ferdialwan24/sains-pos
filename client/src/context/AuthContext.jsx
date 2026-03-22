import { createContext, useEffect, useMemo, useState } from 'react';
import { apiRequest, setAuthToken } from '../lib/api.js';

const STORAGE_KEY = 'sains-pos-auth';

export const AuthContext = createContext(null);

const readStoredSession = () => {
  const storedValue = localStorage.getItem(STORAGE_KEY);

  if (!storedValue) {
    return null;
  }

  try {
    return JSON.parse(storedValue);
  } catch (_error) {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
};

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => readStoredSession());
  const [isBootstrapping, setIsBootstrapping] = useState(Boolean(readStoredSession()?.token));

  useEffect(() => {
    setAuthToken(session?.token ?? null);

    if (session) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [session]);

  useEffect(() => {
    const bootstrapSession = async () => {
      if (!session?.token) {
        setIsBootstrapping(false);
        return;
      }

      try {
        const response = await apiRequest('/auth/me');
        setSession((currentSession) => ({
          token: currentSession?.token ?? '',
          user: response.user
        }));
      } catch (_error) {
        setSession(null);
      } finally {
        setIsBootstrapping(false);
      }
    };

    bootstrapSession();
  }, []);

  const value = useMemo(
    () => ({
      isAuthenticated: Boolean(session?.token && session?.user),
      isBootstrapping,
      token: session?.token ?? null,
      user: session?.user ?? null,
      async login(credentials) {
        const response = await apiRequest('/auth/login', {
          method: 'POST',
          body: JSON.stringify(credentials)
        });

        setSession({
          token: response.token,
          user: response.user
        });

        return response.user;
      },
      logout() {
        setSession(null);
      }
    }),
    [isBootstrapping, session]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

