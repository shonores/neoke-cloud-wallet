import { clearLocalCredentials } from '../store/localCredentials';
import { useAuth } from '../context/AuthContext';
import { API_KEY } from '../config';
import type { ViewName } from '../types';

interface AccountScreenProps {
  navigate: (view: ViewName) => void;
}

export default function AccountScreen({ navigate }: AccountScreenProps) {
  const { clearToken } = useAuth();

  const handleClearCredentials = () => {
    clearLocalCredentials();
    navigate('dashboard');
  };

  const maskedKey = API_KEY.slice(0, 12) + '••••••••••••••••••••••••';

  return (
    <div className="flex-1 flex flex-col bg-[#F2F2F7] min-h-screen">
      <header className="px-5 pt-12 pb-4">
        <h1 className="text-2xl font-bold text-[#1c1c1e]">Account</h1>
      </header>

      <main className="flex-1 px-5 pb-28 space-y-4">
        {/* Connection info */}
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
          <div className="px-4 py-2.5 border-b border-black/5">
            <p className="text-xs text-[#8e8e93] font-semibold uppercase tracking-wide">Connected Node</p>
          </div>
          <div className="px-4 py-3.5">
            <p className="text-sm font-mono text-[#1c1c1e]">b2b-poc.id-node.neoke.com</p>
            <p className="text-xs text-[#8e8e93] mt-0.5">HTTPS · Secure connection</p>
          </div>
        </div>

        {/* API Key */}
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
          <div className="px-4 py-2.5 border-b border-black/5">
            <p className="text-xs text-[#8e8e93] font-semibold uppercase tracking-wide">API Key</p>
          </div>
          <div className="px-4 py-3.5">
            <p className="text-sm font-mono text-[#8e8e93] break-all">{maskedKey}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
          <button
            onClick={handleClearCredentials}
            className="w-full flex items-center justify-between px-4 py-4 text-left border-b border-black/5 active:bg-black/3 transition-colors"
          >
            <span className="text-sm text-red-500 font-medium">Clear all local credentials</span>
            <span className="text-[#c7c7cc]">›</span>
          </button>
          <button
            onClick={clearToken}
            className="w-full flex items-center justify-between px-4 py-4 text-left active:bg-black/3 transition-colors"
          >
            <span className="text-sm text-red-600 font-medium">Reset session</span>
            <span className="text-[#c7c7cc]">›</span>
          </button>
        </div>

        {/* App version */}
        <div className="text-center pt-4 pb-4">
          <div className="inline-flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
              <span className="text-sm">🪪</span>
            </div>
            <span className="text-sm font-bold text-[#1c1c1e]">Neoke Cloud Wallet</span>
          </div>
        </div>
      </main>
    </div>
  );
}
