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

// Inline Neoke logo for the detail card (same as CredentialCard)
function NeokeLogoMark({ color = '#ffffff' }: { color?: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <svg width="22" height="16" viewBox="0 0 22 16" fill="none" aria-hidden>
        <path
          d="M2 14 L2 2 L11 14 L11 2"
          stroke={color}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M13 8 C13 4.5 15.5 2 19 2 C19 5.5 16.5 8 13 8 Z"
          fill={color}
          opacity="0.9"
        />
        <path
          d="M13 8 C13 11.5 15.5 14 19 14 C19 10.5 16.5 8 13 8 Z"
          fill={color}
          opacity="0.6"
        />
      </svg>
      <span
        className="text-[13px] font-semibold tracking-tight"
        style={{ color, opacity: 0.95 }}
      >
        neoke
      </span>
    </div>
  );
}

export default function CredentialDetailScreen({ credential, onBack }: CredentialDetailScreenProps) {
  const gradient = getCardGradient(credential);
  const label = credential.displayMetadata?.label ?? getCredentialLabel(credential);
  const description =
    credential.displayMetadata?.description ?? getCredentialDescription(credential);
  const status = inferStatus(credential);
  const bgColor = credential.displayMetadata?.backgroundColor ?? gradient.from;
  const textColor = credential.displayMetadata?.textColor ?? '#ffffff';
  const logoUrl = credential.displayMetadata?.logoUrl;

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
      className="fixed inset-0 bg-[#F2F2F7] z-40 flex justify-center overflow-y-auto"
    >
    {/* Inner column matches the same max-w-lg as the rest of the app */}
    <div className="w-full max-w-lg flex flex-col">
      {/* Navigation row: back left, delete right */}
      <div className="flex items-center justify-between px-4 pt-12 pb-2 flex-shrink-0">
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

      {/* Page title — large h1 below the nav row */}
      <h1 className="text-[28px] font-bold text-[#1c1c1e] px-4 pb-4 flex-shrink-0 leading-tight">
        {label}
      </h1>

      {/* Card — full width with side padding, same design as CredentialCard */}
      <div className="px-4 flex-shrink-0">
        <div
          className="rounded-[20px] overflow-hidden p-5 flex flex-col"
          style={{ background: bgColor, color: textColor, aspectRatio: '1.586' }}
        >
          {/* Top row: label left, logo right */}
          <div className="flex justify-between items-start">
            <p className="text-[17px] font-bold leading-snug flex-1 mr-3" style={{ color: textColor }}>
              {label}
            </p>
            {logoUrl ? (
              <img
                src={logoUrl}
                alt="Issuer logo"
                className="h-7 object-contain flex-shrink-0"
                style={{ maxWidth: '40%' }}
              />
            ) : (
              <div className="flex-shrink-0">
                <NeokeLogoMark color={textColor} />
              </div>
            )}
          </div>

          <div className="flex-1" />

          {/* Bottom: description */}
          {description && (
            <p className="text-[13px] leading-snug" style={{ color: textColor, opacity: 0.85 }}>
              {description}
            </p>
          )}
        </div>
      </div>

      {/* Status badge row */}
      <div className="flex items-center gap-2 px-4 pt-5 pb-1 flex-shrink-0">
        <StatusBadge status={status} />
        {credential.expirationDate && (
          <span className="text-xs text-[#8e8e93]">
            Expires {formatDate(credential.expirationDate)}
          </span>
        )}
      </div>

      {/* Fields — plain label/value pairs matching Open_credential.PNG */}
      <div className="flex-1 px-4 pt-3 pb-10">
        {(namespaceGroups.length > 0 || genericFields.length > 0) && (
          <div className="space-y-0">
            {namespaceGroups.length > 0
              ? namespaceGroups.flatMap((group, gi) =>
                  group.fields.map((field, fi) => (
                    <PlainFieldRow
                      key={`${gi}-${fi}`}
                      label={field.label}
                      value={field.value}
                    />
                  ))
                )
              : genericFields.map((field, i) => (
                  <PlainFieldRow key={i} label={field.label} value={field.value} />
                ))}
          </div>
        )}

        {/* Issuer */}
        {credential.issuer && (
          <div className="mt-2">
            <p className="text-xs text-[#8e8e93] mb-0.5">Issuer</p>
            <p className="text-[13px] font-mono text-[#3c3c3e] break-all">{credential.issuer}</p>
          </div>
        )}
      </div>
    </div>
    </motion.div>
  );
}

interface PlainFieldRowProps {
  label: string;
  value: unknown;
}

function PlainFieldRow({ label, value }: PlainFieldRowProps) {
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
      <div className="py-3">
        <p className="text-xs text-[#8e8e93] mb-1.5">{label}</p>
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
    <div className="py-3 border-b border-black/5 last:border-0">
      <p className="text-xs text-[#8e8e93] mb-0.5">{label}</p>
      <p className="text-[17px] font-medium text-[#1c1c1e]">{displayValue}</p>
    </div>
  );
}
