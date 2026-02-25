import type { Credential } from '../types';
import {
  getCardColor,
  getCredentialLabel,
  getCredentialDescription,
} from '../utils/credentialHelpers';
import CredentialCardFace from './CredentialCardFace';

interface CredentialStackProps {
  credentials: Credential[];
  onSelectCredential: (credential: Credential) => void;
}

/**
 * How many px of each older card's TOP strip remain visible above the card in front.
 * 80px comfortably fits two-line titles (17px bold × 1.375 lh × 2 ≈ 47px + 20px top padding)
 * with breathing room so titles never visually collide with the foreground card edge.
 */
const PEEK_HEIGHT = 80;

/** ISO/IEC 7810 ID-1 card aspect ratio */
const ASPECT_RATIO = 1.586;

/**
 * Stacking rules:
 *
 * - Oldest credential → rendered first, positioned at TOP, lowest z-index (furthest back).
 *   Only its top PEEK_HEIGHT px strip is visible.
 * - Newest credential → rendered last, positioned at BOTTOM, highest z-index (fully visible).
 *
 * Every tap directly opens the tapped credential — no "bring to front" intermediate step.
 * Because older cards only expose their top strip (which no newer card covers), the browser's
 * natural hit-testing sends the click to the correct card without extra logic.
 *
 * Shadow: a large-blur drop-shadow creates a gradual gradient effect on the peek area of the
 * card below (not a hard line), which immediately renders with no animation delay.
 */
export default function CredentialStack({ credentials, onSelectCredential }: CredentialStackProps) {
  // credentials prop arrives newest-first (sorted by issuanceDate desc); reverse so oldest renders first.
  const renderOrder = [...credentials].reverse();

  return (
    <div>
      {renderOrder.map((credential, idx) => {
        const { backgroundColor, textColor } = getCardColor(credential);
        const label = getCredentialLabel(credential);
        const description = getCredentialDescription(credential);
        const logoUrl = credential.displayMetadata?.logoUrl;

        // z-index: oldest = 1, newest = renderOrder.length (highest, in front)
        const zIndex = idx + 1;
        const isFirst = idx === 0;

        return (
          <div
            key={`${idx}-${credential.id}`}
            style={{
              // Pull each card up so only PEEK_HEIGHT of the card below it shows.
              // 100% = containing-block width (the px-4 wrapper in DashboardScreen).
              // card height = 100% / ASPECT_RATIO  →  overlap = card_height − PEEK_HEIGHT.
              marginTop: isFirst ? 0 : `calc(-100% / ${ASPECT_RATIO} + ${PEEK_HEIGHT}px)`,
              position: 'relative',
              zIndex,
              cursor: 'pointer',
              userSelect: 'none',
              // Every card except the very bottom one (oldest, furthest back) casts
              // an upward shadow onto the peeking strip of the card below it.
              // The oldest card (isFirst) sits directly on the background — no shadow needed.
              filter: !isFirst && renderOrder.length > 1
                ? 'drop-shadow(0 -6px 18px rgba(0,0,0,0.30)) drop-shadow(0 -2px 40px rgba(0,0,0,0.15))'
                : undefined,
            }}
            onClick={() => onSelectCredential(credential)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && onSelectCredential(credential)}
            aria-label={`${label} credential`}
          >
            <CredentialCardFace
              label={label}
              description={description}
              bgColor={backgroundColor}
              textColor={textColor}
              logoUrl={logoUrl}
            />
          </div>
        );
      })}
    </div>
  );
}
