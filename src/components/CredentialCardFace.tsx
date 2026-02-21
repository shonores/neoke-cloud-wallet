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
  /** Custom issuer logo URL — overrides Neoke brand mark */
  logoUrl?: string;
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

        {/* Logo: custom issuer logo if provided, otherwise Neoke brand */}
        {logoUrl ? (
          <img
            src={logoUrl}
            alt="Issuer logo"
            className="h-6 object-contain flex-shrink-0"
            style={{ maxWidth: '42%' }}
          />
        ) : (
          /* Neoke brand logo — white version works on all dark card backgrounds */
          <img
            src="/neoke-logo.png"
            alt="Neoke"
            className="h-5 object-contain flex-shrink-0"
            style={{ maxWidth: '42%', opacity: 0.95 }}
          />
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
