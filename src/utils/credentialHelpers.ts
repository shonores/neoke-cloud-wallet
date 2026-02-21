import type { Credential } from '../types';

// ============================================================
// Claim label mappings per namespace
// ============================================================
const CLAIM_LABELS: Record<string, Record<string, string>> = {
  'org.iso.23220.photoid.1': {
    family_name: 'Family Name',
    given_name: 'Given Name',
    birth_date: 'Date of Birth',
    document_number: 'Document Number',
    portrait: 'Photo',
    expiry_date: 'Expiry Date',
    issue_date: 'Issue Date',
    issuing_authority: 'Issuing Authority',
    issuing_country: 'Issuing Country',
    nationality: 'Nationality',
    sex: 'Sex',
    age_over_18: 'Age Over 18',
    age_over_21: 'Age Over 21',
    resident_address: 'Address',
    birth_place: 'Place of Birth',
    un_distinguishing_sign: 'Country Code',
    eye_colour: 'Eye Color',
    hair_colour: 'Hair Color',
    height: 'Height (cm)',
    weight: 'Weight (kg)',
    age_in_years: 'Age',
    age_birth_year: 'Birth Year',
    resident_city: 'City',
    resident_postal_code: 'Postal Code',
    resident_country: 'Country',
    resident_state: 'State/Province',
    administrative_number: 'Administrative Number',
  },
  'org.iso.18013.5.1': {
    family_name: 'Family Name',
    given_name: 'Given Name',
    birth_date: 'Date of Birth',
    issue_date: 'Issue Date',
    expiry_date: 'Expiry Date',
    issuing_country: 'Issuing Country',
    issuing_authority: 'Issuing Authority',
    document_number: 'Document Number',
    portrait: 'Photo',
    driving_privileges: 'Driving Privileges',
    un_distinguishing_sign: 'Country Code',
    sex: 'Sex',
    height: 'Height (cm)',
    weight: 'Weight (kg)',
    eye_colour: 'Eye Color',
    hair_colour: 'Hair Color',
    birth_place: 'Place of Birth',
    resident_address: 'Address',
    portrait_capture_date: 'Photo Date',
    age_in_years: 'Age',
    age_birth_year: 'Birth Year',
    age_over_18: 'Age Over 18',
    nationality: 'Nationality',
  },
};

const DOC_TYPE_DESCRIPTIONS: Record<string, string> = {
  'org.iso.23220.photoid.1': 'Photo identification document',
  'org.iso.18013.5.1': "Mobile driver's licence",
  'org.iso.18013.5.1.mDL': "Mobile driver's licence",
  'eu.europa.ec.eudi.pid.1': 'EU Digital Identity credential',
};

// ============================================================
// Display label for credential type
// ============================================================
export function getCredentialLabel(credential: Credential): string {
  if (credential.displayMetadata?.label) return credential.displayMetadata.label;

  const types = credential.type ?? [];
  const specific = types.filter(
    (t) => t !== 'VerifiableCredential' && t !== 'VerifiableAttestation'
  );
  if (specific.length > 0) return humanizeLabel(specific[specific.length - 1]);

  if (credential.docType) {
    const parts = credential.docType.split('.');
    return humanizeLabel(parts[parts.length - 1]);
  }

  return 'Credential';
}

