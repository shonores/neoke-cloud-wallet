import {
  getCardGradient,
  getCredentialLabel,
  getCredentialDescription,
} from '../utils/credentialHelpers';
import type { Credential } from '../types';

interface CredentialCardProps {
  credential: Credential;
  isTop?: boolean;
  onClick?: () => void;
  stackIndex?: number;
}

export const PEEK_HEIGHT = 76;

// Neoke brand SVG mark (wave-N + wordmark)
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

export default function CredentialCard({
  credential,
  onClick,
  stackIndex = 0,
}: CredentialCardProps) {
  const gradient = getCardGradient(credential);
  const bgColor = credential.displayMetadata?.backgroundColor ?? gradient.from;
  const textColor = credential.displayMetadata?.textColor ?? '#ffffff';
  const label = credential.displayMetadata?.label ?? getCredentialLabel(credential);
  const description =
    credential.displayMetadata?.description ?? getCredentialDescription(credential);
  const logoUrl = credential.displayMetadata?.logoUrl;

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
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
      aria-label={`${label} credential`}
    >
      <div
        className="rounded-[20px] overflow-hidden p-5 flex flex-col"
        style={{
          background: bgColor,
          color: textColor,
          aspectRatio: '1.586',
        }}
      >
        {/* Top row: credential name left, issuing authority logo right */}
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

        {/* Spacer */}
        <div className="flex-1" />

        {/* Bottom: description / issuing authority description */}
        {description && (
          <p
            className="text-[13px] leading-snug"
            style={{ color: textColor, opacity: 0.85 }}
          >
            {description}
          </p>
        )}
      </div>
    </div>
  );
}
