import { useState, useCallback, useEffect } from 'react';
import { receiveCredential, fetchKeys } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { detectUriType } from '../utils/uriRouter';
import { getCredentialLabel, extractFields } from '../utils/credentialHelpers';
import { saveLocalCredential } from '../store/localCredentials';
import QRScanner from '../components/QRScanner';
import ConsentLayout from '../components/ConsentLayout';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import type { Credential, ViewName } from '../types';

type Stage = 'scan' | 'loading' | 'consent' | 'success' | 'error';

interface ReceiveScreenProps {
  navigate: (view: ViewName, extra?: { selectedCredential?: Credential; pendingUri?: string }) => void;
  onCredentialReceived: () => void;
  initialUri?: string;
}

export default function ReceiveScreen({ navigate, onCredentialReceived, initialUri }: ReceiveScreenProps) {
  const { state, markExpired } = useAuth();
  const [stage, setStage] = useState<Stage>(initialUri ? 'loading' : 'scan');
  const [manualUri, setManualUri] = useState(initialUri ?? '');
  const [showManual, setShowManual] = useState(!!initialUri);
  const [receivedCredential, setReceivedCredential] = useState<Credential | null>(null);
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);

  const processOfferUri = useCallback(async (uri: string) => {
    if (!state.token) return;
    const trimmed = uri.trim();

    const uriType = detectUriType(trimmed);
    if (uriType === 'present') {
      navigate('present', { pendingUri: trimmed });
      return;
    }
    if (uriType === 'unknown') {
      setError(
        'This URI is not recognized. Please check it is a valid credential offer (openid-credential-offer://) or presentation request (openid4vp://).'
      );
      setStage('error');
      return;
    }

    setStage('loading');
    setError('');

    let keyId = '';
    try {
      const keys = await fetchKeys(state.token);
      if (keys.length > 0) keyId = keys[0].id;
    } catch {
      // proceed without keyId
    }

    try {
      const response = await receiveCredential(state.token, trimmed, keyId);
      const cred: Credential | null =
        (response.credential as Credential) ??
        (response as unknown as Credential) ??
        null;

      if (!cred || typeof cred !== 'object') {
        setError('Received an unexpected response from the server. Please try again or contact the issuer.');
        setStage('error');
        return;
      }

      saveLocalCredential(cred);
      setReceivedCredential(cred);
      setStage('consent');
    } catch (err) {
      if (err instanceof Error && err.message.includes('session')) {
        markExpired();
        return;
      }
      setError(
        err instanceof Error
          ? `Could not receive credential: ${err.message}`
          : 'Could not receive credential. Please check your network connection and try again.'
      );
      setStage('error');
    }
  }, [state.token, navigate, markExpired]);

  useEffect(() => {
    if (initialUri) processOfferUri(initialUri);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAccept = async () => {
    setProcessing(true);
    onCredentialReceived();
    setStage('success');
    setProcessing(false);
    setTimeout(() => navigate('dashboard'), 1500);
  };

  // ── Loading ──
  if (stage === 'loading') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 min-h-screen bg-[#F2F2F7]">
        <div className="text-center space-y-4">
          <LoadingSpinner size="lg" className="mx-auto" />
          <p className="text-[#8e8e93] text-sm">Processing credential offer…</p>
        </div>
      </div>
    );
  }

  // ── Error ──
  if (stage === 'error') {
    return (
      <div className="flex-1 flex flex-col p-6 min-h-screen bg-[#F2F2F7]">
        <button
          onClick={() => navigate('dashboard')}
          className="self-start text-[#8e8e93] hover:text-[#1c1c1e] text-sm flex items-center gap-1.5 min-h-[44px]"
        >
          ← Back
        </button>
        <div className="flex-1 flex flex-col items-center justify-center space-y-4">
          <ErrorMessage message={error} />
          <button
            onClick={() => { setStage('scan'); setError(''); setManualUri(''); }}
            className="bg-white hover:bg-[#e5e5ea] text-[#1c1c1e] text-sm py-3 px-6 rounded-2xl transition-colors min-h-[44px] shadow-sm border border-black/5"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  // ── Success ──
  if (stage === 'success') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 min-h-screen bg-[#F2F2F7]">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto">
            <span className="text-4xl" aria-hidden>✅</span>
          </div>
          <div>
            <p className="text-[#1c1c1e] font-semibold text-lg">Credential Added!</p>
            <p className="text-[#8e8e93] text-sm mt-1">Returning to your wallet…</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Consent ──
  if (stage === 'consent' && receivedCredential) {
    const label = getCredentialLabel(receivedCredential);
    const issuer = receivedCredential.issuer ?? 'Unknown Issuer';
    const fields = extractFields(receivedCredential);

    return (
      <div className="flex flex-col min-h-screen bg-[#F2F2F7]">
        <div className="pt-12 px-5 pb-2 flex-shrink-0">
          <button
            onClick={() => navigate('dashboard')}
            className="text-[#8e8e93] hover:text-[#1c1c1e] text-sm flex items-center gap-1.5 min-h-[44px]"
          >
            ← Cancel
          </button>
        </div>
        <div className="flex-1">
          <ConsentLayout
            icon="📥"
            title="New Credential"
            subtitle="An issuer wants to add a credential to your wallet"
            actions={[
              { label: 'Decline', onClick: () => navigate('dashboard'), variant: 'secondary' },
              { label: 'Accept', onClick: handleAccept, variant: 'primary', loading: processing },
            ]}
          >
            <div className="bg-[#f2f2f7] rounded-2xl p-4 space-y-1">
              <p className="text-xs text-[#8e8e93] font-semibold uppercase tracking-wide">Issuer</p>
              <p className="text-sm text-[#1c1c1e] font-mono break-all">{issuer}</p>
            </div>

            <div className="bg-[#f2f2f7] rounded-2xl p-4 space-y-1">
              <p className="text-xs text-[#8e8e93] font-semibold uppercase tracking-wide">Credential Type</p>
              <p className="text-sm text-[#1c1c1e] font-semibold">{label}</p>
              {receivedCredential.docType && (
                <p className="text-xs text-[#8e8e93] font-mono">{receivedCredential.docType}</p>
              )}
            </div>

            {fields.length > 0 && (
              <div className="bg-[#f2f2f7] rounded-2xl p-4">
                <p className="text-xs text-[#8e8e93] font-semibold uppercase tracking-wide mb-3">Data included</p>
                <div className="space-y-2">
                  {fields.map((field, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-[#1c1c1e]">
                      <span className="text-blue-500 flex-shrink-0" aria-hidden>☑</span>
                      <span>{field.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <p className="text-xs text-[#aeaeb2] text-center leading-relaxed px-2">
              By accepting, you consent to storing this credential in your cloud wallet.
              You can view and present it at any time.
            </p>
          </ConsentLayout>
        </div>
      </div>
    );
  }

  // ── Scan ──
  return (
    <div className="flex flex-col min-h-screen bg-[#F2F2F7]">
      <header className="flex items-center gap-4 px-5 pt-12 pb-4 flex-shrink-0">
        <button
          onClick={() => navigate('dashboard')}
          className="w-9 h-9 rounded-full bg-black/6 hover:bg-black/10 flex items-center justify-center text-[#1c1c1e] transition-colors"
          aria-label="Go back"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div>
          <h2 className="text-lg font-bold text-[#1c1c1e]">Scan QR Code</h2>
          <p className="text-xs text-[#8e8e93]">Receive or present a credential</p>
        </div>
      </header>

      <div className="flex-1 px-5 pb-8 space-y-4">
        <div className="flex bg-black/5 rounded-xl p-1">
          <button
            className={`flex-1 py-2 text-sm rounded-lg transition-colors ${!showManual ? 'bg-white text-[#1c1c1e] font-medium shadow-sm' : 'text-[#8e8e93]'}`}
            onClick={() => setShowManual(false)}
          >
            📷 Camera
          </button>
          <button
            className={`flex-1 py-2 text-sm rounded-lg transition-colors ${showManual ? 'bg-white text-[#1c1c1e] font-medium shadow-sm' : 'text-[#8e8e93]'}`}
            onClick={() => setShowManual(true)}
          >
            ✏️ Paste URI
          </button>
        </div>

        {showManual ? (
          <form
            onSubmit={(e) => { e.preventDefault(); if (manualUri.trim()) processOfferUri(manualUri.trim()); }}
            className="space-y-3"
          >
            <textarea
              value={manualUri}
              onChange={(e) => { setManualUri(e.target.value); setError(''); }}
              placeholder="openid-credential-offer://... or openid4vp://..."
              rows={5}
              className="w-full bg-white border border-black/8 rounded-2xl px-4 py-3 text-[#1c1c1e] placeholder-[#aeaeb2] text-sm font-mono focus:outline-none focus:border-blue-500 resize-none shadow-sm"
              aria-label="Paste credential offer or presentation URI"
            />
            {error && <ErrorMessage message={error} />}
            <button
              type="submit"
              disabled={!manualUri.trim()}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-semibold py-3.5 rounded-2xl text-sm transition-colors min-h-[44px]"
            >
              Process URI
            </button>
          </form>
        ) : (
          <div className="space-y-3">
            <QRScanner onScan={(r) => processOfferUri(r)} />
            {error && <ErrorMessage message={error} />}
            <p className="text-center text-xs text-[#aeaeb2]">
              Supports credential offers and presentation requests
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
