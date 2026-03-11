import { useState } from 'react';
import { validateNode } from '../api/client';
import PrimaryButton from '../components/PrimaryButton';
import Layout from '../components/Layout';
import PageHeader from '../components/PageHeader';
import TextInput from '../components/TextInput';

interface OnboardingStep1Props {
  /** Pre-fills the input from localStorage (remembered node name). */
  savedNodeId: string;
  /** When set, shows a contextual banner explaining why the wallet was opened. */
  pendingAction?: 'receive' | 'present' | null;
  onContinue: (nodeIdentifier: string, baseUrl: string) => void;
}

export default function OnboardingStep1Screen({ savedNodeId, pendingAction, onContinue }: OnboardingStep1Props) {
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
    <Layout>
      <PageHeader
        title="Let's get started"
        subtitle="Enter your wallet node identifier to connect."
        large
        className="pt-14 pb-4"
      />

      <main className="flex-1 px-6 space-y-6 pb-44">
        {/* Deep-link context banner */}
        {pendingAction && (
          <div className="bg-[#5B4FE9]/10 border border-[#5B4FE9]/20 rounded-[20px] px-4 py-3.5 animate-in fade-in zoom-in-95 duration-300">
            <p className="text-[13px] font-bold text-[#5B4FE9]">
              {pendingAction === 'receive' ? 'Credential offer waiting' : 'Verification request waiting'}
            </p>
            <p className="text-[12px] text-[#5B4FE9]/80 mt-0.5 leading-snug">
              {pendingAction === 'receive'
                ? 'Log in to receive your credential.'
                : 'Log in to respond to this verification request.'}
            </p>
          </div>
        )}

        <TextInput
          value={nodeId}
          onChange={(e) => {
            setNodeId(e.target.value);
            setError('');
          }}
          onKeyDown={(e) => e.key === 'Enter' && handleContinue()}
          placeholder="Node identifier  (e.g. b2b-poc)"
          error={error}
          disabled={loading}
          autoCapitalize="none"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
        />
      </main>

      {/* Pinned bottom area */}
      <footer className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto px-6 pb-10 pt-4 space-y-4 bg-[#F2F2F7] z-10 border-t border-black/[0.02]">
        <p className="text-center text-[13px] text-[#8e8e93] leading-relaxed px-4">
          By continuing, you agree to Neoke's <span className="text-[#5B4FE9] font-semibold">Terms and Conditions</span> and{' '}
          <span className="text-[#5B4FE9] font-semibold">Privacy Policy.</span>
        </p>

        <PrimaryButton onClick={handleContinue} disabled={!nodeId.trim()} loading={loading}>
          Continue
        </PrimaryButton>
      </footer>
    </Layout>
  );
}
