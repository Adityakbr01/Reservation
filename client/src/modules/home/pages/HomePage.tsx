import { useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Bell, Gem, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatMoney } from "@/lib/money";
import {
  RoomTypeCard,
  SearchForm,
  defaultSearchDates,
  useAvailabilitySearch,
} from "@/modules/availability";
import type { AvailabilitySearchParams } from "@/modules/availability";

gsap.registerPlugin(useGSAP, ScrollTrigger);

export function HomePage() {
  const location = useLocation();
  const restored =
    (location.state as { search?: AvailabilitySearchParams } | null)?.search ??
    null;
  const dates = defaultSearchDates();
  const initial: AvailabilitySearchParams = {
    ...dates,
    adults: 2,
    children: 0,
    rooms: 1,
  };
  const [search, setSearch] = useState<AvailabilitySearchParams>(
    restored ?? initial,
  );
  const { data, isFetching, isError, refetch } = useAvailabilitySearch(search);
  const results = data?.results ?? [];
  const resultsKey = search
    ? [
        search.checkIn,
        search.checkOut,
        results.map((r) => r.roomType.id).join("|"),
      ].join("~")
    : "empty";
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
        .from(
          ".hero-trust li",
          { y: 22, opacity: 0, duration: 0.7, stagger: 0.12 },
          0.65,
        )
        .from(".search-card", { y: 48, opacity: 0, duration: 1 }, 0.8)
        .from(
          ".hero-leaf-wrap-a, .hero-leaf-wrap-b, .hero-leaf-wrap-c",
          { opacity: 0, duration: 1.4 },
          0.5,
        );
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

  // Results entrance whenever a fresh search lands.
  useGSAP(
    () => {
      if (reduceMotion || resultsKey === "empty") return;
      gsap.fromTo(
        ".results-head, .room-card",
        { y: 40, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.9,
          stagger: 0.1,
          ease: "power3.out",
          overwrite: true,
        },
      );
    },
    { scope: rootRef, dependencies: [resultsKey] },
  );

  return (
    <div ref={rootRef} className="space-y-8 pb-8 sm:pb-12">
      <section className="hero relative left-1/2 -mt-4 w-screen -translate-x-1/2 overflow-hidden sm:-mt-6">
        <img
          src="/top_banner_image.png"
          alt=""
          aria-hidden
          className="hero-banner absolute inset-0 h-full w-full object-cover"
          loading="eager"
        />
        {/* Ivory fade: solid text side, open image side */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#FAF7F0]/95 via-[#FAF7F0]/85 to-[#FAF7F0]/40 lg:bg-gradient-to-r lg:from-[#FAF7F0] lg:via-[#FAF7F0]/80 lg:to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#FAF7F0] to-transparent" />
        {/* Ambient leaves (true transparency, tucked to edges, clear of text) */}
        <div
          className="hero-leaf-wrap-a pointer-events-none absolute right-2 top-6 w-44 opacity-95 sm:w-80 blur-[0.2px]"
          aria-hidden
        >
          <img
            src="/leaf1.png"
            alt=""
            loading="eager"
            className="hero-leaf-a w-full"
          />
        </div>
        <div
          className="hero-leaf-wrap-b pointer-events-none absolute -left-8 bottom-20 hidden w-60 opacity-95 sm:block"
          aria-hidden
        >
          <img
            src="/leaf4.png"
            alt=""
            loading="lazy"
            className="hero-leaf-b w-full"
          />
        </div>
        <div
          className="hero-leaf-wrap-c pointer-events-none absolute right-1 blur-[0.5px] -bottom-6 rotate-[172deg] hidden w-44 opacity-90 md:block"
          aria-hidden
        >
          <img
            src="/leaf3.png"
            alt=""
            loading="lazy"
            className="hero-leaf-c w-full"
          />
        </div>
        <div className="relative mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 lg:py-24">
          <div className="max-w-2xl space-y-5">
            <p className="hero-eyebrow text-xs font-semibold uppercase tracking-[0.2em] text-brand-dark">
              Single property · Best rate here
            </p>
            <h1 className="hero-title text-balance font-display text-5xl font-medium leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
              Find your stay
            </h1>
            <p className="hero-sub max-w-xl font-display text-lg italic leading-relaxed text-muted-foreground sm:text-xl">
              Pick your dates and guests to see live availability and rates.
            </p>
            <ul className="hero-trust flex flex-wrap gap-x-6 gap-y-4 pt-2 sm:flex-nowrap">
              {[
                {
                  icon: Gift,
                  title: "Luxury Stays",
                  text: "Curated experiences",
                },
                {
                  icon: Gem,
                  title: "Best Rate",
                  text: "Direct booking benefits",
                },
                {
                  icon: Bell,
                  title: "Personalized Service",
                  text: "A stay, made for you",
                },
              ].map(({ icon: Icon, title, text }) => (
                <li key={title} className="flex shrink-0 items-center gap-3">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-full border border-brand/50 bg-white/60 text-brand-dark">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <span>
                    <span className="block whitespace-nowrap font-display text-base font-medium">
                      {title}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {text}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <Card className="search-card relative z-10 -mt-14 rounded-2xl shadow-card sm:-mt-20">
        <CardContent className="p-4 sm:p-6">
          <SearchForm
            initial={initial}
            isPending={isFetching}
            onSearch={setSearch}
          />
        </CardContent>
      </Card>

      {isFetching ? (
        <div
          className="grid gap-4 sm:gap-5 lg:grid-cols-2"
          aria-busy="true"
          aria-label="Searching availability"
        >
          {[0, 1, 2, 3].map((row) => (
            <Skeleton key={row} className="h-72 w-full rounded-xl" />
          ))}
        </div>
      ) : isError || !data ? (
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Search failed</CardTitle>
            <CardDescription>Check your dates and try again.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              className="h-11 w-full rounded-full"
              onClick={() => void refetch()}
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : results.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="font-medium">Nothing available for these dates</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Try different dates, fewer guests, or fewer rooms.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-5">
          <div className="results-head flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">
                {results.length} room type{results.length === 1 ? "" : "s"} ·{" "}
                {data.search.nights} night{data.search.nights === 1 ? "" : "s"}{" "}
                · {data.search.adults + data.search.children} guest
                {data.search.adults + data.search.children === 1 ? "" : "s"}
              </p>
              <h2 className="mt-1 font-display text-3xl font-medium tracking-tight sm:text-4xl">
                Available Rooms &amp; Suites
              </h2>
            </div>
            <p className="font-display text-sm italic text-muted-foreground sm:text-base">
              Extraordinary stays for unforgettable moments.
            </p>
          </div>
          {(() => {
            const totals = results.flatMap((item) => item.rates.map((rate) => ({ total: rate.total, currency: rate.currency })));
            if (totals.length === 0) return null;
            const best = totals.reduce((a, b) => (b.total < a.total ? b : a));
            return (
              <p className="text-sm text-muted-foreground">
                From <span className="font-semibold text-foreground">{formatMoney(best.total, best.currency)} total for {data.search.nights} night{data.search.nights === 1 ? "" : "s"}</span>
                <br />
                <span className="text-xs">Including taxes and fees</span>
              </p>
            );
          })()}
          <div className="grid items-stretch gap-4 sm:gap-5 lg:grid-cols-2">
            {results.map((item) => (
              <RoomTypeCard
                key={item.roomType.id}
                item={item}
                search={search}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default HomePage;
