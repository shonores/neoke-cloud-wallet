import {
  getCardGradient,
  getCredentialLabel,
  getCredentialDescription,
} from '../utils/credentialHelpers';
import CredentialCardFace from './CredentialCardFace';
import type { Credential } from '../types';

interface CredentialCardProps {
  credential: Credential;
  onClick?: () => void;
  stackIndex?: number;
}

export const PEEK_HEIGHT = 76;

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
      <CredentialCardFace
        label={label}
        description={description}
        bgColor={bgColor}
        textColor={textColor}
        logoUrl={logoUrl}
      />
    </div>
  );
}
