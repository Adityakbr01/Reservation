import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Loader } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SITE_LINKS } from "@/config/links";
import { formatDisplayDate, toDayKey } from "@/lib/date";
import {
  CottageCard,
  SearchForm,
  defaultSearchDates,
  parseAvailabilitySearchParams,
  toSearchRecord,
  useAvailabilitySearch,
} from "@/modules/availability";
import type { AvailabilitySearchParams } from "@/modules/availability";

gsap.registerPlugin(useGSAP, ScrollTrigger);

export function HomePage() {
  const location = useLocation();
  const [urlParams, setUrlParams] = useSearchParams();
  const urlSearch = useMemo(
    () => parseAvailabilitySearchParams(urlParams),
    [urlParams],
  );
  const restored =
    (location.state as { search?: AvailabilitySearchParams } | null)?.search ??
    null;
  // Pre-rendered home embeds the build-time default search so the server
  // and hydration markup match. Later client navigations fall back to live
  // defaults (the flag is cleared once hydration finishes).
  const ssgSearch =
    typeof window === "undefined"
      ? (globalThis.__HS_SSG_SEARCH__ ?? null)
      : window.__HS_HYDRATING__
        ? (window.__HS_SSG_SEARCH__ ?? null)
        : null;
  const initial: AvailabilitySearchParams = urlSearch ?? restored ?? ssgSearch ?? {
    ...defaultSearchDates(),
    adults: 2,
    children: 0,
    rooms: 1,
  };
  const [search, setSearch] = useState<AvailabilitySearchParams>(initial);
  const { data, isFetching, isError, refetch } = useAvailabilitySearch(search);
  const isInitialLoading = isFetching && !data;
  const isRevalidating = isFetching && !!data;

  function handleSearch(next: AvailabilitySearchParams) {
    setSearch(next);
    setUrlParams(toSearchRecord(next), { replace: true });
  }

  // A static build can age; roll the default dates forward if they are now
  // in the past, then let React Query revalidate in the background.
  useEffect(() => {
    if (urlSearch || restored) return;
    if (!ssgSearch || ssgSearch.checkIn >= toDayKey(new Date())) return;
    const fresh = { ...ssgSearch, ...defaultSearchDates() };
    setSearch(fresh);
  }, [restored, ssgSearch, urlSearch]);

  const results = useMemo(() => {
    const list = data?.results ?? [];
    // Keep stable alphabetical ordering so cards stay in place and never jump
    return [...list].sort((a, b) => {
      const soldOutDiff =
        Number(a.availableCount === 0) - Number(b.availableCount === 0);
      if (soldOutDiff !== 0) return soldOutDiff;
      return a.roomType.name.localeCompare(b.roomType.name);
    });
  }, [data?.results]);

  const rootRef = useRef<HTMLDivElement>(null);
  const reduceMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Hero entrance + ambient leaves + banner parallax (mount only).
  useGSAP(
    () => {
      if (reduceMotion) return;
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      tl.from(".hero-banner", { scale: 1.12, duration: 2, ease: "expo.out" }, 0)
        .from(".hero-eyebrow", { y: 24, opacity: 0, duration: 0.7 }, 0.15)
        .from(".hero-title", { y: 56, opacity: 0, duration: 1.1 }, 0.25)
        .from(".hero-sub", { y: 28, opacity: 0, duration: 0.9 }, 0.5)
        .from(".search-card", { y: 48, opacity: 0, duration: 1 }, 0.8)
        .from(
          ".hero-leaf-wrap-a, .hero-leaf-wrap-b, .hero-leaf-wrap-c",
          { opacity: 0, duration: 1.4 },
          0.5,
        )
        .from(".hero-bird", { opacity: 0, x: 24, duration: 1 }, 0.6);
      // Ambient leaf drift (transforms live on inner imgs; parallax on wrappers).
      gsap.to(".hero-leaf-a", {
        y: 18,
        rotation: 5,
        duration: 5,
        yoyo: true,
        repeat: -1,
        ease: "sine.inOut",
      });
      gsap.to(".hero-leaf-b", {
        y: -14,
        rotation: -6,
        duration: 6.5,
        yoyo: true,
        repeat: -1,
        ease: "sine.inOut",
      });
      gsap.to(".hero-leaf-c", {
        y: 12,
        rotation: 7,
        duration: 7,
        yoyo: true,
        repeat: -1,
        ease: "sine.inOut",
      });
      gsap.to(".hero-bird", {
        y: -10,
        duration: 4.5,
        yoyo: true,
        repeat: -1,
        ease: "sine.inOut",
      });
      gsap.to(".hero-banner", {
        yPercent: 10,
        ease: "none",
        scrollTrigger: {
          trigger: ".hero",
          start: "top top",
          end: "bottom top",
          scrub: true,
        },
      });
      gsap.to(".hero-leaf-wrap-a", {
        yPercent: -30,
        ease: "none",
        scrollTrigger: {
          trigger: ".hero",
          start: "top top",
          end: "bottom top",
          scrub: true,
        },
      });
    },
    { scope: rootRef },
  );

  // Results header entrance on mount only (cards stay firmly in place without re-rendering or flashing)
  useGSAP(
    () => {
      if (reduceMotion) return;
      gsap.fromTo(
        ".results-head",
        { y: 24, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          ease: "power3.out",
        },
      );
    },
    { scope: rootRef },
  );

  const guestTotal = search.adults + search.children;
  const summary =
    search.checkIn && search.checkOut
      ? `${formatDisplayDate(search.checkIn)} – ${formatDisplayDate(search.checkOut)} · ${guestTotal} total guest${guestTotal === 1 ? "" : "s"} · ${search.rooms} cottage${search.rooms === 1 ? "" : "s"}`
      : "Choose your dates to see availability";

  return (
    <div ref={rootRef} className="-mx-4 pb-8 sm:-mx-6 sm:pb-12">
      <section className="hero relative left-1/2 -mt-4 w-screen -translate-x-1/2 overflow-hidden sm:-mt-6">
        {/* Exterior stay photograph (approved repo asset) with a soft cream wash
            so the serif headline stays crisp. Foreground remains fully opaque. */}
        <picture className="hero-banner absolute inset-0 block h-full w-full">
          <source srcSet="/hero_cottage_bg.avif" type="image/avif" />
          <img
            src="/hero_cottage_bg.webp"
            alt=""
            aria-hidden
            width={1600}
            height={1066}
            className="h-full w-full object-cover object-[50%_66%] saturate-[0.77]"
            loading="eager"
            fetchPriority="high"
          />
        </picture>
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-b from-[#f5f2e9]/95 via-[#f5f2e9]/80 to-[#f5f2e9]/30 lg:bg-gradient-to-r lg:from-[#f5f2e9] lg:via-[#f5f2e9]/75 lg:to-transparent"
        />
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#f5f2e9] to-transparent"
        />
        {/* Ambient leaves (true transparency, tucked to edges, clear of text) */}
        <div
          className="hero-leaf-wrap-a pointer-events-none absolute right-2 top-4 w-40 opacity-95 blur-[0.2px] sm:w-72 lg:top-6 lg:w-80"
          aria-hidden
        >
          <img
            src="/leaf1.webp"
            alt=""
            loading="eager"
            className="hero-leaf-a w-full"
          />
        </div>
        <div
          className="hero-leaf-wrap-b pointer-events-none absolute -left-8 bottom-20 hidden w-56 opacity-90 sm:block lg:w-60"
          aria-hidden
        >
          <img
            src="/leaf4.webp"
            alt=""
            loading="lazy"
            className="hero-leaf-b w-full"
          />
        </div>
        <div
          className="hero-leaf-wrap-c pointer-events-none absolute -bottom-6 right-1 hidden w-40 rotate-[172deg] opacity-90 blur-[0.5px] md:block lg:w-44"
          aria-hidden
        >
          <img
            src="/leaf3.webp"
            alt=""
            loading="lazy"
            className="hero-leaf-c w-full"
          />
        </div>

        <div className="relative mx-auto w-full max-w-7xl px-4 pb-24 pt-10 sm:px-6 lg:px-12 lg:pb-28 lg:pt-16">
          <div className="max-w-[680px]">
            <span className="hero-eyebrow mb-5 block text-[11px] font-medium uppercase tracking-[0.17em] text-foreground sm:mb-6">
              Hamptworth Stays · Home Farm
            </span>
              <div className="relative flex items-center gap-3 sm:gap-5">
                <h1 className="hero-title text-balance font-display text-[clamp(3.1rem,8vw,5.94rem)] font-normal leading-[1.03] tracking-[-1.5px] text-foreground">
                  A little escape.
                </h1>
                <img
                  src="/bird1.webp"
                  alt="Robin perched on a branch"
                  loading="eager"
                  className="hero-bird absolute right-[33%] top-[50%]  md:right-[23%] md:top-[60%] -translate-y-1/2 h-14 w-auto shrink-0 object-contain saturate-[0.7] sm:h-[100px]"
                />
              </div>
            <p className="hero-sub mt-4 max-w-xl font-display text-xl italic leading-snug text-brand-light sm:text-[25px]">
              Choose your dates. Enjoy a slower pace.
            </p>
          </div>
        </div>
      </section>

      <div className="relative z-10 mx-auto -mt-10 w-full max-w-7xl px-4 sm:-mt-14 sm:px-6 lg:px-12">
        <div className="search-card border border-border bg-card p-4 shadow-card sm:p-6">
          <SearchForm
            initial={search}
            isPending={isInitialLoading}
            onSearch={handleSearch}
          />
        </div>

        <p
          role="status"
          aria-live="polite"
          className="mt-5 flex min-h-5 flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-muted-foreground"
        >
          <span>{summary}</span>
          {isRevalidating && (
            <span className="inline-flex items-center gap-1.5 text-brand-light">
              <Loader className="size-3 animate-spin" aria-hidden />
              Updating availability…
            </span>
          )}
        </p>

        <section className="pb-14 pt-6 sm:pt-8">
          <div className="results-head mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <h2 className="font-display text-[32px] leading-[1.05] tracking-tight sm:text-[42px]">
              Available cottages
            </h2>
            <a
              href={SITE_LINKS.enquireNow}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex max-w-[360px] items-center justify-between gap-5 border-b border-brand-light pb-2 text-[12px] leading-relaxed text-foreground transition-colors hover:text-brand focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              Booking several cottages? Enquire about a group stay
              <span
                aria-hidden
                className="shrink-0 transition-transform group-hover:translate-x-1"
              >
                →
              </span>
            </a>
          </div>

          {isInitialLoading ? (
            <div
              className="grid gap-5 lg:grid-cols-2"
              aria-busy="true"
              aria-label="Searching availability"
            >
              {[0, 1, 2, 3].map((row) => (
                <Skeleton key={row} className="h-[328px] w-full rounded-none" />
              ))}
            </div>
          ) : isError && !data ? (
            <div className="border border-border bg-card px-6 py-12 text-center">
              <p className="font-display text-2xl">Search failed</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Check your dates and try again.
              </p>
              <Button
                className="mt-5 h-11 rounded-none px-6"
                onClick={() => void refetch()}
              >
                Retry
              </Button>
            </div>
          ) : !data ? (
            <div
              className="grid gap-5 lg:grid-cols-2"
              aria-busy="true"
              aria-label="Searching availability"
            >
              {[0, 1, 2, 3].map((row) => (
                <Skeleton key={row} className="h-[328px] w-full rounded-none" />
              ))}
            </div>
          ) : results.length === 0 ? (
            <div className="border border-border bg-card px-6 py-12 text-center">
              <p className="font-display text-2xl">
                Nothing available for these dates
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Try different dates, fewer guests, or fewer cottages.
              </p>
            </div>
          ) : (
            <>
              <div className="grid items-stretch gap-5 md:grid-cols-[repeat(auto-fit,minmax(420px,1fr))]">
                {results.map((item) => (
                  <CottageCard
                    key={item.roomType.id}
                    item={item}
                    search={search}
                  />
                ))}
              </div>
              <p className="mt-8 max-w-[870px] border-t border-border pt-6 text-[13px] leading-relaxed text-muted-foreground">
                Children count within each cottage&rsquo;s total guest limit.
                Please ask us about infants and any equipment you need before
                booking.
              </p>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

export default HomePage;
