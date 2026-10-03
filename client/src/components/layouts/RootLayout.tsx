import { Link, NavLink, Outlet } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function navLinkClass({ isActive }: { isActive: boolean }) {
  return cn(
    "inline-flex min-h-[44px] items-center rounded-full px-4 text-sm font-medium transition-colors",
    "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
    isActive ? "text-brand" : "text-foreground hover:text-brand",
  );
}

export function RootLayout() {
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
          <NavLink to="/login" className={navLinkClass}>
            Login
          </NavLink>
          <Button asChild className="h-11 rounded-full px-6">
            <Link to="/register">Register</Link>
          </Button>
        </nav>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
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
