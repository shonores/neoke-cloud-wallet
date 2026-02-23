import type {
  AuthResponse,
  Credential,
  ReceiveCredentialResponse,
  VPPreviewResponse,
  VPRespondResponse,
  WalletKey,
} from '../types';

/** Kept for backwards-compat imports; prefer getBaseUrl() for dynamic use. */
export const BASE_URL = 'https://b2b-poc.id-node.neoke.com';

// Module-level mutable base URL — updated after node selection.
let _baseUrl = BASE_URL;

export function setBaseUrl(url: string): void {
  _baseUrl = url.replace(/\/$/, '');
}

export function getBaseUrl(): string {
  return _baseUrl;
}

/**
 * Convert a user-supplied node identifier to its full API base URL.
 * Accepts:
 *   "b2b-poc"                  → https://b2b-poc.id-node.neoke.com
 *   "b2b-poc.id-node.neoke.com"→ https://b2b-poc.id-node.neoke.com
 *   "https://…"                → used as-is (strip trailing slash)
 */
export function nodeIdentifierToUrl(identifier: string): string {
  const id = identifier.trim();
  if (id.startsWith('http')) return id.replace(/\/$/, '');
  if (id.includes('.'))       return `https://${id}`;
  return `https://${id}.id-node.neoke.com`;
}

/**
 * Validate a node identifier by checking network reachability.
 * Throws ApiError if the node cannot be reached.
 * Returns the resolved base URL on success.
 */
