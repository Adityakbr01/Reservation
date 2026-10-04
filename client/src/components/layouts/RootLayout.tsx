import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Crown, LogOut, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuthInit } from "@/app/use-auth-init";
import { useAuthStore } from "@/stores/auth-store";

function navLinkClass({ isActive }: { isActive: boolean }) {
  return cn(
    "inline-flex min-h-[44px] items-center rounded-full px-4 text-sm font-medium transition-colors",
    "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
    isActive ? "text-brand underline decoration-brand decoration-2 underline-offset-8" : "text-foreground hover:text-brand",
  );
}

function mobileLinkClass({ isActive }: { isActive: boolean }) {
  return cn(
    "flex min-h-[44px] items-center rounded-xl px-4 text-sm font-medium transition-colors",
    "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
    isActive ? "bg-surface-2 text-brand" : "text-foreground hover:bg-surface-2 hover:text-brand",
  );
}

export function RootLayout() {
  useAuthInit();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [menuOpen, setMenuOpen] = useState(false);

  function handleLogout() {
    useAuthStore.getState().clearSession();
    void queryClient.clear();
    toast.success("Signed out");
    setMenuOpen(false);
    navigate("/", { replace: true });
  }

  function closeMenu() {
    setMenuOpen(false);
  }

  // Close on Escape + lock body scroll while the sidebar is open.
  useEffect(() => {
    if (!menuOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closeMenu();
    }
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [menuOpen]);

  const initial = user?.name.trim().charAt(0).toUpperCase() || "?";

  return (
    <div className="flex min-h-screen flex-col bg-background font-sans text-foreground">
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
        <nav className="mx-auto flex w-full max-w-7xl items-center gap-1 px-4 py-2 sm:gap-2 sm:px-6">
          <Link
            to="/"
            onClick={closeMenu}
            className="mr-2 inline-flex items-center gap-2 font-display text-xl font-semibold tracking-tight focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <Crown className="size-5 text-brand" aria-hidden />
            Reservation
          </Link>
          {/* Desktop links */}
          <div className="hidden items-center gap-1 sm:gap-2 md:flex">
            <NavLink to="/" end className={navLinkClass}>
              Home
            </NavLink>
            <NavLink to="/offers" className={navLinkClass}>
              Offers
            </NavLink>
            <NavLink to="/blogs" className={navLinkClass}>
              Blog
            </NavLink>
            <NavLink to="/faqs" className={navLinkClass}>
              FAQs
            </NavLink>
          </div>
          <div className="hidden flex-1 md:block" />
          <div className="hidden items-center gap-1 sm:gap-2 md:flex">
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
                  <span className="hidden max-w-28 truncate lg:inline">
                    {user.name}
                  </span>
                  <span className="lg:hidden">Profile</span>
                </NavLink>
                <Button
                  className="rounded-full"
                  onClick={handleLogout}
                >
                  <LogOut aria-hidden />
                  <span className="hidden lg:inline ">Logout</span>
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
          </div>
          <div className="flex-1 md:hidden" />
          {/* Hamburger (mobile) */}
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full md:hidden"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
          >
            {menuOpen ? <X aria-hidden /> : <Menu aria-hidden />}
          </Button>
        </nav>
      </header>
      {/* Mobile sidebar drawer (outside header: backdrop-blur would trap fixed positioning) */}
      <div
          className={cn(
            "fixed inset-0 z-[60] transition-[visibility] md:hidden",
            menuOpen ? "visible" : "invisible delay-300",
          )}
          aria-hidden={!menuOpen}
        >
          {/* Overlay */}
          <div
            onClick={closeMenu}
            className={cn(
              "absolute inset-0 bg-black/50 transition-opacity duration-300",
              menuOpen ? "opacity-100" : "opacity-0",
            )}
          />
          {/* Panel */}
          <aside
            className={cn(
              "absolute left-0 top-0 flex h-full w-72 max-w-[85vw] flex-col bg-background shadow-xl transition-transform duration-300 ease-out",
              menuOpen ? "translate-x-0" : "-translate-x-full",
            )}
            aria-label="Mobile"
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <span className="font-display text-lg font-semibold tracking-tight">
                Reservation
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full"
                onClick={closeMenu}
                aria-label="Close menu"
              >
                <X aria-hidden />
              </Button>
            </div>
            <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-4 py-4">
              <NavLink to="/" end className={mobileLinkClass} onClick={closeMenu}>
                Home
              </NavLink>
              <NavLink to="/offers" className={mobileLinkClass} onClick={closeMenu}>
                Offers
              </NavLink>
              <NavLink to="/blogs" className={mobileLinkClass} onClick={closeMenu}>
                Blog
              </NavLink>
              <NavLink to="/faqs" className={mobileLinkClass} onClick={closeMenu}>
                FAQs
              </NavLink>
              {user && (
                <>
                  <NavLink to="/bookings" className={mobileLinkClass} onClick={closeMenu}>
                    My bookings
                  </NavLink>
                  <NavLink to="/profile" className={mobileLinkClass} onClick={closeMenu}>
                    Profile ({user.name})
                  </NavLink>
                </>
              )}
            </nav>
            <div className="border-t border-border px-4 py-4">
              {user ? (
                <Button
                  className="min-h-[44px] w-full rounded-xl"
                  onClick={handleLogout}
                >
                  <LogOut aria-hidden />
                  Logout
                </Button>
              ) : (
                <div className="flex flex-col gap-2">
                  <Button asChild variant="outline" className="min-h-[44px] rounded-xl">
                    <Link to="/login" onClick={closeMenu}>
                      Login
                    </Link>
                  </Button>
                  <Button asChild className="min-h-[44px] rounded-xl">
                    <Link to="/register" onClick={closeMenu}>
                      Register
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          </aside>
        </div>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 pb-8 pt-4 sm:px-6 sm:pb-12 sm:pt-6">
        <Outlet />
      </main>
      <footer className="border-t border-border bg-surface-2">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-2 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:px-6">
          <p>© 2026 Reservation. All rights reserved.</p>
          <p>Single property · Multiple room types</p>
        </div>
      </footer>
    </div>
  );
}
