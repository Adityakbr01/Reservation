import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { LogOut, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuthInit } from "@/app/use-auth-init";
import { useAuthStore } from "@/stores/auth-store";
import { SITE_LINKS } from "@/config/links";

function navLinkClass({ isActive }: { isActive: boolean }) {
  return cn(
    "inline-flex items-center border-b py-3 text-[13px] leading-none transition-colors",
    "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
    isActive
      ? "border-brand-light text-foreground"
      : "border-transparent text-foreground/90 hover:border-brand-light hover:text-foreground",
  );
}

function mobileLinkClass({ isActive }: { isActive: boolean }) {
  return cn(
    "flex min-h-[44px] items-center border-b border-transparent px-1 text-sm transition-colors",
    "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
    isActive
      ? "border-brand-light text-foreground"
      : "text-foreground/90 hover:border-brand-light hover:text-foreground",
  );
}

function NewsletterFooterForm() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!/.+@.+\..+/.test(email)) {
      toast.error("Enter a valid email");
      return;
    }
    try {
      const { publicApiClient } = await import("@/lib/api-client");
      await publicApiClient.post("/public/newsletter/subscribe", {
        email: email.trim(),
        source: "footer",
      });
      setDone(true);
      toast.success("Subscribed — welcome!");
    } catch {
      toast.error("Could not subscribe");
    }
  }
  if (done) return <p className="text-sm">Subscribed — thank you.</p>;
  return (
    <form onSubmit={(e) => void submit(e)} className="mt-6 max-w-xs space-y-2">
      <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-foreground">
        Newsletter
      </p>
      <div className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          aria-label="Email for newsletter"
          className="h-11 min-w-0 flex-1 rounded-none border border-input bg-card px-3 text-[13px] outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
        <Button
          type="submit"
          className="h-11 rounded-none bg-primary px-4 text-[12px] text-primary-foreground hover:bg-brand-dark"
        >
          Join
        </Button>
      </div>
    </form>
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
    <div id="top" className="flex min-h-screen flex-col bg-background font-sans text-foreground">
      <header className="sticky top-0 z-50 border-b border-border bg-background">
        <div className="mx-auto grid h-[72px] w-full max-w-7xl grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 sm:px-6 lg:h-[98px] lg:px-12">
          {/* Left links */}
          <nav
            aria-label="Booking navigation"
            className="hidden items-center gap-6 md:flex"
          >
            <NavLink to="/" end className={navLinkClass}>
              Find a cottage
            </NavLink>
            <a
              href={SITE_LINKS.theEstate}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(navLinkClass({ isActive: false }), "hidden gap-1 lg:inline-flex")}
            >
              The estate <span aria-hidden className="text-[10px]">↗</span>
            </a>
            <a
              href={SITE_LINKS.bespoke}
              target={SITE_LINKS.bespoke !== "#" ? "_blank" : undefined}
              rel={SITE_LINKS.bespoke !== "#" ? "noopener noreferrer" : undefined}
              className={cn(navLinkClass({ isActive: false }), "hidden lg:inline-flex")}
            >
              Bespoke
            </a>
          </nav>

          {/* Centered logo */}
          <Link
            to="/"
            onClick={closeMenu}
            aria-label="Hamptworth Stays — home"
            className="col-start-2 inline-flex min-w-0 shrink-0 items-center justify-center focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <img
              src="/navlogo.webp"
              alt="Hamptworth Stays"
              className="h-[52px] w-auto shrink-0 object-contain mix-blend-multiply lg:h-[76px]"
              loading="eager"
            />
          </Link>

          {/* Right actions */}
          <div className="col-start-3 flex items-center justify-end gap-5">
            <div className="hidden items-center gap-5 md:flex">
              <Link
                to="/enquire"
                className="inline-flex items-center gap-5 border border-input px-4 py-2.5 text-[13px] leading-none text-foreground transition-colors hover:border-brand hover:bg-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                Enquire
                <span aria-hidden>→</span>
              </Link>
              {user ? (
                <>
                  <NavLink
                    to="/bookings"
                    className={({ isActive }) =>
                      cn(navLinkClass({ isActive }), "hidden lg:inline-flex")
                    }
                  >
                    My bookings
                  </NavLink>
                  <NavLink
                    to="/profile"
                    className={({ isActive }) =>
                      cn(navLinkClass({ isActive }), "gap-2")
                    }
                  >
                    {user.avatarUrl ? (
                      <img
                        src={user.avatarUrl}
                        alt=""
                        aria-hidden
                        className="size-7 object-cover"
                      />
                    ) : (
                      <span
                        className="flex size-7 items-center justify-center bg-primary text-[11px] font-semibold text-primary-foreground"
                        aria-hidden
                      >
                        {initial}
                      </span>
                    )}
                    <span className="hidden max-w-24 truncate lg:inline">
                      {user.name}
                    </span>
                    <span className="lg:hidden">Profile</span>
                  </NavLink>
                  <button
                    type="button"
                    onClick={handleLogout}
                    aria-label="Logout"
                    className="inline-flex size-9 items-center justify-center border border-input text-foreground transition-colors hover:border-brand hover:bg-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <LogOut aria-hidden className="size-4" />
                  </button>
                </>
              ) : (
                <>
                  <NavLink to="/login" className={navLinkClass}>
                    Login
                  </NavLink>
                  <Link
                    to="/register"
                    className="inline-flex items-center bg-primary px-4 py-2.5 text-[13px] leading-none text-primary-foreground transition-colors hover:bg-brand-dark focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    Register
                  </Link>
                </>
              )}
            </div>

            {/* Hamburger (mobile) */}
            <Button
              variant="ghost"
              size="icon"
              className="rounded-none md:hidden"
              onClick={() => setMenuOpen((open) => !open)}
              aria-expanded={menuOpen}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
            >
              {menuOpen ? <X aria-hidden /> : <Menu aria-hidden />}
            </Button>
          </div>
        </div>
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
            "absolute left-0 top-0 flex h-full w-80 max-w-[88vw] flex-col bg-background shadow-xl transition-transform duration-300 ease-out",
            menuOpen ? "translate-x-0" : "-translate-x-full",
          )}
          aria-label="Mobile"
        >
          <div className="flex items-center justify-between gap-2 border-b border-border px-5 py-3">
            <img
              src="/navlogo.webp"
              alt="Hamptworth Stays"
              className="h-12 w-auto object-contain mix-blend-multiply"
              loading="lazy"
            />
            <Button
              variant="ghost"
              size="icon"
              className="rounded-none"
              onClick={closeMenu}
              aria-label="Close menu"
            >
              <X aria-hidden />
            </Button>
          </div>
          <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-5 py-5">
            <NavLink to="/" end className={mobileLinkClass} onClick={closeMenu}>
              Find a cottage
            </NavLink>
            <a
              href={SITE_LINKS.theEstate}
              target="_blank"
              rel="noopener noreferrer"
              className={mobileLinkClass({ isActive: false })}
              onClick={closeMenu}
            >
              The estate <span aria-hidden className="ml-1 text-xs">↗</span>
            </a>
            <a
              href={SITE_LINKS.bespoke}
              target={SITE_LINKS.bespoke !== "#" ? "_blank" : undefined}
              rel={SITE_LINKS.bespoke !== "#" ? "noopener noreferrer" : undefined}
              className={mobileLinkClass({ isActive: false })}
              onClick={closeMenu}
            >
              Bespoke
            </a>
            <NavLink
              to="/offers"
              className={mobileLinkClass}
              onClick={closeMenu}
            >
              Offers
            </NavLink>
            <NavLink
              to="/enquire"
              className={mobileLinkClass}
              onClick={closeMenu}
            >
              Enquire
            </NavLink>
            {user && (
              <>
                <NavLink
                  to="/bookings"
                  className={mobileLinkClass}
                  onClick={closeMenu}
                >
                  My bookings
                </NavLink>
                <NavLink
                  to="/profile"
                  className={mobileLinkClass}
                  onClick={closeMenu}
                >
                  {user.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt=""
                      aria-hidden
                      className="mr-3 size-8 object-cover"
                    />
                  ) : (
                    <span
                      className="mr-3 flex size-8 items-center justify-center bg-primary text-xs font-semibold text-primary-foreground"
                      aria-hidden
                    >
                      {initial}
                    </span>
                  )}
                  Profile ({user.name})
                </NavLink>
              </>
            )}
          </nav>
          <div className="border-t border-border px-5 py-5">
            {user ? (
              <Button
                className="min-h-[44px] w-full rounded-none"
                onClick={handleLogout}
              >
                <LogOut aria-hidden />
                Logout
              </Button>
            ) : (
              <div className="flex flex-col gap-2">
                <Button
                  asChild
                  variant="outline"
                  className="min-h-[44px] rounded-none"
                >
                  <Link to="/login" onClick={closeMenu}>
                    Login
                  </Link>
                </Button>
                <Button asChild className="min-h-[44px] rounded-none">
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
      <footer className="border-t border-border bg-secondary">
        <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-12 lg:py-14">
          <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr_0.9fr_1fr]">
            <div>
              <Link
                to="/"
                aria-label="Hamptworth Stays booking home"
                className="inline-block focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <img
                  src="/navlogo.webp"
                  alt="Hamptworth Stays"
                  className="h-16 w-auto object-contain mix-blend-multiply"
                  loading="lazy"
                />
              </Link>
              <p className="mt-4 max-w-[240px] text-sm leading-relaxed text-muted-foreground">
                Five cottages at Home Farm, Hamptworth.
              </p>
              <NewsletterFooterForm />
            </div>

            <div>
              <h3 className="mb-5 text-[11px] font-medium uppercase tracking-[0.12em]">
                Your stay
              </h3>
              <div className="flex flex-col gap-2.5 text-[13px] leading-relaxed">
                <Link to="/" className="hover:text-brand">
                  Find a cottage
                </Link>
                <Link to="/enquire" className="hover:text-brand">
                  Group stays
                </Link>
                <Link to="/offers" className="hover:text-brand">
                  Offers
                </Link>
                <a
                  href="https://hamptworthstays.com/local-area-and-map/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-brand"
                >
                  Explore the local area ↗
                </a>
              </div>
            </div>

            <div>
              <h3 className="mb-5 text-[11px] font-medium uppercase tracking-[0.12em]">
                A little help
              </h3>
              <div className="flex flex-col gap-2.5 text-[13px] leading-relaxed">
                <Link to="/enquire" className="hover:text-brand">
                  Make an enquiry
                </Link>
                <a
                  href={SITE_LINKS.bespoke}
                  target={SITE_LINKS.bespoke !== "#" ? "_blank" : undefined}
                  rel={SITE_LINKS.bespoke !== "#" ? "noopener noreferrer" : undefined}
                  className="hover:text-brand"
                >
                  Bespoke ↗
                </a>
                <Link to="/faqs" className="hover:text-brand">
                  FAQs
                </Link>
                <Link to="/policies/TERMS" className="hover:text-brand">
                  Booking terms
                </Link>
                <Link to="/policies/PRIVACY" className="hover:text-brand">
                  Privacy policy
                </Link>
              </div>
            </div>

            <div>
              <h3 className="mb-5 text-[11px] font-medium uppercase tracking-[0.12em]">
                Contact
              </h3>
              <p className="mb-3 text-[11px] text-muted-foreground">
                Estate &amp; club team
              </p>
              <div className="flex flex-col gap-2.5 text-[13px] leading-relaxed">
                <a href="tel:+441794390155" className="hover:text-brand">
                  01794 390155
                </a>
                <a
                  href="mailto:info@hamptworthgolf.co.uk"
                  className="hover:text-brand"
                >
                  info@hamptworthgolf.co.uk
                </a>
              </div>
            </div>
          </div>

          <div className="mt-10 flex flex-wrap items-center gap-x-7 gap-y-3 border-t border-border pt-5 text-[10px] text-muted-foreground">
            <span>© 2026 Hamptworth Stays</span>
            <span>Home Farm · Hamptworth</span>
            <a href="#top" className="ml-auto hover:text-foreground">
              Back to top ↑
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
