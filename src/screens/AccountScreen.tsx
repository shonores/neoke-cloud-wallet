import { clearLocalCredentials } from '../store/localCredentials';
import { useAuth } from '../context/AuthContext';
import type { ViewName } from '../types';
import Layout from '../components/Layout';
import PageHeader from '../components/PageHeader';
import SectionCard from '../components/SectionCard';
import ActionRow from '../components/ActionRow';

interface AccountScreenProps {
  navigate: (view: ViewName) => void;
}

export default function AccountScreen({ navigate }: AccountScreenProps) {
  const { state, logout } = useAuth();

  const nodeHost = (() => {
    if (state.baseUrl) {
      try {
        return new URL(state.baseUrl).host;
      } catch {
        /* */
      }
    }
    return state.nodeIdentifier ?? '—';
  })();

  const handleClearCredentials = () => {
    clearLocalCredentials();
    navigate('dashboard');
  };

  const handleSignOut = () => {
    logout(); // logout() now clears credentials internally
  };

  return (
    <Layout className="bg-[#F2F2F7]">
      <PageHeader title="Account" />

      <main className="flex-1 px-5 pb-28 space-y-6">
        {/* Node info */}
        <SectionCard title="Connected node">
          <div className="px-4 py-3.5 flex items-center gap-3">
            <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0 animate-pulse" />
            <div className="min-w-0">
              <p className="text-[15px] font-mono text-[#1c1c1e] truncate">{nodeHost}</p>
              <p className="text-[13px] text-[#8e8e93] mt-0.5">HTTPS · Secure connection</p>
            </div>
          </div>
        </SectionCard>

        {/* Session info */}
        <SectionCard title="Session">
          <div className="px-4 py-4">
            <p className="text-[14px] text-[#8e8e93] leading-relaxed">
              Session refreshes automatically while you're active. Expires after 7 days of inactivity.
            </p>
          </div>
        </SectionCard>

        {/* Actions */}
        <SectionCard>
          <ActionRow label="Clear all local credentials" onClick={handleClearCredentials} destructive />
          <ActionRow label="Sign out" onClick={handleSignOut} destructive trailingChevron={false} showBorder={false} />
        </SectionCard>

        {/* App footer */}
        <div className="text-center pt-8 pb-4 opacity-40 grayscale hover:grayscale-0 hover:opacity-100 transition-all">
          <div className="inline-flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center shadow-sm"
              style={{ background: 'linear-gradient(135deg, #5B4FE9 0%, #7c3aed 100%)' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                <rect x="2" y="5" width="20" height="14" rx="2.5" stroke="white" strokeWidth="1.6" />
                <path d="M2 10h20" stroke="white" strokeWidth="1.4" />
                <rect x="14" y="13" width="4" height="2.5" rx="1" fill="white" />
              </svg>
            </div>
            <span className="text-[14px] font-bold text-[#1c1c1e] tracking-tight">Neoke Cloud Wallet</span>
          </div>
        </div>
      </main>
    </Layout>
  );
}
