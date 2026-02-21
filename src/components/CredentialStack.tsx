import { useState, useEffect, useRef } from 'react';
import type { Credential } from '../types';
import CredentialCard, { PEEK_HEIGHT } from './CredentialCard';

interface CredentialStackProps {
  credentials: Credential[];
  onSelectCredential: (credential: Credential) => void;
}

const ASPECT_RATIO = 1.586;

export default function CredentialStack({ credentials, onSelectCredential }: CredentialStackProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(335);
  const [order, setOrder] = useState<string[]>(() => credentials.map((c) => c.id));

  // Measure actual container width for accurate card height
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w) setContainerWidth(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Sync order when credentials list changes
  const orderedIds = order.filter((id) => credentials.some((c) => c.id === id));
  const newIds = credentials.map((c) => c.id).filter((id) => !order.includes(id));
  const finalOrder = [...newIds, ...orderedIds];

  const orderedCredentials = finalOrder
    .map((id) => credentials.find((c) => c.id === id))
    .filter(Boolean) as Credential[];

  const cardHeight = Math.round(containerWidth / ASPECT_RATIO);
  const containerHeight =
    orderedCredentials.length > 0
      ? cardHeight + (orderedCredentials.length - 1) * PEEK_HEIGHT
      : cardHeight;

  const handleCardClick = (credential: Credential, idx: number) => {
    if (idx === 0) {
      onSelectCredential(credential);
    } else {
      setOrder([credential.id, ...finalOrder.filter((id) => id !== credential.id)]);
    }
  };

  return (
    <div
      ref={containerRef}
      style={{ position: 'relative', height: containerHeight }}
    >
      {orderedCredentials.map((credential, idx) => (
        <CredentialCard
          key={credential.id}
          credential={credential}
          isTop={idx === 0}
          stackIndex={idx}
          onClick={() => handleCardClick(credential, idx)}
        />
      ))}
    </div>
  );
}
