export type UriType = 'receive' | 'present' | 'unknown';

export function detectUriType(uri: string): UriType {
  const trimmed = uri.trim();
  if (trimmed.startsWith('openid-credential-offer://')) return 'receive';
  if (trimmed.startsWith('openid4vp://')) return 'present';
  return 'unknown';
}

export function isValidWalletUri(uri: string): boolean {
  return detectUriType(uri) !== 'unknown';
}
