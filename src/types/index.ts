// ============================================================
// Authentication
// ============================================================
export interface AuthResponse {
  token: string;
  expiresAt: number; // Unix timestamp in milliseconds
}

// ============================================================
// Credentials
// ============================================================
export interface DisplayMetadata {
  backgroundColor?: string;
  textColor?: string;
  logoUrl?: string;
  label?: string;
  description?: string;
}

export type CredentialStatus = 'active' | 'suspended' | 'revoked' | 'expired';

export interface Credential {
  id: string;
  type: string[];
  issuer: string;
  issuanceDate?: string;
  expirationDate?: string;
  credentialSubject?: Record<string, unknown>;
  // mDoc-specific
  docType?: string;
  namespaces?: Record<string, Record<string, unknown>>;
  // Status
  status?: CredentialStatus;
  // Display metadata (custom extension)
  displayMetadata?: DisplayMetadata;
  // Raw fields for fallback
  [key: string]: unknown;
}

// ============================================================
// OpenID4VP — Verifiable Presentations
// ============================================================
export interface VPQuery {
  docType?: string;
  type?: string;
  requestedFields: string[];
}

export interface VPPreviewResponse {
  verifier: {
    clientId: string;
    name?: string;
    purpose?: string;
  };
  queries: VPQuery[];
  matchedCredentials: Credential[];
  transactionData?: string;
}

export interface VPRespondResponse {
  status: string;
  redirectUri?: string;
  error?: string;
}

// ============================================================
// OpenID4VCI — Credential Issuance
// ============================================================
export interface ReceiveCredentialResponse {
  credential?: Credential;
  // Sometimes wrapped differently
  [key: string]: unknown;
}

// ============================================================
// Keys
// ============================================================
export interface WalletKey {
  id: string;
  type?: string;
  algorithm?: string;
  createdAt?: string;
}

// ============================================================
// Navigation
// ============================================================
export type ViewName = 'login' | 'dashboard' | 'detail' | 'receive' | 'present' | 'account';

export interface NavState {
  view: ViewName;
  selectedCredential?: Credential;
  pendingUri?: string;
}

// ============================================================
// App errors
// ============================================================
export interface AppError {
  message: string;
  code?: string | number;
}
