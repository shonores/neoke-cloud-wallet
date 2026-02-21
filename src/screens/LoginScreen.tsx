import { useState } from 'react';
import { apiKeyAuth } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { BASE_URL } from '../api/client';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';

export default function LoginScreen() {
  const { setToken, state } = useAuth();
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [connected, setConnected] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const key = apiKey.trim();
    if (!key) return;

    setLoading(true);
    setError('');
    setConnected(false);

    try {
      const { token, expiresAt } = await apiKeyAuth(key);
      setConnected(true);
      // Brief visual feedback before transitioning
      setTimeout(() => setToken(token, expiresAt), 600);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Authentication failed. Please check your API key and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 min-h-screen bg-[#0f0f0f]">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo / Brand */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-600 to-purple-600 shadow-2xl shadow-blue-500/30">
            <span className="text-4xl" aria-hidden>🪪</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Cloud Wallet</h1>
            <p className="text-sm text-white/50 mt-1">Self-Sovereign Identity</p>
          </div>
        </div>

        {/* Login form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="apiKey" className="block text-sm font-medium text-white/70">
              API Key
            </label>
            <input
              id="apiKey"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your API key"
              className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3.5 text-white placeholder-white/25 text-sm focus:outline-none focus:border-blue-500 focus:bg-white/8 transition-colors"
              autoComplete="off"
              autoCapitalize="none"
            />
          </div>

          {error && <ErrorMessage message={error} />}

          {connected && (
            <div className="flex items-center gap-2 text-green-400 text-sm bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3">
              <span>✓</span>
              <span>Connected to <strong>{state.nodeHost}</strong></span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !apiKey.trim()}
            className="w-full bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-colors min-h-[44px] text-sm"
          >
            {loading ? (
              <>
                <LoadingSpinner size="sm" />
                <span>Connecting…</span>
              </>
            ) : (
              <>
                <span>Connect</span>
                <span aria-hidden>▸</span>
              </>
            )}
          </button>
        </form>

        {/* Node info */}
        <p className="text-center text-xs text-white/25">
          {new URL(BASE_URL).host}
        </p>
      </div>
    </div>
  );
}
