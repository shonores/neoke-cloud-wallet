import { clearLocalCredentials } from '../store/localCredentials';
import { useAuth } from '../context/AuthContext';
import type { ViewName } from '../types';

interface AccountScreenProps {
  navigate: (view: ViewName) => void;
}

export default function AccountScreen({ navigate }: AccountScreenProps) {
  const { state, logout } = useAuth();

  const nodeHost = (() => {
    if (state.baseUrl) {
      try { return new URL(state.baseUrl).host; } catch { /* */ }
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
    <div className="flex-1 flex flex-col bg-[#F2F2F7] min-h-screen">
      <header className="px-5 pt-12 pb-4">
        <h1 className="text-[28px] font-bold text-[#1c1c1e]">Account</h1>
      </header>

      <main className="flex-1 px-5 pb-28 space-y-4">
        {/* Node info */}
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
          <div className="px-4 py-2.5 border-b border-black/5">
            <p className="text-[11px] text-[#8e8e93] font-semibold uppercase tracking-wide">Connected Node</p>
          </div>
          <div className="px-4 py-3.5 flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0" />
            <div>
              <p className="text-[15px] font-mono text-[#1c1c1e]">{nodeHost}</p>
              <p className="text-[13px] text-[#8e8e93] mt-0.5">HTTPS · Secure connection</p>
            </div>
          </div>
        </div>

        {/* Session info */}
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
          <div className="px-4 py-2.5 border-b border-black/5">
            <p className="text-[11px] text-[#8e8e93] font-semibold uppercase tracking-wide">Session</p>
          </div>
          <div className="px-4 py-3.5">
            <p className="text-[14px] text-[#8e8e93]">
              Session refreshes automatically while you're active. Expires after 7 days of inactivity.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
          <button
            onClick={handleClearCredentials}
            className="w-full flex items-center justify-between px-4 py-4 text-left border-b border-black/5 active:bg-black/3 transition-colors"
          >
            <span className="text-[15px] text-red-500 font-medium">Clear all local credentials</span>
            <svg width="7" height="12" viewBox="0 0 7 12" fill="none" aria-hidden>
              <path d="M1 1l5 5-5 5" stroke="#c7c7cc" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-between px-4 py-4 text-left active:bg-black/3 transition-colors"
          >
            <span className="text-[15px] text-red-600 font-semibold">Sign out</span>
            <svg width="7" height="12" viewBox="0 0 7 12" fill="none" aria-hidden>
              <path d="M1 1l5 5-5 5" stroke="#c7c7cc" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        {/* App footer */}
        <div className="text-center pt-4 pb-4">
          <div className="inline-flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #5B4FE9 0%, #7c3aed 100%)' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                <rect x="2" y="5" width="20" height="14" rx="2.5" stroke="white" strokeWidth="1.6" />
                <path d="M2 10h20" stroke="white" strokeWidth="1.4" />
                <rect x="14" y="13" width="4" height="2.5" rx="1" fill="white" />
              </svg>
            </div>
            <span className="text-[15px] font-bold text-[#1c1c1e]">Neoke Cloud Wallet</span>
          </div>
        </div>
      </main>
    </div>
  );
}
