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
  // Deduplicate by id, newest first
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
