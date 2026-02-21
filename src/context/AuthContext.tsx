import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useRef,
  useCallback,
  type ReactNode,
} from 'react';
import { BASE_URL } from '../api/client';

// ============================================================
// State
// ============================================================
interface AuthState {
  token: string | null;
  expiresAt: number | null;
  sessionExpired: boolean;
  nodeHost: string;
}

type AuthAction =
  | { type: 'SET_TOKEN'; token: string; expiresAt: number }
  | { type: 'CLEAR_TOKEN' }
  | { type: 'SESSION_EXPIRED' };

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'SET_TOKEN':
      return {
        ...state,
        token: action.token,
        expiresAt: action.expiresAt,
        sessionExpired: false,
        nodeHost: new URL(BASE_URL).host,
      };
    case 'CLEAR_TOKEN':
      return {
        ...state,
        token: null,
        expiresAt: null,
        sessionExpired: false,
      };
    case 'SESSION_EXPIRED':
      return { ...state, sessionExpired: true };
    default:
      return state;
  }
}

// ============================================================
// Context
// ============================================================
interface AuthContextValue {
  state: AuthState;
  setToken: (token: string, expiresAt: number) => void;
  clearToken: () => void;
  markExpired: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, {
    token: null,
    expiresAt: null,
    sessionExpired: false,
    nodeHost: new URL(BASE_URL).host,
  });

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Monitor token expiry
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (!state.token || !state.expiresAt) return;

    intervalRef.current = setInterval(() => {
      const now = Date.now();
      if (state.expiresAt && now >= state.expiresAt - 300_000) {
        dispatch({ type: 'SESSION_EXPIRED' });
        if (intervalRef.current) clearInterval(intervalRef.current);
      }
    }, 15_000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [state.token, state.expiresAt]);

  const setToken = useCallback((token: string, expiresAt: number) => {
    dispatch({ type: 'SET_TOKEN', token, expiresAt });
  }, []);

  const clearToken = useCallback(() => {
    dispatch({ type: 'CLEAR_TOKEN' });
  }, []);

  const markExpired = useCallback(() => {
    dispatch({ type: 'SESSION_EXPIRED' });
  }, []);

  return (
    <AuthContext.Provider value={{ state, setToken, clearToken, markExpired }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
