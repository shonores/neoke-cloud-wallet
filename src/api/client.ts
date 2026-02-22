import type {
  AuthResponse,
  Credential,
  ReceiveCredentialResponse,
  VPPreviewResponse,
  VPRespondResponse,
  WalletKey,
} from '../types';

export const BASE_URL = 'https://b2b-poc.id-node.neoke.com';

// ============================================================
// Error handling
// ============================================================
export class ApiError extends Error {
  status?: number;
  body?: unknown;

  constructor(message: string, status?: number, body?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

function friendlyError(status: number, body: unknown): string {
  const detail =
    typeof body === 'object' && body !== null && 'message' in body
      ? String((body as Record<string, unknown>).message)
      : '';

  switch (status) {
    case 401:
      return 'Your session has expired. Please enter your API key to continue.';
    case 403:
      return 'Access denied. Please check your credentials.';
    case 404:
      return 'Resource not found.';
    case 422:
      return detail || 'Invalid request. Please check the data and try again.';
    default:
      return detail || `Server error (${status}). Please try again.`;
  }
}

async function request<T>(
  path: string,
  options: RequestInit & { token?: string; apiKey?: string } = {}
): Promise<T> {
  const { token, apiKey, ...fetchOptions } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(fetchOptions.headers as Record<string, string> | undefined),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  } else if (apiKey) {
    headers['Authorization'] = `ApiKey ${apiKey}`;
  }

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...fetchOptions,
      headers,
    });
  } catch {
    throw new ApiError(
      'Unable to connect to the wallet server. Please check your network and try again.'
    );
  }

  if (!response.ok) {
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      body = null;
    }
    throw new ApiError(friendlyError(response.status, body), response.status, body);
  }

  // Handle empty responses
  const text = await response.text();
  if (!text) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    return text as unknown as T;
  }
}

// ============================================================
// Auth
// ============================================================
export async function apiKeyAuth(apiKey: string): Promise<AuthResponse> {
  return request<AuthResponse>('/:/auth/authn', {
    method: 'POST',
    apiKey,
  });
}

// ============================================================
// Credentials — fetch full document by wallet index
// ============================================================

/** Fetch the full credential document for a given wallet index. Returns null on any error. */
async function fetchCredentialDocument(token: string, index: number): Promise<unknown> {
  try {
    return await request<unknown>(`/:/credentials/${index}`, { token });
  } catch {
    return null;
  }
}

/** Extract namespace/value map from a raw credential document response. */
function extractNamespacesFromDoc(data: unknown): Record<string, Record<string, unknown>> | undefined {
  if (!data || typeof data !== 'object') return undefined;
  const d = data as Record<string, unknown>;

  // Try direct paths
  const candidates = [
    d['namespaces'],
    (d['document'] as Record<string, unknown> | undefined)?.['namespaces'],
    (d['credential'] as Record<string, unknown> | undefined)?.['namespaces'],
    (d['mdoc'] as Record<string, unknown> | undefined)?.['namespaces'],
    (d['data'] as Record<string, unknown> | undefined)?.['namespaces'],
  ];

  for (const ns of candidates) {
    if (ns && typeof ns === 'object' && !Array.isArray(ns)) {
      return ns as Record<string, Record<string, unknown>>;
    }
  }
  return undefined;
}

/** Extract display metadata (colors, label) from a raw credential document response. */
function extractDisplayMetadataFromDoc(data: unknown): import('../types').DisplayMetadata | undefined {
  if (!data || typeof data !== 'object') return undefined;
  const d = data as Record<string, unknown>;

  // Find a raw display object from various server response shapes
  const displayCandidates: unknown[] = [
    d['displayMetadata'],
    d['display_metadata'],
    d['display'],
    (d['issuerMetadata'] as Record<string, unknown> | undefined)?.['display'],
    (d['issuer_metadata'] as Record<string, unknown> | undefined)?.['display'],
    (d['credential'] as Record<string, unknown> | undefined)?.['displayMetadata'],
    (d['document'] as Record<string, unknown> | undefined)?.['displayMetadata'],
  ];

  for (const raw of displayCandidates) {
    if (!raw) continue;
    // Could be an array (e.g. issuer metadata display list) or a single object
    const obj = Array.isArray(raw) ? raw[0] : raw;
    if (!obj || typeof obj !== 'object') continue;
    const o = obj as Record<string, unknown>;

    const bg =
      (typeof o['backgroundColor'] === 'string' ? o['backgroundColor'] : undefined) ??
      (typeof o['background_color'] === 'string' ? o['background_color'] : undefined);
    const fg =
      (typeof o['textColor'] === 'string' ? o['textColor'] : undefined) ??
      (typeof o['text_color'] === 'string' ? o['text_color'] : undefined);
    const logo =
      (typeof o['logoUrl'] === 'string' ? o['logoUrl'] : undefined) ??
      (typeof o['logo_url'] === 'string' ? o['logo_url'] : undefined) ??
      (typeof (o['logo'] as Record<string, unknown> | undefined)?.['uri'] === 'string'
        ? (o['logo'] as Record<string, unknown>)['uri'] as string
        : undefined);
    const label =
      (typeof o['label'] === 'string' ? o['label'] : undefined) ??
      (typeof o['name'] === 'string' ? o['name'] : undefined);

    if (bg || fg || logo || label) {
      return { backgroundColor: bg, textColor: fg, logoUrl: logo, label };
    }
  }
  return undefined;
}

