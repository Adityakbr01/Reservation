import { useMemo, useRef, useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Loader } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDisplayDate } from "@/lib/date";
import { cn } from "@/lib/utils";
import { fetchSiteSettings } from "@/modules/cms/api/cms.api";
import {
  CottageCard,
  SearchForm,
  defaultSearchDates,
  defaultSearchParams,
  parseAvailabilitySearchParams,
  toSearchRecord,
  useAvailabilitySearch,
} from "@/modules/availability";
import type { AvailabilitySearchParams } from "@/modules/availability";
import { BookingJourneyDialog } from "@/modules/booking/components/BookingJourneyDialog";
import { useBookingJourneyStore } from "@/stores/booking-journey-store";

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
  // Pre-rendered home embeds the build-time search (dates empty) so the
  // server and hydration markup match. Later client navigations start with
  // empty dates too — the guest picks them in the search card.
  const ssgSearch =
    typeof window === "undefined"
      ? (globalThis.__HS_SSG_SEARCH__ ?? null)
      : window.__HS_HYDRATING__
        ? (window.__HS_SSG_SEARCH__ ?? null)
        : null;
  const initial: AvailabilitySearchParams = urlSearch ??
    restored ??
    ssgSearch ??
    defaultSearchParams;
  const [search, setSearch] = useState<AvailabilitySearchParams>(initial);

  // Until the guest picks dates, keep the results grid populated using a
  // rolling example window. The cards themselves display "choose dates".
  const availabilitySearch = useMemo(
    () =>
      search.checkIn && search.checkOut
        ? search
        : { ...search, ...defaultSearchDates() },
    [search],
  );
  const { data, isFetching, isError, refetch } = useAvailabilitySearch(availabilitySearch);
  const isInitialLoading = isFetching && !data;
  const isRevalidating = isFetching && !!data;

  function handleSearch(next: AvailabilitySearchParams) {
    setSearch(next);
    setUrlParams(
      next.checkIn && next.checkOut ? toSearchRecord(next) : {},
      { replace: true },
    );
  }

  const openBookingJourney = useBookingJourneyStore((state) => state.openBookingJourney);

  function handleFindCottages(next: AvailabilitySearchParams) {
    openBookingJourney(null, next);
  }

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

  const { data: siteSettings } = useQuery({
    queryKey: ["site-settings"],
    queryFn: fetchSiteSettings,
    staleTime: 5 * 60 * 1000,
  });

  const hp = siteSettings?.homePage;

  const section1Results = useMemo(() => {
    return results.filter(
      (item) => (item.roomType.homeSection ?? item.roomType.home_section) !== "section_2",
    );
  }, [results]);

  const section2Results = useMemo(() => {
    return results.filter(
      (item) => (item.roomType.homeSection ?? item.roomType.home_section) === "section_2",
    );
  }, [results]);

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
  const hasSelectedDates = Boolean(search.checkIn && search.checkOut);
  const showMobileStatus = hasSelectedDates || isRevalidating;
  const summary = hasSelectedDates
    ? `${formatDisplayDate(search.checkIn)} – ${formatDisplayDate(search.checkOut)} · ${guestTotal} total guest${guestTotal === 1 ? "" : "s"} · ${search.rooms} cottage${search.rooms === 1 ? "" : "s"}`
    : "Choose your dates to see availability";

  return (
    <div ref={rootRef} className="-mx-4 pb-8 sm:-mx-6 sm:pb-12">
      <section className="hero relative left-1/2 -mt-4 w-screen -translate-x-1/2 overflow-hidden sm:-mt-6">
        {/* Exterior stay photograph (approved repo asset) with a soft cream wash
            so the serif headline stays crisp. Foreground remains fully opaque. */}
        <picture className="hero-banner absolute inset-0 block h-full w-full hidden sm:block">
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
          className="absolute inset-0 bg-gradient-to-b from-[#f5f2e9]/95 via-[#f5f2e9]/80 to-[#f5f2e9]/30 lg:bg-gradient-to-r lg:from-[#f5f2e9] lg:via-[#f5f2e9]/75 lg:to-transparent hidden sm:block"
        />
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#f5f2e9] to-transparent"
        />
        {/* Ambient leaves (true transparency, tucked to edges, clear of text) */}
        {hp?.hero?.showLeaves === true && (
          <>
            <div
              className="hero-leaf-wrap-a pointer-events-none absolute right-2 top-4 hidden w-40 opacity-95 blur-[0.2px] sm:w-72 md:block lg:top-6 lg:w-80"
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
          </>
        )}

        <div className="relative mx-auto w-full max-w-7xl px-4 pb-16 pt-8 sm:px-6 md:pb-24 md:pt-10 lg:px-12 lg:pb-28 lg:pt-16 hidden sm:block">
          <div className="max-w-[680px]">
            {hp?.hero?.showEyebrow === true && (
              <span className="hero-eyebrow mb-5 hidden text-[11px] font-medium uppercase tracking-[0.17em] text-foreground sm:mb-6 md:block">
                {hp?.hero?.eyebrow}
              </span>
            )}
            {hp?.hero?.showTitle === true && (
              <h1 className="hero-title text-balance font-display text-[clamp(3.1rem,8vw,5.94rem)] font-normal leading-[1.03] tracking-[-1.5px] text-foreground">
                {(() => {
                  const title = hp?.hero?.title || "";
                  const showBird = hp?.hero?.showBird === true;
                if (!showBird) {
                  return title;
                }
                const words = title.trim().split(" ");
                if (words.length <= 1) {
                  return (
                    <span className="relative inline-block">
                      {title}
                      <img
                        src="/bird1.webp"
                        alt=""
                        aria-hidden
                        loading="eager"
                        className="hero-bird pointer-events-none absolute bottom-0 left-full -ml-[0.22em] hidden h-14 w-auto max-w-none object-contain saturate-[0.7] sm:h-[104px] md:block"
                      />
                    </span>
                  );
                }
                const lastWord = words[words.length - 1];
                const leadingWords = words.slice(0, -1).join(" ") + " ";
                return (
                  <>
                    {leadingWords}
                    <span className="relative inline-block">
                      {lastWord}
                      <img
                        src="/bird1.webp"
                        alt=""
                        aria-hidden
                        loading="eager"
                        className="hero-bird pointer-events-none absolute bottom-0 left-full -ml-[0.22em] hidden h-14 w-auto max-w-none object-contain saturate-[0.7] sm:h-[104px] md:block"
                      />
                    </span>
                  </>
                );
              })()}
            </h1>
          )}
            {hp?.hero?.showSubtitle === true && (
              <p className="hero-sub mt-4 max-w-xl font-display text-xl italic leading-snug text-brand-light sm:text-[25px]">
                {hp?.hero?.subtitle}
              </p>
            )}
          </div>
        </div>
      </section>

      <div className="relative z-10 mx-auto pt-6 w-full max-w-7xl px-4 sm:-mt-14 sm:pt-0 sm:px-6 lg:px-12">
        <div className="search-card border border-border bg-card p-4 shadow-card sm:p-6">
          <SearchForm
            initial={search}
            isPending={isInitialLoading}
            onSearch={handleSearch}
            onFindCottages={handleFindCottages}
          />
        </div>

        <p
          role="status"
          aria-live="polite"
          className={cn(
            "mt-5 min-h-5 flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-muted-foreground",
            showMobileStatus ? "flex" : "hidden md:flex",
          )}
        >
          <span>{summary}</span>
          {isRevalidating && (
            <span className="inline-flex items-center gap-1.5 text-brand-light">
              <Loader className="size-3 animate-spin" aria-hidden />
              Updating availability…
            </span>
          )}
        </p>

        {/* Section 1: Main Cottages (Home Farm) */}
        {hp?.section1?.isEnabled === true && (
          <section className="pb-10 pt-4 sm:pb-14 sm:pt-8">
            <div className="results-head mb-5 flex flex-row items-end gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex flex-col gap-1">
                {hp?.section1?.showHeading !== false && (
                  <h2 className="font-display text-[28px] leading-[1.05] tracking-tight sm:text-[42px]">
                    {hp?.section1?.heading}
                  </h2>
                )}
                {hp?.section1?.showSubtitle !== false && (
                  <p className="mt-0 text-sm text-muted-foreground max-w-xl">
                    {hp?.section1?.subtitle}
                  </p>
                )}
              </div>
              {hp?.section1?.showEnquireLink !== false && hp?.section1?.enquireUrl && (
                <a
                  href={hp?.section1?.enquireUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group hidden md:flex max-w-[360px] items-center justify-between gap-5 border-b border-brand-light pb-2 text-[12px] leading-relaxed text-foreground transition-colors hover:text-brand focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  Enquire about a group stay
                  <span
                    aria-hidden
                    className="shrink-0 transition-transform group-hover:translate-x-1"
                  >
                    →
                  </span>
                </a>
              )}
            </div>

            {isInitialLoading ? (
            <div
              className="grid gap-5 lg:grid-cols-2"
              aria-busy="true"
              aria-label="Searching availability"
            >
              {[0, 1].map((row) => (
                <Skeleton key={row} className="h-[520px] w-full rounded-none" />
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
              className="grid grid-cols-1 md:grid-cols-2 gap-[26px] items-stretch"
              aria-busy="true"
              aria-label="Searching availability"
            >
              {[0, 1].map((row) => (
                <Skeleton key={row} className="h-[520px] w-full rounded-none" />
              ))}
            </div>
          ) : results.length === 0 ? (
            <div className="border border-border bg-card px-6 py-12 text-center">
              <p className="font-display text-2xl">
                {hp?.emptyHeading}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {hp?.emptySubtitle}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-[26px] items-stretch">
              {section1Results.map((item) => (
                <CottageCard
                  key={item.roomType.id}
                  item={item}
                  search={search}
                />
              ))}
            </div>
          )}
          </section>
        )}

        {/* Section 2: Other Property / Estate Cottages */}
        {hp?.section2?.isEnabled === true && (section2Results.length > 0 || isInitialLoading) && (
          <section className="pb-10 pt-2 sm:pb-14 sm:pt-4 border-t border-border/50">
            <div className="results-head mb-5 flex flex-col gap-4 sm:mb-7 sm:flex-row sm:items-end sm:justify-between pt-6">
              <div>
                {hp?.section2?.showHeading !== false && (
                  <h2 className="font-display text-[28px] leading-[1.05] tracking-tight sm:text-[42px]">
                    {hp?.section2?.heading}
                  </h2>
                )}
                {hp?.section2?.showSubtitle !== false && (
                  <p className="mt-1 text-sm text-muted-foreground max-w-xl">
                    {hp.section2.subtitle}
                  </p>
                )}
              </div>
              {hp?.section2?.showEnquireLink !== false && hp.section2.enquireUrl && (
                <a
                  href={hp.section2.enquireUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group hidden md:flex max-w-[360px] items-center justify-between gap-5 border-b border-brand-light pb-2 text-[12px] leading-relaxed text-foreground transition-colors hover:text-brand focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  Enquire about estate stays
                  <span
                    aria-hidden
                    className="shrink-0 transition-transform group-hover:translate-x-1"
                  >
                    →
                  </span>
                </a>
              )}
            </div>

            {isInitialLoading ? (
              <div
                className="grid gap-5 lg:grid-cols-2"
                aria-busy="true"
                aria-label="Searching availability"
              >
                {[0, 1].map((row) => (
                  <Skeleton key={row} className="h-[520px] w-full rounded-none" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-[26px] items-stretch">
                {section2Results.map((item) => (
                  <CottageCard
                    key={item.roomType.id}
                    item={item}
                    search={search}
                  />
                ))}
              </div>
            )}
          </section>
        )}
      </div>

      <BookingJourneyDialog cottages={results} />
    </div>
  );
}

export default HomePage;
