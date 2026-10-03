import axios from "axios";
import type { AxiosInstance, AxiosResponse } from "axios";
import { getAccessToken } from "./auth-token";

/**
 * Centralized Axios instance.
 *
 * Data flow: apiClient -> module api functions -> React Query hooks -> components.
 * Do NOT call axios.create() inside modules.
 *
 * Backend contract (docs 05_DATABASE_AND_API_SPEC, §21):
 * - success: { success: true, data, meta? }
 * - error:   { success: false, error: { code, message, details? } }
 * Backend is authoritative for price/availability/payment; frontend never
 * trusts its own search results or payment redirects.
 */

/** Documented backend success envelope. Lists add a top-level meta object (docs 05 §36). */
export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/** Documented backend error envelope. */
export interface ApiErrorEnvelope {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

/** Normalized error thrown for every failed request. */
export class ApiError extends Error {
  code: string;
  status: number | undefined;
  details: unknown;

  constructor(message: string, code = "UNKNOWN_ERROR", status?: number, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

/** Normalize any thrown value into an ApiError (network, backend, or unknown). */
export function normalizeApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  if (axios.isAxiosError(error)) {
    const payload = error.response?.data as Partial<ApiErrorEnvelope> | undefined;
    const nested = payload?.error;
    if (nested && typeof nested.code === "string") {
      return new ApiError(
        nested.message || "Request failed",
        nested.code,
        error.response?.status,
        nested.details,
      );
    }
    return new ApiError(
      error.message || "Network request failed",
      error.code || "NETWORK_ERROR",
      error.response?.status,
    );
  }
  if (error instanceof Error) return new ApiError(error.message, "UNKNOWN_ERROR");
  return new ApiError("An unexpected error occurred", "UNKNOWN_ERROR");
}

/** User-safe message for toasts/inline errors (never leaks stacks/secrets). */
export function getApiErrorMessage(error: unknown): string {
  return normalizeApiError(error).message;
}

/**
 * Idempotency-Key value for sensitive POSTs
 * (booking creation, payment creation, cancel, refund — docs §24).
 * Pass via `idempotencyHeaders()` so retried clicks never double-charge/book.
 */
export function createIdempotencyKey(): string {
  const cryptoRef = globalThis.crypto;
  if (cryptoRef && typeof cryptoRef.randomUUID === "function") {
    return cryptoRef.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function idempotencyHeaders(key: string = createIdempotencyKey()): Record<string, string> {
  return { "Idempotency-Key": key };
}

/** Unwrap the documented { success, data } envelope. */
export function unwrapResponse<T>(response: AxiosResponse<ApiEnvelope<T>>): T {
  return response.data.data;
}

function getToken(): string | null {
  return getAccessToken();
}

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:5000/api/v1";

function attachSharedInterceptors(instance: AxiosInstance): void {
  instance.interceptors.request.use((config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });
  instance.interceptors.response.use(
    (response) => response,
    (error: unknown) => Promise.reject(normalizeApiError(error)),
  );
}

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15_000,
  headers: { "Content-Type": "application/json" },
});

attachSharedInterceptors(apiClient);

/**
 * Unversioned public surface (/api/public/*). Same auth/error handling as
 * the versioned client, separate base so the two contracts never mix.
 */
export const publicApiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL.replace(/\/v1\/?$/, ""),
  timeout: 15_000,
  headers: { "Content-Type": "application/json" },
});

attachSharedInterceptors(publicApiClient);
