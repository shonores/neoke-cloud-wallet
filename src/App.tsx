import { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { AuthProvider, useAuth } from './context/AuthContext';
import { apiKeyAuth } from './api/client';
import { API_KEY } from './config';
import DashboardScreen from './screens/DashboardScreen';
import CredentialDetailScreen from './screens/CredentialDetailScreen';
import ReceiveScreen from './screens/ReceiveScreen';
import PresentScreen from './screens/PresentScreen';
import AccountScreen from './screens/AccountScreen';
import ReAuthModal from './components/ReAuthModal';
import LoadingSpinner from './components/LoadingSpinner';
import type { ViewName, Credential } from './types';

// ============================================================
// Splash screen while auto-authenticating
// ============================================================
function SplashScreen({ error, onRetry }: { error?: string; onRetry: () => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 min-h-screen bg-[#F2F2F7]">
      <div className="text-center space-y-5">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl shadow-xl" style={{ background: 'linear-gradient(135deg, #5B4FE9 0%, #7c3aed 100%)' }}>
          {/* Wallet / credential card line icon */}
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" aria-hidden>
            <rect x="2" y="5" width="20" height="14" rx="2.5" stroke="white" strokeWidth="1.6" />
            <path d="M2 10h20" stroke="white" strokeWidth="1.4" />
            <rect x="14" y="13" width="4" height="2.5" rx="1" fill="white" />
          </svg>
        </div>
        <div>
          <h1 className="text-[22px] font-bold text-[#1c1c1e]">Neoke wallet</h1>
          <p className="text-[15px] text-[#8e8e93] mt-1">Self-Sovereign Identity</p>
        </div>
        {!error ? (
          <div className="flex items-center gap-2 text-[#8e8e93] text-[15px]">
            <LoadingSpinner size="sm" />
            <span>Connecting…</span>
          </div>
        ) : (
          <div className="space-y-3 max-w-xs">
            <p className="text-red-600 text-[14px] bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
              {error}
            </p>
            <button
              onClick={onRetry}
              className="w-full text-white font-semibold py-4 rounded-full text-[17px] transition-opacity min-h-[44px]"
              style={{ backgroundColor: '#5B4FE9' }}
            >
              Retry
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Bottom tab bar
// ============================================================
function TabBar({
  currentView,
  onNavigate,
}: {
  currentView: ViewName;
  onNavigate: (view: ViewName) => void;
}) {
  const homeActive = currentView === 'dashboard';
  const scanActive = currentView === 'receive' || currentView === 'present';
  const accountActive = currentView === 'account';

  return (
    <div
      className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-white/90 backdrop-blur-xl border-t border-black/5 flex"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      {/* Home */}
      <button
        className={`flex-1 flex flex-col items-center gap-1 pt-3 pb-3 transition-colors ${homeActive ? 'text-blue-600' : 'text-[#8e8e93]'}`}
        onClick={() => onNavigate('dashboard')}
        aria-label="Home"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path
            d="M3 10.5L12 3l9 7.5V20a1 1 0 01-1 1H5a1 1 0 01-1-1v-9.5z"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinejoin="round"
            fill={homeActive ? 'currentColor' : 'none'}
            fillOpacity={homeActive ? 0.12 : 0}
          />
          <path d="M9 21V13h6v8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
        <span className="text-[10px] font-medium">Home</span>
      </button>

      {/* Scan QR Code */}
      <button
        className={`flex-1 flex flex-col items-center gap-1 pt-3 pb-3 transition-colors ${scanActive ? 'text-blue-600' : 'text-[#8e8e93]'}`}
        onClick={() => onNavigate('receive')}
        aria-label="Scan QR Code"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <rect x="3" y="3" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.7" fill={scanActive ? 'currentColor' : 'none'} fillOpacity={scanActive ? 0.12 : 0} />
          <rect x="13" y="3" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.7" fill={scanActive ? 'currentColor' : 'none'} fillOpacity={scanActive ? 0.12 : 0} />
          <rect x="3" y="13" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.7" fill={scanActive ? 'currentColor' : 'none'} fillOpacity={scanActive ? 0.12 : 0} />
          <rect x="13" y="13" width="3.5" height="3.5" rx="0.5" fill="currentColor" />
          <rect x="17.5" y="13" width="3.5" height="3.5" rx="0.5" fill="currentColor" />
          <rect x="13" y="17.5" width="3.5" height="3.5" rx="0.5" fill="currentColor" />
          <rect x="17.5" y="17.5" width="3.5" height="3.5" rx="0.5" fill="currentColor" />
        </svg>
        <span className="text-[10px] font-medium">Scan QR Code</span>
      </button>

      {/* Account */}
      <button
        className={`flex-1 flex flex-col items-center gap-1 pt-3 pb-3 transition-colors ${accountActive ? 'text-blue-600' : 'text-[#8e8e93]'}`}
        onClick={() => onNavigate('account')}
        aria-label="Account"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <circle
            cx="12"
            cy="8"
            r="4"
            stroke="currentColor"
            strokeWidth="1.7"
            fill={accountActive ? 'currentColor' : 'none'}
            fillOpacity={accountActive ? 0.12 : 0}
          />
          <path
            d="M4 20c0-4 3.6-7 8-7s8 3 8 7"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
        </svg>
        <span className="text-[10px] font-medium">Account</span>
      </button>
    </div>
  );
}

// ============================================================
// Inner app (needs auth context)
// ============================================================
function AppInner() {
  const { state, setToken } = useAuth();
  const [authError, setAuthError] = useState('');
  const [authAttempt, setAuthAttempt] = useState(0);

  const [currentView, setCurrentView] = useState<ViewName>('dashboard');
  const [selectedCredential, setSelectedCredential] = useState<Credential | null>(null);
  const [pendingUri, setPendingUri] = useState<string | undefined>();
  const [refreshSignal, setRefreshSignal] = useState(0);

  // Auto-authenticate with hardcoded API key
  useEffect(() => {
    let cancelled = false;
    setAuthError('');
    apiKeyAuth(API_KEY)
      .then(({ token, expiresAt }) => {
        if (!cancelled) setToken(token, expiresAt);
      })
      .catch((err) => {
        if (!cancelled) {
          setAuthError(
            err instanceof Error ? err.message : 'Unable to connect to the wallet server.'
          );
        }
      });
    return () => { cancelled = true; };
  }, [authAttempt, setToken]);

  const navigate = (
    view: ViewName,
    extra?: { selectedCredential?: Credential; pendingUri?: string }
  ) => {
    setSelectedCredential(extra?.selectedCredential ?? null);
    setPendingUri(extra?.pendingUri);
    setCurrentView(view);
  };

  if (!state.token) {
    return (
      <SplashScreen
        error={authError}
        onRetry={() => setAuthAttempt((n) => n + 1)}
      />
    );
  }

  // Tab bar shown on top-level views only
  const showTabBar = currentView === 'dashboard' || currentView === 'account';

  return (
    <div className="flex flex-col min-h-screen bg-[#F2F2F7] w-full max-w-lg mx-auto">
      {state.sessionExpired && <ReAuthModal />}

      <AnimatePresence mode="wait">
        {currentView === 'dashboard' && (
          <DashboardScreen
            key="dashboard"
            navigate={navigate}
            refreshSignal={refreshSignal}
          />
        )}

        {currentView === 'detail' && selectedCredential && (
          <CredentialDetailScreen
            key="detail"
            credential={selectedCredential}
            onBack={() => navigate('dashboard')}
          />
        )}

        {currentView === 'receive' && (
          <ReceiveScreen
            key="receive"
            navigate={navigate}
            onCredentialReceived={() => setRefreshSignal((s) => s + 1)}
            initialUri={pendingUri}
          />
        )}

        {currentView === 'present' && (
          <PresentScreen
            key="present"
            navigate={navigate}
            initialUri={pendingUri}
          />
        )}

        {currentView === 'account' && (
          <AccountScreen
            key="account"
            navigate={navigate}
          />
        )}
      </AnimatePresence>

      {showTabBar && (
        <TabBar currentView={currentView} onNavigate={navigate} />
      )}
    </div>
  );
}

// ============================================================
// Root app with provider
// ============================================================
export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}
