import { Link, Outlet } from "react-router-dom";

/**
 * Guest-only chrome: centered brand, no management navigation.
 * Authenticated users never see this (RequireGuest redirects them away).
 */
export function AuthLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-background font-sans text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto w-full max-w-6xl px-4 py-4 sm:px-6">
          <Link
            to="/login"
            className="font-display text-lg font-semibold tracking-tight focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            Reservation · Admin
          </Link>
        </div>
      </header>
      <main className="flex flex-1 flex-col px-4 sm:px-6">
        <Outlet />
      </main>
    </div>
  );
}
