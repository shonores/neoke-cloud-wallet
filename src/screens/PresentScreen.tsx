import { useState, useCallback, useEffect } from 'react';
import { previewPresentation, respondPresentation } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { detectUriType } from '../utils/uriRouter';
import {
  parseDisclosedClaim,
  getCandidateLabel,
  getCandidateGradient,
} from '../utils/credentialHelpers';
import QRScanner from '../components/QRScanner';
import ConsentLayout from '../components/ConsentLayout';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import type { Credential, VPPreviewResponse, VPCandidate, ViewName } from '../types';

type Stage = 'scan' | 'loading' | 'consent' | 'presenting' | 'success' | 'error';

interface PresentScreenProps {
  navigate: (view: ViewName, extra?: { selectedCredential?: Credential; pendingUri?: string }) => void;
  initialUri?: string;
}

export default function PresentScreen({ navigate, initialUri }: PresentScreenProps) {
  const { state, markExpired } = useAuth();
  const [stage, setStage] = useState<Stage>(initialUri ? 'loading' : 'scan');
  const [manualUri, setManualUri] = useState(initialUri ?? '');
  const [showManual, setShowManual] = useState(!!initialUri);
  const [currentRequestUri, setCurrentRequestUri] = useState(initialUri ?? '');
  const [preview, setPreview] = useState<VPPreviewResponse | null>(null);
  // selections: { [queryId]: candidateIndex }
  const [selections, setSelections] = useState<Record<string, number>>({});
  const [error, setError] = useState('');
  const [successResult, setSuccessResult] = useState<{ redirectUri?: string } | null>(null);

  const processPresentUri = useCallback(async (uri: string) => {
    if (!state.token) return;
    const trimmed = uri.trim();

    const uriType = detectUriType(trimmed);
    if (uriType === 'receive') {
      navigate('receive', { pendingUri: trimmed });
      return;
    }
    if (uriType === 'unknown') {
      setError('This URI is not recognized. Please check it is a valid presentation request (openid4vp://).');
      setStage('error');
      return;
    }

    setStage('loading');
    setError('');
    setCurrentRequestUri(trimmed);

    try {
      const data = await previewPresentation(state.token, trimmed);

      const hasAnyCandidate = data.queries?.some((q) => q.candidates?.length > 0);
      if (!data.queries || data.queries.length === 0 || !hasAnyCandidate) {
        setError(
          "No matching credential found. The verifier is requesting a credential type that isn't in your wallet yet. Try receiving the required credential first."
        );
        setStage('error');
        return;
      }

      // Initialise selections to the first candidate of each query
      const initial: Record<string, number> = {};
      for (const q of data.queries) {
        if (q.candidates.length > 0) initial[q.queryId] = q.candidates[0].index;
      }
      setSelections(initial);
      setPreview(data);
      setStage('consent');
    } catch (err) {
      if (err instanceof Error && err.message.includes('session')) {
        markExpired();
        return;
      }
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to process the presentation request. Please check your network connection and try again.'
      );
      setStage('error');
    }
  }, [state.token, navigate, markExpired]);

  useEffect(() => {
    if (initialUri) processPresentUri(initialUri);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleShare = async () => {
    if (!state.token || !currentRequestUri) return;
    setStage('presenting');
    try {
      const result = await respondPresentation(state.token, currentRequestUri, selections);
      setSuccessResult({ redirectUri: result.redirectUri });
      setStage('success');
    } catch (err) {
      if (err instanceof Error && err.message.includes('session')) {
        markExpired();
        return;
      }
      setError(
        err instanceof Error
          ? `Presentation failed: ${err.message}`
          : 'Presentation failed. The verifier could not verify your credential.'
      );
      setStage('error');
    }
  };

  // ── Loading / Presenting ──
  if (stage === 'loading' || stage === 'presenting') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 min-h-screen bg-[#F2F2F7]">
        <div className="text-center space-y-4">
          <LoadingSpinner size="lg" className="mx-auto" />
          <p className="text-[#8e8e93] text-sm">
            {stage === 'loading' ? 'Processing request…' : 'Sharing credential…'}
          </p>
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
        <div className="text-center space-y-5">
          <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto">
            <span className="text-4xl" aria-hidden>✅</span>
          </div>
          <div>
            <p className="text-[#1c1c1e] font-semibold text-lg">Credential Shared</p>
            <p className="text-[#8e8e93] text-sm mt-1">The verifier has received your credential.</p>
          </div>
          {successResult?.redirectUri && (
            <div className="bg-white rounded-2xl p-4 text-left shadow-sm">
              <p className="text-xs text-[#8e8e93] uppercase tracking-wide mb-1">Redirect</p>
              <p className="text-xs font-mono text-[#1c1c1e] break-all">{successResult.redirectUri}</p>
            </div>
          )}
          <button
            onClick={() => navigate('dashboard')}
            className="bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 px-8 rounded-2xl text-sm transition-colors min-h-[44px]"
          >
            Back to Wallet
          </button>
        </div>
      </div>
    );
  }

  // ── Consent ──
  if (stage === 'consent' && preview) {
    const verifierName = preview.verifier.name ?? preview.verifier.clientId;

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
            icon="📤"
            title="Share Credential"
            subtitle="A verifier is requesting your data"
            actions={[
              { label: 'Decline', onClick: () => navigate('dashboard'), variant: 'secondary' },
              { label: 'Share', onClick: handleShare, variant: 'primary' },
            ]}
          >
            {/* Verifier */}
            <div className="bg-[#f2f2f7] rounded-2xl p-4 space-y-1">
              <p className="text-xs text-[#8e8e93] font-semibold uppercase tracking-wide">Verifier</p>
              <p className="text-sm text-[#1c1c1e] font-semibold break-all">{verifierName}</p>
              {preview.verifier.name && (
                <p className="text-xs text-[#8e8e93] font-mono break-all">{preview.verifier.clientId}</p>
              )}
            </div>

            {/* Purpose */}
            {preview.verifier.purpose && (
              <div className="bg-[#f2f2f7] rounded-2xl p-4 space-y-1">
                <p className="text-xs text-[#8e8e93] font-semibold uppercase tracking-wide">Purpose</p>
                <p className="text-sm text-[#1c1c1e]">{preview.verifier.purpose}</p>
              </div>
            )}

            {/* Queries */}
            {preview.queries.map((query) => {
              const selectedIdx = selections[query.queryId] ?? query.candidates[0]?.index ?? 0;
              const selectedCandidate: VPCandidate | undefined =
                query.candidates.find((c) => c.index === selectedIdx) ?? query.candidates[0];

              return (
                <div key={query.queryId} className="space-y-2">
                  {/* Multi-candidate picker */}
                  {query.candidates.length > 1 ? (
                    <div>
                      <p className="text-xs text-[#8e8e93] font-semibold uppercase tracking-wide mb-2">
                        Choose credential{!query.required && ' (optional)'}
                      </p>
                      <div className="space-y-2">
                        {query.candidates.map((cand) => {
                          const isSelected = selectedIdx === cand.index;
                          const gradient = getCandidateGradient(cand.type);
                          const label = getCandidateLabel(cand.type);
                          return (
                            <button
                              key={cand.index}
                              onClick={() => setSelections((s) => ({ ...s, [query.queryId]: cand.index }))}
                              className={`w-full rounded-2xl p-3 flex items-center gap-3 border-2 transition-all ${
                                isSelected ? 'border-blue-500 shadow-md' : 'border-transparent opacity-70'
                              }`}
                              style={{ background: gradient.from }}
                            >
                              <div
                                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                                style={{ background: 'rgba(255,255,255,0.2)' }}
                              >
                                <span className="text-lg" aria-hidden>🪪</span>
                              </div>
                              <div className="min-w-0 text-left flex-1">
                                <p className="text-sm font-semibold text-white">{label}</p>
                                <p className="text-xs text-white/70 truncate">{cand.issuer}</p>
                              </div>
                              {isSelected && (
                                <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center flex-shrink-0">
                                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                                    <path d="M2 5l2.5 2.5L8 3" stroke="#2563eb" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                  </svg>
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : query.candidates.length === 1 ? (
                    <div className="space-y-1">
                      <p className="text-xs text-[#8e8e93] font-semibold uppercase tracking-wide">From your wallet</p>
                      <div
                        className="rounded-2xl p-4 flex items-center gap-3"
                        style={{ background: getCandidateGradient(query.candidates[0].type).from }}
                      >
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{ background: 'rgba(255,255,255,0.2)' }}
                        >
                          <span className="text-xl" aria-hidden>🪪</span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-white">
                            {getCandidateLabel(query.candidates[0].type)}
                          </p>
                          <p className="text-xs text-white/70 truncate">{query.candidates[0].issuer}</p>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {/* Fields being disclosed for the selected candidate */}
                  {selectedCandidate && selectedCandidate.claims.disclosed.length > 0 && (
                    <div className="bg-[#f2f2f7] rounded-2xl p-4">
                      <p className="text-xs text-[#8e8e93] font-semibold uppercase tracking-wide mb-3">
                        Fields to share
                      </p>
                      <div className="space-y-2">
                        {selectedCandidate.claims.disclosed.map((claim, i) => (
                          <div key={i} className="flex items-center gap-2 text-sm text-[#1c1c1e]">
                            <span className="text-blue-500 flex-shrink-0" aria-hidden>☑</span>
                            <span>{parseDisclosedClaim(claim)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            <p className="text-xs text-[#aeaeb2] text-center leading-relaxed px-2">
              Only the requested fields will be shared. This action cannot be undone.
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
          <h2 className="text-lg font-bold text-[#1c1c1e]">Present Credential</h2>
          <p className="text-xs text-[#8e8e93]">Scan or paste a presentation request URI</p>
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
            onSubmit={(e) => { e.preventDefault(); if (manualUri.trim()) processPresentUri(manualUri.trim()); }}
            className="space-y-3"
          >
            <textarea
              value={manualUri}
              onChange={(e) => { setManualUri(e.target.value); setError(''); }}
              placeholder="openid4vp://..."
              rows={5}
              className="w-full bg-white border border-black/8 rounded-2xl px-4 py-3 text-[#1c1c1e] placeholder-[#aeaeb2] text-sm font-mono focus:outline-none focus:border-blue-500 resize-none shadow-sm"
              aria-label="Paste presentation request URI"
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
            <QRScanner onScan={(r) => processPresentUri(r)} />
            {error && <ErrorMessage message={error} />}
            <p className="text-center text-xs text-[#aeaeb2]">
              Supports{' '}
              <span className="font-mono">openid4vp://</span> presentation requests
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
