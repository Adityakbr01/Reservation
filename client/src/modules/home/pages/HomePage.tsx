import { useState } from "react";
import { useLocation } from "react-router-dom";
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
import {
  RoomTypeCard,
  SearchForm,
  defaultSearchDates,
  useAvailabilitySearch,
} from "@/modules/availability";
import type { AvailabilitySearchParams } from "@/modules/availability";

export function HomePage() {
  const location = useLocation();
  const restored =
    (location.state as { search?: AvailabilitySearchParams } | null)?.search ??
    null;
  const [search, setSearch] = useState<AvailabilitySearchParams | null>(
    restored,
  );
  const { data, isFetching, isError, refetch } = useAvailabilitySearch(search);
  const dates = defaultSearchDates();
  const initial: AvailabilitySearchParams = {
    ...dates,
    adults: 2,
    children: 0,
    rooms: 1,
  };
  const results = data?.results ?? [];

  return (
    <div className="space-y-8 pb-8 sm:pb-12">
      <section className="relative left-1/2 w-screen -translate-x-1/2 overflow-hidden">
        <img
          src="/top_banner_image.png"
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full object-cover"
          loading="eager"
        />
        {/* Ivory fade: solid text side, open image side */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#FAF7F0]/95 via-[#FAF7F0]/85 to-[#FAF7F0]/40 lg:bg-gradient-to-r lg:from-[#FAF7F0] lg:via-[#FAF7F0]/80 lg:to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#FAF7F0] to-transparent" />
        <div className="relative mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 lg:py-24">
          <div className="max-w-2xl space-y-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">
            Single property · Best rate here
          </p>
          <h1 className="text-balance font-display text-5xl font-medium leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
            Find your stay
          </h1>
          <p className="max-w-xl font-display text-lg italic leading-relaxed text-muted-foreground sm:text-xl">
            Pick your dates and guests to see live availability and rates.
          </p>
            <ul className="flex flex-wrap gap-x-6 gap-y-4 pt-2 sm:flex-nowrap">
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

      <Card className="relative z-10 -mt-14 rounded-2xl shadow-card sm:-mt-20">
        <CardContent className="p-4 sm:p-6">
          <SearchForm
            initial={initial}
            isPending={isFetching}
            onSearch={setSearch}
          />
        </CardContent>
      </Card>

      {!search ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="font-medium">Where to, and when?</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Search above to see available rooms and rates for your stay.
            </p>
          </CardContent>
        </Card>
      ) : isFetching ? (
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
          <div className="flex flex-wrap items-end justify-between gap-3">
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
