import { useState } from 'react';
import { apiKeyAuth } from '../api/client';
import LoadingSpinner from '../components/LoadingSpinner';

interface OnboardingStep2Props {
  nodeIdentifier: string;
  nodeBaseUrl: string;
  onBack: () => void;
  onSuccess: (token: string, expiresAt: number) => void;
}

export default function OnboardingStep2Screen({
  nodeIdentifier,
  nodeBaseUrl,
  onBack,
  onSuccess,
}: OnboardingStep2Props) {
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  let nodeHost = nodeIdentifier;
  try { nodeHost = new URL(nodeBaseUrl).host; } catch { /* keep identifier */ }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const key = apiKey.trim();
    if (!key) return;

    setLoading(true);
    setError('');
    try {
      const { token, expiresAt } = await apiKeyAuth(key, nodeBaseUrl);
      onSuccess(token, expiresAt);
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
    <div className="flex flex-col min-h-screen bg-[#F2F2F7]">
      {/* Back arrow */}
      <div className="px-6 pt-14 pb-0">
        <button
          onClick={onBack}
          className="w-10 h-10 -ml-2 flex items-center justify-center rounded-full hover:bg-black/5 transition-colors"
          aria-label="Go back"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path
              d="M12.5 4L7 10l5.5 6"
              stroke="#1c1c1e"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      {/* Title */}
      <div className="px-6 pt-4 pb-8">
        <h1 className="text-[32px] font-bold text-[#1c1c1e] leading-tight mb-2">
          Enter your API Key
        </h1>
        <p className="text-[16px] text-[#8e8e93] leading-snug">
          Connect to your wallet on{' '}
          <span className="font-semibold text-[#1c1c1e]">{nodeHost}</span>
        </p>
      </div>

      {/* Node indicator chip */}
      <div className="px-6 mb-3">
        <div className="inline-flex items-center gap-2 bg-black/5 px-3 py-1.5 rounded-full">
          <span className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0" />
          <span className="text-[13px] font-medium text-[#1c1c1e]">{nodeHost}</span>
          <span className="text-[11px] text-[#8e8e93]">· verified</span>
        </div>
      </div>

      {/* Form */}
      <form id="step2-form" onSubmit={handleSubmit} className="px-6">
        <input
          type="password"
          value={apiKey}
          onChange={(e) => { setApiKey(e.target.value); setError(''); }}
          placeholder="API Key"
          className="w-full bg-white border border-black/8 rounded-2xl px-4 py-4 text-[16px] text-[#1c1c1e] placeholder-[#c7c7cc] focus:outline-none focus:border-[#5B4FE9] shadow-sm transition-colors"
          autoComplete="off"
          disabled={loading}
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus
        />
        {error && (
          <p className="mt-3 text-[14px] text-red-500">{error}</p>
        )}
      </form>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Bottom area */}
      <div className="px-6 pb-10 space-y-4">
        <p className="text-center text-[13px] text-[#8e8e93] leading-relaxed">
          By continuing, you agree to Neoke's{' '}
          <span className="text-[#5B4FE9] font-medium">Terms and Conditions</span>
          {' '}and{' '}
          <span className="text-[#5B4FE9] font-medium">Privacy Policy.</span>
        </p>

        <button
          type="submit"
          form="step2-form"
          disabled={loading || !apiKey.trim()}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-full text-white font-semibold text-[17px] transition-opacity disabled:opacity-50 min-h-[56px]"
          style={{ backgroundColor: '#5B4FE9' }}
        >
          {loading ? (
            <>
              <LoadingSpinner size="sm" />
              <span>Connecting…</span>
            </>
          ) : (
            'Connect'
          )}
        </button>
      </div>
    </div>
  );
}
