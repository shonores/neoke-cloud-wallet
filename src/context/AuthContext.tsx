import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useRef,
  useCallback,
  type ReactNode,
} from 'react';
import { setBaseUrl, nodeIdentifierToUrl } from '../api/client';

// ============================================================
// Storage keys
// ============================================================
const SK = {
  TOKEN:    'neoke_s_token',    // sessionStorage — cleared on tab close
  EXPIRES:  'neoke_s_expires',  // sessionStorage
  NODE_ID:  'neoke_node_id',    // localStorage  — remembered across sessions
  ACTIVITY: 'neoke_activity',   // localStorage  — inactivity timer
} as const;

/** 7-day inactivity window in milliseconds */
const INACTIVITY_MS = 7 * 24 * 60 * 60 * 1000;

// ============================================================
// State & actions
// ============================================================
interface AuthState {
  token: string | null;
  expiresAt: number | null;
  sessionExpired: boolean;
  /** Short identifier entered by the user, e.g. "b2b-poc" */
  nodeIdentifier: string | null;
  /** Full API base URL, e.g. "https://b2b-poc.id-node.neoke.com" */
  baseUrl: string | null;
}

type AuthAction =
  | { type: 'SET_NODE'; nodeIdentifier: string; baseUrl: string }
  | { type: 'SET_TOKEN'; token: string; expiresAt: number }
  | { type: 'SESSION_EXPIRED' }
  | { type: 'LOGOUT' };

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'SET_NODE':
      return { ...state, nodeIdentifier: action.nodeIdentifier, baseUrl: action.baseUrl };
    case 'SET_TOKEN':
      return {
        ...state,
        token: action.token,
        expiresAt: action.expiresAt,
        sessionExpired: false,
      };
    case 'SESSION_EXPIRED':
      return { ...state, token: null, sessionExpired: true };
    case 'LOGOUT':
      return {
        token: null,
        expiresAt: null,
        sessionExpired: false,
        nodeIdentifier: null,
        baseUrl: null,
      };
    default:
      return state;
  }
}

// ============================================================
// Session restore (runs synchronously before first render)
// ============================================================
function isWithinActivityWindow(): boolean {
  try {
    const last = localStorage.getItem(SK.ACTIVITY);
    return !!last && Date.now() - parseInt(last, 10) < INACTIVITY_MS;
  } catch {
    return false;
  }
}

function initState(): AuthState {
  const empty: AuthState = {
    token: null,
    expiresAt: null,
    sessionExpired: false,
    nodeIdentifier: null,
    baseUrl: null,
  };

  try {
    if (!isWithinActivityWindow()) return empty;

    const nodeId = localStorage.getItem(SK.NODE_ID);
    if (!nodeId) return empty;

    const token    = sessionStorage.getItem(SK.TOKEN);
    const expiresStr = sessionStorage.getItem(SK.EXPIRES);
    if (!token || !expiresStr) return empty;

    const expiresAt = parseInt(expiresStr, 10);
    // Treat as expired if within 1 min of expiry
    if (Date.now() >= expiresAt - 60_000) return empty;

    const bUrl = nodeIdentifierToUrl(nodeId);
    setBaseUrl(bUrl); // prime the API client before first render
    return { token, expiresAt, sessionExpired: false, nodeIdentifier: nodeId, baseUrl: bUrl };
  } catch {
    return empty;
  }
}

// ============================================================
// Context
// ============================================================
interface AuthContextValue {
  state: AuthState;
  /** Called after step-1 validation succeeds. */
  setNode: (nodeIdentifier: string, baseUrl: string) => void;
  /** Called after successful authentication (step 2 or re-auth). */
  setToken: (token: string, expiresAt: number) => void;
  /** Kept for backward-compat call sites; same effect as SESSION_EXPIRED. */
  clearToken: () => void;
  /** Signal that the current bearer token has expired (shows re-auth UI). */
  markExpired: () => void;
  /** Full sign-out: clears token + node, returns to onboarding. */
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, undefined, initState);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Keep API client base URL in sync with context
  useEffect(() => {
    if (state.baseUrl) setBaseUrl(state.baseUrl);
  }, [state.baseUrl]);

  // Persist session to storage whenever a valid token is set
  useEffect(() => {
    if (state.token && state.expiresAt && state.nodeIdentifier) {
      try {
        sessionStorage.setItem(SK.TOKEN,   state.token);
        sessionStorage.setItem(SK.EXPIRES, state.expiresAt.toString());
        localStorage.setItem(SK.NODE_ID,   state.nodeIdentifier);
        localStorage.setItem(SK.ACTIVITY,  Date.now().toString());
      } catch { /* storage unavailable */ }
    } else if (!state.token && state.sessionExpired) {
      // Token expired — clear sessionStorage but keep node in localStorage
      try {
        sessionStorage.removeItem(SK.TOKEN);
        sessionStorage.removeItem(SK.EXPIRES);
      } catch { /* */ }
    }
  }, [state.token, state.expiresAt, state.nodeIdentifier, state.sessionExpired]);

  // Monitor token expiry and trigger re-auth 5 min before it expires
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (!state.token || !state.expiresAt) return;

    intervalRef.current = setInterval(() => {
      if (state.expiresAt && Date.now() >= state.expiresAt - 300_000) {
        dispatch({ type: 'SESSION_EXPIRED' });
        if (intervalRef.current) clearInterval(intervalRef.current);
      }
    }, 15_000);

    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [state.token, state.expiresAt]);

  const setNode = useCallback((nodeIdentifier: string, baseUrl: string) => {
    dispatch({ type: 'SET_NODE', nodeIdentifier, baseUrl });
  }, []);

  const setToken = useCallback((token: string, expiresAt: number) => {
    dispatch({ type: 'SET_TOKEN', token, expiresAt });
  }, []);

  const clearToken = useCallback(() => {
    dispatch({ type: 'SESSION_EXPIRED' });
  }, []);

  const markExpired = useCallback(() => {
    dispatch({ type: 'SESSION_EXPIRED' });
  }, []);

  const logout = useCallback(() => {
    try {
      sessionStorage.removeItem(SK.TOKEN);
      sessionStorage.removeItem(SK.EXPIRES);
      localStorage.removeItem(SK.ACTIVITY);
      // Intentionally keep SK.NODE_ID so the identifier is pre-filled on next login
    } catch { /* */ }
    dispatch({ type: 'LOGOUT' });
  }, []);

  return (
    <AuthContext.Provider value={{ state, setNode, setToken, clearToken, markExpired, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
