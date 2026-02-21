import type { Credential } from '../types';

const STORAGE_KEY = 'neoke_credentials';

export function getLocalCredentials(): Credential[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Credential[]) : [];
  } catch {
    return [];
  }
}

export function saveLocalCredential(credential: Credential): void {
  const existing = getLocalCredentials();
  const updated = [credential, ...existing.filter((c) => c.id !== credential.id)];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

export function deleteLocalCredential(id: string): void {
  const existing = getLocalCredentials();
  const updated = existing.filter((c) => c.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

export function clearLocalCredentials(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Merge server-discovered credentials (authoritative for existence/metadata)
 * with locally stored credentials (richer field data from the receive flow).
 * Writes the merged list back to localStorage so it stays in sync.
 */
export function mergeWithLocalCredentials(serverCreds: Credential[]): Credential[] {
  const local = getLocalCredentials();

  const merged = serverCreds.map((serverCred) => {
    // Match by docType or overlapping type strings
    const localMatch = local.find(
      (lc) =>
        lc.docType === serverCred.docType ||
        (Array.isArray(lc.type) &&
          Array.isArray(serverCred.type) &&
          lc.type.some((t) => serverCred.type.includes(t)))
    );

    if (localMatch) {
      // Server is authoritative for metadata; local provides field-level data
      return {
        ...localMatch,
        id: serverCred.id,
        issuer: serverCred.issuer || localMatch.issuer,
        expirationDate: serverCred.expirationDate ?? localMatch.expirationDate,
        status: serverCred.status ?? localMatch.status,
      };
    }
    return serverCred;
  });

  // Write back so localStorage mirrors the server exactly
  localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  return merged;
}
