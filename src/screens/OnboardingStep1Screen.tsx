import { useState } from 'react';
import { validateNode } from '../api/client';
import PrimaryButton from '../components/PrimaryButton';

interface OnboardingStep1Props {
  /** Pre-fills the input from localStorage (remembered node name). */
  savedNodeId: string;
  onContinue: (nodeIdentifier: string, baseUrl: string) => void;
}

export default function OnboardingStep1Screen({ savedNodeId, onContinue }: OnboardingStep1Props) {
  const [nodeId, setNodeId] = useState(savedNodeId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleContinue = async () => {
    const id = nodeId.trim();
    if (!id) return;

    setLoading(true);
    setError('');
    try {
      const baseUrl = await validateNode(id);
      onContinue(id, baseUrl);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not reach this node. Please check the identifier.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#F2F2F7]">
      {/* Title */}
      <div className="px-6 pt-14 pb-8">
        <h1 className="text-[32px] font-bold text-[#1c1c1e] leading-tight mb-2">
          Let's get started
        </h1>
        <p className="text-[16px] text-[#8e8e93] leading-snug">
          Enter your wallet node identifier to connect.
        </p>
      </div>

      {/* Form */}
      <div className="px-6">
        <input
          type="text"
          value={nodeId}
          onChange={(e) => { setNodeId(e.target.value); setError(''); }}
          onKeyDown={(e) => e.key === 'Enter' && handleContinue()}
          placeholder="Node identifier  (e.g. b2b-poc)"
          className="w-full bg-white border border-black/8 rounded-2xl px-4 py-4 text-[16px] text-[#1c1c1e] placeholder-[#c7c7cc] focus:outline-none focus:border-[#5B4FE9] shadow-sm transition-colors"
          autoCapitalize="none"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          disabled={loading}
        />
        {error && (
          <p className="mt-3 text-[14px] text-red-500">{error}</p>
        )}
      </div>

      {/* Pinned bottom area */}
      <div className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto px-6 pb-10 pt-4 space-y-4 bg-[#F2F2F7]">
        <p className="text-center text-[13px] text-[#8e8e93] leading-relaxed">
          By continuing, you agree to Neoke's{' '}
          <span className="text-[#5B4FE9] font-medium">Terms and Conditions</span>
          {' '}and{' '}
          <span className="text-[#5B4FE9] font-medium">Privacy Policy.</span>
        </p>

        <PrimaryButton
          onClick={handleContinue}
          disabled={!nodeId.trim()}
          loading={loading}
        >
          Continue
        </PrimaryButton>
      </div>
    </div>
  );
}
