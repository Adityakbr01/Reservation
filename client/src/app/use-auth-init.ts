import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { normalizeApiError } from "@/lib/api-client";
import { getAccessToken } from "@/lib/auth-token";
import { useMe } from "@/modules/auth/me/hooks/use-me";
import { useAuthStore } from "@/stores/auth-store";

const SESSION_END_CODES = new Set(["UNAUTHORIZED", "TOKEN_INVALID"]);

/**
 * Mount once inside the router (RootLayout). Reconciles the persisted
 * session with the server: fills the store user when a token exists,
 * and signs out (redirecting to login) only when the backend rejects
 * the token — network blips never log the user out.
 */
export function useAuthInit() {
  const navigate = useNavigate();
  const setUser = useAuthStore((s) => s.setUser);
  const clearSession = useAuthStore((s) => s.clearSession);
  const { data, error, isSuccess } = useMe(getAccessToken() !== null);

  useEffect(() => {
    if (isSuccess && data) setUser(data);
  }, [isSuccess, data, setUser]);

  useEffect(() => {
    if (error && SESSION_END_CODES.has(normalizeApiError(error).code)) {
      clearSession();
      navigate("/login", { replace: true });
    }
  }, [error, clearSession, navigate]);
}
