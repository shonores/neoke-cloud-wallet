import { useState, useEffect } from 'react';
import { apiKeyAuth } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { API_KEY } from '../config';
import LoadingSpinner from './LoadingSpinner';
import ErrorMessage from './ErrorMessage';

export default function ReAuthModal() {
  const { setToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const reconnect = () => {
    setLoading(true);
    setError('');
    apiKeyAuth(API_KEY)
      .then(({ token, expiresAt }) => setToken(token, expiresAt))
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to reconnect.');
        setLoading(false);
      });
  };

  useEffect(() => { reconnect(); }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-[#1a1a1a] rounded-2xl border border-white/10 shadow-2xl p-6 text-center">
        <div className="text-3xl mb-3">🔐</div>
        <h2 className="text-lg font-bold text-white mb-1">Session Expired</h2>
        {loading ? (
          <div className="flex items-center justify-center gap-2 text-white/50 text-sm mt-4">
            <LoadingSpinner size="sm" />
            <span>Reconnecting…</span>
          </div>
        ) : error ? (
          <div className="space-y-3 mt-4">
            <ErrorMessage message={error} />
            <button
              onClick={reconnect}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-xl text-sm transition-colors min-h-[44px]"
            >
              Retry
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
