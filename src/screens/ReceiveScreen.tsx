import { useState, useCallback, useEffect } from 'react';
import { receiveCredential, fetchKeys, extractNamespacesFromDoc, extractDisplayMetadataFromDoc, lookupDisplayMetadataForDocType, ApiError } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { detectUriType } from '../utils/uriRouter';
import {
  getCredentialLabel,
  getCredentialDescription,
  getCardColor,
} from '../utils/credentialHelpers';
import { saveLocalCredential } from '../store/localCredentials';
import QRScanner from '../components/QRScanner';
import PrimaryButton from '../components/PrimaryButton';
import ErrorMessage from '../components/ErrorMessage';
import CredentialThumbnail from '../components/CredentialThumbnail';
import Layout from '../components/Layout';
import PageHeader from '../components/PageHeader';
import TextInput from '../components/TextInput';
import type { Credential, ViewName } from '../types';

type Stage = 'scan' | 'loading' | 'consent' | 'success' | 'error';

interface ReceiveScreenProps {
  navigate: (view: ViewName, extra?: { selectedCredential?: Credential; pendingUri?: string }) => void;
  onCredentialReceived: () => void;
  initialUri?: string;
}

// ── Shared icons ──────────────────────

function IconCamera() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="13" r="4" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function IconPaste() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 20h9M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconCheckCircle() {
  return (
    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="10" stroke="#5B4FE9" strokeWidth="1.2" />
      <path
        d="M8.5 12l2.5 2.5 4.5-5"
        stroke="#5B4FE9"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <animate attributeName="stroke-dashoffset" from="20" to="0" dur="0.5s" />
      </path>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

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
        'This URI is not recognized. Please check it is a valid credential offer or presentation request.'
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
      const raw = response as Record<string, unknown>;
      let cred: Credential | null =
        (raw['credential'] as Credential) ??
        (raw['document'] as Credential) ??
        (raw['mdoc'] as Credential) ??
        (raw['data'] as Credential) ??
        (response as unknown as Credential) ??
        null;

      if (!cred || typeof cred !== 'object') {
        setError('Received an unexpected response from the server.');
        setStage('error');
        return;
      }

      if (!cred.docType && Array.isArray(cred.type) && cred.type.length > 0) {
        cred = { ...cred, docType: cred.type[0] as string };
      }

      if (!cred.namespaces) {
        const ns = extractNamespacesFromDoc(response) ?? extractNamespacesFromDoc(raw['credential']);
        if (ns) cred = { ...cred, namespaces: ns };
      }
      if (!cred.displayMetadata) {
        const dm = extractDisplayMetadataFromDoc(response) ?? extractDisplayMetadataFromDoc(raw['credential']);
        if (dm) cred = { ...cred, displayMetadata: dm };
      }
      if (!cred.displayMetadata && cred.docType) {
        const dm = await lookupDisplayMetadataForDocType(state.token, cred.docType);
        if (dm) cred = { ...cred, displayMetadata: dm };
      }

      saveLocalCredential(cred);
      setReceivedCredential(cred);
      setStage('consent');
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) { markExpired(); return; }
      setError(err instanceof Error ? err.message : 'Could not receive credential.');
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
      <Layout className="items-center justify-center">
        <div className="text-center space-y-6">
          <div className="w-16 h-16 border-4 border-[#5B4FE9]/10 border-t-[#5B4FE9] rounded-full animate-spin mx-auto" />
          <p className="text-[#8e8e93] text-[15px] font-medium">Processing request…</p>
        </div>
      </Layout>
    );
  }

  // ── Error ──
  if (stage === 'error') {
    return (
      <Layout>
        <PageHeader title="Issue encountered" onBack={() => navigate('dashboard')} />
        <main className="flex-1 px-6 flex flex-col items-center justify-center space-y-8 pb-20">
          <ErrorMessage message={error} />
          <button
            onClick={() => { setStage('scan'); setError(''); setManualUri(''); }}
            className="w-full bg-white hover:bg-black/5 text-[#1c1c1e] text-[15px] font-semibold py-4 rounded-[20px] transition-colors border border-black/[0.04] active:scale-[0.98]"
          >
            Try again
          </button>
        </main>
      </Layout>
    );
  }

  // ── Success ──
  if (stage === 'success') {
    return (
      <Layout className="items-center justify-center">
        <div className="text-center space-y-6">
          <div className="w-24 h-24 bg-[#5B4FE9]/5 rounded-full flex items-center justify-center mx-auto scale-110">
            <IconCheckCircle />
          </div>
          <div className="animate-in fade-in slide-in-from-top-2 duration-500">
            <p className="text-[#1c1c1e] font-bold text-[28px] tracking-tight">Success!</p>
            <p className="text-[#8e8e93] text-[15px] mt-1">Stored in your vault.</p>
          </div>
        </div>
      </Layout>
    );
  }

  // ── Consent ──
  if (stage === 'consent' && receivedCredential) {
    const label = getCredentialLabel(receivedCredential);
    const description = getCredentialDescription(receivedCredential);
    const { backgroundColor, textColor } = getCardColor(receivedCredential);
    const logoUrl = receivedCredential.displayMetadata?.logoUrl;

    return (
      <Layout className="bg-white md:bg-[#F2F2F7]">
        <div className="flex-1 bg-[#F2F2F7] rounded-t-[32px] md:rounded-none flex flex-col overflow-hidden">
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-9 h-1.5 rounded-full bg-black/10" />
          </div>
          
          <PageHeader 
            title={`Save your ${label}?`} 
            onBack={() => navigate('dashboard')}
            className="pb-4"
          />

          <main className="flex-1 px-6 pt-2 pb-28">
            <p className="text-[14px] font-bold text-[#8e8e93] uppercase tracking-wider mb-4 px-1">Details</p>
            <div className="bg-white rounded-[24px] flex items-center p-4 shadow-sm border border-black/[0.01]">
              <CredentialThumbnail
                backgroundColor={backgroundColor}
                textColor={textColor}
                logoUrl={logoUrl}
                className="mr-4"
              />
              <div className="flex-1 min-w-0">
                <p className="text-[16px] font-bold text-[#1c1c1e] truncate">{label}</p>
                {description && (
                  <p className="text-[13px] text-[#8e8e93] truncate mt-0.5">{description}</p>
                )}
              </div>
            </div>
          </main>

          <footer className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto px-6 pt-4 pb-12 space-y-3 bg-[#F2F2F7] border-t border-black/[0.02]">
            <PrimaryButton onClick={handleAccept} loading={processing}>
              Save to wallet
            </PrimaryButton>
            <button
              onClick={() => navigate('dashboard')}
              className="w-full py-2 text-[15px] font-bold text-[#5B4FE9] active:opacity-60 transition-opacity"
            >
              Discard
            </button>
          </footer>
        </div>
      </Layout>
    );
  }

  // ── Scan ──
  return (
    <Layout>
      <PageHeader 
        title="Scan QR Code" 
        subtitle="Receive or present a credential" 
        onBack={() => navigate('dashboard')}
      />

      <main className={`flex-1 px-6 space-y-6 ${showManual ? 'pb-32' : 'pb-10'}`}>
        {/* Toggle */}
        <div className="flex bg-black/[0.04] rounded-[18px] p-1.5">
          <button
            className={`flex-1 flex items-center justify-center gap-2.5 py-2.5 text-[14px] rounded-[12px] transition-all duration-200 ${!showManual ? 'bg-white text-[#1c1c1e] font-bold shadow-sm' : 'text-[#8e8e93] font-medium'}`}
            onClick={() => setShowManual(false)}
          >
            <IconCamera />
            Camera
          </button>
          <button
            className={`flex-1 flex items-center justify-center gap-2.5 py-2.5 text-[14px] rounded-[12px] transition-all duration-200 ${showManual ? 'bg-white text-[#1c1c1e] font-bold shadow-sm' : 'text-[#8e8e93] font-medium'}`}
            onClick={() => setShowManual(true)}
          >
            <IconPaste />
            Paste URI
          </button>
        </div>

        {showManual ? (
          <div className="space-y-4 animate-in fade-in slide-in-from-top-1 duration-400">
            <TextInput
              multiline
              value={manualUri}
              onChange={(e) => { setManualUri(e.target.value); setError(''); }}
              placeholder="openid-credential-offer://..."
              rows={6}
              className="font-mono text-[13px] leading-relaxed"
            />
            {error && <ErrorMessage message={error} />}
          </div>
        ) : (
          <div className="space-y-6 group">
            <div className="relative rounded-[32px] overflow-hidden border-4 border-white shadow-xl">
              <QRScanner onScan={(r) => processOfferUri(r)} />
              <div className="absolute inset-0 border-[40px] border-black/20 pointer-events-none" />
            </div>
            {error && <ErrorMessage message={error} />}
            <p className="text-center text-[13px] text-[#aeaeb2] font-medium">
              Line up the QR code within the frame
            </p>
          </div>
        )}
      </main>

      {showManual && (
        <footer className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto px-6 pt-4 pb-12 bg-[#F2F2F7] border-t border-black/[0.02] z-40">
          <PrimaryButton
            onClick={() => { if (manualUri.trim()) processOfferUri(manualUri.trim()); }}
            disabled={!manualUri.trim()}
          >
            Process URI
          </PrimaryButton>
        </footer>
      )}
    </Layout>
  );
}
