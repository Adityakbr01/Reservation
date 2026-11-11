import { useEffect, useState } from "react";
// import type { FormEvent } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { LogOut, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuthInit } from "@/app/use-auth-init";
import { useAuthStore } from "@/stores/auth-store";
import { userKeys } from "@/lib/query-keys";
import { SITE_LINKS } from "@/config/links";
import { useSiteSettings } from "@/modules/cms/hooks/use-cms";

function DynamicLink({
  link,
  className,
  onClick,
  children,
}: {
  link: { label: string; url: string; openInNewTab?: boolean };
  className?: string;
  onClick?: () => void;
  children?: React.ReactNode;
}) {
  const isExternal =
    link.openInNewTab ||
    link.url.startsWith("http://") ||
    link.url.startsWith("https://") ||
    link.url.startsWith("tel:") ||
    link.url.startsWith("mailto:");

  const content = children ?? link.label;

  if (isExternal) {
    return (
      <a
        href={link.url}
        target={link.openInNewTab ? "_blank" : undefined}
        rel={link.openInNewTab ? "noopener noreferrer" : undefined}
        className={className}
        onClick={onClick}
      >
        {content}
      </a>
    );
  }

  return (
    <Link to={link.url} className={className} onClick={onClick}>
      {content}
    </Link>
  );
}

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

// function NewsletterFooterForm() {
//   const [email, setEmail] = useState("");
//   const [done, setDone] = useState(false);
//   async function submit(e: FormEvent) {
//     e.preventDefault();
//     if (!/.+@.+\..+/.test(email)) {
//       toast.error("Enter a valid email");
//       return;
//     }
//     try {
//       const { publicApiClient } = await import("@/lib/api-client");
//       await publicApiClient.post("/public/newsletter/subscribe", {
//         email: email.trim(),
//         source: "footer",
//       });
//       setDone(true);
//       toast.success("Subscribed — welcome!");
//     } catch {
//       toast.error("Could not subscribe");
//     }
//   }
//   if (done) return <p className="text-sm">Subscribed — thank you.</p>;
//   return (
//     <form onSubmit={(e) => void submit(e)} className="mt-6 max-w-xs space-y-2">
//       <div className="flex gap-2">
//         <input
//           type="email"
//           value={email}
//           onChange={(e) => setEmail(e.target.value)}
//           placeholder="you@example.com"
//           aria-label="Email for newsletter"
//           className="h-11 min-w-0 flex-1 rounded-none border border-input bg-card px-3 text-[13px] outline-none focus-visible:ring-1 focus-visible:ring-ring"
//         />
//         <Button
//           type="submit"
//           className="h-11 rounded-none bg-primary px-4 text-[12px] text-primary-foreground hover:bg-brand-dark"
//         >
//           Join
//         </Button>
//       </div>
//     </form>
//   );
// }

