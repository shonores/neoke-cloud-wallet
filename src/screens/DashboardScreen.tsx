import { useState, useEffect, useCallback } from 'react';
import { discoverWalletCredentials } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { getLocalCredentials, mergeWithLocalCredentials, clearLocalCredentials } from '../store/localCredentials';
import CredentialStack from '../components/CredentialStack';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import type { Credential } from '../types';
import type { ViewName } from '../types';

interface DashboardScreenProps {
  navigate: (view: ViewName, extra?: { selectedCredential?: Credential; pendingUri?: string }) => void;
  refreshSignal?: number;
}

export default function DashboardScreen({ navigate, refreshSignal }: DashboardScreenProps) {
  const { state } = useAuth();
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [usingLocalFallback, setUsingLocalFallback] = useState(false);

  const token = state.token;

  const fetchCredentials = useCallback(async (showSpinner = true) => {
    if (!token) return;
    if (showSpinner) setLoading(true);
    setError('');
    setUsingLocalFallback(false);

    try {
      const serverCreds = await discoverWalletCredentials(token);
      if (serverCreds.length === 0) {
        // Server confirmed the wallet is empty — clear stale local cache
        clearLocalCredentials();
        setCredentials([]);
      } else {
        const merged = mergeWithLocalCredentials(serverCreds);
        setCredentials(merged);
      }
    } catch {
      const local = getLocalCredentials();
      setCredentials(local);
      if (local.length > 0) {
        setUsingLocalFallback(true);
      } else {
        setError('Unable to reach the wallet server. Please check your connection.');
      }
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchCredentials();
  }, [fetchCredentials, refreshSignal]);

  // Poll every 15 s — silent background refresh, no spinner.
  useEffect(() => {
    const id = setInterval(() => fetchCredentials(false), 15_000);
    return () => clearInterval(id);
  }, [fetchCredentials]);

  // Also re-fetch silently when the tab comes back into view.
  useEffect(() => {
    const onVisible = () => { if (!document.hidden) fetchCredentials(false); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [fetchCredentials]);

  return (
    <div className="flex-1 flex flex-col bg-[#F2F2F7] min-h-screen">

      {/* Header */}
      <header className="px-5 pt-12 pb-4 flex items-start justify-between">
        <h1 className="text-[28px] font-bold text-[#1c1c1e] leading-tight">
          Neoke wallet
        </h1>
        {usingLocalFallback && (
          <span className="text-[10px] font-medium bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full mt-2">
            offline
          </span>
        )}
      </header>

      {/* Content — no overflow-y-auto here; let viewport scroll so no scrollbar width is stolen from card container */}
      <main className="flex-1 pb-28">

        {loading ? (
          <div className="px-5 flex items-center justify-center pt-16">
            <div className="text-center space-y-3">
              <LoadingSpinner size="lg" className="mx-auto" />
              <p className="text-[#8e8e93] text-sm">Loading credentials…</p>
            </div>
          </div>

        ) : error ? (
          <div className="px-5 pt-6">
            <ErrorMessage message={error} />
            <button
              onClick={() => fetchCredentials()}
              className="mt-4 w-full bg-white hover:bg-[#e5e5ea] text-[#1c1c1e] text-[15px] py-3 rounded-2xl transition-colors shadow-sm border border-black/5"
            >
              Try again
            </button>
          </div>

        ) : credentials.length === 0 ? (
          /* Empty state — matches No_credential.PNG */
          <div className="px-4 pt-2">
            <div className="bg-white rounded-3xl p-5 shadow-sm">
              {/* Passport / document line icon */}
              <div className="w-11 h-11 rounded-full bg-indigo-100 flex items-center justify-center mb-4">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <rect x="4" y="3" width="16" height="18" rx="2" stroke="#5B4FE9" strokeWidth="1.6" />
                  <circle cx="12" cy="10" r="3" stroke="#5B4FE9" strokeWidth="1.4" />
                  <path d="M7 17c0-2.76 2.24-5 5-5s5 2.24 5 5" stroke="#5B4FE9" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
              </div>
              <h2 className="text-[17px] font-bold text-[#1c1c1e] mb-1.5">
                No travel document… yet!
              </h2>
              <p className="text-[14px] text-[#8e8e93] mb-5 leading-relaxed">
                You only need to upload it once and then you can reuse it for all future trips.
              </p>
              <button
                onClick={() => navigate('receive')}
                className="text-white text-[15px] font-semibold px-6 py-3 rounded-full transition-opacity active:opacity-80"
                style={{ backgroundColor: '#5B4FE9' }}
              >
                Upload travel document
              </button>
            </div>
          </div>

        ) : (
          /*
            Card wrapper — px-4 gives 16px margin on each side.
            This makes cards 16px inset from screen edge on both home and detail,
            so both cards render at identical widths.
          */
          <div className="pt-2 px-4">
            <CredentialStack
              credentials={credentials}
              onSelectCredential={(c) => navigate('detail', { selectedCredential: c })}
            />
          </div>
        )}
      </main>
    </div>
  );
}