export async function validateNode(identifier: string): Promise<string> {
  const baseUrl = nodeIdentifierToUrl(identifier);
  try {
    // Any HTTP response (even 401/422) means the node exists and is reachable
    await fetch(`${baseUrl}/:/auth/authn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    return baseUrl;
  } catch {
    throw new ApiError(
      `Cannot reach "${identifier}". Please check the identifier and your network connection.`
    );
  }
}

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
    response = await fetch(`${_baseUrl}${path}`, {
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
/**
 * Authenticate with an API key.
 * @param nodeBaseUrl  When provided (during onboarding step 2), temporarily
 *                     overrides the current base URL for this one call so the
 *                     token can be obtained before the context has been updated.
 */
export async function apiKeyAuth(apiKey: string, nodeBaseUrl?: string): Promise<AuthResponse> {
  const prev = _baseUrl;
  if (nodeBaseUrl) _baseUrl = nodeBaseUrl.replace(/\/$/, '');
  try {
    return await request<AuthResponse>('/:/auth/authn', { method: 'POST', apiKey });
  } finally {
    if (nodeBaseUrl) _baseUrl = prev;
  }
}

// ============================================================
// Credentials — extraction helpers (shared by VP preview + doc fetch)
// ============================================================

/**
 * Walk an arbitrary response object and return the first namespace map found.
 * Tries many common wrapping patterns used by different server versions.
 */
export function extractNamespacesFromDoc(data: unknown): Record<string, Record<string, unknown>> | undefined {
  if (!data || typeof data !== 'object') return undefined;
  const d = data as Record<string, unknown>;

  const paths: unknown[] = [
    d['namespaces'],
    (d['document'] as Record<string, unknown> | undefined)?.['namespaces'],
    (d['credential'] as Record<string, unknown> | undefined)?.['namespaces'],
    (d['mdoc'] as Record<string, unknown> | undefined)?.['namespaces'],
    (d['data'] as Record<string, unknown> | undefined)?.['namespaces'],
    (d['issuerSigned'] as Record<string, unknown> | undefined)?.['nameSpaces'],
    (d['issuerSigned'] as Record<string, unknown> | undefined)?.['namespaces'],
  ];

  for (const ns of paths) {
    if (ns && typeof ns === 'object' && !Array.isArray(ns)) {
      return ns as Record<string, Record<string, unknown>>;
    }
  }
  return undefined;
}

/**
 * Walk an arbitrary response object and return the first display-metadata block found.
 * Handles camelCase, snake_case, nested arrays, and common wrapping patterns.
 */
export function extractDisplayMetadataFromDoc(data: unknown): import('../types').DisplayMetadata | undefined {
  if (!data || typeof data !== 'object') return undefined;
  const d = data as Record<string, unknown>;

  const displayCandidates: unknown[] = [
    d['displayMetadata'],
    d['display_metadata'],
    d['display'],
    (d['issuerMetadata'] as Record<string, unknown> | undefined)?.['display'],
    (d['issuer_metadata'] as Record<string, unknown> | undefined)?.['display'],
    (d['credential'] as Record<string, unknown> | undefined)?.['displayMetadata'],
    (d['credential'] as Record<string, unknown> | undefined)?.['display'],
    (d['document'] as Record<string, unknown> | undefined)?.['displayMetadata'],
    (d['meta'] as Record<string, unknown> | undefined)?.['display'],
  ];

  for (const raw of displayCandidates) {
    if (!raw) continue;
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
// Credentials — /:/credentials/stored (primary strategy)
// ============================================================

interface StoredCredentialRaw {
  id: string;
  type: string[];
  issuer: string;
  issuedAt?: number;
  expiresAt?: number;
  metadata?: {
    credentialDisplay?: Array<{
      name?: string;
      locale?: string;
      description?: string;
      background_color?: string;
      text_color?: string;
      logo?: { uri?: string };
    }>;
    nameSpaces?: Record<string, Record<string, unknown>>;
  };
}

/**
 * Fetch stored credentials from the server — returns full credential data
 * including field values (nameSpaces) and display metadata.
 */
export async function fetchStoredCredentials(token: string): Promise<Credential[]> {
  const resp = await request<{ credentials?: StoredCredentialRaw[] }>(
    '/:/credentials/stored',
    { token }
  );
  const raw = resp.credentials ?? [];
  const nowSec = Math.floor(Date.now() / 1000);

  return raw.map((item) => {
    const display =
      item.metadata?.credentialDisplay?.find((d) => d.locale === 'en') ??
      item.metadata?.credentialDisplay?.[0];

    const docType = item.type[0] ?? '';

    return {
      id: item.id,
      type: item.type,
      docType,
      issuer: item.issuer,
      issuanceDate: item.issuedAt
        ? new Date(item.issuedAt * 1000).toISOString()
        : undefined,
      expirationDate: item.expiresAt
        ? new Date(item.expiresAt * 1000).toISOString()
        : undefined,
      status: item.expiresAt && nowSec > item.expiresAt ? 'expired' : 'active',
      namespaces: item.metadata?.nameSpaces,
      displayMetadata: display
        ? {
            backgroundColor: display.background_color,
            textColor: display.text_color,
            label: display.name,
            description: display.description,
            logoUrl: display.logo?.uri,
          }
        : undefined,
    } as Credential;
  });
}

// ============================================================
// Credentials — discovered via a broad VP preview
// ============================================================

/**
 * Discover wallet credentials.
 * Strategy 1: GET /:/credentials/stored — full data including field values.
 * Strategy 2 (fallback): VP preview — lightweight stubs, no field values.
 */
export async function discoverWalletCredentials(token: string): Promise<Credential[]> {
  // Strategy 1: stored credentials endpoint (authoritative, includes field values)
  try {
    const stored = await fetchStoredCredentials(token);
    if (stored.length > 0) return stored;
  } catch {
    // fall through to VP preview discovery
  }

  // Strategy 2: VP preview (stubs only — no field values)
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

  // 2. Fetch preview
  const preview = await request<import('../types').VPPreviewResponse>('/:/auth/siop/respond/preview', {
    method: 'POST',
    token,
    body: JSON.stringify({ request: vpResp.invocationUrl }),
  });

  // 3. Collect unique candidates and build lightweight Credential stubs
  const seen = new Set<number>();
  const nowSec = Math.floor(Date.now() / 1000);
  const discovered: Credential[] = [];

  for (const query of (preview.queries ?? [])) {
    for (const cand of (query.candidates ?? [])) {
      if (seen.has(cand.index)) continue;
      seen.add(cand.index);
      const docType = cand.type[0] ?? '';
      discovered.push({
        id: `server-${docType}-${cand.index}`,
        type: cand.type,
        issuer: cand.issuer,
        docType,
        expirationDate: cand.expiresAt
          ? new Date(cand.expiresAt * 1000).toISOString()
          : undefined,
        status: cand.expiresAt && nowSec > cand.expiresAt ? 'expired' : 'active',
        _availableClaims: cand.claims?.available ?? [],
        _credentialIndex: cand.index,
      });
    }
  }

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
    await request<void>(`/:/credentials/stored/${encodeURIComponent(credentialId)}`, {
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
  const raw = await request<unknown>('/:/oid4vci/receive', {
    method: 'POST',
    token,
    body: JSON.stringify({ offer_uri: offerUri, keyId }),
  });
  console.log('[neoke] receiveCredential raw →', JSON.stringify(raw));
  return raw as ReceiveCredentialResponse;
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
