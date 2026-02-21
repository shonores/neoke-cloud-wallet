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
      {/* Header */}
      <header className="flex items-center justify-between px-4 pt-12 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1c1c1e]">Neoke wallet</h1>
          {!loading && !error && (
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-sm text-[#8e8e93]">
                {credentials.length === 0
                  ? 'No credentials'
                  : `${credentials.length} credential${credentials.length !== 1 ? 's' : ''}`}
              </p>
              {usingLocalFallback && (
                <span className="text-[10px] font-medium bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">
                  offline
                </span>
              )}
            </div>
          )}
        </div>
        <button
          onClick={fetchCredentials}
          className="w-9 h-9 rounded-full bg-black/6 hover:bg-black/10 flex items-center justify-center transition-colors"
          aria-label="Refresh credentials"
          title="Refresh"
        >
          <span className="text-base text-[#1c1c1e]" aria-hidden>↻</span>
        </button>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto px-4 pb-28">
        {loading ? (
          <div className="flex items-center justify-center pt-20">
            <div className="text-center space-y-3">
              <LoadingSpinner size="lg" className="mx-auto" />
              <p className="text-[#8e8e93] text-sm">Loading credentials…</p>
            </div>
          </div>
        ) : error ? (
          <div className="pt-8">
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
          <div className="flex items-center justify-center pt-12">
            <div className="bg-white rounded-3xl p-8 mx-2 flex flex-col items-center text-center shadow-sm">
              {/* Document icon in a purple rounded square */}
              <div className="w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center mb-5">
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden>
                  <rect x="7" y="4" width="18" height="24" rx="3" fill="white" opacity="0.9" />
                  <rect x="11" y="10" width="10" height="1.5" rx="0.75" fill="#4f46e5" />
                  <rect x="11" y="14" width="10" height="1.5" rx="0.75" fill="#4f46e5" />
                  <rect x="11" y="18" width="6" height="1.5" rx="0.75" fill="#4f46e5" />
                </svg>
              </div>

              <h2 className="text-[18px] font-bold text-[#1c1c1e] mb-2">
                No travel document… yet!
              </h2>
              <p className="text-sm text-[#8e8e93] max-w-[220px] mb-6 leading-relaxed">
                Scan a QR code to receive your first verifiable credential.
              </p>

              <button
                onClick={() => navigate('receive')}
                className="bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-[15px] font-semibold px-7 py-3 rounded-full transition-colors"
              >
                Scan QR Code
              </button>
            </div>
          </div>
        ) : (
          <div className="pt-4">
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
