import { Navigate, Outlet, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { getAccessToken } from "@/lib/auth-token";

/**
 * UX-only route guards. They improve navigation flow but are NOT the
 * security boundary — backend authorization remains mandatory (docs §17).
 *
 * - RequireAuth: admin protected areas (dashboard, reservations, rooms,
 *   payments, CMS, settings, ...). Redirects to /login preserving target.
 * - RequireGuest: login — sends signed-in staff back to / instead of
 *   showing the auth form again.
 */
export function RequireAuth({ children }: { children?: ReactNode }) {
  const location = useLocation();
  if (!getAccessToken()) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return children ?? <Outlet />;
}

export function RequireGuest({ children }: { children: ReactNode }) {
  const location = useLocation();
  const state = location.state as { from?: string } | null;
  const from = state?.from ?? "/";
  if (getAccessToken()) {
    return <Navigate to={from} replace />;
  }
  return children;
}
