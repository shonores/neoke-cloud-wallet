import { useState, useEffect, useCallback } from 'react';
import { listCredentials, ApiError } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { getLocalCredentials } from '../store/localCredentials';
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

  const token = state.token;

  const fetchCredentials = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const creds = await listCredentials(token);
      setCredentials(creds);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setCredentials(getLocalCredentials());
      } else {
        setError(
          err instanceof Error
            ? err.message
            : 'Unable to load credentials. Please try again.'
        );
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
      <header className="flex items-center justify-between px-5 pt-12 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1c1c1e]">Neoke wallet</h1>
          {!loading && !error && (
            <p className="text-sm text-[#8e8e93] mt-0.5">
              {credentials.length === 0
                ? 'No credentials'
                : `${credentials.length} credential${credentials.length !== 1 ? 's' : ''}`}
            </p>
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
      <main className="flex-1 overflow-y-auto px-5 pb-28">
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
          <div className="flex flex-col items-center justify-center pt-20 text-center space-y-4">
            <div className="w-20 h-20 rounded-3xl bg-white shadow-sm flex items-center justify-center">
              <span className="text-4xl" aria-hidden>🪪</span>
            </div>
            <div>
              <p className="text-[#1c1c1e] font-semibold text-base">No credentials yet</p>
              <p className="text-[#8e8e93] text-sm mt-1 max-w-xs">
                Tap "Scan QR Code" below to receive your first credential.
              </p>
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