// ============================================================
// Credentials — discovered via a broad VP preview
// ============================================================

/**
 * The /:/credentials REST endpoint does not exist on this server.
 * Instead we create a transient VP request with no doctype filter
 * (matches ALL mso_mdoc credentials) and preview it to get the
 * authoritative list of credentials currently in the wallet.
 * For each discovered credential we also fetch its full document
 * to populate namespaces (field values) and display metadata (colors).
 */
export async function discoverWalletCredentials(token: string): Promise<Credential[]> {
  // 1. Create a broad VP discovery request
  const vpResp = await request<{ invocationUrl: string }>('/:/auth/siop/request', {
    method: 'POST',
    token,
    body: JSON.stringify({
      mode: 'reference',
      responseType: 'vp_token',
      responseMode: 'direct_post',
      dcqlQuery: {
        credentials: [{
          id: 'discovery',
          format: 'mso_mdoc',
          require_cryptographic_holder_binding: false,
        }],
      },
    }),
  });

  // 2. Preview to get all candidates
  const preview = await previewPresentation(token, vpResp.invocationUrl);

  // 3. Collect all unique candidates (dedup by index)
  type CandEntry = { cand: typeof preview.queries[0]['candidates'][0]; docType: string };
  const seen = new Set<number>();
  const entries: CandEntry[] = [];
  for (const query of preview.queries) {
    for (const cand of query.candidates) {
      if (!seen.has(cand.index)) {
        seen.add(cand.index);
        entries.push({ cand, docType: cand.type[0] ?? '' });
      }
    }
  }

  // 4. Fetch full credential documents in parallel
  const docs = await Promise.all(entries.map(({ cand }) => fetchCredentialDocument(token, cand.index)));

  // 5. Build Credential objects enriched with namespaces + displayMetadata
  const nowSec = Math.floor(Date.now() / 1000);
  const discovered: Credential[] = entries.map(({ cand, docType }, i) => {
    const doc = docs[i];
    const namespaces = extractNamespacesFromDoc(doc);
    const displayMetadata = extractDisplayMetadataFromDoc(doc);

    return {
      id: `server-${docType}-${cand.index}`,
      type: cand.type,
      issuer: cand.issuer,
      docType,
      expirationDate: cand.expiresAt
        ? new Date(cand.expiresAt * 1000).toISOString()
        : undefined,
      status: cand.expiresAt && nowSec > cand.expiresAt ? 'expired' : 'active',
      // Full field values (populated from the credential document)
      ...(namespaces ? { namespaces } : {}),
      // Display metadata (colors, label) from the server
      ...(displayMetadata ? { displayMetadata } : {}),
      // Available claim names as fallback for field labels
      _availableClaims: cand.claims.available,
      // Store wallet index for future operations
      _credentialIndex: cand.index,
    };
  });

  return discovered;
}

// ============================================================
// Credentials — delete
// ============================================================

/**
 * Delete a credential from the server wallet.
 * Silently swallows errors (the credential is removed locally regardless).
 */
export async function deleteCredential(token: string, credentialId: string): Promise<void> {
  try {
    await request<void>(`/:/credentials/${encodeURIComponent(credentialId)}`, {
      method: 'DELETE',
      token,
    });
  } catch {
    // Server may not support this endpoint or credential may already be gone;
    // local removal proceeds regardless.
  }
}

// ============================================================
// Keys
// ============================================================
export async function fetchKeys(token: string): Promise<WalletKey[]> {
  try {
    const result = await request<WalletKey[] | { keys?: WalletKey[] } | unknown>(
      '/:/keys',
      { token }
    );
    if (Array.isArray(result)) return result;
    if (typeof result === 'object' && result !== null && 'keys' in result) {
      return (result as { keys: WalletKey[] }).keys ?? [];
    }
    return [];
  } catch {
    return [];
  }
}

// ============================================================
// OpenID4VCI — Receive
// ============================================================
export async function receiveCredential(
  token: string,
  offerUri: string,
  keyId: string
): Promise<ReceiveCredentialResponse> {
  return request<ReceiveCredentialResponse>('/:/oid4vci/receive', {
    method: 'POST',
    token,
    body: JSON.stringify({ offer_uri: offerUri, keyId }),
  });
}

// ============================================================
// OpenID4VP — Present
// ============================================================
export async function previewPresentation(
  token: string,
  requestUri: string
): Promise<VPPreviewResponse> {
  return request<VPPreviewResponse>('/:/auth/siop/respond/preview', {
    method: 'POST',
    token,
    body: JSON.stringify({ request: requestUri }),
  });
}

export async function respondPresentation(
  token: string,
  requestUri: string,
  selections?: Record<string, number>
): Promise<VPRespondResponse> {
  return request<VPRespondResponse>('/:/auth/siop/respond', {
    method: 'POST',
    token,
    body: JSON.stringify({
      request: requestUri,
      ...(selections ? { selections } : {}),
    }),
  });
}
