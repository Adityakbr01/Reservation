/**
 * Single place for auth-token storage access.
 * Used by the Axios interceptor, route guards, and auth mutations
 * so the storage key and access rules never diverge.
 */
const TOKEN_KEY = "reservation-client:access-token";

function storage(): Storage | null {
  try {
    return globalThis.localStorage;
  } catch {
    return null;
  }
}

export function getAccessToken(): string | null {
  return storage()?.getItem(TOKEN_KEY) ?? null;
}

export function setAccessToken(token: string): void {
  try {
    storage()?.setItem(TOKEN_KEY, token);
  } catch {
    return;
  }
}

export function clearAccessToken(): void {
  try {
    storage()?.removeItem(TOKEN_KEY);
  } catch {
    return;
  }
}