export function RootLayout() {
  useAuthInit();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [menuOpen, setMenuOpen] = useState(false);
  // The pre-rendered home is rendered logged out; reveal the persisted
  // session only after hydration so server and client markup agree.
  const [sessionReady, setSessionReady] = useState(() =>
    typeof window === "undefined" ? false : !window.__HS_HYDRATING__,
  );
  useEffect(() => {
    if (!sessionReady) setSessionReady(true);
  }, [sessionReady]);
  const sessionUser = sessionReady ? user : null;

  function handleLogout() {
    useAuthStore.getState().clearSession();
    queryClient.removeQueries({ queryKey: userKeys.all });
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

  const initial = sessionUser?.name.trim().charAt(0).toUpperCase() || "?";

  const { data: siteSettings } = useSiteSettings();

  const defaultHeaderLinks = [
    { id: "local-area", label: "The Local Area", url: SITE_LINKS.localArea, openInNewTab: true, isEnabled: true },
    { id: "the-estate", label: "The estate", url: SITE_LINKS.theEstate, openInNewTab: true, isEnabled: true },
    { id: "bespoke", label: "Bespoke", url: SITE_LINKS.bespoke, openInNewTab: true, isEnabled: true },
  ];

  const headerLinks = (
    siteSettings?.headerNavigation?.links && siteSettings.headerNavigation.links.length > 0
      ? siteSettings.headerNavigation.links
      : defaultHeaderLinks
  ).filter((l) => l.isEnabled !== false);

  const enquireBtn = siteSettings?.headerNavigation?.enquireButton ?? {
    label: "Enquire",
    url: SITE_LINKS.enquireNow,
    openInNewTab: true,
    isEnabled: true,
  };

  return (
    <div
      id="top"
      className="flex min-h-screen flex-col bg-background font-sans text-foreground"
    >
      <header className="sticky top-0 z-50 border-b border-border bg-background">
        <div className="mx-auto grid h-[84px] w-full max-w-7xl grid-cols-[1fr_auto_1fr] items-center gap-[5px] px-[22px] sm:px-6 lg:h-[98px] lg:gap-3 lg:px-12">
          {/* Left links */}
          <div className="flex min-w-0 items-center gap-6">
            {headerLinks[0] && (
              <DynamicLink
                link={headerLinks[0]}
                className={cn(
                  "inline-flex items-center whitespace-nowrap border-b-[0.8px] border-[#889878] py-0 text-[9px] leading-[12.6px] text-foreground transition-colors",
                  "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                  "md:border-transparent md:py-3 md:text-[13px] md:leading-none md:hover:border-brand-light md:hover:text-foreground",
                )}
              />
            )}
            {headerLinks.length > 1 && (
              <nav
                aria-label="Booking navigation"
                className="hidden items-center gap-6 md:flex"
              >
                {headerLinks.slice(1).map((lnk, idx) => (
                  <DynamicLink
                    key={lnk.id ?? idx}
                    link={lnk}
                    className={cn(
                      navLinkClass({ isActive: false }),
                      "hidden gap-1 lg:inline-flex",
                    )}
                  />
                ))}
              </nav>
            )}
          </div>

          {/* Centered logo */}
          <Link
            to="/"
            onClick={closeMenu}
            aria-label="Hamptworth Stays — home"
            className="col-start-2 inline-flex min-w-0 shrink-0 items-center justify-center focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <img
              src="/navlogo.webp"
              alt={siteSettings?.propertyName ?? "Hamptworth Stays"}
              className="h-[71px] w-[130px] shrink-0 object-contain mix-blend-multiply lg:h-[76px] lg:w-auto"
              loading="eager"
            />
          </Link>

          {/* Right actions */}
          <div className="col-start-3 flex items-center justify-end gap-5">
            <div className="hidden items-center gap-5 md:flex">
              {enquireBtn.isEnabled !== false && (
                <DynamicLink
                  link={enquireBtn}
                  className="water-fill inline-flex items-center gap-5 border border-input px-4 py-2.5 text-[13px] leading-none text-foreground hover:border-brand focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {enquireBtn.label}
                  <span aria-hidden>→</span>
                </DynamicLink>
              )}
              {sessionUser ? (
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
                    {sessionUser.avatarUrl ? (
                      <img
                        src={sessionUser.avatarUrl}
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
                      {sessionUser.name}
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
            {headerLinks.map((lnk, idx) => (
              <DynamicLink
                key={lnk.id ?? idx}
                link={lnk}
                className={mobileLinkClass({ isActive: false })}
                onClick={closeMenu}
              />
            ))}
            {enquireBtn.isEnabled !== false && (
              <DynamicLink
                link={enquireBtn}
                className={mobileLinkClass({ isActive: false })}
                onClick={closeMenu}
              />
            )}
            {sessionUser && (
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
                  {sessionUser.avatarUrl ? (
                    <img
                      src={sessionUser.avatarUrl}
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
                  Profile ({sessionUser.name})
                </NavLink>
              </>
            )}
          </nav>
          <div className="border-t border-border px-5 py-5">
            {sessionUser ? (
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
      <footer className="font-georgia border-t-[0.8px] border-[#d8deca] bg-secondary text-[14px] font-semibold leading-6 tracking-[0.56px] text-[#1c2a1b]">
        <div className="mx-auto w-full max-w-7xl px-[22px] pb-[95px] pt-[39px] sm:px-6 lg:px-12 lg:py-14">
          {(() => {
            const showCol1 =
              siteSettings?.footerNavigation?.col1?.showLogo !== false ||
              !!siteSettings?.footerNavigation?.col1?.tagline;
            const showCol2 = siteSettings?.footerNavigation?.col2?.isEnabled !== false;
            const showCol3 = siteSettings?.footerNavigation?.col3?.isEnabled !== false;
            const showCol4 =
              siteSettings?.footerNavigation?.col4?.isEnabled !== false &&
              (siteSettings?.footerNavigation?.col4?.showPhone !== false ||
                siteSettings?.footerNavigation?.col4?.showEmail !== false ||
                !!siteSettings?.footerNavigation?.col4?.showAddress);

            const visibleColCount = [showCol1, showCol2, showCol3, showCol4].filter(Boolean).length;

            let gridClass =
              "grid grid-cols-2 gap-x-[22px] gap-y-[30px] lg:grid-cols-[1.3fr_1fr_1fr_1fr] lg:gap-8";
            if (visibleColCount <= 1) {
              gridClass = "grid grid-cols-1 gap-8 max-w-md";
            } else if (visibleColCount === 2) {
              gridClass =
                "grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8 lg:grid-cols-[1.4fr_1fr] lg:gap-16";
            } else if (visibleColCount === 3) {
              gridClass =
                "grid grid-cols-1 sm:grid-cols-3 gap-x-8 gap-y-8 lg:grid-cols-[1.4fr_1fr_1fr] lg:gap-12";
            }

            return (
              <div className={gridClass}>
                {showCol1 && (
                  <div
                    className={
                      visibleColCount === 4
                        ? "col-span-2 lg:col-span-1 min-w-0"
                        : "col-span-1 min-w-0"
                    }
                  >
                    {siteSettings?.footerNavigation?.col1?.showLogo !== false && (
                      <Link
                        to="/"
                        aria-label="Hamptworth Stays booking home"
                        className="inline-block focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      >
                        <img
                          src="/navlogo.webp"
                          alt={siteSettings?.propertyName ?? "Hamptworth Stays"}
                          className="h-24 w-auto max-w-full object-contain object-left mix-blend-multiply lg:h-32"
                          loading="lazy"
                        />
                      </Link>
                    )}
                    {siteSettings?.footerNavigation?.col1?.tagline && (
                      <p className="mt-2 text-xs font-normal text-muted-foreground max-w-xs">
                        {siteSettings.footerNavigation.col1.tagline}
                      </p>
                    )}
                  </div>
                )}

                {showCol2 && (
                  <div className="col-span-1 min-w-0">
                    <h3 className="mb-5 text-[12px] font-bold uppercase leading-5 tracking-[1.3px] break-words">
                      {siteSettings?.footerNavigation?.col2?.heading ?? "Your stay"}
                    </h3>
                    <div className="flex flex-col gap-2.5">
                      {(siteSettings?.footerNavigation?.col2?.links &&
                      siteSettings.footerNavigation.col2.links.length > 0
                        ? siteSettings.footerNavigation.col2.links.filter(
                            (l) => l.isEnabled !== false,
                          )
                        : [
                            { label: "Find a cottage", url: "/" },
                            {
                              label: "Group stays",
                              url: SITE_LINKS.enquireNow,
                              openInNewTab: true,
                            },
                            {
                              label: "Explore the local area ↗",
                              url: SITE_LINKS.localArea,
                              openInNewTab: true,
                            },
                          ]
                      ).map((l, i) => (
                        <DynamicLink
                          key={l.id ?? i}
                          link={l}
                          className="hover:text-brand"
                        />
                      ))}
                    </div>
                  </div>
                )}

                {showCol3 && (
                  <div className="col-span-1 min-w-0">
                    <h3 className="mb-5 text-[12px] font-bold uppercase leading-5 tracking-[1.3px] break-words">
                      {siteSettings?.footerNavigation?.col3?.heading ?? "A little help"}
                    </h3>
                    <div className="flex flex-col gap-2.5">
                      {(siteSettings?.footerNavigation?.col3?.links &&
                      siteSettings.footerNavigation.col3.links.length > 0
                        ? siteSettings.footerNavigation.col3.links.filter(
                            (l) => l.isEnabled !== false,
                          )
                        : [
                            {
                              label: "Make an enquiry",
                              url: SITE_LINKS.enquireNow,
                              openInNewTab: true,
                            },
                            {
                              label: "Bespoke ↗",
                              url: SITE_LINKS.bespoke,
                              openInNewTab: true,
                            },
                            { label: "Booking terms", url: "/policies/TERMS" },
                            { label: "Privacy policy", url: "/policies/PRIVACY" },
                          ]
                      ).map((l, i) => (
                        <DynamicLink
                          key={l.id ?? i}
                          link={l}
                          className="hover:text-brand"
                        />
                      ))}
                    </div>
                  </div>
                )}

                {showCol4 && (
                  <div
                    className={
                      visibleColCount === 4
                        ? "col-span-2 lg:col-span-1 min-w-0"
                        : "col-span-1 min-w-0"
                    }
                  >
                    <h3 className="mb-5 text-[12px] font-bold uppercase leading-5 tracking-[1.3px] break-words">
                      {siteSettings?.footerNavigation?.col4?.heading ?? "Contact"}
                    </h3>

                    <div className="flex flex-col gap-2.5">
                      {siteSettings?.footerNavigation?.col4?.showPhone !== false && (
                        <a
                          href={`tel:${siteSettings?.phone ?? "+441794390155"}`}
                          className="hover:text-brand"
                        >
                          {siteSettings?.phone ?? "+44 7943 547557"}
                        </a>
                      )}
                      {siteSettings?.footerNavigation?.col4?.showEmail !== false && (
                        <a
                          href={`mailto:${siteSettings?.supportEmail ?? "info@hamptworthstays.com"}`}
                          className="hover:text-brand"
                        >
                          {siteSettings?.supportEmail ?? "info@hamptworthstays.com"}
                        </a>
                      )}
                      {siteSettings?.footerNavigation?.col4?.showAddress &&
                        siteSettings?.address && (
                          <p className="text-xs font-normal text-muted-foreground">
                            {siteSettings.address}
                          </p>
                        )}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          <div className="mt-[33px] flex flex-wrap items-center justify-between gap-[18px] border-t-[0.8px] border-[#cbd2c0] pt-5 text-[9px] leading-[12.6px] text-[#748165]">
            <span>
              {siteSettings?.footerNavigation?.bottomBar?.copyrightText ??
                `© ${new Date().getFullYear()} Hamptworth Stays`}
            </span>
            <div className="ml-auto flex flex-wrap items-center gap-[18px]">
              <span>
                {siteSettings?.footerNavigation?.bottomBar?.locationText ??
                  "Home Farm · Hamptworth"}
              </span>
              {siteSettings?.footerNavigation?.bottomBar?.showBackToTop !==
                false && (
                <a href="#top" className="hover:text-foreground">
                  Back to top ↑
                </a>
              )}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
