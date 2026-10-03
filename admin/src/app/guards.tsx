import { Navigate, Outlet, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { getAccessToken } from "@/lib/auth-token";
import { useAuthStore } from "@/stores/auth-store";

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

/**
 * Staff-only areas (UX layer — backend still enforces admin on every call).
 * Signed-out users go to login; signed-in non-admins see an explanation
 * instead of a redirect loop while the session revalidates.
 */
export function RequireAdmin({ children }: { children?: ReactNode }) {
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  if (!getAccessToken()) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  if (user && user.role !== "admin") {
    return (
      <div className="mx-auto max-w-sm py-16 text-center">
        <h1 className="font-display text-2xl font-light">Not authorized</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This area needs a staff admin account.
        </p>
      </div>
    );
  }
  return children ?? <Outlet />;
}
