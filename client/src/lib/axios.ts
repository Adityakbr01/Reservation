// Backward-compatible re-export.
// The canonical HTTP client lives in ./api-client.ts — import from there
// in new code (@/lib/api-client). This shim keeps existing `@/lib/axios`
// imports working without churn.
export {
  apiClient,
  ApiError,
  normalizeApiError,
  getApiErrorMessage,
  createIdempotencyKey,
  idempotencyHeaders,
  unwrapResponse,
} from "./api-client";
export type { ApiEnvelope, ApiErrorEnvelope } from "./api-client";
