import { useState, useEffect, useCallback } from 'react';
import { discoverWalletCredentials } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { getLocalCredentials, mergeWithLocalCredentials } from '../store/localCredentials';
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

  const fetchCredentials = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    setUsingLocalFallback(false);

    try {
      const serverCreds = await discoverWalletCredentials(token);
      const merged = mergeWithLocalCredentials(serverCreds);
      setCredentials(merged);
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

  return (
    <div className="flex-1 flex flex-col bg-[#F2F2F7] min-h-screen">

      {/*
        Header — matches reference layout:
        Row 1: ⋮ three-dot menu alone at top-right (just below status bar)
        Row 2: "Neoke wallet" large bold title
      */}
      <header className="px-5 pt-12">
        {/* Row 1: three-dot menu top-right */}
        <div className="flex justify-end items-center gap-2 mb-1">
          {usingLocalFallback && (
            <span className="text-[10px] font-medium bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">
              offline
            </span>
          )}
          <button
            onClick={fetchCredentials}
            className="w-8 h-8 rounded-full hover:bg-black/6 flex items-center justify-center transition-colors"
            aria-label="Refresh"
            title="Refresh"
          >
            <svg width="4" height="18" viewBox="0 0 4 18" fill="none" aria-hidden>
              <circle cx="2" cy="2" r="2" fill="#1c1c1e" />
              <circle cx="2" cy="9" r="2" fill="#1c1c1e" />
              <circle cx="2" cy="16" r="2" fill="#1c1c1e" />
            </svg>
          </button>
        </div>

        {/* Row 2: page title */}
        <h1 className="text-[28px] font-bold text-[#1c1c1e] leading-tight pb-4">
          Neoke wallet
        </h1>
      </header>

      {/* Content — no horizontal padding on main so card wrapper controls inset */}
      <main className="flex-1 overflow-y-auto pb-28">

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
              onClick={fetchCredentials}
              className="mt-4 w-full bg-white hover:bg-[#e5e5ea] text-[#1c1c1e] text-sm py-3 rounded-2xl transition-colors shadow-sm border border-black/5"
            >
              Try again
            </button>
          </div>

        ) : credentials.length === 0 ? (
          /* Empty state — matches No_credential.PNG */
          <div className="px-4 pt-2">
            <div className="bg-white rounded-3xl p-5 shadow-sm">
              <div className="w-11 h-11 rounded-full bg-indigo-100 flex items-center justify-center mb-4">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <circle cx="12" cy="9.5" r="4.5" stroke="#4f46e5" strokeWidth="1.5" />
                  <path d="M12 5 C10.3 7 10.3 12 12 14 C13.7 12 13.7 7 12 5Z" fill="#4f46e5" opacity="0.5" />
                  <path d="M7.5 9.5h9" stroke="#4f46e5" strokeWidth="1.3" strokeLinecap="round" />
                  <path d="M9 17h6v4l-3-1.5L9 21v-4z" fill="#4f46e5" opacity="0.8" />
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
                className="bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-[15px] font-semibold px-6 py-3 rounded-full transition-colors"
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
