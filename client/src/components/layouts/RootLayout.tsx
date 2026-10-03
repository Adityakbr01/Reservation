import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuthInit } from "@/app/use-auth-init";
import { useAuthStore } from "@/stores/auth-store";

function navLinkClass({ isActive }: { isActive: boolean }) {
  return cn(
    "inline-flex min-h-[44px] items-center rounded-full px-4 text-sm font-medium transition-colors",
    "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
    isActive ? "text-brand" : "text-foreground hover:text-brand",
  );
}

export function RootLayout() {
  useAuthInit();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  function handleLogout() {
    useAuthStore.getState().clearSession();
    void queryClient.clear();
    toast.success("Signed out");
    navigate("/", { replace: true });
  }

  const initial = user?.name.trim().charAt(0).toUpperCase() || "?";

  return (
    <div className="flex min-h-screen flex-col bg-background font-sans text-foreground">
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
        <nav className="mx-auto flex w-full max-w-6xl items-center gap-1 px-4 py-2 sm:gap-2 sm:px-6">
          <Link
            to="/"
            className="mr-2 font-display text-lg font-semibold tracking-tight focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            Reservation
          </Link>
          <NavLink to="/" end className={navLinkClass}>
            Home
          </NavLink>
          <div className="flex-1" />
          {user ? (
            <>
              <NavLink to="/bookings" className={navLinkClass}>
                My bookings
              </NavLink>
              <NavLink to="/profile" className={navLinkClass}>
                <span
                  className="mr-2 flex size-7 items-center justify-center rounded-full bg-night text-xs font-semibold text-white"
                  aria-hidden
                >
                  {initial}
                </span>
                <span className="hidden max-w-28 truncate sm:inline">{user.name}</span>
                <span className="sm:hidden">Profile</span>
              </NavLink>
              <Button variant="ghost" className="rounded-full" onClick={handleLogout}>
                <LogOut aria-hidden />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </>
          ) : (
            <>
              <NavLink to="/login" className={navLinkClass}>
                Login
              </NavLink>
              <Button asChild className="h-11 rounded-full px-6">
                <Link to="/register">Register</Link>
              </Button>
            </>
          )}
        </nav>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-8 pt-4 sm:px-6 sm:pb-12 sm:pt-6">
        <Outlet />
      </main>
      <footer className="border-t border-border bg-surface-2">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-2 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:px-6">
          <p>© 2026 Reservation. All rights reserved.</p>
          <p>Single property · Multiple room types</p>
        </div>
      </footer>
    </div>
  );
}
