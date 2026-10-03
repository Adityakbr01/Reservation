import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/auth-store";

/**
 * Call on guest-only pages (login/forgot/reset). When a session
 * appears — e.g. right after a successful login — navigates to the page
 * the user originally wanted, or the fallback. This is the actual redirect
 * mechanism: route guards alone cannot react to in-page sign-ins because
 * they do not re-render with the form.
 */
export function useRedirectIfAuthenticated(fallback = "/dashboard") {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const from = (location.state as { from?: string } | null)?.from ?? fallback;

  useEffect(() => {
    if (user) navigate(from, { replace: true });
  }, [user, from, navigate]);
}
