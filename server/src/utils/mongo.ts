/** MongoDB duplicate-key error (unique index violation), race-safe by design. */
export function isDuplicateKeyError(error: unknown): boolean {
  return error instanceof Error && (error as unknown as { code?: unknown }).code === 11000;
}
