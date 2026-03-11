import { useState, useEffect, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import { AuthProvider, useAuth } from './context/AuthContext';
import DashboardScreen from './screens/DashboardScreen';
import CredentialDetailScreen from './screens/CredentialDetailScreen';
import ReceiveScreen from './screens/ReceiveScreen';
import PresentScreen from './screens/PresentScreen';
import AccountScreen from './screens/AccountScreen';
import OnboardingStep1Screen from './screens/OnboardingStep1Screen';
import OnboardingStep2Screen from './screens/OnboardingStep2Screen';
import ReAuthModal from './components/ReAuthModal';
import { detectUriType } from './utils/uriRouter';
import type { ViewName, Credential } from './types';

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
  const homeActive    = currentView === 'dashboard';
  const scanActive    = currentView === 'receive' || currentView === 'present';
  const accountActive = currentView === 'account';

  return (
    <div
      className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-white/90 backdrop-blur-xl border-t border-black/5 flex z-50"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      {/* Home */}
      <button
        className={`flex-1 flex flex-col items-center gap-1 pt-3 pb-3 transition-colors ${homeActive ? 'text-[#5B4FE9]' : 'text-[#8e8e93]'}`}
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
        className={`flex-1 flex flex-col items-center gap-1 pt-3 pb-3 transition-colors ${scanActive ? 'text-[#5B4FE9]' : 'text-[#8e8e93]'}`}
        onClick={() => onNavigate('receive')}
        aria-label="Scan QR Code"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M3 9V5a2 2 0 012-2h4M15 3h4a2 2 0 012 2v4M21 15v4a2 2 0 01-2 2h-4M9 21H5a2 2 0 01-2-2v-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="7" y="7" width="10" height="10" rx="1" stroke="currentColor" strokeWidth="1.5" />
        </svg>
        <span className="text-[10px] font-medium">Scan QR Code</span>
      </button>

      {/* Account */}
      <button
        className={`flex-1 flex flex-col items-center gap-1 pt-3 pb-3 transition-colors ${accountActive ? 'text-[#5B4FE9]' : 'text-[#8e8e93]'}`}
        onClick={() => onNavigate('account')}
        aria-label="Account"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <circle
            cx="12" cy="8" r="4"
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
  const { state, setNode, setToken } = useAuth();

  // Onboarding step (used when not authenticated)
  const [onboardingStep, setOnboardingStep] = useState<1 | 2>(1);
  const [pendingNodeId,  setPendingNodeId]  = useState('');
  const [pendingBaseUrl, setPendingBaseUrl] = useState('');

  // Read saved node from localStorage to pre-fill step 1
  const [savedNodeId] = useState<string>(() => {
    try { return localStorage.getItem('neoke_node_id') ?? ''; } catch { return ''; }
  });

  // ── Deep-link detection ──────────────────────────────────────────────────
  // Read once on mount from the URL query string. Accepts:
  //   ?uri=openid-credential-offer://...   (issuance)
  //   ?uri=openid4vp://...                 (verification)
  //   ?offer_uri=...                       (alternative param name)
  //
  // Two encoding forms are handled:
  //   Encoded:   ?uri=openid4vp%3A%2F%2F%3Fclient_id%3DX%26request_uri%3DY
  //   Unencoded: ?uri=openid4vp://?client_id=X&request_uri=Y&request_uri_method=Z
  //              ↑ URLSearchParams splits on &, truncating the URI. We detect
  //                this and re-extract from the raw search string instead.
  const [deepLinkUri] = useState<string | null>(() => {
    const search = window.location.search;
    console.log('[neoke:deeplink] window.location.href:', window.location.href);
    console.log('[neoke:deeplink] window.location.search:', search);
    if (!search) { console.log('[neoke:deeplink] no search string, skipping'); return null; }

    // Raw extraction FIRST — when the inner URI is not encoded, URLSearchParams
    // splits on its & chars and truncates it. Taking the raw substring after
    // 'uri=' gives the complete, unmodified URI (e.g. the full openid4vp://...).
    const raw = search.startsWith('?') ? search.slice(1) : search;
    console.log('[neoke:deeplink] raw query string:', raw);
    for (const key of ['uri', 'offer_uri']) {
      const prefix = `${key}=`;
      const idx = raw.indexOf(prefix);
      if (idx !== -1) {
        const candidate = raw.slice(idx + prefix.length);
        const t = detectUriType(candidate);
        console.log(`[neoke:deeplink] raw candidate for "${key}":`, candidate, '→ type:', t);
        if (t !== 'unknown') return candidate;
      }
    }

    // Fallback: properly-encoded form (?uri=openid4vp%3A%2F%2F...).
    // URLSearchParams decodes the percent-encoding so detectUriType can match.
    const p = new URLSearchParams(search);
    for (const key of ['uri', 'offer_uri']) {
      const val = p.get(key);
      const t = val ? detectUriType(val) : 'null';
      console.log(`[neoke:deeplink] URLSearchParams candidate for "${key}":`, val, '→ type:', t);
      if (val && detectUriType(val) !== 'unknown') return val;
    }

    console.log('[neoke:deeplink] no valid URI found');
    return null;
  });
  const deepLinkType = deepLinkUri ? detectUriType(deepLinkUri) : null;
  console.log('[neoke:deeplink] final deepLinkUri:', deepLinkUri, '| type:', deepLinkType);
  const deepLinkConsumed = useRef(false);

  // Authenticated navigation state
  const [currentView,        setCurrentView]        = useState<ViewName>('dashboard');
  const [selectedCredential, setSelectedCredential] = useState<Credential | null>(null);
  const [pendingUri,         setPendingUri]          = useState<string | undefined>();
  const [refreshSignal,      setRefreshSignal]       = useState(0);

  const navigate = (
    view: ViewName,
    extra?: { selectedCredential?: Credential; pendingUri?: string }
  ) => {
    setSelectedCredential(extra?.selectedCredential ?? null);
    setPendingUri(extra?.pendingUri);
    setCurrentView(view);
  };

  // Reset state on login/logout; consume deep-link if present
  useEffect(() => {
    if (state.token) {
      // Log here so deepLinkUri is visible in the console after the user logs in
      console.log('[neoke:deeplink] *** token set, deepLinkUri:', deepLinkUri, '| type:', deepLinkType);
      console.log('[neoke:deeplink] *** window.location.href at this point:', window.location.href);
      if (deepLinkUri && !deepLinkConsumed.current && deepLinkType !== 'unknown') {
        deepLinkConsumed.current = true;
        // Clean up the URL so a refresh doesn't re-trigger the flow
        window.history.replaceState({}, '', window.location.pathname);
        if (deepLinkType === 'receive') {
          navigate('receive', { pendingUri: deepLinkUri });
        } else {
          navigate('present', { pendingUri: deepLinkUri });
        }
        return;
      }
      setCurrentView('dashboard');
    } else {
      setOnboardingStep(1);
    }
  }, [state.token]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Session expired → re-auth sheet ─────────────────────────────────────
  if (state.sessionExpired) {
    return (
      <div className="w-full max-w-lg mx-auto min-h-screen bg-[#F2F2F7]">
        <ReAuthModal />
      </div>
    );
  }

  // ── Not authenticated → two-step onboarding ──────────────────────────────
  if (!state.token) {
    if (onboardingStep === 2) {
      return (
        <div className="w-full max-w-lg mx-auto">
          <OnboardingStep2Screen
            nodeIdentifier={pendingNodeId}
            nodeBaseUrl={pendingBaseUrl}
            onBack={() => setOnboardingStep(1)}
            onSuccess={(token, expiresAt) => {
              setNode(pendingNodeId, pendingBaseUrl);
              setToken(token, expiresAt);
            }}
          />
        </div>
      );
    }
    return (
      <div className="w-full max-w-lg mx-auto">
        <OnboardingStep1Screen
          savedNodeId={savedNodeId}
          pendingAction={
            deepLinkType === 'receive' ? 'receive'
            : deepLinkType === 'present' ? 'present'
            : null
          }
          onContinue={(nodeId, baseUrl) => {
            setPendingNodeId(nodeId);
            setPendingBaseUrl(baseUrl);
            setOnboardingStep(2);
          }}
        />
      </div>
    );
  }

  // ── Authenticated — main wallet ──────────────────────────────────────────
  const showTabBar = currentView === 'dashboard' || currentView === 'account';

  return (
    <div className="flex flex-col min-h-screen bg-[#F2F2F7] w-full max-w-lg mx-auto">
      <AnimatePresence mode="wait">
        {currentView === 'dashboard' && (
          <DashboardScreen
            key={state.loginNonce}
            navigate={navigate}
            refreshSignal={refreshSignal}
          />
        )}

        {currentView === 'detail' && selectedCredential && (
          <CredentialDetailScreen
            key="detail"
            credential={selectedCredential}
            onBack={() => navigate('dashboard')}
            onCredentialDeleted={() => {
              setRefreshSignal((s) => s + 1);
              navigate('dashboard');
            }}
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
            onPresented={() => setRefreshSignal((s) => s + 1)}
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
