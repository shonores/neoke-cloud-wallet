import { motion } from 'framer-motion';
import {
  getCardGradient,
  getCredentialLabel,
  getCredentialDescription,
  inferStatus,
  getNamespaceGroups,
  extractFields,
  formatDate,
} from '../utils/credentialHelpers';
import { deleteLocalCredential } from '../store/localCredentials';
import StatusBadge from '../components/StatusBadge';
import type { Credential } from '../types';

interface CredentialDetailScreenProps {
  credential: Credential;
  onBack: () => void;
}

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}/;

export default function CredentialDetailScreen({ credential, onBack }: CredentialDetailScreenProps) {
  const gradient = getCardGradient(credential);
  const label = credential.displayMetadata?.label ?? getCredentialLabel(credential);
  const description = getCredentialDescription(credential);
  const status = inferStatus(credential);
  const bgColor = credential.displayMetadata?.backgroundColor ?? gradient.from;
  const textColor = credential.displayMetadata?.textColor ?? '#ffffff';

  const docType = credential.docType ?? '';
  const isMdoc = docType.startsWith('org.iso.') || docType.toLowerCase().includes('mdoc');
  const badgeText = isMdoc ? 'mDOC' : null;

  const namespaceGroups = getNamespaceGroups(credential);
  const genericFields = namespaceGroups.length === 0 ? extractFields(credential) : [];

  const handleDelete = () => {
    deleteLocalCredential(credential.id);
    onBack();
  };

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 28, stiffness: 280 }}
      className="fixed inset-0 bg-[#F2F2F7] z-40 flex flex-col overflow-y-auto"
    >
      {/* Navigation header */}
      <div className="flex items-center justify-between px-5 pt-12 pb-4 flex-shrink-0">
        <button
          onClick={onBack}
          className="w-10 h-10 rounded-full bg-black/6 hover:bg-black/10 flex items-center justify-center transition-colors"
          aria-label="Go back"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M10 3L5 8l5 5"
              stroke="#1c1c1e"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <h2 className="text-base font-semibold text-[#1c1c1e] truncate max-w-[55%]">{label}</h2>
        <button
          onClick={handleDelete}
          className="w-10 h-10 rounded-full bg-black/6 hover:bg-red-50 flex items-center justify-center transition-colors group"
          aria-label="Delete credential"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M2 4h12M5.5 4V2.5A1 1 0 016.5 1.5h3a1 1 0 011 1V4M6.5 7v5M9.5 7v5M3.5 4l.5 9a1 1 0 001 1h6a1 1 0 001-1l.5-9"
              stroke="#8e8e93"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="group-hover:stroke-red-500 transition-colors"
            />
          </svg>
        </button>
      </div>

      {/* Card */}
      <div className="px-5 flex-shrink-0">
        <div
          className="rounded-[20px] overflow-hidden p-5 flex flex-col justify-between"
          style={{ background: bgColor, color: textColor, aspectRatio: '1.586' }}
        >
          <div className="flex justify-between items-start">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.2)' }}
            >
              <span style={{ fontSize: 18 }}>🪪</span>
            </div>
            <div className="flex items-center gap-1" style={{ opacity: 0.85 }}>
              <div className="w-3.5 h-3.5 rounded-full" style={{ background: 'rgba(255,255,255,0.9)' }} />
              <div className="w-3.5 h-3.5 rounded-full -ml-2" style={{ background: 'rgba(255,255,255,0.5)' }} />
              <span className="text-[11px] font-bold tracking-widest ml-1.5" style={{ color: textColor }}>
                NEOKE
              </span>
            </div>
          </div>
          <div>
            <p className="text-xl font-bold leading-tight" style={{ color: textColor }}>{label}</p>
            {description && (
              <p className="text-sm mt-1 leading-snug" style={{ color: textColor, opacity: 0.7 }}>
                {description}
              </p>
            )}
          </div>
          <div className="flex justify-between items-end">
            <div className="text-xs" style={{ color: textColor, opacity: 0.55 }}>
              {credential.expirationDate && <span>Expires {formatDate(credential.expirationDate)}</span>}
            </div>
            {badgeText && (
              <div className="px-2.5 py-0.5 rounded-md" style={{ background: 'rgba(255,255,255,0.2)' }}>
                <span className="text-xs font-bold tracking-wide" style={{ color: textColor }}>
                  {badgeText}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="flex-1 px-5 pt-4 pb-8 space-y-3">
        {/* Status + metadata */}
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-black/5">
            <span className="text-sm text-[#8e8e93]">Status</span>
            <StatusBadge status={status} />
          </div>
          {credential.issuanceDate && (
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-black/5">
              <span className="text-sm text-[#8e8e93]">Issued</span>
              <span className="text-sm font-medium text-[#1c1c1e]">{formatDate(credential.issuanceDate)}</span>
            </div>
          )}
          {credential.expirationDate && (
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-black/5">
              <span className="text-sm text-[#8e8e93]">Expires</span>
              <span className="text-sm font-medium text-[#1c1c1e]">{formatDate(credential.expirationDate)}</span>
            </div>
          )}
          <div className="px-4 py-3.5">
            <span className="text-sm text-[#8e8e93] block mb-1">Issuer</span>
            <span className="text-xs font-mono text-[#1c1c1e] break-all">{credential.issuer}</span>
          </div>
        </div>

        {/* Fields */}
        {(namespaceGroups.length > 0 || genericFields.length > 0) && (
          <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
            <div className="px-4 py-2.5 border-b border-black/5">
              <p className="text-xs text-[#8e8e93] font-semibold uppercase tracking-wide">Fields</p>
            </div>
            {namespaceGroups.length > 0
              ? namespaceGroups.flatMap((group, gi) =>
                  group.fields.map((field, fi) => (
                    <FieldRow
                      key={`${gi}-${fi}`}
                      label={field.label}
                      value={field.value}
                      isLast={gi === namespaceGroups.length - 1 && fi === group.fields.length - 1}
                    />
                  ))
                )
              : genericFields.map((field, i) => (
                  <FieldRow
                    key={i}
                    label={field.label}
                    value={field.value}
                    isLast={i === genericFields.length - 1}
                  />
                ))}
          </div>
        )}

        {/* Credential ID */}
        {credential.id && (
          <div className="bg-white rounded-2xl px-4 py-3 shadow-sm">
            <p className="text-xs text-[#8e8e93] mb-1">Credential ID</p>
            <p className="text-xs font-mono text-[#aeaeb2] break-all">{credential.id}</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

interface FieldRowProps {
  label: string;
  value: unknown;
  isLast: boolean;
}

function FieldRow({ label, value, isLast }: FieldRowProps) {
  const lowerLabel = label.toLowerCase();
  const isImage =
    (lowerLabel.includes('photo') || lowerLabel.includes('portrait') || lowerLabel.includes('picture')) &&
    typeof value === 'string' &&
    value.length > 50;

  if (isImage) {
    const src =
      typeof value === 'string' && value.startsWith('data:')
        ? value
        : `data:image/jpeg;base64,${value}`;
    return (
      <div className={`px-4 py-3 ${!isLast ? 'border-b border-black/5' : ''}`}>
        <p className="text-sm text-[#8e8e93] mb-2">{label}</p>
        <img src={src} alt={label} className="w-24 h-32 object-cover rounded-xl" loading="lazy" />
      </div>
    );
  }

  let displayValue: string;
  if (value === null || value === undefined) {
    displayValue = '—';
  } else if (typeof value === 'boolean') {
    displayValue = value ? 'Yes' : 'No';
  } else if (typeof value === 'string' && ISO_DATE_REGEX.test(value)) {
    displayValue = formatDate(value);
  } else if (typeof value === 'object') {
    displayValue = JSON.stringify(value);
  } else {
    displayValue = String(value);
  }

  return (
    <div className={`flex items-start justify-between gap-4 px-4 py-3 ${!isLast ? 'border-b border-black/5' : ''}`}>
      <span className="text-sm text-[#8e8e93] flex-shrink-0 max-w-[45%]">{label}</span>
      <span className="text-sm font-medium text-[#1c1c1e] text-right break-all flex-1">{displayValue}</span>
    </div>
  );
}
