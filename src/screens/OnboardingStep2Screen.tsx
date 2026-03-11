import { useState } from 'react';
import { apiKeyAuth } from '../api/client';
import PrimaryButton from '../components/PrimaryButton';
import NodeStatusChip from '../components/NodeStatusChip';
import Layout from '../components/Layout';
import PageHeader from '../components/PageHeader';
import TextInput from '../components/TextInput';

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
  try {
    const url = new URL(nodeBaseUrl);
    nodeHost = url.hostname;
  } catch {
    /* keep identifier */
  }

  const handleSignIn = async () => {
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
    <Layout>
      <PageHeader
        title="Enter your API Key"
        subtitle={
          <>
            Connect to your wallet on <span className="font-semibold text-[#1c1c1e]">{nodeHost}</span>
          </>
        }
        onBack={onBack}
        large
      />

      <main className="flex-1 px-6 space-y-6">
        <div className="animate-in fade-in slide-in-from-left-4 duration-500">
          <NodeStatusChip host={nodeHost} label="· verified" />
        </div>

        <TextInput
          type="password"
          value={apiKey}
          onChange={(e) => {
            setApiKey(e.target.value);
            setError('');
          }}
          onKeyDown={(e) => e.key === 'Enter' && handleSignIn()}
          placeholder="API Key"
          error={error}
          disabled={loading}
          autoComplete="off"
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus
        />
      </main>

      {/* Pinned bottom area */}
      <footer className="px-6 pb-10 pt-4 space-y-4">
        <p className="text-center text-[13px] text-[#8e8e93] leading-relaxed px-4">
          By continuing, you agree to Neoke's <span className="text-[#5B4FE9] font-semibold">Terms and Conditions</span> and{' '}
          <span className="text-[#5B4FE9] font-semibold">Privacy Policy.</span>
        </p>

        <PrimaryButton onClick={handleSignIn} disabled={!apiKey.trim()} loading={loading}>
          Sign in
        </PrimaryButton>
      </footer>
    </Layout>
  );
}
