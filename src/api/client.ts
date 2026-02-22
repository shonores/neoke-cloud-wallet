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
// Credentials — extraction helpers (shared by VP preview + doc fetch)
// ============================================================

/**
 * Walk an arbitrary response object and return the first namespace map found.
 * Tries many common wrapping patterns used by different server versions.
 */
function extractNamespacesFromDoc(data: unknown): Record<string, Record<string, unknown>> | undefined {
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
function extractDisplayMetadataFromDoc(data: unknown): import('../types').DisplayMetadata | undefined {
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
// Credentials — try direct REST list endpoint
// ============================================================

/**
 * Attempt GET /:/credentials which some server versions support.
 * Returns a parsed array of Credential objects on success, null on failure.
 */
async function tryDirectCredentialList(token: string): Promise<Credential[] | null> {
  try {
    const raw = await request<unknown>('/:/credentials', { token });
    console.log('[neoke] GET /:/credentials raw →', JSON.stringify(raw));

    // Normalise various response shapes into an array
    let items: unknown[] = [];
    if (Array.isArray(raw)) {
      items = raw;
    } else if (raw && typeof raw === 'object') {
      const d = raw as Record<string, unknown>;
      const listKey = ['credentials', 'items', 'data', 'documents'].find(
        (k) => Array.isArray(d[k])
      );
      if (listKey) items = d[listKey] as unknown[];
    }

    if (items.length === 0) return null;
    return items as Credential[];
  } catch (err) {
    console.log('[neoke] GET /:/credentials failed →', err instanceof Error ? err.message : String(err));
    return null;
  }
}

// ============================================================
// Credentials — fetch single document by any plausible identifier
// ============================================================

/**
 * Try fetching a credential document using every plausible server URL.
 * `ids` is an ordered list of candidate identifiers to try (numeric + string).
 */
async function fetchCredentialDocument(token: string, ids: (number | string)[]): Promise<unknown> {
  for (const id of ids) {
    const patterns = [
      `/:/credentials/${id}`,
      `/:/wallet/credentials/${id}`,
      `/:/credentials/${id}/document`,
    ];
    for (const url of patterns) {
      try {
        const result = await request<unknown>(url, { token });
        console.log('[neoke] credential doc ✓', url, '→', JSON.stringify(result));
        return result;
      } catch (err) {
        console.log('[neoke] credential doc ✗', url, '→', err instanceof Error ? err.message : String(err));
      }
    }
  }
  return null;
}

// ============================================================
// Credentials — discovered via a broad VP preview
// ============================================================

export async function discoverWalletCredentials(token: string): Promise<Credential[]> {
  // ── Strategy 1: Direct REST list ─────────────────────────────────────────
  // Some server versions expose GET /:/credentials with full credential data.
  const direct = await tryDirectCredentialList(token);
  if (direct && direct.length > 0) {
    console.log('[neoke] Using direct credential list, count:', direct.length, direct);
    return direct;
  }

  // ── Strategy 2: VP discovery (proven to work for listing credentials) ────
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

  // 2. Fetch raw preview — cast to unknown so we see ALL server fields.
  const previewRaw = await request<unknown>('/:/auth/siop/respond/preview', {
    method: 'POST',
    token,
    body: JSON.stringify({ request: vpResp.invocationUrl }),
  });
  console.log('[neoke] VP preview raw →', JSON.stringify(previewRaw));
  const preview = previewRaw as import('../types').VPPreviewResponse;

  // 3. Collect unique candidates, preserving raw objects alongside typed ones.
  type CandEntry = {
    cand: (typeof preview.queries)[0]['candidates'][0];
    raw: Record<string, unknown>;
    docType: string;
  };
  const seen = new Set<number>();
  const entries: CandEntry[] = [];
  const rawQueries = ((previewRaw as Record<string, unknown>)['queries'] ?? []) as unknown[];
  for (let qi = 0; qi < (preview.queries ?? []).length; qi++) {
    const rawQ = (rawQueries[qi] ?? {}) as Record<string, unknown>;
    const rawCands = (rawQ['candidates'] ?? []) as Record<string, unknown>[];
    for (let ci = 0; ci < preview.queries[qi].candidates.length; ci++) {
      const cand = preview.queries[qi].candidates[ci];
      if (!seen.has(cand.index)) {
        seen.add(cand.index);
        entries.push({ cand, raw: rawCands[ci] ?? {}, docType: cand.type[0] ?? '' });
      }
    }
  }

  // 4. Build plausible credential identifiers for each entry and fetch docs in parallel.
  //    cand.index is the wallet-array position (0, 1, 2…).
  //    The raw candidate might also carry an `id`, `credentialId`, or large numeric field
  //    that corresponds to the server's actual credential key (e.g. 74053).
  const docs = await Promise.all(entries.map(({ cand, raw }) => {
    const ids: (number | string)[] = [cand.index];
    // Collect any numeric values from the raw candidate that look like server IDs (> 100)
    for (const [k, v] of Object.entries(raw)) {
      if (k === 'index') continue;
      if (typeof v === 'number' && v > 100) ids.push(v);
      if (typeof v === 'string' && /^\d{4,}$/.test(v)) ids.push(v);
    }
    // Also try common id fields by name
    for (const k of ['id', 'credentialId', 'credential_id', 'walletIndex', 'wallet_index']) {
      const v = raw[k];
      if (v !== undefined && !ids.includes(v as number | string)) ids.push(v as number | string);
    }
    console.log('[neoke] candidate ids to try for cand.index', cand.index, '→', ids);
    return fetchCredentialDocument(token, ids);
  }));

  // 5. Build enriched Credential objects.
  const nowSec = Math.floor(Date.now() / 1000);
  const discovered: Credential[] = entries.map(({ cand, raw, docType }, i) => {
    const doc = docs[i];
    const namespaces =
      extractNamespacesFromDoc(doc) ?? extractNamespacesFromDoc(raw);
    const displayMetadata =
      extractDisplayMetadataFromDoc(doc) ?? extractDisplayMetadataFromDoc(raw);

    return {
      id: `server-${docType}-${cand.index}`,
      type: cand.type,
      issuer: cand.issuer,
      docType,
      expirationDate: cand.expiresAt
        ? new Date(cand.expiresAt * 1000).toISOString()
        : undefined,
      status: cand.expiresAt && nowSec > cand.expiresAt ? 'expired' : 'active',
      ...(namespaces ? { namespaces } : {}),
      ...(displayMetadata ? { displayMetadata } : {}),
      _availableClaims: cand.claims.available,
      _credentialIndex: cand.index,
    };
  });

  console.log('[neoke] discovered credentials →', JSON.stringify(discovered));
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
