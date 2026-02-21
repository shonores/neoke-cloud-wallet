import { useState } from 'react';
import type { Credential } from '../types';
import {
  getCardGradient,
  getCredentialLabel,
  getCredentialDescription,
} from '../utils/credentialHelpers';
import CredentialCardFace from './CredentialCardFace';

interface CredentialStackProps {
  credentials: Credential[];
  onSelectCredential: (credential: Credential) => void;
}

// How many px of a background card peek out below the front card
const PEEK_HEIGHT = 76;

// Card aspect ratio (ISO/IEC 7810 ID-1)
const ASPECT_RATIO = 1.586;

export default function CredentialStack({ credentials, onSelectCredential }: CredentialStackProps) {
  // Newest credential first
  const [order, setOrder] = useState<string[]>(() =>
    [...credentials.map((c) => c.id)].reverse()
  );

  // Sync order when the credentials list changes
  const orderedIds = order.filter((id) => credentials.some((c) => c.id === id));
  const newIds = credentials.map((c) => c.id).filter((id) => !order.includes(id));
  const finalOrder = [...newIds, ...orderedIds];

  const orderedCredentials = finalOrder
    .map((id) => credentials.find((c) => c.id === id))
    .filter(Boolean) as Credential[];

  const handleCardClick = (credential: Credential, idx: number) => {
    if (idx === 0) {
      onSelectCredential(credential);
    } else {
      setOrder([credential.id, ...finalOrder.filter((id) => id !== credential.id)]);
    }
  };

  return (
    <div>
      {orderedCredentials.map((credential, idx) => {
        const gradient = getCardGradient(credential);
        const bgColor = credential.displayMetadata?.backgroundColor ?? gradient.from;
        const textColor = credential.displayMetadata?.textColor ?? '#ffffff';
        const label = credential.displayMetadata?.label ?? getCredentialLabel(credential);
        const description =
          credential.displayMetadata?.description ?? getCredentialDescription(credential);
        const logoUrl = credential.displayMetadata?.logoUrl;

        return (
          <div
            key={credential.id}
            style={{
              // Pull each background card up so only PEEK_HEIGHT px shows below the card above.
              // 100% = the px-4 wrapper's content width in DashboardScreen.
              // card height = content_width / ASPECT_RATIO = 100% / ASPECT_RATIO (in CSS terms).
              // overlap = card_height - PEEK_HEIGHT → negate it for margin-top.
              marginTop: idx === 0 ? 0 : `calc(-100% / ${ASPECT_RATIO} + ${PEEK_HEIGHT}px)`,
              position: 'relative',
              zIndex: 100 - idx,
              cursor: 'pointer',
              userSelect: 'none',
            }}
            onClick={() => handleCardClick(credential, idx)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && handleCardClick(credential, idx)}
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
      })}
    </div>
  );
}
