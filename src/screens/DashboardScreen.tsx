import { useState, useEffect, useCallback, useRef } from 'react';
import { discoverWalletCredentials, ApiError } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { getLocalCredentials, mergeWithLocalCredentials } from '../store/localCredentials';
import CredentialStack from '../components/CredentialStack';
import ErrorMessage from '../components/ErrorMessage';
import Layout from '../components/Layout';
import PageHeader from '../components/PageHeader';
import SkeletonCards from '../components/SkeletonCards';
import type { Credential } from '../types';
import type { ViewName } from '../types';

interface DashboardScreenProps {
  navigate: (view: ViewName, extra?: { selectedCredential?: Credential; pendingUri?: string }) => void;
  refreshSignal?: number;
}

/** After this many ms of absence, return-to-tab triggers a full spinner refresh. */
const STALE_THRESHOLD_MS = 5 * 60 * 1000;

export default function DashboardScreen({ navigate, refreshSignal }: DashboardScreenProps) {
  const { state, markExpired } = useAuth();
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [usingLocalFallback, setUsingLocalFallback] = useState(false);

  /** Timestamp of the last successful server fetch (0 = never). */
  const lastFetchRef = useRef(0);

  const token = state.token;

  const fetchCredentials = useCallback(async (showSpinner = true) => {
    if (!token) return;
    if (showSpinner) setLoading(true);
    setError('');
    setUsingLocalFallback(false);

    try {
      const serverCreds = await discoverWalletCredentials(token);
      lastFetchRef.current = Date.now();
      
      // Authoritative update: sync with server results
      const merged = mergeWithLocalCredentials(serverCreds);
      setCredentials(merged);
    } catch (err) {
      // 401 means the bearer token has expired on the server — show re-auth UI,
      // never fall back to stale local data.
      if (err instanceof ApiError && err.status === 401) {
        markExpired();
        return;
      }
      
      // Fall back to local data ONLY if we have some AND it's not the first fetch
      // of the session (lastFetchRef.current > 0). This prevents ghosting on startup.
      const local = getLocalCredentials();
      if (local.length > 0 && lastFetchRef.current > 0) {
        setCredentials(local);
        setUsingLocalFallback(true);
      } else if (lastFetchRef.current === 0) {
        // Failed on first attempt — don't show ghosts, show error
        setCredentials([]);
        setError('Unable to reach the wallet server. Please check your connection.');
      }
    } finally {
      setLoading(false);
    }
  }, [token, markExpired]);

  // Initial fetch + refresh when token/refreshSignal changes.
  useEffect(() => {
    fetchCredentials();
  }, [fetchCredentials, refreshSignal]);

  // Poll every 15 s — silent background refresh (only if tab is visible), no spinner.
  useEffect(() => {
    const id = setInterval(() => {
      if (!document.hidden) void fetchCredentials(false);
    }, 15_000);
    return () => clearInterval(id);
  }, [fetchCredentials]);

  // When the tab becomes visible again, decide whether to show a full spinner
  // (long absence) or do a silent refresh (brief tab switch).
  useEffect(() => {
    const onVisible = () => {
      if (document.hidden) return;
      const stale = Date.now() - lastFetchRef.current > STALE_THRESHOLD_MS;
      if (stale) {
        // Reset so the user sees a spinner, not yesterday's credentials.
        setCredentials([]);
        setLoading(true);
      }
      void fetchCredentials(stale);
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [fetchCredentials]);

  // BFCache: some browsers (Safari, Chrome) preserve the entire JS heap
  // when navigating away. On return, React effects have NOT re-run and the
  // component still holds its old credentials state. Force a fresh fetch.
  useEffect(() => {
    const onPageShow = (e: PageTransitionEvent) => {
      if (!e.persisted) return;
      // Page was restored from the back-forward cache — clear stale state
      // and show the spinner so the user never sees yesterday's data.
      setCredentials([]);
      setLoading(true);
      void fetchCredentials(true);
    };
    window.addEventListener('pageshow', onPageShow);
    return () => window.removeEventListener('pageshow', onPageShow);
  }, [fetchCredentials]);

  return (
    <Layout>
      <PageHeader
        title="Neoke wallet"
        subtitle={
          usingLocalFallback ? (
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600">
              Offline Mode
            </span>
          ) : undefined
        }
      />

      <main className="flex-1 pb-28">
        {loading ? (
          <div className="px-5 pt-8">
            <SkeletonCards count={3} />
            <p className="text-center text-[#8e8e93] text-[13px] mt-6 animate-pulse">
              Syncing your secure vault…
            </p>
          </div>

        ) : error ? (
          <div className="px-5 pt-6">
            <ErrorMessage message={error} />
            <button
              onClick={() => fetchCredentials()}
              className="mt-6 w-full bg-white hover:bg-[#e5e5ea] text-[#1c1c1e] text-[15px] font-semibold py-4 rounded-[20px] transition-all shadow-sm border border-black/[0.04]"
            >
              Try again
            </button>
          </div>

        ) : credentials.length === 0 ? (
          <div className="px-5 pt-4">
            <div className="bg-white rounded-[32px] p-8 shadow-sm border border-black/[0.02] text-center">
              <div className="w-16 h-16 rounded-3xl bg-[#5B4FE9]/5 flex items-center justify-center mx-auto mb-6">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <rect x="4" y="3" width="16" height="18" rx="3" stroke="#5B4FE9" strokeWidth="1.5" />
                  <circle cx="12" cy="10" r="3.5" stroke="#5B4FE9" strokeWidth="1.5" />
                  <path d="M7 18c0-2.5 2.2-4.5 5-4.5s5 2 5 4.5" stroke="#5B4FE9" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>
              <h2 className="text-[20px] font-bold text-[#1c1c1e] mb-2">
                Your wallet is empty
              </h2>
              <p className="text-[15px] text-[#8e8e93] mb-8 leading-relaxed max-w-[240px] mx-auto">
                Scan a secure QR code to safely add your credentials here.
              </p>
              <button
                onClick={() => navigate('receive')}
                className="w-full text-white text-[16px] font-bold px-8 py-4 rounded-[18px] transition-all active:scale-[0.98] shadow-lg shadow-[#5B4FE9]/20"
                style={{ backgroundColor: '#5B4FE9' }}
              >
                Add credential
              </button>
            </div>
          </div>

        ) : (
          <div className="pt-2 px-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <CredentialStack
              credentials={[...credentials].sort((a, b) => {
                const aT = a.issuanceDate ? new Date(a.issuanceDate).getTime() : 0;
                const bT = b.issuanceDate ? new Date(b.issuanceDate).getTime() : 0;
                return bT - aT; // newest first
              })}
              onSelectCredential={(c) => navigate('detail', { selectedCredential: c })}
            />
          </div>
        )}
      </main>
    </Layout>
  );
}
