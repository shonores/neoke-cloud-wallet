import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  getCardGradient,
  getCredentialLabel,
  getCredentialDescription,
  extractFields,
} from '../utils/credentialHelpers';
import type { Credential } from '../types';

interface CredentialCardProps {
  credential: Credential;
  isTop?: boolean;
  onClick?: () => void;
  stackIndex?: number;
}

export const PEEK_HEIGHT = 76;

export default function CredentialCard({
  credential,
  isTop = false,
  onClick,
  stackIndex = 0,
}: CredentialCardProps) {
  const [flipped, setFlipped] = useState(false);
  const gradient = getCardGradient(credential);
  const bgColor = credential.displayMetadata?.backgroundColor ?? gradient.from;
  const textColor = credential.displayMetadata?.textColor ?? '#ffffff';
  const label = credential.displayMetadata?.label ?? getCredentialLabel(credential);
  const description = getCredentialDescription(credential);

  const docType = credential.docType ?? '';
  const isMdoc = docType.startsWith('org.iso.') || docType.toLowerCase().includes('mdoc');
  const badgeText = isMdoc ? 'mDOC' : null;

  // Fields for back-face preview (exclude photos/objects/long strings)
  const backFields = extractFields(credential)
    .filter((f) => {
      if (typeof f.value === 'object' && f.value !== null) return false;
      if (typeof f.value === 'string' && f.value.length > 100) return false;
      const lower = f.label.toLowerCase();
      if (lower.includes('photo') || lower.includes('portrait') || lower.includes('image')) return false;
      return true;
    })
    .slice(0, 5);

  const handleClick = () => {
    if (!isTop) {
      onClick?.();
      return;
    }
    if (!flipped) {
      setFlipped(true);
    } else {
      onClick?.();
    }
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: stackIndex * PEEK_HEIGHT,
        left: 0,
        right: 0,
        zIndex: 100 - stackIndex,
      }}
      className="cursor-pointer select-none"
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && handleClick()}
      aria-label={`${label} credential`}
    >
      <div style={{ perspective: '1200px' }}>
        <motion.div
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
          style={{
            position: 'relative',
            transformStyle: 'preserve-3d',
            aspectRatio: '1.586',
          }}
        >
          {/* ── Front face ── */}
          <div
            className="absolute inset-0 rounded-[20px] overflow-hidden p-5 flex flex-col justify-between"
            style={{
              background: bgColor,
              color: textColor,
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
            }}
          >
            {/* Top: icon + Neoke brand */}
            <div className="flex justify-between items-start">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(255,255,255,0.2)' }}
              >
                <span style={{ fontSize: 18 }}>🪪</span>
              </div>
              <div className="flex items-center gap-1" style={{ opacity: 0.85 }}>
                <div
                  className="w-3.5 h-3.5 rounded-full"
                  style={{ background: 'rgba(255,255,255,0.9)' }}
                />
                <div
                  className="w-3.5 h-3.5 rounded-full -ml-2"
                  style={{ background: 'rgba(255,255,255,0.5)' }}
                />
                <span
                  className="text-[11px] font-bold tracking-widest ml-1.5"
                  style={{ color: textColor }}
                >
                  NEOKE
                </span>
              </div>
            </div>

            {/* Middle: name + description */}
            <div>
              <p className="text-xl font-bold leading-tight" style={{ color: textColor }}>
                {label}
              </p>
              {description && (
                <p
                  className="text-sm mt-1 leading-snug"
                  style={{ color: textColor, opacity: 0.7 }}
                >
                  {description}
                </p>
              )}
            </div>

            {/* Bottom: hint + badge */}
            <div className="flex justify-between items-end">
              <div className="text-xs" style={{ color: textColor, opacity: 0.5 }}>
                {isTop && <span>Tap to reveal details</span>}
              </div>
              {badgeText && (
                <div
                  className="px-2.5 py-0.5 rounded-md"
                  style={{ background: 'rgba(255,255,255,0.2)' }}
                >
                  <span
                    className="text-xs font-bold tracking-wide"
                    style={{ color: textColor }}
                  >
                    {badgeText}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* ── Back face ── */}
          <div
            className="absolute inset-0 rounded-[20px] overflow-hidden p-5 flex flex-col"
            style={{
              background: bgColor,
              color: textColor,
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
            }}
          >
            <p
              className="text-[10px] font-bold uppercase tracking-widest mb-4"
              style={{ opacity: 0.5 }}
            >
              Credential Details
            </p>
            <div className="flex-1 space-y-3 overflow-hidden">
              {backFields.length === 0 ? (
                <p className="text-sm" style={{ opacity: 0.5 }}>
                  No preview available
                </p>
              ) : (
                backFields.map((field, i) => (
                  <div key={i} className="flex justify-between gap-2 items-baseline">
                    <span className="text-xs flex-shrink-0" style={{ opacity: 0.6 }}>
                      {field.label}
                    </span>
                    <span
                      className="text-xs font-semibold truncate text-right max-w-[60%]"
                      style={{ color: textColor }}
                    >
                      {typeof field.value === 'boolean'
                        ? field.value
                          ? 'Yes'
                          : 'No'
                        : String(field.value)}
                    </span>
                  </div>
                ))
              )}
            </div>
            <p className="text-[11px] text-center mt-3" style={{ opacity: 0.5 }}>
              Tap again to open full details →
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
