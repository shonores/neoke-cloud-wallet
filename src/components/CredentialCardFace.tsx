/**
 * CredentialCardFace — the visual interior of a credential card.
 * Used identically in CredentialCard (home stack) and CredentialDetailScreen
 * so the card always renders at exactly the same size and style regardless
 * of which screen it appears on.
 */

interface CredentialCardFaceProps {
  label: string;
  description?: string;
  bgColor: string;
  textColor: string;
  logoUrl?: string;
}

function NeokeLogoMark({ color }: { color: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <svg width="22" height="16" viewBox="0 0 22 16" fill="none" aria-hidden>
        {/* N stroke */}
        <path
          d="M2 14V2L11 14V2"
          stroke={color}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Upper wing */}
        <path
          d="M13 8 C13 4.5 15.5 2 19 2 C19 5.5 16.5 8 13 8Z"
          fill={color}
          opacity="0.9"
        />
        {/* Lower wing */}
        <path
          d="M13 8 C13 11.5 15.5 14 19 14 C19 10.5 16.5 8 13 8Z"
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

export default function CredentialCardFace({
  label,
  description,
  bgColor,
  textColor,
  logoUrl,
}: CredentialCardFaceProps) {
  return (
    <div
      className="rounded-[20px] overflow-hidden p-5 flex flex-col w-full"
      style={{
        background: bgColor,
        color: textColor,
        aspectRatio: '1.586',
      }}
    >
      {/* Top row: credential name left, issuing authority logo right */}
      <div className="flex justify-between items-start">
        <p
          className="text-[17px] font-bold leading-snug flex-1 mr-3"
          style={{ color: textColor }}
        >
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

      {/* Bottom: issuing authority description */}
      {description && (
        <p
          className="text-[13px] leading-snug"
          style={{ color: textColor, opacity: 0.85 }}
        >
          {description}
        </p>
      )}
    </div>
  );
}