export function humanizeLabel(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

// ============================================================
// Claim label (namespace-aware)
// ============================================================
export function getClaimLabel(namespace: string, key: string): string {
  const nsLabels = CLAIM_LABELS[namespace];
  if (nsLabels?.[key]) return nsLabels[key];
  return humanizeLabel(key);
}

// ============================================================
// Doc type description
// ============================================================
export function getDocTypeDescription(docType?: string): string {
  if (!docType) return '';
  return DOC_TYPE_DESCRIPTIONS[docType] ?? '';
}

// ============================================================
// Credential description (display metadata or docType fallback)
// ============================================================
export function getCredentialDescription(credential: Credential): string {
  if (credential.displayMetadata?.description) return credential.displayMetadata.description;
  return getDocTypeDescription(credential.docType);
}

// ============================================================
// Issuer display
// ============================================================
export function getIssuerDisplay(credential: Credential): string {
  const issuer = credential.issuer ?? '';
  if (!issuer) return 'Unknown Issuer';
  if (issuer.startsWith('did:web:')) {
    return issuer.replace('did:web:', '').split(':')[0];
  }
  if (issuer.startsWith('did:')) {
    return issuer.substring(0, 30) + (issuer.length > 30 ? '…' : '');
  }
  return issuer;
}

// ============================================================
// Card gradient (deterministic per credential)
// ============================================================
const CARD_GRADIENTS = [
  { from: '#1d4ed8', to: '#3b82f6' },
  { from: '#7c3aed', to: '#a78bfa' },
  { from: '#0f766e', to: '#14b8a6' },
  { from: '#b45309', to: '#f59e0b' },
  { from: '#be123c', to: '#f43f5e' },
  { from: '#0369a1', to: '#38bdf8' },
  { from: '#064e3b', to: '#10b981' },
  { from: '#7f1d1d', to: '#ef4444' },
];

export function getCardGradient(credential: Credential): { from: string; to: string } {
  let hash = 0;
  const str = credential.id ?? credential.docType ?? 'default';
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return CARD_GRADIENTS[Math.abs(hash) % CARD_GRADIENTS.length];
}

// ============================================================
// Credential fields for rendering
// ============================================================
export interface CredentialField {
  label: string;
  value: unknown;
  namespace?: string;
}

export function extractFields(credential: Credential): CredentialField[] {
  const fields: CredentialField[] = [];

  if (credential.namespaces && typeof credential.namespaces === 'object') {
    for (const [ns, nsFields] of Object.entries(credential.namespaces)) {
      if (typeof nsFields === 'object' && nsFields !== null) {
        for (const [key, value] of Object.entries(nsFields)) {
          fields.push({ label: getClaimLabel(ns, key), value, namespace: ns });
        }
      }
    }
    if (fields.length > 0) return fields;
  }

  if (credential.credentialSubject && typeof credential.credentialSubject === 'object') {
    for (const [key, value] of Object.entries(credential.credentialSubject)) {
      if (key === 'id') continue;
      fields.push({ label: humanizeLabel(key), value });
    }
    if (fields.length > 0) return fields;
  }

  return fields;
}

// ============================================================
// Status
// ============================================================
export function inferStatus(credential: Credential) {
  if (credential.status) return credential.status;
  if (credential.expirationDate) {
    if (new Date(credential.expirationDate) < new Date()) return 'expired' as const;
  }
  return 'active' as const;
}

// ============================================================
// Date formatting
// ============================================================
export function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

// ============================================================
// VP candidate helpers
// ============================================================

/** Parse "namespace:key" claim string into a human label. */
export function parseDisclosedClaim(claim: string): string {
  const colonIdx = claim.indexOf(':');
  if (colonIdx < 0) return humanizeLabel(claim);
  const namespace = claim.slice(0, colonIdx);
  const key = claim.slice(colonIdx + 1);
  return getClaimLabel(namespace, key);
}

/** Get a readable label for a VP candidate type array. */
export function getCandidateLabel(types: string[]): string {
  for (const t of types) {
    if (DOC_TYPE_DESCRIPTIONS[t]) return DOC_TYPE_DESCRIPTIONS[t];
  }
  const lastType = types[types.length - 1] ?? '';
  const parts = lastType.split('.');
  const meaningful = [...parts].reverse().find((p) => /[a-zA-Z]{2,}/.test(p));
  return meaningful ? humanizeLabel(meaningful) : lastType;
}

/** Deterministic gradient color for a VP candidate based on its type. */
export function getCandidateGradient(types: string[]): { from: string; to: string } {
  const str = types[0] ?? 'default';
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return CARD_GRADIENTS[Math.abs(hash) % CARD_GRADIENTS.length];
}

// ============================================================
// Namespace grouping for mDoc
// ============================================================
export function getNamespaceGroups(credential: Credential): Array<{
  namespace: string;
  shortName: string;
  fields: CredentialField[];
}> {
  if (!credential.namespaces) return [];

  return Object.entries(credential.namespaces).map(([ns, nsFields]) => {
    const fields: CredentialField[] = [];
    if (typeof nsFields === 'object' && nsFields !== null) {
      for (const [key, value] of Object.entries(nsFields)) {
        fields.push({ label: getClaimLabel(ns, key), value, namespace: ns });
      }
    }
    const parts = ns.split('.');
    const shortName = parts.slice(-2).join('.');
    return { namespace: ns, shortName, fields };
  });
}
